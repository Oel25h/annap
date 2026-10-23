import { Link, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import { useLocale, useT } from "@/lib/i18n/context";
import { fmt, formatDate, formatMoney, formatWhen } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import { nb } from "@/lib/i18n/rag";
import type {
  EventCard,
  MasterclassCard,
  MediaMap,
  PostCard,
  RenderedSection,
  ResolvedMedia,
} from "@/sections/types";
import { Picture } from "../render/Picture";
import {
  headLink,
  keyLang,
  SectionShell,
  TextLink,
  type HeadLink,
  type SectionContext,
} from "../render/SectionShell";
import { InEnglish, Lines, RichHtml } from "../render/text";

type Props<T extends RenderedSection["type"]> = {
  section: RenderedSection<T>;
  media: MediaMap;
  ctx: SectionContext;
};

type Level = "h2" | "h3";

const langIf = (lang: Locale, page: Locale) => (lang !== page ? lang : undefined);
/** Text that is only ever stored in English (foundation story categories, names and places, price labels). */
const englishOn = (page: Locale) => langIf("en", page);

/**
 * Headings inside a section sit one level under the section's own: h3 under
 * an h2, h2 when the section title is the page h1 (/blog, /shop, /events) or
 * when the section has no title.
 */
const itemLevel = (ctx: SectionContext, titled: boolean): Level =>
  titled && ctx.headingLevel === "h2" ? "h3" : "h2";

/** The section's heading row: its title, and its link when it has one. */
const titleHead = (section: RenderedSection & { props: { title: string } }) => ({
  title: section.props.title,
  titleLang: keyLang(section, "title"),
});

/** A tile spanning four columns (405px at 1440), two up from 720. */
const TILE_SIZES =
  "(min-width: 1440px) 405px, (min-width: 1024px) 30vw, (min-width: 720px) 45vw, calc(100vw - 32px)";
/** The lead story's 3:2 photo on columns 7–12 (627px at 1440). */
const LEAD_SIZES = "(min-width: 1440px) 627px, (min-width: 1024px) 45vw, 100vw";

/** What is missing, and one next step. Left-aligned and roman, between hairlines. */
export function Empty({
  text,
  link,
  children,
}: {
  text: string;
  link?: HeadLink | null;
  /** A next step that is not a plain link. */
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <p className="body">{text}</p>
      {link && <TextLink link={link} />}
      {children}
    </div>
  );
}

/**
 * An open tile: the photo, then the words, with no border or fill. The
 * title's link stretches over the whole tile, so it is one target and one stop.
 */
function Tile({
  Item,
  href,
  title,
  lang,
  linkLang = lang,
  cover,
  upright = false,
  label,
  children,
}: {
  Item: Level;
  href: string;
  title: string;
  /** The language of the item's own words, set on the title's link; its text sets its own. */
  lang?: Locale;
  /** The language of the page the link opens, when it isn't the item's own (null: unknown). */
  linkLang?: Locale | null;
  cover?: ResolvedMedia;
  /** A book or eBook cover, at 3:4 rather than 3:2. */
  upright?: boolean;
  /** Above the title: a category or type label. */
  label?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li>
      <article className={upright ? "tile tile--cover" : "tile"}>
        <Picture media={cover} sizes={TILE_SIZES} decorative />
        {label}
        <Item className="title">
          <SiteLink className="tile-link" href={href} lang={lang} hrefLang={linkLang ?? undefined}>
            {title}
          </SiteLink>
          <InEnglish target={linkLang} />
        </Item>
        {children}
      </article>
    </li>
  );
}

/** A hairline row: meta on columns 1–3, the words on 4–10, an aside on 11–12. */
function Row({
  meta,
  aside,
  children,
}: {
  meta: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li>
      <div className="row-meta">{meta}</div>
      <div className="row-text">{children}</div>
      {aside && <div className="row-aside">{aside}</div>}
    </li>
  );
}

/** "March 12, 2026 · 7 min read": the dot hangs at the end of each item. */
function Dots({ items, lang }: { items: ReactNode[]; lang?: Locale }) {
  const shown = items.filter(
    (item) => item !== null && item !== undefined && item !== false && item !== "",
  );
  if (shown.length === 0) return null;
  return (
    <span className="dots meta" lang={lang}>
      {shown.map((item, index) => (
        <span key={index}>{item}</span>
      ))}
    </span>
  );
}

/** A date as `<time>`, or null when there is none. */
function when(value: string | null, locale: Locale): ReactNode {
  const text = formatDate(value, locale);
  return value && text ? <time dateTime={value}>{text}</time> : null;
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

function StoryMeta({ post, locale }: { post: PostCard; locale: Locale }) {
  const t = useT();
  const m = post.readingMinutes;
  return (
    <Dots
      items={[
        when(post.publishedAt, locale),
        m ? (m === 1 ? t.sections.posts.minutesOne : fmt(t.sections.posts.minutes, { m })) : null,
      ]}
    />
  );
}

/** A story's title link; an English story on /el says so, outside the English words. */
function StoryTitle({
  post,
  Item,
  locale,
  className = "title",
}: {
  post: PostCard;
  Item: Level;
  locale: Locale;
  className?: string;
}) {
  const lang = langIf(post.textLang, locale);
  return (
    <Item className={className}>
      <SiteLink href={`/blog/${post.slug}`} lang={lang} hrefLang={lang}>
        {className === "title" ? post.title : nb(post.title)}
      </SiteLink>
      <InEnglish target={lang} />
    </Item>
  );
}

/** The one lead story: its words on columns 1–5, its 3:2 photo on 7–12 (text first on phones). */
function LeadStory({
  post,
  media,
  locale,
  Item,
}: {
  post: PostCard;
  media: MediaMap;
  locale: Locale;
  Item: Level;
}) {
  const t = useT();
  const href = `/blog/${post.slug}`;
  const cover = post.coverMediaId ? media[post.coverMediaId] : undefined;
  const photo = cover?.kind === "image";
  const lang = langIf(post.textLang, locale);
  return (
    <article className={photo ? "lead-story" : "lead-story lead-story--text"}>
      <div className="lead-text">
        {post.category && <p className="label label--accent">{post.category.name}</p>}
        <StoryTitle post={post} Item={Item} locale={locale} className="display-l" />
        {post.excerpt && (
          <p className="body" lang={lang}>
            {post.excerpt}
          </p>
        )}
        <p className="lead-meta">
          <StoryMeta post={post} locale={locale} />
        </p>
        <SiteLink className="link" href={href} hrefLang={lang}>
          {t.sections.posts.read}
          <span className="sr-only">
            : <span lang={lang}>{post.title}</span>
          </span>
          <Icon name="arrow-right" />
        </SiteLink>
      </div>
      {photo && (
        // The photo repeats the title's link for the pointer only.
        <SiteLink className="lead-img" href={href} tabIndex={-1} aria-hidden="true">
          <Picture media={cover} sizes={LEAD_SIZES} decorative />
        </SiteLink>
      )}
    </article>
  );
}

/** A text row: category, date and read time on columns 1–3; title and, from 720, excerpt on 4–10. */
function StoryRow({ post, locale, Item }: { post: PostCard; locale: Locale; Item: Level }) {
  return (
    <article className="story-row">
      <p className="story-meta">
        {post.category && <span className="label label--accent">{post.category.name}</span>}
        <StoryMeta post={post} locale={locale} />
      </p>
      <div className="story-text">
        <StoryTitle post={post} Item={Item} locale={locale} />
        {post.excerpt && (
          <p className="body excerpt" lang={langIf(post.textLang, locale)}>
            {post.excerpt}
          </p>
        )}
      </div>
    </article>
  );
}

/**
 * A link within the stories index: a theme, a page, or the next step from an
 * empty theme. The router calls any link to the current path "current", so
 * these match the whole address and the filter says which theme is current.
 * The page stays a number, so the address reads ?page=2; page 1 and "all"
 * stay off it.
 */
function IndexLink({
  base,
  category,
  page = 1,
  current = false,
  className,
  rel,
  children,
}: {
  base: string;
  category: string | null;
  page?: number;
  current?: boolean;
  className: string;
  rel?: "prev" | "next";
  children: ReactNode;
}) {
  const locale = useLocale();
  const search = {
    ...(category ? { category } : {}),
    ...(page > 1 ? { page } : {}),
    ...(locale === "el" ? { lang: "el" } : {}),
  };
  const state = { "aria-current": current ? ("page" as const) : undefined };
  return (
    <Link
      to={base as "/"}
      search={search as never}
      className={className}
      rel={rel}
      activeOptions={{ exact: true, includeSearch: true }}
      activeProps={state}
      inactiveProps={state}
    >
      {children}
    </Link>
  );
}

/**
 * Stories (DESIGN.md §9). At home: one lead story, then text rows, then
 * "Browse by theme". On the stories index (`paginate`) the themes sit above
 * as chips, the lead shows on page 1 only and a pager follows; an empty theme
 * says so and offers another. The grid layout sets the rest as tiles.
 */
export function LatestPosts({ section, media, ctx }: Props<"latest_posts">) {
  const t = useT();
  const p = section.props;
  const posts = section.data?.posts ?? [];
  const categories = section.data?.categories ?? [];
  const pagination = section.data?.pagination ?? null;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const Item = itemLevel(ctx, !!p.title.trim());
  const base = pagination ? pathname : "/blog";
  const current = pagination?.category ?? null;
  const head = {
    ...titleHead(section),
    link: headLink(p.link, t.sections.posts.allStories, keyLang(section, "link.label")),
  };

  let list: ReactNode;
  if (posts.length === 0) {
    const name = categories.find((c) => c.slug === current)?.name;
    // The next step is the first theme that has stories.
    const other = categories.find((c) => c.slug !== current && c.count > 0);
    list = name ? (
      <Empty text={fmt(t.sections.posts.emptyCategory, { category: name })}>
        <IndexLink className="link" base={base} category={other?.slug ?? null}>
          {other
            ? fmt(t.sections.posts.startWith, { category: other.name })
            : t.sections.posts.allStories}
          <Icon name="arrow-right" />
        </IndexLink>
      </Empty>
    ) : (
      <Empty
        text={t.sections.posts.emptyAll}
        link={{ label: t.sections.posts.emptyNext, href: "/about" }}
      />
    );
  } else {
    const [lead, ...rest] = !pagination || pagination.page === 1 ? posts : [null, ...posts];
    list = (
      <>
        {lead && <LeadStory post={lead} media={media} locale={ctx.locale} Item={Item} />}
        {rest.length > 0 &&
          (section.variant === "grid" ? (
            <ul className="tiles story-tiles">
              {rest.map(
                (post) =>
                  post && (
                    <Tile
                      key={post.id}
                      Item={Item}
                      href={`/blog/${post.slug}`}
                      title={post.title}
                      lang={langIf(post.textLang, ctx.locale)}
                      cover={post.coverMediaId ? media[post.coverMediaId] : undefined}
                      label={
                        post.category && <p className="label label--accent">{post.category.name}</p>
                      }
                    >
                      <p className="tile-meta">
                        <StoryMeta post={post} locale={ctx.locale} />
                      </p>
                    </Tile>
                  ),
              )}
            </ul>
          ) : (
            <div className={lead ? "story-list" : "story-list story-list--first"}>
              {rest.map(
                (post) =>
                  post && <StoryRow key={post.id} post={post} locale={ctx.locale} Item={Item} />,
              )}
            </div>
          ))}
      </>
    );
  }

  const themesId = `${ctx.headingId}-themes`;
  return (
    <SectionShell section={section} ctx={ctx} head={head}>
      {pagination && categories.length > 0 && (
        <nav className="chips index-themes" aria-label={t.sections.posts.themes}>
          <IndexLink className="chip" base={base} category={null} current={current === null}>
            {t.sections.posts.allStories}
          </IndexLink>
          {categories.map((c) => (
            <IndexLink
              key={c.slug}
              className="chip"
              base={base}
              category={c.slug}
              current={c.slug === current}
            >
              {c.name}
            </IndexLink>
          ))}
        </nav>
      )}
      {list}
      {!pagination && categories.length > 0 && (
        <nav className="themes" aria-labelledby={themesId}>
          <span className="meta" id={themesId}>
            {t.sections.posts.themes}
          </span>
          {categories.map((c) => (
            <SiteLink key={c.slug} href={`/blog?category=${encodeURIComponent(c.slug)}`}>
              {c.name}
            </SiteLink>
          ))}
        </nav>
      )}
      {pagination && pagination.pages > 1 && (
        <nav className="pager" aria-label={t.sections.posts.pages}>
          {pagination.page > 1 && (
            <IndexLink
              className="link-quiet"
              rel="prev"
              base={base}
              category={current}
              page={pagination.page - 1}
            >
              <Icon name="chev-left" />
              {t.sections.posts.newerStories}
            </IndexLink>
          )}
          <p className="meta pager-count">
            {fmt(t.sections.posts.pageOf, { n: pagination.page, total: pagination.pages })}
          </p>
          {pagination.page < pagination.pages && (
            <IndexLink
              className="link-quiet"
              rel="next"
              base={base}
              category={current}
              page={pagination.page + 1}
            >
              {t.sections.posts.olderStories}
              <Icon name="chev-right" />
            </IndexLink>
          )}
        </nav>
      )}
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

/**
 * Reader reviews in the review pattern: a hairline above, the words in
 * lead-size roman, the credit "Name, Place" in meta. One review sits on
 * columns 1–8; several share a row of four-column reviews that scrolls
 * sideways when there are more than fit.
 */
export function Testimonials({ section, ctx }: Props<"testimonials">) {
  const t = useT();
  const items = section.data?.items ?? [];
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ overflow: false, start: true, end: true });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ overflow: max > 1, start: el.scrollLeft <= 1, end: el.scrollLeft >= max - 1 });
  }, []);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  if (items.length === 0) return null;
  const single = section.variant === "single" || items.length === 1;
  const shown = single ? items.slice(0, 1) : items;
  const move = (direction: 1 | -1) => {
    const el = track.current;
    const step = (el?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
    // The stylesheet decides the glide, so reduced motion makes the jump instant.
    el?.scrollBy({ left: direction * step });
  };

  return (
    <SectionShell section={section} ctx={ctx} head={titleHead(section)}>
      <ul
        ref={single ? undefined : track}
        className={single ? "reviews reviews--single grid-12" : "reviews reviews--track"}
        onScroll={single ? undefined : measure}
        // The track scrolls from the keyboard too.
        tabIndex={!single && edges.overflow ? 0 : undefined}
        aria-labelledby={
          !single && edges.overflow && section.props.title ? ctx.headingId : undefined
        }
      >
        {shown.map((item) => (
          <li key={item.id}>
            <figure className="review" lang={langIf(item.textLang, ctx.locale)}>
              <blockquote>
                <p>
                  <Lines text={item.quote} />
                </p>
              </blockquote>
              <figcaption className="meta">
                {[item.name, item.role].filter(Boolean).join(", ")}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
      {!single && edges.overflow && (
        <div className="track-ctl">
          {/* aria-disabled, not disabled: focus stays put when the first or last review is reached */}
          <button
            type="button"
            className="btn btn-quiet btn-sm icon-btn"
            aria-label={t.sections.testimonials.previous}
            aria-disabled={edges.start || undefined}
            onClick={() => !edges.start && move(-1)}
          >
            <Icon name="chev-left" />
          </button>
          <button
            type="button"
            className="btn btn-quiet btn-sm icon-btn"
            aria-label={t.sections.testimonials.next}
            aria-disabled={edges.end || undefined}
            onClick={() => !edges.end && move(1)}
          >
            <Icon name="chev-right" />
          </button>
        </div>
      )}
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Shop, masterclasses, foundation stories: tiles or rows
// ---------------------------------------------------------------------------

/** Product types shown as an upright cover (3:4). */
const UPRIGHT = new Set(["ebook", "book"]);

export function Products({ section, media, ctx }: Props<"products">) {
  const t = useT();
  const products = section.data?.products ?? [];
  const Item = itemLevel(ctx, !!section.props.title.trim());
  const types: Record<string, string> = t.sections.products.type;
  return (
    <SectionShell section={section} ctx={ctx} head={titleHead(section)}>
      {products.length === 0 ? (
        <Empty
          text={t.sections.products.empty}
          link={{ label: t.sections.products.emptyNext, href: "/books" }}
        />
      ) : (
        <ul className="tiles">
          {products.map((product) => {
            const lang = langIf(product.textLang, ctx.locale);
            const price =
              product.priceCents === 0
                ? t.sections.products.free
                : product.priceCents
                  ? formatMoney(product.priceCents, product.currency, ctx.locale)
                  : product.priceLabel;
            const type = types[product.productType];
            return (
              <Tile
                key={product.id}
                Item={Item}
                href={product.checkoutUrl ?? `/shop/${product.slug}`}
                title={product.name}
                lang={lang}
                // A bridge tile opens another page of this site, in the reader's language.
                linkLang={product.checkoutUrl ? null : lang}
                cover={product.coverMediaId ? media[product.coverMediaId] : undefined}
                upright={UPRIGHT.has(product.productType)}
                label={type && <p className="label label--accent">{type}</p>}
              >
                {product.summary && (
                  <p className="body" lang={lang}>
                    {product.summary}
                  </p>
                )}
                {price && (
                  // The free-text price label is only ever stored in English.
                  <p
                    className="meta"
                    lang={product.priceCents === null ? englishOn(ctx.locale) : undefined}
                  >
                    {price}
                  </p>
                )}
              </Tile>
            );
          })}
        </ul>
      )}
    </SectionShell>
  );
}

const STATUS_ICON = { open: "check", waitlist: "clock", closed: "lock" } as const;

/** Open, waitlist or closed: a quiet badge, an icon and a word, never Tangerine. */
function Status({ availability }: { availability: MasterclassCard["availability"] }) {
  const t = useT();
  const words = t.sections.masterclasses;
  const word =
    availability === "open"
      ? words.statusOpen
      : availability === "waitlist"
        ? words.statusWaitlist
        : words.closed;
  return (
    <span className="badge badge--quiet">
      <Icon name={STATUS_ICON[availability]} />
      {word}
    </span>
  );
}

export function Masterclasses({ section, media, ctx }: Props<"masterclasses">) {
  const t = useT();
  const items = section.data?.items ?? [];
  const Item = itemLevel(ctx, !!section.props.title.trim());
  const head = {
    ...titleHead(section),
    intro: section.props.intro,
    introLang: keyLang(section, "intro"),
  };
  const facts = (item: MasterclassCard) => (
    <Dots
      items={[
        item.startsAt
          ? when(item.startsAt, ctx.locale)
          : item.scheduleNote && (
              <span lang={langIf(item.textLang, ctx.locale)}>{item.scheduleNote}</span>
            ),
        t.sections.masterclasses.format[item.format],
        item.priceLabel,
      ]}
    />
  );
  const summary = (item: MasterclassCard) =>
    item.summary && (
      <p className="body" lang={langIf(item.textLang, ctx.locale)}>
        {item.summary}
      </p>
    );

  let list: ReactNode;
  if (items.length === 0) {
    list = (
      <Empty
        text={t.sections.masterclasses.empty}
        link={{ label: t.sections.masterclasses.emptyNext, href: "/contact" }}
      />
    );
  } else if (section.variant === "cards") {
    list = (
      <ul className="tiles">
        {items.map((item) => (
          <Tile
            key={item.id}
            Item={Item}
            href={`/masterclasses/${item.slug}`}
            title={item.title}
            lang={langIf(item.textLang, ctx.locale)}
            cover={item.coverMediaId ? media[item.coverMediaId] : undefined}
            label={<p className="tile-meta">{facts(item)}</p>}
          >
            <p className="tile-status">
              <Status availability={item.availability} />
            </p>
            {summary(item)}
          </Tile>
        ))}
      </ul>
    );
  } else {
    list = (
      <ul className="rows">
        {items.map((item) => {
          const lang = langIf(item.textLang, ctx.locale);
          return (
            <Row
              key={item.id}
              meta={facts(item)}
              aside={<Status availability={item.availability} />}
            >
              <Item className="title">
                <SiteLink href={`/masterclasses/${item.slug}`} lang={lang} hrefLang={lang}>
                  {item.title}
                </SiteLink>
                <InEnglish target={lang} />
              </Item>
              {summary(item)}
            </Row>
          );
        })}
      </ul>
    );
  }
  return (
    <SectionShell section={section} ctx={ctx} head={head}>
      {list}
    </SectionShell>
  );
}

export function FoundationStories({ section, media, ctx }: Props<"foundation_stories">) {
  const t = useT();
  const stories = section.data?.stories ?? [];
  const Item = itemLevel(ctx, !!section.props.title.trim());
  const category = (name: string) =>
    name && (
      <p className="label label--accent" lang={englishOn(ctx.locale)}>
        {name}
      </p>
    );

  let list: ReactNode;
  if (stories.length === 0) {
    list = (
      <Empty
        text={t.sections.stories.empty}
        link={{ label: t.sections.donation.donate, href: "#give" }}
      />
    );
  } else if (section.variant === "list") {
    list = (
      <ul className="rows">
        {stories.map((story) => {
          const lang = langIf(story.textLang, ctx.locale);
          return (
            <Row
              key={story.id}
              meta={
                <>
                  {category(story.category)}
                  <Dots items={[story.personName, story.location]} lang={englishOn(ctx.locale)} />
                </>
              }
            >
              <Item className="title">
                <SiteLink href={`/foundation/stories/${story.slug}`} lang={lang} hrefLang={lang}>
                  {story.title}
                </SiteLink>
                <InEnglish target={lang} />
              </Item>
              {story.summary && (
                <p className="body" lang={lang}>
                  {story.summary}
                </p>
              )}
            </Row>
          );
        })}
      </ul>
    );
  } else {
    list = (
      <ul className="tiles">
        {stories.map((story) => (
          <Tile
            key={story.id}
            Item={Item}
            href={`/foundation/stories/${story.slug}`}
            title={story.title}
            lang={langIf(story.textLang, ctx.locale)}
            cover={story.coverMediaId ? media[story.coverMediaId] : undefined}
            label={category(story.category)}
          >
            {story.summary && (
              <p className="body" lang={langIf(story.textLang, ctx.locale)}>
                {story.summary}
              </p>
            )}
            <p className="tile-meta">
              {/* Name and place are only ever served from the English row, like the category */}
              <Dots items={[story.personName, story.location]} lang={englishOn(ctx.locale)} />
            </p>
          </Tile>
        ))}
      </ul>
    );
  }
  return (
    <SectionShell section={section} ctx={ctx} head={titleHead(section)}>
      {list}
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** "Mar 12, 2026", "Thursday, 19:00" and the city or "Online", in the event's own time zone. */
function eventFacts(event: EventCard, locale: Locale, online: string) {
  const zone = event.timeZone || "Europe/Nicosia";
  const day = formatDate(
    event.startsAt,
    locale,
    { day: "numeric", month: "short", year: "numeric" },
    zone,
  );
  const weekday = formatDate(event.startsAt, locale, { weekday: "long" }, zone);
  const time = formatWhen(event.startsAt, locale, { time: true, timeZone: zone }).split(", ").pop();
  return {
    day,
    when: [weekday, time].filter(Boolean).join(", "),
    place: event.online ? online : event.city || event.venue,
  };
}

export function Events({ section, media, ctx }: Props<"events">) {
  const t = useT();
  const upcoming = section.data?.upcoming ?? [];
  const past = section.data?.past ?? [];
  const Item = itemLevel(ctx, !!section.props.title.trim());

  const list = (events: EventCard[]) =>
    section.variant === "cards" ? (
      <ul className="tiles">
        {events.map((event) => {
          const { day, when, place } = eventFacts(event, ctx.locale, t.sections.events.online);
          return (
            <Tile
              key={event.id}
              Item={Item}
              href={`/events/${event.slug}`}
              title={event.title}
              lang={langIf(event.textLang, ctx.locale)}
              cover={event.coverMediaId ? media[event.coverMediaId] : undefined}
              label={
                <p className="label label--accent">
                  <time dateTime={event.startsAt}>{day}</time>
                </p>
              }
            >
              <p className="tile-meta">
                <Dots items={[when, place]} />
              </p>
            </Tile>
          );
        })}
      </ul>
    ) : (
      <ul className="rows">
        {events.map((event) => {
          const { day, when, place } = eventFacts(event, ctx.locale, t.sections.events.online);
          const lang = langIf(event.textLang, ctx.locale);
          return (
            <Row
              key={event.id}
              meta={
                <>
                  <p className="label label--accent">
                    <time dateTime={event.startsAt}>{day}</time>
                  </p>
                  <Dots items={[when, place]} />
                </>
              }
              aside={
                event.ticketUrl && (
                  <SiteLink className="btn btn-quiet btn-sm" href={event.ticketUrl} arrow>
                    {t.sections.events.tickets}
                  </SiteLink>
                )
              }
            >
              <Item className="title">
                <SiteLink href={`/events/${event.slug}`} lang={lang} hrefLang={lang}>
                  {event.title}
                </SiteLink>
                <InEnglish target={lang} />
              </Item>
              {event.summary && (
                <p className="body" lang={lang}>
                  {event.summary}
                </p>
              )}
            </Row>
          );
        })}
      </ul>
    );

  return (
    <SectionShell section={section} ctx={ctx} head={titleHead(section)}>
      {upcoming.length === 0 ? (
        <Empty
          text={t.sections.events.empty}
          link={{ label: t.sections.events.emptyNext, href: "/contact" }}
        />
      ) : (
        list(upcoming)
      )}
      {past.length > 0 && (
        <details className="past">
          <summary>
            <span className="title">{t.sections.events.pastEvents}</span>
            <Icon name="chev-down" />
          </summary>
          {list(past)}
        </details>
      )}
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Press and the media kit
// ---------------------------------------------------------------------------

export function Press({ section, ctx }: Props<"press">) {
  const t = useT();
  const items = section.data?.items ?? [];
  const Item = itemLevel(ctx, !!section.props.title.trim());

  let list: ReactNode;
  if (items.length === 0) {
    list = (
      <Empty
        text={t.sections.press.empty}
        link={{ label: t.sections.press.emptyNext, href: "/contact" }}
      />
    );
  } else if (section.variant === "logo_row") {
    // The outlets by name, as written: no logos, no filters.
    list = (
      <p className="press-names dots title">
        {items.map((item) =>
          item.url ? (
            <SiteLink key={item.id} href={item.url}>
              {item.outlet}
            </SiteLink>
          ) : (
            <span key={item.id}>{item.outlet}</span>
          ),
        )}
      </p>
    );
  } else {
    list = (
      <ul className="rows">
        {items.map((item) => (
          <Row
            key={item.id}
            meta={
              <>
                <p className="label">{item.outlet}</p>
                <Dots items={[when(item.publishedOn, ctx.locale)]} />
              </>
            }
          >
            <Item className="title">
              {item.url ? (
                <SiteLink className="press-link" href={item.url} arrow>
                  {item.headline}
                </SiteLink>
              ) : (
                item.headline
              )}
            </Item>
          </Row>
        ))}
      </ul>
    );
  }
  return (
    <SectionShell section={section} ctx={ctx} head={titleHead(section)}>
      {list}
    </SectionShell>
  );
}

/** Copies a bio; says "Copied" for two seconds, aloud too. */
function CopyButton({ text, label }: { text: string; label: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <p className="kit-copy">
      <button
        type="button"
        className="btn btn-quiet btn-sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        <Icon name={copied ? "check" : "copy"} />
        {copied ? t.sections.mediaKit.copied : label}
      </button>
      <span className="sr-only" role="status">
        {copied ? t.sections.mediaKit.copied : ""}
      </span>
    </p>
  );
}

/** The system's ratios for a download's preview: 3:2 wide, 3:4 a cover, 4:5 a portrait. */
function kitRatio(asset: ResolvedMedia): string {
  const { width, height } = asset;
  if (!width || !height) return "kit-thumb";
  if (width > height) return "kit-thumb kit-thumb--wide";
  return height / width >= 1.3 ? "kit-thumb kit-thumb--cover" : "kit-thumb";
}

/** For hosts and journalists: the short bio on 1–5, the long bio on 7–12, then the files. */
export function MediaKit({ section, media, ctx }: Props<"media_kit">) {
  const t = useT();
  const p = section.props;
  const Item = itemLevel(ctx, !!p.title.trim());
  const downloads = p.downloadMediaIds
    .map((id) => media[id])
    .filter((asset): asset is ResolvedMedia => !!asset);
  const longText = p.longBio
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (
    <SectionShell section={section} ctx={ctx} head={titleHead(section)}>
      <div className="kit">
        <div className="kit-bio">
          <Item className="title">{t.sections.mediaKit.shortBio}</Item>
          <p className="body" lang={keyLang(section, "shortBio")}>
            {p.shortBio}
          </p>
          <CopyButton text={p.shortBio} label={t.sections.mediaKit.copyShort} />
        </div>
        {longText && (
          <div className="kit-bio kit-bio--long">
            <Item className="title">{t.sections.mediaKit.longBio}</Item>
            <RichHtml html={p.longBio} className="body" lang={keyLang(section, "longBio")} />
            <CopyButton text={longText} label={t.sections.mediaKit.copyLong} />
          </div>
        )}
        {downloads.length > 0 && (
          <div className="kit-files">
            <Item className="title">{t.sections.mediaKit.downloads}</Item>
            <ul className="kit-downloads">
              {downloads.map((asset) => (
                <li key={asset.id}>
                  {asset.kind === "image" && (
                    <div className={kitRatio(asset)}>
                      <Picture
                        media={asset}
                        sizes="(min-width: 1440px) 296px, (min-width: 1024px) 22vw, 45vw"
                        decorative
                      />
                    </div>
                  )}
                  <a className="link" href={asset.original} download>
                    {t.sections.mediaKit.download}
                    {(asset.alt || asset.caption) && (
                      <span className="sr-only" lang={langIf(asset.textLang, ctx.locale)}>
                        : {asset.alt || asset.caption}
                      </span>
                    )}
                    <Icon name="arrow-down" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SectionShell>
  );
}
