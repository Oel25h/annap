/**
 * Small pieces the page builder's panes share: the Greek status badges, the
 * save line and the variant diagrams.
 */
import { Icon, type IconName } from "@/components/site/Icon";
import type { GreekStatus } from "./model";

export type Lang = "en" | "el";

const BADGE: Record<GreekStatus, { icon: IconName; word: string }> = {
  approved: { icon: "check", word: "Approved" },
  draft: { icon: "pencil", word: "Draft" },
  stale: { icon: "clock", word: "Stale" },
  missing: { icon: "missing", word: "Missing" },
};

/** "Greek: Stale 1" as a badge; a button when it jumps to a row. */
export function GreekBadge({
  status,
  count,
  onClick,
}: {
  status: GreekStatus;
  count?: number;
  onClick?: () => void;
}) {
  const { icon, word } = BADGE[status];
  const body = (
    <>
      <Icon name={icon} />
      <span>
        <span className="sr-only">Greek: </span>
        {word}
        {count !== undefined && (
          <>
            {" "}
            <b>{count}</b>
          </>
        )}
      </span>
    </>
  );
  const className = `badge badge--${status}`;
  return onClick ? (
    <button className={className} type="button" onClick={onClick}>
      {body}
    </button>
  ) : (
    <span className={className}>{body}</span>
  );
}

export function HiddenBadge() {
  return (
    <span className="badge badge--hidden">
      <Icon name="eye-off" />
      <span>Hidden</span>
    </span>
  );
}

/** 48×32 sketches of each layout, 1.5 stroke; a generic block for the rest. */
const DIAGRAMS: Record<string, string> = {
  grid: "M2 3h13v11H2zM17.5 3h13v11h-13zM33 3h13v11H33zM2 18h13v11H2zM17.5 18h13v11h-13zM33 18h13v11H33z",
  masonry:
    "M2 3h13v15H2zM2 21h13v8H2zM17.5 3h13v8h-13zM17.5 14h13v15h-13zM33 3h13v11H33zM33 17h13v12H33z",
  carousel: "M9 3h30v20H9zM2 6v14M46 6v14M20 28h.01M24 28h.01M28 28h.01",
  filmstrip: "M2 3h28v26H2zM33 3h13v7H33zM33 12.5h13v7H33zM33 22h13v7H33z",
  list: "M2 4h44M2 12h44M2 20h44M2 28h30",
  rows: "M2 3h10v12H2zM16 6h30M16 11h22M2 18h10v12H2zM16 21h30M16 26h22",
  cards: "M2 3h20v26H2zM26 3h20v26H26z",
  single: "M6 3h36v22H6zM6 29h20",
  stacked: "M6 3h36v8H6zM6 13h36v8H6zM6 23h36v6H6z",
  image_left: "M2 3h20v26H2zM26 7h20M26 13h16M26 19h20M26 25h10",
  image_right: "M26 3h20v26H26zM2 7h20M2 13h16M2 19h20M2 25h10",
  cover_left: "M4 3h16v26H4zM26 7h20M26 13h16M26 19h20M26 25h10",
  cover_right: "M28 3h16v26H28zM2 7h20M2 13h16M2 19h20M2 25h10",
  portrait_arch: "M4 29V12a8 8 0 0 1 16 0v17zM26 9h20M26 15h16M26 22h10",
  portrait_right: "M28 29V12a8 8 0 0 1 16 0v17zM2 9h20M2 15h16M2 22h10",
  photo: "M2 6h24v18H2zM30 9h16M30 15h14M30 21h10",
  text_only: "M6 8h36M10 15h28M14 22h20",
  centred: "M18 6h12M8 14h32M12 20h24M20 27h8",
  statement: "M2 6h10M2 14h40M2 20h32M2 27h12",
  one_column: "M8 5h32M8 11h32M8 17h32M8 23h24",
  foreword: "M2 6h14M2 11h10M22 6h24M22 11h24M22 16h24M22 21h18",
  band: "M2 6h44v20H2zM10 13h20M10 19h12",
  card: "M8 4h32v24H8zM14 11h20M14 17h12",
  inline: "M2 10h28M2 16h20M34 10h12v8H34z",
  shelf: "M2 4h12v18H2zM18 4h12v18H18zM34 4h12v18H34zM2 27h44",
  vertical: "M8 3v26M8 7h.01M8 16h.01M8 25h.01M14 7h28M14 16h24M14 25h28",
  numbered: "M2 6h4M10 6h36M2 16h4M10 16h30M2 26h4M10 26h34",
  plain: "M2 6h44M2 16h38M2 26h42",
  accordion: "M2 4h44v7H2zM2 13h44v7H2zM2 22h44v7H2z",
  contained: "M8 5h32v22H8z",
  full_bleed: "M2 5h44v22H2z",
};

export function VariantDiagram({ variant }: { variant: string }) {
  return (
    <svg className="diag" viewBox="0 0 48 32" aria-hidden="true" focusable="false">
      <path d={DIAGRAMS[variant] ?? "M4 5h40v22H4zM10 12h28M10 18h18"} />
    </svg>
  );
}
