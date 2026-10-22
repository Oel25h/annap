import { Link, useMatches, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import { writeLocaleCookie, type Locale } from "@/lib/i18n/locale";
import { getMessages } from "@/lib/i18n/messages";
import { useMiniPlayerShown } from "@/components/audio/AudioProvider";

const DISMISSED = "ap:lang-suggestion";
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
/** Pages that never show it: the link-in-bio page and the transactional pages. */
const QUIET = /^\/(start|checkout|download|confirm|unsubscribe)(\/|$)/;

function prefersGreek(): boolean {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return languages[0]?.toLowerCase().startsWith("el") ?? false;
}

function speaksGreek(): boolean {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return languages.some((l) => l?.toLowerCase().startsWith("el"));
}

function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISSED));
    return Number.isFinite(at) && Date.now() - at < YEAR_MS;
  } catch {
    return false;
  }
}

/**
 * A quiet bar suggesting the page in the reader's own language, written in
 * that language. It appears only after hydration (the HTML is the same for
 * everyone), only when the other language really exists for this page, never
 * takes focus, and steps aside while the docked audio player or a buy bar is
 * showing (the buy bar by CSS). Docked at the bottom like them, it never
 * fades in and never covers the legal row.
 */
export function LanguageSuggestion() {
  const locale = useLocale();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const matches = useMatches();
  const playerDocked = useMiniPlayerShown();
  const [target, setTarget] = useState<Locale | null>(null);

  // Whether this page has an approved twin in the other language.
  const twin = matches.some((match) => {
    const data = match.loaderData as { seo?: { alternates?: unknown } } | undefined;
    return !!data?.seo?.alternates;
  });

  useEffect(() => {
    if (!twin || QUIET.test(pathname) || dismissedRecently()) {
      setTarget(null);
      return;
    }
    if (locale === "en" && prefersGreek()) setTarget("el");
    else if (locale === "el" && !speaksGreek()) setTarget("en");
    else setTarget(null);
  }, [locale, pathname, twin]);

  if (!target || playerDocked) return null;
  const copy = getMessages(target).site.suggestion;
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED, String(Date.now()));
    } catch {
      // Storage blocked: it simply comes back next visit.
    }
    setTarget(null);
  };

  return (
    <div className="lang-suggest" lang={target}>
      <div className="wrap">
        <p>{copy.text}</p>
        <div className="lang-suggest-actions">
          <Link
            className="btn btn-quiet btn-sm"
            to="."
            search={
              ((prev: Record<string, unknown>) => ({
                ...prev,
                lang: target === "el" ? "el" : undefined,
              })) as never
            }
            hash={(prev) => prev ?? ""}
            activeOptions={{ explicitUndefined: true }}
            hrefLang={target}
            onClick={() => {
              writeLocaleCookie(target);
              setTarget(null);
            }}
          >
            {copy.switch}
          </Link>
          <button type="button" className="btn btn-text" onClick={dismiss}>
            {copy.notNow}
          </button>
        </div>
      </div>
    </div>
  );
}
