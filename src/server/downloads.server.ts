/**
 * Download links for the free ebook and for bought files. A link is a random
 * token (only its hash is stored) that lasts seven days and ten uses; each
 * use counts once and hands out a one-minute signed URL for the private file.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { filesForLocale } from "@/lib/book-files";
import { localizePath, type Locale } from "@/lib/i18n/locale";
import { hashToken, randomToken } from "./crypto.server";
import { overlayFields } from "./loaders/common.server";
import { absoluteUrl, DAY } from "./outbox.server";
import { fetchOverlays } from "./overlays.server";
import { publicDb } from "./supabase-public.server";

const DOWNLOAD_DAYS = 7;

export const FORMAT_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/epub+zip": "EPUB",
  "audio/mpeg": "MP3",
  "audio/mp4": "M4A",
  "application/zip": "ZIP",
};

export type DownloadFile = { mediaId: string; mime: string };
/**
 * `action` is where the page's download button posts (one click, nothing for
 * mail scanners to trigger); `href` is the page itself; `url` goes in emails.
 */
export type IssuedDownload = { label: string; href: string; action: string; url: string };

/** One file per format, PDF first, then EPUB, then anything else. */
function byFormat(a: DownloadFile, b: DownloadFile) {
  const order = (mime: string) => Object.keys(FORMAT_LABELS).indexOf(mime) >>> 0;
  return order(a.mime) - order(b.mime);
}

/** Fresh links for these files, owned by a lead (free ebook) or an order item (purchase). */
export async function issueDownloads(
  owner: { leadId: string } | { orderItemId: string },
  files: DownloadFile[],
  lang: Locale,
): Promise<IssuedDownload[]> {
  if (files.length === 0) return [];
  const expires = new Date(Date.now() + DOWNLOAD_DAYS * DAY * 1000).toISOString();
  const issued = [...files].sort(byFormat).map((file) => ({ file, token: randomToken() }));
  const { error } = await supabaseAdmin.from("download_tokens").insert(
    await Promise.all(
      issued.map(async ({ file, token }) => ({
        token_hash: await hashToken(token),
        lead_id: "leadId" in owner ? owner.leadId : null,
        order_item_id: "orderItemId" in owner ? owner.orderItemId : null,
        media_id: file.mediaId,
        expires_at: expires,
      })),
    ),
  );
  if (error) throw new Error(`Download tokens: ${error.message}`);
  return issued.map(({ file, token }) => ({
    label: FORMAT_LABELS[file.mime] ?? "File",
    href: localizePath(`/download/${token}`, lang),
    action: `/api/download/${token}`,
    url: absoluteUrl(`/download/${token}`, lang),
  }));
}

/**
 * A book's files for one purpose. A free ebook is only the reader's language.
 * A bought file may still use the English one when that language has none.
 */
export async function bookFiles(
  bookId: string,
  purpose: "free_download" | "purchase",
  lang: Locale,
): Promise<DownloadFile[]> {
  const { data, error } = await supabaseAdmin
    .from("book_files")
    .select("locale, media:media_assets(id, mime)")
    .eq("book_id", bookId)
    .eq("purpose", purpose);
  if (error) throw new Error(`Book files: ${error.message}`);
  const rows = (data ?? []) as unknown as {
    locale: Locale;
    media: { id: string; mime: string } | null;
  }[];
  return filesForLocale(
    rows.flatMap((row) =>
      row.media ? [{ locale: row.locale, mediaId: row.media.id, mime: row.media.mime }] : [],
    ),
    lang,
    purpose === "purchase",
  ).map(({ mediaId, mime }) => ({ mediaId, mime }));
}

/** `textLang` is the language `title` is in, so a Greek page can mark an English one. */
export type DownloadState =
  | { status: "ready"; title: string | null; textLang: Locale; format: string }
  | { status: "expired"; title: string | null; textLang: Locale; renewable: boolean }
  | { status: "invalid" };

/** A free ebook's title in the page's language when its Greek is approved; otherwise English. */
async function bookTitle(book: { id: string; title: string }, locale: Locale) {
  const overlays =
    locale === "el" ? await fetchOverlays(publicDb(), { book: [book.id] }) : new Map();
  const { item, lang } = overlayFields({ title: book.title }, overlays, "book", book.id, ["title"]);
  return { title: item.title, textLang: lang };
}

/** What a link is for, without using it: the page shows this before the button. */
export async function inspectDownload(
  token: string,
  locale: Locale = "en",
): Promise<DownloadState> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return { status: "invalid" };
  const { data: row } = await supabaseAdmin
    .from("download_tokens")
    .select(
      "expires_at, uses, max_uses, media:media_assets(mime), lead:leads(book:books(id, title)), item:order_items(title)",
    )
    .eq("token_hash", await hashToken(token))
    .maybeSingle();
  if (!row) return { status: "invalid" };
  const media = row.media as unknown as { mime: string } | null;
  if (!media) return { status: "invalid" };
  const lead = row.lead as unknown as { book: { id: string; title: string } | null } | null;
  const item = row.item as unknown as { title: string } | null;
  // A bought line keeps the English title it was sold under.
  const { title, textLang } = lead?.book
    ? await bookTitle(lead.book, locale)
    : { title: item?.title ?? null, textLang: "en" as const };
  if (new Date(row.expires_at).getTime() < Date.now() || row.uses >= row.max_uses) {
    // Free ebook links can be emailed again; bought ones come from the receipt.
    return { status: "expired", title, textLang, renewable: !!lead };
  }
  return { status: "ready", title, textLang, format: FORMAT_LABELS[media.mime] ?? "File" };
}

export type RedeemResult = { status: "ok"; url: string } | { status: "expired" | "invalid" };

/** Counts a use and returns a one-minute signed URL for the file. */
export async function redeemDownload(token: string): Promise<RedeemResult> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return { status: "invalid" };
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

  // Optimistic: only one of two simultaneous clicks counts, the other is told to retry.
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
