/**
 * Renders a page's sections in order. Each section with a running head gets
 * the next chapter numeral (I, II, …); the audiobook player is set apart
 * with "§". The page's one H1 is the hero's heading when the page opens
 * with a hero, otherwise a quiet title band.
 */
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/context";
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
import type { SectionContext } from "./render/SectionShell";
import { toRoman } from "./render/text";

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

/** Section types whose eyebrow is set inside the section rather than as a running head. */
const NO_RUNHEAD = new Set<SectionType>([
  "hero",
  "audiobook_player",
  "ebook_gate",
  "newsletter",
  "donation",
]);

function hasRunhead(section: RenderedSection): boolean {
  if (NO_RUNHEAD.has(section.type)) return false;
  const eyebrow = (section.props as { eyebrow?: unknown }).eyebrow;
  return typeof eyebrow === "string" && eyebrow.trim() !== "";
}

/** The anchor of the page's audiobook player, when it has one with something to play. */
function findListenAnchor(sections: RenderedSection[]): string | null {
  for (const section of sections) {
    if (section.type !== "audiobook_player") continue;
    const data = (section as RenderedSection<"audiobook_player">).data;
    if (data && data.audiobooks.length > 0) return section.settings.anchor || "listen";
  }
  return null;
}

function SectionView({
  section,
  media,
  ctx,
  listenAnchor,
  path,
}: Common<SectionType> & { listenAnchor: string | null; path: string }) {
  switch (section.type) {
    case "hero":
      return <Hero section={section} media={media} ctx={ctx} listenAnchor={listenAnchor} />;
    case "featured_book":
      return <FeaturedBook section={section} media={media} ctx={ctx} listenAnchor={listenAnchor} />;
    case "audiobook_player":
      return <AudiobookPlayer section={section} media={media} ctx={ctx} path={path} />;
    default: {
      const Component = SIMPLE[section.type] as
        ((props: Common<SectionType>) => ReactNode) | undefined;
      return Component ? <Component section={section} media={media} ctx={ctx} /> : null;
    }
  }
}

export function PageView({ page }: { page: PageData }) {
  const t = useT();
  const listenAnchor = findListenAnchor(page.sections);
  const opensWithHero = page.sections[0]?.type === "hero";
  const path = page.locale === "el" ? (page.path === "/" ? "/el" : `/el${page.path}`) : page.path;
  let chapter = 0;

  return (
    <>
      {!opensWithHero && (
        <header className="title-band">
          <div className="wrap">
            <h1
              className="display-l"
              lang={page.titleLang !== page.locale ? page.titleLang : undefined}
            >
              {page.title}
            </h1>
          </div>
        </header>
      )}
      {page.locale === "el" && page.hasEnglishParts && (
        <p className="lang-notice wrap meta" role="note">
          {t.site.greekNotice}
        </p>
      )}
      {page.sections.map((section, index) => {
        const numeral = hasRunhead(section) ? toRoman(++chapter) : null;
        const ctx: SectionContext = {
          locale: page.locale,
          numeral,
          // Without a hero the title band comes first, so no section loads images eagerly.
          isFirst: index === 0 && opensWithHero,
          headingId: `s-${section.id}`,
        };
        return (
          <SectionView
            key={section.id}
            section={section}
            media={page.media}
            ctx={ctx}
            listenAnchor={listenAnchor}
            path={path}
          />
        );
      })}
    </>
  );
}
