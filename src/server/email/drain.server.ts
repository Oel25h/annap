/**
 * The outbox sender, run by the cron every 5 minutes: claims the emails that
 * are due, renders each in its reader's language and sends it through
 * Resend. A failed send waits longer each time (5, 10, 20, 40, 80 minutes)
 * and gives up after 6 attempts; the dashboard shows the ones that failed.
 * Without Resend connected nothing is claimed, so emails wait in the outbox.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import type { Locale } from "@/lib/i18n/locale";
import { open, type Sealed } from "../crypto.server";
import type { EmailTemplate } from "../outbox.server";
import { readIntegration } from "../secrets.server";
import { EMAIL_COPY } from "./copy.server";
import { renderEmail } from "./render.server";
import { scrubError, SendError, sendWithResend } from "./resend.server";

type OutboxRow = Database["public"]["Tables"]["email_outbox"]["Row"];
type Copy = { subject: string; body: string };

export const MAX_ATTEMPTS = 6;
const BATCH = 40;
/** Resend allows about two requests a second on a standard plan. */
const PACE_MS = 550;
const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

const TEMPLATES = new Set<EmailTemplate>(Object.keys(EMAIL_COPY.en.templates) as EmailTemplate[]);

/** Minutes to wait before the next try, after `attempts` failed ones. */
export function backoffMinutes(attempts: number): number {
  return 5 * 2 ** Math.max(0, attempts - 1);
}

export type DrainResult =
  | { status: "not_connected" | "no_sender" }
  | { status: "done"; sent: number; retrying: number; failed: number };

/** Her words for each template: the studio's English, and approved Greek. */
async function loadCopy(): Promise<{ en: Map<string, Copy>; el: Map<string, Copy> }> {
  const [templates, greek] = await Promise.all([
    supabaseAdmin.from("email_templates").select("key, subject, body"),
    supabaseAdmin
      .from("content_translations")
      .select("entity_id, fields")
      .eq("entity_type", "email_template")
      .eq("locale", "el")
      .eq("status", "approved"),
  ]);
  if (templates.error) throw new Error(`Email templates: ${templates.error.message}`);
  if (greek.error) throw new Error(`Email translations: ${greek.error.message}`);
  const en = new Map<string, Copy>();
  for (const row of templates.data ?? []) {
    if (row.subject.trim() && row.body.trim())
      en.set(row.key, { subject: row.subject, body: row.body });
  }
  const el = new Map<string, Copy>();
  for (const row of greek.data ?? []) {
    const fields = (row.fields ?? {}) as Record<string, unknown>;
    if (typeof fields.subject === "string" && typeof fields.body === "string") {
      if (fields.subject.trim() && fields.body.trim()) {
        el.set(row.entity_id, { subject: fields.subject, body: fields.body });
      }
    }
  }
  return { en, el };
}

function copyFor(
  template: EmailTemplate,
  locale: Locale,
  copy: { en: Map<string, Copy>; el: Map<string, Copy> },
): Copy {
  return (
    (locale === "el" ? copy.el.get(template) : copy.en.get(template)) ??
    EMAIL_COPY[locale].templates[template]
  );
}

async function legalLine(): Promise<{ legal: string; contactEmail: string }> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("legal_name, legal_address, contact_email")
    .eq("id", "site")
    .maybeSingle();
  return {
    legal: [data?.legal_name, data?.legal_address].filter((part) => part?.trim()).join(", "),
    contactEmail: data?.contact_email?.trim() ?? "",
  };
}

async function markSent(id: string, subject: string, providerId: string) {
  const { error } = await supabaseAdmin
    .from("email_outbox")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      provider_id: providerId,
      subject,
      params: null,
      last_error: null,
    })
    .eq("id", id);
  if (error) console.error("[outbox] could not mark an email sent:", error.message);
}

async function markFailed(
  row: OutboxRow,
  reason: string,
  retryable: boolean,
): Promise<"retrying" | "failed"> {
  const attempts = row.attempts + 1;
  const giveUp = !retryable || attempts >= MAX_ATTEMPTS;
  const { error } = await supabaseAdmin
    .from("email_outbox")
    .update({
      status: giveUp ? "failed" : "queued",
      attempts,
      last_error: reason,
      send_after: new Date(Date.now() + backoffMinutes(attempts) * 60_000).toISOString(),
    })
    .eq("id", row.id);
  if (error) console.error("[outbox] could not record a failed send:", error.message);
  return giveUp ? "failed" : "retrying";
}

export async function drainOutbox(limit = BATCH): Promise<DrainResult> {
  const resend = await readIntegration("resend");
  if (!resend) return { status: "not_connected" };
  const from = typeof resend.config.from === "string" ? resend.config.from.trim() : "";
  if (!from) return { status: "no_sender" };

  const { data: claimed, error } = await supabaseAdmin.rpc("claim_outbox", { p_limit: limit });
  if (error) throw new Error(`Outbox claim: ${error.message}`);
  const rows = (claimed ?? []) as OutboxRow[];
  const result = { status: "done" as const, sent: 0, retrying: 0, failed: 0 };
  if (rows.length === 0) return result;

  const [copy, site] = await Promise.all([loadCopy(), legalLine()]);
  const configuredReplyTo =
    typeof resend.config.replyTo === "string" ? resend.config.replyTo.trim() : "";
  const replyTo = configuredReplyTo || site.contactEmail;

  for (const [index, row] of rows.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, PACE_MS));
    try {
      const template = row.template as EmailTemplate;
      if (!TEMPLATES.has(template)) throw new SendError("Unknown template", false);
      const sealed = (row.params as { sealed?: Sealed } | null)?.sealed;
      if (!sealed) throw new SendError("Nothing to send: the email's details were cleared", false);
      const params = await open<Record<string, unknown>>(sealed, `outbox:${row.id}`);
      const locale: Locale = row.locale === "el" ? "el" : "en";
      const rendered = renderEmail({
        template,
        locale,
        copy: copyFor(template, locale, copy),
        params,
        footer: { legal: site.legal },
      });
      // A message from the contact form is answered by replying to its sender.
      const visitor =
        typeof params.email === "string" && EMAIL.test(params.email) ? params.email : "";
      const providerId = await sendWithResend(resend.secrets.apiKey, {
        from,
        to: row.to_email,
        ...rendered,
        replyTo: template === "contact_notification" && visitor ? visitor : replyTo || undefined,
        idempotencyKey: row.id,
      });
      await markSent(row.id, rendered.subject, providerId);
      result.sent += 1;
    } catch (failure) {
      const sendError =
        failure instanceof SendError
          ? failure
          : new SendError(scrubError((failure as Error).message ?? "Unknown error"), true);
      result[await markFailed(row, sendError.message, sendError.retryable)] += 1;
    }
  }
  return result;
}
