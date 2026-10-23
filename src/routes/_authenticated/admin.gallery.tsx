import { createFileRoute } from "@tanstack/react-router";
import { Collection } from "@/components/studio/collection";
import { GALLERY } from "@/components/studio/collections";

/** Manage the gallery's sections and their images. */
export const Route = createFileRoute("/_authenticated/admin/gallery")({
  head: () => ({ meta: [{ title: "Gallery — Studio" }] }),
  validateSearch: (s: Record<string, unknown>): { item?: string } => ({
    item: typeof s.item === "string" ? s.item : undefined,
  }),
  component: GalleryManager,
});

function GalleryManager() {
  const { item } = Route.useSearch();
  return <Collection config={GALLERY} item={item} />;
}
