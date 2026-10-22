/**
 * Public data functions. Each runs on the server, reads with the visitor's
 * rights and returns plain data, so public pages never load supabase-js or Zod.
 */
import { createServerFn } from "@tanstack/react-start";
import type { Locale } from "@/lib/i18n/locale";

type PageInput = { path: string; locale: Locale };

function readPageInput(input: unknown): PageInput {
  const value = (input ?? {}) as Partial<PageInput>;
  return {
    path: typeof value.path === "string" ? value.path.slice(0, 200) : "/",
    locale: value.locale === "el" ? "el" : "en",
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
    return loadPage(data.path, data.locale);
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
