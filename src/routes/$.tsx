import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPage, readPageQuery } from "@/lib/content.functions";
import { followRedirect } from "@/lib/item-route";
import { pageHead } from "@/lib/seo";
import type { PageQuery } from "@/sections/types";
import { PageView } from "@/sections/PageView";

/**
 * Every page made in the studio, looked up by path; English and, under /el,
 * Greek. The journal index reads ?page= and ?category=. A path that is not a
 * page may have moved, so the studio's redirects are checked before a 404.
 */
export const Route = createFileRoute("/$")({
  validateSearch: (search: Record<string, unknown>): PageQuery => readPageQuery(search),
  loaderDeps: ({ search }) => ({
    lang: (search as { lang?: string }).lang === "el" ? ("el" as const) : ("en" as const),
    query: { page: search.page, category: search.category } as PageQuery,
  }),
  loader: async ({ params, deps }) => {
    const path = `/${params._splat ?? ""}`;
    const page = await getPage({ data: { path, locale: deps.lang, query: deps.query } });
    if (page) return page;
    await followRedirect(path, deps.lang);
    throw notFound();
  },
  staleTime: 30_000,
  head: ({ loaderData }) => (loaderData ? pageHead(loaderData) : {}),
  component: CmsPage,
});

function CmsPage() {
  return <PageView page={Route.useLoaderData()} />;
}
