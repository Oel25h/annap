import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { DEFAULT_LOCALE, getLocaleFromPath, type Locale } from "./locale";
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const value = useMemo(() => {
    const locale = getLocaleFromPath(pathname);
    return { locale, t: getMessages(locale) };
  }, [pathname]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

export function useT(): Messages {
  return useContext(LocaleContext).t;
}
