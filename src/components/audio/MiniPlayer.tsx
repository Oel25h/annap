import type { CSSProperties } from "react";
import { useT } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import { formatTime, useAudio } from "./AudioProvider";

/** The slim player docked at the bottom while a chapter plays and the full player is off screen. */
export function MiniPlayer() {
  const t = useT();
  const audio = useAudio();
  const { book, index, playing, position, duration, playerVisible } = audio;
  const track = book?.tracks[index];
  if (!book || !track || playerVisible || (!playing && position < 1)) return null;
  const percent = duration ? Math.min(100, (position / duration) * 100) : 0;
  return (
    <div
      className="mini"
      role="region"
      aria-label={t.sections.player.region}
      style={{ "--mini-progress": `${percent}%` } as CSSProperties}
    >
      {book.coverSrc ? <img src={book.coverSrc} width={32} height={43} alt="" /> : <span />}
      <p className="mini-text">
        <span className="meta">
          {fmt(t.sections.player.chapterShort, { n: index + 1 })} · {formatTime(position)} /{" "}
          {formatTime(duration)}
        </span>
        <strong>{track.title}</strong>
      </p>
      <div className="mini-ctl">
        <button
          className="ctl"
          type="button"
          aria-label={t.sections.player.back15}
          onClick={() => audio.skip(-15)}
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
          onClick={audio.toggle}
        >
          <Icon name={playing ? "pause" : "play"} />
        </button>
        <SiteLink className="ctl" href={book.playerHref} aria-label={t.sections.player.open}>
          <Icon name="arrow-up" />
        </SiteLink>
      </div>
    </div>
  );
}
