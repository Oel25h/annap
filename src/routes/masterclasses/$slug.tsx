import { createFileRoute } from "@tanstack/react-router";
import { itemHead, langDeps, loadItem } from "@/lib/item-route";
import { ItemPageView } from "@/sections/ItemPageView";

/** One masterclass: what it covers, when it runs, and how to enrol or join the waitlist. */
export const Route = createFileRoute("/masterclasses/$slug")({
  loaderDeps: langDeps,
  loader: ({ params, deps }) => loadItem("masterclass", "/masterclasses", params.slug, deps.lang),
  staleTime: 30_000,
  head: ({ loaderData }) => itemHead(loaderData),
  component: MasterclassPage,
});

function MasterclassPage() {
  return <ItemPageView page={Route.useLoaderData()} />;
}
