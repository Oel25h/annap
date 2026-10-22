import { ArrowRight } from "lucide-react";
import { EmailCapture } from "./EmailCapture";
import { useSiteSocials } from "@/lib/site-socials";
import { SOCIAL_ICONS } from "@/lib/start-icons";
import { LocaleLink } from "@/components/LocaleLink";
import { useT } from "@/lib/i18n/context";

export function SiteFooter() {
  const { data: socials = [] } = useSiteSocials();
  const t = useT();
  const explore = [
    { to: "/about", label: t.nav.about },
    { to: "/blog", label: t.nav.blog },
    { to: "/books", label: t.nav.books },
    { to: "/masterclasses", label: t.nav.masterclasses },
    { to: "/gallery", label: t.nav.gallery },
    { to: "/foundation", label: t.nav.foundation },
    { to: "/contact", label: t.nav.contact },
  ];

  return (
    <div className="bg-ivory px-4 pb-4 md:px-6 md:pb-6">
      <footer className="relative overflow-hidden rounded-[2.5rem] bg-bone text-plum soft-shadow md:rounded-[3rem]">
        <div className="relative mx-auto max-w-7xl px-6 pt-14 pb-10 md:px-12 md:pt-20">
          <div className="grid gap-10 md:grid-cols-2 md:gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:gap-14">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <img
                  src="/logo-ap-mark.png"
                  alt=""
                  width={48}
                  height={32}
                  className="h-10 w-auto"
                  decoding="async"
                />
                <div className="font-display text-3xl leading-tight text-plum">
                  Anastasia Patience
                </div>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-plum/70">
                {t.footer.tagline}
              </p>
              {socials.length > 0 && (
                <div className="mt-6 flex items-center gap-2">
                  {socials.map((s) => {
                    const Icon = SOCIAL_ICONS[s.platform] ?? SOCIAL_ICONS.instagram;
                    return (
                      <a
                        key={s.id}
                        href={s.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={s.platform}
                        className="grid h-11 w-11 place-items-center rounded-full border border-plum/15 bg-ivory/60 text-plum transition hover:-translate-y-0.5 hover:border-burgundy hover:bg-burgundy hover:text-ivory"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-ivory/70 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-burgundy">
                <span className="h-1 w-1 rounded-full bg-burgundy" /> {t.footer.explore}
              </div>
              <ul className="mt-5 space-y-3 text-sm">
                {explore.map((l) => (
                  <li key={l.to}>
                    <LocaleLink
                      to={l.to}
                      className="inline-flex items-center gap-1.5 text-plum/80 transition hover:translate-x-0.5 hover:text-burgundy"
                    >
                      {l.label}
                    </LocaleLink>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-ivory/70 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-burgundy">
                <span className="h-1 w-1 rounded-full bg-burgundy" /> {t.footer.company}
              </div>
              <div className="mt-5 space-y-3 text-sm">
                <div>
                  <span className="inline-flex items-center rounded-full border border-plum/15 bg-ivory/80 px-3 py-1 text-[11px] font-medium tracking-wide text-plum">
                    Patience Media House
                  </span>
                </div>
                <div>
                  <LocaleLink
                    to="/start"
                    className="inline-flex items-center gap-1.5 text-plum/80 transition hover:translate-x-0.5 hover:text-burgundy"
                  >
                    Link in bio
                  </LocaleLink>
                </div>
              </div>
              <LocaleLink
                to="/contact"
                className="group mt-6 inline-flex items-center gap-2 rounded-full bg-plum px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.24em] text-ivory transition hover:-translate-y-0.5 hover:bg-burgundy"
              >
                {t.nav.contact}{" "}
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </LocaleLink>
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-ivory/70 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-burgundy">
                <span className="h-1 w-1 rounded-full bg-burgundy" /> {t.emailCapture.freeGuide}
              </div>
              <p className="mt-5 text-sm text-plum/70">{t.emailCapture.sub}</p>
              <div className="mt-4 min-w-0">
                <EmailCapture variant="compact" cta={t.emailCapture.cta} />
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-plum/10 pt-8 text-xs text-plum/60 md:flex-row md:items-center">
            <div>
              © {new Date().getFullYear()} Patience Media House. {t.footer.rights}
            </div>
            <div className="inline-flex max-w-full flex-wrap items-center rounded-full border border-burgundy/25 bg-ivory/70 px-4 py-1.5 uppercase tracking-[0.16em] text-burgundy sm:tracking-[0.28em]">
              Find Your Reason to Smile
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
