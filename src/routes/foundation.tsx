import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, MapPin, Heart } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { Eyebrow } from "@/components/Eyebrow";
import { EmailCapture } from "@/components/EmailCapture";
import { supabase } from "@/integrations/supabase/client";
import { useLocale, useT } from "@/lib/i18n/context";
import { getApprovedTranslation, mergeTranslation } from "@/lib/i18n/translations";
import { resolveMediaUrl } from "@/lib/media";
import { LocaleLink } from "@/components/LocaleLink";
import { absoluteUrl } from "@/lib/site-url";

type Settings = {
  id: string;
  eyebrow: string;
  headline: string;
  subheadline: string | null;
  mission: string | null;
  vision: string | null;
  hero_image_url: string | null;
  cta_label: string | null;
  cta_href: string | null;
  donate_label: string | null;
  donate_href: string | null;
};

type Story = {
  id: string;
  slug: string;
  person_name: string;
  title: string;
  summary: string | null;
  body: string;
  cover_url: string | null;
  location: string | null;
  category: string;
  featured: boolean;
  /** Localized category label when EL overlay exists */
  categoryLabel?: string;
};

type Cat = { id: string; name: string; slug: string; sort_order: number };

export async function loadFoundation() {
  const [{ data: settings }, { data: stories }, { data: cats }] = await Promise.all([
    supabase
      .from("foundation_settings" as never)
      .select("*")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("foundation_stories" as never)
      .select(
        "id, slug, person_name, title, summary, body, cover_url, location, category, featured, sort_order",
      )
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("sort_order", { ascending: true }),
    supabase
      .from("foundation_categories" as never)
      .select("id, name, slug, sort_order")
      .order("sort_order", { ascending: true }),
  ]);
  return {
    settings: (settings as Settings | null) ?? null,
    stories: (stories as Story[] | null) ?? [],
    cats: (cats as Cat[] | null) ?? [],
  };
}

export const Route = createFileRoute("/foundation")({
  loader: async () => loadFoundation(),
  head: ({ loaderData }) => {
    const settings = loaderData?.settings;
    const title = "Patience Humanitarian Foundation";
    const description =
      settings?.subheadline?.trim() ||
      "Where no one feels left behind. Food assistance, compassionate care, community support, and care for rescued animals.";
    const image =
      resolveMediaUrl(settings?.hero_image_url) || absoluteUrl("/foundation-hero-mark.jpg");
    const imageAbs = image.startsWith("http") ? image : absoluteUrl(image);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: absoluteUrl("/foundation") },
        { property: "og:image", content: imageAbs },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: imageAbs },
      ],
      links: [
        { rel: "canonical", href: absoluteUrl("/foundation") },
        { rel: "alternate", hrefLang: "en", href: absoluteUrl("/foundation") },
        { rel: "alternate", hrefLang: "el", href: absoluteUrl("/el/foundation") },
        { rel: "alternate", hrefLang: "x-default", href: absoluteUrl("/foundation") },
      ],
    };
  },
  component: FoundationPage,
});

const btnBase =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory sm:w-auto sm:min-h-11 sm:px-7";
const btnPrimary = `${btnBase} bg-burgundy text-ivory hover:bg-plum`;
const btnGhost = `${btnBase} border border-plum/20 bg-ivory text-plum hover:border-burgundy hover:text-burgundy`;

export function FoundationPage() {
  const locale = useLocale();
  const t = useT();
  // Shared by /foundation and /el/foundation, so read the loader data of whichever route matched.
  const loaded = useLoaderData({ strict: false }) as
    Awaited<ReturnType<typeof loadFoundation>> | undefined;
  const [settings, setSettings] = useState<Settings | null>(loaded?.settings ?? null);
  const [settingsEl, setSettingsEl] = useState(false);
  const [stories, setStories] = useState<Story[]>(loaded?.stories ?? []);
  const [cats] = useState<Cat[]>(loaded?.cats ?? []);
  const [filter, setFilter] = useState<string>("__all__");

  useEffect(() => {
    setSettingsEl(false);
    setSettings(loaded?.settings ?? null);
    setStories(loaded?.stories ?? []);
    setFilter("__all__");
    if (locale !== "el") return;

    void (async () => {
      const baseSettings = loaded?.settings;
      if (baseSettings) {
        const tr = await getApprovedTranslation("foundation_settings", baseSettings.id);
        if (tr && Object.keys(tr).length > 0) {
          setSettings(
            mergeTranslation(baseSettings, tr, [
              "eyebrow",
              "headline",
              "subheadline",
              "mission",
              "vision",
              "cta_label",
              "donate_label",
            ]),
          );
          setSettingsEl(true);
        }
      }
      const baseStories = loaded?.stories ?? [];
      setStories(
        await Promise.all(
          baseStories.map(async (s) => {
            const tr = await getApprovedTranslation("foundation_story", s.id);
            const merged = mergeTranslation(s, tr, [
              "person_name",
              "title",
              "summary",
              "body",
              "location",
              "category",
            ]);
            return {
              ...merged,
              category: s.category,
              categoryLabel: tr?.category?.trim() || s.category,
            };
          }),
        ),
      );
    })();
  }, [locale, loaded]);

  const pick = (cms: string | null | undefined, fallback: string) => {
    if (locale === "el" && !settingsEl) return fallback;
    return cms?.trim() || fallback;
  };

  const eyebrow = pick(settings?.eyebrow, t.foundation.eyebrow);
  const headline = pick(settings?.headline, t.foundation.headline);
  const sub = pick(settings?.subheadline, t.foundation.sub);
  const ctaLabel = pick(settings?.cta_label, t.foundation.partnerCta);
  const missionText = settings?.mission?.trim() || null;
  const visionText = settings?.vision?.trim() || null;
  const ctaHref = settings?.cta_href || "/contact";
  const ctaIsInternal = ctaHref.startsWith("/");
  const heroSrc = resolveMediaUrl(settings?.hero_image_url) || "/foundation-hero-mark.jpg";

  const filterKeys = useMemo(() => {
    const names = cats.map((c) => c.name);
    const fromStories = stories.map((s) => s.category).filter(Boolean);
    const ordered = [...names];
    for (const n of fromStories) {
      if (n && !ordered.includes(n)) ordered.push(n);
    }
    return ordered;
  }, [cats, stories]);

  const filtered = filter === "__all__" ? stories : stories.filter((s) => s.category === filter);

  const topStories = filtered.filter((s) => s.featured);
  const moreStories =
    topStories.length > 0 ? filtered.filter((s) => !s.featured) : filtered.slice(1);
  const leadOnly = topStories.length === 0 && filtered.length > 0 ? [filtered[0]] : topStories;

  const Cta = ({ className = btnPrimary }: { className?: string }) =>
    ctaIsInternal ? (
      <LocaleLink to={ctaHref} className={className}>
        {ctaLabel}
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
      </LocaleLink>
    ) : (
      <a href={ctaHref} target="_blank" rel="noopener noreferrer" className={className}>
        {ctaLabel}
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
      </a>
    );

  return (
    <main className="bg-ivory text-plum">
      {/* HERO */}
      <section className="border-b border-plum/10">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-28 sm:gap-12 sm:px-8 sm:pb-16 sm:pt-32 md:grid-cols-12 md:items-center md:gap-14 md:px-10 md:pb-24 md:pt-36">
          <Reveal className="order-2 md:order-1 md:col-span-6 lg:col-span-7">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="mt-5 max-w-xl font-display text-[1.85rem] leading-[1.1] tracking-[-0.02em] text-plum xs:text-[2rem] sm:text-4xl md:text-[2.75rem] lg:text-5xl">
              {headline}
            </h1>
            {sub && (
              <p className="mt-5 max-w-lg text-[0.95rem] leading-relaxed text-ink sm:mt-6 sm:text-lg">
                {sub}
              </p>
            )}
            <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.2em] text-plum/50">
              {t.foundation.heroCaption}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center">
              <Cta />
              {settings?.donate_href && settings.donate_label && (
                <a
                  href={settings.donate_href}
                  target={settings.donate_href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className={btnGhost}
                >
                  {settings.donate_label}
                </a>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.06} className="order-1 md:order-2 md:col-span-6 lg:col-span-5">
            <div className="mx-auto w-full max-w-[280px] sm:max-w-[320px] md:ml-auto md:mr-0 md:max-w-none">
              <div className="rounded-3xl border border-plum/10 bg-[#f6f1e8] p-5 soft-shadow sm:p-7 md:p-8">
                <img
                  src={heroSrc}
                  alt="Patience Humanitarian Foundation"
                  width={640}
                  height={640}
                  className="mx-auto h-auto w-full object-contain"
                  decoding="async"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* STORIES — blog-style: filters + top + more — directly under hero */}
      <section className="border-b border-plum/10 bg-ivory">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16 md:px-10 md:py-24">
          <Reveal>
            <Eyebrow>{t.foundation.storiesLabel}</Eyebrow>
            <h2 className="mt-4 max-w-xl font-display text-3xl leading-tight text-plum sm:text-4xl md:text-5xl">
              {t.foundation.storiesHeadline}
            </h2>
            <p className="mt-4 max-w-lg text-base text-ink sm:text-lg">{t.foundation.storiesSub}</p>
          </Reveal>

          {filterKeys.length > 0 && (
            <div className="mt-10 -mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:overflow-visible sm:px-0">
              <div
                className="inline-flex min-w-full items-center gap-2 rounded-full bg-bone p-2 soft-shadow sm:flex sm:min-w-0 sm:flex-wrap"
                role="tablist"
                aria-label={t.foundation.storiesLabel}
              >
                <FilterChip
                  active={filter === "__all__"}
                  onClick={() => setFilter("__all__")}
                  label={t.foundation.filterAll}
                />
                {filterKeys.map((name) => (
                  <FilterChip
                    key={name}
                    active={filter === name}
                    onClick={() => setFilter(name)}
                    label={name}
                  />
                ))}
              </div>
            </div>
          )}

          {stories.length === 0 ? (
            <div className="mt-12 rounded-2xl border border-dashed border-plum/15 bg-bone px-5 py-14 text-center sm:mt-16">
              <Heart className="mx-auto h-8 w-8 text-burgundy/35" strokeWidth={1.5} aria-hidden />
              <p className="mt-4 font-display text-xl text-plum">{t.foundation.empty}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-12 rounded-2xl border border-plum/10 bg-bone px-5 py-12 text-center">
              <p className="text-ink">{t.foundation.emptyCategory}</p>
            </div>
          ) : (
            <div className="mt-12 space-y-16 sm:mt-16 sm:space-y-20">
              {/* Top / featured */}
              <div>
                {leadOnly.length > 0 && topStories.length > 0 && (
                  <p className="mb-6 text-[10px] font-medium uppercase tracking-[0.28em] text-burgundy">
                    {t.foundation.topStories}
                  </p>
                )}
                <div className="space-y-14 sm:space-y-16">
                  {leadOnly.map((s) => (
                    <StoryLead key={s.id} story={s} t={t} />
                  ))}
                </div>
              </div>

              {/* More stories — denser grid */}
              {moreStories.length > 0 && (
                <div>
                  {(leadOnly.length > 0 || topStories.length > 0) && (
                    <p className="mb-6 text-[10px] font-medium uppercase tracking-[0.28em] text-plum/50">
                      {t.foundation.moreStories}
                    </p>
                  )}
                  <div className="grid gap-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-10">
                    {moreStories.map((s) => (
                      <StoryCard key={s.id} story={s} t={t} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Mission / Vision / Values / Close — inset bone cards (Free Guide language) ── */}
      <section className="bg-ivory px-4 py-12 sm:px-6 sm:py-16 md:px-8 md:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:gap-10 md:gap-12">
          {/* MISSION — statement card with vertical accent rail */}
          {missionText && (
            <Reveal>
              <article className="relative overflow-hidden rounded-[2rem] border border-plum/10 bg-bone px-6 py-10 soft-shadow sm:rounded-[2.5rem] sm:px-10 sm:py-12 md:px-14 md:py-16">
                <div
                  className="absolute bottom-10 left-0 top-10 hidden w-1 rounded-full bg-burgundy sm:block"
                  aria-hidden
                />
                <div className="sm:pl-6 md:pl-8">
                  <Eyebrow>{t.foundation.missionLabel}</Eyebrow>
                  <p className="mt-6 max-w-3xl font-display text-2xl leading-snug tracking-[-0.02em] text-plum sm:text-3xl md:text-[2.125rem] md:leading-[1.2]">
                    {missionText}
                  </p>
                </div>
              </article>
            </Reveal>
          )}

          {/* VISION — split label + statement inside card */}
          {visionText && (
            <Reveal delay={0.04}>
              <article className="overflow-hidden rounded-[2rem] border border-plum/10 bg-bone soft-shadow sm:rounded-[2.5rem]">
                <div className="grid md:grid-cols-12 md:items-stretch">
                  <div className="flex flex-col justify-between border-b border-plum/10 bg-ivory/55 px-6 py-8 sm:px-8 sm:py-10 md:col-span-4 md:border-b-0 md:border-r md:px-10 md:py-14">
                    <Eyebrow>{t.foundation.visionLabel}</Eyebrow>
                    <p className="mt-8 hidden font-display text-5xl leading-none text-burgundy/25 md:block lg:text-6xl">
                      ∞
                    </p>
                  </div>
                  <div className="px-6 py-8 sm:px-10 sm:py-12 md:col-span-8 md:px-12 md:py-14">
                    <h2 className="font-display text-xl leading-snug text-plum sm:text-2xl md:text-3xl md:leading-[1.25]">
                      {visionText}
                    </h2>
                  </div>
                </div>
              </article>
            </Reveal>
          )}

          {/* VALUES — bone shell + ivory value tiles */}
          <Reveal delay={0.06}>
            <article className="rounded-[2rem] border border-plum/10 bg-bone px-6 py-10 soft-shadow sm:rounded-[2.5rem] sm:px-10 sm:py-12 md:px-12 md:py-14">
              <div className="mx-auto max-w-2xl text-center">
                <div className="flex justify-center">
                  <Eyebrow className="justify-center [&>span:first-child]:hidden">
                    {t.foundation.valuesLabel}
                  </Eyebrow>
                </div>
                <h2 className="mt-4 font-display text-2xl text-plum sm:text-3xl md:text-4xl">
                  {t.foundation.valuesHeadline}
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink sm:text-base">
                  {t.foundation.valuesSub}
                </p>
              </div>
              <ul className="mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
                {t.foundation.values.map((v, i) => (
                  <li
                    key={v}
                    className="flex min-h-[5.5rem] flex-col items-center justify-center rounded-2xl border border-plum/10 bg-ivory px-4 py-5 text-center sm:min-h-[6.5rem] sm:rounded-3xl"
                  >
                    <span className="text-[10px] font-medium tabular-nums tracking-[0.2em] text-burgundy/70">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="mt-2 font-display text-lg leading-tight text-plum sm:text-xl">
                      {v}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>

          {/* CLOSE — Free Guide–style CTA card */}
          <Reveal delay={0.08}>
            <article className="overflow-hidden rounded-[2rem] border border-plum/10 bg-bone px-6 py-10 soft-shadow-lg sm:rounded-[2.5rem] sm:px-10 sm:py-12 md:px-14 md:py-16">
              <div className="grid items-center gap-8 md:grid-cols-[1.2fr_auto] md:gap-12">
                <div>
                  <div className="mb-5 inline-flex items-center gap-3 rounded-full bg-ivory/70 px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-burgundy">
                    <span className="h-1.5 w-1.5 rounded-full bg-burgundy" />
                    {eyebrow}
                  </div>
                  <p className="font-display text-2xl leading-snug text-plum sm:text-3xl md:text-4xl md:leading-[1.1]">
                    {t.foundation.closeHeadline}
                  </p>
                  <p className="mt-3 text-sm text-plum/60 sm:text-base">
                    {t.foundation.heroCaption}
                  </p>
                </div>
                <div className="w-full md:w-auto md:justify-self-end">
                  <Cta />
                </div>
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      {/* Email — same inset language */}
      <div className="bg-ivory">
        <EmailCapture variant="banded" source="/foundation" />
      </div>
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory ${
        active
          ? "bg-burgundy text-ivory shadow-[0_8px_20px_-12px_rgba(232,93,58,0.7)]"
          : "text-plum/70 hover:bg-ivory hover:text-burgundy"
      }`}
    >
      {label}
    </button>
  );
}

function StoryLead({ story: s, t }: { story: Story; t: ReturnType<typeof useT> }) {
  const cat = s.categoryLabel || s.category;
  return (
    <article
      id={s.slug}
      className="grid gap-8 overflow-hidden rounded-[1.75rem] border border-plum/10 bg-bone p-5 soft-shadow sm:gap-10 sm:rounded-[2rem] sm:p-6 md:grid-cols-12 md:items-start md:gap-12 md:p-8"
    >
      <Reveal className="md:col-span-5">
        <div className="relative overflow-hidden rounded-2xl border border-plum/10 bg-bone">
          <div className="aspect-[4/5] w-full sm:aspect-[4/3] md:aspect-[4/5]">
            {s.cover_url ? (
              <img
                src={resolveMediaUrl(s.cover_url)}
                alt={s.person_name}
                width={800}
                height={1000}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="grid h-full place-items-center bg-gradient-to-b from-bone to-bone/80 text-plum/20">
                <Heart className="h-10 w-10" strokeWidth={1.5} aria-hidden />
              </div>
            )}
          </div>
          <span className="absolute left-3 top-3 rounded-full bg-ivory/95 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-burgundy">
            {t.foundation.featured}
            {cat ? ` · ${cat}` : ""}
          </span>
        </div>
      </Reveal>
      <Reveal delay={0.05} className="md:col-span-7 md:pt-1">
        {s.location && (
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-plum/50">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-burgundy" aria-hidden />
            {s.location}
          </p>
        )}
        <h3 className="mt-3 font-display text-2xl leading-tight text-plum sm:text-3xl md:text-4xl">
          {s.title}
        </h3>
        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-burgundy">
          {s.person_name}
        </p>
        {s.summary && (
          <p className="mt-5 text-base leading-relaxed text-ink sm:text-lg">{s.summary}</p>
        )}
        {s.body && (
          <div
            className="prose prose-neutral mt-5 max-w-none text-ink prose-p:text-base prose-p:leading-relaxed sm:prose-p:text-[1.05rem] prose-headings:font-display prose-headings:text-plum prose-a:text-burgundy"
            dangerouslySetInnerHTML={{ __html: s.body }}
          />
        )}
      </Reveal>
    </article>
  );
}

function StoryCard({ story: s, t }: { story: Story; t: ReturnType<typeof useT> }) {
  const cat = s.categoryLabel || s.category;
  return (
    <article id={s.slug} className="group flex flex-col">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-plum/10 bg-bone">
          <div className="aspect-[4/5] w-full">
            {s.cover_url ? (
              <img
                src={resolveMediaUrl(s.cover_url)}
                alt={s.person_name}
                width={600}
                height={750}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="grid h-full place-items-center text-plum/20">
                <Heart className="h-8 w-8" strokeWidth={1.5} aria-hidden />
              </div>
            )}
          </div>
          {cat && (
            <span className="absolute left-3 top-3 rounded-full bg-ivory/95 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-burgundy">
              {cat}
            </span>
          )}
        </div>
        {s.location && (
          <p className="mt-4 flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-plum/45">
            <MapPin className="h-3 w-3 shrink-0 text-burgundy" aria-hidden />
            {s.location}
          </p>
        )}
        <h3 className="mt-2 font-display text-xl leading-snug text-plum sm:text-2xl">{s.title}</h3>
        <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-burgundy">
          {s.person_name}
        </p>
        {s.summary && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink">{s.summary}</p>
        )}
        {s.body && !s.summary && (
          <div
            className="prose prose-sm prose-neutral mt-3 max-w-none line-clamp-4 text-ink prose-headings:font-display prose-a:text-burgundy"
            dangerouslySetInnerHTML={{ __html: s.body }}
          />
        )}
        <span className="sr-only">{t.foundation.moreStories}</span>
      </Reveal>
    </article>
  );
}
