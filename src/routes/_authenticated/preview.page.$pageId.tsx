import { createFileRoute, notFound } from "@tanstack/react-router";
import { StudioBridge } from "@/components/studio/StudioBridge";
import { getStudioPreview } from "@/lib/studio.functions";
import { PageView } from "@/sections/PageView";

/**
 * A page's draft, rendered as the site will show it: the studio's live
 * preview frame and its Preview button. Admins only; never cached or indexed.
 */
export const Route = createFileRoute("/_authenticated/preview/page/$pageId")({
  loaderDeps: ({ search }) => ({
    lang: (search as { lang?: string }).lang === "el" ? ("el" as const) : ("en" as const),
  }),
  loader: async ({ params, deps }) => {
    const page = await getStudioPreview({ data: { pageId: params.pageId, locale: deps.lang } });
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Preview: ${loaderData?.title ?? "page"}` },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Preview,
});

function Preview() {
  return (
    <>
      <PageView page={Route.useLoaderData()} />
      <StudioBridge />
    </>
  );
}
