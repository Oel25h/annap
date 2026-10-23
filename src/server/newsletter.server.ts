/**
 * Sending a letter from the studio, in two steps. First a test goes to the
 * signed-in admin, straight through Resend, and its fingerprint is kept.
 * Then, only if the letter is unchanged since that test, one outbox email is
 * queued per confirmed subscriber (double opt-in: active and confirmed),
 * each with its own unsubscribe link; the outbox sender delivers them in
 * batches. Queuing again never doubles an email. Nothing here logs an address.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Locale } from "@/lib/i18n/locale";
import { seal } from "./crypto.server";
import {
  legalLine,
  LETTER_TEMPLATE,
  letterEmail,
  letterFingerprint,
  type Letter,
} from "./email/letter.server";
import { scrubError, SendError, sendWithResend } from "./email/resend.server";
import { readIntegration } from "./secrets.server";

const PAGE = 1000;
const INSERT_CHUNK = 500;

type LetterRow = Letter & {
  id: string;
  status: string;
  filter_source: string | null;
  locale_mode: string;
  test_hash: string | null;
};

async function loadLetter(id: string): Promise<LetterRow> {
  const { data, error } = await supabaseAdmin
    .from("newsletters")
    .select("id, subject, body, header_image, status, filter_source, locale_mode, test_hash")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Letters: ${error.message}`);
  if (!data) throw new Error("That letter wasn't found. It may have been deleted.");
  return data;
}

function checkReady(letter: Letter) {
  if (!letter.subject.trim()) throw new Error("Add a subject line first.");
  if (!letter.body.replace(/<[^>]+>/g, "").trim()) throw new Error("The letter is empty.");
}

async function resendSender() {
  const resend = await readIntegration("resend");
  const from = typeof resend?.config.from === "string" ? resend.config.from.trim() : "";
  if (!resend || !from)
    throw new Error("Connect Resend in Keys and links, with a sender, before sending.");
  const replyTo = typeof resend.config.replyTo === "string" ? resend.config.replyTo.trim() : "";
  return { apiKey: resend.secrets.apiKey, from, replyTo };
}

/** "joel@example.com" → "j•••@example.com". */
function mask(email: string) {
  const at = email.lastIndexOf("@");
  return at > 0 ? `${email[0]}•••${email.slice(at)}` : "your address";
}

export type TestResult = { sentTo: string; at: string };

/** Step one: the letter exactly as subscribers will get it, to the admin who is sending it. */
export async function sendTest(userId: string, id: string): Promise<TestResult> {
  const letter = await loadLetter(id);
  if (letter.status !== "draft") throw new Error("This letter has already been sent.");
  checkReady(letter);
  const sender = await resendSender();
  const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
  const to = user?.user?.email;
  if (userError || !to) throw new Error("Your account has no email address to send the test to.");

  const site = await legalLine();
  const email = letterEmail(letter, "en", null, site.legal);
  try {
    await sendWithResend(sender.apiKey, {
      from: sender.from,
      to,
      subject: `[Test] ${email.subject}`,
      html: email.html,
      text: email.text,
      replyTo: sender.replyTo || site.contactEmail || undefined,
      idempotencyKey: crypto.randomUUID(),
    });
  } catch (failure) {
    const reason = failure instanceof SendError ? failure.message : "unknown";
    throw new Error(`The test didn't send: ${scrubError(reason)}`);
  }

  const at = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("newsletters")
    .update({ test_sent_at: at, test_hash: await letterFingerprint(letter) })
    .eq("id", id);
  if (error) throw new Error(`Letters: ${error.message}`);
  return { sentTo: mask(to), at };
}

type Recipient = { email: string; locale: string; unsubscribe_token: string };

/** Confirmed subscribers only: active, with a confirmed double opt-in. */
export async function recipients(filterSource: string | null): Promise<Recipient[]> {
  const out: Recipient[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabaseAdmin
      .from("subscribers")
      .select("email, locale, unsubscribe_token")
      .eq("status", "active")
      .not("confirmed_at", "is", null)
      .order("created_at")
      .range(from, from + PAGE - 1);
    if (filterSource === "unknown") query = query.is("source", null);
    else if (filterSource) query = query.eq("source", filterSource);
    const { data, error } = await query;
    if (error) throw new Error(`Subscribers: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

export type SendResult = { queued: number };

/**
 * Step two, after the confirm: queue the letter for every confirmed
 * subscriber. Refused unless a test of this exact version was sent.
 */
export async function sendLetter(id: string): Promise<SendResult> {
  const letter = await loadLetter(id);
  if (letter.status === "sent") throw new Error("This letter has already been sent.");
  checkReady(letter);
  if (!letter.test_hash || letter.test_hash !== (await letterFingerprint(letter)))
    throw new Error("Send yourself a test of this version first.");
  await resendSender();

  // Claim the letter; a second click, or a second tab, finds it already sending.
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("newsletters")
    .update({ status: "sending" })
    .eq("id", id)
    .in("status", ["draft", "sending"])
    .select("id");
  if (claimError) throw new Error(`Letters: ${claimError.message}`);
  if (!claimed?.length) throw new Error("This letter has already been sent.");

  const people = await recipients(letter.filter_source);
  const { data: already, error: alreadyError } = await supabaseAdmin
    .from("email_outbox")
    .select("to_email")
    .eq("newsletter_id", id);
  if (alreadyError) throw new Error(`Outbox: ${alreadyError.message}`);
  const queued = new Set((already ?? []).map((r) => r.to_email));

  const rows = [];
  for (const person of people) {
    if (queued.has(person.email)) continue;
    queued.add(person.email);
    const rowId = crypto.randomUUID();
    const locale: Locale =
      letter.locale_mode === "per_subscriber" && person.locale === "el" ? "el" : "en";
    rows.push({
      id: rowId,
      to_email: person.email,
      template: LETTER_TEMPLATE,
      locale,
      newsletter_id: id,
      params: { sealed: await seal({ token: person.unsubscribe_token }, `outbox:${rowId}`) },
    });
  }
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const { error } = await supabaseAdmin
      .from("email_outbox")
      .insert(rows.slice(i, i + INSERT_CHUNK) as never);
    if (error) throw new Error(`Outbox: ${error.message}`);
  }

  const { error } = await supabaseAdmin
    .from("newsletters")
    .update({ status: "sent", sent_at: new Date().toISOString(), recipient_count: queued.size })
    .eq("id", id);
  if (error) throw new Error(`Letters: ${error.message}`);
  return { queued: queued.size };
}
