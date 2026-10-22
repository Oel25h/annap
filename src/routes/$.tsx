import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPage } from "@/lib/content.functions";
import { pageHead } from "@/lib/seo";
import { PageView } from "@/sections/PageView";

/** Every page made in the studio, looked up by path; English and, under /el, Greek. */
export const Route = createFileRoute("/$")({
  loaderDeps: ({ search }) => ({
    lang: (search as { lang?: string }).lang === "el" ? ("el" as const) : ("en" as const),
  }),
  loader: async ({ params, deps }) => {
    const page = await getPage({ data: { path: `/${params._splat ?? ""}`, locale: deps.lang } });
    if (!page) throw notFound();
    return page;
  },
  staleTime: 30_000,
  head: ({ loaderData }) => (loaderData ? pageHead(loaderData) : {}),
  component: CmsPage,
});

function CmsPage() {
  return <PageView page={Route.useLoaderData()} />;
}
