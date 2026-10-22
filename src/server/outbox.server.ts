/**
 * The email outbox: forms and payments queue emails here and the outbox
 * sender delivers them. Params can hold links, so they are sealed to the row
 * and cleared once sent. Nothing here logs an address.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { localizePath, type Locale } from "@/lib/i18n/locale";
import { readServerPublicConfig } from "@/lib/public-config";
import { seal } from "./crypto.server";
import { hit } from "./guard.server";

export const DAY = 24 * 3600;
/** Emails the public forms may send per day, across all forms. */
const DAILY_FORM_EMAILS = 200;

export type EmailTemplate =
  | "newsletter_confirm"
  | "ebook_link"
  | "order_receipt"
  | "donation_thanks"
  | "contact_autoreply"
  | "contact_notification"
  | "waitlist_confirm"
  | "order_notification";

/** An absolute link to a path on the site, in the reader's language. */
export function absoluteUrl(path: string, lang: Locale): string {
  return `${readServerPublicConfig().siteUrl}${localizePath(path, lang)}`;
}

/**
 * Queues one email. Form emails share a daily cap (over it the email is
 * dropped and the form still succeeds); receipts for payments are never capped.
 */
export async function queueEmail(input: {
  to: string;
  template: EmailTemplate;
  locale: Locale;
  params: Record<string, unknown>;
  capped?: boolean;
}): Promise<void> {
  if (input.capped !== false && !(await hit("outbox:forms", DAILY_FORM_EMAILS, DAY))) {
    console.warn("[outbox] daily form email cap reached; not queued:", input.template);
    return;
  }
  const id = crypto.randomUUID();
  const sealed = await seal(input.params, `outbox:${id}`);
  const { error } = await supabaseAdmin.from("email_outbox").insert({
    id,
    to_email: input.to,
    template: input.template,
    locale: input.locale,
    params: { sealed },
  });
  if (error) throw new Error(`Outbox: ${error.message}`);
}
