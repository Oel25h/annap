import { createFileRoute } from "@tanstack/react-router";
import { Home } from "./index";

export const Route = createFileRoute("/el/")({
  head: () => ({
    meta: [
      { title: "Anastasia Patience — Βρες τον λόγο σου να χαμογελάς" },
      { property: "og:locale", content: "el_GR" },
      { property: "og:locale:alternate", content: "en_US" },
      { property: "og:url", content: "/el" },
    ],
    links: [
      { rel: "canonical", href: "/el" },
      { rel: "alternate", hrefLang: "en", href: "/" },
      { rel: "alternate", hrefLang: "el", href: "/el" },
      { rel: "alternate", hrefLang: "x-default", href: "/" },
    ],
  }),
  component: Home,
});
