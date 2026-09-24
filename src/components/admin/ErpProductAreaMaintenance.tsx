import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProductArea = {
  code: string;
  description: string;
  responsible_code: string;
  responsible_name: string;
};
type Mode = "menu" | "inclusao" | "alteracao" | "exclusao" | "consulta";

// A migração do ERP ainda não aparece nos tipos gerados do cliente Supabase.
const db = supabase as any;

async function listAreas(): Promise<ProductArea[]> {
  const { data, error } = await db.from("erp_product_areas")
    .select("code,description,responsible_code,responsible_name").order("code", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProductArea[];
}

function AreaForm({ initial, saving, onSave, onCancel }: {
  initial?: ProductArea;
  saving: boolean;
  onSave: (area: ProductArea) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [responsibleCode, setResponsibleCode] = useState(initial?.responsible_code ?? "");
  const [responsibleName, setResponsibleName] = useState(initial?.responsible_name ?? "");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.trim().padStart(3, "0");
    if (!/^[0-9]{3,4}$/.test(normalized)) {
      toast.error("Informe um código de área numérico de até 4 dígitos.");
      return;
    }
    if (responsibleCode.trim() && !/^[0-9]{1,6}$/.test(responsibleCode.trim())) {
      toast.error("O código do responsável deve conter apenas números.");
      return;
    }
    onSave({
      code: normalized,
      description: description.trim(),
      responsible_code: responsibleCode.trim(),
      responsible_name: responsibleName.trim(),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          Área *
          <Input required inputMode="numeric" maxLength={4} readOnly={Boolean(initial)}
            className={initial ? "bg-muted/40" : ""} value={code}
            onChange={(event) => setCode(event.target.value)} placeholder="Ex.: 001" />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Descrição
          <Input maxLength={120} value={description} onChange={(event) => setDescription(event.target.value)}
            placeholder="Descrição da área" />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Código do responsável
          <Input inputMode="numeric" maxLength={6} value={responsibleCode}
            onChange={(event) => setResponsibleCode(event.target.value)} placeholder="Ex.: 908" />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Nome do responsável
          <Input maxLength={120} value={responsibleName}
            onChange={(event) => setResponsibleName(event.target.value)} placeholder="Ex.: EVERTON" />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Salvando..." : initial ? "Salvar alterações" : "Cadastrar área"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

export function ErpProductAreaMaintenance({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("menu");
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const results = useQuery({ queryKey: ["erp-product-areas"], queryFn: listAreas });
  const filtered = results.data?.filter((area) => {
    const term = search.trim().toLocaleUpperCase("pt-BR");
    return !term || area.code.includes(term) || area.description.toLocaleUpperCase("pt-BR").includes(term)
      || area.responsible_code.includes(term) || area.responsible_name.toLocaleUpperCase("pt-BR").includes(term);
  }) ?? [];
  const selected = results.data?.find((area) => area.code === selectedCode) ?? null;

  const save = useMutation({
    mutationFn: async (area: ProductArea) => {
      if (mode === "inclusao") {
        const { error } = await db.from("erp_product_areas").insert(area).select("code").single();
        if (error) throw error;
      } else {
        if (!selectedCode) throw new Error("Selecione uma área para alterar.");
        const { error } = await db.from("erp_product_areas")
          .update({
            description: area.description,
            responsible_code: area.responsible_code,
            responsible_name: area.responsible_name,
          }).eq("code", selectedCode).select("code").single();
        if (error) throw error;
      }
      return area.code;
    },
    onSuccess: async (code) => {
      await queryClient.invalidateQueries({ queryKey: ["erp-product-areas"] });
      setSearch(code);
      setSelectedCode(code);
      setMode("consulta");
      toast.success("Área salva.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar a área."),
  });

  const remove = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await db.from("erp_product_areas").delete().eq("code", code).select("code").single();
      if (error) throw error;
    },
    onSuccess: async () => {
      setSelectedCode(null);
      setSearch("");
      await queryClient.invalidateQueries({ queryKey: ["erp-product-areas"] });
      toast.success("Área excluída.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível excluir a área."),
  });

  function choose(next: Mode) {
    setMode(next);
    setSelectedCode(null);
    setSearch("");
  }

  const titles: Record<Mode, string> = {
    menu: "Áreas Produtos/Responsável", inclusao: "Inclusão de área",
    alteracao: "Alteração de área", exclusao: "Exclusão de área", consulta: "Consulta de áreas",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">{titles[mode]}</h3>
          <p className="text-sm text-muted-foreground">Cadastro de áreas de produtos e responsáveis do ERP.</p>
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
        <AreaForm saving={save.isPending} onSave={(area) => save.mutate(area)} onCancel={() => choose("menu")} />
      )}

      {mode !== "inclusao" && (
        <>
          <label className="block max-w-md space-y-1 text-sm font-medium">
            Pesquisar área ou responsável
            <Input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedCode(null); }}
              placeholder="Código, descrição ou responsável" />
          </label>
          <p className="text-xs text-muted-foreground">Alguns nomes vieram abreviados nas capturas do sistema anterior. É possível completá-los em Alteração.</p>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <div className="min-w-[570px]">
              <div className="grid grid-cols-[5rem_1fr_4rem_1fr] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-semibold">
                <span>Área</span><span>Descrição</span><span>Rep.</span><span>Responsável</span>
              </div>
              {results.isPending ? <p className="p-4 text-sm">Carregando áreas...</p> : results.isError ? (
                <p role="alert" className="p-4 text-sm text-destructive">
                  Erro ao consultar áreas: {results.error instanceof Error ? results.error.message : "tente novamente"}
                </p>
              ) : filtered.length ? (
                <ul className="max-h-80 divide-y overflow-y-auto">
                  {filtered.map((area) => (
                    <li key={area.code}>
                      <button type="button" onClick={() => { setSelectedCode(area.code); if (mode === "menu") setMode("consulta"); }}
                        className={"grid w-full grid-cols-[5rem_1fr_4rem_1fr] gap-3 px-4 py-2 text-left text-sm hover:bg-accent " + (selectedCode === area.code ? "bg-primary/10" : "")}>
                        <span className="font-mono">{area.code}</span><span>{area.description || "—"}</span>
                        <span className="font-mono">{area.responsible_code || "—"}</span><span>{area.responsible_name || "—"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="p-4 text-sm text-muted-foreground">Nenhuma área encontrada.</p>}
            </div>
          </div>
          {selected && mode === "alteracao" && (
            <AreaForm key={selected.code} initial={selected} saving={save.isPending}
              onSave={(area) => save.mutate(area)} onCancel={() => setSelectedCode(null)} />
          )}
          {selected && (mode === "consulta" || mode === "exclusao") && (
            <div className="space-y-3 rounded-lg border bg-card p-4">
              <p className="text-sm"><strong>Área:</strong> {selected.code}</p>
              <p className="text-sm"><strong>Descrição:</strong> {selected.description || "—"}</p>
              <p className="text-sm"><strong>Responsável:</strong> {[selected.responsible_code, selected.responsible_name].filter(Boolean).join(" - ") || "—"}</p>
              {mode === "exclusao" && (
                <Button variant="destructive" disabled={remove.isPending} onClick={() => {
                  if (window.confirm("Excluir definitivamente a área " + selected.code + "?")) remove.mutate(selected.code);
                }}><Trash2 className="mr-2 h-4 w-4" /> {remove.isPending ? "Excluindo..." : "Excluir área"}</Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
