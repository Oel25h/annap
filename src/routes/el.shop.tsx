import { createFileRoute } from "@tanstack/react-router";
import { Shop } from "./shop";

export const Route = createFileRoute("/el/shop")({
  head: () => ({
    meta: [
      { title: "Κατάστημα — Anastasia Patience" },
      { property: "og:locale", content: "el_GR" },
      { property: "og:url", content: "/el/shop" },
    ],
    links: [
      { rel: "canonical", href: "/el/shop" },
      { rel: "alternate", hrefLang: "en", href: "/shop" },
      { rel: "alternate", hrefLang: "el", href: "/el/shop" },
      { rel: "alternate", hrefLang: "x-default", href: "/shop" },
    ],
  }),
  component: Shop,
});
