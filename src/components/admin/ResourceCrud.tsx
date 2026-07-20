import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload, ImageListUpload, MediaListUpload } from "./ImageUpload";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "boolean" | "select" | "image" | "imageList" | "mediaList";
  options?: { value: string; label: string }[];
  required?: boolean;
  defaultValue?: any;
  step?: string;
};

export type ColumnDef = {
  key: string;
  label: string;
  format?: (v: any, row: any) => ReactNode;
};

export type FilterDef = {
  column: string;
  label: string;
  options: { value: string; label: string }[];
};

type Props = {
  title: string;
  table: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  orderBy?: { column: string; ascending?: boolean };
  searchField?: string;
  searchPlaceholder?: string;
  filters?: FilterDef[];
};

const PAGE_SIZE = 25;

export function ResourceCrud({ title, table, columns, fields, orderBy, searchField, searchPlaceholder, filters }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const list = useQuery({
    queryKey: ["admin", table, page, search, filterValues],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase.from(table as any).select("*", { count: "exact" });
      if (searchField && search) q = q.ilike(searchField, `%${search}%`);
      for (const [col, val] of Object.entries(filterValues)) {
        if (val) q = q.eq(col, val);
      }
      if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      const { data, error, count } = await q.range(from, to);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });
  const total = list.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const save = useMutation({
    mutationFn: async (values: any) => {
      if (editing?.id) {
        const { error } = await supabase.from(table as any).update(values).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table as any).insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", table] });
      setOpen(false);
      setEditing(null);
      toast.success("Salvo!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", table] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-1" /> Novo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} {title}</DialogTitle></DialogHeader>
            <ResourceForm
              fields={fields}
              initial={editing}
              onSubmit={(v) => save.mutate(v)}
              submitting={save.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {searchField && (
        <form
          onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}
          className="mb-4 flex gap-2"
        >
          <Input
            placeholder={searchPlaceholder ?? "Pesquisar..."}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" variant="outline">Buscar</Button>
          {search && (
            <Button type="button" variant="ghost" onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}>
              Limpar
            </Button>
      )}

      {filters && filters.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((f) => (
            <div key={f.column} className="flex items-center gap-2">
              <Label className="text-sm">{f.label}:</Label>
              <select
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={filterValues[f.column] ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setPage(1);
                  setFilterValues((p) => ({ ...p, [f.column]: v }));
                }}
              >
                <option value="">Todos</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
          {Object.values(filterValues).some(Boolean) && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setFilterValues({}); setPage(1); }}>
              Limpar filtros
            </Button>
          )}
        </div>
      )}


        </form>
      )}


      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.rows.map((row: any) => (
              <TableRow key={row.id}>
                {columns.map((c) => (
                  <TableCell key={c.key}>{c.format ? c.format(row[c.key], row) : String(row[c.key] ?? "")}</TableCell>
                ))}
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(row); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => {
                    if (confirm("Remover este item?")) del.mutate(row.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {list.data && list.data.rows.length === 0 && (
              <TableRow><TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Página {page} de {totalPages} · {total} registros</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResourceForm({ fields, initial, onSubmit, submitting }: {
  fields: FieldDef[]; initial: any; onSubmit: (v: any) => void; submitting: boolean;
}) {
  const [values, setValues] = useState<any>(() => {
    const v: any = {};
    fields.forEach((f) => {
      if (f.type === "imageList" || f.type === "mediaList") {
        v[f.name] = Array.isArray(initial?.[f.name]) ? initial[f.name] : (f.defaultValue ?? []);
      } else {
        v[f.name] = initial?.[f.name] ?? f.defaultValue ?? (f.type === "boolean" ? false : "");
      }
    });
    return v;
  });

  function handleChange(name: string, val: any) {
    setValues((p: any) => ({ ...p, [name]: val }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const out: any = {};
    fields.forEach((f) => {
      let v = values[f.name];
      if (f.type === "number") v = v === "" || v == null ? null : Number(v);
      if (f.type === "imageList" || f.type === "mediaList") { out[f.name] = Array.isArray(v) ? v : []; return; }
      if (f.type === "select" && v === "") v = null;
      if (v === "") v = null;
      out[f.name] = v;
    });
    onSubmit(out);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.name} className={f.type === "textarea" || f.type === "image" || f.type === "imageList" || f.type === "mediaList" ? "sm:col-span-2" : ""}>
            <Label>{f.label}</Label>
            {f.type === "textarea" ? (
              <Textarea value={values[f.name] ?? ""} onChange={(e) => handleChange(f.name, e.target.value)} rows={4} />
            ) : f.type === "boolean" ? (
              <div className="h-9 flex items-center"><Switch checked={!!values[f.name]} onCheckedChange={(v) => handleChange(f.name, v)} /></div>
            ) : f.type === "select" ? (
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={values[f.name] ?? ""}
                onChange={(e) => handleChange(f.name, e.target.value)}
              >
                <option value="">—</option>
                {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type === "image" ? (
              <ImageUpload value={values[f.name] ?? ""} onChange={(v) => handleChange(f.name, v)} />
            ) : f.type === "imageList" ? (
              <ImageListUpload value={Array.isArray(values[f.name]) ? values[f.name] : []} onChange={(v) => handleChange(f.name, v)} />
            ) : f.type === "mediaList" ? (
              <MediaListUpload value={Array.isArray(values[f.name]) ? values[f.name] : []} onChange={(v) => handleChange(f.name, v)} />
            ) : (
              <Input
                type={f.type === "number" ? "number" : "text"}
                step={f.step}
                value={values[f.name] ?? ""}
                onChange={(e) => handleChange(f.name, e.target.value)}
                required={f.required}
              />
            )}
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={submitting}>{submitting ? "Salvando..." : "Salvar"}</Button>
      </DialogFooter>
    </form>
  );
}
