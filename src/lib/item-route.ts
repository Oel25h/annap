/**
 * What every collection item's route shares: the language from the address,
 * the item's page or, when it has moved, the studio's redirect, and the head
 * tags with schema.org data.
 */
import { notFound, redirect } from "@tanstack/react-router";
import type { PageData } from "@/sections/types";
import { getItemPage, getRedirect, type ItemKind } from "./content.functions";
import type { Locale } from "./i18n/locale";
import { jsonLdScript, pageHead } from "./seo";

export function langDeps({ search }: { search: unknown }): { lang: Locale } {
  return { lang: (search as { lang?: string }).lang === "el" ? "el" : "en" };
}

/** Sends the reader on when the studio says this path moved. */
export async function followRedirect(path: string, locale: Locale): Promise<void> {
  const moved = await getRedirect({ data: { path, locale } });
  if (moved) throw redirect({ href: moved.href, statusCode: moved.status });
}

export async function loadItem(
  kind: ItemKind,
  base: string,
  slug: string,
  locale: Locale,
): Promise<PageData> {
  const page = await getItemPage({ data: { kind, slug, locale } });
  if (page) return page;
  await followRedirect(`${base}/${slug}`, locale);
  throw notFound();
}

const OG_TYPE: Record<string, "book" | "article" | "website"> = {
  book: "book",
  post: "article",
  story: "article",
};

export function itemHead(page: PageData | undefined) {
  if (!page) return {};
  return {
    ...pageHead({ ...page, type: OG_TYPE[page.kind] ?? "website" }),
    scripts: jsonLdScript(page.jsonLd),
  };
}
