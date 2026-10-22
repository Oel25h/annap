import { Link } from "@tanstack/react-router";
import { useLocale, useT } from "@/lib/i18n/context";
import { writeLocaleCookie, type Locale } from "@/lib/i18n/locale";

const LABELS: Record<Locale, string> = { en: "EN", el: "ΕΛ" };

/**
 * The same page in the other language: real links (they work without
 * JavaScript and preload on intent), navigated without a reload.
 */
export function LanguageSwitch() {
  const locale = useLocale();
  const t = useT();
  return (
    <div className="lang" role="group" aria-label={t.site.language}>
      {(["en", "el"] as const).map((code, index) => (
        <span key={code} style={{ display: "contents" }}>
          {index > 0 && <span aria-hidden="true">/</span>}
          <Link
            to="."
            search={
              ((prev: Record<string, unknown>) => ({
                ...prev,
                lang: code === "el" ? "el" : undefined,
              })) as never
            }
            hash={(prev) => prev ?? ""}
            hrefLang={code}
            lang={code}
            aria-current={locale === code ? "true" : undefined}
            onClick={() => writeLocaleCookie(code)}
          >
            {LABELS[code]}
          </Link>
        </span>
      ))}
    </div>
  );
}
