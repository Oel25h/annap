import { Link } from "@tanstack/react-router";
import { Fragment } from "react";
import { useLocale, useT } from "@/lib/i18n/context";
import { writeLocaleCookie, type Locale } from "@/lib/i18n/locale";
import { Icon } from "./Icon";

const CODES: Record<Locale, string> = { en: "EN", el: "ΕΛ" };
const NAMES: Record<Locale, string> = { en: "English", el: "Ελληνικά" };

/**
 * The same page in the other language: real links (they work without
 * JavaScript and preload on intent), navigated without a reload.
 *
 * - `header`: EN / ΕΛ, each 44×44, named in full for screen readers.
 * - `menu`: a two-cell row of 56px links; the current one takes the
 *   selected style and a check.
 */
export function LanguageSwitch({ variant = "header" }: { variant?: "header" | "menu" }) {
  const locale = useLocale();
  const t = useT();
  return (
    <div
      className={variant === "menu" ? "lang--menu" : "lang"}
      role="group"
      aria-label={t.site.language}
    >
      {(["en", "el"] as const).map((code, index) => (
        <Fragment key={code}>
          {variant === "header" && index > 0 && <span aria-hidden="true">/</span>}
          <Link
            to="."
            search={
              ((prev: Record<string, unknown>) => ({
                ...prev,
                lang: code === "el" ? "el" : undefined,
              })) as never
            }
            hash={(prev) => prev ?? ""}
            // `lang: undefined` must mean "no lang", or English also counts as current on Greek pages.
            activeOptions={{ explicitUndefined: true }}
            hrefLang={code}
            lang={code}
            aria-current={locale === code ? "page" : undefined}
            onClick={() => writeLocaleCookie(code)}
          >
            {variant === "menu" ? (
              <>
                {locale === code && <Icon name="check" />}
                {NAMES[code]}
              </>
            ) : (
              <>
                <span aria-hidden="true">{CODES[code]}</span>
                <span className="sr-only">{NAMES[code]}</span>
              </>
            )}
          </Link>
        </Fragment>
      ))}
    </div>
  );
}
