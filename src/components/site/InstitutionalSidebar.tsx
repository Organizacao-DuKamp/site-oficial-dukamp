import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isVideoUrl } from "@/components/admin/ImageUpload";
import { optimizedImage, optimizedSrcset } from "@/lib/image-url";


type Ad = {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  media: string[] | null;
};

function mediaList(ad: Ad): string[] {
  const arr = Array.isArray(ad.media) ? ad.media.filter(Boolean) : [];
  if (arr.length > 0) return arr;
  return ad.image_url ? [ad.image_url] : [];
}

function AdaptiveMedia({
  url,
  onEnded,
  active = true,
}: {
  url: string;
  onEnded?: () => void;
  active?: boolean;
}) {
  // aspect starts at 4/3 and adapts once we know the natural size
  const [ratio, setRatio] = useState<number>(4 / 3);
  const [loaded, setLoaded] = useState(false);
  const [muted, setMuted] = useState(true);
  const finishedRef = useRef(false);
  const video = isVideoUrl(url);

  useEffect(() => {
    setRatio(4 / 3);
    setLoaded(false);
    setMuted(true);
    finishedRef.current = false;
  }, [url]);

  const finishVideo = useCallback(
    (videoEl: HTMLVideoElement) => {
      if (!active || finishedRef.current) return;

      const duration = videoEl.duration;
      if (Number.isFinite(duration) && duration > 0 && videoEl.currentTime < duration - 0.35) {
        return;
      }

      finishedRef.current = true;
      onEnded?.();
    },
    [active, onEnded],
  );

  return (
    <div
      className={`relative w-full overflow-hidden ${!loaded ? "bg-muted animate-pulse" : "bg-muted"}`}
      style={{ aspectRatio: `${ratio}` }}
    >
      {video ? (
        <>
          <video
            key={url}
            src={url}
            className="w-full h-full object-contain"
            autoPlay={active}
            muted={active ? muted : true}
            playsInline
            preload={active ? "auto" : "metadata"}
            controls={active}
            onEnded={(e) => finishVideo(e.currentTarget)}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (Number.isFinite(v.duration) && v.duration > 0 && v.duration - v.currentTime <= 0.25) {
                finishVideo(v);
              }
            }}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight);
              setLoaded(true);

              if (!active) {
                v.pause();
                v.muted = true;
                return;
              }

              // try to unmute programmatically; browsers may block and keep muted
              v.muted = false;
              v.play().then(() => setMuted(false)).catch(() => {
                v.muted = true;
                setMuted(true);
              });
            }}
          />
          {active && muted && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const v = (e.currentTarget.parentElement?.querySelector("video") as HTMLVideoElement | null);
                if (v) {
                  v.muted = false;
                  v.play().catch(() => {});
                  setMuted(false);
                }
              }}
              className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded"
            >
              🔇 Ativar som
            </button>
          )}
        </>
      ) : (
        <img
          src={optimizedImage(url, { width: 400, quality: 65 })}
          srcSet={optimizedSrcset(url, [240, 400, 600, 800], 65)}
          sizes="(max-width: 1024px) 100vw, 320px"
          alt=""
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-contain transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={(e) => {
            const im = e.currentTarget;
            if (im.naturalWidth && im.naturalHeight) setRatio(im.naturalWidth / im.naturalHeight);
            setLoaded(true);
          }}
        />
      )}
    </div>
  );
}


function AdCard({ ad }: { ad: Ad }) {
  const items = useMemo(() => mediaList(ad), [ad]);
  const [idx, setIdx] = useState(0);
  const timer = useRef<number | null>(null);
  const itemsKey = items.join("|");

  // Preload all images so crossfades never flash white
  useEffect(() => {
    items.forEach((url) => {
      if (!isVideoUrl(url)) {
        const im = new Image();
        im.src = optimizedImage(url, { width: 400, quality: 70 });
      }
    });
  }, [items]);

  useEffect(() => {
    setIdx((i) => {
      if (items.length === 0) return 0;
      return Math.min(i, items.length - 1);
    });
  }, [items.length, itemsKey]);

  const advance = useCallback(
    (expectedUrl?: string) => {
      setIdx((i) => {
        if (items.length <= 1) return i;
        if (expectedUrl && items[i] !== expectedUrl) return i;
        return (i + 1) % items.length;
      });
    },
    [items],
  );

  useEffect(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }

    if (items.length <= 1) return;
    const currentItem = items[idx];
    // Only auto-advance on non-video items; videos advance via onEnded
    if (!currentItem || isVideoUrl(currentItem)) return;

    timer.current = window.setTimeout(() => advance(currentItem), 6000);
    return () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [advance, idx, items]);

  const current = items[idx];
  const [prev, setPrev] = useState<string | null>(null);
  const [fading, setFading] = useState(false);
  const lastUrl = useRef<string | null>(current ?? null);

  useEffect(() => {
    if (lastUrl.current && lastUrl.current !== current) {
      setPrev(lastUrl.current);
      setFading(false);
      // next frame: trigger opacity transition
      requestAnimationFrame(() => requestAnimationFrame(() => setFading(true)));
      const t = window.setTimeout(() => setPrev(null), 800);
      lastUrl.current = current;
      return () => window.clearTimeout(t);
    }
    lastUrl.current = current;
  }, [current]);

  const inner = (
    <div className="rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow">
      {current && (
        <div className="relative">
          <AdaptiveMedia url={current} onEnded={() => advance(current)} active />
          {prev && prev !== current && (
            <div
              className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ease-in-out ${
                fading ? "opacity-0" : "opacity-100"
              }`}
            >
              <AdaptiveMedia url={prev} active={false} />
            </div>
          )}
          {items.length > 1 && (
            <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
              {items.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx ? "w-4 bg-white" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}


    </div>
  );

  return ad.link_url ? (
    <a href={ad.link_url} className="block">{inner}</a>
  ) : (
    <div>{inner}</div>
  );
}

export function InstitutionalSidebar() {
  const { data } = useQuery({
    queryKey: ["institutional_ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutional_ads")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data as unknown as Ad[];
    },
  });

  const first = (data ?? [])[0];
  return (
    <aside
      className="lg:sticky"
      style={{
        top: "calc(var(--site-header-offset, 8rem) + 1rem)",
        height: "calc(100vh - var(--site-header-offset, 8rem) - 2rem)",
      }}
    >
      <div className="lg:h-full lg:overflow-y-auto lg:pr-1">
        {first && <AdCard ad={first} />}
      </div>
    </aside>
  );
}
