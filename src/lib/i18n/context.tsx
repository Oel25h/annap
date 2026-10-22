import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { DEFAULT_LOCALE, type Locale } from "./locale";
import { getMessages, type Messages } from "./messages";

type LocaleContextValue = {
  locale: Locale;
  t: Messages;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  t: getMessages(DEFAULT_LOCALE),
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  // The locale rewrite (./rewrite.ts) turns the /el prefix into the `lang` search param.
  const locale = useRouterState({ select: (s) => localeFromSearch(s.location.search) });
  const value = useMemo(() => ({ locale, t: getMessages(locale) }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function localeFromSearch(search: unknown): Locale {
  return (search as { lang?: string } | undefined)?.lang === "el" ? "el" : "en";
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

export function useT(): Messages {
  return useContext(LocaleContext).t;
}
