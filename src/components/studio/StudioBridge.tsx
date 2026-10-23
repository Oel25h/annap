/**
 * Runs inside the studio's preview frame. It tells the studio where each
 * section sits (`ap:layout`), once the fonts are in and whenever the page
 * changes size, and reloads the draft when the studio has saved
 * (`ap:refresh`). Messages go only to and from the studio's own origin.
 */
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export type LayoutMessage = {
  type: "ap:layout";
  height: number;
  sections: { id: string; top: number; height: number }[];
};

export function StudioBridge() {
  const router = useRouter();
  useEffect(() => {
    if (window.self === window.top) return;
    let frame = 0;
    const post = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sections = [...document.querySelectorAll<HTMLElement>("[data-section-id]")].map(
          (el) => {
            const rect = el.getBoundingClientRect();
            return {
              id: el.dataset.sectionId ?? "",
              top: Math.round(rect.top + window.scrollY),
              height: Math.round(rect.height),
            };
          },
        );
        const message: LayoutMessage = {
          type: "ap:layout",
          height: document.documentElement.scrollHeight,
          sections,
        };
        window.parent.postMessage(message, window.location.origin);
      });
    };
    void document.fonts.ready.then(post);
    const observer = new ResizeObserver(post);
    observer.observe(document.documentElement);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if ((event.data as { type?: string } | null)?.type === "ap:refresh")
        void router.invalidate().then(post);
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("load", post);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("message", onMessage);
      window.removeEventListener("load", post);
    };
  }, [router]);
  return null;
}
