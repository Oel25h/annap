import { createFileRoute } from "@tanstack/react-router";
import { Gallery } from "./gallery";

export const Route = createFileRoute("/el/gallery")({
  head: () => ({
    meta: [
      { title: "Γκαλερί — Anastasia Patience" },
      { property: "og:locale", content: "el_GR" },
      { property: "og:url", content: "/el/gallery" },
    ],
    links: [
      { rel: "canonical", href: "/el/gallery" },
      { rel: "alternate", hrefLang: "en", href: "/gallery" },
      { rel: "alternate", hrefLang: "el", href: "/el/gallery" },
      { rel: "alternate", hrefLang: "x-default", href: "/gallery" },
    ],
  }),
  component: Gallery,
});
