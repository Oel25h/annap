import { createFileRoute } from "@tanstack/react-router";
import { Start } from "./start";

export const Route = createFileRoute("/el/start")({
  head: () => ({
    meta: [
      { title: "Ξεκίνα εδώ — Anastasia Patience" },
      { property: "og:locale", content: "el_GR" },
      { property: "og:url", content: "/el/start" },
    ],
    links: [
      { rel: "canonical", href: "/el/start" },
      { rel: "alternate", hrefLang: "en", href: "/start" },
      { rel: "alternate", hrefLang: "el", href: "/el/start" },
      { rel: "alternate", hrefLang: "x-default", href: "/start" },
    ],
  }),
  component: Start,
});
