import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPage } from "@/lib/content.functions";
import { pageHead } from "@/lib/seo";
import { PageView } from "@/sections/PageView";

/** The home page: the page at "/" in the studio. */
export const Route = createFileRoute("/")({
  loaderDeps: ({ search }) => ({
    lang: (search as { lang?: string }).lang === "el" ? ("el" as const) : ("en" as const),
  }),
  loader: async ({ deps }) => {
    const page = await getPage({ data: { path: "/", locale: deps.lang } });
    if (!page) throw notFound();
    return page;
  },
  staleTime: 30_000,
  head: ({ loaderData }) => (loaderData ? pageHead(loaderData) : {}),
  component: Home,
});

function Home() {
  return <PageView page={Route.useLoaderData()} />;
}
