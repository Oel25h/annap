/**
 * The listening state the whole site shares: which edition is in the <audio>
 * element and where, what the reader chose, and what this browser remembers
 * about each edition. A small external store, so a component re-renders only
 * when the part it reads changes (the clock ticks about four times a second).
 */
import type { Locale } from "@/lib/i18n/locale";
import { firstPlayable, type PlayableBook } from "./playable";

/** The speeds the speed button cycles through, starting at 1×. */
export const RATES = [0.75, 1, 1.25, 1.5, 2] as const;

/** What this browser remembers about one edition. */
export type BookRecord = {
  v: 1;
  /** The chapter the reader is on, and where in it. */
  trackId: string;
  position: number;
  rate: number;
  /** Chapters heard to the end. */
  played: string[];
};

export type AudioState = {
  /** False on the server and in the first render in the browser: storage is read after hydration. */
  hydrated: boolean;
  /** The edition in the <audio> element, if any, and its chapter. */
  book: PlayableBook | null;
  index: number;
  position: number;
  duration: number;
  /** The reader asked for sound: the element is not paused. */
  requested: boolean;
  /** Sound is coming out (the `playing` event), so Pause may show. */
  playing: boolean;
  buffering: boolean;
  error: boolean;
  /** Playback has started at least once since this page was opened. */
  started: boolean;
  /** Whether a spread is on screen, and the edition it shows. */
  spread: { visible: boolean; bookId: string | null };
  /** The edition chosen on each language's pages. */
  selection: Partial<Record<Locale, string>>;
  records: Record<string, BookRecord>;
};

export const INITIAL: AudioState = {
  hydrated: false,
  book: null,
  index: 0,
  position: 0,
  duration: 0,
  requested: false,
  playing: false,
  buffering: false,
  error: false,
  started: false,
  spread: { visible: false, bookId: null },
  selection: {},
  records: {},
};

export type Store = {
  get: () => AudioState;
  set: (patch: Partial<AudioState> | ((state: AudioState) => Partial<AudioState>)) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createStore(): Store {
  let state = INITIAL;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/* ---------- This browser's memory (localStorage; every access may throw) ---------- */

const PREFIX = "ap:listen:";

export const storage = {
  read<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  write(key: string, value: unknown) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Private mode or storage full: playback still works, it just won't resume.
    }
  },
  keys(): string[] {
    try {
      return Object.keys(localStorage)
        .filter((key) => key.startsWith(PREFIX))
        .map((key) => key.slice(PREFIX.length));
    } catch {
      return [];
    }
  },
};

function asRecord(value: unknown): BookRecord | null {
  const r = value as Partial<BookRecord> | null;
  if (!r || typeof r.trackId !== "string" || typeof r.position !== "number") return null;
  return {
    v: 1,
    trackId: r.trackId,
    position: Number.isFinite(r.position) ? Math.max(0, r.position) : 0,
    rate: RATES.includes(r.rate as (typeof RATES)[number]) ? (r.rate as number) : 1,
    played: Array.isArray(r.played) ? r.played.filter((id) => typeof id === "string") : [],
  };
}

/**
 * Everything remembered: the chosen edition per language and one record per
 * edition. A 2.0 `last:{id}` entry counts when an edition has no record yet.
 */
export function readStored(): Pick<AudioState, "selection" | "records"> {
  const selection: AudioState["selection"] = {};
  const records: AudioState["records"] = {};
  const legacy: [string, BookRecord][] = [];
  for (const key of storage.keys()) {
    const [kind, id] = key.split(/:(.*)/s);
    if (kind === "edition" && (id === "en" || id === "el")) {
      const chosen = storage.read<string>(key);
      if (typeof chosen === "string") selection[id] = chosen;
    } else if (kind === "book" || kind === "last") {
      const record = asRecord(storage.read(key));
      if (record && kind === "book") records[id] = record;
      else if (record) legacy.push([id, record]);
    }
  }
  for (const [id, record] of legacy) records[id] ??= record;
  return { selection, records };
}

/* ---------- Derived state ---------- */

/** A remembered position worth resuming: not the first seconds, not the last. */
export function resumeAt(position: number, duration: number | null): number {
  return position > 5 && (!duration || position < duration - 5) ? position : 0;
}

/** One edition as the spread, the hero and the mini player show it. */
export type EditionView = {
  /** This edition is in the <audio> element. */
  loaded: boolean;
  index: number;
  position: number;
  duration: number;
  rate: number;
  played: readonly string[];
  /** The reader has been here before: a later chapter, a position or a finished chapter. */
  returning: boolean;
};

const NONE: readonly string[] = [];

export function editionView(state: AudioState, book: PlayableBook): EditionView {
  const loaded = state.book?.id === book.id;
  const record = state.hydrated ? state.records[book.id] : undefined;
  const first = firstPlayable(book);
  let index = first;
  if (loaded) index = state.index;
  else if (record) {
    const at = book.tracks.findIndex((track) => track.id === record.trackId && track.src);
    if (at >= 0) index = at;
  }
  const track = book.tracks[index];
  const position = loaded
    ? state.position
    : record && track && record.trackId === track.id
      ? resumeAt(record.position, track.durationSeconds)
      : 0;
  const played = record?.played.length ? record.played : NONE;
  return {
    loaded,
    index,
    position,
    duration: (loaded && state.duration) || track?.durationSeconds || 0,
    rate: record?.rate ?? 1,
    played,
    returning: !!record && (index !== first || position > 5 || played.length > 0),
  };
}

/**
 * The edition a page shows: the one chosen on this language's pages, else the
 * one playing, else the first.
 */
export function selectedBook(
  state: AudioState,
  books: PlayableBook[],
  locale: Locale,
): PlayableBook | undefined {
  const chosen = state.selection[locale];
  const playing = state.started ? state.book?.id : undefined;
  return (
    books.find((book) => book.id === chosen) ??
    books.find((book) => book.id === playing) ??
    books[0]
  );
}

/**
 * The mini player docks once playback has started this session and the spread
 * is off screen. A spread showing another edition doesn't hide it while sound plays.
 */
export function miniPlayerShown(state: AudioState): boolean {
  if (!state.started || !state.book) return false;
  const { visible, bookId } = state.spread;
  return !(visible && (bookId === state.book.id || !state.requested));
}

/** Same keys, same values (Object.is): a selector's result can be reused. */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((key) =>
    Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}
