/**
 * schema.org data for search engines: Anastasia as a Person, the site, the
 * foundation, and a breadcrumb trail on every inner page. Pages send it as
 * one JSON-LD graph.
 */
import { localizePath, type Locale } from "@/lib/i18n/locale";
import { readServerPublicConfig } from "@/lib/public-config";
import { fetchOverlays, overlayKey } from "./overlays.server";
import type { PublicDb } from "./supabase-public.server";

type Node = Record<string, unknown>;

const NAME = "Anastasia Patience";
const FOUNDATION = "Patience Humanitarian Foundation";

export function personId(): string {
  return `${readServerPublicConfig().siteUrl}/#anastasia`;
}

/** Her profiles elsewhere, for `sameAs`. */
async function profiles(db: PublicDb): Promise<string[]> {
  const { data } = await db.from("social_links").select("url").order("position");
  return (data ?? []).map((row) => row.url).filter((url) => /^https:\/\//.test(url));
}

async function person(db: PublicDb, image: string | null): Promise<Node> {
  const { siteUrl } = readServerPublicConfig();
  const sameAs = await profiles(db);
  return {
    "@type": "Person",
    "@id": personId(),
    name: NAME,
    url: `${siteUrl}/about`,
    jobTitle: "Author",
    ...(image ? { image } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/** The title of the page at a path, in the reader's language when approved. */
async function pageTitle(db: PublicDb, path: string, locale: Locale): Promise<string | null> {
  const { data: row } = await db.from("pages").select("id, title").eq("path", path).maybeSingle();
  if (!row) return null;
  if (locale !== "el") return row.title;
  const overlays = await fetchOverlays(db, { page_meta: [row.id] });
  return overlays.get(overlayKey("page_meta", row.id))?.fields.title?.trim() || row.title;
}

/** Home › parent › this page, as absolute URLs in the reader's language. */
async function breadcrumb(
  db: PublicDb,
  locale: Locale,
  trail: { path: string; name?: string }[],
): Promise<Node> {
  const { siteUrl } = readServerPublicConfig();
  const home = locale === "el" ? "Αρχική" : "Home";
  const items: { name: string; path: string }[] = [{ name: home, path: "/" }];
  for (const step of trail) {
    const name = step.name ?? (await pageTitle(db, step.path, locale));
    if (name) items.push({ name, path: step.path });
  }
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${localizePath(item.path, locale)}`,
    })),
  };
}

function graph(nodes: Node[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes });
}

/** JSON-LD for a page made in the studio. */
export async function pageJsonLd(
  db: PublicDb,
  page: { path: string; title: string; locale: Locale; canonical: string; image: string | null },
): Promise<string> {
  const { siteUrl } = readServerPublicConfig();
  if (page.path === "/") {
    return graph([
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#site`,
        name: NAME,
        url: siteUrl,
        inLanguage: ["en", "el"],
        publisher: { "@id": personId() },
      },
      await person(db, page.image),
    ]);
  }
  const nodes: Node[] = [
    await breadcrumb(db, page.locale, [{ path: page.path, name: page.title }]),
  ];
  if (page.path === "/about") {
    nodes.push(
      {
        "@type": "AboutPage",
        url: page.canonical,
        name: page.title,
        mainEntity: { "@id": personId() },
      },
      await person(db, page.image),
    );
  }
  if (page.path === "/foundation") {
    nodes.push({
      "@type": "NGO",
      name: FOUNDATION,
      url: page.canonical,
      founder: { "@id": personId() },
    });
  }
  return graph(nodes);
}

/** JSON-LD for a collection item: the item itself and its breadcrumb. */
export async function itemJsonLd(
  db: PublicDb,
  item: Node,
  trail: { locale: Locale; parent: string; path: string; name: string },
): Promise<string> {
  const crumbs = await breadcrumb(db, trail.locale, [
    { path: trail.parent },
    { path: trail.path, name: trail.name },
  ]);
  const { "@context": _context, ...node } = item;
  return graph([node, crumbs]);
}
