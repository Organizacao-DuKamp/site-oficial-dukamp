import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { slugify, type Seller } from "@/lib/sellers";

export const Route = createFileRoute("/admin/equipe-vendas")({
  component: AdminSellersPage,
});

type FormState = Partial<Seller>;

function AdminSellersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Seller | null>(null);

  const list = useQuery({
    queryKey: ["admin", "sellers"],
    queryFn: async (): Promise<Seller[]> => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Seller[];
    },
  });

  const save = useMutation({
    mutationFn: async (values: FormState) => {
      const payload: any = {
        name: values.name?.trim(),
        role: values.role || null,
        region: values.region || null,
        phone: values.phone || null,
        whatsapp: values.whatsapp || null,
        photo_url: values.photo_url || null,
        cutout_url: (values as any).cutout_url || null,
        banner_url: values.banner_url || null,
        active: values.active ?? true,
        display_order: values.display_order ?? 0,
      };
      if (!payload.name) throw new Error("Nome é obrigatório");
      const baseSlug = slugify(values.slug?.trim() || payload.name);
      if (editing?.id) {
        payload.slug = baseSlug;
        const { error } = await supabase.from("sellers").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        // ensure unique slug
        let slug = baseSlug;
        let n = 1;
        while (true) {
          const { data } = await supabase.from("sellers").select("id").eq("slug", slug).maybeSingle();
          if (!data) break;
          n += 1;
          slug = `${baseSlug}-${n}`;
        }
        payload.slug = slug;
        const { error } = await supabase.from("sellers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "sellers"] });
      qc.invalidateQueries({ queryKey: ["sellers"] });
      setOpen(false);
      setEditing(null);
      toast.success("Salvo!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sellers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "sellers"] });
      qc.invalidateQueries({ queryKey: ["sellers"] });
      toast.success("Removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("sellers").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "sellers"] });
      qc.invalidateQueries({ queryKey: ["sellers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const swapOrder = useMutation({
    mutationFn: async ({ a, b }: { a: Seller; b: Seller }) => {
      const { error: e1 } = await supabase.from("sellers").update({ display_order: b.display_order }).eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("sellers").update({ display_order: a.display_order }).eq("id", b.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "sellers"] });
      qc.invalidateQueries({ queryKey: ["sellers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rows = list.data ?? [];

  function move(idx: number, dir: -1 | 1) {
    const a = rows[idx];
    const b = rows[idx + dir];
    if (!a || !b) return;
    // normalize if equal
    if (a.display_order === b.display_order) {
      swapOrder.mutate({
        a: { ...a, display_order: idx },
        b: { ...b, display_order: idx + dir },
      });
    } else {
      swapOrder.mutate({ a, b });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Equipe de Vendas</h1>
          <p className="text-sm text-muted-foreground">Gerencie os vendedores exibidos no site.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4 mr-1" /> Novo vendedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar" : "Novo"} vendedor</DialogTitle>
            </DialogHeader>
            <SellerForm
              initial={editing}
              submitting={save.isPending}
              onSubmit={(v) => save.mutate(v)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Ordem</TableHead>
              <TableHead className="w-16">Foto</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead className="w-20">Ativo</TableHead>
              <TableHead className="w-32 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isLoading ? (
              <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin inline" />
              </TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                Nenhum vendedor cadastrado.
              </TableCell></TableRow>
            ) : rows.map((s, idx) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <button
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      disabled={idx === 0}
                      onClick={() => move(idx, -1)}
                      aria-label="Subir"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      disabled={idx === rows.length - 1}
                      onClick={() => move(idx, 1)}
                      aria-label="Descer"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </TableCell>
                <TableCell>
                  {s.photo_url ? (
                    <img src={s.photo_url} alt={s.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted grid place-items-center text-xs font-bold">
                      {s.name.charAt(0)}
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.role ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.region ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.whatsapp ?? s.phone ?? "—"}</TableCell>
                <TableCell>
                  <Switch
                    checked={s.active}
                    onCheckedChange={(v) => toggleActive.mutate({ id: s.id, active: v })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { if (confirm(`Remover "${s.name}"?`)) del.mutate(s.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SellerForm({
  initial,
  onSubmit,
  submitting,
}: {
  initial: Seller | null;
  onSubmit: (v: FormState) => void;
  submitting: boolean;
}) {
  const [values, setValues] = useState<FormState>(() => ({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    role: initial?.role ?? "",
    region: initial?.region ?? "",
    phone: initial?.phone ?? "",
    whatsapp: initial?.whatsapp ?? "",
    photo_url: initial?.photo_url ?? "",
    cutout_url: initial?.cutout_url ?? "",
    banner_url: initial?.banner_url ?? "",
    active: initial?.active ?? true,
    display_order: initial?.display_order ?? 0,
  }));

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setValues((p) => ({ ...p, [k]: v }));
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(values); }}
      className="space-y-4"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label>Nome completo *</Label>
          <Input value={values.name ?? ""} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div>
          <Label>Cargo</Label>
          <Input value={values.role ?? ""} onChange={(e) => set("role", e.target.value)} placeholder="Ex: Gerente de Vendas" />
        </div>
        <div>
          <Label>Cidade / Região</Label>
          <Input value={values.region ?? ""} onChange={(e) => set("region", e.target.value)} placeholder="Ex: Monte Aprazível" />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input value={values.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="(16) 99411-8921" />
        </div>
        <div>
          <Label>WhatsApp</Label>
          <Input value={values.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} placeholder="16994118921" />
        </div>
        <div className="sm:col-span-2">
          <Label>Foto do vendedor</Label>
          <ImageUpload
            value={values.photo_url ?? ""}
            onChange={(v) => set("photo_url", v)}
            folder="sellers"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Aparece dentro da moldura vermelha/amarela no banner. Ideal: retrato horizontal (4:3) com bom enquadramento do rosto.
          </p>
        </div>
        <div className="sm:col-span-2">
          <Label>Foto alternativa sem fundo (opcional)</Label>
          <ImageUpload
            value={(values as any).cutout_url ?? ""}
            onChange={(v) => set("cutout_url" as any, v)}
            folder="sellers/cutouts"
          />
          <p className="text-xs text-muted-foreground mt-1">
            PNG transparente — usada como fallback caso a foto principal não esteja definida.
          </p>
        </div>
        <div className="sm:col-span-2">
          <Label>Imagem do banner esquerdo</Label>
          <ImageUpload
            value={values.banner_url ?? ""}
            onChange={(v) => set("banner_url", v)}
            folder="sellers/banners"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Arte pronta (PNG/JPG/WEBP) que ocupará TODA a área esquerda do banner do vendedor —
            já com a foto, o pasto e as faixas vermelha/amarela montadas por você.
            Proporção recomendada: ~4:3 (ex.: 1200×900). Se vazio, usa um fundo padrão.
          </p>
        </div>

        <div>
          <Label>Ordem de exibição</Label>
          <Input
            type="number"
            value={values.display_order ?? 0}
            onChange={(e) => set("display_order", Number(e.target.value))}
          />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch checked={!!values.active} onCheckedChange={(v) => set("active", v)} />
          <Label>Ativo (visível no site)</Label>
        </div>
        {initial && (
          <div className="sm:col-span-2">
            <Label>Slug (URL)</Label>
            <Input value={values.slug ?? ""} onChange={(e) => set("slug", e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">
              /equipe-de-vendas/<b>{values.slug || slugify(values.name ?? "")}</b>
            </p>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
