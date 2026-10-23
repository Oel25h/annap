import { createFileRoute } from "@tanstack/react-router";
import { itemHead, langDeps, loadItem } from "@/lib/item-route";
import { ItemPageView } from "@/sections/ItemPageView";

/** One event: when, where and how to come. */
export const Route = createFileRoute("/events/$slug")({
  loaderDeps: langDeps,
  loader: ({ params, deps }) => loadItem("event", "/events", params.slug, deps.lang),
  staleTime: 30_000,
  head: ({ loaderData }) => itemHead(loaderData),
  component: EventPage,
});

function EventPage() {
  return <ItemPageView page={Route.useLoaderData()} />;
}
