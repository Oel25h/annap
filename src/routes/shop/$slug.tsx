import { createFileRoute } from "@tanstack/react-router";
import { itemHead, langDeps, loadItem } from "@/lib/item-route";
import { ItemPageView } from "@/sections/ItemPageView";

/** One thing from the shop and how to get it. */
export const Route = createFileRoute("/shop/$slug")({
  loaderDeps: langDeps,
  loader: ({ params, deps }) => loadItem("product", "/shop", params.slug, deps.lang),
  staleTime: 30_000,
  head: ({ loaderData }) => itemHead(loaderData),
  component: ProductPage,
});

function ProductPage() {
  return <ItemPageView page={Route.useLoaderData()} />;
}
