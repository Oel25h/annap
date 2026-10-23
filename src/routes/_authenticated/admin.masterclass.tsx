import { createFileRoute } from "@tanstack/react-router";
import { Collection } from "@/components/studio/collection";
import { MASTERCLASSES } from "@/components/studio/collections";

/** Manage the masterclasses. */
export const Route = createFileRoute("/_authenticated/admin/masterclass")({
  head: () => ({ meta: [{ title: "Masterclasses — Studio" }] }),
  validateSearch: (s: Record<string, unknown>): { item?: string } => ({
    item: typeof s.item === "string" ? s.item : undefined,
  }),
  component: MasterclassesManager,
});

function MasterclassesManager() {
  const { item } = Route.useSearch();
  return <Collection config={MASTERCLASSES} item={item} />;
}
