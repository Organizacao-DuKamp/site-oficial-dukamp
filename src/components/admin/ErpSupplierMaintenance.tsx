import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ErpRecordDialog, type ErpRecordView } from "@/components/admin/ErpRecordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Values = Record<string, string>;
type Supplier = { code: string; name: string; details: Values };
type SupplierPage = { items: Supplier[]; total: number };
const PAGE_SIZE = 50;
type Mode = "inclusao" | "consulta";

const fields: [string, string][] = [
  ["endereco", "Endereço"], ["cidade", "Cidade"], ["uf", "UF"], ["codigo_cidade", "Código da cidade"], ["bairro", "Bairro"], ["cep", "CEP"],
  ["fone", "Fone"], ["fone_fax", "Fone/Fax"], ["cnpj", "CNPJ"], ["inscricao_estadual", "Inscrição Estadual"],
  ["grupo_despesas", "Grupo Despesas"], ["codigo_grupo_despesas", "Código do grupo"], ["data_cadastro", "Data Cadastro"],
  ["conta_contabil", "Conta Contábil"], ["email", "Email"], ["nome_fantasia", "Nome Fantasia"],
  ["contato", "Contato"], ["observacoes", "Observações"],
  ["data_ultima_compra", "Data Última Compra"], ["valor_ultima_compra", "Valor Última Compra"],
  ["data_maior_compra", "Data Maior Compra"], ["valor_maior_compra", "Valor Maior Compra"],
  ["compra_ano", "Compra Ano"], ["compra_ano_anterior", "Compra Ano Anterior"],
  ["indice_preco_venda", "Índice de preço de venda"], ["saldo_adicional", "Saldo adicional"],
  ["vcgc_original", "CGC original"],
];

const db = supabase as any;

async function listSuppliers(term: string, page: number): Promise<SupplierPage> {
  let query = db.from("erp_suppliers").select("code,name,details", { count: "exact" }).order("code", { ascending: true });
  if (term) {
    const digits = term.replace(/\D/g, "");
    if (digits.length === term.length && digits.length <= 5) {
      query = query.eq("code", digits.padStart(5, "0"));
    } else {
      query = query.ilike("name", "%" + term.replace(/[\\%_]/g, "\\$&") + "%");
    }
  }
  const { data, count, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (error) throw error;
  return { items: (data ?? []) as Supplier[], total: count ?? 0 };
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

export function ErpSupplierMaintenance() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("consulta");
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [page, setPage] = useState(0);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogView, setDialogView] = useState<ErpRecordView>("visualizar");
  const results = useQuery({ queryKey: ["erp-suppliers", submitted, page], queryFn: () => listSuppliers(submitted, page) });
  const selected = results.data?.items.find((item) => item.code === selectedCode) ?? null;

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
      setPage(0);
      setSelectedCode(null);
      setDialogOpen(false);
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
      setDialogOpen(false);
      setSearch("");
      setSubmitted("");
      setPage(0);
      await queryClient.invalidateQueries({ queryKey: ["erp-suppliers"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível excluir o fornecedor."),
  });

  function choose(next: Mode) {
    setMode(next);
    setSelectedCode(null);
    setDialogOpen(false);
    setSearch("");
    setSubmitted("");
    setPage(0);
  }

  const titles: Record<Mode, string> = {
    inclusao: "Novo fornecedor", consulta: "Fornecedores",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {mode !== "consulta" && <h3 className="text-lg font-semibold">{titles[mode]}</h3>}
        {mode === "consulta" ? (
          <Button size="sm" onClick={() => choose("inclusao")}><Plus className="mr-2 h-4 w-4" /> Novo fornecedor</Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setMode("consulta")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar aos fornecedores
          </Button>
        )}
      </div>

      {mode === "inclusao" && (
        <SupplierForm saving={save.isPending} onSave={(name, details) => save.mutate({ name, details })} onCancel={() => setMode("consulta")} />
      )}

      {mode !== "inclusao" && (
        <>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); setSelectedCode(null); setDialogOpen(false); setPage(0); setSubmitted(search.trim()); }}>
            <label htmlFor="erp-supplier-search" className="sr-only">Código ou nome do fornecedor</label>
            <Input id="erp-supplier-search" inputMode="search" className="sm:max-w-md" value={search}
              onChange={(event) => setSearch(event.target.value)} placeholder="Digite o código ou nome do fornecedor" />
            <Button type="submit"><Search className="mr-2 h-4 w-4" /> Pesquisar</Button>
          </form>
          <div className="rounded-lg border bg-card">
            <p className="border-b px-4 py-2 text-xs text-muted-foreground">
              {submitted ? "Resultado da pesquisa" : "Fornecedores cadastrados"}
              {results.data && ` · ${results.data.total.toLocaleString("pt-BR")} resultado(s)`}
            </p>
            {results.isPending ? <p className="p-4 text-sm">Carregando fornecedores...</p> : results.isError ? (
              <p role="alert" className="p-4 text-sm text-destructive">
                Erro ao consultar fornecedores: {results.error instanceof Error ? results.error.message : "tente novamente"}
              </p>
            ) : results.data?.items.length ? (
              <ul className="max-h-64 divide-y overflow-y-auto">
                {results.data.items.map((supplier) => (
                  <li key={supplier.code}>
                    <button type="button" onClick={() => { setSelectedCode(supplier.code); setDialogView("visualizar"); setDialogOpen(true); }}
                      className={"flex w-full gap-3 px-4 py-2 text-left text-sm hover:bg-accent " + (selectedCode === supplier.code ? "bg-primary/10" : "")}>
                      <span className="font-mono text-muted-foreground">{supplier.code}</span>
                      <span>{supplier.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="p-4 text-sm text-muted-foreground">Nenhum fornecedor encontrado.</p>}
          </div>
          {results.data && results.data.total > PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                Exibindo {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, results.data.total)} de {results.data.total.toLocaleString("pt-BR")}
              </span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page === 0 || results.isFetching}
                  onClick={() => { setSelectedCode(null); setPage((current) => current - 1); }}>Anterior</Button>
                <span>Página {page + 1} de {Math.ceil(results.data.total / PAGE_SIZE)}</span>
                <Button type="button" variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= results.data.total || results.isFetching}
                  onClick={() => { setSelectedCode(null); setPage((current) => current + 1); }}>Próxima</Button>
              </div>
            </div>
          )}
        </>
      )}
      <ErpRecordDialog
        open={dialogOpen && Boolean(selected)}
        title={selected ? `${selected.code} · ${selected.name}` : "Fornecedor"}
        view={dialogView}
        onViewChange={setDialogView}
        onClose={() => { setDialogOpen(false); setSelectedCode(null); }}
        details={selected ? <SupplierDetails supplier={selected} /> : null}
        editForm={selected ? (
          <SupplierForm key={selected.code} initial={selected} saving={save.isPending}
            onSave={(name, details) => save.mutate({ name, details })} onCancel={() => setDialogView("visualizar")} />
        ) : null}
        deleteLabel="Excluir fornecedor"
        deleteDescription="Este fornecedor será excluído definitivamente."
        onDelete={() => { if (selected) remove.mutate(selected.code); }}
        deleting={remove.isPending}
      />
    </div>
  );
}
