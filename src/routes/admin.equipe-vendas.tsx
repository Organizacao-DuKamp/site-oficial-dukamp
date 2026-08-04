import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { slugify, type Seller } from "@/lib/sellers";

export const Route = createFileRoute("/admin/equipe-vendas")({
  component: AdminSellersPage,
});

type FormState = Partial<Seller>;

function AdminSellersPage() {
  const queryClient = useQueryClient();
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

      // Registros conta-* são vínculos internos do painel e não cartões públicos.
      return ((data ?? []) as Seller[]).filter((seller) => !seller.slug.startsWith("conta-"));
    },
  });

  const save = useMutation({
    mutationFn: async (values: FormState) => {
      const name = values.name?.trim();
      if (!name) throw new Error("Nome é obrigatório");
      const payload = {
        name,
        role: values.role || null,
        region: values.region || null,
        phone: values.phone || null,
        whatsapp: values.whatsapp || null,
        photo_url: values.photo_url || null,
        cutout_url: values.cutout_url || null,
        banner_url: values.banner_url || null,
        active: values.active ?? true,
        display_order: values.display_order ?? 0,
      };


      const baseSlug = slugify(values.slug?.trim() || payload.name);
      if (!baseSlug || baseSlug.startsWith("conta-")) {
        throw new Error("Escolha um nome ou slug válido para o cartão público.");
      }

      if (editing?.id) {
        const { error } = await supabase
          .from("sellers")
          .update({ ...payload, slug: baseSlug })
          .eq("id", editing.id);
        if (error) throw error;
        return;
      }

      let slug = baseSlug;
      let suffix = 1;
      while (true) {
        const { data, error } = await supabase
          .from("sellers")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (error) throw error;
        if (!data) break;
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
      }

      const { error } = await supabase.from("sellers").insert({ ...payload, slug });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sellers"] });
      queryClient.invalidateQueries({ queryKey: ["sellers"] });
      setOpen(false);
      setEditing(null);
      toast.success("Vendedor salvo.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const seller = (list.data ?? []).find((item) => item.id === id);
      if (!seller || seller.slug.startsWith("conta-")) {
        throw new Error("Este registro não pode ser removido por esta tela.");
      }
      const { error } = await supabase.from("sellers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sellers"] });
      queryClient.invalidateQueries({ queryKey: ["sellers"] });
      toast.success("Vendedor removido.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("sellers").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sellers"] });
      queryClient.invalidateQueries({ queryKey: ["sellers"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const swapOrder = useMutation({
    mutationFn: async ({ first, second }: { first: Seller; second: Seller }) => {
      const { error: firstError } = await supabase
        .from("sellers")
        .update({ display_order: second.display_order })
        .eq("id", first.id);
      if (firstError) throw firstError;

      const { error: secondError } = await supabase
        .from("sellers")
        .update({ display_order: first.display_order })
        .eq("id", second.id);
      if (secondError) throw secondError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sellers"] });
      queryClient.invalidateQueries({ queryKey: ["sellers"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = list.data ?? [];

  function move(index: number, direction: -1 | 1) {
    const first = rows[index];
    const second = rows[index + direction];
    if (!first || !second) return;

    if (first.display_order === second.display_order) {
      swapOrder.mutate({
        first: { ...first, display_order: index },
        second: { ...second, display_order: index + direction },
      });
    } else {
      swapOrder.mutate({ first, second });
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Equipe de Vendas</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie apenas os cartões públicos exibidos no site. Contas de acesso são definidas em Contas.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="mr-1 h-4 w-4" /> Novo vendedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar" : "Novo"} vendedor</DialogTitle>
            </DialogHeader>
            <SellerForm
              initial={editing}
              submitting={save.isPending}
              onSubmit={(values) => save.mutate(values)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
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
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="inline h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Nenhum vendedor público cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((seller, index) => (
                <TableRow key={seller.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <button
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        aria-label="Subir"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        disabled={index === rows.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label="Descer"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {seller.photo_url ? (
                      <img
                        src={seller.photo_url}
                        alt={seller.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-xs font-bold">
                        {seller.name.charAt(0)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{seller.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{seller.role ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{seller.region ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{seller.whatsapp ?? seller.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={seller.active}
                      onCheckedChange={(active) => toggleActive.mutate({ id: seller.id, active })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(seller);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Remover "${seller.name}"?`)) remove.mutate(seller.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
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
  onSubmit: (values: FormState) => void;
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

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Nome completo *</Label>
          <Input
            value={values.name ?? ""}
            onChange={(event) => set("name", event.target.value)}
            required
          />
        </div>
        <div>
          <Label>Cargo</Label>
          <Input
            value={values.role ?? ""}
            onChange={(event) => set("role", event.target.value)}
            placeholder="Ex: Gerente de Vendas"
          />
        </div>
        <div>
          <Label>Cidade / Região</Label>
          <Input
            value={values.region ?? ""}
            onChange={(event) => set("region", event.target.value)}
            placeholder="Ex: Monte Aprazível"
          />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input
            value={values.phone ?? ""}
            onChange={(event) => set("phone", event.target.value)}
            placeholder="(16) 99411-8921"
          />
        </div>
        <div>
          <Label>WhatsApp</Label>
          <Input
            value={values.whatsapp ?? ""}
            onChange={(event) => set("whatsapp", event.target.value)}
            placeholder="16994118921"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Foto do vendedor</Label>
          <ImageUpload
            value={values.photo_url ?? ""}
            onChange={(value) => set("photo_url", value)}
            folder="sellers"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Ideal: retrato horizontal (4:3) com bom enquadramento do rosto.
          </p>
        </div>
        <div className="sm:col-span-2">
          <Label>Foto alternativa sem fundo (opcional)</Label>
          <ImageUpload
            value={values.cutout_url ?? ""}
            onChange={(value) => set("cutout_url", value)}
            folder="sellers/cutouts"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Imagem do banner esquerdo</Label>
          <ImageUpload
            value={values.banner_url ?? ""}
            onChange={(value) => set("banner_url", value)}
            folder="sellers/banners"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Proporção recomendada: aproximadamente 4:3, como 1200×900.
          </p>
        </div>
        <div>
          <Label>Ordem de exibição</Label>
          <Input
            type="number"
            value={values.display_order ?? 0}
            onChange={(event) => set("display_order", Number(event.target.value))}
          />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch checked={Boolean(values.active)} onCheckedChange={(value) => set("active", value)} />
          <Label>Ativo (visível no site)</Label>
        </div>
        {initial && (
          <div className="sm:col-span-2">
            <Label>Slug (URL)</Label>
            <Input
              value={values.slug ?? ""}
              onChange={(event) => set("slug", event.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
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
