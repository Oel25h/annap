import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { EmailCapture } from "@/components/EmailCapture";
import { LocaleLink } from "@/components/LocaleLink";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { absoluteUrl } from "@/lib/site-url";
import { localeFromSearch, useLocale, useT } from "@/lib/i18n/context";
import { seoHead } from "@/lib/seo";
import { labelBlogCategory } from "@/lib/i18n/blog-categories";
import { getMessages } from "@/lib/i18n/messages";
import { getApprovedTranslation, mergeTranslation } from "@/lib/i18n/translations";
import { resolveMediaUrl } from "@/lib/media";
import blogOne from "@/assets/blog-one.jpg";

export type BlogPost = {
  id?: string;
  slug: string;
  title: string;
  /** English category key from the database. */
  categoryKey: string;
  /** Localized category label for display. */
  category: string;
  cover_url: string | null;
  excerpt: string | null;
  body: string;
  publish_date: string;
  read_time: string | null;
  _translationPending?: boolean;
};

export async function loadPost(slug: string, locale: "en" | "el" = "en"): Promise<BlogPost | null> {
  const { data } = await supabase
    .from("blog_posts")
    .select("id, slug, title, category, cover_url, excerpt, body, publish_date, read_time")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return null;

  const messages = getMessages(locale);
  const categoryKey = data.category;
  let post: BlogPost = {
    id: data.id,
    slug: data.slug,
    title: data.title,
    categoryKey,
    category: labelBlogCategory(messages, categoryKey),
    cover_url: resolveMediaUrl(data.cover_url, blogOne),
    excerpt: data.excerpt,
    body: sanitizeHtml(data.body ?? ""),
    publish_date: data.publish_date,
    read_time: data.read_time,
  };

  if (locale === "el" && data.id) {
    const tr = await getApprovedTranslation("blog_post", data.id);
    if (tr) {
      post = mergeTranslation(post, tr, ["title", "excerpt", "body"]);
      if (post.body) post.body = sanitizeHtml(post.body);
      if (tr.category?.trim()) post.category = tr.category.trim();
      post._translationPending = false;
    } else {
      post._translationPending = true;
    }
  }

  return post;
}

export const Route = createFileRoute("/blog/$slug")({
  loaderDeps: ({ search }) => ({ locale: localeFromSearch(search) }),
  loader: async ({ params, deps }) => {
    const post = await loadPost(params.slug, deps.locale);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData, params, match }) => {
    const locale = localeFromSearch(match.search);
    const post = loaderData?.post;
    const t = getMessages(locale);
    return seoHead({
      locale,
      path: `/blog/${params.slug}`,
      title: post ? `${post.title} — ${t.seo.siteName}` : t.seo.blog.title,
      description: post?.excerpt?.trim() || t.seo.blog.description,
      image: post?.cover_url?.trim() || undefined,
      type: "article",
    });
  },
  component: PostPage,
});

export function PostPage() {
  const { post } = Route.useLoaderData();
  return <PostPageView post={post} />;
}

export function PostPageView({ post }: { post: BlogPost }) {
  const t = useT();
  const locale = useLocale();

  return (
    <main className="bg-ivory">
      <article className="pt-32 md:pt-40">
        <div className="mx-auto max-w-4xl px-6 md:px-10">
          <LocaleLink
            to="/blog"
            className="inline-flex items-center gap-2 rounded-full border border-plum/15 bg-ivory px-4 py-2 text-[10px] font-medium uppercase tracking-[0.24em] text-plum transition hover:-translate-y-0.5 hover:border-burgundy hover:text-burgundy"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t.blog.allLetters}
          </LocaleLink>

          {locale === "el" && post._translationPending && (
            <p className="mt-6 rounded-2xl bg-bone/70 px-4 py-3 text-sm text-plum/70">
              {t.common.translationPending}
            </p>
          )}

          <div className="mt-10 inline-flex items-center gap-2 rounded-full bg-burgundy/10 px-4 py-1.5 text-[10px] uppercase tracking-[0.28em] text-burgundy">
            <span className="h-1.5 w-1.5 rounded-full bg-burgundy" /> {post.category}
          </div>
          <h1 className="mt-5 font-display text-3xl leading-[1.02] text-plum sm:text-4xl md:text-5xl lg:text-6xl">
            {post.title}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-plum/55">
            <span className="rounded-full border border-plum/15 bg-ivory px-3 py-1">
              Anastasia Patience
            </span>
            <span className="rounded-full bg-bone px-3 py-1">{post.publish_date}</span>
            {post.read_time && (
              <span className="rounded-full bg-bone px-3 py-1">{post.read_time}</span>
            )}
          </div>
        </div>

        {post.cover_url && (
          <div className="mx-auto mt-12 max-w-6xl px-6 md:px-10">
            <div className="aspect-[16/9] w-full overflow-hidden rounded-[2.5rem] bg-bone soft-shadow-lg">
              <img
                src={post.cover_url}
                alt=""
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>
        )}

        <div className="mx-auto mt-16 max-w-2xl px-6 pb-24 md:px-10">
          {post.excerpt && (
            <p className="rounded-[1.5rem] bg-bone/60 p-6 text-lg italic text-plum/80 soft-shadow">
              {post.excerpt}
            </p>
          )}
          <div
            className="prose-anastasia mt-10 break-words text-lg leading-relaxed text-ink [overflow-wrap:anywhere] [&>*+*]:mt-6 [&_a]:break-all [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-plum sm:[&_h2]:text-3xl [&_blockquote]:rounded-3xl [&_blockquote]:border-l-4 [&_blockquote]:border-burgundy [&_blockquote]:bg-burgundy/8 [&_blockquote]:px-6 [&_blockquote]:py-5 [&_blockquote]:italic [&_blockquote]:text-plum [&_em]:italic [&_strong]:text-plum [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-3xl [&_iframe]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: post.body }}
          />
          <div className="mt-12 font-italic-display text-3xl text-burgundy">— Anastasia</div>

          <div className="mt-16 flex flex-col items-center gap-5 rounded-[2rem] bg-bone/60 p-8 text-center soft-shadow md:flex-row md:text-left">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-burgundy font-display text-2xl text-ivory">
              A
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-[0.28em] text-burgundy">
                {t.blog.writtenBy}
              </div>
              <div className="font-display text-xl text-plum">Anastasia Patience</div>
              <p className="mt-1 text-sm text-ink/80">{t.blog.authorBio}</p>
            </div>
            <LocaleLink
              to="/about"
              className="group inline-flex items-center gap-2 rounded-full bg-burgundy px-5 py-3 text-[10px] font-medium uppercase tracking-[0.24em] text-ivory transition hover:-translate-y-0.5 hover:bg-plum"
            >
              {t.blog.aboutAuthor}{" "}
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
            </LocaleLink>
          </div>
        </div>

        <div className="bg-bone/50 py-16">
          <div className="mx-auto max-w-2xl px-6 md:px-10">
            <EmailCapture />
          </div>
        </div>
      </article>
    </main>
  );
}
