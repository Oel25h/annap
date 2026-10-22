import { createFileRoute } from "@tanstack/react-router";
import { itemHead, langDeps, loadItem } from "@/lib/item-route";
import { PageView } from "@/sections/PageView";

/** One book: its editions, its audiobook, praise for it and, when it has one, the free ebook. */
export const Route = createFileRoute("/books/$slug")({
  loaderDeps: langDeps,
  loader: ({ params, deps }) => loadItem("book", "/books", params.slug, deps.lang),
  staleTime: 30_000,
  head: ({ loaderData }) => itemHead(loaderData),
  component: BookPage,
});

function BookPage() {
  return <PageView page={Route.useLoaderData()} />;
}
