import { createFileRoute } from "@tanstack/react-router";
import { Collection } from "@/components/studio/collection";
import { BOOKS } from "@/components/studio/collections";

/** Manage the books: each one's formats, retailer links, free downloads and praise. */
export const Route = createFileRoute("/_authenticated/admin/books")({
  head: () => ({ meta: [{ title: "Books — Studio" }] }),
  validateSearch: (s: Record<string, unknown>): { item?: string } => ({
    item: typeof s.item === "string" ? s.item : undefined,
  }),
  component: BooksManager,
});

function BooksManager() {
  const { item } = Route.useSearch();
  return <Collection config={BOOKS} item={item} />;
}
