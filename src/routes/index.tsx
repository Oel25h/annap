import { createFileRoute } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useInView, useReducedMotion } from "framer-motion";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowDown, Star, BookOpen, GraduationCap, Users, PenLine } from "lucide-react";
import hero from "@/assets/hero-portrait.jpg";
import portraitThree from "@/assets/anastasia-portrait-three.jpg";
import fyrtsCover from "@/assets/fyrts-cover-3d.jpg";
import { Reveal } from "@/components/Reveal";
import { Eyebrow } from "@/components/Eyebrow";
import { EmailCapture } from "@/components/EmailCapture";
import { BOOKS, POSTS } from "@/data/site";
import { getPageBlocks, parseStarItalic } from "@/lib/page-content";
import { supabase } from "@/integrations/supabase/client";
import { LocaleLink } from "@/components/LocaleLink";
import { useLocale, useT } from "@/lib/i18n/context";
import { labelBlogCategory } from "@/lib/i18n/blog-categories";
import { getApprovedTranslation, mergeTranslation } from "@/lib/i18n/translations";
import { resolveMediaUrl } from "@/lib/media";
import { localeFromSearch } from "@/lib/i18n/context";
import { getMessages } from "@/lib/i18n/messages";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: ({ match }) => {
    const locale = localeFromSearch(match.search);
    return seoHead({ locale, path: "/", ...getMessages(locale).seo.home });
  },
  component: Home,
});

function HeadlineFromCms({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {parseStarItalic(line).map((seg, i) =>
            seg.italic ? (
              <em key={i} className="font-italic-display text-burgundy">
                {seg.text}
              </em>
            ) : (
              <Fragment key={i}>{seg.text}</Fragment>
            ),
          )}
        </Fragment>
      ))}
    </>
  );
}

type FeaturedBook = {
  title: string;
  tagline: string;
  description: string;
  cover: string;
  slug: string;
};

type LetterCard = {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  date: string;
  image: string;
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory";
const focusRingOnDark =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-plum";

/** Detail pages only exist for known slugs today; else catalog. */
function bookDetailTo(slug: string): string {
  if (slug === "find-your-reason-to-smile") return "/books/find-your-reason-to-smile";
  return "/books";
}

function formatLetterDate(raw: string, locale: string) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(locale === "el" ? "el-GR" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ---------- helpers ---------- */

function Counter({
  to,
  suffix = "",
  duration = 1.6,
}: {
  to: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotion = useReducedMotion();
  // Final value first paint — never stuck at 0 before in-view
  const [n, setN] = useState(to);
  const ran = useRef(false);

  useEffect(() => {
    if (reduceMotion) {
      setN(to);
      return;
    }
    if (!inView || ran.current) return;
    ran.current = true;
    setN(0);
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduceMotion]);

  return (
    <span ref={ref}>
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ---------- page ---------- */

export function Home() {
  const t = useT();
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yPhoto = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const yText = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  const [blocks, setBlocks] = useState<Record<string, string>>({});
  const [featuredBook, setFeaturedBook] = useState<FeaturedBook>(() => ({
    title: BOOKS[0].title,
    tagline: BOOKS[0].tagline,
    description: BOOKS[0].description,
    cover: fyrtsCover,
    slug: BOOKS[0].slug,
  }));
  const [letters, setLetters] = useState<LetterCard[]>(() =>
    POSTS.map((p) => ({
      slug: p.slug,
      title: p.title,
      category: p.category,
      excerpt: p.excerpt,
      date: p.date,
      image: p.image,
    })),
  );
  const [lettersEmpty, setLettersEmpty] = useState(false);

  useEffect(() => {
    void getPageBlocks("home", locale).then(setBlocks);
    void supabase
      .from("books")
      .select("id, slug, title, tagline, description, cover_url")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .limit(1)
      .then(async ({ data }) => {
        const b = data?.[0];
        if (!b) return;
        let book = {
          title: b.title,
          tagline: b.tagline ?? BOOKS[0].tagline,
          description: b.description ?? BOOKS[0].description,
          cover: resolveMediaUrl(b.cover_url, fyrtsCover),
          slug: b.slug || BOOKS[0].slug,
        };
        if (locale === "el") {
          const tr = await getApprovedTranslation("book", b.id);
          book = mergeTranslation(book, tr, ["title", "tagline", "description"]);
        }
        setFeaturedBook(book);
      });
    void supabase
      .from("blog_posts")
      .select("id, slug, title, category, excerpt, cover_url, publish_date")
      .eq("status", "published")
      .order("publish_date", { ascending: false })
      .limit(3)
      .then(async ({ data }) => {
        if (data == null) return;
        if (!data.length) {
          setLetters([]);
          setLettersEmpty(true);
          return;
        }
        setLettersEmpty(false);
        const mapped = await Promise.all(
          data.map(async (p, idx) => {
            const fallbackImg = POSTS[idx % POSTS.length]?.image || POSTS[0].image;
            let card = {
              slug: p.slug,
              title: p.title,
              category: labelBlogCategory(t, p.category),
              excerpt: p.excerpt ?? "",
              date: p.publish_date,
              image: resolveMediaUrl(p.cover_url, fallbackImg),
            };
            if (locale === "el") {
              const tr = await getApprovedTranslation("blog_post", p.id);
              card = mergeTranslation(card, tr, ["title", "excerpt"]);
              if (tr?.category?.trim()) card.category = tr.category.trim();
              else card.category = labelBlogCategory(t, p.category);
            }
            return card;
          }),
        );
        setLetters(mapped);
      });
  }, [locale, t]);

  const eyebrow = blocks.hero_eyebrow?.trim() || t.home.defaultEyebrow;
  const headline = blocks.hero_headline?.trim() || t.home.defaultHeadline;
  const sub = blocks.hero_sub?.trim() || t.home.defaultSub;
  const heroImg = resolveMediaUrl(blocks.hero_image, hero);
  const quote = blocks.featured_quote?.trim() || t.home.defaultQuote;
  const quoteAuthor = blocks.featured_author?.trim() || t.home.defaultQuoteAuthor;
  const quoteRole = t.home.defaultQuoteRole;

  const heroTextStyle = reduceMotion ? undefined : { y: yText, opacity };
  const heroPhotoStyle = reduceMotion ? undefined : { y: yPhoto };

  return (
    <main className="bg-ivory">
      {/* ═══════ HERO ═══════ */}
      <section
        ref={heroRef}
        className="relative overflow-hidden border-b border-plum/8 pt-32 pb-24 md:pt-40 md:pb-32"
      >
        <div className="relative mx-auto grid max-w-7xl gap-16 px-6 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-10 md:px-10">
          <motion.div style={heroTextStyle}>
            <div className="inline-flex items-center gap-2 rounded-full border border-burgundy/25 bg-ivory/70 px-4 py-1.5 text-[10px] uppercase tracking-[0.28em] text-burgundy backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-burgundy" />
              {eyebrow}
            </div>
            <h1 className="mt-7 break-words font-display text-5xl leading-[0.95] tracking-[-0.02em] text-plum sm:text-6xl md:text-7xl lg:text-[92px] xl:text-[108px]">
              <HeadlineFromCms text={headline} />
            </h1>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-ink">{sub}</p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <LocaleLink
                to="/start"
                className={`group inline-flex min-h-11 items-center gap-3 rounded-full bg-burgundy px-7 py-4 text-[11px] font-medium uppercase tracking-[0.24em] text-ivory transition hover:bg-plum ${focusRing}`}
              >
                {t.home.getGuide}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </LocaleLink>
              <LocaleLink
                to="/about"
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-plum/20 px-6 py-4 text-[11px] font-medium uppercase tracking-[0.24em] text-plum transition hover:border-burgundy hover:text-burgundy ${focusRing}`}
              >
                {t.home.readStory}
              </LocaleLink>
            </div>

            <div className="mt-14 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.28em] text-plum/55">
              <span>{t.home.author}</span>
              <span className="h-1 w-1 rounded-full bg-plum/30" />
              <span>{t.home.storyteller}</span>
              <span className="h-1 w-1 rounded-full bg-plum/30" />
              <span>{t.home.entrepreneur}</span>
              <span className="h-1 w-1 rounded-full bg-plum/30" />
              <span>{t.home.digitalCreator}</span>
            </div>
          </motion.div>

          {/* portrait */}
          <motion.div
            style={heroPhotoStyle}
            className="relative mx-auto w-full max-w-md md:max-w-none"
          >
            <div
              aria-hidden
              className="absolute inset-0 translate-x-3 translate-y-3 -z-10 rounded-3xl bg-bone/70 md:translate-x-3 md:translate-y-3"
            />
            <div className="relative overflow-hidden rounded-3xl border border-plum/10">
              <img
                src={heroImg}
                alt={t.home.heroPortraitAlt}
                width={1200}
                height={1504}
                sizes="(max-width: 768px) 100vw, 48vw"
                className="h-[520px] w-full object-cover object-[center_18%] md:h-[680px]"
              />
            </div>
          </motion.div>
        </div>

        {/* scroll cue */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.8 }}
          className="mt-10 flex justify-center md:mt-16"
        >
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-plum/50">
            <span>{t.home.scroll}</span>
            {reduceMotion ? (
              <span className="grid h-7 w-7 place-items-center rounded-full border border-plum/20">
                <ArrowDown className="h-3 w-3" />
              </span>
            ) : (
              <motion.span
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="grid h-7 w-7 place-items-center rounded-full border border-plum/20"
              >
                <ArrowDown className="h-3 w-3" />
              </motion.span>
            )}
          </div>
        </motion.div>
      </section>

      {/* ═══════ SOCIAL PROOF STRIP ═══════ */}
      <section className="border-y border-charcoal/8 bg-bone/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-6 px-6 py-10 md:grid-cols-4 md:gap-0 md:px-10 md:py-8">
          {[
            { n: 18000, s: "+", label: t.home.communityMembers },
            { n: 2, s: "", label: t.home.booksPublished },
            { n: 120000, s: "+", label: t.home.wordsWritten },
            { n: 4, s: "", label: t.home.countriesLived },
          ].map((it, i) => (
            <div
              key={i}
              className={`flex flex-col items-center text-center md:border-r md:border-charcoal/10 md:px-6 md:last:border-r-0`}
            >
              <div className="font-display text-4xl text-plum md:text-5xl">
                <Counter to={it.n} suffix={it.s} />
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.28em] text-plum/55">
                {it.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ WHO I AM ═══════ */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
        <div className="grid gap-14 md:grid-cols-[1fr_1.1fr] md:items-center md:gap-20">
          <Reveal className="order-2 md:order-1">
            <div className="relative">
              <div className="relative overflow-hidden rounded-3xl border border-plum/10 soft-shadow">
                <img
                  src={portraitThree}
                  alt={t.home.atWorkAlt}
                  width={1000}
                  height={1200}
                  className="aspect-[4/5] w-full object-cover"
                />
              </div>
              <div className="mt-4 rounded-2xl border border-plum/10 bg-ivory p-5 md:absolute md:-bottom-6 md:-right-4 md:mt-0">
                <div className="text-[10px] uppercase tracking-[0.28em] text-burgundy">
                  {t.home.basedIn}
                </div>
                <div className="mt-1 font-display text-xl text-plum">{t.home.cyprus}</div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="order-1 md:order-2">
            <Eyebrow>{t.home.whoIAm}</Eyebrow>
            <h2 className="mt-5 font-display text-4xl leading-[1.05] text-plum md:text-6xl">
              {t.home.whoHeadline}
            </h2>
            <div className="mt-8 max-w-xl space-y-5 text-lg leading-relaxed text-ink">
              <p>{t.home.whoP1}</p>
              <p>{t.home.whoP2}</p>
            </div>
            <div className="mt-10">
              <LocaleLink
                to="/about"
                className={`group inline-flex min-h-11 items-center gap-3 rounded-full bg-plum px-7 py-4 text-[11px] font-medium uppercase tracking-[0.24em] text-ivory transition hover:bg-burgundy ${focusRing}`}
              >
                {t.home.myStory}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </LocaleLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════ WHAT I OFFER ═══════ */}
      <section className="border-y border-plum/8 bg-bone/40 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Eyebrow>{t.home.whatIOffer}</Eyebrow>
              <h2 className="mt-5 max-w-2xl font-display text-4xl leading-[1.05] text-plum md:text-6xl">
                {t.home.offerHeadline}
              </h2>
            </div>
            <p className="max-w-sm text-ink">{t.home.offerSub}</p>
          </div>

          <div className="grid gap-5 md:grid-cols-6 md:grid-rows-2">
            {/* Books — tall, one restrained accent card */}
            <Reveal className="md:col-span-2 md:row-span-2">
              <LocaleLink
                to="/books"
                className={`group relative flex h-full flex-col overflow-hidden rounded-3xl bg-plum p-8 text-ivory transition duration-300 hover:bg-charcoal hover:shadow-[0_24px_48px_-28px_rgba(28,25,23,0.55)] md:p-10 ${focusRingOnDark}`}
              >
                <div className="grid h-12 w-12 place-items-center rounded-full bg-ivory/10 text-gold">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="mt-8 flex-1">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-gold">
                    {t.home.read}
                  </div>
                  <h3 className="mt-2 font-display text-4xl leading-tight md:text-5xl">
                    {t.home.booksTitle}
                  </h3>
                  <p className="mt-4 max-w-xs text-ivory/75">{t.home.booksBody}</p>
                </div>
                <div className="mt-8 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-gold">
                  {t.home.explore}{" "}
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-burgundy/25 blur-3xl"
                />
              </LocaleLink>
            </Reveal>

            {/* Masterclasses — wide, flat */}
            <Reveal delay={0.08} className="md:col-span-4">
              <LocaleLink
                to="/masterclasses"
                className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-plum/10 bg-ivory p-8 text-plum transition duration-300 hover:border-plum/25 hover:shadow-[0_20px_40px_-28px_rgba(28,25,23,0.35)] md:p-10 ${focusRing}`}
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-burgundy/10 text-burgundy">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="hidden text-right md:block">
                    <div className="text-[10px] uppercase tracking-[0.28em] text-plum/55">
                      {t.home.cohort}
                    </div>
                    <div className="font-display text-lg text-plum">{t.home.openNow}</div>
                  </div>
                </div>
                <div className="mt-8">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-burgundy">
                    {t.home.learn}
                  </div>
                  <h3 className="mt-2 font-display text-3xl leading-tight text-plum md:text-4xl">
                    {t.home.masterclassesTitle}
                  </h3>
                  <p className="mt-3 max-w-md text-ink">{t.home.masterclassesBody}</p>
                </div>
                <div className="mt-8 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-plum group-hover:text-burgundy">
                  {t.home.joinCohort}{" "}
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
              </LocaleLink>
            </Reveal>

            {/* Community */}
            <Reveal delay={0.15} className="md:col-span-2">
              <LocaleLink
                to="/start"
                className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-plum/10 bg-ivory p-8 text-plum transition duration-300 hover:border-plum/25 hover:shadow-[0_20px_40px_-28px_rgba(28,25,23,0.35)] ${focusRing}`}
              >
                <div className="grid h-12 w-12 place-items-center rounded-full bg-burgundy/10 text-burgundy">
                  <Users className="h-5 w-5" />
                </div>
                <div className="mt-8">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-burgundy">
                    {t.home.gather}
                  </div>
                  <h3 className="mt-2 font-display text-3xl leading-tight text-plum">
                    {t.home.communityTitle}
                  </h3>
                  <p className="mt-3 text-ink">{t.home.communityBody}</p>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-plum group-hover:text-burgundy">
                  {t.home.sayHello}{" "}
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
              </LocaleLink>
            </Reveal>

            {/* Blog */}
            <Reveal delay={0.2} className="md:col-span-2">
              <LocaleLink
                to="/blog"
                className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-plum/10 bg-ivory p-8 text-plum transition duration-300 hover:border-plum/25 hover:shadow-[0_20px_40px_-28px_rgba(28,25,23,0.35)] ${focusRing}`}
              >
                <div className="grid h-12 w-12 place-items-center rounded-full bg-plum/10 text-plum">
                  <PenLine className="h-5 w-5" />
                </div>
                <div className="mt-8">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-burgundy">
                    {t.home.readWeekly}
                  </div>
                  <h3 className="mt-2 font-display text-3xl leading-tight text-plum">
                    {t.home.journalTitle}
                  </h3>
                  <p className="mt-3 text-ink">{t.home.journalBody}</p>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-plum group-hover:text-burgundy">
                  {t.home.latestLettersCta}{" "}
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
              </LocaleLink>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════ FEATURED BOOK ═══════ */}
      <section className="border-b border-plum/8 bg-bone/30 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-14 px-6 md:grid-cols-[1fr_1.1fr] md:items-center md:gap-16 md:px-10">
          <Reveal>
            <div className="relative mx-auto w-full max-w-sm">
              <div className="rounded-3xl border border-plum/10 bg-gradient-to-b from-ivory to-bone/80 p-6 soft-shadow-lg md:p-8">
                <div className="mx-auto aspect-[3/4] w-full max-w-[280px]">
                  <img
                    src={featuredBook.cover}
                    alt={featuredBook.title}
                    width={912}
                    height={1200}
                    className="h-full w-full rounded-xl object-contain"
                  />
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <Eyebrow>{t.home.featuredBook}</Eyebrow>
            <h2 className="mt-5 font-display text-4xl leading-[1.05] text-plum md:text-6xl">
              {featuredBook.title}
            </h2>
            <p className="mt-5 max-w-md text-lg text-ink">{featuredBook.tagline}</p>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center gap-0.5 text-burgundy" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-plum/60">
                {t.home.reviewsLine}
              </div>
            </div>
            <p className="mt-6 max-w-md text-ink">
              {featuredBook.description.length > 180
                ? `${featuredBook.description.slice(0, 180)}…`
                : featuredBook.description}
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <LocaleLink
                to={bookDetailTo(featuredBook.slug)}
                className={`group inline-flex min-h-11 items-center gap-3 rounded-full bg-burgundy px-7 py-4 text-[11px] font-medium uppercase tracking-[0.24em] text-ivory transition hover:bg-plum ${focusRing}`}
              >
                {t.home.readTheBook}{" "}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </LocaleLink>
              <LocaleLink
                to="/books"
                className={`text-[11px] uppercase tracking-[0.28em] text-plum underline decoration-burgundy/40 underline-offset-8 hover:decoration-burgundy ${focusRing} rounded-sm`}
              >
                {t.home.seeAllBooks}
              </LocaleLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════ LATEST FROM THE BLOG ═══════ */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Eyebrow>{t.home.theJournal}</Eyebrow>
            <h2 className="mt-5 font-display text-4xl text-plum md:text-6xl">
              {t.home.latestLetters}
            </h2>
          </div>
          <LocaleLink
            to="/blog"
            className={`group inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-plum/20 px-6 py-3 text-[11px] uppercase tracking-[0.24em] text-plum transition hover:border-burgundy hover:text-burgundy md:self-auto ${focusRing}`}
          >
            {t.home.allArticles}{" "}
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
          </LocaleLink>
        </div>

        {lettersEmpty || letters.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-plum/15 bg-bone/50 px-6 py-16 text-center">
            <p className="font-display text-2xl text-plum">New letters soon</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink">
              Fresh stories and reflections will appear here.
            </p>
            <LocaleLink
              to="/blog"
              className={`mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-plum/20 px-6 py-3 text-[11px] uppercase tracking-[0.24em] text-plum transition hover:border-burgundy hover:text-burgundy ${focusRing}`}
            >
              {t.home.allArticles}
              <ArrowRight className="h-3.5 w-3.5" />
            </LocaleLink>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            {letters.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.08}>
                <LocaleLink
                  to={`/blog/${p.slug}`}
                  className={`group flex h-full flex-col overflow-hidden rounded-3xl border border-plum/10 bg-ivory transition duration-300 hover:border-plum/25 hover:shadow-[0_20px_40px_-28px_rgba(28,25,23,0.3)] ${focusRing}`}
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={p.image}
                      alt=""
                      width={1200}
                      height={900}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover transition duration-500 ease-out group-hover:scale-105"
                    />
                    <div className="absolute left-4 top-4 rounded-full bg-ivory/95 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-burgundy">
                      {p.category}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-xl leading-tight text-plum transition group-hover:text-burgundy">
                      {p.title}
                    </h3>
                    <p className="mt-3 line-clamp-3 flex-1 text-sm text-ink">{p.excerpt}</p>
                    <div className="mt-6 flex items-center justify-between border-t border-plum/8 pt-4 text-[10px] uppercase tracking-[0.28em] text-plum/55">
                      <span>{formatLetterDate(p.date, locale)}</span>
                      <span className="inline-flex items-center gap-1.5 text-plum group-hover:text-burgundy">
                        {t.home.read}{" "}
                        <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </LocaleLink>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ═══════ TESTIMONIAL MOMENT ═══════ */}
      <section className="border-y border-plum/10 bg-plum py-20 text-ivory md:py-28">
        <div className="mx-auto max-w-4xl px-6 text-center md:px-10">
          <div className="mx-auto font-display text-7xl leading-none text-gold" aria-hidden>
            "
          </div>
          <Reveal>
            <p className="mt-4 font-display text-2xl leading-[1.25] text-ivory md:text-4xl">
              {quote}
            </p>
          </Reveal>
          <div className="mt-10 flex items-center justify-center gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-burgundy font-display text-base text-ivory">
              {quoteAuthor.charAt(0)}
            </div>
            <div className="text-left">
              <div className="font-display text-base">{quoteAuthor}</div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-gold">{quoteRole}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ EMAIL CAPTURE ═══════ */}
      <EmailCapture variant="banded" />
    </main>
  );
}
