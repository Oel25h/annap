import { Fragment } from "react";
import { useLocale, useT } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/locale";
import { nb } from "@/lib/i18n/rag";

/**
 * «(στα Αγγλικά)» after a link whose page is in English, on /el (DESIGN.md §9).
 * It sits outside the English words and carries the page's language, so it
 * reads as Greek even inside a `lang="en"` heading.
 */
export function InEnglish({ target }: { target?: Locale | null }) {
  const t = useT();
  const locale = useLocale();
  if (target !== "en" || locale === "en") return null;
  return (
    <>
      {" "}
      <span className="meta" lang={locale}>
        {t.sections.inEnglish}
      </span>
    </>
  );
}

/**
 * The home h1 with its hope word in the one italic accent on the site. The
 * short words are bound first, so "σε σκοπό" never breaks after "σε".
 */
export function AccentTitle({ text, accent }: { text: string; accent: string }) {
  const bound = nb(text);
  const word = nb(accent.trim());
  const at = word ? bound.indexOf(word) : -1;
  if (at < 0) return <>{bound}</>;
  return (
    <>
      {bound.slice(0, at)}
      <em className="accent">{word}</em>
      {bound.slice(at + word.length)}
    </>
  );
}

/** Plain text with the line breaks the editor typed. */
export function Lines({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  return (
    <>
      {lines.map((line, index) => (
        <Fragment key={index}>
          {index > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </>
  );
}

/** Rich text that the server has already sanitised. */
export function RichHtml({
  html,
  className = "prose",
  lang,
}: {
  html: string;
  className?: string;
  lang?: string;
}) {
  if (!html.trim()) return null;
  return <div className={className} lang={lang} dangerouslySetInnerHTML={{ __html: html }} />;
}
