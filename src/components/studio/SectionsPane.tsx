/**
 * The Sections list (DESIGN.md §10): a grip, the row and an eye per
 * section, Header and Footer as fixed global rows, Add section and the
 * Greek legend. From 1180 it is the left pane; below, the same list is a
 * full-screen sheet (role="dialog", the rest of the studio inert) that the
 * section picker opens.
 */
import { useEffect, useRef } from "react";
import { Icon } from "@/components/site/Icon";
import { sectionName, type GreekStatus } from "./model";
import { GreekBadge, HiddenBadge } from "./parts";
import type { StudioEditing } from "./useStudioEditing";

type Props = {
  pageTitle: string;
  editing: StudioEditing;
  counts: Record<GreekStatus, number>;
  isHome: boolean;
  sheetOpen: boolean;
  onCloseSheet: () => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
  /** A row to focus when the list opens or a badge points at it. */
  focusId: string | null;
  onFocused: () => void;
};

function LockedRow({ name, meta }: { name: string; meta: string }) {
  return (
    <li className="row is-locked">
      <span className="row-lock">
        <Icon name="lock" />
        <span className="sr-only">Fixed position.</span>
      </span>
      <div className="row-main">
        <span className="srow-text">
          <span className="row-name">{name}</span>
          <span className="meta">{meta}</span>
        </span>
      </div>
    </li>
  );
}

export function SectionsPane({
  pageTitle,
  editing,
  counts,
  isHome,
  sheetOpen,
  onCloseSheet,
  onSelect,
  onAdd,
  focusId,
  onFocused,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const { sections } = editing;
  const hidden = sections.filter((s) => s.settings.hidden).length;

  useEffect(() => {
    if (!focusId) return;
    const row = ref.current?.querySelector<HTMLElement>(`[data-row="${focusId}"] .row-main`);
    row?.focus();
    onFocused();
  }, [focusId, onFocused]);

  useEffect(() => {
    if (sheetOpen && !focusId) ref.current?.querySelector<HTMLElement>(".sheet-close")?.focus();
  }, [sheetOpen, focusId]);

  return (
    <aside
      className={sheetOpen ? "outline is-open" : "outline"}
      id="outline"
      aria-labelledby="outline-title"
      role={sheetOpen ? "dialog" : undefined}
      aria-modal={sheetOpen ? true : undefined}
      ref={ref}
      onKeyDown={(e) => {
        if (sheetOpen && e.key === "Escape" && !editing.heldId) onCloseSheet();
      }}
    >
      <div className="outline-inner">
        <div className="outline-head">
          <div>
            <h2 id="outline-title" className="title">
              Sections
            </h2>
            <p className="meta">
              {pageTitle} · {sections.length} {sections.length === 1 ? "section" : "sections"}
              {hidden > 0 && ` · ${hidden} hidden`}
            </p>
          </div>
          <button
            className="icon-btn sheet-close"
            type="button"
            aria-label="Close sections"
            onClick={onCloseSheet}
          >
            <Icon name="close" />
          </button>
        </div>

        {sections.length === 0 ? (
          <div className="empty-page">
            <p className="small">This page has no sections yet.</p>
            <button className="btn btn-quiet" type="button" onClick={onAdd}>
              <Icon name="plus" />
              <span>Add the first section</span>
            </button>
          </div>
        ) : (
          <>
            <ol className="srows">
              <LockedRow name="Header" meta="Global" />
              {sections.map((section, index) => {
                const name = sectionName(section);
                const locked = editing.isLocked(index);
                const isHidden = !!section.settings.hidden;
                const selected = section.id === editing.selected?.id;
                const greek = editing.statusOf(section);
                const classes = [
                  "row",
                  selected && "is-selected",
                  isHidden && "is-hidden",
                  locked && "is-locked",
                  editing.heldId === section.id && "is-held",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <li key={section.id} className={classes} data-row={section.id}>
                    {locked ? (
                      <span className="row-lock">
                        <Icon name="lock" />
                        <span className="sr-only">Fixed position.</span>
                      </span>
                    ) : (
                      <button
                        className="grip"
                        type="button"
                        aria-label={`Move ${name}`}
                        aria-describedby="drag-help"
                        onKeyDown={(e) => editing.gripKey(section.id, e)}
                        onBlur={editing.gripBlur}
                      >
                        <Icon name="grip" />
                      </button>
                    )}
                    <button
                      className="row-main"
                      type="button"
                      aria-current={selected ? "true" : undefined}
                      onClick={() => onSelect(section.id)}
                    >
                      <span className="srow-text">
                        <span className="row-name">{name}</span>
                        {isHome && index === 1 && locked && (
                          <span className="meta">Pinned below the hero</span>
                        )}
                      </span>
                      <span className="row-badges">
                        {isHidden && <HiddenBadge />}
                        {greek && greek !== "approved" && <GreekBadge status={greek} />}
                      </span>
                    </button>
                    {locked ? (
                      <span aria-hidden="true" />
                    ) : (
                      <button
                        className="eye"
                        type="button"
                        aria-label={`Hide ${name}`}
                        aria-pressed={isHidden}
                        onClick={() => editing.toggleHidden(section.id)}
                      >
                        <Icon name={isHidden ? "eye-off" : "eye"} />
                      </button>
                    )}
                  </li>
                );
              })}
              <LockedRow name="Footer" meta="Global" />
            </ol>
            <p id="drag-help" className="sr-only">
              Press Space to pick up, the arrow keys to move, and Space again to drop. Escape
              cancels.
            </p>
            <button className="btn btn-quiet btn-block add-section" type="button" onClick={onAdd}>
              <Icon name="plus" />
              <span>Add section</span>
            </button>
          </>
        )}

        <div className="legend">
          <h3 className="label">Greek translation</h3>
          <ul>
            {(["approved", "draft", "stale", "missing"] as const).map((status) => (
              <li key={status}>
                <GreekBadge status={status} count={counts[status]} />
              </li>
            ))}
          </ul>
          <p className="meta">
            A missing section shows the English text on /el until its Greek version is approved.
          </p>
        </div>
      </div>
    </aside>
  );
}
