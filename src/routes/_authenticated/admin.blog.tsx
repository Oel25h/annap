import { createFileRoute } from "@tanstack/react-router";
import { Collection } from "@/components/studio/collection";
import { POSTS } from "@/components/studio/collections";

/** Manage the stories and blog posts, with their categories. */
export const Route = createFileRoute("/_authenticated/admin/blog")({
  head: () => ({ meta: [{ title: "Stories — Studio" }] }),
  validateSearch: (s: Record<string, unknown>): { item?: string } => ({
    item: typeof s.item === "string" ? s.item : undefined,
  }),
  component: PostsManager,
});

function PostsManager() {
  const { item } = Route.useSearch();
  return <Collection config={POSTS} item={item} />;
}
