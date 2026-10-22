import { createFileRoute } from "@tanstack/react-router";
import { Master } from "./masterclasses";

export const Route = createFileRoute("/el/masterclasses")({
  head: () => ({
    meta: [
      { title: "Masterclasses — Anastasia Patience" },
      { property: "og:locale", content: "el_GR" },
      { property: "og:url", content: "/el/masterclasses" },
    ],
    links: [
      { rel: "canonical", href: "/el/masterclasses" },
      { rel: "alternate", hrefLang: "en", href: "/masterclasses" },
      { rel: "alternate", hrefLang: "el", href: "/el/masterclasses" },
      { rel: "alternate", hrefLang: "x-default", href: "/masterclasses" },
    ],
  }),
  component: Master,
});
