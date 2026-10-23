/** Small hooks the managers share: a ticking clock and the status region. */
import { useEffect, useState, type ReactNode } from "react";

export function useNow(interval = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
}

/** One polite sr-only region per screen; each change is said once. */
export function useAnnounce(): [ReactNode, (message: string) => void] {
  const [message, setMessage] = useState("");
  const region = (
    <p className="sr-only" role="status" aria-live="polite">
      {message}
    </p>
  );
  return [
    region,
    (next: string) => {
      setMessage("");
      requestAnimationFrame(() => setMessage(next));
    },
  ];
}
