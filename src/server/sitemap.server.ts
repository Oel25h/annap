/**
 * The sitemap: every published page and collection item, in English, and in
 * Greek where the Greek is approved, with hreflang pairs only for those.
 * The Greek rules match the pages' own, so the sitemap and each page's head
 * always agree.
 */
import { localizePath } from "@/lib/i18n/locale";
import { readServerPublicConfig } from "@/lib/public-config";
import { ITEM_BASE, itemHasGreek, type ItemKind } from "./items.server";
import { overlayKey, type OverlayMap } from "./overlays.server";
import { pageHasGreek, parseSections } from "./pages.server";
import { publicDb, type PublicDb } from "./supabase-public.server";

type Entry = { path: string; greek: boolean; lastmod: string | null };

const ITEM_TABLES: Record<ItemKind, string> = {
  book: "books",
  post: "blog_posts",
  product: "products",
  masterclass: "masterclasses",
  event: "events",
  story: "foundation_stories",
};

/** Every approved Greek translation, keyed like the page loaders key them. */
async function approvedGreek(db: PublicDb): Promise<OverlayMap> {
  const { data, error } = await db
    .from("content_translations")
    .select("entity_type, entity_id, fields")
    .eq("locale", "el")
    .eq("status", "approved");
  if (error) throw new Error(`Sitemap translations: ${error.message}`);
  const map: OverlayMap = new Map();
  for (const row of data ?? []) {
    const fields: Record<string, string> = {};
    for (const [key, text] of Object.entries((row.fields ?? {}) as Record<string, unknown>)) {
      if (typeof text === "string" && text.trim()) fields[key] = text;
    }
    if (Object.keys(fields).length > 0) {
      map.set(overlayKey(row.entity_type, row.entity_id), { fields, stale: false });
    }
  }
  return map;
}

async function pageEntries(db: PublicDb, greek: OverlayMap): Promise<Entry[]> {
  const { data, error } = await db.from("pages").select("id, path, noindex, sections, updated_at");
  if (error) throw new Error(`Sitemap pages: ${error.message}`);
  return (data ?? [])
    .filter((row) => !row.noindex)
    .map((row) => ({
      path: row.path,
      // The rule loadPage uses for each page's own head.
      greek: pageHasGreek(row.id, parseSections(row.sections, row.path), greek),
      lastmod: row.updated_at,
    }));
}

async function itemEntries(db: PublicDb, kind: ItemKind, greek: OverlayMap): Promise<Entry[]> {
  const table = ITEM_TABLES[kind];
  const { data, error } = await db
    .from(table as "books")
    .select("id, slug, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(`Sitemap ${table}: ${error.message}`);
  return (data ?? []).map((row) => ({
    path: `${ITEM_BASE[kind]}/${row.slug}`,
    // The rule each item's own head uses.
    greek: itemHasGreek(kind, row.id, greek),
    lastmod: row.updated_at,
  }));
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function buildSitemap(): Promise<string> {
  const db = publicDb();
  const greek = await approvedGreek(db);
  const kinds = Object.keys(ITEM_TABLES) as ItemKind[];
  const lists = await Promise.all([
    pageEntries(db, greek),
    ...kinds.map((kind) => itemEntries(db, kind, greek)),
  ]);
  const { siteUrl } = readServerPublicConfig();

  const urls: string[] = [];
  for (const entry of lists.flat()) {
    const en = `${siteUrl}${localizePath(entry.path, "en")}`;
    const el = `${siteUrl}${localizePath(entry.path, "el")}`;
    const lastmod = entry.lastmod ? `\n    <lastmod>${entry.lastmod.slice(0, 10)}</lastmod>` : "";
    const alternates = entry.greek
      ? [
          `\n    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(en)}"/>`,
          `\n    <xhtml:link rel="alternate" hreflang="el" href="${escapeXml(el)}"/>`,
          `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(en)}"/>`,
        ].join("")
      : "";
    for (const loc of entry.greek ? [en, el] : [en]) {
      urls.push(`  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmod}${alternates}\n  </url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
}
