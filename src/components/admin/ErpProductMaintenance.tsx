import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ErpRecordDialog, type ErpRecordView } from "@/components/admin/ErpRecordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Values = Record<string, string>;
type PriceRow = { prazo_dias?: number; tabela?: { preco?: string; comissao_percentual?: string }; produtor?: { preco?: string; comissao_percentual?: string }; revenda?: { preco?: string; comissao_percentual?: string }; tabela_endereco?: { preco?: string }; preco_web?: { preco?: string } };
type ProductPage = { items: ErpProduct[]; total: number };
const PAGE_SIZE = 50;
type ErpProduct = {
  code: string;
  name: string;
  product_data: Values;
  pricing_data: Values & { faixas?: PriceRow[] };
};
type Screen = "tabela" | "inclusao" | "consulta";

// Campos exibidos no cadastro do Clipper. As abreviações foram mantidas quando são parte do nome original.
const productFields: [string, string][] = [
  ["classificacao", "Classificação"], ["unidade", "Unidade"], ["tipo_produto", "Tp_Prd"],
  ["peso", "Peso"], ["segmento", "Seg"], ["dose", "Dose"], ["grupo", "Grupo"],
  ["principio_ativo", "Princ Ativo"], ["complemento", "Complemento"], ["web", "Web"],
  ["custo_contabil", "Custo Contábil"], ["referencia_fabrica", "Ref Fábrica"],
  ["numero_serie", "Nr Série"], ["data_ultima_compra", "Dt Últ Compra"],
  ["validade", "Validade"], ["data_ultima_saida", "Dt Últ Saída"],
  ["area_loja", "Área Loja"], ["local_loja", "Local Loja"], ["reposicao", "Reposição"],
  ["area_almoxarifado", "Área Alm"], ["local_almoxarifado", "Local Alm"],
  ["fornecedor", "Fornecedor"], ["aut_serv", "Aut Serv"], ["alt_prcv", "Alt PrcV"],
  ["marca", "Marca"], ["estoque_loja", "Est Loja"], ["estoque_almoxarifado", "Est Alm"],
  ["multiplicador_minimo", "% Mult Mínimo"], ["sugestao_compra", "Sugestão Compra"],
  ["reducao_agricola", "Redu Agrícola"], ["icms_difer", "% ICMS Difer"],
  ["icms4", "ICMS 4%"], ["reducao_base_icms", "% Rd Bc ICMS"],
  ["pis_cofins", "PIS/COFINS"], ["cst", "CST"], ["codigo_tributario_icms", "Cód Trib ICMS"],
  ["classificacao_tributaria", "CClasTrib"], ["frete", "Frete"], ["ncm", "NCM"],
  ["codigo_fiscal", "Código Fiscal"], ["tabela_representante", "Tabela Repr"],
  ["imprimir_tabela", "Impr na Tabela"], ["condicao_compra", "Cnd Compra"],
  ["prazo_venda", "Prazo Venda"], ["receita_veterinaria", "Receit Veter"],
  ["observacoes", "Observações"], ["anp", "ANP"], ["cest", "CEST"],
];

const priceFields: [string, string][] = [
  ["custo_real", "Cst Real"], ["frete", "Fret"], ["carga_descarga", "Crg/Dsc"],
  ["custo_final", "Cst Final"], ["custo_ajustado", "Cst Ajus"],
  ["percentual_ajuste", "% Ajuste"], ["percentual_promocao", "% Prm"],
  ["validade_promocao", "Valid Promo"], ["prazo_valor_minimo", "Prz Vlr Min"],
  ["percentual_minimo", "% Mínimo"], ["valor_minimo", "Vlr Mini"],
  ["prazo_venda", "Prz Venda"], ["financiamento_mensal", "% Finc Mensal"],
  ["prazo_compra", "Prz Compra"], ["complemento", "Complemento"],
  ["quantidade_preco_promocional", "Qt_Pr_Promo"], ["descricao_ajuste", "Descrição Ajuste"],
  ["tabela_fixa", "Tabela Fixa"], ["pontos_site", "Pontos Site"],
  ["qcm_prazo", "Qcm_Prz"], ["qcm_preco", "Qcm_Prc"], ["margem", "% Margem"],
  ["desconto_produto", "Ds_PRD"], ["comissao_interna", "Comiss Int"],
  ["desconto_revenda", "Ds_REV"], ["margem_bruta", "% Mrg Bruta"],
  ["saldo_matriz", "Sld Matriz"], ["almoxarifado", "Almox"],
  ["filial_rp", "Fil_RP"], ["total", "Total"],
];

const db = supabase as any;

async function listProducts(term: string, page: number): Promise<ProductPage> {
  let query = db.from("erp_products")
    .select("code,name,product_data,pricing_data", { count: "exact" })
    .order("code", { ascending: true });
  if (term) {
    const code = term.replace(/\D/g, "");
    if (code && code.length === term.length && code.length <= 6) {
      query = query.eq("code", code.padStart(6, "0"));
    } else {
      // Escape LIKE metacharacters so a product name is searched literally.
      query = query.ilike("name", `%${term.replace(/[\\%_]/g, "\\$&")}%`);
    }
  }
  const { data, count, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (error) throw error;
  return { items: (data ?? []) as ErpProduct[], total: count ?? 0 };
}

function FieldGrid({ fields, values }: { fields: [string, string][]; values: Values }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {fields.map(([key, label]) => (
        <div key={key} className="rounded-md border bg-card px-3 py-2">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="min-h-5 break-words text-sm font-medium">{values[key] || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProductDetails({ product, showPricing }: { product: ErpProduct; showPricing: boolean }) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs text-muted-foreground">Produto · {product.code}</p>
        <p className="mt-1 font-semibold">{product.name}</p>
        {product.product_data?.status && <p className="mt-1 text-xs text-muted-foreground">Status na origem: {product.product_data.status}</p>}
      </div>
      {showPricing ? (
        <>
          <h4 className="font-semibold">Tabela de preço</h4>
          <FieldGrid fields={priceFields} values={product.pricing_data ?? {}} />
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground"><tr>
                {["Prazo", "Tabela", "% comissão", "Produtor", "% comissão", "Revenda", "% comissão", "Tb. end.", "Preço web"].map((title) => (
                  <th key={title} className="px-3 py-2 font-medium">{title}</th>
                ))}
              </tr></thead>
              <tbody>
                {product.pricing_data?.faixas?.length ? product.pricing_data.faixas.map((row, index) => (
                  <tr key={`${row.prazo_dias}-${index}`} className="border-t">
                    <td className="px-3 py-2">{row.prazo_dias ?? "—"}</td>
                    <td className="px-3 py-2">{row.tabela?.preco ?? "—"}</td>
                    <td className="px-3 py-2">{row.tabela?.comissao_percentual ?? "—"}</td>
                    <td className="px-3 py-2">{row.produtor?.preco ?? "—"}</td>
                    <td className="px-3 py-2">{row.produtor?.comissao_percentual ?? "—"}</td>
                    <td className="px-3 py-2">{row.revenda?.preco ?? "—"}</td>
                    <td className="px-3 py-2">{row.revenda?.comissao_percentual ?? "—"}</td>
                    <td className="px-3 py-2">{row.tabela_endereco?.preco ?? "—"}</td>
                    <td className="px-3 py-2">{row.preco_web?.preco ?? "—"}</td>
                  </tr>
                )) : <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">Nenhuma faixa de preço cadastrada.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <><h4 className="font-semibold">Cadastro do produto</h4><FieldGrid fields={productFields} values={product.product_data ?? {}} /></>
      )}
    </div>
  );
}

function ProductForm({
  initial, saving, onSave, onCancel,
}: {
  initial?: ErpProduct;
  saving: boolean;
  onSave: (name: string, values: Values) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [values, setValues] = useState<Values>(initial?.product_data ?? {});
  return (
    <form onSubmit={(event) => { event.preventDefault(); onSave(name.trim(), values); }} className="space-y-5">
      <div className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          Código do produto
          <Input value={initial?.code ?? "Gerado automaticamente (6 dígitos)"} readOnly className="bg-muted/40" />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Descrição do produto *
          <Input value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} placeholder="Nome do produto" />
        </label>
      </div>
      <p className="text-sm text-muted-foreground">Preencha os dados disponíveis; os demais campos podem ficar vazios por enquanto.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {productFields.map(([key, label]) => (
          <label key={key} className="space-y-1 text-sm font-medium">
            {label}
            <Input value={values[key] ?? ""} onChange={(event) => setValues((previous) => ({ ...previous, [key]: event.target.value }))} maxLength={500} />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Salvando..." : initial ? "Salvar alterações" : "Cadastrar produto"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}


const recalculatedFields = new Set(["custo_real", "frete", "carga_descarga", "percentual_ajuste", "margem", "financiamento_mensal", "prazo_venda"]);
const derivedFields = new Set(["custo_final", "custo_ajustado"]);

function numberFrom(value: string | number | undefined): number | null {
  if (value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = value.trim().replace(/\\s/g, "");
  if (!text) return 0;
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  const normalized = comma > dot ? text.replace(/\\./g, "").replace(",", ".") : text.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function financingFactor(rate: number, days: number): number {
  return 1 - (rate / 100) * days / 30;
}

function adjustedCost(values: Values): number | null {
  const real = numberFrom(values.custo_real);
  const freight = numberFrom(values.frete);
  const handling = numberFrom(values.carga_descarga);
  const adjustment = numberFrom(values.percentual_ajuste);
  if (real === null || freight === null || handling === null || adjustment === null) return null;
  return (real + freight + handling) * (1 + adjustment / 100);
}

function basePrice(rows: PriceRow[], channel: "tabela" | "produtor" | "revenda", rate: number): number | null {
  for (const row of [...rows].sort((a, b) => (a.prazo_dias ?? 0) - (b.prazo_dias ?? 0))) {
    const price = numberFrom(row[channel]?.preco);
    const days = Number(row.prazo_dias ?? 0);
    const factor = financingFactor(rate, days);
    if (price !== null && price > 0 && factor > 0) return price * factor;
  }
  return null;
}

function recalculatePricing(previous: ErpProduct["pricing_data"], key: string, value: string): ErpProduct["pricing_data"] {
  const next = { ...previous, [key]: value };
  if (!recalculatedFields.has(key)) return next;
  const oldCost = adjustedCost(previous);
  const newCost = adjustedCost(next);
  const oldRate = numberFrom(previous.financiamento_mensal);
  const newRate = numberFrom(next.financiamento_mensal);
  const desiredMargin = numberFrom(next.margem);
  if (oldCost === null || newCost === null || oldRate === null || newRate === null || desiredMargin === null) return next;

  const real = numberFrom(next.custo_real) ?? 0;
  const freight = numberFrom(next.frete) ?? 0;
  const handling = numberFrom(next.carga_descarga) ?? 0;
  next.custo_final = money(real + freight + handling, 3);
  next.custo_ajustado = money(newCost, 3);

  const previousRows = previous.faixas ?? [];
  const requestedDays = numberFrom(next.prazo_venda) ?? 56;
  const lastDay = Number.isFinite(requestedDays) && requestedDays > 0 ? Math.round(requestedDays) : 56;
  const rows = previousRows.length ? previousRows : key === "margem"
    ? [0, Math.round(lastDay / 2), lastDay].map((prazo_dias) => ({ prazo_dias } as PriceRow))
    : [];
  const oldBases = {
    tabela: basePrice(previousRows, "tabela", oldRate),
    produtor: basePrice(previousRows, "produtor", oldRate),
    revenda: basePrice(previousRows, "revenda", oldRate),
  };
  let tableBase = oldBases.tabela;
  if (key === "margem") {
    tableBase = newCost * (1 + desiredMargin / 100);
  } else if (tableBase !== null && oldCost > 0) {
    tableBase *= newCost / oldCost;
  } else if (newCost > 0 && desiredMargin > -100) {
    tableBase = newCost * (1 + desiredMargin / 100);
  }
  if (tableBase === null || tableBase < 0 || rows.some((row) => financingFactor(newRate, Number(row.prazo_dias ?? 0)) <= 0)) return next;

  if (newCost > 0) next.margem = money((tableBase / newCost - 1) * 100);
  next.faixas = rows.map((row) => {
    const days = Number(row.prazo_dias ?? 0);
    const factor = financingFactor(newRate, days);
    const updated: PriceRow = { ...row };
    for (const channel of ["tabela", "produtor", "revenda"] as const) {
      const oldBase = oldBases[channel];
      if (channel !== "tabela" && oldBase === null) continue;
      const channelBase = channel === "tabela" ? tableBase! : oldBases.tabela && oldBase
        ? tableBase! * oldBase / oldBases.tabela
        : oldBase! * (oldCost > 0 ? newCost / oldCost : 1);
      updated[channel] = { ...row[channel], preco: money(channelBase / factor) };
    }
    return updated;
  });
  return next;
}

function pricingError(values: ErpProduct["pricing_data"]): string | null {
  for (const key of recalculatedFields) {
    if (numberFrom(values[key]) === null) return "Informe números válidos nos campos de cálculo.";
  }
  const cost = adjustedCost(values);
  if (cost === null || cost < 0) return "O custo ajustado precisa ser válido e não negativo.";
  if ((numberFrom(values.margem) ?? 0) <= -100) return "A margem deve ser maior que -100%.";
  if ((values.faixas ?? []).some((row) => financingFactor(numberFrom(values.financiamento_mensal) ?? 0, Number(row.prazo_dias ?? 0)) <= 0)) {
    return "A taxa de financiamento é alta demais para um dos prazos.";
  }
  return null;
}

function pricingForEdit(values: ErpProduct["pricing_data"]): ErpProduct["pricing_data"] {
  const cost = adjustedCost(values);
  const rate = numberFrom(values.financiamento_mensal);
  const base = rate === null ? null : basePrice(values.faixas ?? [], "tabela", rate);
  return cost && cost > 0 && base !== null
    ? { ...values, margem: money((base / cost - 1) * 100) }
    : values;
}

function PricingForm({ initial, saving, onSave, onCancel }: {
  initial: ErpProduct;
  saving: boolean;
  onSave: (values: ErpProduct["pricing_data"]) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<ErpProduct["pricing_data"]>(() => pricingForEdit(initial.pricing_data ?? {}));
  const error = pricingError(values);
  return (
    <form onSubmit={(event) => { event.preventDefault(); if (!error) onSave(values); }} className="space-y-5">
      <p className="text-sm text-muted-foreground">Custo, ajuste, margem e financiamento recalculam os preços por prazo enquanto você edita.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {priceFields.map(([key, label]) => (
          <label key={key} className="space-y-1 text-sm font-medium">
            {label}
            <Input value={values[key] ?? ""} readOnly={derivedFields.has(key)}
              className={derivedFields.has(key) ? "bg-muted/40" : undefined}
              onChange={(event) => setValues((previous) => recalculatePricing(previous, key, event.target.value))} />
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="min-w-[600px] w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground"><tr>
            {["Prazo", "Tabela", "Produtor", "Revenda"].map((label) => <th key={label} className="px-3 py-2 font-medium">{label}</th>)}
          </tr></thead>
          <tbody>
            {values.faixas?.length ? values.faixas.map((row, index) => (
              <tr key={index} className="border-t">
                <td className="px-3 py-2">{row.prazo_dias ?? "—"} dias</td>
                <td className="px-3 py-2">{row.tabela?.preco ?? "—"}</td>
                <td className="px-3 py-2">{row.produtor?.preco ?? "—"}</td>
                <td className="px-3 py-2">{row.revenda?.preco ?? "—"}</td>
              </tr>
            )) : <tr><td colSpan={4} className="px-3 py-4 text-muted-foreground">Informe a margem para criar as faixas de preço.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving || Boolean(error)}>{saving ? "Salvando..." : "Salvar tabela de preços"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

export function ErpProductMaintenance() {
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState<Screen>("consulta");
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [page, setPage] = useState(0);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogView, setDialogView] = useState<ErpRecordView>("visualizar");
  const results = useQuery({ queryKey: ["erp-products", submitted, page], queryFn: () => listProducts(submitted, page) });
  const selected = results.data?.items.find((product) => product.code === selectedCode) ?? null;
  const save = useMutation({
    mutationFn: async ({ name, values }: { name: string; values: Values }) => {
      if (screen === "inclusao") {
        const { data, error } = await db.from("erp_products")
          .insert({ name, product_data: values })
          .select("code").single();
        if (error) throw error;
        return String(data.code);
      }
      if (!selectedCode) throw new Error("Selecione um produto para alterar.");
      const { error } = await db.from("erp_products")
        .update({ name, product_data: values }).eq("code", selectedCode).select("code").single();
      if (error) throw error;
      return selectedCode;
    },
    onSuccess: async (code) => {
      toast.success(screen === "inclusao" ? `Produto cadastrado com código ${code}.` : "Produto atualizado.");
      await queryClient.invalidateQueries({ queryKey: ["erp-products"] });
      setSubmitted(code);
      setPage(0);
      setSearch(code);
      setSelectedCode(null);
      setDialogOpen(false);
      setScreen("consulta");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar o produto."),
  });
  const savePricing = useMutation({
    mutationFn: async (values: ErpProduct["pricing_data"]) => {
      if (!selectedCode) throw new Error("Selecione um produto para alterar.");
      const validation = pricingError(values);
      if (validation) throw new Error(validation);
      const { error } = await db.from("erp_products")
        .update({ pricing_data: values }).eq("code", selectedCode).select("code").single();
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Tabela de preços atualizada.");
      await queryClient.invalidateQueries({ queryKey: ["erp-products"] });
      setDialogView("visualizar");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar a tabela de preços."),
  });
  const remove = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await db.from("erp_products").delete().eq("code", code).select("code").single();
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Produto excluído.");
      setSelectedCode(null);
      setDialogOpen(false);
      setSearch("");
      setSubmitted("");
      setPage(0);
      await queryClient.invalidateQueries({ queryKey: ["erp-products"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível excluir o produto."),
  });

  function choose(next: Screen) {
    setScreen(next);
    setSelectedCode(null);
    setDialogOpen(false);
    setSearch("");
    setSubmitted("");
    setPage(0);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Visualização de produtos">
          <Button variant={screen === "tabela" ? "outline" : "default"} size="sm" aria-pressed={screen !== "tabela"} onClick={() => choose("consulta")}>Produtos</Button>
          <Button variant={screen === "tabela" ? "default" : "outline"} size="sm" aria-pressed={screen === "tabela"} onClick={() => choose("tabela")}>Tabela de preços</Button>
        </div>
        <Button size="sm" onClick={() => choose("inclusao")}><Plus className="mr-2 h-4 w-4" /> Novo produto</Button>
      </div>
      {screen === "inclusao" && <h3 className="text-lg font-semibold">Novo produto</h3>}

      {screen === "inclusao" ? (
        <ProductForm saving={save.isPending} onSave={(name, values) => save.mutate({ name, values })} onCancel={() => setScreen("consulta")} />
      ) : (
        <>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); setSelectedCode(null); setDialogOpen(false); setPage(0); setSubmitted(search.trim()); }}>
            <label htmlFor="erp-product-search" className="sr-only">Código ou nome do produto</label>
            <Input id="erp-product-search" inputMode="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Digite o código ou nome do produto" className="sm:max-w-md" />
            <Button type="submit"><Search className="mr-2 h-4 w-4" /> Pesquisar</Button>
          </form>
          <div className="rounded-lg border bg-card">
            <p className="border-b px-4 py-2 text-xs text-muted-foreground">{submitted ? "Resultado da pesquisa" : "Produtos disponíveis"}{results.data && ` · ${results.data.total.toLocaleString("pt-BR")} resultado(s) · ${PAGE_SIZE} por página`}</p>
            {results.isPending ? <p className="p-4 text-sm">Carregando produtos...</p> : results.isError ? (
              <p role="alert" className="p-4 text-sm text-destructive">Erro ao consultar produtos: {results.error instanceof Error ? results.error.message : "tente novamente"}</p>
            ) : results.data?.items.length ? (
              <ul className="max-h-56 divide-y overflow-y-auto">
                {results.data.items.map((product) => (
                  <li key={product.code}>
                    <button type="button" onClick={() => { setSelectedCode(product.code); setDialogView("visualizar"); setDialogOpen(true); }} className={`flex w-full gap-3 px-4 py-2 text-left text-sm hover:bg-accent ${selectedCode === product.code ? "bg-primary/10" : ""}`}>
                      <span className="font-mono text-muted-foreground">{product.code}</span><span>{product.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="p-4 text-sm text-muted-foreground">Nenhum produto encontrado.</p>}
          </div>

          {results.data && results.data.total > PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Exibindo {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, results.data.total)} de {results.data.total.toLocaleString("pt-BR")}</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page === 0 || results.isFetching} onClick={() => { setSelectedCode(null); setPage(0); }}>Primeira</Button>
                <Button type="button" variant="outline" size="sm" disabled={page === 0 || results.isFetching} onClick={() => { setSelectedCode(null); setPage((current) => current - 1); }}>Anterior</Button>
                <form className="flex items-center gap-2" onSubmit={(event) => {
                  event.preventDefault();
                  const input = event.currentTarget.elements.namedItem("erp-product-page") as HTMLInputElement;
                  const requested = Number(input.value);
                  if (!Number.isInteger(requested)) return;
                  setSelectedCode(null);
                  setPage(Math.max(0, Math.min(requested - 1, Math.ceil(results.data.total / PAGE_SIZE) - 1)));
                }}>
                  <label htmlFor="erp-product-page">Página</label>
                  <Input key={page} id="erp-product-page" name="erp-product-page" type="number" min={1} max={Math.ceil(results.data.total / PAGE_SIZE)} defaultValue={page + 1} className="h-8 w-20" />
                  <span>de {Math.ceil(results.data.total / PAGE_SIZE)}</span>
                  <Button type="submit" variant="outline" size="sm" disabled={results.isFetching}>Ir</Button>
                </form>
                <Button type="button" variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= results.data.total || results.isFetching} onClick={() => { setSelectedCode(null); setPage((current) => current + 1); }}>Próxima</Button>
                <Button type="button" variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= results.data.total || results.isFetching} onClick={() => { setSelectedCode(null); setPage(Math.ceil(results.data.total / PAGE_SIZE) - 1); }}>Última</Button>
              </div>
            </div>
          )}
        </>
      )}
      <ErpRecordDialog
        open={dialogOpen && Boolean(selected)}
        title={selected ? `${selected.code} · ${selected.name}` : "Produto"}
        view={dialogView}
        onViewChange={setDialogView}
        onClose={() => { setDialogOpen(false); setSelectedCode(null); }}
        details={selected ? <ProductDetails product={selected} showPricing={screen === "tabela"} /> : null}
        editForm={selected ? (
          screen === "tabela" ? (
          <PricingForm key={selected.code} initial={selected} saving={savePricing.isPending}
            onSave={(values) => savePricing.mutate(values)} onCancel={() => setDialogView("visualizar")} />
        ) : (
          <ProductForm key={selected.code} initial={selected} saving={save.isPending}
            onSave={(name, values) => save.mutate({ name, values })} onCancel={() => setDialogView("visualizar")} />
        )
        ) : null}
        deleteLabel="Excluir produto"
        deleteDescription="Este produto será excluído definitivamente."
        onDelete={() => { if (selected) remove.mutate(selected.code); }}
        deleting={remove.isPending}
      />
    </div>
  );
}
