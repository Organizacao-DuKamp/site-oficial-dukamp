import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Values = Record<string, string>;
type OrderItem = { product_code: string; description: string; quantity: string; unit_price: string };
type PurchaseOrder = {
  code: string;
  supplier_code: string | null;
  supplier_name: string;
  details: Values;
  items: OrderItem[];
};
type SupplierOption = { code: string; name: string };
type ProductOption = { code: string; name: string };
type Mode = "menu" | "inclusao" | "alteracao" | "exclusao" | "consulta";

const fields: [string, string][] = [
  ["contato", "Contato"], ["fone", "Fone"], ["data_emissao", "Data Emissão"],
  ["previsao_faturamento", "Previsão Faturamento"],
  ["data_pagamento_antecipado", "Data Pagamento Antecipado"],
  ["condicao_pagamento", "Condição de Pagamento (prazos)"],
  ["desconto_1", "Desconto 1"], ["desconto_2", "Desconto 2"],
  ["despesa_1", "Despesa 1"], ["despesa_2", "Despesa 2"], ["despesa_3", "Despesa 3"],
  ["forma_compra", "Forma Compra"], ["pedido_fornecedor", "Pedido Fornecedor"],
  ["transportador", "Transportador"], ["pendencias", "Pendências"], ["ultimo", "Último"],
];

const db = supabase as any;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const emptyItem = (): OrderItem => ({ product_code: "", description: "", quantity: "1", unit_price: "0" });

function decimal(value: string): number {
  const normalized = value.trim().includes(",")
    ? value.trim().replace(/\./g, "").replace(",", ".")
    : value.trim();
  return Number(normalized);
}

function orderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => {
    const quantity = decimal(item.quantity);
    const price = decimal(item.unit_price);
    return sum + (Number.isFinite(quantity) && Number.isFinite(price) ? quantity * price : 0);
  }, 0);
}

async function listOrders(term: string): Promise<PurchaseOrder[]> {
  let query = db.from("erp_purchase_orders")
    .select("code,supplier_code,supplier_name,details,items")
    .order("code", { ascending: false }).limit(50);
  if (term) {
    const digits = term.replace(/\D/g, "");
    if (digits.length === term.length && digits.length <= 5) {
      query = query.eq("code", digits.padStart(5, "0"));
    } else {
      query = query.ilike("supplier_name", `%${term.replace(/[\\%_]/g, "\\$&")}%`);
    }
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PurchaseOrder[];
}

async function listSuppliers(): Promise<SupplierOption[]> {
  const { data, error } = await db.from("erp_suppliers")
    .select("code,name").order("name", { ascending: true }).limit(500);
  if (error) throw error;
  return (data ?? []) as SupplierOption[];
}

async function listProducts(): Promise<ProductOption[]> {
  const { data, error } = await db.from("erp_products")
    .select("code,name").order("name", { ascending: true }).limit(500);
  if (error) throw error;
  return (data ?? []) as ProductOption[];
}

function OrderDetails({ order }: { order: PurchaseOrder }) {
  const items = order.items ?? [];
  return (
    <section className="space-y-5">
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs text-muted-foreground">Pedido de compra · {order.code}</p>
        <h4 className="mt-1 font-semibold">{order.supplier_name}</h4>
        {order.supplier_code && <p className="text-sm text-muted-foreground">Fornecedor: {order.supplier_code}</p>}
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {fields.map(([key, label]) => (
          <div key={key} className="rounded-md border bg-card px-3 py-2">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="min-h-5 break-words text-sm font-medium">{order.details?.[key] || "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="rounded-lg border bg-card p-4">
        <h4 className="font-semibold">Itens do pedido ({items.length})</h4>
        {items.length ? (
          <ul className="mt-3 divide-y">
            {items.map((item, index) => (
              <li key={index} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                <span>{item.product_code && <span className="mr-2 font-mono text-muted-foreground">{item.product_code}</span>}{item.description}</span>
                <span>{item.quantity} × {money.format(decimal(item.unit_price) || 0)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-muted-foreground">Nenhum item cadastrado.</p>}
        <p className="mt-3 border-t pt-3 text-right font-semibold">Total dos itens: {money.format(orderTotal(items))}</p>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <h4 className="font-semibold">Observações</h4>
        <p className="mt-2 whitespace-pre-wrap text-sm">{order.details?.observacoes || "Nenhuma observação."}</p>
      </div>
    </section>
  );
}

function OrderForm({ initial, suppliers, products, saving, onSave, onCancel }: {
  initial?: PurchaseOrder;
  suppliers: SupplierOption[];
  products: ProductOption[];
  saving: boolean;
  onSave: (value: Omit<PurchaseOrder, "code">) => void;
  onCancel: () => void;
}) {
  const [supplierCode, setSupplierCode] = useState(initial?.supplier_code ?? "");
  const [supplierName, setSupplierName] = useState(initial?.supplier_name ?? "");
  const [details, setDetails] = useState<Values>(initial?.details ?? {});
  const [items, setItems] = useState<OrderItem[]>(initial?.items ?? []);

  function updateItem(index: number, patch: Partial<OrderItem>) {
    setItems((previous) => previous.map((item, current) => current === index ? { ...item, ...patch } : item));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedItems = items.filter((item) => item.description.trim() || item.product_code.trim());
    if (cleanedItems.some((item) => !item.description.trim() || !Number.isFinite(decimal(item.quantity)) || decimal(item.quantity) <= 0 || !Number.isFinite(decimal(item.unit_price)) || decimal(item.unit_price) < 0)) {
      toast.error("Confira a descrição, quantidade e preço dos itens.");
      return;
    }
    onSave({ supplier_code: supplierCode.trim() || null, supplier_name: supplierName.trim(), details, items: cleanedItems });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="space-y-1 text-sm font-medium">
          Pedido
          <Input readOnly className="bg-muted/40" value={initial?.code ?? "Gerado automaticamente (5 dígitos)"} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Código do fornecedor
          <Input list="erp-order-suppliers" value={supplierCode} maxLength={5} onChange={(event) => {
            const code = event.target.value;
            setSupplierCode(code);
            const match = suppliers.find((supplier) => supplier.code === code || String(Number(supplier.code)) === code);
            if (match) setSupplierName(match.name);
          }} placeholder="Opcional se ainda não foi migrado" />
          <datalist id="erp-order-suppliers">{suppliers.map((supplier) => <option key={supplier.code} value={supplier.code}>{supplier.name}</option>)}</datalist>
        </label>
        <label className="space-y-1 text-sm font-medium">
          Fornecedor *
          <Input required maxLength={200} value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="Nome do fornecedor" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {fields.map(([key, label]) => (
          <label key={key} className="space-y-1 text-sm font-medium">
            {label}
            <Input maxLength={500} value={details[key] ?? ""} onChange={(event) => setDetails((previous) => ({ ...previous, [key]: event.target.value }))} />
          </label>
        ))}
      </div>
      <label className="block space-y-1 text-sm font-medium">
        Observações
        <textarea className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" maxLength={5000} value={details.observacoes ?? ""} onChange={(event) => setDetails((previous) => ({ ...previous, observacoes: event.target.value }))} />
      </label>
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-semibold">Itens do pedido</h4>
            <p className="text-xs text-muted-foreground">Selecione um produto do ERP pelo código ou informe uma descrição.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setItems((previous) => [...previous, emptyItem()])}><Plus className="mr-2 h-4 w-4" /> Adicionar item</Button>
        </div>
        <datalist id="erp-order-products">{products.map((product) => <option key={product.code} value={product.code}>{product.name}</option>)}</datalist>
        {items.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-md border p-3 sm:grid-cols-2 xl:grid-cols-[130px_1fr_110px_130px_auto]">
            <Input aria-label="Código do produto" list="erp-order-products" placeholder="Código" value={item.product_code} onChange={(event) => {
              const code = event.target.value;
              const match = products.find((product) => product.code === code);
              updateItem(index, { product_code: code, ...(match ? { description: match.name } : {}) });
            }} />
            <Input aria-label="Descrição do item" placeholder="Descrição do item" value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} />
            <Input aria-label="Quantidade" inputMode="decimal" placeholder="Qtd." value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} />
            <Input aria-label="Preço unitário" inputMode="decimal" placeholder="Preço unitário" value={item.unit_price} onChange={(event) => updateItem(index, { unit_price: event.target.value })} />
            <Button type="button" variant="ghost" size="icon" aria-label="Remover item" onClick={() => setItems((previous) => previous.filter((_, current) => current !== index))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <p className="text-right text-sm font-semibold">Total dos itens: {money.format(orderTotal(items))}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Salvando..." : initial ? "Salvar alterações" : "Cadastrar pedido"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

export function ErpPurchaseOrderMaintenance({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("menu");
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const results = useQuery({ queryKey: ["erp-purchase-orders", submitted], queryFn: () => listOrders(submitted) });
  const supplierOptions = useQuery({ queryKey: ["erp-suppliers-options"], queryFn: listSuppliers, enabled: mode === "inclusao" || mode === "alteracao" });
  const productOptions = useQuery({ queryKey: ["erp-products-options"], queryFn: listProducts, enabled: mode === "inclusao" || mode === "alteracao" });
  const selected = results.data?.find((order) => order.code === selectedCode) ?? null;

  const save = useMutation({
    mutationFn: async (order: Omit<PurchaseOrder, "code">) => {
      if (mode === "inclusao") {
        const { data, error } = await db.from("erp_purchase_orders").insert(order).select("code").single();
        if (error) throw error;
        return String(data.code);
      }
      if (!selectedCode) throw new Error("Selecione um pedido para alterar.");
      const { error } = await db.from("erp_purchase_orders").update(order).eq("code", selectedCode).select("code").single();
      if (error) throw error;
      return selectedCode;
    },
    onSuccess: async (code) => {
      toast.success(mode === "inclusao" ? "Pedido cadastrado com código " + code + "." : "Pedido atualizado.");
      await queryClient.invalidateQueries({ queryKey: ["erp-purchase-orders"] });
      setSearch(code);
      setSubmitted(code);
      setSelectedCode(code);
      setMode("consulta");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar o pedido."),
  });
  const remove = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await db.from("erp_purchase_orders").delete().eq("code", code).select("code").single();
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Pedido excluído.");
      setSelectedCode(null);
      setSearch("");
      setSubmitted("");
      await queryClient.invalidateQueries({ queryKey: ["erp-purchase-orders"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível excluir o pedido."),
  });

  function choose(next: Mode) {
    setMode(next);
    setSearch("");
    setSubmitted("");
    setSelectedCode(null);
  }

  const titles: Record<Mode, string> = {
    menu: "Pedidos de compra", inclusao: "Inclusão de pedido",
    alteracao: "Alteração de pedido", exclusao: "Exclusão de pedido",
    consulta: "Consulta de pedido",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">{titles[mode]}</h3>
          <p className="text-sm text-muted-foreground">Manutenção de pedidos de compra do ERP.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mode === "menu" ? onBack() : choose("menu")}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
      </div>

      {mode === "menu" && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {([
            { mode: "inclusao", label: "Inclusão", icon: Plus },
            { mode: "alteracao", label: "Alteração", icon: Pencil },
            { mode: "exclusao", label: "Exclusão", icon: Trash2 },
            { mode: "consulta", label: "Consulta", icon: Search },
          ] as const).map((option) => (
            <Button key={option.mode} variant="outline" className="justify-start" onClick={() => choose(option.mode)}><option.icon className="mr-2 h-4 w-4" /> {option.label}</Button>
          ))}
        </div>
      )}

      {mode === "inclusao" && (
        <OrderForm saving={save.isPending} suppliers={supplierOptions.data ?? []} products={productOptions.data ?? []}
          onSave={(order) => save.mutate(order)} onCancel={() => choose("menu")} />
      )}

      {mode !== "inclusao" && (
        <>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); setSelectedCode(null); setSubmitted(search.trim()); }}>
            <label htmlFor="erp-purchase-order-search" className="sr-only">Número do pedido ou fornecedor</label>
            <Input id="erp-purchase-order-search" inputMode="search" className="sm:max-w-md" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Número do pedido ou nome do fornecedor" />
            <Button type="submit"><Search className="mr-2 h-4 w-4" /> Pesquisar</Button>
          </form>
          <div className="rounded-lg border bg-card">
            <p className="border-b px-4 py-2 text-xs text-muted-foreground">{submitted ? "Resultado da pesquisa" : "Pedidos cadastrados (até 50)"}</p>
            {results.isPending ? <p className="p-4 text-sm">Carregando pedidos...</p> : results.isError ? (
              <p role="alert" className="p-4 text-sm text-destructive">Erro ao consultar pedidos: {results.error instanceof Error ? results.error.message : "tente novamente"}</p>
            ) : results.data?.length ? (
              <ul className="max-h-64 divide-y overflow-y-auto">
                {results.data.map((order) => (
                  <li key={order.code}>
                    <button type="button" onClick={() => { setSelectedCode(order.code); if (mode === "menu") setMode("consulta"); }}
                      className={"flex w-full flex-wrap gap-3 px-4 py-2 text-left text-sm hover:bg-accent " + (selectedCode === order.code ? "bg-primary/10" : "")}>
                      <span className="font-mono text-muted-foreground">{order.code}</span><span>{order.supplier_name}</span>
                      <span className="ml-auto text-muted-foreground">{order.details?.data_emissao || "Sem data"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="p-4 text-sm text-muted-foreground">Nenhum pedido encontrado. Use Inclusão para cadastrar o primeiro.</p>}
          </div>
          {selected && mode === "alteracao" && (
            <OrderForm key={selected.code} initial={selected} saving={save.isPending}
              suppliers={supplierOptions.data ?? []} products={productOptions.data ?? []}
              onSave={(order) => save.mutate(order)} onCancel={() => setSelectedCode(null)} />
          )}
          {selected && (mode === "consulta" || mode === "exclusao") && (
            <>
              <OrderDetails order={selected} />
              {mode === "exclusao" && (
                <Button variant="destructive" disabled={remove.isPending} onClick={() => {
                  if (window.confirm("Excluir definitivamente o pedido " + selected.code + " de " + selected.supplier_name + "?")) remove.mutate(selected.code);
                }}><Trash2 className="mr-2 h-4 w-4" /> {remove.isPending ? "Excluindo..." : "Excluir pedido"}</Button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
