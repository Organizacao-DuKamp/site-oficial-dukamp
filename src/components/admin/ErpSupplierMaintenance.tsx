import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Values = Record<string, string>;
type Supplier = { code: string; name: string; details: Values };
type Mode = "menu" | "inclusao" | "alteracao" | "exclusao" | "consulta";

const fields: [string, string][] = [
  ["endereco", "Endereço"], ["cidade", "Cidade"], ["bairro", "Bairro"], ["cep", "CEP"],
  ["fone", "Fone"], ["fone_fax", "Fone/Fax"], ["cnpj", "CNPJ"], ["inscricao_estadual", "Inscrição Estadual"],
  ["grupo_despesas", "Grupo Despesas"], ["data_cadastro", "Data Cadastro"],
  ["conta_contabil", "Conta Contábil"], ["email", "Email"], ["nome_fantasia", "Nome Fantasia"],
  ["contato", "Contato"], ["observacoes", "Observações"],
  ["data_ultima_compra", "Data Última Compra"], ["valor_ultima_compra", "Valor Última Compra"],
  ["data_maior_compra", "Data Maior Compra"], ["valor_maior_compra", "Valor Maior Compra"],
  ["compra_ano", "Compra Ano"], ["compra_ano_anterior", "Compra Ano Anterior"],
  ["ultimo", "Último"],
];

const db = supabase as any;

async function listSuppliers(term: string): Promise<Supplier[]> {
  let query = db.from("erp_suppliers").select("code,name,details").order("code", { ascending: true }).limit(50);
  if (term) {
    const digits = term.replace(/\D/g, "");
    if (digits.length === term.length && digits.length <= 5) {
      query = query.eq("code", digits.padStart(5, "0"));
    } else {
      query = query.ilike("name", "%" + term.replace(/[\\%_]/g, "\\$&") + "%");
    }
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Supplier[];
}

function SupplierDetails({ supplier }: { supplier: Supplier }) {
  return (
    <section className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs text-muted-foreground">Fornecedor · {supplier.code}</p>
        <h4 className="mt-1 font-semibold">{supplier.name}</h4>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {fields.map(([key, label]) => (
          <div key={key} className="rounded-md border bg-card px-3 py-2">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="min-h-5 break-words text-sm font-medium">{supplier.details?.[key] || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SupplierForm({ initial, saving, onSave, onCancel }: {
  initial?: Supplier;
  saving: boolean;
  onSave: (name: string, details: Values) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [details, setDetails] = useState<Values>(initial?.details ?? {});
  return (
    <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); onSave(name.trim(), details); }}>
      <div className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          Código do fornecedor
          <Input readOnly className="bg-muted/40" value={initial?.code ?? "Gerado automaticamente (5 dígitos)"} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Nome *
          <Input required maxLength={200} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
      </div>
      <p className="text-sm text-muted-foreground">Preencha os dados disponíveis; os demais campos podem ficar vazios.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {fields.map(([key, label]) => (
          <label key={key} className="space-y-1 text-sm font-medium">
            {label}
            <Input maxLength={500} value={details[key] ?? ""} onChange={(event) => setDetails((previous) => ({ ...previous, [key]: event.target.value }))} />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Salvando..." : initial ? "Salvar alterações" : "Cadastrar fornecedor"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

export function ErpSupplierMaintenance({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("menu");
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const results = useQuery({ queryKey: ["erp-suppliers", submitted], queryFn: () => listSuppliers(submitted) });
  const selected = results.data?.find((item) => item.code === selectedCode) ?? null;

  const save = useMutation({
    mutationFn: async ({ name, details }: { name: string; details: Values }) => {
      if (mode === "inclusao") {
        const { data, error } = await db.from("erp_suppliers").insert({ name, details }).select("code").single();
        if (error) throw error;
        return String(data.code);
      }
      if (!selectedCode) throw new Error("Selecione um fornecedor para alterar.");
      const { error } = await db.from("erp_suppliers").update({ name, details }).eq("code", selectedCode).select("code").single();
      if (error) throw error;
      return selectedCode;
    },
    onSuccess: async (code) => {
      toast.success(mode === "inclusao" ? "Fornecedor cadastrado com código " + code + "." : "Fornecedor atualizado.");
      await queryClient.invalidateQueries({ queryKey: ["erp-suppliers"] });
      setSearch(code);
      setSubmitted(code);
      setSelectedCode(code);
      setMode("consulta");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar o fornecedor."),
  });

  const remove = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await db.from("erp_suppliers").delete().eq("code", code).select("code").single();
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Fornecedor excluído.");
      setSelectedCode(null);
      setSearch("");
      setSubmitted("");
      await queryClient.invalidateQueries({ queryKey: ["erp-suppliers"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível excluir o fornecedor."),
  });

  function choose(next: Mode) {
    setMode(next);
    setSelectedCode(null);
    setSearch("");
    setSubmitted("");
  }

  const titles: Record<Mode, string> = {
    menu: "Fornecedores", inclusao: "Inclusão de fornecedor",
    alteracao: "Alteração de fornecedor", exclusao: "Exclusão de fornecedor",
    consulta: "Consulta de fornecedor",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">{titles[mode]}</h3>
          <p className="text-sm text-muted-foreground">Cadastro de fornecedores do ERP.</p>
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
        <SupplierForm saving={save.isPending} onSave={(name, details) => save.mutate({ name, details })} onCancel={() => choose("menu")} />
      )}

      {mode !== "inclusao" && (
        <>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); setSelectedCode(null); setSubmitted(search.trim()); }}>
            <label htmlFor="erp-supplier-search" className="sr-only">Código ou nome do fornecedor</label>
            <Input id="erp-supplier-search" inputMode="search" className="sm:max-w-md" value={search}
              onChange={(event) => setSearch(event.target.value)} placeholder="Digite o código ou nome do fornecedor" />
            <Button type="submit"><Search className="mr-2 h-4 w-4" /> Pesquisar</Button>
          </form>
          <div className="rounded-lg border bg-card">
            <p className="border-b px-4 py-2 text-xs text-muted-foreground">
              {submitted ? "Resultado da pesquisa" : "Fornecedores cadastrados (até 50)"}
            </p>
            {results.isPending ? <p className="p-4 text-sm">Carregando fornecedores...</p> : results.isError ? (
              <p role="alert" className="p-4 text-sm text-destructive">
                Erro ao consultar fornecedores: {results.error instanceof Error ? results.error.message : "tente novamente"}
              </p>
            ) : results.data?.length ? (
              <ul className="max-h-64 divide-y overflow-y-auto">
                {results.data.map((supplier) => (
                  <li key={supplier.code}>
                    <button type="button" onClick={() => { setSelectedCode(supplier.code); if (mode === "menu") setMode("consulta"); }}
                      className={"flex w-full gap-3 px-4 py-2 text-left text-sm hover:bg-accent " + (selectedCode === supplier.code ? "bg-primary/10" : "")}>
                      <span className="font-mono text-muted-foreground">{supplier.code}</span>
                      <span>{supplier.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="p-4 text-sm text-muted-foreground">Nenhum fornecedor encontrado. Use Inclusão para cadastrar o primeiro.</p>}
          </div>
          {selected && mode === "alteracao" && (
            <SupplierForm key={selected.code} initial={selected} saving={save.isPending}
              onSave={(name, details) => save.mutate({ name, details })} onCancel={() => setSelectedCode(null)} />
          )}
          {selected && (mode === "consulta" || mode === "exclusao") && (
            <>
              <SupplierDetails supplier={selected} />
              {mode === "exclusao" && (
                <Button variant="destructive" disabled={remove.isPending} onClick={() => {
                  if (window.confirm("Excluir definitivamente o fornecedor " + selected.code + " — " + selected.name + "?")) {
                    remove.mutate(selected.code);
                  }
                }}>
                  <Trash2 className="mr-2 h-4 w-4" /> {remove.isPending ? "Excluindo..." : "Excluir fornecedor"}
                </Button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
