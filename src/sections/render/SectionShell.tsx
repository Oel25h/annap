import { caps } from "@/lib/i18n/caps";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/locale";
import type { RenderedSection } from "@/sections/types";
import { SiteLink } from "@/components/site/SiteLink";
import { Icon } from "@/components/site/Icon";

export type SectionContext = {
  locale: Locale;
  /** Chapter numeral for the running head ("I", "II", or "§" for the player). */
  numeral: string | null;
  /** True for the first section: only it may load images eagerly. */
  isFirst: boolean;
  /** id for the section heading, for aria-labelledby. */
  headingId: string;
};

const BANDS = { ivory: "band-ivory", cream: "band-peach", cocoa: "band-cocoa" } as const;

export type RunheadLink = { label: string; href: string; external?: boolean } | null;

/** The running head: chapter numeral, the section's label, and an optional link. */
export function Runhead({
  numeral,
  title,
  link,
  meta,
}: {
  numeral: string | null;
  title: string;
  link?: RunheadLink;
  meta?: string;
}) {
  return (
    <div className="runhead">
      <p className="runhead-title">
        {numeral && (
          <span className="runhead-n" aria-hidden="true">
            {numeral}
          </span>
        )}
        <span>{caps(title)}</span>
      </p>
      {link ? (
        <SiteLink className="link" href={link.href}>
          {link.label}
          <Icon name={link.external ? "arrow-ext" : "arrow-right"} />
        </SiteLink>
      ) : meta ? (
        <p className="meta">{meta}</p>
      ) : null}
    </div>
  );
}

/** The phone-only copy of the running-head link, at the end of the section. */
export function FootLink({ link }: { link: RunheadLink }) {
  if (!link) return null;
  return (
    <p className="foot-link">
      <SiteLink className="link" href={link.href}>
        {link.label}
        <Icon name={link.external ? "arrow-ext" : "arrow-right"} />
      </SiteLink>
    </p>
  );
}

/** Band, width, spacing, anchor and language for any section. */
export function SectionShell({
  section,
  ctx,
  className = "",
  labelled = true,
  label,
  children,
  runhead,
  defaultAnchor,
}: {
  section: RenderedSection;
  ctx: SectionContext;
  className?: string;
  /** False when the section has no heading of its own (it then needs `label`). */
  labelled?: boolean;
  label?: string;
  children: ReactNode;
  runhead?: { link?: RunheadLink; meta?: string; title?: string };
  defaultAnchor?: string;
}) {
  const { settings } = section;
  const eyebrow = (section.props as { eyebrow?: string }).eyebrow ?? "";
  const runheadTitle = runhead?.title ?? eyebrow;
  const classes = [
    "chapter",
    BANDS[settings.background],
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
      lang={section.lang !== ctx.locale ? section.lang : undefined}
      aria-labelledby={labelled ? ctx.headingId : undefined}
      aria-label={!labelled ? label : undefined}
    >
      <div className="wrap">
        {runheadTitle && (
          <Runhead
            numeral={ctx.numeral}
            title={runheadTitle}
            link={runhead?.link}
            meta={runhead?.meta}
          />
        )}
        {children}
      </div>
    </section>
  );
}

/** `lang` for one flattened key: English inside an otherwise Greek section. */
export function keyLang(section: RenderedSection, key: string): "en" | undefined {
  return section.lang === "el" && section.englishKeys.includes(key) ? "en" : undefined;
}
