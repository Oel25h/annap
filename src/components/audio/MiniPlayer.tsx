import { useState, type CSSProperties, type MouseEvent } from "react";
import { useLocale, useT } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import { openPlayer, useAudioActions, useAudioState } from "./AudioProvider";
import { formatTime } from "./format";
import { miniPlayerShown } from "./store";

/**
 * The player docked at the foot of the window once a chapter has started in
 * this session and the spread is off screen. It sits after the footer, so at
 * the end of the page it comes to rest below the legal row instead of
 * covering it. While it holds focus it stays, so a keyboard user is never
 * dropped onto the page.
 */
export function MiniPlayer() {
  const t = useT();
  const locale = useLocale();
  const actions = useAudioActions();
  const [focused, setFocused] = useState(false);
  const s = useAudioState((state) => ({
    shown: miniPlayerShown(state),
    book: state.book,
    index: state.index,
    position: state.position,
    duration: state.duration,
    playing: state.playing,
    buffering: state.buffering,
  }));
  const track = s.book?.tracks[s.index];
  if (!s.book || !track || !(s.shown || focused)) return null;
  const book = s.book;
  const p = t.sections.player;
  const percent = s.duration ? Math.min(100, (s.position / s.duration) * 100) : 0;
  const anchor = book.playerHref.split("#")[1] ?? "listen";

  // On the player's own page, go to it and put focus on Play; elsewhere, follow the link.
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    if (openPlayer(anchor)) event.preventDefault();
  };

  return (
    <div
      className="mini-player"
      role="region"
      aria-label={p.miniRegion}
      style={{ "--mini-progress": `${percent}%` } as CSSProperties}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div className="wrap mini-inner">
        {book.coverSrc ? <img src={book.coverSrc} width={32} height={43} alt="" /> : <span />}
        <p className="mini-text">
          <span className="dots meta">
            <span>{fmt(p.chapterShort, { n: s.index + 1 })}</span>
            {/* A wait of 400ms or more shows here in place of the time, as on the verso */}
            <span>
              {s.buffering ? p.buffering : `${formatTime(s.position)} / ${formatTime(s.duration)}`}
            </span>
          </span>
          <strong lang={book.locale !== locale ? book.locale : undefined}>{track.title}</strong>
        </p>
        <div className="mini-ctl">
          <button
            className="ctl"
            type="button"
            aria-label={p.back15}
            onClick={() => actions.skip(book, s.index, -15)}
          >
            <Icon name="back" className="i skip-arc" />
            <span className="skip-n" aria-hidden="true">
              15
            </span>
          </button>
          <button
            className="play"
            type="button"
            aria-label={s.playing ? p.pause : p.play}
            onClick={() => actions.playPause(book, s.index)}
          >
            <Icon name={s.playing ? "pause" : "play"} className={s.playing ? "i" : "i i-play"} />
          </button>
          <SiteLink className="ctl" href={book.playerHref} aria-label={p.open} onClick={open}>
            <Icon name="chev-up" />
          </SiteLink>
        </div>
      </div>
    </div>
  );
}
