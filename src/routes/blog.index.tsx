import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { EmailCapture } from "@/components/EmailCapture";
import { LocaleLink } from "@/components/LocaleLink";
import { supabase } from "@/integrations/supabase/client";
import { useLocale, useT } from "@/lib/i18n/context";
import {
  BLOG_FILTER_KEYS,
  labelBlogCategory,
  labelBlogFilter,
  type BlogFilterKey,
} from "@/lib/i18n/blog-categories";
import { getApprovedTranslation, mergeTranslation } from "@/lib/i18n/translations";
import { resolveMediaUrl } from "@/lib/media";
import blogOne from "@/assets/blog-one.jpg";
import blogTwo from "@/assets/blog-two.jpg";
import blogThree from "@/assets/blog-three.jpg";
import { localeFromSearch } from "@/lib/i18n/context";
import { getMessages } from "@/lib/i18n/messages";
import { seoHead } from "@/lib/seo";

const FALLBACK_COVERS = [blogOne, blogTwo, blogThree];

export const Route = createFileRoute("/blog/")({
  head: ({ match }) => {
    const locale = localeFromSearch(match.search);
    return seoHead({ locale, path: "/blog", ...getMessages(locale).seo.blog });
  },
  component: BlogIndex,
});

type Post = {
  id: string;
  slug: string;
  title: string;
  /** English category key used for filtering. */
  category: string;
  /** Localized label for display. */
  categoryLabel: string;
  cover_url: string | null;
  excerpt: string | null;
  publish_date: string;
  read_time: string | null;
};

export function BlogIndex() {
  const locale = useLocale();
  const t = useT();
  const [cat, setCat] = useState<BlogFilterKey>("All");
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    setCat("All");
    void supabase
      .from("blog_posts")
      .select("id,slug,title,category,cover_url,excerpt,publish_date,read_time")
      .eq("status", "published")
      .order("publish_date", { ascending: false })
      .then(async ({ data }) => {
        const rows = (data ?? []) as Array<Omit<Post, "categoryLabel"> & { category: string }>;
        setPosts(
          await Promise.all(
            rows.map(async (p, idx) => {
              const categoryKey = p.category;
              let title = p.title;
              let excerpt = p.excerpt;
              let categoryLabel = labelBlogCategory(t, categoryKey);
              const cover_url = resolveMediaUrl(
                p.cover_url,
                FALLBACK_COVERS[idx % FALLBACK_COVERS.length],
              );

              if (locale === "el") {
                const tr = await getApprovedTranslation("blog_post", p.id);
                const merged = mergeTranslation({ title, excerpt: excerpt ?? "" }, tr, [
                  "title",
                  "excerpt",
                ]);
                title = merged.title;
                excerpt = merged.excerpt;
                if (tr?.category?.trim()) categoryLabel = tr.category.trim();
                else categoryLabel = labelBlogCategory(t, categoryKey);
              }

              return {
                ...p,
                title,
                excerpt,
                cover_url,
                category: categoryKey,
                categoryLabel,
              };
            }),
          ),
        );
      });
  }, [locale, t]);

  const filtered = cat === "All" ? posts : posts.filter((p) => p.category === cat);

  return (
    <main className="bg-ivory">
      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-14 md:pt-40 md:pb-20">
        <div className="relative mx-auto max-w-7xl px-6 md:px-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-burgundy/25 bg-ivory/70 px-4 py-1.5 text-[10px] uppercase tracking-[0.28em] text-burgundy backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-burgundy" /> {t.blog.eyebrow}
          </div>
          <h1 className="mt-7 max-w-4xl font-display text-4xl leading-[0.98] tracking-[-0.02em] text-plum sm:text-5xl md:text-6xl lg:text-7xl xl:text-[92px]">
            {t.blog.headlineBefore}{" "}
            <em className="font-italic-display text-burgundy">{t.blog.headlineBrave}</em>{" "}
            {t.blog.headlineAnd}{" "}
            <em className="font-italic-display text-burgundy">{t.blog.headlineBecoming}</em>.
          </h1>
          <p className="mt-8 max-w-xl text-lg text-ink">{t.blog.sub}</p>
        </div>
      </section>

      {/* FILTERS */}
      <section className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="-mx-6 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:overflow-visible md:px-0">
          <div className="inline-flex min-w-full items-center gap-2 rounded-full bg-bone/60 p-2 soft-shadow md:flex md:min-w-0 md:flex-wrap">
            {BLOG_FILTER_KEYS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory ${
                  cat === c
                    ? "bg-burgundy text-ivory shadow-[0_8px_20px_-12px_rgba(232,93,58,0.7)]"
                    : "text-plum/70 hover:bg-ivory hover:text-burgundy"
                }`}
              >
                {labelBlogFilter(t, c)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* POSTS */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
        {filtered.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-[2rem] bg-bone p-12 text-center soft-shadow">
            <p className="text-ink">{t.blog.emptyCategory}</p>
          </div>
        ) : (
          <div className="grid gap-16">
            {/* Featured */}
            <Reveal>
              <LocaleLink
                to={`/blog/${filtered[0].slug}`}
                className="group grid gap-8 overflow-hidden rounded-[2.5rem] bg-bone/50 p-6 soft-shadow transition-all duration-500 hover:-translate-y-1 hover:soft-shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory md:grid-cols-[1.3fr_1fr] md:items-center md:gap-12 md:p-8"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-bone">
                  {filtered[0].cover_url && (
                    <img
                      src={filtered[0].cover_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover object-center transition duration-[1200ms] group-hover:scale-105"
                    />
                  )}
                  <div className="absolute left-4 top-4 rounded-full bg-ivory/95 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-burgundy backdrop-blur">
                    {t.blog.featured} · {filtered[0].categoryLabel}
                  </div>
                </div>
                <div className="pr-2 md:pr-6">
                  <h2 className="font-display text-3xl leading-tight text-plum md:text-5xl">
                    {filtered[0].title}
                  </h2>
                  <p className="mt-5 text-ink">{filtered[0].excerpt}</p>
                  <div className="mt-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-plum/55">
                    <span>{filtered[0].publish_date}</span>
                    {filtered[0].read_time && (
                      <>
                        <span className="h-1 w-1 rounded-full bg-plum/30" />
                        <span>{filtered[0].read_time}</span>
                      </>
                    )}
                  </div>
                  <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-burgundy px-6 py-3 text-[11px] font-medium uppercase tracking-[0.24em] text-ivory transition group-hover:-translate-y-0.5 group-hover:bg-plum">
                    {t.blog.readTheLetter} <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </LocaleLink>
            </Reveal>

            {filtered.length > 1 && (
              <div className="grid gap-8 md:grid-cols-3">
                {filtered.slice(1).map((p, i) => (
                  <Reveal key={p.slug} delay={i * 0.08}>
                    <LocaleLink
                      to={`/blog/${p.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-[2rem] bg-ivory soft-shadow transition-all duration-500 hover:-translate-y-1 hover:soft-shadow-lg"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-bone">
                        {p.cover_url && (
                          <img
                            src={p.cover_url}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover object-center transition duration-[1200ms] group-hover:scale-105"
                          />
                        )}
                        <div className="absolute left-4 top-4 rounded-full bg-ivory/95 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-burgundy backdrop-blur">
                          {p.categoryLabel}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-7">
                        <h3 className="font-display text-2xl leading-tight text-plum">{p.title}</h3>
                        <p className="mt-3 flex-1 text-sm text-ink/85">
                          {(p.excerpt ?? "").slice(0, 110)}…
                        </p>
                        <div className="mt-6 flex items-center justify-between border-t border-charcoal/8 pt-4 text-[10px] uppercase tracking-[0.28em] text-plum/55">
                          <span>{p.publish_date}</span>
                          <span className="inline-flex items-center gap-1.5 text-plum group-hover:text-burgundy">
                            {t.blog.read}{" "}
                            <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
                          </span>
                        </div>
                      </div>
                    </LocaleLink>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <EmailCapture variant="banded" />
    </main>
  );
}
