import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Play } from "lucide-react";
import { toast } from "sonner";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v|ogv)$/.test(clean);
}

async function uploadOne(file: File, folder?: string): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const base = `${crypto.randomUUID()}.${ext}`;
  const path = folder ? `${folder.replace(/^\/+|\/+$/g, "")}/${base}` : base;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data, error: sErr } = await supabase.storage
    .from("media")
    .createSignedUrl(path, TEN_YEARS);
  if (sErr || !data) throw sErr ?? new Error("Falha ao gerar URL");
  return data.signedUrl;
}


export function ImageUpload({
  value,
  onChange,
  folder,
}: {
  value: string;
  onChange: (v: string) => void;
  folder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle(files: FileList | File[] | null) {
    if (!files || (files as any).length === 0) return;
    const first = (files as any)[0] as File;
    if (!first) return;
    setBusy(true);
    try {
      const url = await uploadOne(first, folder);
      onChange(url);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar imagem");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imgs: File[] = [];
      for (const it of Array.from(items)) {
        if (it.kind === "file" && it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) imgs.push(f);
        }
      }
      if (imgs.length === 0) return;
      e.preventDefault();
      handle(imgs);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="" className="h-24 w-24 object-cover rounded border" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}
      <div>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handle(e.target.files)}
        />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
          {value ? "Trocar imagem" : "Enviar imagem"}
        </Button>
      </div>
    </div>
  );
}

export function ImageListUpload({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle(files: FileList | File[] | null) {
    if (!files || (files as any).length === 0) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files as any) as File[]) urls.push(await uploadOne(f));
      onChange([...(value ?? []), ...urls]);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar imagem");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imgs: File[] = [];
      for (const it of Array.from(items)) {
        if (it.kind === "file" && it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) imgs.push(f);
        }
      }
      if (imgs.length === 0) return;
      e.preventDefault();
      handle(imgs);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [value]);

  function removeAt(i: number) {
    const next = [...(value ?? [])];
    next.splice(i, 1);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {value?.length ? (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} alt="" className="h-20 w-20 object-cover rounded border" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handle(e.target.files)}
        />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
          Adicionar imagens
        </Button>
      </div>
    </div>
  );
}

export function MediaListUpload({
  value,
  onChange,
  folder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  folder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle(files: FileList | File[] | null) {
    if (!files || (files as any).length === 0) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files as any) as File[]) urls.push(await uploadOne(f, folder));
      onChange([...(value ?? []), ...urls]);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar arquivo");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const it of Array.from(items)) {
        if (it.kind === "file" && (it.type.startsWith("image/") || it.type.startsWith("video/"))) {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length === 0) return;
      e.preventDefault();
      handle(files);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [value]);

  function removeAt(i: number) {
    const next = [...(value ?? [])];
    next.splice(i, 1);
    onChange(next);
  }

  function move(i: number, dir: -1 | 1) {
    const next = [...(value ?? [])];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {value?.length ? (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => {
            const video = isVideoUrl(url);
            return (
              <div key={i} className="relative group">
                {video ? (
                  <div className="h-24 w-24 rounded border bg-black/80 grid place-items-center overflow-hidden">
                    <video src={url} className="h-full w-full object-cover" muted preload="metadata" />
                    <Play className="absolute h-6 w-6 text-white/90 drop-shadow" />
                  </div>
                ) : (
                  <img src={url} alt="" className="h-24 w-24 object-cover rounded border" />
                )}
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                  aria-label="Remover"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-1 left-1 right-1 flex justify-between opacity-0 group-hover:opacity-100 transition">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    className="text-[10px] bg-black/60 text-white rounded px-1"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    className="text-[10px] bg-black/60 text-white rounded px-1"
                  >
                    ▶
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      <div>
        <input
          ref={ref}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          multiple
          className="hidden"
          onChange={(e) => handle(e.target.files)}
        />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
          Adicionar imagens/vídeos
        </Button>
        <p className="text-xs text-muted-foreground mt-1">
          Se enviar mais de um arquivo, eles alternam a cada 6 segundos.
        </p>
      </div>
    </div>
  );
}

