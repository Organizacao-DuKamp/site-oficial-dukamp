import { useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { optimizedImage, optimizedSrcset } from "@/lib/image-url";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "loading"> & {
  src: string | null | undefined;
  alt: string;
  /** Rendered display width in px (also used to request the CDN size). */
  width: number;
  /** Rendered display height in px (prevents CLS). */
  height: number;
  /** Responsive `sizes` attribute. */
  sizes?: string;
  /** Widths to generate in srcset. Defaults to sensible tiers around `width`. */
  srcsetWidths?: number[];
  /** Image quality passed to the CDN (default 65). */
  quality?: number;
  /** If true, loads eagerly with fetchpriority=high (LCP images only). */
  priority?: boolean;
  /** object-fit style. Default: "cover". */
  fit?: "cover" | "contain";
  /** Class applied to the wrapper (skeleton container). */
  wrapperClassName?: string;
};

/**
 * Central image component:
 * - Skeleton background while loading + fade-in on load
 * - Responsive `srcset`/`sizes` via Supabase render CDN
 * - Explicit width/height to avoid CLS
 * - Lazy by default; `priority` for LCP images (eager + high fetchpriority)
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  sizes,
  srcsetWidths,
  quality = 65,
  priority = false,
  fit = "cover",
  className,
  wrapperClassName,
  ...rest
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const widths =
    srcsetWidths ??
    Array.from(new Set([Math.round(width / 2), width, Math.round(width * 1.5), width * 2]))
      .filter((w) => w >= 64)
      .sort((a, b) => a - b);

  const finalSrc = optimizedImage(src, { width, quality });
  const srcSet = optimizedSrcset(src, widths, quality);

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        !loaded && "bg-muted animate-pulse",
        wrapperClassName,
      )}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <img
        src={finalSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "w-full h-full transition-opacity duration-500",
          fit === "cover" ? "object-cover" : "object-contain",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        {...rest}
      />
    </div>
  );
}
