import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/site/Icon";
import { useT } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import type { MediaMap, RenderedSection, VideoCard } from "@/sections/types";
import { formatTime } from "@/components/audio/AudioProvider";
import { Picture } from "../render/Picture";
import { FootLink, keyLang, SectionShell, type SectionContext } from "../render/SectionShell";

type Props<T extends RenderedSection["type"]> = {
  section: RenderedSection<T>;
  media: MediaMap;
  ctx: SectionContext;
};

/**
 * A click-to-play facade. Nothing loads from the provider until the reader
 * presses play; then the iframe replaces the poster and starts at once.
 */
function Facade({
  src,
  title,
  poster,
  duration,
  playLabel,
  note,
  ratio = "16 / 9",
}: {
  src: string;
  title: string;
  poster: ReactNode;
  duration?: number | null;
  playLabel: string;
  note: string;
  ratio?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (playing) frame.current?.focus();
  }, [playing]);

  return (
    <div className="frame facade" style={{ aspectRatio: ratio }}>
      {playing ? (
        <iframe
          ref={frame}
          src={src}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button
          type="button"
          className="facade-btn"
          onClick={() => setPlaying(true)}
          aria-label={playLabel}
        >
          {poster}
          <span className="play-badge" aria-hidden="true">
            <Icon name="play" />
          </span>
          {duration ? <span className="dur">{formatTime(duration)}</span> : null}
          <span className="facade-note">{note}</span>
        </button>
      )}
    </div>
  );
}

function youtubeSrc(id: string) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1`;
}

function VideoPoster({
  video,
  media,
  sizes,
}: {
  video: VideoCard;
  media: MediaMap;
  sizes: string;
}) {
  const image = video.thumbnailMediaId ? media[video.thumbnailMediaId] : undefined;
  return image ? (
    <Picture media={image} sizes={sizes} decorative />
  ) : (
    <span className="poster-blank" aria-hidden="true">
      <Icon name="play" />
    </span>
  );
}

/** The latest film large, the rest as a strip; choosing one plays it in the large frame. */
export function Video({ section, media, ctx }: Props<"video">) {
  const t = useT();
  const p = section.props;
  const videos = section.data?.videos ?? [];
  const [current, setCurrent] = useState(0);
  const [autoplayKey, setAutoplayKey] = useState(0);
  if (videos.length === 0) return null;
  const video = videos[current] ?? videos[0];
  const link = p.channelLink.href
    ? {
        label: p.channelLink.label || t.sections.video.channel,
        href: p.channelLink.href,
        external: true,
      }
    : null;
  const others = videos.map((v, i) => ({ v, i })).filter(({ i }) => i !== current);

  return (
    <SectionShell
      section={section}
      ctx={ctx}
      labelled={!!p.title}
      label={p.eyebrow || video.title}
      runhead={{ link }}
    >
      {p.title && (
        <div className="head">
          <h2 id={ctx.headingId} className="display-l" lang={keyLang(section, "title")}>
            {p.title}
          </h2>
        </div>
      )}
      <div
        className={`film${section.variant === "single" || others.length === 0 ? " film--single" : ""}`}
      >
        <Facade
          key={`${video.id}:${autoplayKey}`}
          src={youtubeSrc(video.youtubeId)}
          title={video.title}
          poster={
            <VideoPoster video={video} media={media} sizes="(min-width: 1024px) 60vw, 100vw" />
          }
          duration={video.durationSeconds}
          playLabel={fmt(t.sections.video.play, { title: video.title })}
          note={t.sections.video.note}
        />
        <div className="film-cap" lang={video.textLang !== ctx.locale ? video.textLang : undefined}>
          <h3 className="display-m">{video.title}</h3>
          {video.description && <p className="body">{firstParagraph(video.description)}</p>}
        </div>
        {section.variant !== "single" && others.length > 0 && (
          <ol className="strip" aria-label={p.eyebrow || t.sections.video.channel}>
            {others.slice(0, 4).map(({ v, i }) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrent(i);
                    setAutoplayKey((k) => k + 1);
                  }}
                >
                  <span className="frame">
                    <VideoPoster video={v} media={media} sizes="(min-width: 1024px) 15vw, 45vw" />
                    {v.durationSeconds ? (
                      <span className="dur">{formatTime(v.durationSeconds)}</span>
                    ) : null}
                  </span>
                  <span
                    className="strip-title"
                    lang={v.textLang !== ctx.locale ? v.textLang : undefined}
                  >
                    {v.title}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
      <FootLink link={link} />
    </SectionShell>
  );
}

function firstParagraph(text: string) {
  const first = text.split(/\n\s*\n/)[0] ?? "";
  return first.length > 280 ? `${first.slice(0, 277).trimEnd()}…` : first;
}

const PROVIDERS = {
  youtube: { name: "YouTube", src: youtubeSrc, ratio: "16 / 9" },
  vimeo: {
    name: "Vimeo",
    src: (id: string) =>
      `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1&dnt=1`,
    ratio: "16 / 9",
  },
  spotify: {
    name: "Spotify",
    src: (id: string) => `https://open.spotify.com/embed/${id.replace(/^\/+/, "")}`,
    ratio: "16 / 7",
  },
  google_maps: {
    name: "Google Maps",
    src: (id: string) => `https://www.google.com/maps/embed?pb=${encodeURIComponent(id)}`,
    ratio: "4 / 3",
  },
} as const;

export function Embed({ section, media, ctx }: Props<"embed">) {
  const t = useT();
  const p = section.props;
  const provider = PROVIDERS[p.provider];
  const poster = p.posterMediaId ? media[p.posterMediaId] : undefined;
  const title = p.title || provider.name;
  return (
    <SectionShell section={section} ctx={ctx} labelled={!!p.title} label={title}>
      {p.title && (
        <div className="head">
          <h2 id={ctx.headingId} className="display-m" lang={keyLang(section, "title")}>
            {p.title}
          </h2>
        </div>
      )}
      <Facade
        src={provider.src(p.externalId)}
        title={title}
        ratio={provider.ratio}
        poster={
          poster ? (
            <Picture media={poster} sizes="(min-width: 1024px) 70vw, 100vw" decorative />
          ) : (
            <span className="poster-blank" aria-hidden="true">
              <Icon name={p.provider === "google_maps" ? "pin" : "play"} />
            </span>
          )
        }
        playLabel={
          p.provider === "google_maps"
            ? t.sections.embed.map
            : fmt(t.sections.embed.play, { title })
        }
        note={fmt(t.sections.embed.note, { provider: provider.name })}
      />
    </SectionShell>
  );
}

/** Plates: a grid, masonry, carousel or film strip, opening into a keyboard lightbox. */
export function Gallery({ section, media, ctx }: Props<"gallery">) {
  const t = useT();
  const p = section.props;
  const images = (section.data?.imageMediaIds ?? [])
    .map((id) => media[id])
    .filter((m) => m?.kind === "image");
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open !== null && !el.open) el.showModal();
    if (open === null && el.open) el.close();
  }, [open]);

  if (images.length === 0) return null;
  const total = images.length;
  const go = (delta: number) => setOpen((i) => (i === null ? i : (i + delta + total) % total));
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") go(1);
    else if (event.key === "ArrowLeft") go(-1);
  };
  const shown = open !== null ? images[open] : undefined;
  const sizes =
    section.variant === "filmstrip" || section.variant === "carousel"
      ? "(min-width: 1024px) 30vw, 75vw"
      : "(min-width: 1024px) 25vw, 50vw";

  return (
    <SectionShell
      section={section}
      ctx={ctx}
      labelled={!!p.title}
      label={p.eyebrow || t.sections.gallery.dialog}
    >
      {p.title && (
        <div className="head">
          <h2 id={ctx.headingId} className="display-l" lang={keyLang(section, "title")}>
            {p.title}
          </h2>
        </div>
      )}
      <ul className={`plates plates--${section.variant}`}>
        {images.map((image, index) => (
          <li key={image!.id}>
            <button
              type="button"
              className="plate"
              aria-label={image!.alt || fmt(t.sections.gallery.open, { n: index + 1, total })}
              onClick={(event) => {
                opener.current = event.currentTarget;
                setOpen(index);
              }}
            >
              <Picture media={image} sizes={sizes} decorative />
            </button>
            {image!.caption && section.variant !== "masonry" && (
              <p
                className="plate-cap meta"
                lang={image!.textLang !== ctx.locale ? image!.textLang : undefined}
              >
                {image!.caption}
              </p>
            )}
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        className="lightbox"
        aria-label={t.sections.gallery.dialog}
        onClose={() => {
          setOpen(null);
          opener.current?.focus();
        }}
        onKeyDown={onKey}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(null);
        }}
      >
        {shown && (
          <figure>
            <img
              src={shown.src}
              srcSet={shown.srcSet ?? undefined}
              sizes="100vw"
              alt={shown.alt}
              width={shown.width ?? undefined}
              height={shown.height ?? undefined}
            />
            <figcaption>
              <span className="meta">
                {fmt(t.sections.gallery.counter, { n: (open ?? 0) + 1, total })}
              </span>
              {shown.caption && <span>{shown.caption}</span>}
              {shown.credit && <span className="meta">© {shown.credit}</span>}
            </figcaption>
          </figure>
        )}
        <div className="lightbox-ctl">
          {total > 1 && (
            <>
              <button
                type="button"
                className="ctl"
                aria-label={t.sections.gallery.previous}
                onClick={() => go(-1)}
              >
                <Icon name="chev-left" />
              </button>
              <button
                type="button"
                className="ctl"
                aria-label={t.sections.gallery.next}
                onClick={() => go(1)}
              >
                <Icon name="chev-right" />
              </button>
            </>
          )}
          <button
            type="button"
            className="ctl"
            aria-label={t.sections.gallery.close}
            onClick={() => setOpen(null)}
          >
            <Icon name="close" />
          </button>
        </div>
      </dialog>
    </SectionShell>
  );
}
