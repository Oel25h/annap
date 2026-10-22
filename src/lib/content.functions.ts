/**
 * Public data functions. Each runs on the server, reads with the visitor's
 * rights and returns plain data, so public pages never load supabase-js or Zod.
 */
import { createServerFn } from "@tanstack/react-start";
import { localizePath, type Locale } from "@/lib/i18n/locale";
import type { PageQuery } from "@/sections/types";

type PageInput = { path: string; locale: Locale; query: PageQuery };

const CATEGORY = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** ?page= and ?category= for the journal index; anything else is dropped. */
export function readPageQuery(search: Record<string, unknown>): PageQuery {
  const page = Number(search.page);
  const category = typeof search.category === "string" ? search.category : "";
  return {
    ...(Number.isInteger(page) && page > 1 && page < 1000 ? { page } : {}),
    ...(CATEGORY.test(category) && category.length <= 60 ? { category } : {}),
  };
}

function readPageInput(input: unknown): PageInput {
  const value = (input ?? {}) as Partial<PageInput>;
  return {
    path: typeof value.path === "string" ? value.path.slice(0, 200) : "/",
    locale: value.locale === "el" ? "el" : "en",
    query: readPageQuery((value.query ?? {}) as Record<string, unknown>),
  };
}

function readLocale(input: unknown): Locale {
  return input === "el" ? "el" : "en";
}

/** A published CMS page in one language, or null when there is none at that path. */
export const getPage = createServerFn({ method: "GET" })
  .validator(readPageInput)
  .handler(async ({ data }) => {
    const { loadPage } = await import("@/server/pages.server");
    return loadPage(data.path, data.locale, data.query);
  });

export type ItemKind = "book" | "post" | "product" | "masterclass" | "event" | "story";

const KINDS = new Set<ItemKind>(["book", "post", "product", "masterclass", "event", "story"]);

/** A published collection item's page (a book, a post…) in one language, or null. */
export const getItemPage = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    const value = (input ?? {}) as { kind?: unknown; slug?: unknown; locale?: unknown };
    return {
      kind: KINDS.has(value.kind as ItemKind) ? (value.kind as ItemKind) : "book",
      slug: typeof value.slug === "string" ? value.slug.slice(0, 120) : "",
      locale: readLocale(value.locale),
    };
  })
  .handler(async ({ data }) => {
    const { loadItemPage } = await import("@/server/items.server");
    return loadItemPage(data.kind, data.slug, data.locale);
  });

/**
 * Where a missing path has moved, if the studio says so: the target in the
 * reader's language, and 301 or 302.
 */
export const getRedirect = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    const value = (input ?? {}) as { path?: unknown; locale?: unknown };
    return {
      path: typeof value.path === "string" ? value.path.slice(0, 300) : "",
      locale: readLocale(value.locale),
    };
  })
  .handler(async ({ data }) => {
    const { findRedirect } = await import("@/server/redirects.server");
    const found = await findRedirect(data.path);
    if (!found) return null;
    const href = found.to.startsWith("/") ? localizePath(found.to, data.locale) : found.to;
    return { href, status: found.status };
  });

/** Settings, menus and social links for the header and footer. */
export const getSiteShell = createServerFn({ method: "GET" })
  .validator(readLocale)
  .handler(async ({ data: locale }) => {
    const [{ getSiteShell: load }, { publicDb }] = await Promise.all([
      import("@/server/site.server"),
      import("@/server/supabase-public.server"),
    ]);
    return load(publicDb(), locale);
  });
