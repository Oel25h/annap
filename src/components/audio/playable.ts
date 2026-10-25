/**
 * The audiobooks a page can play, in the shape the player, the docked mini
 * player and the hero's Listen line all read. A page builds this list once per
 * player section, so every part of the page agrees on the editions and their
 * order.
 */
import type { Locale } from "@/lib/i18n/locale";
import { nb } from "@/lib/i18n/rag";
import type { AudiobookItem, MediaMap, RenderedSection } from "@/sections/types";

export type PlayableTrack = {
  id: string;
  title: string;
  /** Null when the chapter is not free to stream: its row leads to where the book is sold. */
  src: string | null;
  mime: string;
  durationSeconds: number | null;
  /** The chapter's first sentence, set large on the verso. May be empty. */
  openingLine: string;
};

export type PlayableBook = {
  id: string;
  title: string;
  narrator: string;
  coverSrc: string | null;
  /** Smaller variants of the cover, for the 32 and 36px thumbnails. */
  coverSrcSet: string | null;
  /** The language of the recording. */
  locale: Locale;
  /** The book this edition records, so a language change can load the other recording. */
  bookId: string | null;
  /** Where "Open the player" goes: the page (English path) and anchor of the full player. */
  playerHref: string;
  /**
   * Where the full audiobook is sold, for chapters that are not free to stream;
   * null when nowhere is, and the row is then plain text.
   */
  bookHref: string | null;
  tracks: PlayableTrack[];
};

export function toPlayable(item: AudiobookItem, media: MediaMap, playerHref: string): PlayableBook {
  const cover = item.coverMediaId ? media[item.coverMediaId] : undefined;
  return {
    id: item.id,
    title: item.title,
    narrator: item.narrator,
    coverSrc: cover?.src ?? null,
    coverSrcSet: cover?.srcSet ?? null,
    locale: item.locale,
    bookId: item.bookId,
    playerHref,
    bookHref: item.fullUrl,
    tracks: item.tracks.map((track) => {
      const audio = track.audioMediaId ? media[track.audioMediaId] : undefined;
      return {
        id: track.id,
        title: track.title,
        src: audio?.src ?? null,
        mime: audio?.mime ?? "audio/mpeg",
        durationSeconds: track.durationSeconds ?? audio?.durationSeconds ?? null,
        openingLine: nb(track.openingLine.trim()),
      };
    }),
  };
}

/**
 * The editions one player section offers ("single" shows the first). The hero
 * calls this with the same section so its Listen line matches the spread.
 * `pagePath` may carry the /el prefix; links keep the reader's language anyway.
 */
export function sectionBooks(
  section: RenderedSection<"audiobook_player">,
  media: MediaMap,
  pagePath: string,
): PlayableBook[] {
  const items = section.data?.audiobooks ?? [];
  const shown = section.variant === "shelf" ? items : items.slice(0, 1);
  const path = pagePath.replace(/^\/el(?=\/|$)/, "") || "/";
  const href = `${path}#${section.settings.anchor || "listen"}`;
  return shown.map((item) => toPlayable(item, media, href));
}

/** The first chapter that can be played here. */
export function firstPlayable(book: PlayableBook): number {
  return Math.max(
    0,
    book.tracks.findIndex((track) => track.src),
  );
}

/** The nearest playable chapter before (-1) or after (1) `index`, or -1. */
export function neighbour(book: PlayableBook, index: number, delta: 1 | -1): number {
  for (let i = index + delta; i >= 0 && i < book.tracks.length; i += delta) {
    if (book.tracks[i].src) return i;
  }
  return -1;
}

/** Seconds in the whole book, or in its chapters before `index`. */
export function bookSeconds(book: PlayableBook, before = book.tracks.length): number {
  return book.tracks.slice(0, before).reduce((sum, track) => sum + (track.durationSeconds ?? 0), 0);
}
