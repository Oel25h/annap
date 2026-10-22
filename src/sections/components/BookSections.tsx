import { caps } from "@/lib/i18n/caps";
import { useId } from "react";
import { field, Honeypot, useFormAction } from "@/components/forms/useFormAction";
import { CheckoutButton } from "@/components/site/CheckoutButton";
import { DownloadButton } from "@/components/site/DownloadButton";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import { useLocale, useT } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import { requestFreeEbook } from "@/lib/forms.functions";
import type { BookOffer, BookSummary, MediaMap, RenderedSection } from "@/sections/types";
import { Picture } from "../render/Picture";
import { FootLink, keyLang, SectionShell, type SectionContext } from "../render/SectionShell";
import { Lines } from "../render/text";

type Props<T extends RenderedSection["type"]> = {
  section: RenderedSection<T>;
  media: MediaMap;
  ctx: SectionContext;
};

function price(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale === "el" ? "el-GR" : "en-IE", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/** A book cover set in the arch niche: the arch frames the cover and never crops its type. */
export function BookCover({
  book,
  media,
  sizes,
  priority = false,
}: {
  book: BookSummary;
  media: MediaMap;
  sizes: string;
  priority?: boolean;
}) {
  const cover = book.coverMediaId ? media[book.coverMediaId] : undefined;
  return (
    <div className="arch-wrap">
      <div className="arch-frame">
        <div className="arch arch--3x4 arch--niche">
          <div className="niche-cover">
            <Picture media={cover} sizes={sizes} priority={priority} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** One row per format: where to get it, and the button that does it. */
export function Offers({ book, listenAnchor }: { book: BookSummary; listenAnchor: string | null }) {
  const t = useT();
  const locale = useLocale();
  const offers = book.offers.filter(
    (offer) => offer.buyHere || offer.externalUrl || (offer.format === "audiobook" && listenAnchor),
  );
  if (offers.length === 0) return null;
  return (
    <ul className="formats" aria-label={t.sections.books.formats}>
      {offers.map((offer: BookOffer) => {
        const listenHere = offer.format === "audiobook" && listenAnchor;
        return (
          <li key={offer.id}>
            <span className="f-name">{t.sections.books.format[offer.format]}</span>
            <span className="f-where meta">
              {listenHere
                ? t.sections.books.readByAuthor
                : offer.buyHere && offer.priceCents !== null
                  ? price(offer.priceCents, offer.currency, locale)
                  : offer.retailer}
            </span>
            {listenHere ? (
              <a className="btn btn-quiet btn-sm" href={`#${listenAnchor}`}>
                {t.sections.books.listenAbove}
                <Icon name="arrow-up" />
              </a>
            ) : offer.buyHere ? (
              <CheckoutButton kind="book_format" id={offer.id} label={t.sections.books.buy} small />
            ) : offer.externalUrl ? (
              <a className="btn btn-quiet btn-sm" href={offer.externalUrl} rel="noopener">
                {offer.retailer
                  ? fmt(t.sections.books.buyAt, { retailer: offer.retailer })
                  : t.sections.books.buy}
                <Icon name="arrow-ext" />
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function FeaturedBook({
  section,
  media,
  ctx,
  listenAnchor,
}: Props<"featured_book"> & { listenAnchor: string | null }) {
  const t = useT();
  const book = section.data?.book;
  if (!book) return null;
  const p = section.props;
  const link = { label: t.sections.books.seeAll, href: "/books" };
  return (
    <SectionShell section={section} ctx={ctx} runhead={{ link }}>
      <div className={`book-grid${section.variant === "cover_right" ? " book-grid--right" : ""}`}>
        <div className="book-cover">
          <BookCover book={book} media={media} sizes="(min-width: 1024px) 300px, 55vw" />
        </div>
        {p.quote && (
          <blockquote className="review">
            <p lang={keyLang(section, "quote")}>
              <q>{p.quote}</q>
            </p>
            {p.quoteBy && (
              <footer className="label" lang={keyLang(section, "quoteBy")}>
                {caps(p.quoteBy)}
              </footer>
            )}
          </blockquote>
        )}
        <div className="book-body" lang={book.textLang !== ctx.locale ? book.textLang : undefined}>
          <h2 id={ctx.headingId} className="display-l">
            <SiteLink href={`/books/${book.slug}`}>{book.title}</SiteLink>
          </h2>
          {book.subtitle && <p className="book-sub">{book.subtitle}</p>}
          {book.description && (
            <p className="body">
              <Lines text={book.description} />
            </p>
          )}
          <Offers book={book} listenAnchor={listenAnchor} />
          <FootLink link={link} />
        </div>
      </div>
      {p.showEbookGate && book.freeDownload && <EbookForm book={book} headingLevel="h3" />}
    </SectionShell>
  );
}

export function EbookGate({ section, ctx }: Props<"ebook_gate">) {
  const book = section.data?.book;
  if (!book?.freeDownload) return null;
  const p = section.props;
  return (
    <SectionShell
      section={section}
      ctx={ctx}
      labelled={false}
      label={p.title}
      runhead={{ title: "" }}
    >
      <EbookForm
        book={book}
        headingLevel="h2"
        copy={{ eyebrow: p.eyebrow, title: p.title, body: p.body, button: p.buttonLabel }}
        lang={(key) => keyLang(section, key)}
      />
    </SectionShell>
  );
}

/**
 * The bookplate: first name and email for the free ebook. The download never
 * depends on the letters opt-in; success shows the download at once.
 */
export function EbookForm({
  book,
  headingLevel,
  copy,
  lang,
}: {
  book: BookSummary;
  headingLevel: "h2" | "h3";
  copy?: { eyebrow: string; title: string; body: string; button: string };
  lang?: (key: string) => "en" | undefined;
}) {
  const t = useT();
  const locale = useLocale();
  const id = useId();
  const Heading = headingLevel;
  const english = book.freeDownload === "en" && locale === "el";
  const { state, sending, formProps, turnstileSlot } = useFormAction((data, turnstile) =>
    requestFreeEbook({
      data: {
        bookId: book.id,
        firstName: field(data, "first_name"),
        email: field(data, "email"),
        letters: data.get("letters") === "on",
        locale,
        website: field(data, "website"),
        turnstile,
      },
    }),
  );

  return (
    <form className="bookplate" id="free-ebook" aria-labelledby={`${id}-title`} {...formProps}>
      <div className="bookplate-top">
        <p className="label label--accent" lang={lang?.("eyebrow")}>
          {caps(copy?.eyebrow || t.sections.ebook.eyebrow)}
        </p>
        <span className="ex-libris" aria-hidden="true">
          Ex libris
        </span>
      </div>
      <div className="bp-grid">
        <div className="bp-copy">
          <Heading id={`${id}-title`} className="display-m" lang={lang?.("title")}>
            {copy?.title || t.sections.ebook.title}
          </Heading>
          <p className="body" lang={lang?.("body")}>
            {copy?.body || fmt(t.sections.ebook.body, { title: book.title })}
          </p>
          {english && <p className="meta">{t.sections.ebook.englishOnly}</p>}
        </div>
        <div>
          {state.step === "done" ? (
            <div className="bp-done" role="status">
              <p className="title">{t.sections.ebook.doneTitle}</p>
              <p className="body">{t.sections.ebook.doneBody}</p>
              <div className="actions">
                {state.result.downloads.map((download) => (
                  <DownloadButton key={download.action} action={download.action}>
                    {fmt(t.sections.ebook.download, { label: download.label })}
                  </DownloadButton>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="fields">
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
                    placeholder={t.site.footer.emailPlaceholder}
                    required
                    maxLength={320}
                  />
                </div>
                <Honeypot />
              </div>
              <label className="check">
                <input type="checkbox" name="letters" />
                <span>{t.sections.ebook.letters}</span>
              </label>
              {turnstileSlot}
              <button
                className="btn btn-primary btn-block"
                type="submit"
                aria-disabled={sending || undefined}
              >
                {sending ? t.sections.forms.sending : copy?.button || t.sections.ebook.button}
              </button>
              <p className="fine">
                <Icon name="lock" />
                <span>{t.sections.ebook.privacy}</span>
                <SiteLink href="/privacy">{t.site.footer.privacy}</SiteLink>
              </p>
              <p className="form-status" role="status" aria-live="polite">
                {state.step === "error" && (
                  <span className="field-error">
                    <Icon name="alert" />
                    {state.message}
                  </span>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </form>
  );
}

export function BookList({ section, media, ctx }: Props<"book_list">) {
  const t = useT();
  const books = section.data?.books ?? [];
  if (books.length === 0) return null;
  const p = section.props;
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
      <ul className={section.variant === "rows" ? "shelf shelf--rows" : "shelf"}>
        {books.map((book, i) => (
          <li key={book.id} lang={book.textLang !== ctx.locale ? book.textLang : undefined}>
            <BookCover
              book={book}
              media={media}
              sizes="(min-width: 1024px) 280px, 70vw"
              priority={ctx.isFirst && i === 0}
            />
            <div className="shelf-text">
              <h3 className="display-m">
                <SiteLink href={`/books/${book.slug}`}>{book.title}</SiteLink>
              </h3>
              {book.subtitle && <p className="book-sub">{book.subtitle}</p>}
              {section.variant === "rows" && book.description && (
                <p className="body">
                  <Lines text={book.description} />
                </p>
              )}
              <p>
                <SiteLink className="link" href={`/books/${book.slug}`}>
                  {t.sections.books.more}
                  <Icon name="arrow-right" />
                </SiteLink>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

export function BookExcerpts({ section, ctx }: Props<"book_excerpts">) {
  const t = useT();
  const p = section.props;
  const book = section.data?.book;
  const link = book
    ? { label: fmt(t.sections.books.read, { title: book.title }), href: `/books/${book.slug}` }
    : null;
  return (
    <SectionShell
      section={section}
      ctx={ctx}
      labelled={!!p.title}
      label={p.eyebrow}
      runhead={{ link }}
    >
      {p.title && (
        <div className="head">
          <h2 id={ctx.headingId} className="display-l" lang={keyLang(section, "title")}>
            {p.title}
          </h2>
        </div>
      )}
      <ol className={section.variant === "stacked" ? "excerpts excerpts--stacked" : "excerpts"}>
        {p.items.map((item) => (
          <li key={item.id}>
            {item.label && (
              <p className="label label--accent" lang={keyLang(section, `items.${item.id}.label`)}>
                {caps(item.label)}
              </p>
            )}
            <h3 className="title" lang={keyLang(section, `items.${item.id}.title`)}>
              {item.title}
            </h3>
            <p className="body" lang={keyLang(section, `items.${item.id}.excerpt`)}>
              <Lines text={item.excerpt} />
            </p>
          </li>
        ))}
      </ol>
      <FootLink link={link} />
    </SectionShell>
  );
}
