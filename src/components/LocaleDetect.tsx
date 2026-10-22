import { useEffect, useRef } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import {
  browserPrefersGreek,
  getLocaleFromPath,
  readLocaleCookie,
  switchLocalePath,
  writeLocaleCookie,
} from "@/lib/i18n/locale";

/**
 * Soft first-visit redirect: Greek browser → /el… when no saved preference.
 * Explicit switcher cookie always wins; runs once per session.
 */
export function LocaleDetect() {
  const router = useRouter();
  const { pathname, searchStr } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, searchStr: s.location.searchStr }),
  });
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/el/start") ||
      pathname === "/start"
    ) {
      return;
    }

    const saved = readLocaleCookie();
    if (saved) {
      const current = getLocaleFromPath(pathname);
      if (saved !== current) {
        const target = switchLocalePath(pathname, saved, searchStr);
        void router.navigate({ href: target, replace: true });
      }
      return;
    }

    if (browserPrefersGreek() && getLocaleFromPath(pathname) === "en") {
      writeLocaleCookie("el");
      const target = switchLocalePath(pathname, "el", searchStr);
      void router.navigate({ href: target, replace: true });
    }
  }, [router, pathname, searchStr]);

  return null;
}
