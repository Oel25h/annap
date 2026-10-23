import { createFileRoute } from "@tanstack/react-router";
import { Collection } from "@/components/studio/collection";
import { EVENTS } from "@/components/studio/collections";

/** Manage talks, readings and other events. */
export const Route = createFileRoute("/_authenticated/admin/events")({
  head: () => ({ meta: [{ title: "Events — Studio" }] }),
  validateSearch: (s: Record<string, unknown>): { item?: string } => ({
    item: typeof s.item === "string" ? s.item : undefined,
  }),
  component: EventsManager,
});

function EventsManager() {
  const { item } = Route.useSearch();
  return <Collection config={EVENTS} item={item} />;
}
