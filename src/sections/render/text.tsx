import { Fragment } from "react";
import { nb } from "@/lib/i18n/rag";

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
