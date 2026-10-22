import { createFileRoute } from "@tanstack/react-router";
import { Contact } from "./contact";

export const Route = createFileRoute("/el/contact")({
  head: () => ({
    meta: [
      { title: "Επικοινωνία — Anastasia Patience" },
      { property: "og:locale", content: "el_GR" },
      { property: "og:url", content: "/el/contact" },
    ],
    links: [
      { rel: "canonical", href: "/el/contact" },
      { rel: "alternate", hrefLang: "en", href: "/contact" },
      { rel: "alternate", hrefLang: "el", href: "/el/contact" },
      { rel: "alternate", hrefLang: "x-default", href: "/contact" },
    ],
  }),
  component: Contact,
});
