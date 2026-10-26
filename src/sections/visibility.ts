/**
 * What a section will show, decided before it renders: the page uses it to
 * apply the band rules to the sections a reader actually sees, and to give the
 * page's h1 to the first section's heading. Each rule mirrors the component's
 * own early return, so the two never disagree.
 *
 * An empty list is the one case the page decides. On the page that exists to
 * list it (its primary collection, below), it stays and says what is missing,
 * with a next step; anywhere else (home, About) it drops out.
 */
import type { SectionType } from "./schemas";
import type { MediaMap, RenderedSection } from "./types";

/** Where each list that has an empty state is shown in full. */
const LISTED_AT: Partial<Record<SectionType, string>> = {
  latest_posts: "/blog",
  video: "/videos",
  products: "/shop",
  masterclasses: "/masterclasses",
  events: "/events",
  press: "/press",
  foundation_stories: "/foundation",
};

/**
 * The page's primary collection: its first section of the type listed at its
 * path (the products on /shop, the foundation stories on /foundation), or
 * null. `path` is the page's English path. The journal index needs no rule:
 * a stories section that pages through every post shows wherever it sits.
 */
export function primaryCollection(sections: RenderedSection[], path: string): string | null {
  return sections.find((s) => !s.settings.hidden && LISTED_AT[s.type] === path)?.id ?? null;
}

/**
 * True when the section renders nothing (an empty list, a missing book or
 * image). `primary`: the section is the page's primary collection, which
 * shows its empty state instead.
 */
export function isEmpty(section: RenderedSection, media?: MediaMap, primary = false): boolean {
  if (section.settings.hidden) return true;
  switch (section.type) {
    case "audiobook_player":
      return !section.data || section.data.audiobooks.length === 0;
    case "featured_book":
      return !section.data?.book;
    case "ebook_gate":
      return !section.data?.book.freeDownload && !section.data?.book.greekEbookUnavailable;
    case "book_list":
      return !section.data || section.data.books.length === 0;
    case "latest_posts":
      return !primary && !section.data?.pagination && !section.data?.posts.length;
    case "video":
      return !primary && !section.data?.videos.length;
    case "testimonials":
      return !section.data || section.data.items.length === 0;
    case "gallery":
      // Like Gallery itself: only the ids that still resolve to an image count.
      return !section.data?.imageMediaIds.some((id) => !media || media[id]?.kind === "image");
    case "products":
      return !primary && !section.data?.products.length;
    case "masterclasses":
      return !primary && !section.data?.items.length;
    case "events":
      return !primary && !section.data?.upcoming.length && !section.data?.past.length;
    case "press":
      return !primary && !section.data?.items.length;
    case "foundation_stories":
      return !primary && !section.data?.stories.length;
    case "image":
      return !!media && media[section.props.imageMediaId]?.kind !== "image";
    default:
      return false;
  }
}

/** True when the section renders a heading of its own, which may become the page's h1. */
export function hasHeading(section: RenderedSection): boolean {
  switch (section.type) {
    case "hero":
    case "featured_book":
    case "audiobook_player":
    case "ebook_gate":
    case "two_column":
    case "donation":
    case "newsletter":
    case "call_to_action":
      return true;
    case "quote":
    case "image":
    case "stats":
    case "link_list":
      return false;
    default: {
      const title = (section.props as { title?: unknown }).title;
      return typeof title === "string" && title.trim() !== "";
    }
  }
}
