/**
 * What the hero's Listen action says under its label, so it always matches
 * the player below it: a first visit starts at chapter 1; a returning listener
 * resumes where the player will open, with the minutes left in that chapter.
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
  /** 1-based chapter number. */
  chapter: number;
  /** Whole minutes left in that chapter when resuming, otherwise null. */
  minutesLeft: number | null;
};

const NO_BOOKS: PlayableBook[] = [];

export function useListenMeta(listen: Listen | null): ListenMeta {
  const { kind, chapter, minutesLeft } = useListen(listen?.books ?? NO_BOOKS);
  return { kind, chapter, minutesLeft: kind === "resume" ? minutesLeft : null };
}
