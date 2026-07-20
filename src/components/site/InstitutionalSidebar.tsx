import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
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

function AdaptiveMedia({ url }: { url: string }) {
  // aspect starts at 4/3 and adapts once we know the natural size
  const [ratio, setRatio] = useState<number>(4 / 3);
  const [loaded, setLoaded] = useState(false);
  const video = isVideoUrl(url);



  return (
    <div
      className={`w-full overflow-hidden ${!loaded ? "bg-muted animate-pulse" : "bg-muted"}`}
      style={{ aspectRatio: `${ratio}` }}
    >
      {video ? (
        <video
          src={url}
          className="w-full h-full object-contain"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight);
            setLoaded(true);
          }}
        />
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
    if (items.length <= 1) return;
    timer.current = window.setInterval(() => {
      setIdx((i) => (i + 1) % items.length);
    }, 6000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [items.length]);

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
          <AdaptiveMedia url={current} />
          {prev && prev !== current && (
            <div
              className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ease-in-out ${
                fading ? "opacity-0" : "opacity-100"
              }`}
            >
              <AdaptiveMedia url={prev} />
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
