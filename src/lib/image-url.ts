// Optimized image URL helper.
// For Supabase Storage URLs, rewrites `/storage/v1/object/` to
// `/storage/v1/render/image/` and appends transform params so the CDN
// returns a resized image (webp by default) instead of the original
// (often multi-MB) file.
export function optimizedImage(
  url: string | null | undefined,
  opts: { width?: number; quality?: number; format?: "webp" | "origin" } = {},
): string {
  if (!url) return "/placeholder.svg";
  const { width = 600, quality = 70, format = "webp" } = opts;
  try {
    if (url.includes("/storage/v1/object/")) {
      const u = new URL(url);
      u.pathname = u.pathname.replace("/storage/v1/object/", "/storage/v1/render/image/");
      u.searchParams.set("width", String(width));
      u.searchParams.set("quality", String(quality));
      u.searchParams.set("resize", "contain");
      if (format !== "origin") u.searchParams.set("format", format);
      return u.toString();
    }
  } catch {
    // fall through
  }
  return url;
}

// Build a responsive `srcset` string for the given widths.
export function optimizedSrcset(
  url: string | null | undefined,
  widths: number[],
  quality = 70,
): string | undefined {
  if (!url) return undefined;
  if (!url.includes("/storage/v1/object/")) return undefined;
  return widths
    .map((w) => `${optimizedImage(url, { width: w, quality })} ${w}w`)
    .join(", ");
}

