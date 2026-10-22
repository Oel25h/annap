import { createFileRoute } from "@tanstack/react-router";
import { localizePath } from "@/lib/i18n/locale";

/** The "Confirm my subscription" button posts here, then returns to the page with the result. */
export const Route = createFileRoute("/api/newsletter/confirm")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData().catch(() => null);
        const lang = form?.get("lang") === "el" ? "el" : "en";
        const token = String(form?.get("token") ?? "");
        if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
          return new Response(null, {
            status: 303,
            headers: { Location: localizePath("/", lang) },
          });
        }
        const { confirmSubscription } = await import("@/server/forms.server");
        const result = await confirmSubscription(token);
        const location = `${localizePath(`/confirm/${token}`, lang)}?result=${result}`;
        return new Response(null, { status: 303, headers: { Location: location } });
      },
    },
  },
});
