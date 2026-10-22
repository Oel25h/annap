import { caps } from "@/lib/i18n/caps";
import { useRouterState } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import { useT } from "@/lib/i18n/context";
import { fmt, formatDate, formatMoney, formatWhen } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import type { EventCard, MediaMap, RenderedSection } from "@/sections/types";
import { Picture } from "../render/Picture";
import { FootLink, keyLang, SectionShell, type SectionContext } from "../render/SectionShell";
import { Lines, RichHtml } from "../render/text";

type Props<T extends RenderedSection["type"]> = {
  section: RenderedSection<T>;
  media: MediaMap;
  ctx: SectionContext;
};

const langIf = (lang: Locale, page: Locale) => (lang !== page ? lang : undefined);

function SectionHead({
  section,
  ctx,
  title,
  intro,
}: {
  section: RenderedSection;
  ctx: SectionContext;
  title: string;
  intro?: string;
}) {
  if (!title && !intro) return null;
  return (
    <div className="head">
      {title && (
        <h2 id={ctx.headingId} className="display-l" lang={keyLang(section, "title")}>
          {title}
        </h2>
      )}
      {intro && (
        <p className="lead" lang={keyLang(section, "intro")}>
          {intro}
        </p>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="empty body">{text}</p>;
}

/** Address of the journal index for a category and page; page 1 and "all" stay off the URL. */
function indexHref(base: string, category: string | null, page: number): string {
  const search = new URLSearchParams();
  if (category) search.set("category", category);
  if (page > 1) search.set("page", String(page));
  return search.size ? `${base}?${search}` : base;
}

/**
 * The journal index: date and category, title and excerpt, a small plate on
 * the right. On the journal's own page it pages through every post and can
 * show one category at a time.
 */
export function LatestPosts({ section, media, ctx }: Props<"latest_posts">) {
  const t = useT();
  const p = section.props;
  const posts = section.data?.posts ?? [];
  const categories = section.data?.categories ?? [];
  const pagination = section.data?.pagination ?? null;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // An empty collection hides itself, except on the index, where a category can be empty.
  if (posts.length === 0 && !pagination) return null;
  const base = pagination ? pathname : "/blog";
  const current = pagination?.category ?? null;
  const link = p.link.href ? { label: p.link.label, href: p.link.href } : null;

  const themes = categories.length > 0 && (
    <nav className="themes" aria-label={t.sections.posts.categories}>
      {pagination &&
        (current === null ? (
          <span className="chip" aria-current="true">
            {t.sections.posts.all}
          </span>
        ) : (
          <SiteLink className="chip" href={base}>
            {t.sections.posts.all}
          </SiteLink>
        ))}
      {categories.map((c) =>
        c.slug === current ? (
          <span key={c.slug} className="chip" aria-current="true">
            {c.name}
          </span>
        ) : (
          <SiteLink key={c.slug} className="chip" href={indexHref(base, c.slug, 1)}>
            {c.name}
          </SiteLink>
        ),
      )}
    </nav>
  );

  return (
    <SectionShell
      section={section}
      ctx={ctx}
      labelled={!!p.title}
      label={p.eyebrow}
      runhead={{ link }}
    >
      <SectionHead section={section} ctx={ctx} title={p.title} />
      {pagination && themes}
      {posts.length === 0 ? (
        <Empty text={t.sections.posts.empty} />
      ) : (
        <div className={`index${section.variant === "grid" ? " index--grid" : ""}`}>
          {posts.map((post) => {
            const href = `/blog/${post.slug}`;
            return (
              <article className="story" key={post.id} lang={langIf(post.textLang, ctx.locale)}>
                <p className="meta dots">
                  {post.publishedAt && <span>{formatDate(post.publishedAt, ctx.locale)}</span>}
                  {post.readingMinutes ? (
                    <span>{fmt(t.sections.posts.minutes, { m: post.readingMinutes })}</span>
                  ) : null}
                  {post.category && <span className="meta-accent">{post.category.name}</span>}
                </p>
                <div className="story-text">
                  <h3 className="story-title">
                    <SiteLink href={href}>{post.title}</SiteLink>
                  </h3>
                  {post.excerpt && <p className="body excerpt">{post.excerpt}</p>}
                </div>
                {post.coverMediaId && media[post.coverMediaId] && (
                  <SiteLink className="story-img" href={href} tabIndex={-1} aria-hidden="true">
                    <Picture
                      media={media[post.coverMediaId]}
                      sizes="(min-width: 1024px) 18vw, 30vw"
                      decorative
                    />
                  </SiteLink>
                )}
              </article>
            );
          })}
        </div>
      )}
      {!pagination && themes}
      {pagination && pagination.pages > 1 && (
        <nav className="pager" aria-label={t.sections.posts.pages}>
          {pagination.page > 1 ? (
            <SiteLink
              className="link-quiet"
              rel="prev"
              href={indexHref(base, current, pagination.page - 1)}
            >
              <Icon name="chev-left" />
              {t.sections.posts.newer}
            </SiteLink>
          ) : (
            <span />
          )}
          <span className="meta">
            {fmt(t.sections.posts.pageOf, { n: pagination.page, total: pagination.pages })}
          </span>
          {pagination.page < pagination.pages ? (
            <SiteLink
              className="link-quiet"
              rel="next"
              href={indexHref(base, current, pagination.page + 1)}
            >
              {t.sections.posts.older}
              <Icon name="chev-right" />
            </SiteLink>
          ) : (
            <span />
          )}
        </nav>
      )}
      <FootLink link={link} />
    </SectionShell>
  );
}

/** Praise: one large quotation, or a few to page through. */
export function Testimonials({ section, media, ctx }: Props<"testimonials">) {
  const t = useT();
  const p = section.props;
  const items = section.data?.items ?? [];
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  if (items.length === 0) return null;

  if (section.variant === "single" || items.length === 1) {
    const item = items[0];
    const photo = item.photoMediaId ? media[item.photoMediaId] : undefined;
    return (
      <SectionShell section={section} ctx={ctx} labelled={!!p.title} label={p.eyebrow || item.name}>
        <SectionHead section={section} ctx={ctx} title={p.title} />
        <figure className="praise" lang={langIf(item.textLang, ctx.locale)}>
          <blockquote>
            <p>
              <Lines text={item.quote} />
            </p>
          </blockquote>
          <figcaption>
            {photo && <Picture media={photo} sizes="56px" className="praise-photo" decorative />}
            <span className="label">{caps(item.name)}</span>
            {item.role && <span className="meta">{item.role}</span>}
          </figcaption>
        </figure>
      </SectionShell>
    );
  }

  const scrollTo = (next: number) => {
    const clamped = Math.max(0, Math.min(items.length - 1, next));
    const el = track.current?.children[clamped] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    setIndex(clamped);
  };

  return (
    <SectionShell section={section} ctx={ctx} labelled={!!p.title} label={p.eyebrow}>
      <SectionHead section={section} ctx={ctx} title={p.title} />
      <ul
        className="praise-track"
        ref={track}
        onScroll={(event) => {
          const el = event.currentTarget;
          const width = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? el.clientWidth;
          setIndex(Math.round(el.scrollLeft / Math.max(1, width)));
        }}
      >
        {items.map((item) => {
          const photo = item.photoMediaId ? media[item.photoMediaId] : undefined;
          return (
            <li key={item.id}>
              <figure className="praise praise--card" lang={langIf(item.textLang, ctx.locale)}>
                <blockquote>
                  <p>
                    <Lines text={item.quote} />
                  </p>
                </blockquote>
                <figcaption>
                  {photo && (
                    <Picture media={photo} sizes="48px" className="praise-photo" decorative />
                  )}
                  <span className="label">{caps(item.name)}</span>
                  {item.role && <span className="meta">{item.role}</span>}
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
      <div className="track-ctl">
        <button
          type="button"
          className="ctl"
          aria-label={t.sections.testimonials.previous}
          disabled={index === 0}
          onClick={() => scrollTo(index - 1)}
        >
          <Icon name="chev-left" />
        </button>
        <span className="meta" aria-live="polite">
          {fmt(t.sections.testimonials.counter, { n: index + 1, total: items.length })}
        </span>
        <button
          type="button"
          className="ctl"
          aria-label={t.sections.testimonials.next}
          disabled={index >= items.length - 1}
          onClick={() => scrollTo(index + 1)}
        >
          <Icon name="chev-right" />
        </button>
      </div>
    </SectionShell>
  );
}

export function Products({ section, media, ctx }: Props<"products">) {
  const t = useT();
  const p = section.props;
  const products = section.data?.products ?? [];
  if (products.length === 0) return null;
  return (
    <SectionShell section={section} ctx={ctx} labelled={!!p.title} label={p.eyebrow}>
      <SectionHead section={section} ctx={ctx} title={p.title} />
      <ul className="cards">
        {products.map((product) => {
          const cover = product.coverMediaId ? media[product.coverMediaId] : undefined;
          const price =
            product.priceCents === 0
              ? t.sections.products.free
              : product.priceCents
                ? formatMoney(product.priceCents, product.currency, ctx.locale)
                : product.priceLabel;
          return (
            <li key={product.id} className="card" lang={langIf(product.textLang, ctx.locale)}>
              {cover && (
                <div className="card-img">
                  <Picture media={cover} sizes="(min-width: 1024px) 30vw, 90vw" decorative />
                </div>
              )}
              <div className="card-body">
                <h3 className="title">
                  <SiteLink href={`/shop/${product.slug}`} className="card-link">
                    {product.name}
                  </SiteLink>
                </h3>
                {product.summary && <p className="body">{product.summary}</p>}
                {price && <p className="meta card-price">{price}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}

export function Masterclasses({ section, media, ctx }: Props<"masterclasses">) {
  const t = useT();
  const p = section.props;
  const items = section.data?.items ?? [];
  if (items.length === 0) return null;
  return (
    <SectionShell section={section} ctx={ctx} labelled={!!p.title} label={p.eyebrow}>
      <SectionHead section={section} ctx={ctx} title={p.title} intro={p.intro} />
      <ul className={section.variant === "cards" ? "cards" : "rows"}>
        {items.map((item) => {
          const cover = item.coverMediaId ? media[item.coverMediaId] : undefined;
          const when = item.startsAt
            ? formatDate(item.startsAt, ctx.locale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : item.scheduleNote;
          const status =
            item.availability === "open"
              ? t.sections.masterclasses.enrol
              : item.availability === "waitlist"
                ? t.sections.masterclasses.waitlist
                : t.sections.masterclasses.closed;
          return (
            <li
              key={item.id}
              className={section.variant === "cards" ? "card" : "row"}
              lang={langIf(item.textLang, ctx.locale)}
            >
              {section.variant === "cards" && cover && (
                <div className="card-img">
                  <Picture media={cover} sizes="(min-width: 1024px) 30vw, 90vw" decorative />
                </div>
              )}
              <div className="card-body">
                <p className="meta">
                  {[t.sections.masterclasses.format[item.format], item.location, when]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <h3 className="title">
                  <SiteLink href={`/masterclasses/${item.slug}`} className="card-link">
                    {item.title}
                  </SiteLink>
                </h3>
                {item.summary && <p className="body">{item.summary}</p>}
                <p className="card-foot">
                  {item.priceLabel && <span className="meta">{item.priceLabel}</span>}
                  <span className={`pill pill--${item.availability}`}>{status}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}

function EventRow({ event, locale }: { event: EventCard; locale: Locale }) {
  const t = useT();
  const zone = event.timeZone || "Europe/Nicosia";
  const day = formatDate(event.startsAt, locale, { day: "numeric" }, zone);
  const month = formatDate(event.startsAt, locale, { month: "short" }, zone);
  const full = formatWhen(event.startsAt, locale, { weekday: true, time: true, timeZone: zone });
  const place = event.online
    ? t.sections.events.online
    : [event.venue, event.city].filter(Boolean).join(", ");
  return (
    <li className="event" lang={langIf(event.textLang, locale)}>
      <time className="event-date" dateTime={event.startsAt} aria-label={full}>
        <span className="event-day">{day}</span>
        <span className="event-month">{caps(month)}</span>
      </time>
      <div className="event-body">
        <h3 className="title">
          <SiteLink href={`/events/${event.slug}`}>{event.title}</SiteLink>
        </h3>
        <p className="meta">
          {place && (
            <>
              <Icon name={event.online ? "globe" : "pin"} />
              <span>{place}</span>
            </>
          )}
        </p>
        {event.summary && <p className="body">{event.summary}</p>}
      </div>
      {event.ticketUrl && (
        <a
          className="btn btn-quiet btn-sm"
          href={event.ticketUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t.sections.events.tickets}
          <Icon name="arrow-ext" />
        </a>
      )}
    </li>
  );
}

export function Events({ section, ctx }: Props<"events">) {
  const t = useT();
  const p = section.props;
  const upcoming = section.data?.upcoming ?? [];
  const past = section.data?.past ?? [];
  if (upcoming.length === 0 && past.length === 0) return null;
  return (
    <SectionShell section={section} ctx={ctx} labelled={!!p.title} label={p.eyebrow}>
      <SectionHead section={section} ctx={ctx} title={p.title} />
      {upcoming.length === 0 ? (
        <Empty text={t.sections.events.empty} />
      ) : (
        <ul className="events">
          {upcoming.map((event) => (
            <EventRow key={event.id} event={event} locale={ctx.locale} />
          ))}
        </ul>
      )}
      {past.length > 0 && (
        <details className="past">
          <summary className="label">
            {caps(t.sections.events.past)}
            <Icon name="chev-down" />
          </summary>
          <ul className="events events--past">
            {past.map((event) => (
              <EventRow key={event.id} event={event} locale={ctx.locale} />
            ))}
          </ul>
        </details>
      )}
    </SectionShell>
  );
}

export function Press({ section, media, ctx }: Props<"press">) {
  const t = useT();
  const p = section.props;
  const items = section.data?.items ?? [];
  if (items.length === 0) return null;
  if (section.variant === "logo_row") {
    return (
      <SectionShell section={section} ctx={ctx} labelled={!!p.title} label={p.eyebrow}>
        <SectionHead section={section} ctx={ctx} title={p.title} />
        <ul className="press-logos">
          {items.map((item) => {
            const logo = item.logoMediaId ? media[item.logoMediaId] : undefined;
            const content = logo ? (
              <Picture media={{ ...logo, alt: item.outlet }} sizes="160px" />
            ) : (
              <span className="press-name">{item.outlet}</span>
            );
            return (
              <li key={item.id}>
                {item.url ? (
                  <a
                    href={item.url}
                    rel="noopener noreferrer"
                    target="_blank"
                    aria-label={fmt(t.sections.press.read, { outlet: item.outlet })}
                  >
                    {content}
                  </a>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      </SectionShell>
    );
  }
  return (
    <SectionShell section={section} ctx={ctx} labelled={!!p.title} label={p.eyebrow}>
      <SectionHead section={section} ctx={ctx} title={p.title} />
      <ul className="rows press-list">
        {items.map((item) => (
          <li key={item.id} className="row">
            <p className="label label--accent">{caps(item.outlet)}</p>
            <h3 className="title">
              {item.url ? (
                <a href={item.url} rel="noopener noreferrer" target="_blank">
                  {item.headline}
                  <Icon name="arrow-ext" />
                </a>
              ) : (
                item.headline
              )}
            </h3>
            {item.publishedOn && <p className="meta">{formatDate(item.publishedOn, ctx.locale)}</p>}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

export function FoundationStories({ section, media, ctx }: Props<"foundation_stories">) {
  const t = useT();
  const p = section.props;
  const stories = section.data?.stories ?? [];
  if (stories.length === 0) return null;
  return (
    <SectionShell section={section} ctx={ctx} labelled={!!p.title} label={p.eyebrow}>
      <SectionHead section={section} ctx={ctx} title={p.title} />
      <ul className={section.variant === "list" ? "rows" : "cards"}>
        {stories.map((story) => {
          const cover = story.coverMediaId ? media[story.coverMediaId] : undefined;
          return (
            <li
              key={story.id}
              className={section.variant === "list" ? "row" : "card"}
              lang={langIf(story.textLang, ctx.locale)}
            >
              {section.variant !== "list" && cover && (
                <div className="card-img">
                  <Picture media={cover} sizes="(min-width: 1024px) 30vw, 90vw" decorative />
                </div>
              )}
              <div className="card-body">
                {story.category && <p className="label label--accent">{caps(story.category)}</p>}
                <h3 className="title">
                  <SiteLink href={`/foundation/stories/${story.slug}`} className="card-link">
                    {story.title}
                  </SiteLink>
                </h3>
                {story.summary && <p className="body">{story.summary}</p>}
                <p className="meta">
                  {[story.personName, story.location].filter(Boolean).join(" · ")}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}

function CopyButton({ text }: { text: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-quiet btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      <Icon name={copied ? "check" : "copy"} />
      <span aria-live="polite">
        {copied ? t.sections.mediaKit.copied : t.sections.mediaKit.copy}
      </span>
    </button>
  );
}

export function MediaKit({ section, media, ctx }: Props<"media_kit">) {
  const t = useT();
  const p = section.props;
  const downloads = p.downloadMediaIds.map((id) => media[id]).filter(Boolean);
  const longText = p.longBio
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (
    <SectionShell section={section} ctx={ctx} labelled={!!p.title} label={p.eyebrow}>
      <SectionHead section={section} ctx={ctx} title={p.title} />
      <div className="kit">
        <div className="kit-bio">
          <div className="kit-head">
            <h3 className="label">{caps(t.sections.mediaKit.shortBio)}</h3>
            <CopyButton text={p.shortBio} />
          </div>
          <p className="body" lang={keyLang(section, "shortBio")}>
            {p.shortBio}
          </p>
        </div>
        {longText && (
          <div className="kit-bio">
            <div className="kit-head">
              <h3 className="label">{caps(t.sections.mediaKit.longBio)}</h3>
              <CopyButton text={longText} />
            </div>
            <div lang={keyLang(section, "longBio")}>
              <RichHtml html={p.longBio} />
            </div>
          </div>
        )}
      </div>
      {downloads.length > 0 && (
        <>
          <h3 className="label kit-downloads-title">{caps(t.sections.mediaKit.downloads)}</h3>
          <ul className="kit-downloads">
            {downloads.map((asset) => (
              <li key={asset!.id}>
                {asset!.kind === "image" && (
                  <Picture media={asset} sizes="(min-width: 1024px) 18vw, 45vw" decorative />
                )}
                <a className="link" href={asset!.src} download>
                  <Icon name="arrow-down" />
                  <span>
                    {t.sections.mediaKit.download}
                    <span className="sr-only">: {asset!.alt || asset!.caption}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionShell>
  );
}
