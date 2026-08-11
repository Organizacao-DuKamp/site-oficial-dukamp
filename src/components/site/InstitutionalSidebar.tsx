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

type VideoVisitState = {
  currentTime: number;
  userPaused: boolean;
  mutePreference: boolean | null;
};

// Mantido apenas em memória durante a visita atual. Assim, navegar pelo SPA não
// reinicia a mídia, mas um refresh/nova visita começa normalmente do zero.
const videoVisitState = new Map<string, VideoVisitState>();
const adVisitIndex = new Map<string, number>();

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
  const video = isVideoUrl(url);
  const remembered = videoVisitState.get(url);
  const [ratio, setRatio] = useState<number>(video ? 9 / 16 : 4 / 3);
  const [loaded, setLoaded] = useState(false);
  const [muted, setMuted] = useState(remembered?.mutePreference ?? false);
  const [paused, setPaused] = useState(remembered?.userPaused ?? false);
  const userPausedRef = useRef(remembered?.userPaused ?? false);
  const mutePreferenceRef = useRef<boolean | null>(remembered?.mutePreference ?? null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finishedRef = useRef(false);

  const persistState = useCallback(() => {
    if (!video) return;
    const element = videoRef.current;
    const previous = videoVisitState.get(url);
    videoVisitState.set(url, {
      currentTime: element?.currentTime ?? previous?.currentTime ?? 0,
      userPaused: userPausedRef.current,
      mutePreference: mutePreferenceRef.current,
    });
  }, [url, video]);

  useEffect(() => {
    const saved = videoVisitState.get(url);
    setRatio(video ? 9 / 16 : 4 / 3);
    setLoaded(false);
    setMuted(saved?.mutePreference ?? false);
    setPaused(saved?.userPaused ?? false);
    userPausedRef.current = saved?.userPaused ?? false;
    mutePreferenceRef.current = saved?.mutePreference ?? null;
    finishedRef.current = false;

    return () => persistState();
  }, [url, video, persistState]);

  const startPlayback = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !active || userPausedRef.current) return;

    if (mutePreferenceRef.current === true) {
      v.muted = true;
      setMuted(true);
      try {
        await v.play();
        setPaused(false);
      } catch {
        setPaused(true);
      }
      return;
    }

    v.muted = false;
    v.volume = 1;
    try {
      await v.play();
      setMuted(false);
      setPaused(false);
      return;
    } catch {
      // Navegadores normalmente bloqueiam autoplay com som.
    }

    v.muted = true;
    setMuted(true);
    try {
      await v.play();
      setPaused(false);
    } catch {
      setPaused(true);
    }
  }, [active]);

  // Se o navegador silenciou automaticamente, tenta devolver o som na primeira
  // interação. Nunca desfaz um mute escolhido explicitamente pelo usuário.
  useEffect(() => {
    if (!video || !active || !muted || mutePreferenceRef.current === true) return;
    const unmute = () => {
      const v = videoRef.current;
      if (!v || mutePreferenceRef.current === true) return;
      v.muted = false;
      v.volume = 1;
      setMuted(false);
      if (!userPausedRef.current) void v.play().catch(() => undefined);
    };
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, unmute, { once: true, passive: true } as AddEventListenerOptions));
    return () => events.forEach((ev) => window.removeEventListener(ev, unmute));
  }, [video, active, muted]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    if (!next) v.volume = 1;
    mutePreferenceRef.current = next;
    setMuted(next);
    persistState();
  }, [persistState]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      userPausedRef.current = false;
      void v.play().catch(() => undefined);
      setPaused(false);
    } else {
      userPausedRef.current = true;
      v.pause();
      setPaused(true);
    }
    persistState();
  }, [persistState]);

  const finishVideo = useCallback(
    (videoEl: HTMLVideoElement) => {
      if (!active || finishedRef.current) return;
      const duration = videoEl.duration;
      if (Number.isFinite(duration) && duration > 0 && videoEl.currentTime < duration - 0.35) return;

      finishedRef.current = true;
      // Quando o vídeo termina de verdade, a próxima volta no carrossel deve
      // começar do início, sem perder as preferências de pausa/som do usuário.
      const previous = videoVisitState.get(url);
      videoVisitState.set(url, {
        currentTime: 0,
        userPaused: false,
        mutePreference: previous?.mutePreference ?? mutePreferenceRef.current,
      });
      userPausedRef.current = false;
      onEnded?.();
    },
    [active, onEnded, url],
  );

  return (
    <div
      className={`relative flex w-full items-center justify-center overflow-hidden ${!loaded ? "bg-muted animate-pulse" : "bg-muted"}`}
      style={{ aspectRatio: `${ratio}`, maxHeight: "calc(100vh - var(--site-header-offset, 8rem) - 2rem)" }}
    >
      {video ? (
        <>
          <video
            key={url}
            ref={videoRef}
            src={url}
            className="w-full h-full object-contain"
            autoPlay={active && !userPausedRef.current}
            playsInline
            preload={active ? "auto" : "metadata"}
            controls={false}
            onEnded={(e) => finishVideo(e.currentTarget)}
            onPause={() => setPaused(true)}
            onPlaying={() => setPaused(false)}
            onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight);
              setLoaded(true);

              if (!active) {
                v.pause();
                v.muted = true;
                return;
              }

              const saved = videoVisitState.get(url);
              if (saved && saved.currentTime > 0 && (!Number.isFinite(v.duration) || saved.currentTime < v.duration - 0.35)) {
                try { v.currentTime = saved.currentTime; } catch {}
              }

              if (saved?.mutePreference != null) {
                v.muted = saved.mutePreference;
                setMuted(saved.mutePreference);
              }

              if (saved?.userPaused) {
                userPausedRef.current = true;
                v.pause();
                setPaused(true);
                return;
              }

              void startPlayback();
            }}
          />

          {active && (
            <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
              <button
                type="button"
                aria-label={paused ? "Reproduzir vídeo" : "Pausar vídeo"}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePlay(); }}
                className="h-7 w-7 rounded-full bg-black/55 text-white text-xs flex items-center justify-center hover:bg-black/75 transition-colors"
              >
                {paused ? "▶" : "❚❚"}
              </button>
              <button
                type="button"
                aria-label={muted ? "Ativar som" : "Desativar som"}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleMute(); }}
                className="h-7 w-7 rounded-full bg-black/55 text-white text-xs flex items-center justify-center hover:bg-black/75 transition-colors"
              >
                {muted ? "🔇" : "🔊"}
              </button>
            </div>
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
  const [idx, setIdx] = useState(() => {
    const rememberedIndex = adVisitIndex.get(ad.id) ?? 0;
    return rememberedIndex >= 0 && rememberedIndex < items.length ? rememberedIndex : 0;
  });
  const timer = useRef<number | null>(null);
  const itemsKey = items.join("|");

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
      const next = Math.min(i, items.length - 1);
      adVisitIndex.set(ad.id, next);
      return next;
    });
  }, [ad.id, items.length, itemsKey]);

  useEffect(() => {
    adVisitIndex.set(ad.id, idx);
  }, [ad.id, idx]);

  const advance = useCallback((expectedUrl?: string) => {
    setIdx((i) => {
      if (items.length <= 1) return i;
      if (expectedUrl && items[i] !== expectedUrl) return i;
      const next = (i + 1) % items.length;
      adVisitIndex.set(ad.id, next);
      return next;
    });
  }, [ad.id, items]);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (items.length <= 1) return;
    const currentItem = items[idx];
    if (!currentItem || isVideoUrl(currentItem)) return;

    timer.current = window.setTimeout(() => advance(currentItem), 6000);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
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
            <div className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ease-in-out ${fading ? "opacity-0" : "opacity-100"}`}>
              <AdaptiveMedia url={prev} active={false} />
            </div>
          )}
          {items.length > 1 && (
            <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
              {items.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/60"}`} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return ad.link_url ? <a href={ad.link_url} className="block">{inner}</a> : <div>{inner}</div>;
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
      <div className="lg:h-full lg:overflow-hidden lg:pr-1">
        {first && <AdCard ad={first} />}
      </div>
    </aside>
  );
}
