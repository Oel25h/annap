import type { ResolvedMedia } from "@/sections/types";

export type Shape = "4 / 5" | "3 / 2";
/** A plate's height, in lane widths. */
const SHAPE_H: Record<Shape, number> = { "4 / 5": 5 / 4, "3 / 2": 2 / 3 };
/** The grid gap, in lane widths (0.08 at 1440, 0.11 at 1024). */
const LANE_GAP = 0.1;

/** CSS columns: the shortest height that fits the plates, in order, into `lanes`; each lane's height. */
function laneHeights(heights: number[], lanes: number): number[] {
  const caps = new Set<number>();
  heights.forEach((_, i) => {
    let sum = 0;
    for (let j = i; j < heights.length; j++) caps.add((sum += heights[j]));
  });
  for (const cap of [...caps].sort((a, b) => a - b)) {
    const out = [0];
    for (const h of heights) {
      if (out[out.length - 1] > 0 && out[out.length - 1] + h > cap + 1e-9) out.push(0);
      out[out.length - 1] += h;
    }
    if (out.length <= lanes) return [...out, ...Array<number>(lanes - out.length).fill(0)];
  }
  return [];
}

/**
 * Masonry keeps to the system's ratios, 4:5 and 3:2. A short set picks each plate's shape
 * so its lanes end level, changing as little of each photo as it can: first the smallest
 * spread between lanes, then the least crop. Longer sets keep their natural shapes.
 */
export function masonryShapes(images: ResolvedMedia[], lanes: number): Shape[] {
  const aspect = images.map((m) => (m.width && m.height ? m.width / m.height : 4 / 5));
  const natural = aspect.map((a): Shape => (a > 1 ? "3 / 2" : "4 / 5"));
  // 2^7 layouts at most, well under a millisecond on the Worker.
  if (images.length > 7) return natural;
  let best = { spread: Infinity, loss: Infinity, shapes: natural };
  for (let mask = 0; mask < 1 << images.length; mask++) {
    const shapes = natural.map((s, i): Shape =>
      (mask >> i) & 1 ? (s === "4 / 5" ? "3 / 2" : "4 / 5") : s,
    );
    const heights = laneHeights(
      shapes.map((s) => SHAPE_H[s] + LANE_GAP),
      lanes,
    );
    const spread = Math.max(...heights) - Math.min(...heights);
    const loss = shapes.reduce((sum, s, i) => sum + Math.abs(Math.log(aspect[i] * SHAPE_H[s])), 0);
    if (spread < best.spread - 1e-6 || (Math.abs(spread - best.spread) < 1e-6 && loss < best.loss))
      best = { spread, loss, shapes };
  }
  return best.shapes;
}
