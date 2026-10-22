import { createFileRoute } from "@tanstack/react-router";

/** Every published page and item, with Greek alternates where the Greek is approved. */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { buildSitemap } = await import("@/server/sitemap.server");
        return new Response(await buildSitemap(), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
