import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Calendar, Sparkles, GraduationCap } from "lucide-react";
import pBuild from "@/assets/pathway-build.jpg";
import { Reveal } from "@/components/Reveal";
import { Eyebrow } from "@/components/Eyebrow";
import { EmailCapture } from "@/components/EmailCapture";
import { supabase } from "@/integrations/supabase/client";
import { useLocale, useT } from "@/lib/i18n/context";
import { getApprovedTranslation, mergeTranslation } from "@/lib/i18n/translations";

export const Route = createFileRoute("/masterclasses")({
  head: () => ({
    meta: [
      { title: "Masterclasses — Anastasia Patience" },
      {
        name: "description",
        content: "Turn your knowledge and ideas into digital products and income skills.",
      },
    ],
    links: [{ rel: "canonical", href: "/masterclasses" }],
  }),
  component: Master,
});

type M = {
  id?: string;
  title: string;
  description: string;
  included: string;
  dates: string;
  price: string;
  enroll_url: string | null;
  status: string;
};

export function Master() {
  const locale = useLocale();
  const t = useT();
  const [m, setM] = useState<M | null>(null);
  useEffect(() => {
    supabase
      .from("masterclass")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) {
          setM(null);
          return;
        }
        let row = data as M;
        if (locale === "el" && row.id) {
          const tr = await getApprovedTranslation("masterclass", row.id);
          row = mergeTranslation(row, tr, ["title", "description", "included", "dates", "price"]);
        }
        setM(row);
      });
  }, [locale]);

  const included = (m?.included ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const isOpen = m?.status === "open";

  return (
    <main className="bg-ivory">
      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-16 md:pt-40 md:pb-28">
        <div className="relative mx-auto grid max-w-7xl gap-14 px-6 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-16 md:px-10">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-burgundy/25 bg-ivory/70 px-4 py-1.5 text-[10px] uppercase tracking-[0.28em] text-burgundy backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-burgundy" /> {t.masterclasses.eyebrow}
              </div>
              {m?.status && (
                <div
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.28em] ${
                    isOpen ? "bg-burgundy text-ivory" : "border border-plum/15 bg-ivory text-plum"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-ivory" : "bg-burgundy"} animate-pulse`}
                  />
                  {isOpen ? t.masterclasses.open : t.masterclasses.closed}
                </div>
              )}
            </div>

            <h1 className="mt-7 font-display text-4xl leading-[0.98] tracking-[-0.02em] text-plum sm:text-5xl md:text-6xl lg:text-7xl xl:text-[92px]">
              {m?.title || (
                <>
                  From <em className="font-italic-display text-burgundy">knowing</em> to{" "}
                  <em className="font-italic-display text-burgundy">earning</em>.
                </>
              )}
            </h1>

            <p className="mt-8 max-w-lg whitespace-pre-line text-lg leading-relaxed text-ink">
              {m?.description || "{t.masterclasses.sub}"}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {m?.dates && (
                <span className="inline-flex items-center gap-2 rounded-full border border-plum/15 bg-ivory px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-plum">
                  <Calendar className="h-3.5 w-3.5 text-burgundy" /> {m.dates}
                </span>
              )}
              {m?.price && (
                <span className="inline-flex items-center gap-2 rounded-full border border-plum/15 bg-ivory px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-plum">
                  <Sparkles className="h-3.5 w-3.5 text-burgundy" /> {m.price}
                </span>
              )}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              {m?.enroll_url && (
                <a
                  href={m.enroll_url}
                  target="_blank"
                  rel="noopener"
                  className="group inline-flex items-center gap-3 rounded-full bg-burgundy px-7 py-4 text-[11px] font-medium uppercase tracking-[0.24em] text-ivory shadow-[0_14px_30px_-14px_rgba(232,93,58,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-plum"
                >
                  {isOpen ? "Enrol now" : "Join the waitlist"}{" "}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </a>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative mx-auto w-full max-w-md md:max-w-none">
              <div
                aria-hidden
                className="absolute -left-6 top-6 h-32 w-32 rounded-full border-2 border-dashed border-burgundy/30 md:-left-10 md:top-8 md:h-48 md:w-48"
              />
              <div className="relative overflow-hidden rounded-[2.5rem] soft-shadow-lg">
                <img
                  src={pBuild}
                  alt=""
                  className="aspect-[4/5] w-full object-cover object-center transition duration-[1200ms] hover:scale-[1.03]"
                />
              </div>
              <div className="absolute -bottom-5 left-4 flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-full bg-ivory px-4 py-3 soft-shadow-lg md:-bottom-4 md:left-6">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-burgundy/12 text-burgundy">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div className="min-w-0 pr-2">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-plum/55">8-week</div>
                  <div className="truncate font-display text-sm text-plum">Live cohort</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* INCLUDED */}
      {included.length > 0 && (
        <section className="bg-bone/50 py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-6 md:px-10">
            <div className="mb-14 max-w-xl">
              <Eyebrow>{t.masterclasses.included}</Eyebrow>
              <h2 className="mt-5 font-display text-4xl leading-[1.05] text-plum md:text-6xl">
                Every tool. Every template. Every{" "}
                <em className="font-italic-display text-burgundy">hug</em>.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {included.map((item, i) => (
                <Reveal key={i} delay={(i % 2) * 0.05}>
                  <div className="group flex h-full items-start gap-5 rounded-[1.75rem] bg-ivory p-6 soft-shadow transition-all duration-500 hover:-translate-y-0.5 hover:soft-shadow-lg md:p-7">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-burgundy/12 text-burgundy transition group-hover:bg-burgundy group-hover:text-ivory">
                      <Check className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.28em] text-burgundy">
                        Module {String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="mt-2 font-display text-xl leading-tight text-plum">
                        {item}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            {m?.enroll_url && (
              <div className="mt-16 flex justify-center">
                <a
                  href={m.enroll_url}
                  target="_blank"
                  rel="noopener"
                  className="group inline-flex items-center gap-3 rounded-full bg-plum px-7 py-4 text-[11px] font-medium uppercase tracking-[0.24em] text-ivory transition-all duration-300 hover:-translate-y-0.5 hover:bg-burgundy"
                >
                  {isOpen ? "Save your seat" : "Join the waitlist"}{" "}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      <EmailCapture variant="banded" />
    </main>
  );
}
