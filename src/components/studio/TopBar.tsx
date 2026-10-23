/**
 * The page builder's top bar (DESIGN.md §10): identity, save state, the
 * editing language, Greek status, history, Preview and Publish. Below 1180
 * it becomes the app bar: back to All pages, the page and its state, Undo
 * and Publish, then the language and the Greek badges on rows of their own.
 */
import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/site/Icon";
import type { GreekStatus } from "./model";
import { GreekBadge, type Lang } from "./parts";
import { saveText, type StudioEditing } from "./useStudioEditing";

type Props = {
  title: string;
  editing: StudioEditing;
  lang: Lang;
  onLang: (lang: Lang) => void;
  counts: Record<GreekStatus, number>;
  firstWith: (status: GreekStatus) => string | null;
  onBadge: (sectionId: string) => void;
  previewHref: string;
  onPublish: () => void;
  now: number;
};

export function TopBar({
  title,
  editing,
  lang,
  onLang,
  counts,
  firstWith,
  onBadge,
  previewHref,
  onPublish,
  now,
}: Props) {
  const n = editing.changes.length;
  const saved = saveText(editing.save, now);
  const total = counts.approved + counts.draft + counts.stale + counts.missing;
  const hasDraft = n > 0;
  const canPublish = editing.online;

  return (
    <header className="sbar header-glass">
      <Link
        className="icon-btn sbar-back"
        to="/admin/pages"
        activeOptions={{ exact: true }}
        aria-label="All pages"
      >
        <Icon name="chev-left" />
      </Link>
      <div className="sbar-brand">
        <Link className="wordmark" to="/admin" activeOptions={{ exact: true }}>
          Anastasia Patience
        </Link>
        <span className="vr" aria-hidden="true" />
        <nav className="crumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link to="/admin/pages" activeOptions={{ exact: true }}>
                Studio
              </Link>
            </li>
            <li aria-current="page">{title}</li>
          </ol>
        </nav>
      </div>
      <div className="sbar-page">
        <p className="title">{title}</p>
        <p className="meta state-line">
          {hasDraft ? "Draft" : "Live"} · {saved}
        </p>
      </div>
      <div className="sbar-status">
        <span className={hasDraft ? "state" : "state state--live"}>
          {hasDraft ? "Draft" : "Live"}
        </span>
        <span className="meta" aria-live="off">
          {saved}
        </span>
      </div>
      <div className="sbar-lang">
        <fieldset className="seg-field">
          <legend className="sr-only">Editing language</legend>
          <div className="seg">
            <label>
              <input
                type="radio"
                name="editing-lang"
                value="en"
                checked={lang === "en"}
                onChange={() => onLang("en")}
              />
              <span>EN</span>
            </label>
            <label>
              <input
                type="radio"
                name="editing-lang"
                value="el"
                checked={lang === "el"}
                onChange={() => onLang("el")}
              />
              <span>
                <span lang="el">ΕΛ</span>
                <span className="sr-only"> (Greek)</span>
              </span>
            </label>
          </div>
        </fieldset>
        {total > 0 && (
          <div className="greek-status">
            <p className="greek-sum">
              Greek{" "}
              <b>
                {counts.approved}/{total}
              </b>{" "}
              approved
            </p>
            {counts.stale + counts.missing + counts.draft > 0 && (
              <ul className="badges" aria-label="Greek sections that need work">
                {(["stale", "missing", "draft"] as const).map((status) => {
                  const id = firstWith(status);
                  if (!counts[status] || !id) return null;
                  return (
                    <li key={status}>
                      <GreekBadge
                        status={status}
                        count={counts[status]}
                        onClick={() => onBadge(id)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
      <div className="sbar-actions">
        <button
          className="icon-btn"
          type="button"
          onClick={editing.undo}
          disabled={!editing.undoLabel}
          aria-label={editing.undoLabel ? `Undo ${editing.undoLabel}` : "Undo"}
          aria-keyshortcuts="Control+Z Meta+Z"
        >
          <Icon name="undo" />
        </button>
        <button
          className="icon-btn redo"
          type="button"
          onClick={editing.redo}
          disabled={!editing.canRedo}
          aria-label="Redo"
          aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z"
        >
          <Icon name="redo" />
        </button>
        <a className="btn btn-quiet btn-sm" href={previewHref} target="_blank" rel="noopener">
          Preview
          <Icon name="arrow-ext" />
          <span className="sr-only"> (opens a new tab)</span>
        </a>
        {canPublish ? (
          <button
            className="btn btn-primary btn-sm publish"
            type="button"
            aria-haspopup="dialog"
            onClick={onPublish}
            disabled={n === 0}
          >
            <span>
              Publish
              {n > 0 && (
                <>
                  <span aria-hidden="true"> ·</span> {n}
                  <span className="pub-word">&nbsp;{n === 1 ? "change" : "changes"}</span>
                </>
              )}
            </span>
          </button>
        ) : (
          <button className="btn btn-primary btn-sm publish" type="button" disabled>
            Reconnect to publish
          </button>
        )}
      </div>
    </header>
  );
}
