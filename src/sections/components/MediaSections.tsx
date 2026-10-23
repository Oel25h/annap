import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import { formatTime } from "@/components/audio/format";
import { useT } from "@/lib/i18n/context";
import { fmt, formatDate } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import { nb } from "@/lib/i18n/rag";
import type { MediaMap, RenderedSection, ResolvedMedia, VideoCard } from "@/sections/types";
import { Picture } from "../render/Picture";
import { masonryShapes } from "./masonry";
import { keyLang, SectionShell, type HeadLink, type SectionContext } from "../render/SectionShell";
import { Empty } from "./CollectionSections";

type Props<T extends RenderedSection["type"]> = {
  section: RenderedSection<T>;
  media: MediaMap;
  ctx: SectionContext;
};

const langIf = (lang: Locale, page: Locale) => (lang !== page ? lang : undefined);
/** Headings inside a section sit one level under its own: h3 under an h2, else h2. */
const itemLevel = (ctx: SectionContext, titled: boolean) =>
  titled && ctx.headingLevel === "h2" ? "h3" : "h2";

/** `sizes` for a 16:9 frame on columns 1–8 (837px at 1440). */
const FEATURE_SIZES =
  "(min-width: 1440px) 837px, (min-width: 1024px) 60vw, (min-width: 720px) calc(100vw - 64px), calc(100vw - 32px)";
/** A tile spanning four columns (405px at 1440), two up from 720. */
const TILE_SIZES =
  "(min-width: 1440px) 405px, (min-width: 1024px) 30vw, (min-width: 720px) 45vw, calc(100vw - 32px)";

/**
 * A click-to-play facade: the poster in its frame, a play badge bottom-left
 * and the duration bottom-right, so a face is never covered. Nothing loads
 * from the provider until the reader presses play; then the iframe takes the
 * frame. With `href` it is a link to the video, so without script, or with a
 * modified click, the reader still reaches it.
 */
function Facade({
  src,
  href,
  title,
  lang,
  label,
  poster,
  duration,
  className = "",
  children,
}: {
  src: string;
  href?: string;
  /** The iframe's title once it plays. */
  title: string;
  /** The title's language, when it differs from the page's. */
  lang?: Locale;
  /** The control's accessible name. */
  label: string;
  poster: ReactNode;
  duration?: number | null;
  className?: string;
  /** In place of the play badge (the map's "Show the map"). */
  children?: ReactNode;
}) {
  const [playing, setPlaying] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (playing) frame.current?.focus();
  }, [playing]);

  const inside = (
    <>
      {poster}
      {children ?? (
        <span className="play-badge" aria-hidden="true">
          <Icon name="play" />
        </span>
      )}
      {duration ? (
        <span className="dur" aria-hidden="true">
          {formatTime(duration)}
        </span>
      ) : null}
    </>
  );
  const play = (event: MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setPlaying(true);
  };

  return (
    <div className={["frame", className].filter(Boolean).join(" ")}>
      {playing ? (
        <iframe
          ref={frame}
          src={src}
          title={title}
          lang={lang}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : href ? (
        <a className="facade-btn" href={href} aria-label={label} onClick={play}>
          {inside}
        </a>
      ) : (
        <button type="button" className="facade-btn" aria-label={label} onClick={play}>
          {inside}
        </button>
      )}
    </div>
  );
}

/** The privacy-enhanced player, with captions on, in the page's language (and Greek controls on /el). */
function youtubeSrc(id: string, locale: Locale) {
  const query = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    playsinline: "1",
    cc_load_policy: "1",
    cc_lang_pref: locale,
  });
  if (locale === "el") query.set("hl", "el");
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${query}`;
}

const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;

/** "11 minutes 5 seconds" / «11 λεπτά 5 δευτερόλεπτα», for screen readers. */
function spokenDuration(seconds: number, locale: Locale): string {
  const tag = locale === "el" ? "el-GR" : "en-GB";
  const unit = (n: number, name: "hour" | "minute" | "second") =>
    new Intl.NumberFormat(tag, { style: "unit", unit: name, unitDisplay: "long" }).format(n);
  const s = Math.max(0, Math.round(seconds));
  const parts: string[] = [];
  if (s >= 3600) parts.push(unit(Math.floor(s / 3600), "hour"));
  if (s % 3600 >= 60) parts.push(unit(Math.floor((s % 3600) / 60), "minute"));
  if (s % 60 || parts.length === 0) parts.push(unit(s % 60, "second"));
  return parts.join(" ");
}

/**
 * The caption's one line: the description's first line, or its first sentence
 * when that runs long, without links or hashtags.
 */
function oneLine(text: string): string {
  const first = (text.split(/\n/).find((line) => line.trim()) ?? "")
    .replace(/https?:\/\/\S+|#[\p{L}\p{N}_]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (first.length <= 160) return first;
  const end = first.search(/[.!?…](\s|$)/);
  return end > 0 && end < 160 ? first.slice(0, end + 1) : `${first.slice(0, 157).trimEnd()}…`;
}

function Poster({
  video,
  media,
  sizes,
  priority = false,
}: {
  video: VideoCard;
  media: MediaMap;
  sizes: string;
  /** The feature's poster when the section opens the page: it is the page's largest image. */
  priority?: boolean;
}) {
  const image = video.thumbnailMediaId ? media[video.thumbnailMediaId] : undefined;
  return <Picture media={image} sizes={sizes} priority={priority} decorative />;
}

/** The sr-only end of a row's name, ", 11 minutes 5 seconds, on YouTube"; SiteLink adds "(opens YouTube)". */
function OnYouTube({ video, locale }: { video: VideoCard; locale: Locale }) {
  const t = useT();
  return (
    <span className="sr-only">
      {video.durationSeconds ? `, ${spokenDuration(video.durationSeconds, locale)}` : ""}
      {`, ${t.sections.video.onYouTube}`}
    </span>
  );
}

/**
 * Videos (DESIGN.md §9), on the cocoa band at home.
 * - filmstrip: the newest film in a 16:9 frame on columns 1–8; on 9–12 its caption
 *   ("Latest · 8:42", the title in Display M, one line) and Up next, three rows
 *   that open YouTube. The side column ends with the frame.
 * - single: one film and its caption.
 * - grid (/videos): the filmstrip layout (feature, caption, Up next), then the rest as tiles.
 * Phones: frame, caption, Up next, then the channel link at the foot.
 */
export function Video({ section, media, ctx }: Props<"video">) {
  const t = useT();
  const p = section.props;
  const videos = section.data?.videos ?? [];
  const Item = itemLevel(ctx, !!p.title.trim());
  const href = p.channelLink.href || section.data?.channelUrl || "";
  const link: HeadLink | null = href
    ? {
        label: p.channelLink.label || t.sections.video.channelLink,
        href,
        external: /^https:\/\/([\w-]+\.)?(youtube\.com|youtu\.be)\//i.test(href)
          ? "youtube"
          : /^https:\/\//i.test(href)
            ? "tab"
            : undefined,
        lang: p.channelLink.label ? keyLang(section, "channelLink.label") : undefined,
      }
    : null;
  const duration = (v: VideoCard) => (v.durationSeconds ? formatTime(v.durationSeconds) : "");
  const head = { title: p.title, titleLang: keyLang(section, "title"), link };

  if (videos.length === 0) {
    return (
      <SectionShell section={section} ctx={ctx} head={head} defaultAnchor="videos">
        <Empty text={t.sections.video.empty} />
      </SectionShell>
    );
  }
  const [feature, ...rest] = videos;
  // filmstrip and grid both set the next three beside the feature, so the side
  // column ends with the frame (DESIGN.md §9); grid then tiles the rest.
  const upNext = section.variant === "single" ? [] : rest.slice(0, 3);
  const tiles = section.variant === "grid" ? rest.slice(3) : [];
  const line = oneLine(feature.description);
  const featureLang = langIf(feature.textLang, ctx.locale);

  return (
    <SectionShell section={section} ctx={ctx} head={head} defaultAnchor="videos">
      <div className="film">
        <Facade
          className="film-frame"
          src={youtubeSrc(feature.youtubeId, ctx.locale)}
          href={watchUrl(feature.youtubeId)}
          title={feature.title}
          lang={featureLang}
          label={[fmt(t.sections.video.playOn, { title: feature.title }), duration(feature)]
            .filter(Boolean)
            .join(", ")}
          poster={
            <Poster video={feature} media={media} sizes={FEATURE_SIZES} priority={ctx.isFirst} />
          }
          duration={feature.durationSeconds}
        />
        <div className="film-side">
          <div className="film-cap">
            <p className="meta dots">
              <span>
                {section.variant === "single"
                  ? formatDate(feature.publishedAt, ctx.locale)
                  : t.sections.video.latest}
              </span>
              {duration(feature) && <span>{duration(feature)}</span>}
            </p>
            <Item className="display-m" lang={featureLang}>
              {nb(feature.title)}
            </Item>
            {line && (
              <p className="body" lang={featureLang}>
                {nb(line)}
              </p>
            )}
          </div>
          {upNext.length > 0 && (
            <div>
              <Item className="label upnext-label">{t.sections.video.upNext}</Item>
              <ol className="upnext">
                {upNext.map((v) => (
                  <li key={v.id}>
                    <SiteLink href={watchUrl(v.youtubeId)}>
                      <Poster video={v} media={media} sizes="96px" />
                      <span className="upnext-text">
                        <span className="upnext-title" lang={langIf(v.textLang, ctx.locale)}>
                          {v.title}
                        </span>
                        {v.durationSeconds ? (
                          <span className="meta" aria-hidden="true">
                            {duration(v)}
                          </span>
                        ) : null}
                        <OnYouTube video={v} locale={ctx.locale} />
                      </span>
                    </SiteLink>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
      {tiles.length > 0 && (
        <ul className="tiles video-grid">
          {tiles.map((v) => (
            <li key={v.id}>
              <article className="tile">
                <span className="frame">
                  <Poster video={v} media={media} sizes={TILE_SIZES} />
                  {v.durationSeconds ? (
                    <span className="dur" aria-hidden="true">
                      {duration(v)}
                    </span>
                  ) : null}
                </span>
                <Item className="title">
                  <SiteLink className="tile-link" href={watchUrl(v.youtubeId)}>
                    <span lang={langIf(v.textLang, ctx.locale)}>{v.title}</span>
                    <OnYouTube video={v} locale={ctx.locale} />
                  </SiteLink>
                </Item>
                {v.publishedAt && <p className="meta">{formatDate(v.publishedAt, ctx.locale)}</p>}
              </article>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}

const PROVIDERS = {
  youtube: { name: "YouTube", src: youtubeSrc },
  vimeo: {
    name: "Vimeo",
    src: (id: string) =>
      `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1&dnt=1`,
  },
  spotify: {
    name: "Spotify",
    src: (id: string) => `https://open.spotify.com/embed/${id.replace(/^\/+/, "")}`,
  },
  google_maps: {
    name: "Google Maps",
    src: (id: string) => `https://www.google.com/maps/embed?pb=${encodeURIComponent(id)}`,
  },
} as const;

/**
 * A video, a podcast or a map from another site, behind the same facade, on
 * columns 1–8, with a note under it saying where it loads from.
 */
export function Embed({ section, media, ctx }: Props<"embed">) {
  const t = useT();
  const p = section.props;
  const provider = PROVIDERS[p.provider];
  const poster = p.posterMediaId ? media[p.posterMediaId] : undefined;
  const title = p.title || provider.name;
  const map = p.provider === "google_maps";
  return (
    <SectionShell
      section={section}
      ctx={ctx}
      head={{ title: p.title, titleLang: keyLang(section, "title") }}
    >
      <div className="embed grid-12">
        <div className="embed-player">
          <Facade
            className={`frame--${p.provider.replace("_", "-")}`}
            src={provider.src(p.externalId, ctx.locale)}
            title={title}
            label={map ? t.sections.embed.map : fmt(t.sections.embed.play, { title })}
            poster={<Picture media={poster} sizes={FEATURE_SIZES} decorative />}
          >
            {map ? (
              <span className="frame-cta" aria-hidden="true">
                {t.sections.embed.map}
              </span>
            ) : undefined}
          </Facade>
          <p className="meta facade-note">
            {fmt(t.sections.embed.note, { provider: provider.name })}
          </p>
        </div>
      </div>
    </SectionShell>
  );
}

/** `sizes` for each gallery layout's plates (two up on phones). */
const PLATE_SIZES: Record<string, string> = {
  grid: "(min-width: 1440px) 296px, (min-width: 1024px) 22vw, calc(50vw - 32px)",
  masonry: "(min-width: 1440px) 296px, (min-width: 1024px) 22vw, calc(50vw - 32px)",
  /** A short masonry set sits in three lanes from 1024. */
  masonryShort: "(min-width: 1440px) 405px, (min-width: 1024px) 30vw, calc(50vw - 32px)",
  carousel: "(min-width: 1440px) 624px, (min-width: 1024px) 45vw, (min-width: 720px) 45vw, 86vw",
  filmstrip: "(min-width: 1440px) 296px, (min-width: 1024px) 22vw, (min-width: 720px) 30vw, 62vw",
};

/**
 * Plates on the 12 columns: a grid, a masonry, or a carousel or film strip that
 * scrolls sideways under the reader's hand (never on a timer). Each plate opens
 * a lightbox: ← and → move, Escape closes, and focus goes back to the plate.
 */
export function Gallery({ section, media, ctx }: Props<"gallery">) {
  const t = useT();
  const p = section.props;
  const images = (section.data?.imageMediaIds ?? [])
    .map((id) => media[id])
    .filter((m): m is ResolvedMedia => m?.kind === "image");
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
  const scrolls = section.variant === "carousel" || section.variant === "filmstrip";
  const masonry = section.variant === "masonry";
  // Two lanes below 1024; three from 1024, four once there are eight (as in the CSS).
  const small = masonry ? masonryShapes(images, 2) : [];
  const large = masonry ? masonryShapes(images, images.length >= 8 ? 4 : 3) : [];

  return (
    <SectionShell
      section={section}
      ctx={ctx}
      head={{ title: p.title, titleLang: keyLang(section, "title") }}
    >
      <ul
        className={`plates plates--${section.variant}`}
        // A strip that scrolls sideways scrolls from the keyboard too.
        tabIndex={scrolls ? 0 : undefined}
        aria-labelledby={scrolls && p.title ? ctx.headingId : undefined}
      >
        {images.map((image, index) => (
          <li key={image.id}>
            <button
              type="button"
              className="plate"
              aria-label={image.alt || fmt(t.sections.gallery.open, { n: index + 1, total })}
              // The name is the photo's alt, which may still be English on /el.
              lang={image.alt ? langIf(image.textLang, ctx.locale) : undefined}
              aria-haspopup="dialog"
              style={
                masonry
                  ? ({ "--ratio": small[index], "--ratio-lg": large[index] } as CSSProperties)
                  : undefined
              }
              onClick={(event) => {
                opener.current = event.currentTarget;
                setOpen(index);
              }}
            >
              <Picture
                media={image}
                sizes={
                  (masonry && total < 8
                    ? PLATE_SIZES.masonryShort
                    : PLATE_SIZES[section.variant]) ?? PLATE_SIZES.grid
                }
                // Opening the page, the first plates are in view at every width.
                priority={ctx.isFirst && index < 3}
                decorative
              />
            </button>
            {image.caption && !masonry && (
              <p className="caption" lang={langIf(image.textLang, ctx.locale)}>
                {nb(image.caption)}
              </p>
            )}
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        className="lightbox band-ivory"
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
        {/* Close comes first, so it takes focus when the dialog opens */}
        <div className="lightbox-bar">
          <button
            type="button"
            className="btn btn-quiet btn-sm icon-btn"
            aria-label={t.sections.gallery.close}
            onClick={() => setOpen(null)}
          >
            <Icon name="close" />
          </button>
          <p className="meta" aria-live="polite">
            {open !== null && fmt(t.sections.gallery.counter, { n: open + 1, total })}
          </p>
        </div>
        <div className="lightbox-stage">
          {shown && (
            <figure className="lightbox-fig">
              <img
                src={shown.src}
                srcSet={shown.srcSet ?? undefined}
                sizes="100vw"
                alt={shown.alt}
                lang={shown.alt ? shown.textLang : undefined}
                width={shown.width ?? undefined}
                height={shown.height ?? undefined}
              />
              {(shown.caption || shown.credit) && (
                <figcaption>
                  {shown.caption && (
                    <span className="caption" lang={langIf(shown.textLang, ctx.locale)}>
                      {nb(shown.caption)}
                    </span>
                  )}
                  {shown.credit && (
                    <span className="meta">
                      {fmt(t.sections.gallery.credit, { credit: shown.credit })}
                    </span>
                  )}
                </figcaption>
              )}
            </figure>
          )}
          {total > 1 && (
            <>
              <button
                type="button"
                className="btn btn-quiet btn-sm icon-btn lightbox-prev"
                aria-label={t.sections.gallery.previous}
                onClick={() => go(-1)}
              >
                <Icon name="chev-left" />
              </button>
              <button
                type="button"
                className="btn btn-quiet btn-sm icon-btn lightbox-next"
                aria-label={t.sections.gallery.next}
                onClick={() => go(1)}
              >
                <Icon name="chev-right" />
              </button>
            </>
          )}
        </div>
      </dialog>
    </SectionShell>
  );
}
