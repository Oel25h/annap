import type { MouseEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useT } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import { nb } from "@/lib/i18n/rag";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import { openPlayer } from "@/components/audio/AudioProvider";
import { useListenMeta, type Listen } from "@/components/audio/useListenMeta";
import type { MediaMap, RenderedSection, ResolvedMedia } from "@/sections/types";
import { Picture } from "../render/Picture";
import {
  headLink,
  keyLang,
  SectionHeading,
  SectionShell,
  TextLink,
  type SectionContext,
} from "../render/SectionShell";

type HeroSection = RenderedSection<"hero">;
type Layout = HeroSection["variant"];

/** hero-portrait.jpg carries vertical lettering down its right edge: `crop-hero` frames her clear of it. */
const isHeroPortrait = (image: ResolvedMedia) => /\/hero-portrait[/.]/.test(image.src);

/** `sizes` for the portrait in the arch on columns 1–5 (515px at 1440, 264px on phones). */
const ARCH_SIZES =
  "(min-width: 1440px) 515px, (min-width: 1024px) 37vw, (min-width: 720px) 320px, min(66vw, 264px)";
/** The same arch with `crop-hero`, whose image is 173.2% of the arch's width. */
const ARCH_CROP_SIZES =
  "(min-width: 1440px) 892px, (min-width: 1024px) 64vw, (min-width: 720px) 554px, min(114vw, 457px)";
/** The About arch on columns 9–12. */
const RIGHT_SIZES = "(min-width: 1440px) 405px, (min-width: 1024px) 29vw, min(56vw, 240px)";
/** The 3:2 photo on columns 1–6. */
const PHOTO_SIZES =
  "(min-width: 1440px) 624px, (min-width: 1024px) 45vw, (min-width: 720px) calc(100vw - 64px), calc(100vw - 32px)";

/**
 * The page's opening: always ivory, and it holds the page's h1.
 * - portrait_arch (home): her portrait in the arch on columns 1–5, the words on 7–12, the
 *   caption at the foot aligned with the portrait's base. Phones: portrait, words, caption.
 * - portrait_right (About): text-led, the facts under the lead, the arch on 9–12.
 * - photo: a 3:2 photograph on 1–6 beside the words. text_only: the words on 1–8.
 */
export function Hero({
  section,
  media,
  ctx,
  listen = null,
}: {
  section: HeroSection;
  media: MediaMap;
  ctx: SectionContext;
  /** The page's player, when it has one with something to play. */
  listen?: Listen | null;
}) {
  const p = section.props;
  const image = p.imageMediaId ? media[p.imageMediaId] : undefined;
  const layout: Layout = image?.kind === "image" ? section.variant : "text_only";
  const lang = (key: string) => keyLang(section, key);

  const title = (
    <SectionHeading ctx={ctx} lang={lang("title")}>
      <HeroTitle text={p.title} accent={ctx.isHome ? p.accent : ""} />
    </SectionHeading>
  );
  const lead = p.body && (
    <p className="lead hero-lead" lang={lang("body")}>
      {nb(p.body)}
    </p>
  );
  const actions = <HeroActions section={section} listen={p.listenCta ? listen : null} />;
  const caption = (Tag: "p" | "figcaption") =>
    p.caption && (
      <Tag className="caption frontis" lang={lang("caption")}>
        {nb(p.caption)}
      </Tag>
    );

  let figure = null;
  if (image && layout === "photo") {
    figure = (
      <figure className="hero-fig">
        <Picture media={image} sizes={PHOTO_SIZES} priority={ctx.isFirst} />
        {caption("figcaption")}
      </figure>
    );
  } else if (image && layout !== "text_only") {
    const crop = layout === "portrait_arch" && isHeroPortrait(image);
    const sizes = layout === "portrait_right" ? RIGHT_SIZES : crop ? ARCH_CROP_SIZES : ARCH_SIZES;
    figure = (
      <div className="hero-fig">
        <div className="arch-wrap">
          <div className="arch arch--4x5">
            <Picture
              media={image}
              sizes={sizes}
              priority={ctx.isFirst}
              className={crop ? "crop crop-hero" : undefined}
            />
          </div>
        </div>
      </div>
    );
  }

  const facts = section.variant === "portrait_right" && p.facts.length > 0 && (
    <dl className="facts">
      {p.facts.map((fact) => (
        <div key={fact.id}>
          <dt lang={lang(`facts.${fact.id}.label`)}>{fact.label}</dt>
          <dd lang={lang(`facts.${fact.id}.value`)}>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
  const words = (
    <div className="hero-text">
      {layout === "portrait_arch" ? (
        // Centred in the portrait's height, with the caption on its base
        <div className="hero-main">
          {title}
          {lead}
          {actions}
        </div>
      ) : (
        <>
          {title}
          {lead}
          {actions}
          {facts}
        </>
      )}
      {layout !== "photo" && caption("p")}
    </div>
  );

  return (
    <SectionShell
      section={section}
      ctx={ctx}
      className={`hero hero--${layout.replace(/_/g, "-")}`}
      wrapClassName="grid-12 hero-grid"
      labelled
    >
      {layout === "portrait_right" ? (
        <>
          {words}
          {figure}
        </>
      ) : (
        <>
          {figure}
          {words}
        </>
      )}
    </SectionShell>
  );
}

/** The title, with the home page's hope word in italic. Short words are bound to the next. */
function HeroTitle({ text, accent }: { text: string; accent: string }) {
  const full = nb(text);
  const word = nb(accent.trim());
  const at = word ? full.indexOf(word) : -1;
  if (at < 0) return <>{full}</>;
  return (
    <>
      {full.slice(0, at)}
      <em className="accent">{word}</em>
      {full.slice(at + word.length)}
    </>
  );
}

/**
 * Listen (when the page has a player), then the section's links. With Listen,
 * `primary` and `secondary` are text links ("Read my story"); without it,
 * `primary` is the view's one Tangerine button.
 */
function HeroActions({ section, listen }: { section: HeroSection; listen: Listen | null }) {
  const p = section.props;
  const primary = headLink(p.primary, "", keyLang(section, "primary.label"));
  const secondary = headLink(p.secondary, "", keyLang(section, "secondary.label"));
  if (!listen && !primary && !secondary) return null;
  return (
    <div className="hero-actions">
      {listen && <ListenAction listen={listen} />}
      {primary &&
        (listen ? (
          <TextLink link={primary} />
        ) : (
          // A link to another website opens in a new tab and says so (SiteLink).
          <SiteLink className="btn btn-primary" href={primary.href} lang={primary.lang}>
            {primary.label}
          </SiteLink>
        ))}
      {secondary && <TextLink link={secondary} />}
    </div>
  );
}

/**
 * "Listen to the audiobook": a 56px Tangerine disc and a two-line label, one link.
 * It takes the reader to the player and puts focus on Play; it never starts audio.
 * Without script the href still jumps to the player.
 */
function ListenAction({ listen }: { listen: Listen }) {
  const t = useT();
  const navigate = useNavigate();
  const meta = useListenMeta(listen);
  const { anchor } = listen;
  const parts = meta.whole
    ? meta.kind === "start"
      ? [t.sections.hero.listenBy]
      : [
          t.sections.hero.listenResumeWhole,
          meta.minutesLeft ? fmt(t.sections.hero.listenLeft, { m: meta.minutesLeft }) : "",
        ]
    : meta.kind === "start"
      ? [fmt(t.sections.hero.listenStart, { n: meta.chapter }), t.sections.hero.listenBy]
      : [
          fmt(t.sections.hero.listenResume, { n: meta.chapter }),
          meta.minutesLeft ? fmt(t.sections.hero.listenLeft, { m: meta.minutesLeft }) : "",
        ];

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    // Without the player's Play button on the page, the href's plain jump does the work.
    if (!openPlayer(anchor)) return;
    event.preventDefault();
    // Mark the place in the address without the router scrolling to it a second time.
    void navigate({
      to: ".",
      search: true,
      hash: anchor,
      replace: true,
      resetScroll: false,
      hashScrollIntoView: false,
    });
  };

  return (
    <a className="listen" href={`#${anchor}`} onClick={onClick}>
      <span className="listen-disc" aria-hidden="true">
        <Icon name="play" />
      </span>
      <span className="listen-text">
        <strong>{t.sections.hero.listen}</strong>
        <span className="meta dots">
          {parts.filter(Boolean).map((part) => (
            <span key={part}>{part}</span>
          ))}
        </span>
      </span>
    </a>
  );
}
