import { createFileRoute } from "@tanstack/react-router";
import { itemHead, langDeps, loadItem } from "@/lib/item-route";
import { PageView } from "@/sections/PageView";

/** One journal post, with a few more to read after it. */
export const Route = createFileRoute("/blog/$slug")({
  loaderDeps: langDeps,
  loader: ({ params, deps }) => loadItem("post", "/blog", params.slug, deps.lang),
  staleTime: 30_000,
  head: ({ loaderData }) => itemHead(loaderData),
  component: PostPage,
});

function PostPage() {
  return <PageView page={Route.useLoaderData()} />;
}
