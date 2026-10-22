import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, ExternalLink, Star } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { EmailCapture } from "@/components/EmailCapture";
import { LocaleLink } from "@/components/LocaleLink";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n/context";
import { absoluteUrl } from "@/lib/site-url";
import cover from "@/assets/fyrts-cover.jpg";
import author from "@/assets/fyrts-author.jpg";
import quoteBg from "@/assets/fyrts-quote.jpg";

const SLUG = "find-your-reason-to-smile";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory";

const btnPrimary = `group inline-flex min-h-11 items-center justify-center gap-3 rounded-full bg-burgundy px-7 py-4 text-[11px] font-medium uppercase tracking-[0.24em] text-ivory shadow-[0_14px_30px_-14px_rgba(232,93,58,0.7)] transition duration-300 hover:-translate-y-0.5 hover:bg-plum ${focusRing}`;

const btnOutline = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-plum/20 bg-ivory px-6 py-4 text-[11px] font-medium uppercase tracking-[0.24em] text-plum transition duration-300 hover:border-burgundy hover:text-burgundy ${focusRing}`;

export const Route = createFileRoute("/books/find-your-reason-to-smile")({
  head: () => ({
    meta: [
      { title: "Find Your Reason to Smile — Anastasia Patience" },
      {
        name: "description",
        content:
          "A Journey of Faith, Loss, Resilience, and Hope. A memoir by Anastasia Patience about faith, loss, and finding hope again.",
      },
      { property: "og:title", content: "Find Your Reason to Smile — Anastasia Patience" },
      {
        property: "og:description",
        content: "A Journey of Faith, Loss, Resilience, and Hope. A memoir about faith, loss, and hope.",
      },
      { property: "og:type", content: "book" },
      { property: "og:url", content: absoluteUrl("/books/find-your-reason-to-smile") },
      { property: "og:image", content: absoluteUrl("/fyrts-cover.jpg") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: absoluteUrl("/fyrts-cover.jpg") },
    ],
    links: [
      { rel: "canonical", href: absoluteUrl("/books/find-your-reason-to-smile") },
      { rel: "alternate", hrefLang: "en", href: absoluteUrl("/books/find-your-reason-to-smile") },
      {
        rel: "alternate",
        hrefLang: "el",
        href: absoluteUrl("/el/books/find-your-reason-to-smile"),
      },
      {
        rel: "alternate",
        hrefLang: "x-default",
        href: absoluteUrl("/books/find-your-reason-to-smile"),
      },
    ],
  }),
  component: BookDetail,
});

type Review = { by_name: string; quote: string };
type BookLinks = { id: string; amazon_url: string | null; ebook_url: string | null };

function BuyCluster({
  amazon,
  ebook,
  compact = false,
}: {
  amazon: string | null | undefined;
  ebook: string | null | undefined;
  compact?: boolean;
}) {
  const t = useT();
  const hasAmazon = Boolean(amazon);
  const hasEbook = Boolean(ebook);
  const gap = compact ? "gap-2" : "gap-3";
  const primary = compact
    ? `group inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-burgundy px-5 py-3 text-[10px] font-medium uppercase tracking-[0.22em] text-ivory transition hover:bg-plum ${focusRing}`
    : btnPrimary;
  const outline = compact
    ? `inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-plum/20 px-4 py-3 text-[10px] font-medium uppercase tracking-[0.22em] text-plum transition hover:border-burgundy hover:text-burgundy ${focusRing}`
    : btnOutline;

  return (
    <div className={`flex flex-wrap items-center ${gap}`}>
      {hasAmazon && (
        <a href={amazon!} target="_blank" rel="noopener noreferrer" className={primary}>
          {t.books.buyAmazon}
          {!compact && <ExternalLink className="h-3.5 w-3.5 opacity-80" aria-hidden />}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </a>
      )}
      {hasEbook && (
        <a href={ebook!} target="_blank" rel="noopener noreferrer" className={outline}>
          {t.books.getEbook}
          <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </a>
      )}
      {!hasAmazon && !hasEbook && (
        <LocaleLink to="/start" className={primary}>
          {t.books.freeGuideCta}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </LocaleLink>
      )}
      {!compact && (
        <LocaleLink
          to="/books"
          className={`rounded-sm text-[11px] uppercase tracking-[0.28em] text-plum underline decoration-burgundy/40 underline-offset-8 hover:decoration-burgundy ${focusRing}`}
        >
          {t.books.seeAllBooks}
        </LocaleLink>
      )}
    </div>
  );
}

export function BookDetail() {
  const t = useT();
  const f = t.books.fyrts;
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [book, setBook] = useState<BookLinks | null>(null);
  const [linksReady, setLinksReady] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const buyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("books")
      .select("id,amazon_url,ebook_url")
      .eq("slug", SLUG)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setLinksReady(true);
        if (!data) {
          setReviews([]);
          return;
        }
        setBook(data as BookLinks);
        supabase
          .from("book_reviews")
          .select("by_name,quote")
          .eq("book_id", (data as BookLinks).id)
          .order("sort_order")
          .then(({ data: r }) => {
            if (!cancelled) setReviews((r ?? []) as Review[]);
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = buyRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting), {
      rootMargin: "-80px 0px 0px 0px",
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [linksReady]);

  const amazon = book?.amazon_url ?? null;
  const ebook = book?.ebook_url ?? null;
  const fullTitle = `${f.titleBefore}${f.smile}`;

  return (
    <main className="bg-ivory pb-20 md:pb-0">
      <section className="pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <LocaleLink
            to="/books"
            className={`inline-flex min-h-11 items-center gap-2 rounded-sm text-[11px] uppercase tracking-[0.28em] text-plum/60 transition hover:text-burgundy ${focusRing}`}
          >
            <ArrowLeft className="h-4 w-4" /> {t.books.allBooks}
          </LocaleLink>
          <div className="mt-8 grid gap-12 md:grid-cols-[0.95fr_1.05fr] md:items-center md:gap-16">
            <Reveal>
              <div className="relative mx-auto w-full max-w-md">
                <div className="rounded-3xl border border-plum/10 bg-gradient-to-b from-ivory to-bone/80 p-6 soft-shadow-lg md:p-8">
                  <div className="mx-auto aspect-[3/4] w-full max-w-[360px] md:max-w-[400px]">
                    <img
                      src={cover}
                      alt={fullTitle}
                      width={912}
                      height={1200}
                      className="h-full w-full rounded-xl object-contain"
                    />
                  </div>
                </div>
                <div className="absolute -bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-plum/10 bg-ivory px-4 py-2 soft-shadow-lg">
                  <div className="flex items-center gap-0.5 text-burgundy" aria-hidden>
                    {[0, 1, 2, 3, 4].map((s) => (
                      <Star key={s} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.24em] text-plum/60">
                    {t.books.readerRatedBadge}
                  </span>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="inline-flex items-center gap-2 rounded-full bg-burgundy/10 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-burgundy">
                <span className="h-1.5 w-1.5 rounded-full bg-burgundy" /> {t.books.memoir}
              </div>
              <h1 className="mt-4 break-words font-display text-5xl leading-[1.02] text-plum md:text-7xl">
                {f.titleBefore}
                <em className="font-italic-display text-burgundy">{f.smile}</em>
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink">{f.subtitle}</p>
              <p className="mt-6 max-w-lg leading-relaxed text-ink">{f.pitch}</p>
              <div ref={buyRef} className="mt-10">
                <BuyCluster amazon={amazon} ebook={ebook} />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="relative min-h-[420px] w-full md:h-[560px]">
          <img
            src={quoteBg}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-plum/50" />
          <div className="relative mx-auto flex h-full min-h-[420px] max-w-4xl items-center justify-center px-6 py-16 text-center md:min-h-0 md:px-10">
            <Reveal>
              <p className="font-display text-3xl leading-[1.15] text-ivory md:text-5xl">
                &ldquo;{f.quoteBefore}{" "}
                <em className="font-italic-display text-gold">{f.quoteEm}</em> {f.quoteAfter}
                &rdquo;
              </p>
              <p className="mt-6 text-[11px] uppercase tracking-[0.32em] text-ivory/80">
                Anastasia Patience
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-bone/40 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full bg-burgundy/10 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-burgundy">
              <span className="h-1.5 w-1.5 rounded-full bg-burgundy" /> {t.books.insideTheBook}
            </div>
            <h2 className="mt-4 max-w-3xl font-display text-4xl leading-[1.05] text-plum md:text-6xl">
              {t.books.insideHeadlineBefore}{" "}
              <em className="font-italic-display text-burgundy">{t.books.insideHeadlineEm}</em>.
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {f.chapters.map((c, i) => (
              <Reveal key={c.n} delay={i * 0.06}>
                <article className="h-full rounded-3xl border border-plum/8 bg-ivory p-8 soft-shadow transition duration-300 hover:border-plum/15 md:p-10">
                  <div className="flex items-baseline gap-4">
                    <span className="font-display text-5xl text-burgundy/40">{c.n}</span>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-burgundy">
                      {t.books.chapter} {parseInt(c.n, 10)}
                    </div>
                  </div>
                  <h3 className="mt-3 font-display text-2xl text-plum md:text-3xl">{c.title}</h3>
                  <p className="mt-4 text-ink">{c.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="grid gap-12 md:grid-cols-[1fr_1.1fr] md:items-center md:gap-16">
            <Reveal>
              <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-plum/10 bg-bone soft-shadow-lg">
                <div className="aspect-[4/5] w-full">
                  <img
                    src={author}
                    alt="Anastasia Patience"
                    width={1000}
                    height={1250}
                    className="h-full w-full object-cover object-[center_20%]"
                  />
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="inline-flex items-center gap-2 rounded-full bg-burgundy/10 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-burgundy">
                <span className="h-1.5 w-1.5 rounded-full bg-burgundy" /> {t.books.aboutAuthor}
              </div>
              <h2 className="mt-4 font-display text-4xl leading-[1.05] text-plum md:text-5xl">
                Anastasia <em className="font-italic-display text-burgundy">Patience</em>
              </h2>
              <p className="mt-6 max-w-lg text-ink">{t.books.authorBio1}</p>
              <p className="mt-4 max-w-lg text-ink">{t.books.authorBio2}</p>
              <LocaleLink
                to="/about"
                className={`mt-8 inline-flex min-h-11 items-center gap-2 rounded-sm text-[11px] uppercase tracking-[0.28em] text-burgundy transition hover:text-plum ${focusRing}`}
              >
                {t.books.readFullStory} <ArrowRight className="h-4 w-4" />
              </LocaleLink>
            </Reveal>
          </div>
        </div>
      </section>

      {reviews && reviews.length > 0 && (
        <section className="bg-bone/40 py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full bg-burgundy/10 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-burgundy">
                <span className="h-1.5 w-1.5 rounded-full bg-burgundy" /> {t.books.readerReviews}
              </div>
              <h2 className="mt-4 font-display text-4xl text-plum md:text-5xl">
                {t.books.wordsFrom}{" "}
                <em className="font-italic-display text-burgundy">{t.books.wordsFromEm}</em>.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {reviews.map((r, i) => (
                <Reveal key={`${r.by_name}-${i}`} delay={i * 0.06}>
                  <div className="rounded-3xl border border-plum/8 bg-ivory p-8 soft-shadow md:p-10">
                    <div className="flex items-center gap-1 text-burgundy" aria-hidden>
                      {[0, 1, 2, 3, 4].map((s) => (
                        <Star key={s} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                    <p className="mt-4 font-display text-xl leading-snug text-plum md:text-2xl">
                      &ldquo;{r.quote}&rdquo;
                    </p>
                    <div className="mt-4 text-[10px] uppercase tracking-[0.28em] text-burgundy">
                      — {r.by_name}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <EmailCapture variant="banded" />

      {showSticky && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-plum/10 bg-ivory/95 backdrop-blur-md md:bottom-auto md:top-[4.5rem]"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-10">
            <div className="min-w-0">
              <div className="truncate font-display text-base text-plum md:text-lg">{fullTitle}</div>
              <div className="hidden text-[10px] uppercase tracking-[0.22em] text-plum/50 sm:block">
                {t.books.stickyLine}
              </div>
            </div>
            <BuyCluster amazon={amazon} ebook={ebook} compact />
          </div>
        </div>
      )}
    </main>
  );
}
