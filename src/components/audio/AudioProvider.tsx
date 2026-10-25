/**
 * Audiobook playback for the whole site. The one <audio> element lives in the
 * root layout, so listening carries on across pages. A language change loads
 * the same book's recording in the new language.
 * Each edition remembers its chapter, position, speed and finished chapters
 * in this browser (read after hydration, so the server and the first render
 * always show a first visit), and the Media Session API drives the lock
 * screen and headphone buttons. Playing, waiting and error states come from
 * the element's own events: Pause shows only once sound really plays, and
 * "Buffering…" only once a wait has lasted 400ms.
 */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useLocale } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/locale";
import { firstPlayable, neighbour, type PlayableBook } from "./playable";
import {
  createStore,
  editionView,
  INITIAL,
  miniPlayerShown,
  RATES,
  readStored,
  resumeAt,
  selectedBook,
  shallowEqual,
  storage,
  type AudioState,
  type BookRecord,
  type Store,
} from "./store";

export type { PlayableBook, PlayableTrack } from "./playable";

/** Loading text waits this long, as everywhere on the site, so a short stall never flashes. */
const LOADING_DELAY = 400;
/** HTMLMediaElement.HAVE_FUTURE_DATA: enough is buffered to play on. */
const HAVE_FUTURE_DATA = 3;
/** HTMLMediaElement.HAVE_METADATA: duration and seeking are known. */
const HAVE_METADATA = 1;

/** What the page can ask of the player. Every action takes the edition and chapter it applies to. */
export type AudioActions = {
  /** Play or pause this chapter (Play in the spread and the mini player). Needs a user gesture. */
  playPause: (book: PlayableBook, index: number) => void;
  /** Play a chapter from where the reader stopped in it; the current one just keeps playing. */
  playChapter: (book: PlayableBook, index: number) => void;
  /** The previous (-1) or next (1) playable chapter; keeps playing if it was. */
  step: (book: PlayableBook, index: number, delta: 1 | -1) => void;
  seek: (book: PlayableBook, index: number, seconds: number) => void;
  skip: (book: PlayableBook, index: number, delta: number) => void;
  cycleRate: (book: PlayableBook) => void;
  /** Choose the edition this language's pages show. Never starts or stops sound. */
  selectEdition: (locale: Locale, bookId: string) => void;
  /** The spread reports whether it is on screen, and which edition it shows. */
  setSpread: (visible: boolean, bookId: string | null) => void;
  /** Load the current chapter again after an error. */
  retry: () => void;
  /**
   * Point the element at another edition of the same book (a language change).
   * Keeps playing only when it was already playing.
   */
  retarget: (book: PlayableBook, index: number, autoplay: boolean) => void;
};

const AudioContext = createContext<{ store: Store; actions: AudioActions } | null>(null);

/** The actions, plus the two the element's events need. */
function createPlayer(store: Store, element: () => HTMLAudioElement | null) {
  const state = store.get;
  const isLoaded = (book: PlayableBook, index?: number) => {
    const s = state();
    return s.book?.id === book.id && (index === undefined || s.index === index);
  };

  const record = (book: PlayableBook): BookRecord =>
    state().records[book.id] ?? {
      v: 1,
      trackId: book.tracks[firstPlayable(book)]?.id ?? "",
      position: 0,
      rate: 1,
      played: [],
    };

  const patchRecord = (book: PlayableBook, patch: Partial<BookRecord>) => {
    const next = { ...record(book), ...patch };
    storage.write(`book:${book.id}`, next);
    store.set((s) => ({ records: { ...s.records, [book.id]: next } }));
  };

  /** Where the reader stopped in a chapter: its edition's record, else the chapter's own note. */
  const storedPosition = (book: PlayableBook, index: number) => {
    const track = book.tracks[index];
    if (!track) return 0;
    const own = state().records[book.id];
    const saved =
      own?.trackId === track.id ? own.position : (storage.read<number>(`pos:${track.id}`) ?? 0);
    return resumeAt(saved, track.durationSeconds);
  };

  /** Notes the loaded chapter's position; a chapter left within 5 s of its end counts as heard. */
  const remember = () => {
    const s = state();
    const audio = element();
    const track = s.book?.tracks[s.index];
    if (!s.book || !track || !audio) return;
    const at = Math.floor(audio.currentTime);
    const duration = Number.isFinite(audio.duration) ? audio.duration : s.duration;
    const done = duration > 0 && duration - audio.currentTime <= 5;
    const { played } = record(s.book);
    storage.write(`pos:${track.id}`, at);
    patchRecord(s.book, {
      trackId: track.id,
      position: at,
      played: done && !played.includes(track.id) ? [...played, track.id] : played,
    });
  };

  /** Ask for sound. `requested` is set at once so the chapter change it causes is announced as playing. */
  const start = () => {
    const audio = element();
    if (!audio) return;
    store.set({ error: false, requested: true });
    audio.play().catch(() => store.set({ requested: !audio.paused }));
  };

  /**
   * A position chosen before the chapter's metadata arrived. Most browsers honour
   * currentTime set that early; for the rest it is applied on loadedmetadata. One slot,
   * so every later seek replaces it and the last position chosen is the one that plays.
   */
  let pending: { src: string; at: number } | null = null;
  const applyPending = () => {
    const audio = element();
    const p = pending;
    pending = null;
    if (audio && p && audio.src === p.src && Math.abs(audio.currentTime - p.at) > 1) {
      audio.currentTime = p.at;
    }
  };
  /** Moves the playhead, also before metadata. */
  const setTime = (audio: HTMLAudioElement, at: number) => {
    if (audio.readyState < HAVE_METADATA) {
      pending = { src: audio.src, at };
      // The same function each time, so it is never registered twice.
      audio.addEventListener("loadedmetadata", applyPending, { once: true });
    } else pending = null;
    try {
      audio.currentTime = at;
    } catch {
      // Applied on loadedmetadata.
    }
  };

  /** Put a chapter in the element, paused at `startAt` (or where the reader stopped), then maybe play. */
  const load = (
    book: PlayableBook,
    index: number,
    { startAt, autoplay = false }: { startAt?: number; autoplay?: boolean } = {},
  ) => {
    const audio = element();
    const track = book.tracks[index];
    if (!audio || !track?.src) return;
    if (!isLoaded(book, index)) {
      if (state().book) remember();
      if (!autoplay && !audio.paused) audio.pause();
      const at = startAt ?? storedPosition(book, index);
      const { rate } = record(book);
      audio.src = track.src;
      audio.defaultPlaybackRate = rate;
      audio.playbackRate = rate;
      // Also at 0, so a start left pending by an earlier load of this chapter is replaced.
      setTime(audio, at);
      store.set({
        book,
        index,
        position: at,
        duration: track.durationSeconds ?? 0,
        playing: false,
        buffering: false,
        requested: false,
        error: false,
      });
      patchRecord(book, { trackId: track.id, position: Math.floor(at) });
    } else if (startAt !== undefined) {
      setTime(audio, startAt);
      store.set({ position: startAt });
    }
    if (autoplay) start();
  };

  const seek = (book: PlayableBook, index: number, seconds: number) => {
    const audio = element();
    const track = book.tracks[index];
    if (!audio || !track?.src) return;
    const known = isLoaded(book, index) && Number.isFinite(audio.duration) ? audio.duration : 0;
    const max = known || track.durationSeconds || Infinity;
    const to = Math.max(0, Math.min(seconds, max));
    if (!isLoaded(book, index)) return load(book, index, { startAt: to });
    setTime(audio, to);
    store.set({ position: to });
    if (audio.paused) remember();
  };

  const actions: AudioActions = {
    playPause(book, index) {
      const audio = element();
      if (!audio) return;
      if (!isLoaded(book, index)) return load(book, index, { autoplay: true });
      if (state().playing) audio.pause();
      else start();
    },
    playChapter(book, index) {
      if (isLoaded(book, index) && state().requested) return;
      load(book, index, { autoplay: true });
    },
    step(book, index, delta) {
      const target = neighbour(book, index, delta);
      if (target < 0) return;
      load(book, target, { autoplay: isLoaded(book) && state().requested });
    },
    seek,
    skip(book, index, delta) {
      const audio = element();
      const now = isLoaded(book, index)
        ? (audio?.currentTime ?? state().position)
        : storedPosition(book, index);
      seek(book, index, now + delta);
    },
    cycleRate(book) {
      const at = RATES.indexOf(record(book).rate as (typeof RATES)[number]);
      const rate = RATES[((at < 0 ? 1 : at) + 1) % RATES.length];
      const audio = element();
      if (audio && isLoaded(book)) {
        audio.defaultPlaybackRate = rate;
        audio.playbackRate = rate;
      }
      patchRecord(book, { rate });
    },
    selectEdition(locale, bookId) {
      const { selection } = state();
      if (selection[locale] === bookId) return;
      storage.write(`edition:${locale}`, bookId);
      store.set({ selection: { ...selection, [locale]: bookId } });
    },
    setSpread(visible, bookId) {
      const { spread } = state();
      if (spread.visible !== visible || spread.bookId !== bookId) {
        store.set({ spread: { visible, bookId } });
      }
    },
    retry() {
      const audio = element();
      const { book, position } = state();
      if (!audio || !book) return;
      audio.load();
      // After load() there is no metadata, so this also replaces a start left by the failed load.
      setTime(audio, position);
      start();
    },
    retarget(book, index, autoplay) {
      const track = book.tracks[index];
      if (!track?.src) return;
      const at = Math.max(0, state().position);
      const cap = track.durationSeconds && track.durationSeconds > 0 ? track.durationSeconds : at;
      load(book, index, { startAt: Math.min(at, cap), autoplay });
    },
  };
  return { actions, remember, load };
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [player] = useState(() => {
    const store = createStore();
    return { store, ...createPlayer(store, () => audioRef.current) };
  });
  const { store, actions, remember, load } = player;

  // What this browser remembers, read once the page has hydrated.
  useEffect(() => {
    store.set({ hydrated: true, ...readStored() });
  }, [store]);

  // The element's events are the only source of playing, waiting and error.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const session = typeof navigator !== "undefined" && "mediaSession" in navigator;
    let lastSaved = 0;
    let lastSession = 0;
    const onTime = () => {
      store.set({ position: audio.currentTime });
      if (Math.abs(audio.currentTime - lastSaved) >= 5) {
        lastSaved = audio.currentTime;
        remember();
      }
      if (session && Math.abs(audio.currentTime - lastSession) >= 1) {
        lastSession = audio.currentTime;
        try {
          if (Number.isFinite(audio.duration)) {
            navigator.mediaSession.setPositionState({
              duration: audio.duration,
              playbackRate: audio.playbackRate,
              position: Math.min(audio.currentTime, audio.duration),
            });
          }
        } catch {
          // Older browsers have no position state.
        }
      }
    };
    // "Buffering…" only for a wait the reader would notice; until then the status keeps its text.
    let wait: ReturnType<typeof setTimeout> | undefined;
    const onWaiting = () => {
      if (wait !== undefined || audio.paused) return;
      wait = setTimeout(() => {
        wait = undefined;
        if (!audio.paused && audio.readyState < HAVE_FUTURE_DATA) store.set({ buffering: true });
      }, LOADING_DELAY);
    };
    const settle = () => {
      clearTimeout(wait);
      wait = undefined;
      if (store.get().buffering) store.set({ buffering: false });
    };
    const onPlay = () => {
      store.set({ requested: true });
      if (audio.readyState < HAVE_FUTURE_DATA) onWaiting();
    };
    const onPlaying = () => {
      settle();
      store.set({ playing: true, started: true, error: false });
      if (session) navigator.mediaSession.playbackState = "playing";
    };
    const paused = () => {
      store.set({ requested: false, playing: false });
      if (session) navigator.mediaSession.playbackState = "paused";
    };
    const onPause = () => {
      settle();
      // At a chapter's end `ended` follows and decides: the next chapter, or a stop.
      if (audio.ended) return;
      paused();
      remember();
    };
    const onDuration = () => {
      if (Number.isFinite(audio.duration)) store.set({ duration: audio.duration });
    };
    const onEnded = () => {
      remember();
      const { book, index } = store.get();
      const next = book ? neighbour(book, index, 1) : -1;
      if (book && next >= 0) load(book, next, { autoplay: true });
      else paused();
    };
    const onError = () => {
      settle();
      store.set({ error: true, playing: false, requested: false });
    };
    const events: [string, () => void][] = [
      ["timeupdate", onTime],
      ["play", onPlay],
      ["playing", onPlaying],
      ["waiting", onWaiting],
      ["stalled", onWaiting],
      ["canplay", settle],
      // A new chapter's source: a wait started for the last one no longer counts.
      ["emptied", settle],
      ["pause", onPause],
      ["loadedmetadata", onDuration],
      ["durationchange", onDuration],
      ["ended", onEnded],
      ["error", onError],
    ];
    for (const [name, handler] of events) audio.addEventListener(name, handler);
    window.addEventListener("pagehide", remember);
    return () => {
      clearTimeout(wait);
      for (const [name, handler] of events) audio.removeEventListener(name, handler);
      window.removeEventListener("pagehide", remember);
    };
  }, [store, remember, load]);

  // Lock screen and headphone controls follow the loaded chapter.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    // Each acts on the loaded chapter.
    const on =
      (act: (book: PlayableBook, index: number, details: MediaSessionActionDetails) => void) =>
      (details: MediaSessionActionDetails) => {
        const { book, index } = store.get();
        if (book) act(book, index, details);
      };
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => void audioRef.current?.play().catch(() => undefined)],
      ["pause", () => audioRef.current?.pause()],
      ["seekbackward", on((book, index) => actions.skip(book, index, -15))],
      ["seekforward", on((book, index) => actions.skip(book, index, 30))],
      ["previoustrack", on((book, index) => actions.step(book, index, -1))],
      ["nexttrack", on((book, index) => actions.step(book, index, 1))],
      [
        "seekto",
        on((book, index, details) => {
          if (details.seekTime !== undefined) actions.seek(book, index, details.seekTime);
        }),
      ],
    ];
    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Not every browser supports every action.
      }
    }
    let shown = "";
    const update = () => {
      const { book, index } = store.get();
      const track = book?.tracks[index];
      const key = book && track ? `${book.id}:${track.id}` : "";
      if (!book || !track || key === shown) return;
      shown = key;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: book.narrator,
        album: book.title,
        artwork: book.coverSrc ? [{ src: book.coverSrc, type: "image/jpeg" }] : [],
      });
    };
    return store.subscribe(update);
  }, [store, actions]);

  return (
    <AudioContext.Provider value={player}>
      {children}
      {/* No download until the reader presses play. */}
      <audio ref={audioRef} preload="none" />
    </AudioContext.Provider>
  );
}

function useAudioContext() {
  const value = useContext(AudioContext);
  if (!value) throw new Error("Audio hooks must be used inside AudioProvider");
  return value;
}

/**
 * Reads part of the listening state. The component re-renders only when the
 * selected values change (compared one level deep), so a selector that leaves
 * out the position doesn't re-render on every tick.
 */
export function useAudioState<T>(selector: (state: AudioState) => T): T {
  const { store } = useAudioContext();
  const memo = useRef<{ state: AudioState; selector: unknown; value: T } | null>(null);
  const read = (state: AudioState) => {
    const last = memo.current;
    if (last && last.state === state && last.selector === selector) return last.value;
    const next = selector(state);
    const value = last && shallowEqual(last.value, next) ? last.value : next;
    memo.current = { state, selector, value };
    return value;
  };
  return useSyncExternalStore(
    store.subscribe,
    () => read(store.get()),
    () => read(INITIAL),
  );
}

export function useAudioActions(): AudioActions {
  return useAudioContext().actions;
}

/** The loaded edition and whether it plays, plus the actions (no clock, so no re-render per tick). */
export function useAudio() {
  const { actions } = useAudioContext();
  const state = useAudioState((s) => ({
    book: s.book,
    index: s.index,
    playing: s.playing,
    started: s.started,
  }));
  return { ...state, ...actions };
}

/** The edition a page shows among `books` (its spread, its hero line). */
export function useSelectedBook(books: PlayableBook[]): PlayableBook | undefined {
  const locale = useLocale();
  return useAudioState((s) => selectedBook(s, books, locale));
}

/**
 * The hero's Listen line, for the edition the page's player shows: "start"
 * or "resume" (minutes left). A single recording is `whole` and is never
 * described as a chapter. Always "start" on the server and in the first
 * render in the browser.
 */
export function useListen(books: PlayableBook[]): {
  kind: "start" | "resume";
  chapter: number;
  minutesLeft: number;
  whole: boolean;
} {
  const locale = useLocale();
  return useAudioState((s) => {
    const book = selectedBook(s, books, locale);
    if (!book) return { kind: "start" as const, chapter: 1, minutesLeft: 0, whole: true };
    const view = editionView(s, book);
    const resume = s.hydrated && (view.returning || (view.loaded && s.started));
    return {
      kind: resume ? ("resume" as const) : ("start" as const),
      chapter: view.index + 1,
      minutesLeft: Math.max(1, Math.ceil((view.duration - view.position) / 60)),
      whole: book.tracks.length <= 1,
    };
  });
}

/** Whether the mini player is docked (other bottom bars step aside while it is). */
export function useMiniPlayerShown(): boolean {
  return useAudioState(miniPlayerShown);
}

/**
 * Brings the full player into view and puts focus on its Play button, never
 * starting sound. On phones Play sits below the opening line, so it is the
 * part scrolled into view. Returns false when the player isn't on this page or,
 * given `bookId`, shows another edition.
 */
export function openPlayer(anchor: string, bookId?: string): boolean {
  const section = document.getElementById(anchor);
  const play = document.getElementById(`${anchor}-play`);
  if (!section || !play) return false;
  if (bookId && play.dataset.bookId !== bookId) return false;
  if (window.matchMedia("(min-width: 1024px)").matches) section.scrollIntoView();
  else play.scrollIntoView({ block: "center" });
  play.focus({ preventScroll: true });
  return true;
}
