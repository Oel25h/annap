/**
 * The opening of a collection item's page, in place of the title band: the
 * book with its formats, the post with its text, the product with its buy
 * button, and so on. The page's one H1 is here.
 */
import { useId, type ReactNode } from "react";
import { field, Honeypot, useFormAction } from "@/components/forms/useFormAction";
import { CheckoutButton } from "@/components/site/CheckoutButton";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import { useLocale, useT } from "@/lib/i18n/context";
import { fmt, formatDate, formatMoney } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import { joinWaitlist } from "@/lib/forms.functions";
import { BookCover, Offers } from "@/sections/components/BookSections";
import type { ItemIntro as Intro, MediaMap, PostCard } from "@/sections/types";
import { Picture } from "../render/Picture";
import { Lines, RichHtml } from "../render/text";

type IntroProps<K extends Intro["kind"]> = {
  intro: Extract<Intro, { kind: K }>;
  media: MediaMap;
  locale: Locale;
  listenAnchor: string | null;
};

const langIf = (lang: Locale, page: Locale) => (lang !== page ? lang : undefined);

/** "All books", above the title. */
function Back({ kind }: { kind: Intro["kind"] }) {
  const t = useT();
  const href = {
    book: "/books",
    post: "/blog",
    product: "/shop",
    masterclass: "/masterclasses",
    event: "/events",
    story: "/foundation",
  }[kind];
  return (
    <p className="item-back">
      <SiteLink className="link-quiet" href={href}>
        <Icon name="chev-left" />
        {t.items.back[kind]}
      </SiteLink>
    </p>
  );
}

/** A short run of meta facts, separated by dots drawn in CSS. */
function MetaRow({ items }: { items: (string | null | false | undefined)[] }) {
  const shown = items.filter(Boolean) as string[];
  if (shown.length === 0) return null;
  return (
    <p className="meta dots">
      {shown.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </p>
  );
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  const shown = rows.filter(([, value]) => value);
  if (shown.length === 0) return null;
  return (
    <dl className="item-facts">
      {shown.map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Included({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="item-block">
      <h2 className="title">{title}</h2>
      <ul className="ticks">
        {items.map((item) => (
          <li key={item}>
            <Icon name="check" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------

function BookIntro({ intro, media, locale, listenAnchor }: IntroProps<"book">) {
  const t = useT();
  const { book } = intro;
  return (
    <header className="item-intro item-intro--book band-ivory">
      <div className="wrap">
        <Back kind="book" />
        <div className="book-grid">
          <div className="book-cover">
            <BookCover book={book} media={media} sizes="(min-width: 1024px) 420px, 70vw" priority />
          </div>
          <div className="book-body" lang={langIf(book.textLang, locale)}>
            <h1 className="display-l">{book.title}</h1>
            {book.subtitle && <p className="book-sub">{book.subtitle}</p>}
            {book.description && (
              <p className="body">
                <Lines text={book.description} />
              </p>
            )}
            {intro.whoFor && (
              <div className="item-block">
                <h2 className="title">{t.items.book.whoFor}</h2>
                <p className="body">
                  <Lines text={intro.whoFor} />
                </p>
              </div>
            )}
            <Offers book={book} listenAnchor={listenAnchor} />
            {book.freeDownload && (
              <p className="item-actions">
                <a className="link" href="#free-ebook">
                  {t.items.book.freeEbook}
                  <Icon name="arrow-down" />
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function RelatedPosts({
  posts,
  media,
  locale,
}: {
  posts: PostCard[];
  media: MediaMap;
  locale: Locale;
}) {
  const t = useT();
  const id = useId();
  if (posts.length === 0) return null;
  return (
    <section className="chapter band-ivory item-related" aria-labelledby={id}>
      <div className="wrap">
        <div className="shead">
          <h2 id={id} className="display-m">
            {t.items.post.related}
          </h2>
        </div>
        <div className="index index--grid">
          {posts.map((post) => {
            const href = `/blog/${post.slug}`;
            return (
              <article className="story" key={post.id} lang={langIf(post.textLang, locale)}>
                {post.coverMediaId && media[post.coverMediaId] && (
                  <SiteLink className="story-img" href={href} tabIndex={-1} aria-hidden="true">
                    <Picture
                      media={media[post.coverMediaId]}
                      sizes="(min-width: 1024px) 30vw, 90vw"
                      decorative
                    />
                  </SiteLink>
                )}
                <MetaRow items={[post.category?.name, formatDate(post.publishedAt, locale)]} />
                <div className="story-text">
                  <h3 className="story-title">
                    <SiteLink href={href}>{post.title}</SiteLink>
                  </h3>
                  {post.excerpt && <p className="body excerpt">{post.excerpt}</p>}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PostIntro({ intro, media, locale }: IntroProps<"post">) {
  const t = useT();
  const { post } = intro;
  const cover = post.coverMediaId ? media[post.coverMediaId] : undefined;
  return (
    <>
      <article
        className="item-intro item-intro--post band-ivory"
        lang={langIf(post.textLang, locale)}
      >
        <div className="wrap">
          <header className="article-head">
            <Back kind="post" />
            {post.category && (
              <p className="item-kicker">
                <SiteLink href={`/blog?category=${encodeURIComponent(post.category.slug)}`}>
                  {post.category.name}
                </SiteLink>
              </p>
            )}
            <h1 className="display-l">{post.title}</h1>
            {post.excerpt && <p className="lead">{post.excerpt}</p>}
            <MetaRow
              items={[
                formatDate(post.publishedAt, locale),
                post.readingMinutes
                  ? fmt(t.sections.posts.minutes, { m: post.readingMinutes })
                  : null,
              ]}
            />
          </header>
          {cover && (
            <figure className="article-cover">
              <Picture media={cover} sizes="(min-width: 1180px) 1152px, 100vw" priority />
              {cover.caption && <figcaption className="caption">{cover.caption}</figcaption>}
            </figure>
          )}
          <RichHtml html={intro.bodyHtml} className="prose article-body" />
        </div>
      </article>
      <RelatedPosts posts={intro.related} media={media} locale={locale} />
    </>
  );
}

function ProductIntro({ intro, media, locale }: IntroProps<"product">) {
  const t = useT();
  const { product } = intro;
  const cover = product.coverMediaId ? media[product.coverMediaId] : undefined;
  const price =
    product.priceCents !== null
      ? product.priceCents === 0
        ? t.sections.products.free
        : formatMoney(product.priceCents, product.currency, locale)
      : product.priceLabel;
  return (
    <header className="item-intro item-intro--product band-ivory">
      <div className="wrap">
        <Back kind="product" />
        <div className="item-grid">
          <div className="item-media">
            {cover && <Picture media={cover} sizes="(min-width: 1024px) 40vw, 100vw" priority />}
          </div>
          <div className="item-body" lang={langIf(product.textLang, locale)}>
            <h1 className="display-l">{product.name}</h1>
            {product.summary && <p className="lead">{product.summary}</p>}
            {price && (
              <p className="item-price">
                <span>{price}</span>
                {intro.compareAtCents !== null &&
                  product.priceCents !== null &&
                  intro.compareAtCents > product.priceCents && (
                    <s className="meta">
                      {fmt(t.items.product.was, {
                        price: formatMoney(intro.compareAtCents, product.currency, locale),
                      })}
                    </s>
                  )}
              </p>
            )}
            <div className="item-actions">
              {intro.buyHere ? (
                <CheckoutButton kind="product" id={product.id} label={t.items.product.buy} />
              ) : intro.externalUrl ? (
                <SiteLink className="btn btn-primary" href={intro.externalUrl}>
                  {t.items.product.get}
                  <Icon name={intro.externalUrl.startsWith("/") ? "arrow-right" : "arrow-ext"} />
                </SiteLink>
              ) : null}
            </div>
            {intro.stockNote && <p className="meta">{intro.stockNote}</p>}
            {intro.description && (
              <p className="body">
                <Lines text={intro.description} />
              </p>
            )}
            {intro.whoFor && intro.whoFor !== product.summary && (
              <div className="item-block">
                <h2 className="title">{t.items.product.whoFor}</h2>
                <p className="body">
                  <Lines text={intro.whoFor} />
                </p>
              </div>
            )}
            <Included title={t.items.product.included} items={intro.included} />
          </div>
        </div>
      </div>
    </header>
  );
}

/** First name and email: we'll write when places open. */
function WaitlistForm({ masterclassId }: { masterclassId: string }) {
  const t = useT();
  const locale = useLocale();
  const id = useId();
  const m = t.items.masterclass;
  const { state, sending, formProps, turnstileSlot } = useFormAction((data, turnstile) =>
    joinWaitlist({
      data: {
        masterclassId,
        firstName: field(data, "first_name"),
        email: field(data, "email"),
        locale,
        website: field(data, "website"),
        turnstile,
      },
    }),
  );
  if (state.step === "done") {
    return (
      <p className="status-note" role="status">
        <Icon name="check" />
        <span>{m.waitlistDone}</span>
      </p>
    );
  }
  return (
    <form className="item-form" aria-labelledby={`${id}-title`} {...formProps}>
      <h2 id={`${id}-title`} className="title">
        {m.waitlistTitle}
      </h2>
      <p className="body">{m.waitlistBody}</p>
      <div className="fields--two">
        <div className="field">
          <label htmlFor={`${id}-name`}>{t.sections.ebook.firstName}</label>
          <input
            id={`${id}-name`}
            name="first_name"
            autoComplete="given-name"
            required
            maxLength={80}
          />
        </div>
        <div className="field">
          <label htmlFor={`${id}-email`}>{t.sections.ebook.email}</label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={320}
          />
        </div>
      </div>
      <Honeypot />
      {turnstileSlot}
      <div className="form-foot">
        <button className="btn btn-primary" type="submit" aria-disabled={sending || undefined}>
          {sending ? t.sections.forms.sending : m.waitlistButton}
        </button>
        <p className="fine">{m.privacy}</p>
      </div>
      <p className="form-status" role="status" aria-live="polite">
        {state.step === "error" && (
          <span className="field-error">
            <Icon name="alert" />
            {state.message}
          </span>
        )}
      </p>
    </form>
  );
}

function MasterclassIntro({ intro, media, locale }: IntroProps<"masterclass">) {
  const t = useT();
  const m = t.items.masterclass;
  const { masterclass } = intro;
  const cover = masterclass.coverMediaId ? media[masterclass.coverMediaId] : undefined;
  const when = [
    masterclass.startsAt
      ? formatDate(masterclass.startsAt, locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "",
    masterclass.scheduleNote,
  ]
    .filter(Boolean)
    .join(". ");
  const where = [t.sections.masterclasses.format[masterclass.format], masterclass.location]
    .filter(Boolean)
    .join(", ");

  let action: ReactNode = null;
  if (masterclass.availability === "waitlist") {
    action = <WaitlistForm masterclassId={masterclass.id} />;
  } else if (masterclass.availability === "closed") {
    action = <p className="body">{m.closed}</p>;
  } else if (intro.enrolProductId) {
    action = <CheckoutButton kind="product" id={intro.enrolProductId} label={m.enrol} />;
  } else if (intro.enrolUrl) {
    action = (
      <SiteLink className="btn btn-primary" href={intro.enrolUrl}>
        {m.enrol}
        <Icon name={intro.enrolUrl.startsWith("/") ? "arrow-right" : "arrow-ext"} />
      </SiteLink>
    );
  }

  return (
    <header className="item-intro item-intro--masterclass band-ivory">
      <div className="wrap">
        <Back kind="masterclass" />
        <div className="item-grid">
          <div className="item-body" lang={langIf(masterclass.textLang, locale)}>
            <h1 className="display-l">{masterclass.title}</h1>
            {masterclass.summary && <p className="lead">{masterclass.summary}</p>}
            <Facts
              rows={[
                [m.when, when],
                [m.where, where],
                [m.price, masterclass.priceLabel],
              ]}
            />
            {action && <div className="item-actions">{action}</div>}
            {intro.description && (
              <p className="body">
                <Lines text={intro.description} />
              </p>
            )}
            <Included title={m.included} items={intro.included} />
          </div>
          <div className="item-media">
            {cover && <Picture media={cover} sizes="(min-width: 1024px) 40vw, 100vw" priority />}
          </div>
        </div>
      </div>
    </header>
  );
}

function EventIntro({ intro, media, locale }: IntroProps<"event">) {
  const t = useT();
  const e = t.items.event;
  const { event } = intro;
  const cover = event.coverMediaId ? media[event.coverMediaId] : undefined;
  const ended = new Date(event.endsAt ?? event.startsAt).getTime() < Date.now();
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  const when = formatDate(event.startsAt, locale, dateOptions, event.timeZone);
  const where = event.online ? e.online : [event.venue, event.city].filter(Boolean).join(", ");
  return (
    <header className="item-intro item-intro--event band-ivory">
      <div className="wrap">
        <Back kind="event" />
        <div className="item-grid">
          <div className="item-body" lang={langIf(event.textLang, locale)}>
            <h1 className="display-l">{event.title}</h1>
            <Facts
              rows={[
                [
                  e.when,
                  <>
                    {when}
                    <span className="meta"> {fmt(e.timeZone, { zone: event.timeZone })}</span>
                  </>,
                ],
                [e.where, where],
              ]}
            />
            {ended ? (
              <p className="meta">{e.past}</p>
            ) : event.ticketUrl ? (
              <p className="item-actions">
                <SiteLink className="btn btn-primary" href={event.ticketUrl}>
                  {e.tickets}
                  <Icon name={event.ticketUrl.startsWith("/") ? "arrow-right" : "arrow-ext"} />
                </SiteLink>
              </p>
            ) : null}
            {event.summary && (
              <p className="body">
                <Lines text={event.summary} />
              </p>
            )}
          </div>
          <div className="item-media">
            {cover && <Picture media={cover} sizes="(min-width: 1024px) 40vw, 100vw" priority />}
          </div>
        </div>
      </div>
    </header>
  );
}

function StoryIntro({ intro, media, locale }: IntroProps<"story">) {
  const { story } = intro;
  const cover = story.coverMediaId ? media[story.coverMediaId] : undefined;
  return (
    <article
      className="item-intro item-intro--post band-ivory"
      lang={langIf(story.textLang, locale)}
    >
      <div className="wrap">
        <header className="article-head">
          <Back kind="story" />
          {story.category && <p className="item-kicker">{story.category}</p>}
          <h1 className="display-l">{story.title}</h1>
          {story.summary && <p className="lead">{story.summary}</p>}
          <MetaRow items={[story.personName, story.location]} />
        </header>
        {cover && (
          <figure className="article-cover">
            <Picture media={cover} sizes="(min-width: 1180px) 1152px, 100vw" priority />
            {cover.caption && <figcaption className="caption">{cover.caption}</figcaption>}
          </figure>
        )}
        <RichHtml html={intro.bodyHtml} className="prose article-body" />
      </div>
    </article>
  );
}

export function ItemIntro(props: {
  intro: Intro;
  media: MediaMap;
  locale: Locale;
  listenAnchor: string | null;
}) {
  const { intro } = props;
  switch (intro.kind) {
    case "book":
      return <BookIntro {...props} intro={intro} />;
    case "post":
      return <PostIntro {...props} intro={intro} />;
    case "product":
      return <ProductIntro {...props} intro={intro} />;
    case "masterclass":
      return <MasterclassIntro {...props} intro={intro} />;
    case "event":
      return <EventIntro {...props} intro={intro} />;
    case "story":
      return <StoryIntro {...props} intro={intro} />;
  }
}
