import { createFileRoute } from "@tanstack/react-router";
import { Collection } from "@/components/studio/collection";
import { PRESS } from "@/components/studio/collections";

/** Manage press coverage and interviews. */
export const Route = createFileRoute("/_authenticated/admin/press")({
  head: () => ({ meta: [{ title: "Press — Studio" }] }),
  validateSearch: (s: Record<string, unknown>): { item?: string } => ({
    item: typeof s.item === "string" ? s.item : undefined,
  }),
  component: PressManager,
});

function PressManager() {
  const { item } = Route.useSearch();
  return <Collection config={PRESS} item={item} />;
}
