import { createFileRoute } from "@tanstack/react-router";
import { BlogIndex } from "./blog.index";

export const Route = createFileRoute("/el/blog/")({
  head: () => ({
    meta: [
      { title: "Ιστολόγιο — Anastasia Patience" },
      {
        name: "description",
        content:
          "Επιστολές για πίστη, σκοπό, γυναίκες στην επιχειρηματικότητα, ψηφιακές δεξιότητες και μια ζωή που ξαναχτίζεται μετά την απώλεια.",
      },
      { property: "og:title", content: "Ιστολόγιο — Anastasia Patience" },
      {
        property: "og:description",
        content:
          "Επιστολές για πίστη, σκοπό, γυναίκες στην επιχειρηματικότητα και το χτίσιμο μετά την απώλεια.",
      },
      { property: "og:locale", content: "el_GR" },
      { property: "og:url", content: "/el/blog" },
    ],
    links: [
      { rel: "canonical", href: "/el/blog" },
      { rel: "alternate", hrefLang: "en", href: "/blog" },
      { rel: "alternate", hrefLang: "el", href: "/el/blog" },
      { rel: "alternate", hrefLang: "x-default", href: "/blog" },
    ],
  }),
  component: BlogIndex,
});
