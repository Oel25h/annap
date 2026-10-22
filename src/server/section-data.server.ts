/**
 * Data a section needs beyond its own props (books for a book list, tracks
 * for the audiobook player). Each section type with data registers one
 * loader; a page's loaders run in parallel, one query per type.
 */
import type { Locale } from "@/lib/i18n/locale";
import type { AnySection, SectionOf, SectionType } from "@/sections/schemas";
import type { SectionDataMap } from "@/sections/types";
import type { PublicDb } from "./supabase-public.server";

export type SectionLoaderContext = { db: PublicDb; locale: Locale };

type SectionLoader<T extends SectionType> = (
  ctx: SectionLoaderContext,
  sections: SectionOf<T>[],
) => Promise<Map<string, SectionDataMap[T]>>;

const LOADERS: { [T in SectionType]?: SectionLoader<T> } = {};

/** Data for every section that has a loader, keyed by section id. */
export async function loadSectionData(
  db: PublicDb,
  sections: AnySection[],
  locale: Locale,
): Promise<Map<string, unknown>> {
  const byType = new Map<SectionType, AnySection[]>();
  for (const section of sections) {
    const type = section.type as SectionType;
    if (!LOADERS[type]) continue;
    byType.set(type, [...(byType.get(type) ?? []), section]);
  }
  const results = await Promise.all(
    [...byType].map(([type, list]) =>
      (LOADERS[type] as SectionLoader<SectionType>)({ db, locale }, list as never),
    ),
  );
  const out = new Map<string, unknown>();
  for (const result of results) for (const [id, data] of result) out.set(id, data);
  return out;
}
