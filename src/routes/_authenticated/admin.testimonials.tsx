import { createFileRoute } from "@tanstack/react-router";
import { Collection } from "@/components/studio/collection";
import { TESTIMONIALS } from "@/components/studio/collections";

/** Manage what readers and listeners say. */
export const Route = createFileRoute("/_authenticated/admin/testimonials")({
  head: () => ({ meta: [{ title: "Praise — Studio" }] }),
  validateSearch: (s: Record<string, unknown>): { item?: string } => ({
    item: typeof s.item === "string" ? s.item : undefined,
  }),
  component: TestimonialsManager,
});

function TestimonialsManager() {
  const { item } = Route.useSearch();
  return <Collection config={TESTIMONIALS} item={item} />;
}
