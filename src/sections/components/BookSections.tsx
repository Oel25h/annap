/**
 * The book sections (DESIGN.md §9 Book and Free eBook form): the featured
 * book with its formats, review and free eBook card; the card on its own;
 * the books index; and excerpts. A book's own page reuses the same pieces.
 */
import { useId, useState } from "react";
import { EMAIL, field, Honeypot, useFormAction } from "@/components/forms/useFormAction";
import { CheckoutButton } from "@/components/site/CheckoutButton";
import { DownloadButton } from "@/components/site/DownloadButton";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import { useLocale, useT } from "@/lib/i18n/context";
import { fmt, formatMoney } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import { nb } from "@/lib/i18n/rag";
import { requestFreeEbook } from "@/lib/forms.functions";
import type {
  BookOffer,
  BookSummary,
  MediaMap,
  RenderedSection,
  ResolvedMedia,
} from "@/sections/types";
import { Picture } from "../render/Picture";
import {
  keyLang,
  SectionHeading,
  SectionShell,
  TextLink,
  type SectionContext,
} from "../render/SectionShell";
import { InEnglish, Lines } from "../render/text";

type Props<T extends RenderedSection["type"]> = {
  section: RenderedSection<T>;
  media: MediaMap;
  ctx: SectionContext;
};

/** `lang` for a book's own text when it differs from the text around it. */
const langIf = (lang: Locale, around: Locale) => (lang !== around ? lang : undefined);

// ---------------------------------------------------------------------------
// The cover in the arch niche
// ---------------------------------------------------------------------------

/** The arch's width at each breakpoint, widest first; the last one applies below them all. */
const ARCH = {
  /** Columns 1–5: the home book and a book's own page. */
  feature: [
    ["(min-width: 1440px)", "515px"],
    ["(min-width: 1024px)", "37vw"],
    ["", "min(80vw, 320px)"],
  ],
  /** The books index as rows: columns 1–4, a third of the row from 720. */
  rows: [
    ["(min-width: 1440px)", "405px"],
    ["(min-width: 720px)", "29vw"],
    ["", "min(80vw, 320px)"],
  ],
  /** The books index as a grid: three across from 1024, two from 720. */
  grid: [
    ["(min-width: 1440px)", "405px"],
    ["(min-width: 1024px)", "29vw"],
    ["(min-width: 720px)", "45vw"],
    ["", "min(80vw, 320px)"],
  ],
} as const;

/** The cover is 76% of the arch; with `crop-cover` the photo is 118.56% of the cover. */
function coverSizes(arch: keyof typeof ARCH, crop: boolean): string {
  const scale = crop ? 0.76 * 1.1856 : 0.76;
  return ARCH[arch]
    .map(([media, width]) => `${media ? `${media} ` : ""}calc(${width} * ${scale.toFixed(3)})`)
    .join(", ");
}

/** fyrts-cover.jpg is a photo of the printed book: `crop-cover` trims it to the face, without the spine. */
const isPrintedCover = (image: ResolvedMedia) =>
  /\/(fyrts-cover|cover-find-your-reason-to-smile)[/.]/.test(image.src);

/** A book cover set in the arch niche: bottom-aligned at 76%, so the curve never crops its type. */
export function BookCover({
  book,
  media,
  arch,
  priority = false,
}: {
  book: BookSummary;
  media: MediaMap;
  arch: keyof typeof ARCH;
  priority?: boolean;
}) {
  const cover = book.coverMediaId ? media[book.coverMediaId] : undefined;
  const crop = !!cover && isPrintedCover(cover);
  return (
    <div className="arch-wrap">
      <div className="arch arch--3x4 arch--niche">
        <div className="niche-cover">
          <Picture
            media={cover}
            sizes={coverSizes(arch, crop)}
            priority={priority}
            className={crop ? "crop crop-cover" : undefined}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rating and formats
// ---------------------------------------------------------------------------

/** What the rating line reads, once the book carries it (the loader adds these fields). */
type Rated = BookSummary &
  Partial<{ genre: string; rating: number | null; ratingCount: number | null }>;

/** "Memoir · 4.9 · 480+ reviews": each part only when it exists, the dots drawn by CSS. */
export function BookRating({ book, lang }: { book: Rated; lang?: Locale }) {
  const t = useT();
  const locale = useLocale();
  const parts = [
    book.genre ? (
      <span key="genre" lang={lang}>
        {book.genre}
      </span>
    ) : null,
    book.rating != null ? (
      <span key="rating">
        {new Intl.NumberFormat(locale === "el" ? "el-GR" : "en-GB", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }).format(book.rating)}
      </span>
    ) : null,
    book.ratingCount ? (
      <span key="count">{fmt(t.sections.books.reviews, { n: book.ratingCount })}</span>
    ) : null,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <p className="book-rating">
      <span className="dots meta">{parts}</span>
    </p>
  );
}

/** The words on a buy button: the same in a format row and in the phone buy bar. */
export function OfferLabel({ offer }: { offer: BookOffer }) {
  const t = useT();
  if (offer.format === "ebook") return t.sections.books.getEbook;
  if (offer.retailer && !offer.buyHere) {
    return fmt(t.sections.books.buyOn, { retailer: offer.retailer });
  }
  return t.sections.books.buy;
}

/** Where the page's audiobook player is, as seen from the formats. */
export type ListenLink = { anchor: string; above: boolean };

/**
 * One hairline row per format: the name over where to get it, and one quiet
 * button. The rows are subgrids, so every button takes the widest one's width
 * and their left edges line up in either language.
 */
export function Offers({
  book,
  listen,
  id,
}: {
  book: BookSummary;
  listen: ListenLink | null;
  id?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const offers = book.offers.filter(
    (offer) => offer.buyHere || offer.externalUrl || (offer.format === "audiobook" && listen),
  );
  if (offers.length === 0) return null;
  return (
    <ul className="formats" id={id} aria-label={t.sections.books.formats}>
      {offers.map((offer) => {
        const listenHere = offer.format === "audiobook" && listen;
        return (
          <li key={offer.id}>
            <span className="f-name">{t.sections.books.format[offer.format]}</span>
            <span className="f-where meta">
              {listenHere
                ? t.sections.books.readByAuthor
                : offer.buyHere && offer.priceCents !== null
                  ? formatMoney(offer.priceCents, offer.currency, locale)
                  : offer.retailer}
            </span>
            {listenHere ? (
              <a className="btn btn-quiet btn-sm" href={`#${listen.anchor}`}>
                <span>
                  {listen.above ? t.sections.books.listenAbove : t.sections.books.listenBelow}
                </span>
                <Icon name={listen.above ? "arrow-up" : "arrow-down"} />
              </a>
            ) : offer.buyHere ? (
              <CheckoutButton
                kind="book_format"
                id={offer.id}
                label={<OfferLabel offer={offer} />}
                variant="quiet"
                small
                icon="arrow-right"
              />
            ) : offer.externalUrl ? (
              <a
                className="btn btn-quiet btn-sm"
                href={offer.externalUrl}
                target="_blank"
                rel="noopener"
              >
                <span>
                  <OfferLabel offer={offer} />
                </span>
                <span className="sr-only">{t.site.opensNewTab}</span>
                <Icon name="arrow-ext" />
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// The featured book
// ---------------------------------------------------------------------------

/**
 * The book: cover on columns 1–5 over two rows; title, subtitle, rating,
 * description, formats and "All books" on 7–12, then the reader's review,
 * bottom-aligned with the cover. Phones read it in that order, so the review
 * never comes before the book. The free eBook card follows, 64px below.
 */
export function FeaturedBook({
  section,
  media,
  ctx,
  listenAnchor,
  listenAbove = true,
}: Props<"featured_book"> & { listenAnchor: string | null; listenAbove?: boolean }) {
  const t = useT();
  const book = section.data?.book;
  if (!book) return null;
  const p = section.props;
  const lang = langIf(book.textLang, ctx.locale);
  // The language of the page the title opens, against the reader's.
  const target = langIf(book.textLang, ctx.locale);
  const listen = listenAnchor ? { anchor: listenAnchor, above: listenAbove } : null;
  return (
    <SectionShell section={section} ctx={ctx} labelled defaultAnchor="book">
      <div
        className={`book-grid grid-12${section.variant === "cover_right" ? " book-grid--right" : ""}`}
      >
        <div className="book-cover">
          <BookCover book={book} media={media} arch="feature" priority={ctx.isFirst} />
        </div>
        <div className="book-body">
          <SectionHeading ctx={ctx} lang={lang}>
            <SiteLink href={`/books/${book.slug}`} hrefLang={target}>
              {nb(book.title)}
            </SiteLink>
            <InEnglish target={target} />
          </SectionHeading>
          {book.subtitle && (
            <p className="book-sub" lang={lang}>
              {nb(book.subtitle)}
            </p>
          )}
          <BookRating book={book} lang={lang} />
          {book.description && (
            <p className="body" lang={lang}>
              <Lines text={book.description} />
            </p>
          )}
          <Offers book={book} listen={listen} />
          <p className="book-links">
            <TextLink link={{ label: t.sections.books.seeAll, href: "/books" }} />
          </p>
        </div>
        {p.quote && (
          <figure className="review">
            <blockquote>
              <p lang={keyLang(section, "quote")}>
                <q>{nb(p.quote)}</q>
              </p>
            </blockquote>
            {p.quoteBy && (
              <figcaption className="meta" lang={keyLang(section, "quoteBy")}>
                {p.quoteBy}
              </figcaption>
            )}
          </figure>
        )}
      </div>
      {p.showEbookGate && book.freeDownload && (
        <EbookForm
          book={book}
          anchor="free-ebook"
          level={ctx.headingLevel === "h1" ? "h2" : "h3"}
        />
      )}
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// The free eBook card
// ---------------------------------------------------------------------------

/** The free eBook card as a section of its own; the section carries the anchor. */
export function EbookGate({ section, ctx }: Props<"ebook_gate">) {
  const book = section.data?.book;
  if (!book?.freeDownload) return null;
  const p = section.props;
  return (
    <SectionShell section={section} ctx={ctx} labelled defaultAnchor="free-ebook">
      <EbookForm
        book={book}
        heading={ctx}
        inline={section.variant === "inline"}
        copy={{ title: p.title, body: p.body, button: p.buttonLabel }}
        lang={(key) => keyLang(section, key)}
      />
    </SectionShell>
  );
}

/**
 * First name and email, and the book is theirs at once; the download never
 * depends on the letters opt-in. The shared form pattern (useFormAction):
 * - Errors show on submit, then on blur. Focus goes to the first invalid
 *   field, and typed values stay through every state.
 * - Offline, the details stay and the form sends itself once the connection
 *   is back; the button stays enabled.
 * - Success replaces the form in place: its heading takes focus, and the
 *   card's status region says the same.
 */
export function EbookForm({
  book,
  anchor,
  heading,
  level = "h3",
  inline = false,
  copy,
  lang,
}: {
  book: BookSummary;
  /** The card's id, when the section around it does not carry the anchor. */
  anchor?: string;
  /** The gate's section context: its title becomes the section's own heading. */
  heading?: SectionContext;
  /** Otherwise the card's title level: one under the section heading above it. */
  level?: "h2" | "h3";
  /** No card: copy and form sit straight on the page grid. */
  inline?: boolean;
  copy?: { title: string; body: string; button: string };
  lang?: (key: string) => "en" | undefined;
}) {
  const t = useT();
  const locale = useLocale();
  const id = useId();
  const e = t.sections.ebook;
  const titleId = heading?.headingId ?? `${id}-title`;
  const hintId = `${id}-hint`;
  const [name, setName] = useState("");
  const form = useFormAction(
    (data, turnstile) => {
      const firstName = field(data, "first_name").trim();
      setName(firstName);
      return requestFreeEbook({
        data: {
          bookId: book.id,
          firstName,
          email: field(data, "email").trim(),
          letters: data.get("letters") === "on",
          locale,
          website: field(data, "website"),
          turnstile,
        },
      });
    },
    { invalid: e.invalid },
    {
      checks: {
        first_name: (value) => !value.trim() && e.nameError,
        email: (value) => !EMAIL.test(value.trim()) && e.emailError,
      },
    },
  );

  const done = form.state.step === "done" ? form.state.result : null;
  const doneTitle = name ? fmt(e.doneTitle, { name }) : e.doneTitleNoName;
  // Beside the card's title, or under the gate's heading when that is the card's title.
  const Title = level;
  const Done = heading ? (heading.headingLevel === "h1" ? "h2" : "h3") : level;

  const title = copy?.title || e.title;
  const titleLang = copy?.title ? lang?.("title") : undefined;
  const bookLang = langIf(book.textLang, locale);
  const [before, after] = e.body.split("{title}");

  return (
    <div
      className={inline ? "bookplate bookplate--inline grid-12" : "bookplate grid-12"}
      id={anchor}
    >
      <div className="bp-copy">
        {heading ? (
          <SectionHeading ctx={heading} className="display-m" lang={titleLang}>
            {title}
          </SectionHeading>
        ) : (
          <Title id={titleId} className="display-m" lang={titleLang}>
            {nb(title)}
          </Title>
        )}
        {copy?.body ? (
          <p className="body" lang={lang?.("body")}>
            {copy.body}
          </p>
        ) : (
          <p className="body">
            {before}
            {after !== undefined && (
              <>
                <span lang={bookLang}>{book.title}</span>
                {after}
              </>
            )}
          </p>
        )}
        {book.freeDownload === "en" && locale === "el" && <p className="meta">{e.englishOnly}</p>}
      </div>

      {done ? (
        <div className="bp-done">
          <Done ref={form.doneRef} tabIndex={-1} className="display-m">
            {doneTitle}
          </Done>
          <p className="body">{e.doneBody}</p>
          {done.downloads.length > 0 && (
            <div className="actions">
              {done.downloads.map((download) => (
                <DownloadButton key={download.action} action={download.action} variant="quiet">
                  {fmt(e.download, { label: download.label })}
                </DownloadButton>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form className="bp-form" aria-labelledby={titleId} noValidate {...form.formProps}>
          <p className="form-hint bp-hint" id={hintId}>
            {e.hint}
          </p>
          <div className="fields fields--name-email">
            <div className="field">
              <label htmlFor={`${id}-name`}>{e.firstName}</label>
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
              <label htmlFor={`${id}-email`}>{e.email}</label>
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
            <Honeypot />
          </div>
          <label className="check">
            <input type="checkbox" name="letters" />
            <span>{e.letters}</span>
          </label>
          {form.turnstileSlot}
          {form.alertSlot}
          <button className="btn btn-primary btn-block" {...form.submitProps}>
            {form.sending ? e.sending : copy?.button || e.button}
          </button>
          <p className="fine">
            <span className="fine-note">
              <Icon name="lock" />
              <span>{e.privacy}</span>
            </span>
            <SiteLink href="/privacy">{t.site.footer.privacy}</SiteLink>
          </p>
        </form>
      )}
      {form.statusSlot(`${doneTitle} ${e.doneBody}`)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The books index and excerpts
// ---------------------------------------------------------------------------

/**
 * Every book. Rows mirror the featured book (cover on 1–4, words on 5–12),
 * with the formats beside the cover; the grid sets three across.
 */
export function BookList({ section, media, ctx }: Props<"book_list">) {
  const t = useT();
  const books = section.data?.books ?? [];
  if (books.length === 0) return null;
  const p = section.props;
  const rows = section.variant === "rows";
  // A title of the list's own is the h2 (or the page's h1), so each book sits one level under it.
  const Item = p.title && ctx.headingLevel === "h2" ? "h3" : "h2";
  return (
    <SectionShell
      section={section}
      ctx={ctx}
      head={{
        title: p.title,
        titleLang: keyLang(section, "title"),
        intro: p.intro,
        introLang: keyLang(section, "intro"),
      }}
    >
      <ul className={rows ? "shelf shelf--rows" : "shelf shelf--grid grid-12"}>
        {books.map((book, index) => {
          const lang = langIf(book.textLang, ctx.locale);
          // The language of the page the links open, against the reader's.
          const target = langIf(book.textLang, ctx.locale);
          const href = `/books/${book.slug}`;
          return (
            <li key={book.id} className={rows ? "grid-12" : undefined}>
              <div className="book-cover">
                <BookCover
                  book={book}
                  media={media}
                  arch={rows ? "rows" : "grid"}
                  priority={ctx.isFirst && index === 0}
                />
              </div>
              <div className="shelf-text">
                <Item className={rows ? "display-l" : "display-m"} lang={lang}>
                  <SiteLink href={href} hrefLang={target}>
                    {nb(book.title)}
                  </SiteLink>
                  <InEnglish target={target} />
                </Item>
                {book.subtitle && (
                  <p className="book-sub" lang={lang}>
                    {nb(book.subtitle)}
                  </p>
                )}
                <BookRating book={book} lang={lang} />
                {rows && book.description && (
                  <p className="body" lang={lang}>
                    <Lines text={book.description} />
                  </p>
                )}
                {rows && <Offers book={book} listen={null} />}
                <p className="book-links">
                  <SiteLink className="link" href={href} hrefLang={target} arrow>
                    {t.sections.books.more}
                  </SiteLink>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}

/** A few pages from a book: cards three across, or stacked rows with the title on 1–4. */
export function BookExcerpts({ section, ctx }: Props<"book_excerpts">) {
  const t = useT();
  const p = section.props;
  const book = section.data?.book;
  const link = book
    ? { label: fmt(t.sections.books.read, { title: book.title }), href: `/books/${book.slug}` }
    : null;
  const stacked = section.variant === "stacked";
  const Item = p.title && ctx.headingLevel === "h2" ? "h3" : "h2";
  return (
    <SectionShell
      section={section}
      ctx={ctx}
      head={{ title: p.title, titleLang: keyLang(section, "title"), link }}
    >
      <ol className={stacked ? "excerpts excerpts--stacked" : "excerpts grid-12"}>
        {p.items.map((item) => (
          <li key={item.id} className={stacked ? "grid-12" : undefined}>
            <div className="ex-head">
              {item.label && (
                <p
                  className="label label--accent"
                  lang={keyLang(section, `items.${item.id}.label`)}
                >
                  {item.label}
                </p>
              )}
              <Item className="title" lang={keyLang(section, `items.${item.id}.title`)}>
                {nb(item.title)}
              </Item>
            </div>
            <p className="body" lang={keyLang(section, `items.${item.id}.excerpt`)}>
              <Lines text={item.excerpt} />
            </p>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}
