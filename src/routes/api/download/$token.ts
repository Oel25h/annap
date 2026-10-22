import { createFileRoute } from "@tanstack/react-router";
import { localizePath } from "@/lib/i18n/locale";

/**
 * The download button posts here. A good link counts one use and sends the
 * browser on to a one-minute signed link for the file; anything else goes
 * back to the link's page, which explains what happened.
 */
export const Route = createFileRoute("/api/download/$token")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const form = await request.formData().catch(() => null);
        const lang = form?.get("lang") === "el" ? "el" : "en";
        const { redeemDownload } = await import("@/server/downloads.server");
        const result = await redeemDownload(params.token);
        const location =
          result.status === "ok"
            ? result.url
            : /^[A-Za-z0-9_-]{43}$/.test(params.token)
              ? localizePath(`/download/${params.token}`, lang)
              : localizePath("/", lang);
        return new Response(null, { status: 303, headers: { Location: location } });
      },
    },
  },
});
