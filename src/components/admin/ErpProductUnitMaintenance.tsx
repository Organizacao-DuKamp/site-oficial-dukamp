import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProductUnit = { code: string; description: string; decimal_places: number };
type Mode = "menu" | "inclusao" | "alteracao" | "exclusao" | "consulta";

// A tabela é criada pela migração do ERP e ainda não consta nos tipos gerados do Supabase.
const db = supabase as any;

async function listUnits(): Promise<ProductUnit[]> {
  const { data, error } = await db.from("erp_product_units")
    .select("code,description,decimal_places").order("code", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProductUnit[];
}

function UnitForm({ initial, saving, onSave, onCancel }: {
  initial?: ProductUnit;
  saving: boolean;
  onSave: (unit: ProductUnit) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [decimalPlaces, setDecimalPlaces] = useState(String(initial?.decimal_places ?? 1));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    const digits = Number(decimalPlaces);
    if (!/^[A-Z0-9.]{1,5}$/.test(normalized)) {
      toast.error("Informe uma unidade de até 5 caracteres: letras, números ou ponto.");
      return;
    }
    if (!description.trim() || !Number.isInteger(digits) || digits < 0 || digits > 6) {
      toast.error("Informe uma descrição e de 0 a 6 casas decimais.");
      return;
    }
    onSave({ code: normalized, description: description.trim(), decimal_places: digits });
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-1 text-sm font-medium">
          Unidade *
          <Input required maxLength={5} readOnly={Boolean(initial)} className={initial ? "bg-muted/40" : ""}
            value={code} onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Ex.: UN ou MT." />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Descrição *
          <Input required maxLength={80} value={description}
            onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: UNIDADE" />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Casas decimais *
          <Input required type="number" min={0} max={6} step={1} value={decimalPlaces}
            onChange={(event) => setDecimalPlaces(event.target.value)} />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Salvando..." : initial ? "Salvar alterações" : "Cadastrar unidade"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

export function ErpProductUnitMaintenance({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("menu");
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const results = useQuery({ queryKey: ["erp-product-units"], queryFn: listUnits });
  const filtered = results.data?.filter((unit) => {
    const term = search.trim().toLocaleUpperCase("pt-BR");
    return !term || unit.code.includes(term) || unit.description.toLocaleUpperCase("pt-BR").includes(term);
  }) ?? [];
  const selected = results.data?.find((unit) => unit.code === selectedCode) ?? null;

  const save = useMutation({
    mutationFn: async (unit: ProductUnit) => {
      if (mode === "inclusao") {
        const { error } = await db.from("erp_product_units").insert(unit).select("code").single();
        if (error) throw error;
      } else {
        if (!selectedCode) throw new Error("Selecione uma unidade para alterar.");
        const { error } = await db.from("erp_product_units")
          .update({ description: unit.description, decimal_places: unit.decimal_places })
          .eq("code", selectedCode).select("code").single();
        if (error) throw error;
      }
      return unit.code;
    },
    onSuccess: async (code) => {
      await queryClient.invalidateQueries({ queryKey: ["erp-product-units"] });
      setSearch(code);
      setSelectedCode(code);
      setMode("consulta");
      toast.success("Unidade salva.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar a unidade."),
  });

  const remove = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await db.from("erp_product_units").delete().eq("code", code).select("code").single();
      if (error) throw error;
    },
    onSuccess: async () => {
      setSelectedCode(null);
      setSearch("");
      await queryClient.invalidateQueries({ queryKey: ["erp-product-units"] });
      toast.success("Unidade excluída.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível excluir a unidade."),
  });

  function choose(next: Mode) {
    setMode(next);
    setSelectedCode(null);
    setSearch("");
  }

  const titles: Record<Mode, string> = {
    menu: "Unidades Medidas Produtos", inclusao: "Inclusão de unidade",
    alteracao: "Alteração de unidade", exclusao: "Exclusão de unidade",
    consulta: "Consulta de unidades",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">{titles[mode]}</h3>
          <p className="text-sm text-muted-foreground">Unidades de medida dos produtos do ERP.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mode === "menu" ? onBack() : choose("menu")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>

      {mode === "menu" && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {([
            { mode: "inclusao", label: "Inclusão", icon: Plus },
            { mode: "alteracao", label: "Alteração", icon: Pencil },
            { mode: "exclusao", label: "Exclusão", icon: Trash2 },
            { mode: "consulta", label: "Consulta", icon: Search },
          ] as const).map((option) => (
            <Button key={option.mode} variant="outline" className="justify-start" onClick={() => choose(option.mode)}>
              <option.icon className="mr-2 h-4 w-4" /> {option.label}
            </Button>
          ))}
        </div>
      )}

      {mode === "inclusao" && (
        <UnitForm saving={save.isPending} onSave={(unit) => save.mutate(unit)} onCancel={() => choose("menu")} />
      )}

      {mode !== "inclusao" && (
        <>
          <label className="block max-w-md space-y-1 text-sm font-medium">
            Pesquisar unidade
            <Input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedCode(null); }}
              placeholder="Código ou descrição" />
          </label>
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="grid grid-cols-[5rem_1fr_7rem] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-semibold sm:grid-cols-[7rem_1fr_10rem]">
              <span>Unidade</span><span>Descrição</span><span>Casas decimais</span>
            </div>
            {results.isPending ? <p className="p-4 text-sm">Carregando unidades...</p> : results.isError ? (
              <p role="alert" className="p-4 text-sm text-destructive">
                Erro ao consultar unidades: {results.error instanceof Error ? results.error.message : "tente novamente"}
              </p>
            ) : filtered.length ? (
              <ul className="max-h-80 divide-y overflow-y-auto">
                {filtered.map((unit) => (
                  <li key={unit.code}>
                    <button type="button" onClick={() => { setSelectedCode(unit.code); if (mode === "menu") setMode("consulta"); }}
                      className={"grid w-full grid-cols-[5rem_1fr_7rem] gap-3 px-4 py-2 text-left text-sm hover:bg-accent sm:grid-cols-[7rem_1fr_10rem] " + (selectedCode === unit.code ? "bg-primary/10" : "")}>
                      <span className="font-mono">{unit.code}</span><span>{unit.description}</span><span>{unit.decimal_places}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="p-4 text-sm text-muted-foreground">Nenhuma unidade encontrada.</p>}
          </div>
          {selected && mode === "alteracao" && (
            <UnitForm key={selected.code} initial={selected} saving={save.isPending}
              onSave={(unit) => save.mutate(unit)} onCancel={() => setSelectedCode(null)} />
          )}
          {selected && (mode === "consulta" || mode === "exclusao") && (
            <div className="space-y-3 rounded-lg border bg-card p-4">
              <p className="text-sm"><strong>Unidade:</strong> {selected.code}</p>
              <p className="text-sm"><strong>Descrição:</strong> {selected.description}</p>
              <p className="text-sm"><strong>Casas decimais:</strong> {selected.decimal_places}</p>
              {mode === "exclusao" && (
                <Button variant="destructive" disabled={remove.isPending} onClick={() => {
                  if (window.confirm("Excluir definitivamente a unidade " + selected.code + "?")) remove.mutate(selected.code);
                }}><Trash2 className="mr-2 h-4 w-4" /> {remove.isPending ? "Excluindo..." : "Excluir unidade"}</Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
