import { createFileRoute } from "@tanstack/react-router";
import { Collection } from "@/components/studio/collection";
import { FOUNDATION } from "@/components/studio/collections";

/** Manage the foundation's stories and their categories. */
export const Route = createFileRoute("/_authenticated/admin/foundation")({
  head: () => ({ meta: [{ title: "Foundation stories — Studio" }] }),
  validateSearch: (s: Record<string, unknown>): { item?: string } => ({
    item: typeof s.item === "string" ? s.item : undefined,
  }),
  component: FoundationManager,
});

function FoundationManager() {
  const { item } = Route.useSearch();
  return <Collection config={FOUNDATION} item={item} />;
}
