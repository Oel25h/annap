/**
 * A book's own page opens with the home book's grid: the cover in the arch
 * niche on 1–5, and on 7–12 the h1, the formats beside the cover, "Read it
 * free ↓" and "All books →". "Who it's for" takes the review's place under
 * them. The player follows the intro, so its format row reads "Listen below".
 */
import { Icon } from "@/components/site/Icon";
import { useT } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/locale";
import { nb } from "@/lib/i18n/rag";
import { BookCover, BookRating, Offers } from "@/sections/components/BookSections";
import type { ItemIntro as Intro, MediaMap } from "@/sections/types";
import { TextLink } from "../render/SectionShell";
import { Lines } from "../render/text";

const langIf = (lang: Locale, page: Locale) => (lang !== page ? lang : undefined);

export function BookIntro({
  intro,
  media,
  locale,
  listenAnchor,
  indexed,
}: {
  intro: Extract<Intro, { kind: "book" }>;
  media: MediaMap;
  locale: Locale;
  listenAnchor: string | null;
  /** /books is published: the way back to it has somewhere to go. */
  indexed: boolean;
}) {
  const t = useT();
  const { book } = intro;
  const lang = langIf(book.textLang, locale);
  return (
    <header className="item-intro item-intro--book band-ivory">
      <div className="wrap">
        <div className="book-grid grid-12">
          <div className="book-cover">
            <BookCover book={book} media={media} arch="feature" priority />
          </div>
          <div className="book-body">
            <h1 className="display-xl" lang={lang}>
              {nb(book.title)}
            </h1>
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
            <Offers
              book={book}
              listen={listenAnchor ? { anchor: listenAnchor, above: false } : null}
              id="formats"
            />
            {(book.freeDownload || indexed) && (
              <p className="book-links">
                {book.freeDownload && (
                  <a className="link" href="#free-ebook">
                    {t.items.book.freeEbook}
                    <Icon name="arrow-down" />
                  </a>
                )}
                {indexed && <TextLink link={{ label: t.items.back.book, href: "/books" }} />}
              </p>
            )}
          </div>
          {intro.whoFor && (
            <div className="book-aside">
              <h2 className="title">{t.items.book.whoFor}</h2>
              <p className="body" lang={langIf(intro.whoForLang, locale)}>
                <Lines text={intro.whoFor} />
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
