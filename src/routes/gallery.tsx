import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { supabase } from "@/integrations/supabase/client";
import { useLocale, useT } from "@/lib/i18n/context";
import { getApprovedTranslation, mergeTranslation } from "@/lib/i18n/translations";
import { localeFromSearch } from "@/lib/i18n/context";
import { getMessages } from "@/lib/i18n/messages";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/gallery")({
  head: ({ match }) => {
    const locale = localeFromSearch(match.search);
    return seoHead({ locale, path: "/gallery", ...getMessages(locale).seo.gallery });
  },
  component: Gallery,
});

type Img = {
  id: string;
  chapter: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
};

export function Gallery() {
  const locale = useLocale();
  const t = useT();
  const [images, setImages] = useState<Img[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [boxIndex, setBoxIndex] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("gallery_images")
      .select("*")
      .order("chapter")
      .order("sort_order")
      .then(async ({ data }) => {
        const rows = (data ?? []) as Img[];
        if (locale !== "el") {
          setImages(rows);
          return;
        }
        setImages(
          await Promise.all(
            rows.map(async (img) => {
              const tr = await getApprovedTranslation("gallery_image", img.id);
              return mergeTranslation(img, tr, ["caption", "chapter"]);
            }),
          ),
        );
      });
  }, [locale]);

  const chapters = useMemo(
    () => [t.gallery.all, ...Array.from(new Set(images.map((i) => i.chapter)))],
    [images],
  );
  const allLabel = t.gallery.all;
  const filtered =
    filter === allLabel || filter === "All" ? images : images.filter((i) => i.chapter === filter);

  useEffect(() => {
    if (boxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBoxIndex(null);
      if (e.key === "ArrowLeft")
        setBoxIndex((n) => (n === null ? n : (n - 1 + filtered.length) % filtered.length));
      if (e.key === "ArrowRight") setBoxIndex((n) => (n === null ? n : (n + 1) % filtered.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [boxIndex, filtered.length]);

  return (
    <main className="bg-ivory">
      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-14 md:pt-40 md:pb-20">
        <div className="relative mx-auto max-w-7xl px-6 md:px-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-burgundy/25 bg-ivory/70 px-4 py-1.5 text-[10px] uppercase tracking-[0.28em] text-burgundy backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-burgundy" /> {t.gallery.eyebrow}
          </div>
          <h1 className="mt-7 max-w-4xl font-display text-4xl leading-[0.98] tracking-[-0.02em] text-plum sm:text-5xl md:text-6xl lg:text-7xl xl:text-[92px]">
            {t.gallery.headlineBefore}{" "}
            <em className="font-italic-display text-burgundy">{t.gallery.headlineEm}</em>.
          </h1>
          <p className="mt-8 max-w-xl text-lg text-ink">{t.gallery.sub}</p>
        </div>
      </section>

      {/* FILTERS */}
      {images.length > 0 && chapters.length > 2 && (
        <section className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="-mx-6 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:overflow-visible md:px-0">
            <div className="inline-flex min-w-full items-center gap-2 rounded-full bg-bone/60 p-2 soft-shadow md:flex md:min-w-0 md:flex-wrap">
              {chapters.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] transition ${
                    filter === c
                      ? "bg-burgundy text-ivory shadow-[0_8px_20px_-12px_rgba(232,93,58,0.7)]"
                      : "text-plum/70 hover:bg-ivory hover:text-burgundy"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* MASONRY */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
        {filtered.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-[2rem] bg-bone p-12 text-center soft-shadow">
            <p className="text-ink">{t.gallery.empty}</p>
          </div>
        ) : (
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 [column-fill:_balance]">
            {filtered.map((img, i) => (
              <Reveal key={img.id} delay={(i % 3) * 0.05}>
                <button
                  onClick={() => setBoxIndex(i)}
                  className="group relative mb-5 block w-full overflow-hidden rounded-[1.75rem] bg-bone soft-shadow transition-all duration-500 hover:-translate-y-1 hover:soft-shadow-lg"
                >
                  <img
                    src={img.image_url}
                    alt={img.caption ?? ""}
                    loading="lazy"
                    className="w-full object-cover object-center transition duration-[1200ms] group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-plum/85 p-5 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <div className="inline-flex w-fit rounded-full bg-ivory/95 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-burgundy">
                      {img.chapter}
                    </div>
                    {img.caption && (
                      <div className="font-display text-lg text-ivory">{img.caption}</div>
                    )}
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* LIGHTBOX */}
      <AnimatePresence>
        {boxIndex !== null && filtered[boxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-plum/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur"
            onClick={() => setBoxIndex(null)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setBoxIndex(null);
              }}
              className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-ivory/30 bg-plum/40 text-ivory transition hover:bg-burgundy hover:border-burgundy md:right-8 md:top-8"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setBoxIndex((n) => (n === null ? n : (n - 1 + filtered.length) % filtered.length));
              }}
              className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-ivory/30 bg-plum/40 text-ivory transition hover:bg-burgundy hover:border-burgundy md:left-8"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setBoxIndex((n) => (n === null ? n : (n + 1) % filtered.length));
              }}
              className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-ivory/30 bg-plum/40 text-ivory transition hover:bg-burgundy hover:border-burgundy md:right-8"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex w-full max-h-[85vh] max-w-[min(72rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[2rem] bg-plum/40 soft-shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={filtered[boxIndex].image_url}
                alt={filtered[boxIndex].caption ?? ""}
                className="mx-auto max-h-[70vh] w-auto max-w-[calc(100vw-2rem)] object-contain"
              />
              {filtered[boxIndex].caption && (
                <div className="flex min-w-0 flex-wrap items-center gap-3 bg-plum/70 px-4 py-4 text-ivory sm:px-6">
                  <span className="shrink-0 rounded-full bg-ivory/15 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-gold">
                    {filtered[boxIndex].chapter}
                  </span>
                  <span className="min-w-0 break-words font-display text-base sm:text-lg">
                    {filtered[boxIndex].caption}
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
