import { Fragment, type ReactNode } from "react";

/** The title with its accent words in italic, as set in the studio. */
export function AccentTitle({ text, accent }: { text: string; accent: string }) {
  const at = accent.trim() ? text.indexOf(accent.trim()) : -1;
  if (at < 0) return <>{text}</>;
  const word = accent.trim();
  return (
    <>
      {text.slice(0, at)}
      <em>{word}</em>
      {text.slice(at + word.length)}
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
export function RichHtml({ html, className = "prose" }: { html: string; className?: string }) {
  if (!html.trim()) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function toRoman(n: number): string {
  const table: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  for (const [value, numeral] of table) {
    while (n >= value) {
      out += numeral;
      n -= value;
    }
  }
  return out;
}

export function Maybe({ when, children }: { when: unknown; children: ReactNode }) {
  return when ? <>{children}</> : null;
}
