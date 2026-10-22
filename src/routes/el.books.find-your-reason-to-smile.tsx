import { createFileRoute } from "@tanstack/react-router";
import { BookDetail } from "./books.find-your-reason-to-smile";

export const Route = createFileRoute("/el/books/find-your-reason-to-smile")({
  head: () => ({
    meta: [
      { title: "Find Your Reason to Smile — Anastasia Patience" },
      { property: "og:locale", content: "el_GR" },
      { property: "og:url", content: "/el/books/find-your-reason-to-smile" },
    ],
    links: [
      { rel: "canonical", href: "/el/books/find-your-reason-to-smile" },
      { rel: "alternate", hrefLang: "en", href: "/books/find-your-reason-to-smile" },
      { rel: "alternate", hrefLang: "el", href: "/el/books/find-your-reason-to-smile" },
      { rel: "alternate", hrefLang: "x-default", href: "/books/find-your-reason-to-smile" },
    ],
  }),
  component: BookDetail,
});
