import { createFileRoute } from "@tanstack/react-router";
import { Collection } from "@/components/studio/collection";
import { AUDIOBOOKS } from "@/components/studio/collections";

/** Manage the audiobooks and their chapters, free to stream or paid. */
export const Route = createFileRoute("/_authenticated/admin/audiobooks")({
  head: () => ({ meta: [{ title: "Audiobooks — Studio" }] }),
  validateSearch: (s: Record<string, unknown>): { item?: string } => ({
    item: typeof s.item === "string" ? s.item : undefined,
  }),
  component: AudiobooksManager,
});

function AudiobooksManager() {
  const { item } = Route.useSearch();
  return <Collection config={AUDIOBOOKS} item={item} />;
}
