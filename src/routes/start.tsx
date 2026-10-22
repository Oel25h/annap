import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StartIcon, SOCIAL_ICONS } from "@/lib/start-icons";
import hero from "@/assets/hero-portrait.jpg";
import { useLocale, useT } from "@/lib/i18n/context";
import { LocaleLink } from "@/components/LocaleLink";
import { getApprovedTranslation, mergeTranslation } from "@/lib/i18n/translations";
import { absoluteUrl } from "@/lib/site-url";

/** Temporary EL display map until CMS start_link translations are approved. */
const START_LABEL_EL: Record<string, string> = {
  "Find Your Reason to Smile": "Βρες τον λόγο σου να χαμογελάς",
  "Author · Storyteller · Founder of Patience Media House":
    "Συγγραφέας · Αφηγήτρια · Ιδρύτρια του Patience Media House",
  "Get My Free Guide": "Πάρε τον δωρεάν οδηγό μου",
  "7 Steps to Turn Your Pain Into Purpose": "7 βήματα να μετατρέψεις τον πόνο σε σκοπό",
  "Join the Community": "Μπες στην κοινότητα",
  "A village of women becoming": "Ένα χωριό γυναικών που γίνονται",
  "Next Masterclass": "Επόμενο σεμινάριο",
  "8-week live program · Waitlist open": "8 εβδομάδες live · λίστα αναμονής ανοιχτή",
  "My Books": "Τα βιβλία μου",
  "Memoir · Workbook": "Απομνημόνευμα · Workbook",
  "Prayer with Patience": "Προσευχή με την Patience",
  "Pray with me — daily": "Προσευχήσου μαζί μου — καθημερινά",
  "Daily Affirmations": "Καθημερινές επιβεβαιώσεις",
  "Speak life over your day": "Μίλα ζωή πάνω στη μέρα σου",
  "Daily Devotions": "Καθημερινές devotions",
  "Patience Media House": "Patience Media House",
};

function localizeStartText(locale: string, value: string | null | undefined, fallback = "") {
  const raw = (value ?? "").trim() || fallback;
  if (locale !== "el") return raw;
  return START_LABEL_EL[raw] ?? raw;
}

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start Here — Anastasia Patience" },
      {
        name: "description",
        content:
          "Everything in one place: free guide, community, masterclass, books, prayer, devotions and more.",
      },
      { property: "og:title", content: "Start Here — Anastasia Patience" },
      {
        property: "og:description",
        content:
          "Everything in one place: free guide, community, masterclass, books, prayer, devotions and more.",
      },
      { property: "og:url", content: absoluteUrl("/start") },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/start") }],
  }),
  component: Start,
});

type Settings = {
  hero_eyebrow: string;
  hero_subtitle: string;
  footer_tag: string;
  featured_enabled: boolean;
  featured_label: string | null;
  featured_sub: string | null;
  featured_href: string | null;
  featured_icon: string;
};

type LinkRow = {
  id: string;
  label: string;
  sub: string | null;
  icon: string;
  href: string | null;
  to_path: string | null;
  is_internal: boolean;
  sort_order: number;
  enabled: boolean;
};

type SocialRow = {
  id: string;
  platform: string;
  url: string;
  sort_order: number;
  enabled: boolean;
};

export function Start() {
  const t = useT();
  const locale = useLocale();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [socials, setSocials] = useState<SocialRow[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: l }, { data: so }] = await Promise.all([
        supabase.from("start_page_settings").select("*").eq("id", "singleton").maybeSingle(),
        supabase.from("start_page_links").select("*").eq("enabled", true).order("sort_order"),
        supabase.from("start_page_socials").select("*").eq("enabled", true).order("sort_order"),
      ]);

      let nextSettings = s ? ({ ...(s as Settings) } as Settings) : null;
      if (locale === "el" && nextSettings) {
        const tr = await getApprovedTranslation("start_settings", "singleton");
        if (tr) {
          nextSettings = mergeTranslation(nextSettings, tr, [
            "hero_eyebrow",
            "hero_subtitle",
            "footer_tag",
            "featured_label",
            "featured_sub",
          ]);
        }
      }
      if (nextSettings) setSettings(nextSettings);

      let nextLinks = (l ?? []) as LinkRow[];
      if (locale === "el" && nextLinks.length) {
        nextLinks = await Promise.all(
          nextLinks.map(async (row) => {
            const tr = await getApprovedTranslation("start_link", row.id);
            return tr ? mergeTranslation(row, tr, ["label", "sub"]) : row;
          }),
        );
      }
      setLinks(nextLinks);
      setSocials((so ?? []) as SocialRow[]);
    })();
  }, [locale]);

  const s = settings;

  return (
    <main className="relative min-h-screen overflow-hidden bg-ivory text-plum">
      <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 pt-[max(4rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))] md:max-w-xl md:px-8 md:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col items-center text-center"
        >
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-3 rounded-full border-2 border-dashed border-burgundy/30 md:-inset-4"
            />
            <div className="relative h-32 w-32 overflow-hidden blob-mask soft-shadow-lg md:h-40 md:w-40">
              <img
                src={hero}
                width={1200}
                height={1504}
                alt={t.start.portraitAlt}
                className="h-full w-full object-cover object-[center_18%]"
              />
            </div>
          </div>

          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-burgundy/25 bg-ivory/70 px-4 py-1.5 text-[10px] uppercase tracking-[0.28em] text-burgundy backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-burgundy" />{" "}
            {s?.hero_eyebrow?.trim() ? localizeStartText(locale, s.hero_eyebrow) : t.start.eyebrow}
          </div>

          <h1 className="mt-4 font-display text-3xl leading-tight text-plum md:text-4xl">
            {t.start.name}
          </h1>
          <p className="mt-3 max-w-xs text-sm text-plum/70 md:max-w-md md:text-base">
            {localizeStartText(locale, s?.hero_subtitle, t.start.fallbackSubtitle)}
          </p>
        </motion.div>

        {s?.featured_enabled && s.featured_label && (
          <motion.a
            href={s.featured_href ?? "#"}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            whileHover={{ y: -3 }}
            className="group relative mt-10 block overflow-hidden rounded-[2rem] border border-plum/10 bg-bone p-6 soft-shadow-lg md:p-7"
          >
            <div className="relative flex items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-burgundy text-ivory soft-shadow md:h-14 md:w-14">
                <StartIcon name={s.featured_icon} className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-[0.28em] text-burgundy">
                  {t.start.fallbackLabel}
                </div>
                <div className="font-display text-xl leading-tight text-plum md:text-2xl">
                  {localizeStartText(locale, s.featured_label)}
                </div>
                {s.featured_sub && (
                  <div className="mt-0.5 text-xs text-plum/60 md:text-sm">
                    {localizeStartText(locale, s.featured_sub)}
                  </div>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-burgundy transition group-hover:translate-x-1" />
            </div>
          </motion.a>
        )}

        <div className="mt-4 flex flex-col gap-3">
          {links.map((l, i) => {
            const label = localizeStartText(locale, l.label);
            const sub = l.sub ? localizeStartText(locale, l.sub) : null;
            const inner = (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 + i * 0.05 }}
                whileHover={{ y: -2 }}
                className="group flex items-center gap-4 rounded-full border border-plum/10 bg-ivory p-2 pr-5 soft-shadow transition hover:border-burgundy hover:soft-shadow-lg"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-burgundy/12 text-burgundy transition group-hover:bg-burgundy group-hover:text-ivory md:h-12 md:w-12">
                  <StartIcon name={l.icon} className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate font-display text-base leading-tight text-plum md:text-lg">
                    {label}
                  </div>
                  {sub && <div className="truncate text-xs text-plum/60 md:text-sm">{sub}</div>}
                </div>
                <ArrowRight className="h-4 w-4 text-burgundy transition group-hover:translate-x-1" />
              </motion.div>
            );
            if (l.is_internal && l.to_path) {
              return (
                <LocaleLink key={l.id} to={l.to_path}>
                  {inner}
                </LocaleLink>
              );
            }
            return (
              <a
                key={l.id}
                href={l.href || "#"}
                target={l.href?.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
              >
                {inner}
              </a>
            );
          })}
        </div>

        {socials.length > 0 && (
          <div className="mt-10 flex justify-center gap-2">
            {socials.map((so) => {
              const Icon = SOCIAL_ICONS[so.platform] ?? SOCIAL_ICONS.instagram;
              return (
                <a
                  key={so.id}
                  href={so.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={so.platform}
                  className="grid h-11 w-11 place-items-center rounded-full border border-plum/15 bg-ivory text-plum transition hover:-translate-y-0.5 hover:border-burgundy hover:text-burgundy"
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        )}

        <div className="mt-auto pt-10 text-center">
          <span className="inline-flex items-center rounded-full border border-plum/10 bg-ivory/60 px-4 py-1.5 text-[10px] uppercase tracking-[0.28em] text-plum/55">
            {s?.footer_tag?.trim() || t.start.fallbackFooter} · © {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </main>
  );
}
