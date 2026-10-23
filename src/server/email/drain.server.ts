/**
 * The outbox sender, run by the cron every 5 minutes: claims the emails that
 * are due, renders each in its reader's language and sends it through
 * Resend. Letters to subscribers go in batches of up to 100, each with its
 * own unsubscribe link and List-Unsubscribe headers, and only to people who
 * are still subscribed when it is their turn. A failed send waits longer
 * each time (5, 10, 20, 40, 80 minutes) and gives up after 6 attempts; the
 * dashboard shows the ones that failed. Without Resend connected nothing is
 * claimed, so emails wait in the outbox.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import type { Locale } from "@/lib/i18n/locale";
import { open, sha256Hex, type Sealed } from "../crypto.server";
import type { EmailTemplate } from "../outbox.server";
import { readIntegration } from "../secrets.server";
import { EMAIL_COPY } from "./copy.server";
import { legalLine, LETTER_TEMPLATE, letterEmail, type Letter } from "./letter.server";
import { renderEmail } from "./render.server";
import {
  scrubError,
  sendBatchWithResend,
  SendError,
  sendWithResend,
  type Outgoing,
} from "./resend.server";

type OutboxRow = Database["public"]["Tables"]["email_outbox"]["Row"];
type Copy = { subject: string; body: string };

export const MAX_ATTEMPTS = 6;
/** Emails claimed at a time (the claim allows 100), and claims per run while letters wait. */
const BATCH = 100;
const ROUNDS = 5;
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

type Sender = { apiKey: string; from: string; replyTo: string; legal: string };

/** Transactional emails, one request each, paced for Resend's rate limit. */
async function sendSingles(rows: OutboxRow[], sender: Sender, result: Counts) {
  if (rows.length === 0) return;
  const copy = await loadCopy();
  for (const [index, row] of rows.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, PACE_MS));
    try {
      const template = row.template as EmailTemplate;
      if (!TEMPLATES.has(template)) throw new SendError("Unknown template", false);
      const params = await openParams(row);
      const locale: Locale = row.locale === "el" ? "el" : "en";
      const rendered = renderEmail({
        template,
        locale,
        copy: copyFor(template, locale, copy),
        params,
        footer: { legal: sender.legal },
      });
      // A message from the contact form is answered by replying to its sender.
      const visitor =
        typeof params.email === "string" && EMAIL.test(params.email) ? params.email : "";
      const providerId = await sendWithResend(sender.apiKey, {
        from: sender.from,
        to: row.to_email,
        ...rendered,
        replyTo:
          template === "contact_notification" && visitor ? visitor : sender.replyTo || undefined,
        idempotencyKey: row.id,
      });
      await markSent(row.id, rendered.subject, providerId);
      result.sent += 1;
    } catch (failure) {
      result[await markFailed(row, asSendError(failure).message, asSendError(failure).retryable)] +=
        1;
    }
  }
}

function asSendError(failure: unknown): SendError {
  return failure instanceof SendError
    ? failure
    : new SendError(scrubError((failure as Error)?.message ?? "Unknown error"), true);
}

async function openParams(row: OutboxRow): Promise<Record<string, unknown>> {
  const sealed = (row.params as { sealed?: Sealed } | null)?.sealed;
  if (!sealed) throw new SendError("Nothing to send: the email's details were cleared", false);
  return open<Record<string, unknown>>(sealed, `outbox:${row.id}`);
}

/** Letters to subscribers, in batches of up to 100 per letter. */
async function sendLetters(rows: OutboxRow[], sender: Sender, result: Counts) {
  if (rows.length === 0) return;
  const letterIds = [...new Set(rows.map((r) => r.newsletter_id).filter(Boolean))] as string[];
  const [letters, still] = await Promise.all([
    supabaseAdmin.from("newsletters").select("id, subject, body, header_image").in("id", letterIds),
    supabaseAdmin
      .from("subscribers")
      .select("email")
      .eq("status", "active")
      .in(
        "email",
        rows.map((r) => r.to_email),
      ),
  ]);
  if (letters.error) throw new Error(`Letters: ${letters.error.message}`);
  if (still.error) throw new Error(`Subscribers: ${still.error.message}`);
  const byId = new Map<string, Letter>((letters.data ?? []).map((l) => [l.id, l]));
  const subscribed = new Set((still.data ?? []).map((s) => s.email));

  const ready: { row: OutboxRow; email: Outgoing }[] = [];
  for (const row of rows) {
    try {
      const letter = row.newsletter_id ? byId.get(row.newsletter_id) : undefined;
      if (!letter) throw new SendError("The letter was deleted", false);
      // Unsubscribed since the letter was queued: not sent, and not retried.
      if (!subscribed.has(row.to_email)) throw new SendError("Unsubscribed before sending", false);
      const params = await openParams(row);
      const token = typeof params.token === "string" ? params.token : null;
      if (!token) throw new SendError("No unsubscribe link", false);
      const locale: Locale = row.locale === "el" ? "el" : "en";
      const rendered = letterEmail(letter, locale, token, sender.legal);
      ready.push({
        row,
        email: {
          from: sender.from,
          to: row.to_email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          headers: rendered.headers,
          replyTo: sender.replyTo || undefined,
          idempotencyKey: row.id,
        },
      });
    } catch (failure) {
      const error = asSendError(failure);
      result[await markFailed(row, error.message, error.retryable)] += 1;
    }
  }

  for (let i = 0; i < ready.length; i += 100) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, PACE_MS));
    const chunk = ready.slice(i, i + 100);
    // The same rows give the same key, so a retry after a timeout never sends twice.
    const key = `batch:${await sha256Hex(chunk.map((c) => c.row.id).join(","))}`;
    try {
      const outcomes = await sendBatchWithResend(
        sender.apiKey,
        chunk.map((c) => c.email),
        key,
      );
      for (const [index, outcome] of outcomes.entries()) {
        const { row, email } = chunk[index];
        if ("id" in outcome) {
          await markSent(row.id, email.subject, outcome.id);
          result.sent += 1;
        } else {
          result[await markFailed(row, outcome.error, outcome.retryable)] += 1;
        }
      }
    } catch (failure) {
      const error = asSendError(failure);
      for (const { row } of chunk)
        result[await markFailed(row, error.message, error.retryable)] += 1;
    }
  }
}

type Counts = { sent: number; retrying: number; failed: number };

export async function drainOutbox(limit = BATCH): Promise<DrainResult> {
  const resend = await readIntegration("resend");
  if (!resend) return { status: "not_connected" };
  const from = typeof resend.config.from === "string" ? resend.config.from.trim() : "";
  if (!from) return { status: "no_sender" };

  const site = await legalLine();
  const configuredReplyTo =
    typeof resend.config.replyTo === "string" ? resend.config.replyTo.trim() : "";
  const sender: Sender = {
    apiKey: resend.secrets.apiKey,
    from,
    replyTo: configuredReplyTo || site.contactEmail,
    legal: site.legal,
  };
  const result = { status: "done" as const, sent: 0, retrying: 0, failed: 0 };

  for (let round = 0; round < ROUNDS; round++) {
    const { data: claimed, error } = await supabaseAdmin.rpc("claim_outbox", { p_limit: limit });
    if (error) throw new Error(`Outbox claim: ${error.message}`);
    const rows = (claimed ?? []) as OutboxRow[];
    const isLetter = (row: OutboxRow) => row.template === LETTER_TEMPLATE && !!row.newsletter_id;
    const letters = rows.filter(isLetter);
    await sendSingles(
      rows.filter((row) => !isLetter(row)),
      sender,
      result,
    );
    await sendLetters(letters, sender, result);
    // Another round only while a full claim was all letters (quick to send).
    if (rows.length < limit || letters.length < rows.length) break;
  }
  return result;
}
