import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { siteUrl } from "@/lib/site-url";
import { localizePath } from "@/lib/i18n/locale";

const BOOK_DETAIL_SLUGS = new Set(["find-your-reason-to-smile"]);

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

        const [{ data: posts }, { data: books }, { data: greekPosts }] = await Promise.all([
          supabase.from("blog_posts").select("id, slug, publish_date").eq("status", "published"),
          supabase.from("books").select("slug, updated_at").eq("status", "published"),
          supabase
            .from("content_translations")
            .select("entity_id")
            .eq("entity_type", "blog_post")
            .eq("locale", "el")
            .eq("status", "approved"),
        ]);
        const greekPostIds = new Set((greekPosts ?? []).map((r) => r.entity_id));

        type Entry = { path: string; greek: boolean; lastmod?: string };
        const entries: Entry[] = staticPaths.map((path) => ({ path, greek: true }));
        for (const p of posts ?? []) {
          entries.push({
            path: `/blog/${p.slug}`,
            greek: greekPostIds.has(p.id),
            lastmod: p.publish_date || undefined,
          });
        }
        // Only books with a detail page are listed (the catalogue page covers the rest).
        for (const b of books ?? []) {
          if (!BOOK_DETAIL_SLUGS.has(b.slug)) continue;
          entries.push({
            path: `/books/${b.slug}`,
            greek: true,
            lastmod: b.updated_at || undefined,
          });
        }

        const abs = (path: string) => `${base}${path}`;
        const urls: Array<{ loc: string; lastmod?: string; alternates: string }> = [];
        for (const e of entries) {
          const en = abs(e.path);
          const el = abs(localizePath(e.path, "el"));
          const alternates = e.greek
            ? [
                `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(en)}"/>`,
                `    <xhtml:link rel="alternate" hreflang="el" href="${escapeXml(el)}"/>`,
                `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(en)}"/>`,
              ].join("\n")
            : "";
          urls.push({ loc: en, lastmod: e.lastmod, alternates });
          if (e.greek) urls.push({ loc: el, lastmod: e.lastmod, alternates });
        }

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${escapeXml(u.lastmod.slice(0, 10))}</lastmod>` : ""}${u.alternates ? `\n${u.alternates}` : ""}
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
