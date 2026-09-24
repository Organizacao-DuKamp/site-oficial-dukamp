import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Values = Record<string, string>;
type ErpProduct = {
  code: string;
  name: string;
  product_data: Values;
  pricing_data: Values;
};
type Action = "tabela" | "alteracao" | "inclusao" | "exclusao" | "consulta";
type Screen = "escolha" | "produto" | Action;

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

async function listProducts(term: string): Promise<ErpProduct[]> {
  let query = db.from("erp_products")
    .select("code,name,product_data,pricing_data")
    .order("code", { ascending: true })
    .limit(50);
  if (term) {
    const code = term.replace(/\D/g, "");
    if (code && code.length === term.length && code.length <= 6) {
      query = query.eq("code", code.padStart(6, "0"));
    } else {
      // Escape LIKE metacharacters so a product name is searched literally.
      query = query.ilike("name", `%${term.replace(/[\\%_]/g, "\\$&")}%`);
    }
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ErpProduct[];
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
              <tbody><tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">Nenhuma faixa de preço cadastrada.</td></tr></tbody>
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

export function ErpProductMaintenance({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState<Screen>("escolha");
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const results = useQuery({ queryKey: ["erp-products", submitted], queryFn: () => listProducts(submitted) });
  const selected = results.data?.find((product) => product.code === selectedCode) ?? null;
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
      setSearch(code);
      setSelectedCode(code);
      setScreen("consulta");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar o produto."),
  });
  const remove = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await db.from("erp_products").delete().eq("code", code).select("code").single();
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Produto excluído.");
      setSelectedCode(null);
      setSearch("");
      setSubmitted("");
      await queryClient.invalidateQueries({ queryKey: ["erp-products"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível excluir o produto."),
  });

  function choose(next: Screen) {
    setScreen(next);
    setSelectedCode(null);
    setSearch("");
    setSubmitted("");
  }

  if (screen === "escolha") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Escolha a área do programa Tabela Preço/Produto.</p>
        <Button className="w-full justify-start" variant="outline" onClick={() => choose("tabela")}>Tabela de preço</Button>
        <Button className="w-full justify-start" variant="outline" onClick={() => choose("produto")}>Produto</Button>
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
      </div>
    );
  }

  if (screen === "produto") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Manutenção de produtos</p>
        {(["alteracao", "inclusao", "exclusao", "consulta"] as const).map((option) => (
          <Button key={option} className="w-full justify-start" variant="outline" onClick={() => choose(option)}>
            {option === "alteracao" ? <Pencil className="mr-2 h-4 w-4" /> : option === "inclusao" ? <Plus className="mr-2 h-4 w-4" /> : option === "exclusao" ? <Trash2 className="mr-2 h-4 w-4" /> : <Search className="mr-2 h-4 w-4" />}
            {{ alteracao: "Alteração", inclusao: "Inclusão", exclusao: "Exclusão", consulta: "Consulta" }[option]}
          </Button>
        ))}
        <Button variant="ghost" onClick={() => choose("escolha")}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">
          {{ tabela: "Tabela de preço", alteracao: "Alteração de produto", inclusao: "Inclusão de produto", exclusao: "Exclusão de produto", consulta: "Consulta de produto" }[screen]}
        </h3>
        <Button variant="outline" size="sm" onClick={() => choose(screen === "tabela" ? "escolha" : "produto")}>Voltar</Button>
      </div>

      {screen === "inclusao" ? (
        <ProductForm saving={save.isPending} onSave={(name, values) => save.mutate({ name, values })} onCancel={() => choose("produto")} />
      ) : (
        <>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); setSelectedCode(null); setSubmitted(search.trim()); }}>
            <label htmlFor="erp-product-search" className="sr-only">Código ou nome do produto</label>
            <Input id="erp-product-search" inputMode="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Digite o código ou nome do produto" className="sm:max-w-md" />
            <Button type="submit"><Search className="mr-2 h-4 w-4" /> Pesquisar</Button>
          </form>
          <div className="rounded-lg border bg-card">
            <p className="border-b px-4 py-2 text-xs text-muted-foreground">{submitted ? "Resultado da pesquisa" : "Produtos disponíveis (até 50)"}</p>
            {results.isPending ? <p className="p-4 text-sm">Carregando produtos...</p> : results.isError ? (
              <p role="alert" className="p-4 text-sm text-destructive">Erro ao consultar produtos: {results.error instanceof Error ? results.error.message : "tente novamente"}</p>
            ) : results.data?.length ? (
              <ul className="max-h-56 divide-y overflow-y-auto">
                {results.data.map((product) => (
                  <li key={product.code}>
                    <button type="button" onClick={() => setSelectedCode(product.code)} className={`flex w-full gap-3 px-4 py-2 text-left text-sm hover:bg-accent ${selectedCode === product.code ? "bg-primary/10" : ""}`}>
                      <span className="font-mono text-muted-foreground">{product.code}</span><span>{product.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="p-4 text-sm text-muted-foreground">Nenhum produto encontrado.</p>}
          </div>

          {selected && screen === "alteracao" && (
            <ProductForm key={selected.code} initial={selected} saving={save.isPending} onSave={(name, values) => save.mutate({ name, values })} onCancel={() => setSelectedCode(null)} />
          )}
          {selected && (screen === "tabela" || screen === "consulta" || screen === "exclusao") && (
            <>
              <ProductDetails product={selected} showPricing={screen === "tabela"} />
              {screen === "exclusao" && (
                <Button variant="destructive" disabled={remove.isPending} onClick={() => {
                  if (window.confirm(`Excluir definitivamente o produto ${selected.code} — ${selected.name}?`)) remove.mutate(selected.code);
                }}>
                  <Trash2 className="mr-2 h-4 w-4" />{remove.isPending ? "Excluindo..." : "Excluir produto"}
                </Button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
