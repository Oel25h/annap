import { useRouter, useRouterState } from "@tanstack/react-router";
import { useLocale, useT } from "@/lib/i18n/context";
import { switchLocalePath, writeLocaleCookie, type Locale } from "@/lib/i18n/locale";

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const { pathname, searchStr } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, searchStr: s.location.searchStr }),
  });

  function setLocale(next: Locale) {
    writeLocaleCookie(next);
    const target = switchLocalePath(pathname, next, searchStr);
    void router.navigate({ href: target });
  }

  return (
    <div
      role="group"
      aria-label={t.locale.switchTo}
      className={`inline-flex items-center rounded-full border border-plum/15 bg-ivory/80 p-0.5 text-[10px] uppercase tracking-[0.2em] ${className}`}
    >
      {(["en", "el"] as const).map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            className={`rounded-full px-2.5 py-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1 focus-visible:ring-offset-ivory ${
              active ? "bg-burgundy text-ivory" : "text-plum/70 hover:text-burgundy"
            }`}
          >
            {code === "en" ? "EN" : "EL"}
          </button>
        );
      })}
    </div>
  );
}
