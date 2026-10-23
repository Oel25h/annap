import { Link, useMatches, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import { writeLocaleCookie, type Locale } from "@/lib/i18n/locale";
import { loadMessages, type Messages } from "@/lib/i18n/messages";
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
 * takes focus when it appears (and hands it back to the footer when dismissed),
 * and steps aside while the docked audio player or a buy bar is
 * showing (the buy bar by CSS). Docked at the bottom like them, it never
 * fades in and never covers the legal row.
 */
export function LanguageSuggestion() {
  const locale = useLocale();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const matches = useMatches();
  const playerDocked = useMiniPlayerShown();
  const [target, setTarget] = useState<Locale | null>(null);
  // The bar is written in the other language, whose copy this page did not ship.
  const [copy, setCopy] = useState<Messages["site"]["suggestion"] | null>(null);
  const bar = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setCopy(null);
    if (!target) return;
    let live = true;
    loadMessages(target).then(
      (messages) => live && setCopy(messages.site.suggestion),
      () => {}, // Offline: no suggestion this time.
    );
    return () => {
      live = false;
    };
  }, [target]);

  if (!target || !copy || playerDocked) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED, String(Date.now()));
    } catch {
      // Storage blocked: it simply comes back next visit.
    }
    // The bar is the last stop in the tab order. Before it unmounts, hand focus
    // back to the stop before it (the footer's last link), so a keyboard or
    // screen reader user keeps their place instead of dropping to <body>.
    if (bar.current?.contains(document.activeElement)) {
      const stops = Array.from(
        document.querySelectorAll<HTMLElement>("footer a[href], footer button:not([disabled])"),
      ).filter((el) => el.getClientRects().length > 0);
      (stops.at(-1) ?? document.getElementById("main"))?.focus({ preventScroll: true });
    }
    setTarget(null);
  };

  return (
    <div className="lang-suggest" lang={target} ref={bar}>
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
