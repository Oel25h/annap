import { Link } from "@tanstack/react-router";
import { useLocale, useT } from "@/lib/i18n/context";
import { writeLocaleCookie, type Locale } from "@/lib/i18n/locale";

/**
 * Switches to the same page in the other language. A real link (so it works
 * without JavaScript and can be preloaded), navigated client-side.
 */
export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useT();

  return (
    <div
      role="group"
      aria-label={t.locale.switchTo}
      className={`inline-flex items-center rounded-full border border-plum/15 bg-ivory/80 p-0.5 text-[10px] uppercase tracking-[0.2em] ${className}`}
    >
      {(["en", "el"] as const).map((code: Locale) => {
        const active = locale === code;
        return (
          <Link
            key={code}
            to="."
            search={
              ((prev: Record<string, unknown>) => ({
                ...prev,
                lang: code === "el" ? "el" : undefined,
              })) as never
            }
            hash={(prev) => prev ?? ""}
            activeOptions={{ exact: true, includeSearch: true, explicitUndefined: true }}
            onClick={() => writeLocaleCookie(code)}
            hrefLang={code}
            lang={code}
            className={`rounded-full px-2.5 py-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1 focus-visible:ring-offset-ivory ${
              active ? "bg-burgundy text-ivory" : "text-plum/70 hover:text-burgundy"
            }`}
          >
            {code === "en" ? "EN" : "ΕΛ"}
          </Link>
        );
      })}
    </div>
  );
}
