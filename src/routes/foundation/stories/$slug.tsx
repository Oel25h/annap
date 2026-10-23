import { createFileRoute } from "@tanstack/react-router";
import { itemHead, langDeps, loadItem } from "@/lib/item-route";
import { ItemPageView } from "@/sections/ItemPageView";

/** One story shared with the foundation, and a way to help. */
export const Route = createFileRoute("/foundation/stories/$slug")({
  loaderDeps: langDeps,
  loader: ({ params, deps }) => loadItem("story", "/foundation/stories", params.slug, deps.lang),
  staleTime: 30_000,
  head: ({ loaderData }) => itemHead(loaderData),
  component: StoryPage,
});

function StoryPage() {
  return <ItemPageView page={Route.useLoaderData()} />;
}
