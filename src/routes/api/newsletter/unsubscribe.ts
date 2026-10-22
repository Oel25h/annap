import { createFileRoute } from "@tanstack/react-router";
import { localizePath } from "@/lib/i18n/locale";

/**
 * Unsubscribes in one step. Mail apps post here straight from the inbox
 * (List-Unsubscribe=One-Click, RFC 8058, with the token in the address) and
 * get a plain 200; the button on /unsubscribe posts the token in the form and
 * is sent back to the page with the result.
 */
export const Route = createFileRoute("/api/newsletter/unsubscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const form = await request.formData().catch(() => null);
        const oneClick = form?.get("List-Unsubscribe") === "One-Click";
        const token = String(form?.get("token") ?? url.searchParams.get("token") ?? "");
        const { unsubscribe } = await import("@/server/forms.server");
        const result = await unsubscribe(token);
        if (oneClick) {
          return new Response(result === "done" ? "Unsubscribed" : "Unknown link", {
            status: result === "done" ? 200 : 404,
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }
        const lang = form?.get("lang") === "el" ? "el" : "en";
        const location = `${localizePath("/unsubscribe", lang)}?result=${result}`;
        return new Response(null, { status: 303, headers: { Location: location } });
      },
    },
  },
});
