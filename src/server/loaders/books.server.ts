/**
 * Books for sections and book pages: text in the page's language where a
 * person approved it, the formats to offer, and whether there is a free copy.
 */
import { freeEbookOffer } from "@/lib/book-files";
import type { Locale } from "@/lib/i18n/locale";
import type { BookFormat, BookOffer, BookSummary } from "@/sections/types";
import {
  itemOverlays,
  overlayFields,
  publicIntegrations,
  type LoaderContext,
} from "./common.server";

const FORMAT_ORDER: BookFormat[] = ["paperback", "hardcover", "ebook", "audiobook"];

/** The fields whose approved Greek makes a book Greek. */
export const BOOK_TEXT = ["title", "subtitle", "tagline", "description"] as const;

type FormatRow = {
  id: string;
  format: string;
  locale: string | null;
  price_cents: number | null;
  currency: string;
  external_url: string | null;
  retailer: string;
  available: boolean;
  position: number;
};

/** For each format, the edition in the page's language, else one for every language, else English. */
function pickOffers(rows: FormatRow[], locale: Locale, payments: boolean): BookOffer[] {
  const offers: BookOffer[] = [];
  for (const format of FORMAT_ORDER) {
    const candidates = rows.filter((r) => r.format === format && r.available);
    const row =
      candidates.find((r) => r.locale === locale) ??
      candidates.find((r) => r.locale === null) ??
      candidates.find((r) => r.locale === "en");
    if (!row) continue;
    const buyHere = payments && row.price_cents !== null;
    // An audiobook with nowhere to buy it still shows, as "listen above" next to a player.
    if (!buyHere && !row.external_url && format !== "audiobook") continue;
    offers.push({
      id: row.id,
      format,
      retailer: row.retailer,
      externalUrl: row.external_url,
      priceCents: row.price_cents,
      currency: row.currency,
      buyHere,
    });
  }
  return offers;
}

/** Published books, all of them or the listed ids, in shelf order. */
export async function loadBooks(ctx: LoaderContext, ids?: string[]): Promise<BookSummary[]> {
  let query = ctx.db
    .from("books")
    .select(
      "id, slug, title, subtitle, tagline, description, cover_media_id, sort_order, book_formats(id, format, locale, price_cents, currency, external_url, retailer, available, position)",
    )
    .order("sort_order");
  if (ids) {
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Books: ${error.message}`);
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const bookIds = rows.map((r) => r.id);
  const [overlays, integrations, downloads] = await Promise.all([
    itemOverlays(ctx, "book", bookIds),
    publicIntegrations(ctx),
    ctx.db.rpc("free_download_locales", { _book_ids: bookIds }),
  ]);
  const freeLocales = new Map<string, Set<string>>();
  for (const row of downloads.data ?? []) {
    const set = freeLocales.get(row.book_id) ?? new Set<string>();
    set.add(row.locale);
    freeLocales.set(row.book_id, set);
  }

  return rows.map((row) => {
    const { item, lang } = overlayFields(
      {
        title: row.title,
        subtitle: row.subtitle ?? "",
        tagline: row.tagline ?? "",
        description: row.description ?? "",
      },
      overlays,
      "book",
      row.id,
      BOOK_TEXT,
    );
    const free = freeLocales.get(row.id);
    return {
      id: row.id,
      slug: row.slug,
      ...item,
      coverMediaId: row.cover_media_id,
      textLang: lang,
      offers: pickOffers(
        [...(row.book_formats as FormatRow[])].sort((a, b) => a.position - b.position),
        ctx.locale,
        integrations.payments,
      ),
      ...freeEbookOffer(free, ctx.locale),
    };
  });
}
