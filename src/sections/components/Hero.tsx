import { caps } from "@/lib/i18n/caps";
import { useT } from "@/lib/i18n/context";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import type { MediaMap, RenderedSection } from "@/sections/types";
import { Picture } from "../render/Picture";
import { keyLang, type SectionContext } from "../render/SectionShell";
import { AccentTitle } from "../render/text";

/** The title spread: her portrait in the arch on the left page, the words on the right. */
export function Hero({
  section,
  media,
  ctx,
  listenAnchor,
}: {
  section: RenderedSection<"hero">;
  media: MediaMap;
  ctx: SectionContext;
  listenAnchor: string | null;
}) {
  const t = useT();
  const p = section.props;
  const Heading = ctx.isFirst ? "h1" : "h2";
  const image = p.imageMediaId ? media[p.imageMediaId] : undefined;
  const imprint = p.eyebrow
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
  const showImage = section.variant !== "text_only" && image;

  const words = (
    <div className="page recto">
      <Heading id={ctx.headingId} className="display-xl">
        <AccentTitle text={p.title} accent={p.accent} />
      </Heading>
      {p.body && (
        <p className="lead hero-lead" lang={keyLang(section, "body")}>
          {p.body}
        </p>
      )}
      {p.listenCta && listenAnchor && (
        <a className="listen" href={`#${listenAnchor}`}>
          <span className="listen-disc">
            <Icon name="play" />
          </span>
          <span className="listen-text">
            <strong>{t.sections.hero.listen}</strong>
            <span className="meta">{t.sections.hero.listenMeta}</span>
          </span>
        </a>
      )}
      {(p.primary.href || p.secondary.href) && (
        <div className="hero-links">
          {p.primary.href && p.primary.label && (
            <SiteLink
              className={p.listenCta ? "link" : "btn btn-primary"}
              href={p.primary.href}
              lang={keyLang(section, "primary.label")}
            >
              {p.primary.label}
              {p.listenCta && <Icon name="arrow-right" />}
            </SiteLink>
          )}
          {p.secondary.href && p.secondary.label && (
            <SiteLink
              className="link"
              href={p.secondary.href}
              lang={keyLang(section, "secondary.label")}
            >
              {p.secondary.label}
              <Icon name="arrow-right" />
            </SiteLink>
          )}
        </div>
      )}
      {imprint.length > 0 && (
        <p className="imprint" lang={keyLang(section, "eyebrow")}>
          {imprint.map((part) => (
            <span key={part} className="label">
              {caps(part)}
            </span>
          ))}
        </p>
      )}
    </div>
  );

  return (
    <section
      className={`hero hero--${section.variant.replace(/_/g, "-")}`}
      id={section.settings.anchor || undefined}
      lang={section.lang !== ctx.locale ? section.lang : undefined}
      aria-labelledby={ctx.headingId}
    >
      <div className={`wrap spread${showImage ? "" : " spread--text"}`}>
        {showImage && (
          <>
            <figure className="page verso">
              {section.variant === "full_bleed" ? (
                <div className="bleed">
                  <Picture media={image} sizes="100vw" priority={ctx.isFirst} />
                </div>
              ) : (
                <div className="arch-wrap">
                  <div className="arch-frame">
                    <div className="arch arch--4x5">
                      <Picture
                        media={image}
                        sizes="(min-width: 1024px) 464px, (min-width: 720px) 340px, 60vw"
                        priority={ctx.isFirst}
                      />
                    </div>
                  </div>
                </div>
              )}
              {p.caption && (
                <figcaption className="caption frontis" lang={keyLang(section, "caption")}>
                  {p.caption}
                </figcaption>
              )}
            </figure>
            <div className="spine" aria-hidden="true" />
          </>
        )}
        {words}
      </div>
    </section>
  );
}
