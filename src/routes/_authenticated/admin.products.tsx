import { createFileRoute } from "@tanstack/react-router";
import { Collection } from "@/components/studio/collection";
import { PRODUCTS } from "@/components/studio/collections";

/** Manage the shop's products, their images and categories. */
export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({ meta: [{ title: "Shop — Studio" }] }),
  validateSearch: (s: Record<string, unknown>): { item?: string } => ({
    item: typeof s.item === "string" ? s.item : undefined,
  }),
  component: ProductsManager,
});

function ProductsManager() {
  const { item } = Route.useSearch();
  return <Collection config={PRODUCTS} item={item} />;
}
