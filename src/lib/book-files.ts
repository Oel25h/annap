/**
 * Free ebooks are one file per language. The page offers its own language.
 * A purchase may still fall back to the English file; a free ebook does not.
 */
import type { Locale } from "@/lib/i18n/locale";

/** The next studio row: a free ebook in whichever language does not have one yet. */
export function nextBookFile(rows: ReadonlyArray<Record<string, unknown>>): {
  purpose: "free_download" | "sample";
  locale: Locale;
} {
  const missing = (["en", "el"] as const).find(
    (locale) => !rows.some((row) => row.purpose === "free_download" && row.locale === locale),
  );
  return missing
    ? { purpose: "free_download", locale: missing }
    : { purpose: "sample", locale: "en" };
}

/** Files in the asked-for language. English is used only when a caller allows the fallback. */
export function filesForLocale<T extends { locale: string }>(
  rows: T[],
  lang: Locale,
  fallbackToEnglish: boolean,
): T[] {
  const own = rows.filter((row) => row.locale === lang);
  if (own.length > 0 || !fallbackToEnglish) return own;
  return rows.filter((row) => row.locale === "en");
}

/** Which free ebook this page can give. Greek with only an English file is unavailable. */
export function freeEbookOffer(
  locales: ReadonlySet<string> | undefined,
  page: Locale,
): { freeDownload: Locale | null; greekEbookUnavailable: boolean } {
  const has = (locale: Locale) => locales?.has(locale) === true;
  if (has(page)) return { freeDownload: page, greekEbookUnavailable: false };
  return {
    freeDownload: null,
    greekEbookUnavailable: page === "el" && has("en"),
  };
}
