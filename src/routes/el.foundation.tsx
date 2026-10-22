import { createFileRoute } from "@tanstack/react-router";
import { FoundationPage } from "./foundation";
import { absoluteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/el/foundation")({
  head: () => ({
    meta: [
      { title: "Ίδρυμα Patience Humanitarian" },
      {
        name: "description",
        content:
          "Όπου κανείς δεν μένει πίσω. Τρόφιμα, φροντίδα, κοινοτική υποστήριξη και φροντίδα για ζώα υπό διάσωση.",
      },
      { property: "og:locale", content: "el_GR" },
      { property: "og:url", content: absoluteUrl("/el/foundation") },
      { property: "og:image", content: absoluteUrl("/foundation-hero-mark.jpg") },
    ],
    links: [
      { rel: "canonical", href: absoluteUrl("/el/foundation") },
      { rel: "alternate", hrefLang: "en", href: absoluteUrl("/foundation") },
      { rel: "alternate", hrefLang: "el", href: absoluteUrl("/el/foundation") },
      { rel: "alternate", hrefLang: "x-default", href: absoluteUrl("/foundation") },
    ],
  }),
  component: FoundationPage,
});
