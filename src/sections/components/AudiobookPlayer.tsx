import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useAudioActions, useAudioState, useSelectedBook } from "@/components/audio/AudioProvider";
import {
  formatTime,
  hoursMinutes,
  plural,
  rateLabel,
  spokenDuration,
} from "@/components/audio/format";
import {
  bookSeconds,
  neighbour,
  sectionBooks,
  type PlayableBook,
} from "@/components/audio/playable";
import { editionView } from "@/components/audio/store";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import { useT } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import { nb } from "@/lib/i18n/rag";
import type { MediaMap, RenderedSection } from "@/sections/types";
import { keyLang, SectionHeading, SectionShell, type SectionContext } from "../render/SectionShell";

/** Chapters shown on phones and tablets before "Show all". */
const WINDOW = 4;

/** Scrubber keys: seconds to move. */
const SEEK_KEYS: Record<string, number> = {
  ArrowLeft: -5,
  ArrowDown: -5,
  ArrowRight: 5,
  ArrowUp: 5,
  PageDown: -30,
  PageUp: 30,
};

/** What the verso's status line can say (its message keys). */
type Status = "ready" | "paused" | "playing" | "buffering";

/** The language to mark on recording text (titles, the opening line) when it isn't the page's. */
const langOf = (book: PlayableBook, locale: Locale) =>
  book.locale !== locale ? book.locale : undefined;

/**
 * The open book, directly under the hero: the h2 and the editions, then one
 * spread. The verso sets the chapter's opening line large beside the controls;
 * the recto is the contents, with the ribbon at the current chapter.
 */
export function AudiobookPlayer({
  section,
  media,
  ctx,
  path,
}: {
  section: RenderedSection<"audiobook_player">;
  media: MediaMap;
  ctx: SectionContext;
  /** The page path, so the docked player can bring the reader back here. */
  path: string;
}) {
  const books = useMemo(() => sectionBooks(section, media, path), [section, media, path]);
  if (books.length === 0) return null;
  return <OpenBook section={section} ctx={ctx} books={books} />;
}

function OpenBook({
  section,
  ctx,
  books,
}: {
  section: RenderedSection<"audiobook_player">;
  ctx: SectionContext;
  books: PlayableBook[];
}) {
  const t = useT();
  const p = t.sections.player;
  const { locale } = ctx;
  const actions = useAudioActions();
  const book = useSelectedBook(books) ?? books[0];
  const anchor = section.settings.anchor || "listen";
  const props = section.props;
  const title = props.title.trim();
  // The section's text may be English on a Greek page; the player's own words never are.
  const textLang = (key: string) =>
    section.lang !== locale ? section.lang : keyLang(section, key);

  // The docked player steps aside while the spread is on screen.
  const spreadRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const node = spreadRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => actions.setSpread(onScreen, book.id), [actions, onScreen, book.id]);
  useEffect(() => () => actions.setSpread(false, null), [actions]);

  return (
    <SectionShell
      // Always peach-wide and evenly spaced; the section's language goes on its own text only.
      section={{
        ...section,
        lang: locale,
        settings: { ...section.settings, width: "default", spacing: "default" },
      }}
      ctx={ctx}
      className="listen-band"
      defaultAnchor="listen"
      labelled
    >
      <div className="player-head grid-12">
        <div className="player-title">
          <SectionHeading ctx={ctx} lang={title ? textLang("title") : undefined}>
            {title || p.title}
          </SectionHeading>
          {props.intro && (
            <p className="lead" lang={textLang("intro")}>
              {nb(props.intro)}
            </p>
          )}
        </div>
        <div className="player-editions">
          <Editions books={books} selected={book} name={`${section.id}-edition`} locale={locale} />
          {section.data?.onlyOtherLanguage && locale === "el" && (
            <p className="meta player-note">{p.greekComing}</p>
          )}
        </div>
      </div>

      <div className="book-spread" role="region" aria-label={p.region} ref={spreadRef}>
        <Verso book={book} anchor={anchor} locale={locale} />
        <Recto book={book} id={section.id} locale={locale} />
      </div>
    </SectionShell>
  );
}

/**
 * A native radio group, so arrow keys work without script. Selected shows as
 * text colour and a check; a returning listener's edition says where they are.
 */
function Editions({
  books,
  selected,
  name,
  locale,
}: {
  books: PlayableBook[];
  selected: PlayableBook;
  name: string;
  locale: Locale;
}) {
  const t = useT();
  const p = t.sections.player;
  const actions = useAudioActions();
  // Where the reader is in the selected edition, to the minute.
  const progress = useAudioState((s) => {
    const view = editionView(s, selected);
    const left = bookSeconds(selected) - bookSeconds(selected, view.index) - view.position;
    return view.returning ? { chapter: view.index + 1, left: Math.round(left / 60) * 60 } : null;
  });

  const meta = (book: PlayableBook) => {
    const items: string[] = [];
    // On /el every edition says its language; on English pages only another language does.
    if (locale === "el" || book.locale !== "en") items.push(p.edition[book.locale]);
    if (book.id === selected.id && progress) {
      items.push(fmt(p.chapterShort, { n: progress.chapter }));
      items.push(fmt(p.timeLeft, { time: hoursMinutes(progress.left, p) }));
    } else {
      items.push(plural(p.chapters, book.tracks.length, locale));
      const seconds = bookSeconds(book);
      if (seconds > 0) items.push(hoursMinutes(seconds, p));
    }
    return items;
  };

  const body = (book: PlayableBook) => (
    <>
      {book.coverSrc ? (
        <img
          src={book.coverSrc}
          srcSet={book.coverSrcSet ?? undefined}
          sizes="36px"
          width={36}
          height={48}
          alt=""
          loading="lazy"
        />
      ) : (
        <span />
      )}
      <span>
        <span className="edition-title" lang={langOf(book, locale)}>
          {book.title}
        </span>
        <span className="dots meta edition-meta">
          {meta(book).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </span>
      </span>
    </>
  );

  if (books.length === 1) {
    return (
      <div className="editions">
        <div className="edition edition--single">{body(books[0])}</div>
      </div>
    );
  }
  return (
    <fieldset className="editions">
      <legend className="sr-only">{p.editionsLegend}</legend>
      {books.map((book) => (
        <label key={book.id} className="edition">
          <input
            type="radio"
            name={name}
            value={book.id}
            checked={book.id === selected.id}
            onChange={() => actions.selectEdition(locale, book.id)}
          />
          {body(book)}
          <Icon name="check" className="i tick" />
        </label>
      ))}
    </fieldset>
  );
}

/** The left page: status, speed, the chapter, its opening line, the scrubber and the transport. */
function Verso({ book, anchor, locale }: { book: PlayableBook; anchor: string; locale: Locale }) {
  const t = useT();
  const p = t.sections.player;
  const actions = useAudioActions();
  const v = useAudioState((s) => {
    const view = editionView(s, book);
    const live = view.loaded;
    return {
      ...view,
      hydrated: s.hydrated,
      started: live && s.started,
      requested: live && s.requested,
      playing: live && s.playing,
      buffering: live && s.buffering,
      error: live && s.error,
    };
  });
  const track = book.tracks[v.index];
  const total = book.tracks.length;
  const contentLang = langOf(book, locale);
  const max = Math.max(1, Math.round(v.duration));
  const percent = v.duration ? Math.min(100, (v.position / v.duration) * 100) : 0;

  // One polite message when the chapter or the edition changes, never on load.
  const [announcement, setAnnouncement] = useState("");
  const shown = useRef<string | null>(null);
  const key = `${book.id}:${v.index}`;
  useEffect(() => {
    if (!v.hydrated) return;
    if (shown.current !== null && shown.current !== key) {
      const values = { n: v.index + 1, total, title: track.title, book: book.title };
      setAnnouncement(fmt(v.requested ? p.announce : p.announceSelected, values));
    }
    shown.current = key;
  }, [v.hydrated, v.index, v.requested, key, total, track.title, book.title, p]);

  // While sound is on its way (asked for, not yet playing, not yet 400ms late), the
  // status keeps what it said: no "Paused" between chapters, no flash of "Buffering…".
  const settled: Status | null = v.buffering
    ? "buffering"
    : v.playing
      ? "playing"
      : v.requested
        ? null
        : v.loaded && v.started
          ? "paused"
          : "ready";
  const [lastStatus, setLastStatus] = useState<Status>("ready");
  if (settled && settled !== lastStatus) setLastStatus(settled);
  const status = p[settled ?? lastStatus];

  const play = () => {
    actions.selectEdition(locale, book.id);
    actions.playPause(book, v.index);
  };
  const onScrubKey = (event: KeyboardEvent<HTMLInputElement>) => {
    const delta = SEEK_KEYS[event.key];
    if (delta !== undefined) actions.skip(book, v.index, delta);
    else if (event.key === "Home") actions.seek(book, v.index, 0);
    else if (event.key === "End") actions.seek(book, v.index, v.duration);
    else return;
    event.preventDefault();
  };
  const prev = neighbour(book, v.index, -1);
  const next = neighbour(book, v.index, 1);

  return (
    <div className="verso">
      <div className="page-head">
        {v.error ? (
          <p className="status status--error meta">
            <Icon name="alert" />
            <span>{p.loadError}</span>
            <button className="retry" type="button" onClick={actions.retry}>
              {p.retry}
            </button>
          </p>
        ) : (
          <p className="status meta">
            <Icon name="headphones" />
            <span>{status}</span>
          </p>
        )}
        <button className="speed" type="button" onClick={() => actions.cycleRate(book)}>
          <span className="sr-only">{p.speedLabel}</span>
          {rateLabel(v.rate, locale)}
        </button>
      </div>
      <p className="meta chapter-of">{fmt(p.chapterOf, { n: v.index + 1, total })}</p>
      <h3 className="title chapter-title" lang={contentLang}>
        {track.title}
      </h3>
      {track.openingLine && (
        <p className="opening" lang={contentLang}>
          {track.openingLine}
        </p>
      )}
      <div className="scrub">
        <div className="scrub-track">
          <div className="scrub-fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="scrub-thumb" style={{ left: `${percent}%` }} />
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={Math.min(max, Math.round(v.position))}
          disabled={!track.src}
          aria-label={p.position}
          aria-valuetext={fmt(p.positionOf, {
            elapsed: formatTime(v.position),
            total: formatTime(v.duration),
          })}
          onChange={(event) => actions.seek(book, v.index, Number(event.currentTarget.value))}
          onKeyDown={onScrubKey}
        />
      </div>
      <div className="times meta" aria-hidden="true">
        <span>{formatTime(v.position)}</span>
        <span>{formatTime(v.duration)}</span>
      </div>
      <div className="transport">
        {/* aria-disabled, not disabled: focus stays put when the first or last chapter is reached */}
        <button
          className="ctl"
          type="button"
          aria-label={p.previous}
          aria-disabled={prev < 0 || undefined}
          onClick={() => prev >= 0 && actions.step(book, v.index, -1)}
        >
          <Icon name="prev" />
        </button>
        <button
          className="ctl"
          type="button"
          aria-label={p.back15}
          onClick={() => actions.skip(book, v.index, -15)}
        >
          <Icon name="back" className="i skip-arc" />
          <span className="skip-n" aria-hidden="true">
            15
          </span>
        </button>
        <button
          className="play"
          type="button"
          id={`${anchor}-play`}
          data-play=""
          aria-label={v.playing ? p.pause : p.play}
          disabled={!track.src}
          onClick={play}
        >
          <Icon name={v.playing ? "pause" : "play"} className={v.playing ? "i" : "i i-play"} />
        </button>
        <button
          className="ctl"
          type="button"
          aria-label={p.forward30}
          onClick={() => actions.skip(book, v.index, 30)}
        >
          <Icon name="fwd" className="i skip-arc" />
          <span className="skip-n" aria-hidden="true">
            30
          </span>
        </button>
        <button
          className="ctl"
          type="button"
          aria-label={p.next}
          aria-disabled={next < 0 || undefined}
          onClick={() => next >= 0 && actions.step(book, v.index, 1)}
        >
          <Icon name="next" />
        </button>
      </div>
      <p className="sr-only" role="status">
        {announcement}
      </p>
    </div>
  );
}

/**
 * The right page: the contents, one 56px button per chapter. The number hangs
 * on the title's first line; the dotted leader and the duration sit on its
 * last. Phones and tablets show four chapters around the current one.
 */
function Recto({ book, id, locale }: { book: PlayableBook; id: string; locale: Locale }) {
  const t = useT();
  const p = t.sections.player;
  const actions = useAudioActions();
  const [expanded, setExpanded] = useState(false);
  const v = useAudioState((s) => {
    const view = editionView(s, book);
    return { index: view.index, played: view.played };
  });
  const count = book.tracks.length;
  const start = Math.min(Math.max(v.index - 1, 0), Math.max(0, count - WINDOW));
  const titleLang = langOf(book, locale);
  const byAuthor = !book.narrator || /anastasia patience/i.test(book.narrator);

  return (
    <section className="recto toc" aria-labelledby={`${id}-toc`}>
      <div className="toc-head">
        <h3 id={`${id}-toc`} className="title">
          {p.contents}
        </h3>
        <p className="meta">
          {byAuthor ? p.readByAuthor : fmt(p.readByName, { narrator: book.narrator })}
        </p>
      </div>
      <ol id={`${id}-chapters`}>
        {book.tracks.map((track, i) => {
          const current = i === v.index;
          const hidden = !expanded && (i < start || i >= start + WINDOW);
          const played = v.played.includes(track.id);
          const seconds = track.durationSeconds ?? 0;
          const spoken = seconds ? `, ${spokenDuration(seconds, p, locale)}` : "";
          const inner = (
            <>
              <span className="t">
                <span className="n" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span lang={titleLang}>{track.title}</span>
                {current && <span className="sr-only">{p.rowCurrent}</span>}
              </span>
              <span className="d" aria-hidden="true">
                {track.src ? played && <Icon name="check" /> : <Icon name="lock" />}
                {seconds ? formatTime(seconds) : ""}
              </span>
            </>
          );
          return (
            <li
              key={track.id}
              className={
                [current && "is-current", hidden && "is-window-hidden"].filter(Boolean).join(" ") ||
                undefined
              }
            >
              {current && <span className="ribbon-tab" aria-hidden="true" />}
              {track.src ? (
                <button
                  className="toc-row"
                  type="button"
                  aria-current={current ? "true" : undefined}
                  onClick={() => {
                    actions.selectEdition(locale, book.id);
                    actions.playChapter(book, i);
                  }}
                >
                  <span className="sr-only">{fmt(p.rowPlay, { n: i + 1 })}</span>
                  {inner}
                  <span className="sr-only">
                    {spoken}
                    {played ? p.rowPlayed : ""}
                  </span>
                </button>
              ) : (
                // Not free to stream: the row leads to where the full audiobook is sold.
                <SiteLink className="toc-row toc-row--locked" href={book.bookHref}>
                  <span className="sr-only">{fmt(p.rowLocked, { n: i + 1 })}</span>
                  {inner}
                  <span className="sr-only">
                    {spoken}
                    {p.rowLockedNote}
                  </span>
                </SiteLink>
              )}
            </li>
          );
        })}
      </ol>
      {count > WINDOW && (
        <div className="toc-more">
          <button
            className="btn btn-quiet btn-sm"
            type="button"
            aria-expanded={expanded}
            aria-controls={`${id}-chapters`}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? p.showFewer : fmt(p.showAll, { n: count })}
            <Icon name={expanded ? "chev-up" : "chev-down"} />
          </button>
        </div>
      )}
    </section>
  );
}
