/**
 * The opening of a collection item's page, in place of the title band: the
 * book with its formats, the post with its text, the product with its buy
 * button, and so on. The page's one h1 is here, on the 12-column grid, and
 * the intro ends with the way back to its collection as a plain link, when
 * that page is published.
 */
import { useId, type ReactNode } from "react";
import { EMAIL, field, Honeypot, useFormAction } from "@/components/forms/useFormAction";
import { CheckoutButton } from "@/components/site/CheckoutButton";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import { useLocale, useT } from "@/lib/i18n/context";
import { fmt, formatDate, formatMoney, formatWhen, utcOffset } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import { nb } from "@/lib/i18n/rag";
import { joinWaitlist } from "@/lib/forms.functions";
import { BookIntro } from "./BookIntro";
import type { ItemIntro as Intro, MediaMap, PostCard, ResolvedMedia } from "@/sections/types";
import { Picture } from "../render/Picture";
import { TextLink } from "../render/SectionShell";
import { InEnglish, Lines, RichHtml } from "../render/text";

type IntroProps<K extends Intro["kind"]> = {
  intro: Extract<Intro, { kind: K }>;
  media: MediaMap;
  locale: Locale;
  listenAnchor: string | null;
  /** The collection page is published: the way back to it has somewhere to go. */
  indexed: boolean;
};

const langIf = (lang: Locale, page: Locale) => (lang !== page ? lang : undefined);

/** Product types whose photo is a book cover (3:4), as in the shop's tiles. */
const UPRIGHT = new Set(["ebook", "book"]);

/** Where each kind of item is listed. */
const INDEX = {
  post: "/blog",
  product: "/shop",
  masterclass: "/masterclasses",
  event: "/events",
  story: "/foundation#stories",
} as const;

/** "All stories →": the intro's last line, back to the collection. */
function AllLink({
  kind,
  className = "item-foot",
}: {
  kind: keyof typeof INDEX;
  className?: string;
}) {
  const t = useT();
  return (
    <p className={className}>
      <TextLink link={{ label: t.items.back[kind], href: INDEX[kind] }} />
    </p>
  );
}

/** A short run of meta facts, separated by dots drawn in CSS. */
function Dots({ items }: { items: string[] }) {
  return (
    <span className="dots">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </span>
  );
}

/** "February 14, 2026 · 7 min read" */
function postMeta(
  post: PostCard,
  locale: Locale,
  minutes: { minutes: string; minutesOne: string },
): string[] {
  const m = post.readingMinutes;
  return [
    formatDate(post.publishedAt, locale),
    m ? (m === 1 ? minutes.minutesOne : fmt(minutes.minutes, { m })) : "",
  ].filter(Boolean);
}

/** Plain text from the studio as paragraphs: a blank line starts a new one. */
function paragraphs(text: string): string[] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function Text({ parts, lang }: { parts: string[]; lang?: Locale }) {
  if (parts.length === 0) return null;
  return (
    <div className="item-text" lang={lang}>
      {parts.map((part, index) => (
        <p key={index} className="body">
          <Lines text={part} />
        </p>
      ))}
    </div>
  );
}

/** A fact's value and note may each be the item's text (`lang`) or the page's (dates, formats). */
type Fact = { term: string; value: string; lang?: Locale; note?: string; noteLang?: Locale };

/** About's hairline-ruled facts (`.facts`): one per row on phones, three columns from 720. */
function Facts({ facts }: { facts: Fact[] }) {
  const shown = facts.filter((fact) => fact.value);
  if (shown.length === 0) return null;
  return (
    <dl className="facts">
      {shown.map((fact) => (
        <div key={fact.term}>
          <dt>{fact.term}</dt>
          <dd>
            {fact.lang ? <span lang={fact.lang}>{fact.value}</span> : fact.value}
            {fact.note && (
              <span className="meta item-fact-note" lang={fact.noteLang}>
                {fact.note}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A small titled block in the intro: "Who it's for". */
function Block({ title, text, lang }: { title: string; text: string; lang?: Locale }) {
  const parts = paragraphs(text);
  if (parts.length === 0) return null;
  return (
    <div className="item-block">
      <h2 className="title">{title}</h2>
      <Text parts={parts} lang={lang} />
    </div>
  );
}

/** "What's included", one tick per line. */
function Included({ title, items, lang }: { title: string; items: string[]; lang?: Locale }) {
  if (items.length === 0) return null;
  return (
    <div className="item-block">
      <h2 className="title">{title}</h2>
      <ul className="ticks" lang={lang}>
        {items.map((item, index) => (
          <li key={index}>
            <Icon name="check" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A primary link out to enrol or buy: right arrow inside the site, up-right out of it. */
function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <SiteLink className="btn btn-primary" href={href}>
      {label}
      <Icon name={href.startsWith("/") ? "arrow-right" : "arrow-ext"} />
    </SiteLink>
  );
}

/**
 * The item's photograph with the 12px radius (never the arch: that is hers and
 * the book's): 3:2, or 3:4 when it is a book or eBook cover, as in the shop.
 */
function Media({
  media,
  sizes,
  upright = false,
}: {
  media: ResolvedMedia | undefined;
  sizes: string;
  upright?: boolean;
}) {
  if (!media) return null;
  return (
    <div className={upright ? "item-media item-media--cover" : "item-media"}>
      <Picture media={media} sizes={sizes} priority />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Posts and impact stories: meta 1–3, title 4–11, the cover and text 4–10
// ---------------------------------------------------------------------------

function Cover({ media, locale }: { media: ResolvedMedia | undefined; locale: Locale }) {
  if (!media) return null;
  return (
    <figure className="article-cover">
      <Picture
        media={media}
        sizes="(min-width: 1408px) 734px, (min-width: 1024px) 53vw, 100vw"
        priority
      />
      {media.caption && (
        <figcaption className="caption" lang={langIf(media.textLang, locale)}>
          {nb(media.caption)}
        </figcaption>
      )}
    </figure>
  );
}

/** Three more stories as the home page's text rows (`.story-row`, collections.css). */
function RelatedPosts({
  posts,
  locale,
  indexed,
}: {
  posts: PostCard[];
  locale: Locale;
  indexed: boolean;
}) {
  const t = useT();
  const id = useId();
  if (posts.length === 0) return null;
  const all = { label: t.items.back.post, href: INDEX.post };
  return (
    <section className="section band-peach" aria-labelledby={id}>
      <div className="wrap">
        <div className="shead">
          <div className="shead-text">
            <h2 id={id} className="display-l">
              {nb(t.items.post.related)}
            </h2>
          </div>
          {indexed && <TextLink link={all} />}
        </div>
        <div className="story-list story-list--first">
          {posts.map((post) => {
            const lang = langIf(post.textLang, locale);
            return (
              <article className="story-row" key={post.id}>
                <p className="story-meta">
                  {post.category && (
                    <span className="label label--accent">{post.category.name}</span>
                  )}
                  <span className="meta">
                    <Dots items={postMeta(post, locale, t.sections.posts)} />
                  </span>
                </p>
                <div className="story-text">
                  <h3 className="title">
                    <SiteLink href={`/blog/${post.slug}`} lang={lang} hrefLang={lang}>
                      {post.title}
                    </SiteLink>
                    <InEnglish target={lang} />
                  </h3>
                  {post.excerpt && (
                    <p className="body excerpt" lang={lang}>
                      {post.excerpt}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {indexed && (
          <p className="foot-link">
            <TextLink link={all} />
          </p>
        )}
      </div>
    </section>
  );
}

function PostIntro({ intro, media, locale, indexed }: IntroProps<"post">) {
  const t = useT();
  const { post } = intro;
  const lang = langIf(post.textLang, locale);
  const meta = postMeta(post, locale, t.sections.posts);
  return (
    <>
      <article className="item-intro item-article band-ivory">
        <div className="wrap grid-12">
          <header className="article-head">
            {post.category && (
              <p className="label label--accent article-cat">
                <SiteLink href={`/blog?category=${encodeURIComponent(post.category.slug)}`}>
                  {post.category.name}
                </SiteLink>
              </p>
            )}
            <div className="article-title" lang={lang}>
              <h1 className="display-xl">{nb(post.title)}</h1>
              {post.excerpt && <p className="lead">{nb(post.excerpt)}</p>}
            </div>
            {meta.length > 0 && (
              <p className="meta article-meta">
                <Dots items={meta} />
              </p>
            )}
          </header>
          <Cover media={post.coverMediaId ? media[post.coverMediaId] : undefined} locale={locale} />
          <div className="article-body" lang={lang}>
            <RichHtml html={intro.bodyHtml} className="prose" />
          </div>
          {indexed && <AllLink kind="post" className="item-foot article-foot" />}
        </div>
      </article>
      <RelatedPosts posts={intro.related} locale={locale} indexed={indexed} />
    </>
  );
}

function StoryIntro({ intro, media, locale, indexed }: IntroProps<"story">) {
  const { story } = intro;
  const lang = langIf(story.textLang, locale);
  const people = [story.personName, story.location].filter(Boolean);
  return (
    <article className="item-intro item-article band-ivory">
      <div className="wrap grid-12">
        <header className="article-head">
          <div className="article-title" lang={lang}>
            <h1 className="display-xl">{nb(story.title)}</h1>
            {story.summary && <p className="lead">{nb(story.summary)}</p>}
          </div>
          {(story.category || people.length > 0) && (
            <p className="article-meta" lang={lang}>
              {story.category && <span className="label label--accent">{story.category}</span>}
              {people.length > 0 && (
                <span className="meta">
                  <Dots items={people} />
                </span>
              )}
            </p>
          )}
        </header>
        <Cover media={story.coverMediaId ? media[story.coverMediaId] : undefined} locale={locale} />
        <div className="article-body" lang={lang}>
          <RichHtml html={intro.bodyHtml} className="prose" />
        </div>
        {indexed && <AllLink kind="story" className="item-foot article-foot" />}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Products: the photo on 1–5, the words on 7–12
// ---------------------------------------------------------------------------

function ProductIntro({ intro, media, locale, indexed }: IntroProps<"product">) {
  const t = useT();
  const { product } = intro;
  const lang = langIf(product.textLang, locale);
  // A field without approved Greek is still in English, whatever the name is in.
  const fieldLang = (key: string) => langIf(intro.english.includes(key) ? "en" : "el", locale);
  const cover = product.coverMediaId ? media[product.coverMediaId] : undefined;
  const price =
    product.priceCents !== null
      ? product.priceCents === 0
        ? t.sections.products.free
        : formatMoney(product.priceCents, product.currency, locale)
      : product.priceLabel;
  // A figure (price_cents, or a studio label such as "€19") is set as the
  // price; words such as "See books" are meta, as on the shop's tile.
  const figure = product.priceCents !== null || /\d/.test(product.priceLabel);
  const was =
    intro.compareAtCents !== null &&
    product.priceCents !== null &&
    intro.compareAtCents > product.priceCents
      ? fmt(t.items.product.was, {
          price: formatMoney(intro.compareAtCents, product.currency, locale),
        })
      : null;
  // The description's first paragraph is the standfirst; without one, who it's for is.
  const [lead, ...rest] = paragraphs(intro.description);
  const whoForIsLead = !lead;

  return (
    <article className="item-intro band-ivory">
      <div className={`wrap grid-12 item-grid item-grid--${cover ? "product" : "text"}`}>
        <Media
          media={cover}
          sizes="(min-width: 1024px) 36vw, min(100vw, 448px)"
          upright={UPRIGHT.has(product.productType)}
        />
        <div className="item-body">
          <h1 className="display-xl" lang={lang}>
            {nb(product.name)}
          </h1>
          {(lead || intro.whoFor) && (
            <p className="lead" lang={fieldLang(lead ? "description" : "whoFor")}>
              {nb(lead ?? intro.whoFor)}
            </p>
          )}
          {price && (
            <p className={figure ? "item-price" : "meta item-price-note"}>
              {/* The free-text price label is only ever stored in English */}
              <span lang={product.priceCents === null ? langIf("en", locale) : undefined}>
                {price}
              </span>
              {was && <s className="meta">{was}</s>}
            </p>
          )}
          {intro.buyHere ? (
            <div className="actions">
              <CheckoutButton kind="product" id={product.id} label={t.items.product.buy} />
            </div>
          ) : intro.externalUrl ? (
            <div className="actions">
              <ActionLink
                href={intro.externalUrl}
                // A shop entry that stands for a book opens the book's own page: say so.
                label={
                  intro.externalUrl.startsWith("/books/")
                    ? t.items.product.seeBook
                    : t.items.product.get
                }
              />
            </div>
          ) : null}
          {intro.stockNote && (
            <p className="meta item-stock" lang={fieldLang("stockNote")}>
              {intro.stockNote}
            </p>
          )}
          <Text parts={rest} lang={fieldLang("description")} />
          {!whoForIsLead && (
            <Block title={t.items.product.whoFor} text={intro.whoFor} lang={fieldLang("whoFor")} />
          )}
          <Included
            title={t.items.product.included}
            items={intro.included}
            lang={fieldLang("included")}
          />
          {indexed && <AllLink kind="product" />}
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Masterclasses and events: text-led like the About hero, the photo on 9–12
// ---------------------------------------------------------------------------

/** First name and email: we'll write when places open. A peach card, like the free eBook's. */
function WaitlistForm({ masterclassId }: { masterclassId: string }) {
  const t = useT();
  const locale = useLocale();
  const id = useId();
  const m = t.items.masterclass;
  const form = useFormAction(
    (data, turnstile) =>
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
    {},
    {
      checks: {
        first_name: (value) => !value.trim() && m.waitlistNameError,
        email: (value) => !EMAIL.test(value.trim()) && t.sections.forms.emailInvalid,
      },
    },
  );
  const titleId = `${id}-title`;
  const hintId = `${id}-hint`;

  return (
    <>
      {form.state.step === "done" ? (
        <div className="item-card">
          <h2 ref={form.doneRef} className="display-m" tabIndex={-1}>
            {nb(m.waitlistDoneTitle)}
          </h2>
          <p className="body">{m.waitlistDoneBody}</p>
        </div>
      ) : (
        <form className="item-card" noValidate aria-labelledby={titleId} {...form.formProps}>
          <h2 id={titleId} className="display-m">
            {nb(m.waitlistTitle)}
          </h2>
          <p className="body">{m.waitlistBody}</p>
          <p className="form-hint" id={hintId}>
            {m.waitlistHint}
          </p>
          <div className="fields fields--name-email">
            <div className="field">
              <label htmlFor={`${id}-name`}>{t.sections.ebook.firstName}</label>
              <input
                id={`${id}-name`}
                autoComplete="given-name"
                required
                maxLength={80}
                {...form.fieldProps("first_name", hintId)}
              />
              {form.fieldError("first_name")}
            </div>
            <div className="field">
              <label htmlFor={`${id}-email`}>{t.sections.ebook.email}</label>
              <input
                id={`${id}-email`}
                type="email"
                autoComplete="email"
                required
                maxLength={320}
                {...form.fieldProps("email", hintId)}
              />
              {form.fieldError("email")}
            </div>
          </div>
          <Honeypot />
          {form.turnstileSlot}
          {form.alertSlot}
          <button className="btn btn-primary btn-block" {...form.submitProps}>
            {form.sending ? m.waitlistSending : m.waitlistButton}
          </button>
          <p className="fine">
            <span className="fine-note">
              <Icon name="lock" />
              <span>{m.privacy}</span>
            </span>
            <SiteLink href="/privacy">{t.site.footer.privacy}</SiteLink>
          </p>
        </form>
      )}
      {form.statusSlot(`${m.waitlistDoneTitle} ${m.waitlistDoneBody}`)}
    </>
  );
}

/** The opening shared by masterclasses and events: words and facts, the photo, then the rest. */
function LedIntro({
  head,
  cover,
  children,
}: {
  head: ReactNode;
  cover: ResolvedMedia | undefined;
  children?: ReactNode;
}) {
  return (
    <article className="item-intro band-ivory">
      <div className="wrap grid-12 item-grid item-grid--led">
        <div className="item-head">{head}</div>
        <Media media={cover} sizes="(min-width: 1024px) 28vw, min(100vw, 448px)" />
        {children && <div className="item-more">{children}</div>}
      </div>
    </article>
  );
}

function MasterclassIntro({ intro, media, locale, indexed }: IntroProps<"masterclass">) {
  const t = useT();
  const m = t.items.masterclass;
  const { masterclass } = intro;
  const lang = langIf(masterclass.textLang, locale);
  const date = masterclass.startsAt
    ? formatWhen(masterclass.startsAt, locale, { weekday: true })
    : "";
  const where = [t.sections.masterclasses.format[masterclass.format], masterclass.location]
    .filter(Boolean)
    .join(", ");

  let action: ReactNode = null;
  if (masterclass.availability === "waitlist") {
    action = <WaitlistForm masterclassId={masterclass.id} />;
  } else if (masterclass.availability === "closed") {
    action = <p className="body item-note">{m.closed}</p>;
  } else if (intro.enrolProductId) {
    action = (
      <div className="actions">
        <CheckoutButton kind="product" id={intro.enrolProductId} label={m.enrol} />
      </div>
    );
  } else if (intro.enrolUrl) {
    action = (
      <div className="actions">
        <ActionLink href={intro.enrolUrl} label={m.enrol} />
      </div>
    );
  }

  return (
    <LedIntro
      cover={masterclass.coverMediaId ? media[masterclass.coverMediaId] : undefined}
      head={
        <>
          <h1 className="display-xl" lang={lang}>
            {nb(masterclass.title)}
          </h1>
          {masterclass.summary && (
            <p className="lead" lang={lang}>
              {nb(masterclass.summary)}
            </p>
          )}
          <Facts
            facts={[
              date
                ? { term: m.when, value: date, note: masterclass.scheduleNote, noteLang: lang }
                : { term: m.when, value: masterclass.scheduleNote, lang },
              { term: m.where, value: where },
              { term: m.price, value: masterclass.priceLabel, lang },
            ]}
          />
          {action}
        </>
      }
    >
      <Text parts={paragraphs(intro.description)} lang={lang} />
      <Included title={m.included} items={intro.included} lang={lang} />
      {indexed && <AllLink kind="masterclass" />}
    </LedIntro>
  );
}

function EventIntro({ intro, media, locale, indexed }: IntroProps<"event">) {
  const t = useT();
  const e = t.items.event;
  const { event, ended } = intro;
  const lang = langIf(event.textLang, locale);
  const when = formatWhen(event.startsAt, locale, {
    weekday: true,
    time: true,
    timeZone: event.timeZone,
  });
  const where = event.online ? e.online : [event.venue, event.city].filter(Boolean).join(", ");
  return (
    <LedIntro
      cover={event.coverMediaId ? media[event.coverMediaId] : undefined}
      head={
        <>
          <h1 className="display-xl" lang={lang}>
            {nb(event.title)}
          </h1>
          {event.summary && (
            <p className="lead" lang={lang}>
              <Lines text={nb(event.summary)} />
            </p>
          )}
          <Facts
            facts={[
              { term: e.when, value: when, note: utcOffset(event.startsAt, event.timeZone) },
              { term: e.where, value: where, lang: event.online ? undefined : lang },
            ]}
          />
          {ended ? (
            <p className="body item-note">{e.past}</p>
          ) : event.ticketUrl ? (
            <div className="actions">
              <ActionLink href={event.ticketUrl} label={e.tickets} />
            </div>
          ) : null}
        </>
      }
    >
      {indexed ? <AllLink kind="event" /> : null}
    </LedIntro>
  );
}

export function ItemIntro(props: {
  intro: Intro;
  media: MediaMap;
  locale: Locale;
  listenAnchor: string | null;
  indexed: boolean;
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
