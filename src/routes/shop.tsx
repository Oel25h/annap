import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { EmailCapture } from "@/components/EmailCapture";
import { supabase } from "@/integrations/supabase/client";
import { useLocale, useT } from "@/lib/i18n/context";
import { getApprovedTranslation, mergeTranslation } from "@/lib/i18n/translations";
import { localeFromSearch } from "@/lib/i18n/context";
import { getMessages } from "@/lib/i18n/messages";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/shop")({
  head: ({ match }) => {
    const locale = localeFromSearch(match.search);
    return seoHead({ locale, path: "/shop", ...getMessages(locale).seo.shop });
  },
  component: Shop,
});

type P = {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
  description: string | null;
  price: string | null;
  product_type: string;
  checkout_url: string | null;
};

export function Shop() {
  const locale = useLocale();
  const t = useT();
  const [items, setItems] = useState<P[]>([]);
  const [type, setType] = useState<string>("All");

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .eq("status", "published")
      .order("sort_order")
      .then(async ({ data }) => {
        const rows = (data ?? []) as P[];
        if (locale !== "el") {
          setItems(rows);
          return;
        }
        setItems(
          await Promise.all(
            rows.map(async (p) => {
              const tr = await getApprovedTranslation("product", p.id);
              return mergeTranslation(p, tr, ["name", "description"]);
            }),
          ),
        );
      });
  }, [locale]);

  const types = useMemo(
    () => [t.shop.all, ...Array.from(new Set(items.map((p) => p.product_type).filter(Boolean)))],
    [items],
  );
  const allLabel = t.shop.all;
  const filtered =
    type === allLabel || type === "All" ? items : items.filter((p) => p.product_type === type);

  return (
    <main className="bg-ivory">
      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-14 md:pt-40 md:pb-20">
        <div className="relative mx-auto max-w-7xl px-6 md:px-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-burgundy/25 bg-ivory/70 px-4 py-1.5 text-[10px] uppercase tracking-[0.28em] text-burgundy backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-burgundy" /> {t.shop.eyebrow}
          </div>
          <h1 className="mt-7 max-w-4xl font-display text-4xl leading-[0.98] tracking-[-0.02em] text-plum sm:text-5xl md:text-6xl lg:text-7xl xl:text-[92px]">
            {t.shop.headlineBefore}{" "}
            <em className="font-italic-display text-burgundy">{t.shop.headlineEm}</em>.
          </h1>
          <p className="mt-8 max-w-xl text-lg text-ink">{t.shop.sub}</p>
        </div>
      </section>

      {/* FILTERS */}
      {items.length > 0 && types.length > 2 && (
        <section className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="-mx-6 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:overflow-visible md:px-0">
            <div className="inline-flex min-w-full items-center gap-2 rounded-full bg-bone/60 p-2 soft-shadow md:flex md:min-w-0 md:flex-wrap">
              {types.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory ${
                    type === t
                      ? "bg-burgundy text-ivory shadow-[0_8px_20px_-12px_rgba(232,93,58,0.7)]"
                      : "text-plum/70 hover:bg-ivory hover:text-burgundy"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GRID */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
        {filtered.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-[2rem] bg-bone p-12 text-center soft-shadow">
            <p className="text-ink">{t.shop.empty}</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p, i) => {
              const href = p.checkout_url?.trim() || "";
              const isExternal = /^https?:\/\//i.test(href);
              const cardClass =
                "group flex h-full flex-col overflow-hidden rounded-[2rem] bg-ivory soft-shadow transition-all duration-500 hover:-translate-y-1 hover:soft-shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory";
              const body = (
                <>
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-bone">
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        loading="lazy"
                        className="h-full w-full object-cover object-center transition duration-[1200ms] group-hover:scale-105"
                      />
                    )}
                    <div className="absolute left-4 top-4 rounded-full bg-ivory/95 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-burgundy backdrop-blur">
                      {p.product_type}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-2xl leading-tight text-plum">{p.name}</h3>
                    {p.description && (
                      <p className="mt-3 flex-1 line-clamp-3 text-sm text-ink/85">
                        {p.description}
                      </p>
                    )}
                    <div className="mt-6 flex items-center justify-between border-t border-charcoal/8 pt-4">
                      <span className="font-display text-xl text-burgundy">{p.price}</span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-plum px-4 py-2 text-[10px] font-medium uppercase tracking-[0.24em] text-ivory transition group-hover:-translate-y-0.5 group-hover:bg-burgundy">
                        {href ? t.shop.view : t.shop.soon} <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </>
              );
              return (
                <Reveal key={p.id} delay={i * 0.05}>
                  {href ? (
                    <a
                      href={href}
                      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className={cardClass}
                    >
                      {body}
                    </a>
                  ) : (
                    <div className={`${cardClass} cursor-default`}>{body}</div>
                  )}
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      <EmailCapture variant="banded" />
    </main>
  );
}
