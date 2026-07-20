import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { DEFAULT_NAV_ITEMS, type NavItem } from "@/lib/navbar-settings";
import { ArrowUp, ArrowDown, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/admin/navbar")({
  component: NavbarAdmin,
});

function NavbarAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings", "navbar", "admin"],
    queryFn: async () =>
      (await supabase.from("site_settings").select("value").eq("key", "navbar").maybeSingle()).data,
  });

  const [items, setItems] = useState<NavItem[]>(DEFAULT_NAV_ITEMS);

  useEffect(() => {
    const raw = (data?.value as any)?.items;
    if (Array.isArray(raw)) {
      const byKey = new Map(raw.map((r: any) => [r.key, r]));
      setItems(
        DEFAULT_NAV_ITEMS.map((d) => {
          const o = byKey.get(d.key) ?? {};
          return {
            key: d.key,
            label: typeof o.label === "string" && o.label ? o.label : d.label,
            to: typeof o.to === "string" && o.to ? o.to : d.to,
            visible: typeof o.visible === "boolean" ? o.visible : d.visible,
          };
        }),
      );
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "navbar", value: { items } }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "navbar"] });
      qc.invalidateQueries({ queryKey: ["settings", "navbar", "admin"] });
      toast.success("Menu salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = (idx: number, patch: Partial<NavItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Menu do Site (Navbar)</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Edite os rótulos, ative/desative itens e altere a ordem. O item "Produtos" mostra automaticamente as
        categorias cadastradas ao passar o mouse.
      </p>

      <div className="rounded-lg border bg-card divide-y">
        {items.map((it, idx) => (
          <div key={it.key} className="p-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Rótulo</Label>
              <Input value={it.label} onChange={(e) => update(idx, { label: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Link</Label>
              <Input value={it.to} onChange={(e) => update(idx, { to: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={it.visible} onCheckedChange={(v) => update(idx, { visible: v })} />
              <span className="text-xs text-muted-foreground">Visível</span>
            </div>
            <div className="flex gap-1">
              <Button type="button" variant="outline" size="icon" onClick={() => move(idx, -1)} disabled={idx === 0}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={() => move(idx, 1)} disabled={idx === items.length - 1}>
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="outline" onClick={() => setItems(DEFAULT_NAV_ITEMS)}>
          <RotateCcw className="h-4 w-4 mr-2" /> Restaurar padrão
        </Button>
      </div>
    </div>
  );
}
