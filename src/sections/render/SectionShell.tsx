import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/locale";
import type { RenderedSection } from "@/sections/types";
import type { SectionSettings } from "@/sections/schemas";
import { SiteLink } from "@/components/site/SiteLink";
import { Icon } from "@/components/site/Icon";
import { nb } from "@/lib/i18n/rag";

export type Band = SectionSettings["background"];

export type SectionContext = {
  locale: Locale;
  /** True for the first section on the page: only it may load images eagerly. */
  isFirst: boolean;
  /** id for the section heading, for aria-labelledby. */
  headingId: string;
  /** The first section's heading is the page's h1 when nothing comes before it. */
  headingLevel: "h1" | "h2";
  /** The section's band once the page's band rules are applied. */
  band: Band;
  /** Only the home page hero sets its hope word in italic. */
  isHome: boolean;
};

const BANDS: Record<Band, string> = {
  ivory: "band-ivory",
  cream: "band-peach",
};

/** A standalone link: in-site with a right arrow, or out of the site with an up-right one. */
export type HeadLink = {
  label: string;
  href: string;
  /** Informational only: SiteLink decides from the host whether a link opens a new tab. */
  external?: "tab" | "youtube";
  lang?: "en";
};

/** The heading row: one h2 (or the page h1) and at most one link. */
export type SectionHead = {
  title: string;
  titleLang?: "en";
  intro?: string;
  introLang?: "en";
  link?: HeadLink | null;
};

/** A link from a section's props as a HeadLink, or null when it is empty. */
export function headLink(
  link: { label: string; href: string } | null | undefined,
  fallbackLabel = "",
  lang?: "en",
): HeadLink | null {
  if (!link?.href) return null;
  const label = link.label || fallbackLabel;
  if (!label) return null;
  return { label, href: link.href, lang };
}

/**
 * `.link`: 44px tall, 15px/600 sans, with its arrow. A link to another
 * website opens in a new tab and says so (SiteLink).
 */
export function TextLink({
  link,
  className = "link",
  icon,
}: {
  link: HeadLink;
  className?: string;
  /** Overrides the arrow, for links such as "Listen above". */
  icon?: "arrow-up" | "arrow-down" | "arrow-right" | "arrow-ext";
}) {
  return (
    <SiteLink className={className} href={link.href} lang={link.lang} arrow={!icon}>
      {link.label}
      {icon && <Icon name={icon} />}
    </SiteLink>
  );
}

/**
 * The section's own heading, for sections that place it inside their layout
 * (hero, book, two column, foreword, forms). It is the page's h1 when the
 * section opens the page, set in Display XL.
 */
export function SectionHeading({
  ctx,
  children,
  className = "display-l",
  lang,
  tabIndex,
}: {
  ctx: SectionContext;
  children: ReactNode;
  className?: string;
  lang?: string;
  tabIndex?: number;
}) {
  const H = ctx.headingLevel;
  return (
    <H
      id={ctx.headingId}
      className={H === "h1" ? "display-xl" : className}
      lang={lang}
      tabIndex={tabIndex}
    >
      {typeof children === "string" ? nb(children) : children}
    </H>
  );
}

/**
 * Band, width, spacing and anchor for any section, and its heading
 * row. A section with a heading is labelled by it; one without is a plain
 * section, never an unnamed landmark.
 *
 * - `head` renders `.shead` (the heading and its one link). Below 720 the link
 *   moves to the end of the section as `.foot-link`.
 * - `labelled` says the component renders its own heading with `ctx.headingId`.
 */
export function SectionShell({
  section,
  ctx,
  className = "",
  wrapClassName = "",
  head,
  labelled = false,
  children,
  defaultAnchor,
}: {
  section: RenderedSection;
  ctx: SectionContext;
  className?: string;
  wrapClassName?: string;
  head?: SectionHead | null;
  labelled?: boolean;
  children: ReactNode;
  defaultAnchor?: string;
}) {
  const { settings } = section;
  const title = head?.title.trim() ?? "";
  const link = head?.link ?? null;
  const classes = [
    "section",
    BANDS[ctx.band],
    `section-${section.type.replace(/_/g, "-")}`,
    `width-${settings.width}`,
    `space-${settings.spacing}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <section
      className={classes}
      id={settings.anchor || defaultAnchor || undefined}
      aria-labelledby={labelled || title ? ctx.headingId : undefined}
      data-section-id={section.id}
    >
      <div className={["wrap", wrapClassName].filter(Boolean).join(" ")}>
        {title && (
          <div className="shead">
            <div className="shead-text">
              <SectionHeading ctx={ctx} lang={head?.titleLang}>
                {title}
              </SectionHeading>
              {head?.intro && (
                <p className="lead" lang={head.introLang}>
                  {nb(head.intro)}
                </p>
              )}
            </div>
            {link && <TextLink link={link} />}
          </div>
        )}
        {children}
        {link && (
          <p className={title ? "foot-link" : "foot-link foot-link--always"}>
            <TextLink link={link} />
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * `lang` for one flattened key: English on a Greek page, in a section with no
 * approved Greek or with some keys still untranslated. A section never
 * carries `lang` itself: its own UI and data are in the page's language.
 */
export function keyLang(section: RenderedSection, key: string): "en" | undefined {
  return section.englishKeys.includes(key) ? "en" : undefined;
}
