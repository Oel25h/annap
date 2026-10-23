/**
 * Renders a page's sections in order, under the page's band rules:
 * - the page's one h1 is the hero's, the item intro's, or else the first
 *   section's own heading; a title band appears only when that section has none;
 * - every band is bright (ivory or peach, as on the original site), and two
 *   peach bands never touch. The rules apply to
 *   the sections a reader actually sees, after empty lists drop out (except
 *   the page's own list, which shows its empty state: see visibility.ts).
 *
 * Collection items render through ItemPageView, which supplies the intro, so
 * the item renderers stay out of the home page's JavaScript.
 */
import { useMemo, type ReactNode } from "react";
import { sectionBooks } from "@/components/audio/playable";
import type { Listen } from "@/components/audio/useListenMeta";
import { useT } from "@/lib/i18n/context";
import { Icon } from "@/components/site/Icon";
import { nb } from "@/lib/i18n/rag";
import type { SectionType } from "@/sections/schemas";
import type { MediaMap, PageData, RenderedSection } from "@/sections/types";
import { AudiobookPlayer } from "./components/AudiobookPlayer";
import { BookExcerpts, BookList, EbookGate, FeaturedBook } from "./components/BookSections";
import {
  Events,
  FoundationStories,
  LatestPosts,
  MediaKit,
  Masterclasses,
  Press,
  Products,
  Testimonials,
} from "./components/CollectionSections";
import { ContactForm, Donation, Newsletter } from "./components/FormSections";
import { Hero } from "./components/Hero";
import { Embed, Gallery, Video } from "./components/MediaSections";
import {
  CallToAction,
  Faq,
  ImageSection,
  LinkList,
  List,
  Quote,
  RichText,
  Stats,
  Timeline,
  TwoColumn,
} from "./components/TextSections";
import type { Band, SectionContext } from "./render/SectionShell";
import { hasHeading, isEmpty, primaryCollection } from "./visibility";

type Common<T extends SectionType> = {
  section: RenderedSection<T>;
  media: MediaMap;
  ctx: SectionContext;
};

type Simple = { [T in SectionType]?: (props: Common<T>) => ReactNode };

const SIMPLE: Simple = {
  book_list: BookList,
  book_excerpts: BookExcerpts,
  ebook_gate: EbookGate,
  rich_text: RichText,
  two_column: TwoColumn,
  quote: Quote,
  image: ImageSection,
  gallery: Gallery,
  video: Video,
  latest_posts: LatestPosts,
  stats: Stats,
  timeline: Timeline,
  list: List,
  testimonials: Testimonials,
  products: Products,
  masterclasses: Masterclasses,
  events: Events,
  press: Press,
  media_kit: MediaKit,
  foundation_stories: FoundationStories,
  donation: Donation,
  newsletter: Newsletter,
  contact_form: ContactForm,
  faq: Faq,
  call_to_action: CallToAction,
  link_list: LinkList,
  embed: Embed,
};

/** Draws an item page's intro above its sections (see ItemPageView). */
export type IntroView = (props: { page: PageData; listenAnchor: string | null }) => ReactNode;

/** The page's audiobook player, where it sits and what it offers, when it has something to play. */
type PageListen = Listen & { index: number };

function findListen(sections: RenderedSection[], media: MediaMap, path: string): PageListen | null {
  const index = sections.findIndex((s) => s.type === "audiobook_player");
  const section = sections[index];
  if (section?.type !== "audiobook_player") return null;
  const books = sectionBooks(section, media, path);
  if (books.length === 0) return null;
  return { anchor: section.settings.anchor || "listen", books, index };
}

/** The band each visible section is drawn on: a hero is always ivory, and two peach bands never touch. */
function effectiveBands(sections: RenderedSection[]): Band[] {
  const bands: Band[] = [];
  sections.forEach((section, index) => {
    let band: Band = section.type === "hero" ? "ivory" : section.settings.background;
    if (band === "cream" && bands[index - 1] === "cream") band = "ivory";
    bands.push(band);
  });
  return bands;
}

function SectionView({
  section,
  media,
  ctx,
  index,
  listen,
  path,
}: Common<SectionType> & { index: number; listen: PageListen | null; path: string }) {
  switch (section.type) {
    case "hero":
      return <Hero section={section} media={media} ctx={ctx} listen={listen} />;
    case "featured_book":
      return (
        <FeaturedBook
          section={section}
          media={media}
          ctx={ctx}
          listenAnchor={listen?.anchor ?? null}
          listenAbove={!!listen && listen.index < index}
        />
      );
    case "audiobook_player":
      return <AudiobookPlayer section={section} media={media} ctx={ctx} path={path} />;
    default: {
      const Component = SIMPLE[section.type] as
        ((props: Common<SectionType>) => ReactNode) | undefined;
      return Component ? <Component section={section} media={media} ctx={ctx} /> : null;
    }
  }
}

export function PageView({ page, Intro }: { page: PageData; Intro?: IntroView }) {
  const t = useT();
  const path = page.locale === "el" ? (page.path === "/" ? "/el" : `/el${page.path}`) : page.path;
  const visible = useMemo(() => {
    const primary = primaryCollection(page.sections, page.path);
    return page.sections.filter((section) => !isEmpty(section, page.media, section.id === primary));
  }, [page.sections, page.media, page.path]);
  const listen = useMemo(() => findListen(visible, page.media, path), [visible, page.media, path]);
  const first = visible[0];
  // The first section holds the page's h1 unless an item intro does, or it has no heading.
  const firstHolds = !page.intro && !!first && hasHeading(first);
  const titleBand = !page.intro && !firstHolds;
  const bands = effectiveBands(visible);

  return (
    <>
      {page.locale === "el" && page.hasEnglishParts && (
        <div className="notice-bar" role="note">
          <p className="wrap">
            <Icon name="alert" className="i i-16" />
            <span>{t.site.greekNotice}</span>
          </p>
        </div>
      )}
      {page.intro && Intro && <Intro page={page} listenAnchor={listen?.anchor ?? null} />}
      {titleBand && (
        <header className="title-band band-ivory">
          <div className="wrap">
            <h1
              className="display-xl"
              lang={page.titleLang !== page.locale ? page.titleLang : undefined}
            >
              {nb(page.title)}
            </h1>
          </div>
        </header>
      )}
      {visible.map((section, index) => {
        const ctx: SectionContext = {
          locale: page.locale,
          isFirst: index === 0 && !page.intro && !titleBand,
          headingId: `s-${section.id}`,
          headingLevel: index === 0 && firstHolds ? "h1" : "h2",
          band: bands[index],
          isHome: page.path === "/",
        };
        return (
          <SectionView
            key={section.id}
            section={section}
            media={page.media}
            ctx={ctx}
            index={index}
            listen={listen}
            path={path}
          />
        );
      })}
    </>
  );
}
