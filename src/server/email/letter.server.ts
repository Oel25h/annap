/**
 * Letters to subscribers, shared by the studio's send (newsletter.server.ts)
 * and the outbox sender: the fingerprint a test send is checked against, the
 * unsubscribe links and List-Unsubscribe headers, and the rendered email.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Locale } from "@/lib/i18n/locale";
import { readServerPublicConfig } from "@/lib/public-config";
import { sha256Hex } from "../crypto.server";
import { absoluteUrl } from "../outbox.server";
import { sanitizeRichText } from "../rich-text.server";
import { renderLetter, type Rendered } from "./render.server";

/** The outbox template of a letter's emails; their words come from the letter itself. */
export const LETTER_TEMPLATE = "newsletter";

export type Letter = { subject: string; body: string; header_image: string | null };

/** What a test send showed: the subject, body and header image, exactly. */
export function letterFingerprint(letter: Letter): Promise<string> {
  return sha256Hex(JSON.stringify([letter.subject, letter.body, letter.header_image ?? ""]));
}

/** The legal line under every email, and where replies go when the studio names no one. */
export async function legalLine(): Promise<{ legal: string; contactEmail: string }> {
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

/**
 * One subscriber's copy. With their unsubscribe token it carries the link in
 * the footer and the one-click List-Unsubscribe headers (RFC 8058); a test
 * to the admin has no token and links to the plain unsubscribe page.
 */
export function letterEmail(
  letter: Letter,
  locale: Locale,
  token: string | null,
  legal: string,
): Rendered & { headers: Record<string, string> } {
  const siteUrl = readServerPublicConfig().siteUrl;
  const page = token
    ? `${absoluteUrl("/unsubscribe", locale)}?token=${encodeURIComponent(token)}`
    : absoluteUrl("/unsubscribe", locale);
  const rendered = renderLetter({
    locale,
    subject: letter.subject,
    sanitizedBody: sanitizeRichText(letter.body, locale),
    headerImage: letter.header_image,
    siteUrl,
    legal,
    unsubscribeUrl: page,
  });
  const headers: Record<string, string> = token
    ? {
        "List-Unsubscribe": `<${siteUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      }
    : {};
  return { ...rendered, headers };
}
