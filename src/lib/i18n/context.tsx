import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { DEFAULT_LOCALE, type Locale } from "./locale";
import { getMessages, type Messages } from "./messages";

type LocaleContextValue = {
  locale: Locale;
  t: Messages;
};

// Outside the provider (the root error and not-found pages), `t` is read when used.
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // The locale rewrite (./rewrite.ts) turns the /el prefix into the `lang` search param.
  // The language follows the page on screen: while a move to the other language is pending
  // the old page stays in its own language, and the new catalog is loaded once it resolves.
  const locale = useRouterState({
    select: (s) => localeFromSearch((s.resolvedLocation ?? s.location).search),
  });
  const value = useMemo(() => ({ locale, t: getMessages(locale) }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function localeFromSearch(search: unknown): Locale {
  return (search as { lang?: string } | undefined)?.lang === "el" ? "el" : "en";
}

export function useLocale(): Locale {
  return useContext(LocaleContext)?.locale ?? DEFAULT_LOCALE;
}

export function useT(): Messages {
  return useContext(LocaleContext)?.t ?? getMessages(DEFAULT_LOCALE);
}
