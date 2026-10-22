import { caps } from "@/lib/i18n/caps";
import { Asterism, Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import type { MediaMap, RenderedSection } from "@/sections/types";
import { Picture } from "../render/Picture";
import { keyLang, SectionShell, type SectionContext } from "../render/SectionShell";
import { AccentTitle, Lines, RichHtml } from "../render/text";

type Props<T extends RenderedSection["type"]> = {
  section: RenderedSection<T>;
  media: MediaMap;
  ctx: SectionContext;
};

const lowerRoman = (n: number) =>
  ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"][n] ?? String(n + 1);
const pad = (n: number) => String(n + 1).padStart(2, "0");

/** A foreword: heading on the left page, the text (with a drop cap) on the right. */
export function RichText({ section, ctx }: Props<"rich_text">) {
  const p = section.props;
  return (
    <SectionShell section={section} ctx={ctx} labelled={!!p.title} label={p.eyebrow}>
      <div className={p.title || p.pullQuote ? "foreword" : "fw-single"}>
        {(p.title || p.pullQuote) && (
          <div className="fw-head">
            {p.title && (
              <h2 id={ctx.headingId} className="display-l" lang={keyLang(section, "title")}>
                {p.title}
              </h2>
            )}
            {section.variant === "with_pull_quote" && p.pullQuote && (
              <aside className="marginalia">
                <p lang={keyLang(section, "pullQuote")}>
                  <Lines text={p.pullQuote} />
                </p>
              </aside>
            )}
          </div>
        )}
        <div className="fw-body" lang={keyLang(section, "body")}>
          <RichHtml
            html={p.body}
            className={`prose${section.variant === "with_pull_quote" ? " dropcap" : ""}`}
          />
        </div>
      </div>
    </SectionShell>
  );
}

export function TwoColumn({ section, media, ctx }: Props<"two_column">) {
  const p = section.props;
  return (
    <SectionShell section={section} ctx={ctx}>
      <div className={`two-col two-col--${section.variant === "image_right" ? "right" : "left"}`}>
        <figure className="two-col-media">
          <Picture media={media[p.imageMediaId]} sizes="(min-width: 1024px) 40vw, 100vw" />
        </figure>
        <div className="two-col-text">
          <h2 id={ctx.headingId} className="display-l" lang={keyLang(section, "title")}>
            {p.title}
          </h2>
          <div lang={keyLang(section, "body")}>
            <RichHtml html={p.body} />
          </div>
          {p.link.href && p.link.label && (
            <p className="actions">
              <SiteLink className="link" href={p.link.href} lang={keyLang(section, "link.label")}>
                {p.link.label}
                <Icon name="arrow-right" />
              </SiteLink>
            </p>
          )}
        </div>
      </div>
    </SectionShell>
  );
}

/** An epigraph: one large quotation, centred, under three asterisks. */
export function Quote({ section, media, ctx }: Props<"quote">) {
  const p = section.props;
  const portrait = p.imageMediaId ? media[p.imageMediaId] : undefined;
  return (
    <section
      className={`epigraph band-${section.settings.background === "cream" ? "peach" : section.settings.background}`}
      id={section.settings.anchor || undefined}
      lang={section.lang !== ctx.locale ? section.lang : undefined}
      aria-label={p.by || undefined}
    >
      <div className="wrap">
        <figure>
          {section.variant === "with_portrait" && portrait ? (
            <div className="epigraph-portrait arch-wrap">
              <div className="arch-frame">
                <div className="arch arch--4x5">
                  <Picture media={portrait} sizes="160px" />
                </div>
              </div>
            </div>
          ) : (
            <span className="asterism">
              <Asterism />
            </span>
          )}
          <blockquote>
            <p lang={keyLang(section, "quote")}>
              <AccentTitle text={p.quote} accent={p.accent} />
            </p>
          </blockquote>
          {p.by && (
            <figcaption className="label" lang={keyLang(section, "by")}>
              — <cite>{caps(p.by)}</cite>
            </figcaption>
          )}
        </figure>
      </div>
    </section>
  );
}

export function ImageSection({ section, media, ctx }: Props<"image">) {
  const p = section.props;
  const image = media[p.imageMediaId];
  if (!image) return null;
  return (
    <section
      className={`chapter image-section image-section--${section.variant === "full_bleed" ? "bleed" : "contained"}`}
      id={section.settings.anchor || undefined}
      aria-label={image.alt || undefined}
    >
      <figure className={section.variant === "full_bleed" ? "" : "wrap"}>
        <Picture
          media={image}
          sizes={section.variant === "full_bleed" ? "100vw" : "(min-width: 1344px) 1280px, 100vw"}
          priority={ctx.isFirst}
        />
        {p.caption && (
          <figcaption className="caption" lang={keyLang(section, "caption")}>
            {p.caption}
          </figcaption>
        )}
      </figure>
    </section>
  );
}

/** A row of facts: value large, label small. */
export function Stats({ section, ctx }: Props<"stats">) {
  const items = section.props.items;
  return (
    <SectionShell section={section} ctx={ctx} labelled={false} label={items[0]?.label}>
      <dl className="facts facts--row">
        {items.map((item) => (
          <div key={item.id}>
            <dt className="label" lang={keyLang(section, `items.${item.id}.label`)}>
              {caps(item.label)}
            </dt>
            <dd lang={keyLang(section, `items.${item.id}.value`)}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </SectionShell>
  );
}

/** The chapters of a life: numbered seasons with a short story each. */
export function Timeline({ section, media, ctx }: Props<"timeline">) {
  const p = section.props;
  return (
    <SectionShell section={section} ctx={ctx} labelled={!!p.title} label={p.eyebrow}>
      {p.title && (
        <div className="head">
          <h2 id={ctx.headingId} className="display-l" lang={keyLang(section, "title")}>
            {p.title}
          </h2>
        </div>
      )}
      <ol className="chapters">
        {p.items.map((item, index) => {
          const image = item.imageMediaId ? media[item.imageMediaId] : undefined;
          return (
            <li key={item.id}>
              <p className="ch-n">
                <b>{pad(index)}</b>
                {item.label && (
                  <span className="label" lang={keyLang(section, `items.${item.id}.label`)}>
                    {caps(item.label)}
                  </span>
                )}
              </p>
              <h3 className="title" lang={keyLang(section, `items.${item.id}.title`)}>
                {item.title}
              </h3>
              <div className="ch-body">
                {item.body && (
                  <p className="body" lang={keyLang(section, `items.${item.id}.body`)}>
                    <Lines text={item.body} />
                  </p>
                )}
                {image && (
                  <Picture
                    media={image}
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="ch-img"
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </SectionShell>
  );
}

export function List({ section, ctx }: Props<"list">) {
  const p = section.props;
  const numbered = section.variant === "numbered";
  return (
    <SectionShell section={section} ctx={ctx} labelled={!!p.title} label={p.eyebrow}>
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
      <ol className={numbered ? "values" : "values values--plain"}>
        {p.items.map((item, index) => (
          <li key={item.id}>
            {numbered && (
              <span className="n" aria-hidden="true">
                {lowerRoman(index)}.
              </span>
            )}
            <h3 className="title" lang={keyLang(section, `items.${item.id}.title`)}>
              {item.title}
            </h3>
            {item.body && (
              <p className="body" lang={keyLang(section, `items.${item.id}.body`)}>
                <Lines text={item.body} />
              </p>
            )}
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

export function Faq({ section, ctx }: Props<"faq">) {
  const p = section.props;
  return (
    <SectionShell section={section} ctx={ctx} labelled={!!p.title} label={p.eyebrow}>
      {p.title && (
        <div className="head">
          <h2 id={ctx.headingId} className="display-l" lang={keyLang(section, "title")}>
            {p.title}
          </h2>
        </div>
      )}
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

/** "What next": one sentence and one action. */
export function CallToAction({ section, ctx }: Props<"call_to_action">) {
  const p = section.props;
  return (
    <SectionShell section={section} ctx={ctx}>
      <div className={section.variant === "card" ? "next next--card" : "next"}>
        <div>
          <h2 id={ctx.headingId} className="display-m" lang={keyLang(section, "title")}>
            {p.title}
          </h2>
          {p.body && (
            <p className="body next-body" lang={keyLang(section, "body")}>
              {p.body}
            </p>
          )}
        </div>
        <div className="actions">
          <SiteLink
            className="btn btn-primary"
            href={p.link.href}
            lang={keyLang(section, "link.label")}
          >
            {p.link.label}
          </SiteLink>
        </div>
      </div>
    </SectionShell>
  );
}

export function LinkList({ section, ctx }: Props<"link_list">) {
  return (
    <SectionShell
      section={section}
      ctx={ctx}
      labelled={false}
      label={section.props.items[0]?.label}
    >
      <ul className="link-list">
        {section.props.items.map((item) => (
          <li key={item.id}>
            <SiteLink
              className={item.featured ? "link-row link-row--featured" : "link-row"}
              href={item.href}
            >
              <span>
                <span className="link-row-label" lang={keyLang(section, `items.${item.id}.label`)}>
                  {item.label}
                </span>
                {item.description && (
                  <span className="meta" lang={keyLang(section, `items.${item.id}.description`)}>
                    {item.description}
                  </span>
                )}
              </span>
              <Icon name={item.href.startsWith("/") ? "arrow-right" : "arrow-ext"} />
            </SiteLink>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
