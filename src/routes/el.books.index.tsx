import { createFileRoute } from "@tanstack/react-router";
import { BooksPage } from "./books.index";

export const Route = createFileRoute("/el/books/")({
  head: () => ({
    meta: [
      { title: "Βιβλία — Anastasia Patience" },
      { property: "og:locale", content: "el_GR" },
      { property: "og:url", content: "/el/books" },
    ],
    links: [
      { rel: "canonical", href: "/el/books" },
      { rel: "alternate", hrefLang: "en", href: "/books" },
      { rel: "alternate", hrefLang: "el", href: "/el/books" },
      { rel: "alternate", hrefLang: "x-default", href: "/books" },
    ],
  }),
  component: BooksPage,
});
