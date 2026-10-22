/**
 * Audiobook playback for the whole site. The one <audio> element lives in the
 * root layout, so listening carries on across pages and language switches.
 * Each chapter remembers where the reader stopped (in this browser only), and
 * the Media Session API drives the lock screen and headphone buttons.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type PlayableTrack = {
  id: string;
  title: string;
  /** Null when the chapter is not free to stream. */
  src: string | null;
  mime: string;
  durationSeconds: number | null;
};

export type PlayableBook = {
  id: string;
  title: string;
  narrator: string;
  coverSrc: string | null;
  /** Where "Open the player" goes: the page and anchor of the full player. */
  playerHref: string;
  tracks: PlayableTrack[];
};

type AudioState = {
  book: PlayableBook | null;
  index: number;
  playing: boolean;
  position: number;
  duration: number;
  rate: number;
  /** True while the full player is on screen (the docked player then hides). */
  playerVisible: boolean;
};

type AudioApi = AudioState & {
  /** Select a book and chapter. Starts playing when `autoplay` is set (it needs a user gesture). */
  load: (book: PlayableBook, index: number, autoplay?: boolean) => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  skip: (delta: number) => void;
  step: (delta: 1 | -1) => void;
  cycleRate: () => void;
  setPlayerVisible: (visible: boolean) => void;
  /** Where the reader stopped in a chapter, or 0. */
  savedPosition: (trackId: string) => number;
  /** The chapter the reader last listened to in this book, if any. */
  lastTrack: (bookId: string) => { trackId: string; position: number } | null;
};

const RATES = [1, 1.25, 1.5, 1.75, 2, 0.75];
const STORE = "ap:listen:";

const AudioContext = createContext<AudioApi | null>(null);

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(STORE + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(STORE + key, JSON.stringify(value));
  } catch {
    // Private mode or storage full: playback still works, it just won't resume.
  }
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioState>({
    book: null,
    index: 0,
    playing: false,
    position: 0,
    duration: 0,
    rate: 1,
    playerVisible: false,
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  const savedPosition = useCallback((trackId: string) => read<number>(`pos:${trackId}`) ?? 0, []);
  const lastTrack = useCallback(
    (bookId: string) => read<{ trackId: string; position: number }>(`last:${bookId}`),
    [],
  );

  const remember = useCallback(() => {
    const { book, index } = stateRef.current;
    const audio = audioRef.current;
    const track = book?.tracks[index];
    if (!book || !track || !audio) return;
    write(`pos:${track.id}`, Math.floor(audio.currentTime));
    write(`last:${book.id}`, { trackId: track.id, position: Math.floor(audio.currentTime) });
  }, []);

  const load = useCallback(
    (book: PlayableBook, index: number, autoplay = false) => {
      const audio = audioRef.current;
      const track = book.tracks[index];
      if (!audio || !track?.src) return;
      remember();
      const same = stateRef.current.book?.id === book.id && stateRef.current.index === index;
      if (!same) {
        audio.src = track.src;
        audio.currentTime = 0;
        const resume = savedPosition(track.id);
        const startAt = resume > 5 ? resume : 0;
        const apply = () => {
          if (startAt && (!track.durationSeconds || startAt < track.durationSeconds - 5)) {
            audio.currentTime = startAt;
          }
        };
        audio.addEventListener("loadedmetadata", apply, { once: true });
        setState((s) => ({
          ...s,
          book,
          index,
          position: startAt,
          duration: track.durationSeconds ?? 0,
        }));
      }
      if (autoplay) void audio.play().catch(() => undefined);
    },
    [remember, savedPosition],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !stateRef.current.book) return;
    if (audio.paused) void audio.play().catch(() => undefined);
    else audio.pause();
  }, []);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const max = Number.isFinite(audio.duration) ? audio.duration : stateRef.current.duration;
    audio.currentTime = Math.max(0, Math.min(seconds, max || seconds));
    setState((s) => ({ ...s, position: audio.currentTime }));
  }, []);

  const skip = useCallback(
    (delta: number) => seek((audioRef.current?.currentTime ?? 0) + delta),
    [seek],
  );

  const step = useCallback(
    (delta: 1 | -1) => {
      const { book, index } = stateRef.current;
      if (!book) return;
      // Previous within the first few seconds goes back a chapter; otherwise to the start.
      if (delta === -1 && (audioRef.current?.currentTime ?? 0) > 5) return seek(0);
      let next = index + delta;
      while (book.tracks[next] && !book.tracks[next].src) next += delta;
      if (book.tracks[next]) load(book, next, !audioRef.current?.paused);
    },
    [load, seek],
  );

  const cycleRate = useCallback(() => {
    const audio = audioRef.current;
    const rate = RATES[(RATES.indexOf(stateRef.current.rate) + 1) % RATES.length];
    if (audio) audio.playbackRate = rate;
    setState((s) => ({ ...s, rate }));
  }, []);

  const setPlayerVisible = useCallback(
    (playerVisible: boolean) =>
      setState((s) => (s.playerVisible === playerVisible ? s : { ...s, playerVisible })),
    [],
  );

  // Audio element events.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let lastSaved = 0;
    const onTime = () => {
      setState((s) => ({ ...s, position: audio.currentTime }));
      if (Math.abs(audio.currentTime - lastSaved) > 5) {
        lastSaved = audio.currentTime;
        remember();
      }
    };
    const onPlay = () => setState((s) => ({ ...s, playing: true }));
    const onPause = () => {
      setState((s) => ({ ...s, playing: false }));
      remember();
    };
    const onMeta = () =>
      setState((s) => ({
        ...s,
        duration: Number.isFinite(audio.duration) ? audio.duration : s.duration,
      }));
    const onEnded = () => {
      const { book, index } = stateRef.current;
      const track = book?.tracks[index];
      if (track) write(`pos:${track.id}`, 0);
      if (book && book.tracks[index + 1]?.src) load(book, index + 1, true);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    const onHide = () => remember();
    window.addEventListener("pagehide", onHide);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
      window.removeEventListener("pagehide", onHide);
    };
  }, [load, remember]);

  // Lock screen and headphone controls.
  const { book: currentBook, index: currentIndex } = state;
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const book = currentBook;
    const track = book?.tracks[currentIndex];
    if (!book || !track) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: book.narrator,
      album: book.title,
      artwork: book.coverSrc ? [{ src: book.coverSrc }] : [],
    });
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => void audioRef.current?.play()],
      ["pause", () => audioRef.current?.pause()],
      ["seekbackward", () => skip(-15)],
      ["seekforward", () => skip(30)],
      ["previoustrack", () => step(-1)],
      ["nexttrack", () => step(1)],
      ["seekto", (details) => details.seekTime !== undefined && seek(details.seekTime)],
    ];
    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Not every browser supports every action.
      }
    }
  }, [currentBook, currentIndex, seek, skip, step]);

  const api = useMemo<AudioApi>(
    () => ({
      ...state,
      load,
      toggle,
      seek,
      skip,
      step,
      cycleRate,
      setPlayerVisible,
      savedPosition,
      lastTrack,
    }),
    [state, load, toggle, seek, skip, step, cycleRate, setPlayerVisible, savedPosition, lastTrack],
  );

  return (
    <AudioContext.Provider value={api}>
      {children}
      {/* No download until the reader presses play. */}
      <audio ref={audioRef} preload="none" />
    </AudioContext.Provider>
  );
}

export function useAudio(): AudioApi {
  const api = useContext(AudioContext);
  if (!api) throw new Error("useAudio must be used inside AudioProvider");
  return api;
}

/** 754 → "12:34", 3754 → "1:02:34". */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
