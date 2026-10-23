/**
 * The live preview (DESIGN.md §10, Canvas): the draft page itself in an
 * inert frame at the emulated width, scaled to fit, with the selected
 * section outlined and its tools above its top-right corner. Geometry comes
 * from the page (`ap:layout`, see StudioBridge), never from guesses.
 * Below 1180: the section picker, the phone preview, the action row.
 */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Icon } from "@/components/site/Icon";
import type { LayoutMessage } from "./StudioBridge";
import { sectionName, variantName, type DraftSection } from "./model";
import { GreekBadge, type Lang } from "./parts";
import type { StudioEditing } from "./useStudioEditing";

export type Device = "desktop" | "tablet" | "phone";
const WIDTH: Record<Device, number> = { desktop: 1440, tablet: 768, phone: 390 };

type Props = {
  editing: StudioEditing;
  pageTitle: string;
  lang: Lang;
  src: string;
  frameRef: RefObject<HTMLIFrameElement | null>;
  desktop: boolean;
  onOpenSheet: () => void;
  pickerRef: RefObject<HTMLButtonElement | null>;
  onAdd: () => void;
  onDelete: (section: DraftSection) => void;
};

export function Canvas({
  editing,
  pageTitle,
  lang,
  src,
  frameRef,
  desktop,
  onOpenSheet,
  pickerRef,
  onAdd,
  onDelete,
}: Props) {
  const [device, setDevice] = useState<Device>("desktop");
  const emulated = desktop ? device : "phone";
  const vw = WIDTH[emulated];
  const deviceRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 390, height: 520 });
  const [layout, setLayout] = useState<LayoutMessage | null>(null);
  const [off, setOff] = useState(0);

  const { selected, selectedIndex, sections } = editing;
  const scale = box.width / vw;
  const geometry = selected ? layout?.sections.find((s) => s.id === selected.id) : undefined;
  const frameH = layout?.height ?? 900;
  const maxOff = Math.max(0, frameH - box.height / scale);

  // The frame's own size, for the scale and the scroll limit.
  useLayoutEffect(() => {
    const el = deviceRef.current;
    if (!el) return;
    const measure = () => setBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Where each section sits, from the page in the frame.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as LayoutMessage | null;
      if (data?.type === "ap:layout") setLayout(data);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frameRef]);

  // A new page or width lays out again from the top.
  useEffect(() => setLayout(null), [src, vw]);

  // Bring the selected section into view, one tool-bar height below the top.
  const top = geometry?.top;
  useEffect(() => {
    if (top === undefined) return;
    const lead = vw > 720 ? 112 : 16;
    setOff(Math.min(maxOff, Math.max(0, top - lead)));
  }, [top, selected?.id, vw, maxOff]);

  // A wheel over the frame scrolls the page inside it (the frame itself is inert).
  useEffect(() => {
    const el = deviceRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setOff((o) => Math.min(maxOff, Math.max(0, o + e.deltaY / scale)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [maxOff, scale]);

  const name = selected ? sectionName(selected) : "";
  const locked = selectedIndex >= 0 && editing.isLocked(selectedIndex);
  const greek = selected ? editing.statusOf(selected) : null;
  const prev = selectedIndex > 0 ? sections[selectedIndex - 1] : null;
  const next = selectedIndex >= 0 ? sections[selectedIndex + 1] : null;
  const canUp = !locked && selectedIndex > 0 && !editing.isLocked(selectedIndex - 1);
  const canDown = !locked && !!next && !editing.isLocked(selectedIndex + 1);
  const hidden = !!selected?.settings.hidden;

  const style = {
    "--vw": vw,
    "--s": scale.toFixed(4),
    "--frame-h": frameH,
    "--off": Math.round(off),
    "--sec-top": geometry?.top ?? 0,
    "--sec-h": geometry?.height ?? 0,
  } as React.CSSProperties;

  const langLabel =
    lang === "el" ? (
      <>
        <span lang="el">Ελληνικά</span> · draft
      </>
    ) : (
      "English · draft"
    );

  return (
    <section className="canvas" id="canvas" aria-label="Live preview">
      <div className="canvas-bar">
        <p className="canvas-title">
          <strong>Live preview</strong>
          <span className="meta">{langLabel}</span>
        </p>
        <fieldset className="seg-field seg--icons">
          <legend className="sr-only">Preview width</legend>
          <div className="seg">
            {(["desktop", "tablet", "phone"] as const).map((d) => (
              <label key={d}>
                <input
                  type="radio"
                  name="preview-device"
                  value={d}
                  checked={device === d}
                  onChange={() => setDevice(d)}
                />
                <span>
                  <Icon name={d} />
                  <span className="sr-only">
                    {d === "desktop" ? "Desktop 1440" : d === "tablet" ? "Tablet 768" : "Phone 390"}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <p className="meta zoom">Fit · {Math.round(scale * 100)}%</p>
        <a className="link open-preview" href={src} target="_blank" rel="noopener">
          Open
          <Icon name="arrow-ext" />
          <span className="sr-only"> preview in a new tab</span>
        </a>
      </div>

      {selected && (
        <div className="picker">
          <button
            className="icon-btn"
            type="button"
            disabled={!prev}
            aria-label={prev ? `Previous section: ${sectionName(prev)}` : "No previous section"}
            onClick={() => prev && editing.select(prev.id)}
          >
            <Icon name="chev-left" />
          </button>
          <button
            className="picker-btn"
            type="button"
            ref={pickerRef}
            aria-haspopup="dialog"
            aria-controls="outline"
            onClick={onOpenSheet}
          >
            <span className="meta">
              Section {selectedIndex + 1} of {sections.length}
            </span>
            <span className="row-name">
              {name}
              {greek && greek !== "approved" && <GreekBadge status={greek} />}
            </span>
            <Icon name="chev-down" />
          </button>
          <button
            className="icon-btn"
            type="button"
            disabled={!next}
            aria-label={next ? `Next section: ${sectionName(next)}` : "No next section"}
            onClick={() => next && editing.select(next.id)}
          >
            <Icon name="chev-right" />
          </button>
        </div>
      )}

      <div className="stage">
        <div className={`device device--${emulated}`} ref={deviceRef} style={style}>
          <iframe
            ref={frameRef}
            src={src}
            title={`Preview of ${pageTitle}, ${lang === "el" ? "Greek" : "English"} draft`}
            tabIndex={-1}
            inert
          />
          {selected && geometry && (
            <div className="sel">
              <div className="sel-bar">
                <span className="sel-tag" aria-hidden="true">
                  {name}
                  {selected.variant ? ` · ${variantName(selected.variant)}` : ""}
                </span>
                {!locked && (
                  <div className="sel-tools">
                    <button
                      className="icon-btn"
                      type="button"
                      aria-label={`Move ${name} up`}
                      disabled={!canUp}
                      onClick={() => editing.move(selected.id, -1)}
                    >
                      <Icon name="arrow-up" />
                    </button>
                    <button
                      className="icon-btn"
                      type="button"
                      aria-label={`Move ${name} down`}
                      disabled={!canDown}
                      onClick={() => editing.move(selected.id, 1)}
                    >
                      <Icon name="arrow-down" />
                    </button>
                    <button
                      className="icon-btn"
                      type="button"
                      aria-label={`Duplicate ${name}`}
                      onClick={() => editing.duplicate(selected.id)}
                    >
                      <Icon name="copy" />
                    </button>
                    <button
                      className="icon-btn"
                      type="button"
                      aria-label={`Hide ${name}`}
                      aria-pressed={hidden}
                      onClick={() => editing.toggleHidden(selected.id)}
                    >
                      <Icon name="eye-off" />
                    </button>
                    <span className="vr" aria-hidden="true" />
                    <button
                      className="icon-btn icon-btn--danger"
                      type="button"
                      aria-label={`Delete ${name}`}
                      onClick={() => onDelete(selected)}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                )}
              </div>
              <button className="btn btn-quiet btn-sm sel-add" type="button" onClick={onAdd}>
                <Icon name="plus" />
                <span>Add section below</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <>
          <div className="sel-actions">
            <button
              className="act"
              type="button"
              aria-label={`Move ${name} up`}
              disabled={!canUp}
              onClick={() => editing.move(selected.id, -1)}
            >
              <Icon name="arrow-up" />
              <span aria-hidden="true">Up</span>
            </button>
            <button
              className="act"
              type="button"
              aria-label={`Move ${name} down`}
              disabled={!canDown}
              onClick={() => editing.move(selected.id, 1)}
            >
              <Icon name="arrow-down" />
              <span aria-hidden="true">Down</span>
            </button>
            <button
              className="act"
              type="button"
              aria-label={`Duplicate ${name}`}
              disabled={locked}
              onClick={() => editing.duplicate(selected.id)}
            >
              <Icon name="copy" />
              <span aria-hidden="true">Duplicate</span>
            </button>
            <button
              className="act"
              type="button"
              aria-label={`Hide ${name}`}
              aria-pressed={hidden}
              disabled={locked}
              onClick={() => editing.toggleHidden(selected.id)}
            >
              <Icon name="eye-off" />
              <span aria-hidden="true">Hide</span>
            </button>
            <button
              className="act act--danger"
              type="button"
              aria-label={`Delete ${name}`}
              disabled={locked}
              onClick={() => onDelete(selected)}
            >
              <Icon name="trash" />
              <span aria-hidden="true">Delete</span>
            </button>
          </div>
          <div className="add-below">
            <button className="btn btn-quiet btn-block" type="button" onClick={onAdd}>
              <Icon name="plus" />
              <span>Add section below</span>
            </button>
          </div>
        </>
      )}
    </section>
  );
}
