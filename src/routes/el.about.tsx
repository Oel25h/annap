import { createFileRoute } from "@tanstack/react-router";
import { About } from "./about";

export const Route = createFileRoute("/el/about")({
  head: () => ({
    meta: [
      { title: "Σχετικά — Anastasia Patience" },
      { property: "og:locale", content: "el_GR" },
      { property: "og:url", content: "/el/about" },
    ],
    links: [
      { rel: "canonical", href: "/el/about" },
      { rel: "alternate", hrefLang: "en", href: "/about" },
      { rel: "alternate", hrefLang: "el", href: "/el/about" },
      { rel: "alternate", hrefLang: "x-default", href: "/about" },
    ],
  }),
  component: About,
});
