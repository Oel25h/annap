/**
 * Public forms: the free ebook, the newsletter (double opt-in) and contact.
 *
 * Every form is checked with Zod, then Turnstile when it is configured, then
 * rate limits kept in Postgres (keys are keyed hashes of the IP or the email).
 * Writes use the secret key because visitors write nothing directly; this is
 * one of the places the brief allows it. Nothing here logs emails or tokens.
 */
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { localizePath, type Locale } from "@/lib/i18n/locale";
import { readServerPublicConfig } from "@/lib/public-config";
import { hashToken, randomToken, seal } from "./crypto.server";
import { guard, hit, type FormError } from "./guard.server";

export type { FormError };
export type FormResult<T extends object = object> =
  ({ ok: true } & T) | { ok: false; error: FormError };

const DAY = 24 * 3600;
const DOWNLOAD_DAYS = 7;
/** Outgoing form emails per day, across all forms. */
const DAILY_EMAILS = 200;

const locale = z.enum(["en", "el"]);
const email = z.string().trim().toLowerCase().email().max(320);
const turnstile = z.string().max(4096).optional();

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function absolute(path: string, lang: Locale): string {
  return `${readServerPublicConfig().siteUrl}${localizePath(path, lang)}`;
}

async function consentVersion(key: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("consent_texts")
    .select("version")
    .eq("key", key)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.version ?? 0;
}

/**
 * Queues an email for the outbox sender. Params can hold links, so they are
 * sealed and cleared once sent. Over the daily cap the email is dropped and
 * the form still succeeds.
 */
async function queueEmail(input: {
  to: string;
  template: string;
  locale: Locale;
  params: Record<string, unknown>;
}): Promise<void> {
  if (!(await hit("outbox:forms", DAILY_EMAILS, DAY))) {
    console.warn("[forms] daily email cap reached; email not queued", input.template);
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

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Starts double opt-in for an address. Someone already subscribed hears
 * nothing new; one confirmation email per address per day.
 */
async function startSubscription(input: { email: string; locale: Locale; source: string }) {
  const { data: existing, error } = await supabaseAdmin
    .from("subscribers")
    .select("id, status, confirmed_at, consent_source")
    .ilike("email", escapeLike(input.email))
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Subscribers: ${error.message}`);

  if (existing && existing.status === "active") return { subscriberId: existing.id };
  if (!(await hit(`confirm-email:${input.email}`, 1, DAY)))
    return { subscriberId: existing?.id ?? null };

  const token = randomToken();
  const fields = {
    status: "pending",
    locale: input.locale,
    source: input.source,
    confirm_token_hash: await hashToken(token),
    confirm_sent_at: new Date().toISOString(),
    consent_key: "newsletter",
    consent_version: await consentVersion("newsletter"),
    consent_source: "double_opt_in",
    unsubscribed_at: null,
  };
  let subscriberId = existing?.id ?? null;
  if (existing) {
    const { error: updateError } = await supabaseAdmin
      .from("subscribers")
      .update(fields)
      .eq("id", existing.id);
    if (updateError) throw new Error(`Subscribers: ${updateError.message}`);
  } else {
    const { data, error: insertError } = await supabaseAdmin
      .from("subscribers")
      .insert({ ...fields, email: input.email })
      .select("id")
      .single();
    if (insertError) throw new Error(`Subscribers: ${insertError.message}`);
    subscriberId = data.id;
  }

  await queueEmail({
    to: input.email,
    template: "newsletter_confirm",
    locale: input.locale,
    params: { confirmUrl: absolute(`/confirm/${token}`, input.locale) },
  });
  return { subscriberId };
}

// ---------------------------------------------------------------------------
// Free ebook
// ---------------------------------------------------------------------------

const EbookInput = z.object({
  bookId: z.string().uuid(),
  firstName: z.string().trim().min(1).max(80),
  email,
  letters: z.boolean().default(false),
  locale,
  turnstile,
});

type DownloadLink = { label: string; href: string };

const FORMAT_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/epub+zip": "EPUB",
  "audio/mpeg": "MP3",
  "audio/mp4": "M4A",
  "application/zip": "ZIP",
};

type FreeFile = { mediaId: string; mime: string };

/** The book's free files in the page's language, otherwise English. */
async function freeFiles(bookId: string, lang: Locale): Promise<FreeFile[]> {
  const { data, error } = await supabaseAdmin
    .from("book_files")
    .select("locale, media:media_assets(id, mime)")
    .eq("book_id", bookId)
    .eq("purpose", "free_download");
  if (error) throw new Error(`Book files: ${error.message}`);
  const rows = (data ?? []) as unknown as {
    locale: Locale;
    media: { id: string; mime: string } | null;
  }[];
  const pick = (l: Locale) =>
    rows
      .filter((r) => r.locale === l && r.media)
      .map((r) => ({ mediaId: r.media!.id, mime: r.media!.mime }));
  const files = pick(lang);
  return files.length > 0 ? files : pick("en");
}

async function issueDownloads(leadId: string, files: FreeFile[], lang: Locale) {
  const expires = new Date(Date.now() + DOWNLOAD_DAYS * DAY * 1000).toISOString();
  const issued = await Promise.all(files.map(async (file) => ({ file, token: randomToken() })));
  const { error } = await supabaseAdmin.from("download_tokens").insert(
    await Promise.all(
      issued.map(async ({ file, token }) => ({
        token_hash: await hashToken(token),
        lead_id: leadId,
        media_id: file.mediaId,
        expires_at: expires,
      })),
    ),
  );
  if (error) throw new Error(`Download tokens: ${error.message}`);
  // PDF first, then EPUB, then anything else.
  const order = (mime: string) => Object.keys(FORMAT_LABELS).indexOf(mime) >>> 0;
  return issued
    .sort((a, b) => order(a.file.mime) - order(b.file.mime))
    .map(({ file, token }) => ({
      label: FORMAT_LABELS[file.mime] ?? "File",
      path: `/download/${token}`,
      href: localizePath(`/download/${token}`, lang),
      url: absolute(`/download/${token}`, lang),
    }));
}

export async function requestFreeEbook(
  raw: unknown,
): Promise<FormResult<{ downloads: DownloadLink[] }>> {
  const parsed = EbookInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const input = parsed.data;

  const blocked = await guard("ebook", 5, input.turnstile);
  if (blocked) return { ok: false, error: blocked };

  const { data: book } = await supabaseAdmin
    .from("books")
    .select("id, slug, title")
    .eq("id", input.bookId)
    .eq("status", "published")
    .maybeSingle();
  if (!book) return { ok: false, error: "invalid" };
  const files = await freeFiles(book.id, input.locale);
  if (files.length === 0) return { ok: false, error: "invalid" };

  const source = `ebook:${book.slug}`;
  const subscription = input.letters
    ? await startSubscription({ email: input.email, locale: input.locale, source })
    : null;

  // One lead per email and book: asking again refreshes it and issues fresh links.
  const lead = {
    first_name: input.firstName,
    email: input.email,
    locale: input.locale,
    source,
    book_id: book.id,
    consent_key: "ebook_gate",
    consent_version: await consentVersion("ebook_gate"),
    last_requested_at: new Date().toISOString(),
    ...(subscription ? { newsletter_opt_in: true, subscriber_id: subscription.subscriberId } : {}),
  };
  const { data: saved, error } = await supabaseAdmin
    .from("leads")
    .upsert(lead, { onConflict: "email_normalized,source" })
    .select("id")
    .single();
  if (error) throw new Error(`Leads: ${error.message}`);

  const downloads = await issueDownloads(saved.id, files, input.locale);

  if (await hit(`ebook-email:${input.email}`, 1, DAY)) {
    await queueEmail({
      to: input.email,
      template: "ebook_link",
      locale: input.locale,
      params: {
        firstName: input.firstName,
        bookTitle: book.title,
        links: downloads.map(({ label, url }) => ({ label, url })),
      },
    });
  }

  return { ok: true, downloads: downloads.map(({ label, href }) => ({ label, href })) };
}

// ---------------------------------------------------------------------------
// Download links
// ---------------------------------------------------------------------------

export type RedeemResult = { status: "ok"; url: string } | { status: "expired" | "invalid" };

/** Counts a use and returns a one-minute signed URL for the file. */
export async function redeemDownload(token: string): Promise<RedeemResult> {
  const { data: row } = await supabaseAdmin
    .from("download_tokens")
    .select("id, expires_at, uses, max_uses, media:media_assets(bucket, path, original_name, mime)")
    .eq("token_hash", await hashToken(token))
    .maybeSingle();
  if (!row) return { status: "invalid" };
  const media = row.media as unknown as {
    bucket: string;
    path: string;
    original_name: string | null;
    mime: string;
  } | null;
  if (!media) return { status: "invalid" };
  if (new Date(row.expires_at).getTime() < Date.now() || row.uses >= row.max_uses) {
    return { status: "expired" };
  }

  const { data: counted } = await supabaseAdmin
    .from("download_tokens")
    .update({ uses: row.uses + 1, last_used_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("uses", row.uses)
    .select("id");
  if (!counted?.length) return { status: "expired" };

  const extension = FORMAT_LABELS[media.mime]?.toLowerCase();
  const filename = media.original_name || `download${extension ? `.${extension}` : ""}`;
  const { data: signed, error } = await supabaseAdmin.storage
    .from(media.bucket)
    .createSignedUrl(media.path, 60, { download: filename });
  if (error || !signed) throw new Error(`Signed URL: ${error?.message ?? "none"}`);
  return { status: "ok", url: signed.signedUrl };
}

/**
 * "Email me a fresh link" from an expired link. Always reports success, so a
 * link reveals nothing about who asked for it.
 */
export async function refreshDownload(raw: unknown): Promise<FormResult> {
  const parsed = z
    .object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), turnstile })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const blocked = await guard("ebook-refresh", 5, parsed.data.turnstile);
  if (blocked) return { ok: false, error: blocked };

  const { data: row } = await supabaseAdmin
    .from("download_tokens")
    .select("lead:leads(id, first_name, email, locale, book_id)")
    .eq("token_hash", await hashToken(parsed.data.token))
    .maybeSingle();
  const lead = row?.lead as unknown as {
    id: string;
    first_name: string;
    email: string;
    locale: Locale;
    book_id: string | null;
  } | null;
  if (!lead?.book_id) return { ok: true };
  if (!(await hit(`ebook-email:${lead.email}`, 1, DAY))) return { ok: true };

  const { data: book } = await supabaseAdmin
    .from("books")
    .select("title")
    .eq("id", lead.book_id)
    .eq("status", "published")
    .maybeSingle();
  const files = book ? await freeFiles(lead.book_id, lead.locale) : [];
  if (!book || files.length === 0) return { ok: true };

  const downloads = await issueDownloads(lead.id, files, lead.locale);
  await queueEmail({
    to: lead.email,
    template: "ebook_link",
    locale: lead.locale,
    params: {
      firstName: lead.first_name,
      bookTitle: book.title,
      links: downloads.map(({ label, url }) => ({ label, url })),
    },
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Newsletter
// ---------------------------------------------------------------------------

const SubscribeInput = z.object({
  email,
  locale,
  source: z
    .string()
    .regex(/^[a-z0-9:/_-]{0,80}$/)
    .optional(),
  turnstile,
});

export async function subscribe(raw: unknown): Promise<FormResult> {
  const parsed = SubscribeInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const input = parsed.data;
  const blocked = await guard("newsletter", 5, input.turnstile);
  if (blocked) return { ok: false, error: blocked };
  await startSubscription({
    email: input.email,
    locale: input.locale,
    source: input.source || "site",
  });
  return { ok: true };
}

export type ConfirmResult = "confirmed" | "invalid";

/** Confirms a subscription from the emailed link (valid for 30 days). */
export async function confirmSubscription(token: string): Promise<ConfirmResult> {
  const since = new Date(Date.now() - 30 * DAY * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from("subscribers")
    .update({
      status: "active",
      confirmed_at: new Date().toISOString(),
      confirm_token_hash: null,
      unsubscribed_at: null,
    })
    .eq("confirm_token_hash", await hashToken(token))
    .gte("confirm_sent_at", since)
    .select("id");
  return data?.length ? "confirmed" : "invalid";
}

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

export const CONTACT_TOPICS = ["general", "speaking", "media", "partnerships"] as const;

const ContactInput = z.object({
  name: z.string().trim().min(1).max(120),
  email,
  topic: z.enum(CONTACT_TOPICS),
  message: z.string().trim().min(1).max(5000),
  locale,
  turnstile,
});

export async function sendContactMessage(raw: unknown): Promise<FormResult> {
  const parsed = ContactInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const input = parsed.data;
  const blocked = await guard("contact", 5, input.turnstile);
  if (blocked) return { ok: false, error: blocked };

  const { error } = await supabaseAdmin.from("contact_messages").insert({
    name: input.name,
    email: input.email,
    enquiry_type: input.topic,
    message: input.message,
    locale: input.locale,
  });
  if (error) throw new Error(`Contact: ${error.message}`);

  const { data: settings } = await supabaseAdmin
    .from("site_settings")
    .select("contact_email")
    .eq("id", "site")
    .maybeSingle();
  const inbox = settings?.contact_email;
  if (inbox) {
    await queueEmail({
      to: inbox,
      template: "contact_notification",
      locale: "en",
      params: { name: input.name, email: input.email, topic: input.topic, message: input.message },
    });
  }
  if (await hit(`contact-reply:${input.email}`, 1, DAY)) {
    await queueEmail({
      to: input.email,
      template: "contact_autoreply",
      locale: input.locale,
      params: { name: input.name },
    });
  }
  return { ok: true };
}
