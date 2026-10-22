import type { CSSProperties } from "react";
import type { ResolvedMedia } from "@/sections/types";

/**
 * A media library image: responsive variants, explicit size, cropped at its
 * focal point. Only the page's first image (the hero) loads eagerly with
 * high priority.
 */
export function Picture({
  media,
  sizes,
  priority = false,
  className,
  decorative = false,
}: {
  media: ResolvedMedia | undefined;
  /** The `sizes` attribute: how wide the image shows at each breakpoint. */
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Hide from assistive tech when the text next to it already says everything. */
  decorative?: boolean;
}) {
  if (!media || media.kind !== "image") return null;
  const style = {
    "--focal": `${(media.focalX * 100).toFixed(1)}% ${(media.focalY * 100).toFixed(1)}%`,
  } as CSSProperties;
  return (
    <img
      className={className}
      src={media.src}
      srcSet={media.srcSet ?? undefined}
      sizes={media.srcSet ? sizes : undefined}
      width={media.width ?? undefined}
      height={media.height ?? undefined}
      alt={decorative ? "" : media.alt}
      lang={!decorative && media.alt ? media.textLang : undefined}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding={priority ? "sync" : "async"}
      style={style}
    />
  );
}
