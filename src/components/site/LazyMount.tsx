import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Only renders `children` once it scrolls near the viewport.
 * Reserves vertical space via `minHeight` to prevent layout jumps and
 * avoid the browser paying for offscreen images/DOM on first paint.
 */
export function LazyMount({
  children,
  minHeight = 400,
  rootMargin = "600px",
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return (
    <div
      ref={ref}
      style={
        visible
          ? undefined
          : { minHeight, contentVisibility: "auto", containIntrinsicSize: `${minHeight}px` }
      }
    >
      {visible ? children : null}
    </div>
  );
}
