/**
 * What the hero's Listen action says under its label, so it always matches
 * the player below it. A first visit is ready to start; a returning listener
 * resumes where the player will open, with the minutes left.
 *
 * A thin adapter over the player's own `useListen`, which picks the same
 * edition the spread shows. Where the reader stopped lives in this browser
 * only, so the server render and the first client render always say "start".
 */
import { useListen, type PlayableBook } from "./AudioProvider";

/** The page's player: its anchor and its editions, in the order the player shows them. */
export type Listen = { anchor: string; books: PlayableBook[] };

export type ListenMeta = {
  kind: "start" | "resume";
  /** 1-based chapter number. Unused when `whole` is set. */
  chapter: number;
  /** Whole minutes left when resuming, otherwise null. */
  minutesLeft: number | null;
  /** One recording, not a list of chapters. */
  whole: boolean;
};

const NO_BOOKS: PlayableBook[] = [];

export function useListenMeta(listen: Listen | null): ListenMeta {
  const { kind, chapter, minutesLeft, whole } = useListen(listen?.books ?? NO_BOOKS);
  return { kind, chapter, minutesLeft: kind === "resume" ? minutesLeft : null, whole };
}
