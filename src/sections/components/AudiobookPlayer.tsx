import { caps } from "@/lib/i18n/caps";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { formatTime, useAudio, type PlayableBook } from "@/components/audio/AudioProvider";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import { useT } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import type { AudiobookItem, MediaMap, RenderedSection } from "@/sections/types";
import { keyLang, SectionShell, type SectionContext } from "../render/SectionShell";

/** Chapters shown around the current one on phones before "Show all". */
const WINDOW = 2;

function toPlayable(item: AudiobookItem, media: MediaMap, playerHref: string): PlayableBook {
  const cover = item.coverMediaId ? media[item.coverMediaId] : undefined;
  return {
    id: item.id,
    title: item.title,
    narrator: item.narrator,
    coverSrc: cover?.src ?? null,
    playerHref,
    tracks: item.tracks.map((track) => {
      const audio = track.audioMediaId ? media[track.audioMediaId] : undefined;
      return {
        id: track.id,
        title: track.title,
        src: audio?.src ?? null,
        mime: audio?.mime ?? "audio/mpeg",
        durationSeconds: track.durationSeconds ?? audio?.durationSeconds ?? null,
      };
    }),
  };
}

function hoursMinutes(seconds: number, t: ReturnType<typeof useT>): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h ? fmt(t.sections.player.hoursMinutes, { h, m }) : fmt(t.sections.player.minutes, { m });
}

/** The Contents page: choose a book and a chapter, and listen in her own voice. */
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
  const t = useT();
  const audio = useAudio();
  const anchor = section.settings.anchor || "listen";
  const items = section.data?.audiobooks;
  const shelf = useMemo(
    () => (section.variant === "shelf" ? (items ?? []) : (items ?? []).slice(0, 1)),
    [items, section.variant],
  );
  const books = useMemo(
    () => shelf.map((item) => toPlayable(item, media, `${path}#${anchor}`)),
    [shelf, media, path, anchor],
  );
  const [selected, setSelected] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const tocRef = useRef<HTMLOListElement>(null);

  // While the full player is on screen, the docked player stays out of the way.
  const { setPlayerVisible } = audio;
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setPlayerVisible(entry.isIntersecting), {
      threshold: 0.15,
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      setPlayerVisible(false);
    };
  }, [setPlayerVisible]);

  // If a book from this shelf is already playing, show it.
  const playingHere = books.findIndex((b) => b.id === audio.book?.id);
  useEffect(() => {
    if (playingHere >= 0) setSelected(playingHere);
  }, [playingHere]);

  const book = books[selected];
  const bookId = book?.id;
  // Where this reader stopped last time (read after hydration: it lives in this browser only).
  const [resume, setResume] = useState<{ trackId: string; position: number } | null>(null);
  const { lastTrack } = audio;
  useEffect(() => {
    setResume(bookId ? lastTrack(bookId) : null);
  }, [bookId, lastTrack]);

  if (!book || books.length === 0) return null;
  const item = shelf[selected];
  const isLoaded = audio.book?.id === book.id;
  const resumeIndex = resume ? book.tracks.findIndex((tr) => tr.id === resume.trackId) : -1;
  const firstPlayable = Math.max(
    0,
    book.tracks.findIndex((tr) => tr.src),
  );
  const index = isLoaded ? audio.index : resumeIndex >= 0 ? resumeIndex : firstPlayable;
  const track = book.tracks[index];
  const position = isLoaded
    ? audio.position
    : resumeIndex === index && resume
      ? resume.position
      : 0;
  const duration = (isLoaded && audio.duration) || track?.durationSeconds || 0;
  const total = book.tracks.reduce((sum, tr) => sum + (tr.durationSeconds ?? 0), 0);
  const before = book.tracks
    .slice(0, index)
    .reduce((sum, tr) => sum + (tr.durationSeconds ?? 0), 0);
  const left = Math.max(0, total - before - position);
  const playing = isLoaded && audio.playing;
  const percent = duration ? Math.min(100, (position / duration) * 100) : 0;
  const status = playing
    ? t.sections.player.nowPlaying
    : position > 5
      ? t.sections.player.continue
      : t.sections.player.ready;

  const play = (i: number) => {
    if (!book.tracks[i]?.src) return;
    if (isLoaded && audio.index === i) audio.toggle();
    else audio.load(book, i, true);
  };
  const control = (fn: () => void) => () => {
    if (!isLoaded && track?.src) audio.load(book, index, false);
    fn();
  };

  const p = section.props;
  const greekFallback = section.data?.fallbackToEnglish ?? false;

  return (
    <SectionShell
      section={section}
      ctx={{ ...ctx, numeral: "§" }}
      className="listen-band"
      defaultAnchor="listen"
      runhead={{
        meta:
          books.length > 1
            ? fmt(t.sections.player.booksMeta, { n: books.length })
            : fmt(t.sections.player.chaptersMeta, { n: book.tracks.length }),
      }}
    >
      <div ref={sectionRef}>
        {(p.title || p.intro) && (
          <div className="head head--row">
            {p.title && (
              <h2 id={ctx.headingId} className="display-l" lang={keyLang(section, "title")}>
                {p.title}
              </h2>
            )}
            {p.intro && (
              <p className="lead" lang={keyLang(section, "intro")}>
                {p.intro}
              </p>
            )}
          </div>
        )}
        {greekFallback && <p className="player-note meta">{t.sections.player.greekComing}</p>}

        <div className="player" role="region" aria-label={t.sections.player.region}>
          <div className="np">
            {books.length > 1 && (
              <div className="editions" role="tablist" aria-label={t.sections.player.region}>
                {books.map((b, i) => {
                  const cover = shelf[i].coverMediaId ? media[shelf[i].coverMediaId!] : undefined;
                  const seconds = b.tracks.reduce((sum, tr) => sum + (tr.durationSeconds ?? 0), 0);
                  return (
                    <button
                      key={b.id}
                      className="edition"
                      role="tab"
                      type="button"
                      aria-selected={i === selected}
                      tabIndex={i === selected ? 0 : -1}
                      lang={shelf[i].locale !== ctx.locale ? shelf[i].locale : undefined}
                      onClick={() => setSelected(i)}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                          setSelected((selected + 1) % books.length);
                        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                          setSelected((selected - 1 + books.length) % books.length);
                        }
                      }}
                    >
                      {cover ? <img src={cover.src} width={44} height={59} alt="" /> : <span />}
                      <span>
                        <span className="edition-title">{b.title}</span>
                        <span className="edition-meta meta">
                          {fmt(t.sections.player.chaptersMeta, { n: b.tracks.length })}
                          {seconds > 0 && ` · ${hoursMinutes(seconds, t)}`}
                        </span>
                      </span>
                      <Icon name="check" className="i tick" />
                    </button>
                  );
                })}
              </div>
            )}

            <div className="now" lang={item.locale !== ctx.locale ? item.locale : undefined}>
              <div className="now-top">
                <p className="now-where">
                  <span className="label label--accent">
                    <Icon name="headphones" />
                    <span>{caps(status)}</span>
                  </span>
                  <span className="meta">
                    {fmt(t.sections.player.chapterOf, { n: index + 1, total: book.tracks.length })}
                  </span>
                </p>
                <button
                  className="speed"
                  type="button"
                  onClick={audio.cycleRate}
                  aria-label={fmt(t.sections.player.speed, { rate: audio.rate.toFixed(2) })}
                >
                  {audio.rate.toFixed(audio.rate % 1 ? 2 : 1).replace(/0$/, "")}×
                </button>
              </div>
              <h3 className="display-m now-title" aria-live="polite">
                {track?.title}
              </h3>
              <p className="now-by">
                {book.narrator
                  ? fmt(t.sections.player.readBy, { title: book.title, narrator: book.narrator })
                  : book.title}
              </p>
              <div className="scrub">
                <div className="scrub-track">
                  <div className="scrub-fill" style={{ width: `${percent}%` }} />
                </div>
                <div className="scrub-thumb" style={{ left: `${percent}%` }} />
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, Math.round(duration))}
                  step={5}
                  value={Math.round(position)}
                  disabled={!track?.src}
                  aria-label={t.sections.player.position}
                  aria-valuetext={`${formatTime(position)} / ${formatTime(duration)}`}
                  onChange={(event) => {
                    if (!isLoaded) audio.load(book, index, false);
                    audio.seek(Number(event.currentTarget.value));
                  }}
                />
              </div>
              <div className="times meta">
                <span>{formatTime(position)}</span>
                <span>−{formatTime(Math.max(0, duration - position))}</span>
              </div>
              <div className="transport">
                <button
                  className="ctl"
                  type="button"
                  aria-label={t.sections.player.previous}
                  onClick={control(() => audio.step(-1))}
                  disabled={index === 0}
                >
                  <Icon name="prev" />
                </button>
                <button
                  className="ctl"
                  type="button"
                  aria-label={t.sections.player.back15}
                  onClick={control(() => audio.skip(-15))}
                >
                  <Icon name="back" className="i skip-arc" />
                  <span className="skip-n" aria-hidden="true">
                    15
                  </span>
                </button>
                <button
                  className="play"
                  type="button"
                  aria-label={playing ? t.sections.player.pause : t.sections.player.play}
                  onClick={() => play(index)}
                  disabled={!track?.src}
                >
                  <Icon name={playing ? "pause" : "play"} />
                </button>
                <button
                  className="ctl"
                  type="button"
                  aria-label={t.sections.player.forward30}
                  onClick={control(() => audio.skip(30))}
                >
                  <Icon name="fwd" className="i skip-arc" />
                  <span className="skip-n" aria-hidden="true">
                    30
                  </span>
                </button>
                <button
                  className="ctl"
                  type="button"
                  aria-label={t.sections.player.next}
                  onClick={control(() => audio.step(1))}
                  disabled={index >= book.tracks.length - 1}
                >
                  <Icon name="next" />
                </button>
              </div>
              <div className="progress">
                <div
                  className="segs"
                  style={{ "--segs": book.tracks.length } as CSSProperties}
                  role="img"
                  aria-label={fmt(t.sections.player.bookProgress, {
                    n: index,
                    total: book.tracks.length,
                  })}
                >
                  {book.tracks.map((tr, i) => (
                    <i key={tr.id} className={i < index ? "done" : undefined}>
                      {i === index && <b style={{ width: `${percent}%` }} />}
                    </i>
                  ))}
                </div>
                <p className="progress-meta meta">
                  {total > 0 && (
                    <span>{fmt(t.sections.player.left, { time: hoursMinutes(left, t) })}</span>
                  )}
                  <span>{t.sections.player.resumes}</span>
                </p>
              </div>
            </div>
          </div>

          <nav
            className="toc"
            aria-label={t.sections.player.contents}
            style={{ "--current": index } as CSSProperties}
            lang={item.locale !== ctx.locale ? item.locale : undefined}
          >
            <span className="ribbon" aria-hidden="true" />
            <div className="toc-head">
              <p className="label">{caps(t.sections.player.contents)}</p>
              <p className="meta">
                {fmt(t.sections.player.chaptersMeta, { n: book.tracks.length })}
              </p>
            </div>
            <ol ref={tocRef}>
              {book.tracks.map((tr, i) => {
                const hidden = !showAll && Math.abs(i - index) > WINDOW;
                const current = i === index;
                const className = [current ? "is-current" : "", hidden ? "is-window-hidden" : ""]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <li key={tr.id} className={className || undefined}>
                    {tr.src ? (
                      <a
                        href={`#${anchor}`}
                        aria-current={current ? "true" : undefined}
                        onClick={(event) => {
                          event.preventDefault();
                          play(i);
                        }}
                      >
                        <span className="n">{String(i + 1).padStart(2, "0")}</span>
                        <span className="t">
                          {tr.title}
                          {current && playing && (
                            <span className="sr-only"> ({t.sections.player.nowPlaying})</span>
                          )}
                        </span>
                        <span className="leader" aria-hidden="true" />
                        {i < index && (
                          <>
                            <Icon name="check" className="i played-ic" />
                            <span className="sr-only">{t.sections.player.played}</span>
                          </>
                        )}
                        <span className="d">
                          {tr.durationSeconds ? formatTime(tr.durationSeconds) : ""}
                        </span>
                      </a>
                    ) : (
                      <SiteLink
                        href={item.bookSlug ? `/books/${item.bookSlug}` : "/books"}
                        className="toc-locked"
                      >
                        <span className="n">{String(i + 1).padStart(2, "0")}</span>
                        <span className="t">{tr.title}</span>
                        <span className="leader" aria-hidden="true" />
                        <Icon name="lock" className="i played-ic" />
                        <span className="sr-only">{t.sections.player.locked}</span>
                        <span className="d">
                          {tr.durationSeconds ? formatTime(tr.durationSeconds) : ""}
                        </span>
                      </SiteLink>
                    )}
                  </li>
                );
              })}
            </ol>
            {!showAll && book.tracks.length > WINDOW * 2 + 1 && (
              <div className="toc-more">
                <button
                  className="btn btn-quiet btn-sm"
                  type="button"
                  aria-expanded={false}
                  onClick={() => setShowAll(true)}
                >
                  {fmt(t.sections.player.showAll, { n: book.tracks.length })}
                  <Icon name="chev-down" />
                </button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </SectionShell>
  );
}
