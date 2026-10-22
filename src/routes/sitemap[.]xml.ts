import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { siteUrl } from "@/lib/site-url";
import { localizePath } from "@/lib/i18n/locale";

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const base = siteUrl();
        const staticPaths = [
          "/",
          "/about",
          "/books",
          "/blog",
          "/shop",
          "/gallery",
          "/contact",
          "/masterclasses",
          "/foundation",
          "/start",
        ];

        const [{ data: posts }, { data: books }] = await Promise.all([
          supabase.from("blog_posts").select("slug, publish_date").eq("status", "published"),
          supabase.from("books").select("slug, updated_at").eq("status", "published"),
        ]);

        const urls: Array<{ loc: string; lastmod?: string }> = [];

        for (const p of staticPaths) {
          urls.push({ loc: `${base}${p === "/" ? "" : p}` });
          urls.push({ loc: `${base}${localizePath(p, "el")}` });
        }

        for (const p of posts ?? []) {
          urls.push({ loc: `${base}/blog/${p.slug}`, lastmod: p.publish_date || undefined });
          urls.push({
            loc: `${base}/el/blog/${p.slug}`,
            lastmod: p.publish_date || undefined,
          });
        }
        for (const b of books ?? []) {
          urls.push({ loc: `${base}/books/${b.slug}`, lastmod: b.updated_at || undefined });
          urls.push({
            loc: `${base}/el/books/${b.slug}`,
            lastmod: b.updated_at || undefined,
          });
        }

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${escapeXml(u.lastmod.slice(0, 10))}</lastmod>` : ""}
  </url>`,
  )
  .join("\n")}
</urlset>
`;

        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
