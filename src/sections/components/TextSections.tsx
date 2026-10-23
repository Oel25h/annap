import { Fragment } from "react";
import { useT } from "@/lib/i18n/context";
import { keepCapSpace, nb } from "@/lib/i18n/rag";
import { Icon, type IconName } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
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
import { Lines, RichHtml } from "../render/text";

type Props<T extends RenderedSection["type"]> = {
  section: RenderedSection<T>;
  media: MediaMap;
  ctx: SectionContext;
};

/** Chapter and step numbers: 01, 02, … */
const pad = (n: number) => String(n + 1).padStart(2, "0");

/** Taller than wide: shown at 4:5 rather than 3:2. */
const isPortrait = (media: ResolvedMedia | undefined) =>
  !!media?.width && !!media.height && media.height > media.width;

const isExternal = (href: string) => /^https:\/\//i.test(href);

/** A link to giving: Donate carries the heart. */
const GIVING = /(^|[/#?.=])(give|giving|donate|donations?)\b/i;

/**
 * The section's one Tangerine button. An icon leads the label, as in the
 * mocks (the heart on Donate, the headphones on Listen).
 */
function PrimaryLink({
  link,
  icon,
  lang,
}: {
  link: { label: string; href: string };
  icon?: IconName;
  lang?: "en";
}) {
  const t = useT();
  const external = isExternal(link.href);
  return (
    <SiteLink
      className="btn btn-primary"
      href={link.href}
      lang={lang}
      {...(external ? { target: "_blank", rel: "noopener" } : {})}
    >
      {icon && <Icon name={icon} />}
      <span>{link.label}</span>
      {external && <span className="sr-only">{t.site.opensNewTab}</span>}
      {external && !icon && <Icon name="arrow-ext" />}
    </SiteLink>
  );
}

/**
 * Reading text. `one_column`: the heading row, then the text at the reading
 * measure from column 1. `foreword`: the h2 alone on columns 1–5 and the text
 * on 7–12, its first paragraph opening with a drop cap.
 */
export function RichText({ section, ctx }: Props<"rich_text">) {
  const p = section.props;
  const title = p.title.trim();
  const foreword = section.variant === "foreword";
  const body = foreword ? keepCapSpace(p.body) : p.body;
  if (foreword && title) {
    return (
      <SectionShell section={section} ctx={ctx} labelled>
        <div className="foreword grid-12">
          <div className="fw-head">
            <SectionHeading ctx={ctx} lang={keyLang(section, "title")}>
              {title}
            </SectionHeading>
          </div>
          <RichHtml html={body} className="fw-body prose dropcap" lang={keyLang(section, "body")} />
        </div>
      </SectionShell>
    );
  }
  return (
    <SectionShell
      section={section}
      ctx={ctx}
      head={title ? { title, titleLang: keyLang(section, "title") } : null}
    >
      <RichHtml
        html={body}
        className={foreword ? "prose dropcap" : "prose"}
        lang={keyLang(section, "body")}
      />
    </SectionShell>
  );
}

/**
 * A photograph and its words side by side (the home Foundation block): the
 * photo on six columns at 3:2, cropped on its focal point whatever its
 * orientation (DESIGN.md §7: 4:5 belongs to the arch), then the h2, lead, body
 * and actions on the other six.
 */
export function TwoColumn({ section, media, ctx }: Props<"two_column">) {
  const p = section.props;
  const image = media[p.imageMediaId]?.kind === "image" ? media[p.imageMediaId] : undefined;
  const primary = p.primary.href && p.primary.label ? p.primary : null;
  const link = headLink(p.link, "", keyLang(section, "link.label"));
  const secondary = headLink(p.secondary, "", keyLang(section, "secondary.label"));
  const classes = [
    "two-col grid-12",
    section.variant === "image_right" ? "two-col--right" : "two-col--left",
    !image ? "two-col--text" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <SectionShell section={section} ctx={ctx} labelled>
      <div className={classes}>
        {image && (
          <figure className="two-col-media">
            <Picture media={image} sizes="(min-width: 1024px) 45vw, 100vw" />
            {p.caption && (
              <figcaption className="caption" lang={keyLang(section, "caption")}>
                {nb(p.caption)}
              </figcaption>
            )}
          </figure>
        )}
        <div className="two-col-text">
          <SectionHeading ctx={ctx} lang={keyLang(section, "title")}>
            {p.title}
          </SectionHeading>
          {p.lead && (
            <p className="lead" lang={keyLang(section, "lead")}>
              {nb(p.lead)}
            </p>
          )}
          <RichHtml html={p.body} className="two-col-body prose" lang={keyLang(section, "body")} />
          {(primary || link || secondary) && (
            <div className="actions">
              {primary && (
                <PrimaryLink
                  link={primary}
                  icon={GIVING.test(primary.href) ? "heart" : undefined}
                  lang={keyLang(section, "primary.label")}
                />
              )}
              {link && <TextLink link={link} />}
              {secondary && <TextLink link={secondary} />}
            </div>
          )}
        </div>
      </div>
    </SectionShell>
  );
}

/**
 * One sentence set large: a plain section with no heading and no landmark
 * name. `centred` sits on columns 3–10 under a hairline, its source a <cite>
 * (the home quote). `statement` is left-aligned on 2–11 over a meta caption
 * (the About mission).
 */
export function Quote({ section, ctx }: Props<"quote">) {
  const p = section.props;
  const statement = section.variant === "statement";
  const source = p.source.trim();
  const attribution = p.attribution.trim();
  return (
    <SectionShell
      section={section}
      ctx={ctx}
      className={statement ? "mission" : "epigraph"}
      wrapClassName="grid-12"
    >
      <figure>
        <blockquote>
          <p className="display-l" lang={keyLang(section, "quote")}>
            {nb(p.quote)}
          </p>
        </blockquote>
        {(source || attribution) && (
          <figcaption className={statement ? "meta" : "caption"}>
            {source && <cite lang={keyLang(section, "source")}>{nb(source)}</cite>}
            {attribution && (
              <span
                className={statement ? undefined : "meta"}
                lang={keyLang(section, "attribution")}
              >
                {attribution}
              </span>
            )}
          </figcaption>
        )}
      </figure>
    </SectionShell>
  );
}

/** A photograph on its own: on the content width, or edge to edge. */
export function ImageSection({ section, media, ctx }: Props<"image">) {
  const p = section.props;
  const image = media[p.imageMediaId];
  if (!image) return null;
  const bleed = section.variant === "full_bleed";
  const portrait = !bleed && isPortrait(image);
  return (
    <SectionShell
      section={section}
      ctx={ctx}
      className={bleed ? "image--bleed" : portrait ? "image--portrait" : undefined}
    >
      <figure className="image-figure">
        <Picture
          media={image}
          sizes={
            bleed
              ? "100vw"
              : portrait
                ? "(min-width: 1024px) 36vw, 100vw"
                : "(min-width: 1344px) 1280px, 100vw"
          }
          priority={ctx.isFirst}
        />
        {p.caption && (
          <figcaption
            className={bleed ? "caption wrap" : "caption"}
            lang={keyLang(section, "caption")}
          >
            {nb(p.caption)}
          </figcaption>
        )}
      </figure>
    </SectionShell>
  );
}

/** A few facts, as on the About hero: the label above, the value in the title role. */
export function Stats({ section, ctx }: Props<"stats">) {
  return (
    <SectionShell section={section} ctx={ctx}>
      <dl className="stats">
        {section.props.items.map((item) => (
          <div key={item.id}>
            <dt lang={keyLang(section, `items.${item.id}.label`)}>{item.label}</dt>
            <dd lang={keyLang(section, `items.${item.id}.value`)}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </SectionShell>
  );
}

/**
 * The chapters of a life: hairline rows, each with its number, label and
 * title on columns 1–4 and its story on 5–11. A chapter's photograph and its
 * pull quote follow it as rows of their own.
 */
export function Timeline({ section, media, ctx }: Props<"timeline">) {
  const p = section.props;
  const title = p.title.trim();
  // One level under the section's heading: h3 under its h2, h2 under the page h1 or with no title.
  const ItemHeading = title && ctx.headingLevel === "h2" ? "h3" : "h2";
  return (
    <SectionShell
      section={section}
      ctx={ctx}
      head={{
        title,
        titleLang: keyLang(section, "title"),
        link: headLink(p.link, "", keyLang(section, "link.label")),
      }}
    >
      <ol className="chapters">
        {p.items.map((item, index) => {
          const lang = (field: string) => keyLang(section, `items.${item.id}.${field}`);
          const image = item.imageMediaId ? media[item.imageMediaId] : undefined;
          return (
            <Fragment key={item.id}>
              <li>
                <div className="ch-head">
                  <p className="meta">
                    <b>{pad(index)}</b>
                    {item.label && <span lang={lang("label")}>{item.label}</span>}
                  </p>
                  <ItemHeading className="title" lang={lang("title")}>
                    {item.title}
                  </ItemHeading>
                </div>
                {item.body && (
                  <div className="ch-body">
                    <p className="body" lang={lang("body")}>
                      <Lines text={item.body} />
                    </p>
                  </div>
                )}
              </li>
              {image && (
                <li className="ch-photo">
                  <figure>
                    <Picture media={image} sizes="(min-width: 1024px) 52vw, 100vw" />
                    {item.caption && (
                      <figcaption className="caption" lang={lang("caption")}>
                        {nb(item.caption)}
                      </figcaption>
                    )}
                  </figure>
                </li>
              )}
              {item.pullQuote && (
                <li className="ch-quote">
                  <blockquote>
                    <p className="display-l" lang={lang("pullQuote")}>
                      {nb(item.pullQuote)}
                    </p>
                  </blockquote>
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </SectionShell>
  );
}

/**
 * Hairline rows: the title on columns 1–4 and its line on 5–11. `numbered`
 * counts real steps in arabic figures above each title; `plain` has none.
 */
export function List({ section, ctx }: Props<"list">) {
  const p = section.props;
  const title = p.title.trim();
  const numbered = section.variant === "numbered";
  const Rows = numbered ? "ol" : "ul";
  const ItemHeading = title && ctx.headingLevel === "h2" ? "h3" : "h2";
  return (
    <SectionShell
      section={section}
      ctx={ctx}
      head={{
        title,
        titleLang: keyLang(section, "title"),
        intro: p.intro,
        introLang: keyLang(section, "intro"),
      }}
    >
      <Rows className={numbered ? "values values--numbered" : "values"}>
        {p.items.map((item, index) => (
          <li key={item.id}>
            {numbered && <span className="meta values-n">{pad(index)}</span>}
            <ItemHeading className="title" lang={keyLang(section, `items.${item.id}.title`)}>
              {item.title}
            </ItemHeading>
            {item.body && (
              <p className="body" lang={keyLang(section, `items.${item.id}.body`)}>
                <Lines text={item.body} />
              </p>
            )}
          </li>
        ))}
      </Rows>
    </SectionShell>
  );
}

/** Questions that open in place, on hairline rows. */
export function Faq({ section, ctx }: Props<"faq">) {
  const p = section.props;
  return (
    <SectionShell
      section={section}
      ctx={ctx}
      head={{ title: p.title, titleLang: keyLang(section, "title") }}
    >
      <div className="faq">
        {p.items.map((item) => (
          <details key={item.id}>
            <summary>
              <span className="title" lang={keyLang(section, `items.${item.id}.question`)}>
                {item.question}
              </span>
              <Icon name="chev-down" />
            </summary>
            <p className="body" lang={keyLang(section, `items.${item.id}.answer`)}>
              <Lines text={item.answer} />
            </p>
          </details>
        ))}
      </div>
    </SectionShell>
  );
}

/**
 * What next. `band`: the h2 on columns 1–6, the button and a text link on
 * 7–12 (About's close). `card`: the same in a peach card, laid out like the
 * free eBook card.
 */
export function CallToAction({ section, ctx }: Props<"call_to_action">) {
  const p = section.props;
  const card = section.variant === "card";
  const secondary = headLink(p.secondary, "", keyLang(section, "secondary.label"));
  return (
    <SectionShell section={section} ctx={ctx} labelled>
      <div className={card ? "next next--card grid-12" : "next grid-12"}>
        <div className="next-copy">
          <SectionHeading
            ctx={ctx}
            className={card ? "display-m" : "display-l"}
            lang={keyLang(section, "title")}
          >
            {p.title}
          </SectionHeading>
          {p.body && (
            <p className="body" lang={keyLang(section, "body")}>
              {p.body}
            </p>
          )}
        </div>
        <div className="actions">
          <PrimaryLink
            link={p.link}
            icon={p.link.href.endsWith("#listen") ? "headphones" : undefined}
            lang={keyLang(section, "link.label")}
          />
          {secondary && <TextLink link={secondary} />}
        </div>
      </div>
    </SectionShell>
  );
}

/** The /start page: one featured link in Tangerine, then hairline rows. */
export function LinkList({ section, ctx }: Props<"link_list">) {
  const t = useT();
  const items = section.props.items;
  // One Tangerine fill per view: only the first featured link is filled.
  const featured = items.find((item) => item.featured)?.id;
  return (
    <SectionShell section={section} ctx={ctx}>
      <ul className="link-list">
        {items.map((item) => {
          const external = isExternal(item.href);
          const inSite = item.href.startsWith("/") || item.href.startsWith("#");
          return (
            <li key={item.id}>
              <SiteLink
                className={item.id === featured ? "link-row link-row--featured" : "link-row"}
                href={item.href}
                {...(external ? { target: "_blank", rel: "noopener" } : {})}
              >
                <span className="link-row-text">
                  <span
                    className="link-row-label"
                    lang={keyLang(section, `items.${item.id}.label`)}
                  >
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="meta" lang={keyLang(section, `items.${item.id}.description`)}>
                      {item.description}
                    </span>
                  )}
                </span>
                {external && <span className="sr-only">{t.site.opensNewTab}</span>}
                <Icon name={inSite ? "arrow-right" : "arrow-ext"} />
              </SiteLink>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
