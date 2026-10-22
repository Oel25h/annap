import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, Heart, Compass, Sparkles, BookOpen, HandHeart } from "lucide-react";
import hero from "@/assets/hero-portrait.jpg";
import { Reveal } from "@/components/Reveal";
import { Eyebrow } from "@/components/Eyebrow";
import { EmailCapture } from "@/components/EmailCapture";
import { LocaleLink } from "@/components/LocaleLink";
import { getPageBlocks } from "@/lib/page-content";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { useLocale, useT } from "@/lib/i18n/context";
import { resolveMediaUrl } from "@/lib/media";
import bookDesk from "@/assets/anastasia-book-desk.jpg";
import { localeFromSearch } from "@/lib/i18n/context";
import { getMessages } from "@/lib/i18n/messages";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: ({ match }) => {
    const locale = localeFromSearch(match.search);
    return seoHead({ locale, path: "/about", ...getMessages(locale).seo.about });
  },
  component: About,
});

const VALUE_ICONS = [Sparkles, HandHeart, Compass, BookOpen, Heart];

export function About() {
  const t = useT();
  const locale = useLocale();
  const [blocks, setBlocks] = useState<Record<string, string>>({});
  useEffect(() => {
    void getPageBlocks("about", locale).then(setBlocks);
  }, [locale]);

  const portrait = resolveMediaUrl(blocks.portrait_image, hero);
  const secondaryPortrait = resolveMediaUrl(blocks.secondary_image, bookDesk);
  const introHtml = blocks.intro?.trim() ? sanitizeHtml(blocks.intro) : "";
  const bioHtml = blocks.bio?.trim() ? sanitizeHtml(blocks.bio) : "";
  const beliefs = [blocks.belief_1, blocks.belief_2, blocks.belief_3]
    .map((b) => b?.trim())
    .filter((b): b is string => Boolean(b));

  const chapters = t.about.chapters;
  const values = t.about.values.map((v, i) => ({ ...v, icon: VALUE_ICONS[i] ?? Heart }));

  return (
    <main className="bg-ivory">
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="relative mx-auto grid max-w-7xl gap-14 px-6 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-16 md:px-10">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-burgundy/25 bg-ivory/70 px-4 py-1.5 text-[10px] uppercase tracking-[0.28em] text-burgundy backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-burgundy" /> {t.about.meet}
            </div>
            <h1 className="mt-7 font-display text-5xl leading-[0.98] tracking-[-0.02em] text-plum sm:text-6xl md:text-7xl lg:text-[88px] xl:text-[100px]">
              {t.about.heroTitleBefore}{" "}
              <em className="font-italic-display text-burgundy">{t.about.heroTitleEm}</em>
              <br /> {t.about.heroTitleAfter}
            </h1>
            {introHtml ? (
              <div
                className="mt-8 max-w-lg text-lg leading-relaxed text-ink [&_p]:mb-3"
                dangerouslySetInnerHTML={{ __html: introHtml }}
              />
            ) : (
              <p className="mt-8 max-w-lg text-lg leading-relaxed text-ink">
                {t.about.defaultIntro}
              </p>
            )}
            <div className="mt-10 grid max-w-md grid-cols-2 gap-4">
              <div className="rounded-2xl bg-bone/60 p-5 soft-shadow">
                <div className="font-display text-4xl text-burgundy">6</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.28em] text-plum/60">
                  {t.about.siblings}
                </div>
              </div>
              <div className="rounded-2xl bg-bone/60 p-5 soft-shadow">
                <div className="font-display text-4xl text-burgundy">2</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.28em] text-plum/60">
                  {t.about.continents}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative mx-auto w-full max-w-md md:max-w-none">
              <div
                aria-hidden
                className="absolute -left-6 top-6 h-32 w-32 rounded-full border-2 border-dashed border-burgundy/30 md:-left-10 md:top-8 md:h-48 md:w-48"
              />
              <div className="relative blob-mask overflow-hidden soft-shadow-lg">
                <img
                  src={portrait}
                  alt="Anastasia"
                  className="h-[520px] w-full object-cover object-[center_18%] md:h-[640px]"
                />
              </div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="absolute -bottom-5 left-2 flex items-center gap-3 rounded-full bg-ivory px-4 py-3 soft-shadow-lg md:-bottom-4 md:left-6"
              >
                <div className="grid h-9 w-9 place-items-center rounded-full bg-burgundy/12 text-burgundy">
                  <Compass className="h-4 w-4" />
                </div>
                <div className="pr-2">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-plum/55">
                    {t.home.basedIn}
                  </div>
                  <div className="font-display text-sm text-plum">{t.home.cyprus}</div>
                </div>
              </motion.div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-bone/50 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="mb-16 max-w-2xl">
            <Eyebrow>{t.about.theChapters}</Eyebrow>
            <h2 className="mt-5 font-display text-4xl leading-[1.05] text-plum md:text-6xl">
              {t.about.everySeasonBefore}{" "}
              <em className="font-italic-display text-burgundy">{t.about.everySeasonEm}</em>.
            </h2>
          </div>

          <div className="grid gap-5">
            {chapters.map((c, i) => (
              <Reveal key={c.n} delay={(i % 3) * 0.05}>
                <div className="group grid gap-6 rounded-[2rem] bg-ivory p-7 soft-shadow transition-all duration-500 hover:-translate-y-0.5 hover:soft-shadow-lg md:grid-cols-[auto_1fr_2fr] md:items-start md:gap-10 md:p-9">
                  <div className="inline-flex h-11 shrink-0 items-center rounded-full bg-burgundy px-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ivory">
                    {t.about.chapter} {c.n}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-plum/55">
                      {c.year}
                    </div>
                    <h3 className="mt-2 font-display text-2xl leading-tight text-plum md:text-3xl">
                      {c.title}
                    </h3>
                  </div>
                  <p className="text-ink">{c.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
        <div className="grid gap-14 md:grid-cols-[1fr_1.1fr] md:items-center md:gap-20">
          <Reveal>
            <div className="relative">
              <div className="relative overflow-hidden rounded-[2.5rem] soft-shadow-lg">
                <img
                  src={secondaryPortrait}
                  alt="Anastasia with her book at her desk"
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover object-[center_30%] transition duration-[1200ms] hover:scale-[1.03]"
                />
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <Eyebrow>{t.about.myMission}</Eyebrow>
            <p className="mt-6 font-display text-3xl leading-[1.15] text-plum md:text-5xl">
              {t.about.missionLeadBefore}{" "}
              <em className="font-italic-display text-burgundy">{t.about.missionLeadLantern}</em>{" "}
              {t.about.missionLeadMid}{" "}
              <em className="font-italic-display text-burgundy">{t.about.missionLeadMap}</em>{" "}
              {t.about.missionLeadAfter}
            </p>
            {bioHtml ? (
              <div
                className="mt-8 text-ink [&_p]:mb-3"
                dangerouslySetInnerHTML={{ __html: bioHtml }}
              />
            ) : (
              <p className="mt-8 text-ink">{t.about.defaultBio}</p>
            )}
            {beliefs.length > 0 && (
              <ul className="mt-8 space-y-3">
                {beliefs.map((b) => (
                  <li key={b} className="rounded-2xl bg-bone/60 px-5 py-4 text-ink soft-shadow">
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </Reveal>
        </div>
      </section>

      <section className="bg-bone/50 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="mb-14 max-w-xl">
            <Eyebrow>{t.about.whatIStandOn}</Eyebrow>
            <h2 className="mt-5 font-display text-4xl text-plum md:text-6xl">
              {t.about.fiveValuesBefore}{" "}
              <em className="font-italic-display text-burgundy">{t.about.fiveValuesEm}</em>.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-5">
            {values.map((v, i) => (
              <Reveal key={v.t} delay={i * 0.05}>
                <div className="group flex h-full flex-col rounded-[1.75rem] bg-ivory p-7 soft-shadow transition-all duration-500 hover:-translate-y-1 hover:soft-shadow-lg">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-burgundy/12 text-burgundy transition group-hover:bg-burgundy group-hover:text-ivory">
                    <v.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-6 text-[10px] uppercase tracking-[0.28em] text-burgundy">
                    0{i + 1}
                  </div>
                  <div className="mt-2 font-display text-2xl text-plum">{v.t}</div>
                  <p className="mt-2 text-sm text-ink">{v.d}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-4">
            <LocaleLink
              to="/start"
              className="group inline-flex items-center gap-3 rounded-full bg-burgundy px-7 py-4 text-[11px] font-medium uppercase tracking-[0.24em] text-ivory shadow-[0_14px_30px_-14px_rgba(232,93,58,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-plum"
            >
              {t.nav.startHere}{" "}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </LocaleLink>
          </div>
        </div>
      </section>

      <EmailCapture variant="banded" />
    </main>
  );
}
