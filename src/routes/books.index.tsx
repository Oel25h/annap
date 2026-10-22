import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Star } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { Eyebrow } from "@/components/Eyebrow";
import { EmailCapture } from "@/components/EmailCapture";
import { supabase } from "@/integrations/supabase/client";
import { useLocale, useT } from "@/lib/i18n/context";
import { getApprovedTranslation, mergeTranslation } from "@/lib/i18n/translations";
import { resolveMediaUrl } from "@/lib/media";
import { LocaleLink } from "@/components/LocaleLink";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory";
const btnPrimary = `group inline-flex min-h-11 items-center gap-3 rounded-full bg-burgundy px-7 py-4 text-[11px] font-medium uppercase tracking-[0.24em] text-ivory shadow-[0_14px_30px_-14px_rgba(232,93,58,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-plum ${focusRing}`;
const btnOutline = `inline-flex min-h-11 items-center gap-2 rounded-full border border-plum/15 bg-ivory px-6 py-4 text-[11px] font-medium uppercase tracking-[0.24em] text-plum transition hover:-translate-y-0.5 hover:border-burgundy hover:text-burgundy ${focusRing}`;

export const Route = createFileRoute("/books/")({
  head: () => ({
    meta: [
      { title: "Books — Anastasia Patience" },
      {
        name: "description",
        content: "Books to carry you: memoir, workbook, and gentle wisdom from Anastasia Patience.",
      },
    ],
    links: [
      { rel: "canonical", href: "/books" },
      { rel: "alternate", hrefLang: "en", href: "/books" },
      { rel: "alternate", hrefLang: "el", href: "/el/books" },
      { rel: "alternate", hrefLang: "x-default", href: "/books" },
    ],
  }),
  component: BooksPage,
});

type Book = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  cover_url: string | null;
  who_for: string | null;
  description: string | null;
  formats: string[];
  amazon_url: string | null;
  ebook_url: string | null;
};
type Review = { book_id: string; by_name: string; quote: string };

export function BooksPage() {
  const locale = useLocale();
  const t = useT();
  const [books, setBooks] = useState<Book[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    supabase
      .from("books")
      .select("*")
      .eq("status", "published")
      .order("sort_order")
      .then(async ({ data }) => {
        const rows = (data ?? []) as Book[];
        if (locale !== "el") {
          setBooks(rows);
          return;
        }
        setBooks(
          await Promise.all(
            rows.map(async (b) => {
              const tr = await getApprovedTranslation("book", b.id);
              return mergeTranslation(b, tr, ["title", "tagline", "description", "who_for"]);
            }),
          ),
        );
      });
    supabase
      .from("book_reviews")
      .select("book_id,by_name,quote")
      .order("sort_order")
      .then(({ data }) => setReviews((data ?? []) as Review[]));
  }, [locale]);

  return (
    <main className="bg-ivory">
      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-14 md:pt-40 md:pb-20">
        <div className="relative mx-auto max-w-7xl px-6 md:px-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-burgundy/25 bg-ivory/70 px-4 py-1.5 text-[10px] uppercase tracking-[0.28em] text-burgundy backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-burgundy" /> {t.books.eyebrow}
          </div>
          <h1 className="mt-7 max-w-4xl font-display text-5xl leading-[0.98] tracking-[-0.02em] text-plum md:text-7xl lg:text-[92px]">
            {t.books.headlineBefore}{" "}
            <em className="font-italic-display text-burgundy">{t.books.headlineEm}</em>.
          </h1>
          <p className="mt-8 max-w-xl text-lg text-ink">{t.books.sub}</p>
        </div>
      </section>

      {books.length === 0 && (
        <div className="mx-auto my-16 max-w-lg rounded-[2rem] bg-bone p-12 text-center soft-shadow">
          <p className="text-ink">{t.books.empty}</p>
        </div>
      )}

      {books.map((b, i) => {
        const bRev = reviews.filter((r) => r.book_id === b.id);
        return (
          <section
            key={b.id}
            className={`${i % 2 === 0 ? "bg-ivory" : "bg-bone/50"} py-20 md:py-28`}
          >
            <div className="mx-auto max-w-7xl px-6 md:px-10">
              <div
                className={`grid gap-12 md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-16 ${i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}
              >
                <Reveal>
                  <div className="relative mx-auto w-full max-w-sm">
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[1.75rem] bg-bone soft-shadow-lg">
                      {b.cover_url && (
                        <img
                          src={resolveMediaUrl(b.cover_url)}
                          alt={b.title}
                          className="h-full w-full object-cover object-center transition duration-[1200ms] hover:scale-[1.04]"
                        />
                      )}
                    </div>
                    {/* rating chip */}
                    <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ivory px-4 py-2 soft-shadow-lg">
                      <div className="flex items-center gap-0.5 text-burgundy">
                        {[0, 1, 2, 3, 4].map((s) => (
                          <Star key={s} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.24em] text-plum/60">
                        4.9 · {t.books.readerRated}
                      </span>
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={0.1}>
                  <div className="inline-flex items-center gap-2 rounded-full bg-burgundy/10 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-burgundy">
                    <span className="h-1.5 w-1.5 rounded-full bg-burgundy" /> {t.books.bookN} 0{i + 1}
                  </div>
                  <h2 className="mt-4 font-display text-4xl leading-[1.05] text-plum md:text-6xl">
                    {b.title}
                  </h2>
                  {b.tagline && (
                    <p className="mt-4 font-italic-display text-xl text-burgundy">{b.tagline}</p>
                  )}
                  {b.description && <p className="mt-6 max-w-lg text-ink">{b.description}</p>}

                  {b.who_for && (
                    <div className="mt-8 rounded-[1.5rem] bg-bone/60 p-5 soft-shadow">
                      <div className="text-[10px] uppercase tracking-[0.28em] text-burgundy">
                        {t.books.whoFor}
                      </div>
                      <p className="mt-2 max-w-lg text-ink">{b.who_for}</p>
                    </div>
                  )}

                  {b.formats?.length > 0 && (
                    <div className="mt-8 flex flex-wrap gap-2">
                      {b.formats.map((f) => (
                        <span
                          key={f}
                          className="inline-flex items-center gap-1.5 rounded-full border border-plum/15 bg-ivory px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-plum"
                        >
                          <Check className="h-3 w-3 text-burgundy" />
                          {f}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-10 flex flex-wrap gap-3">
                    {b.amazon_url && (
                      <a
                        href={b.amazon_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={btnPrimary}
                      >
                        {t.books.buyAmazon}{" "}
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </a>
                    )}
                    {b.ebook_url && (
                      <a
                        href={b.ebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={btnOutline}
                      >
                        {t.books.getEbook}
                      </a>
                    )}
                    {!b.amazon_url && !b.ebook_url && (
                      <LocaleLink to="/start" className={btnPrimary}>
                        {t.books.freeGuideCta}{" "}
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </LocaleLink>
                    )}
                    {b.slug === "find-your-reason-to-smile" ? (
                      <LocaleLink to="/books/find-your-reason-to-smile" className={btnOutline}>
                        {t.books.readMore} <ArrowRight className="h-4 w-4" />
                      </LocaleLink>
                    ) : null}
                  </div>

                  {bRev.length > 0 && (
                    <div className="mt-10 grid gap-4">
                      {bRev.map((r, ri) => (
                        <div key={ri} className="rounded-[1.5rem] bg-ivory p-6 soft-shadow">
                          <div className="flex items-center gap-1 text-burgundy">
                            {[0, 1, 2, 3, 4].map((s) => (
                              <Star key={s} className="h-3.5 w-3.5 fill-current" />
                            ))}
                          </div>
                          <p className="mt-3 font-display text-lg italic text-plum">"{r.quote}"</p>
                          <div className="mt-3 text-[10px] uppercase tracking-[0.28em] text-burgundy">
                            — {r.by_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Reveal>
              </div>
            </div>
          </section>
        );
      })}

      <EmailCapture variant="banded" />
    </main>
  );
}
