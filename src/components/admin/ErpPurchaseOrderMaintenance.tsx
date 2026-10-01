import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ErpRecordDialog, type ErpRecordView } from "@/components/admin/ErpRecordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Values = Record<string, string>;
type OrderItem = {
  item_number?: number;
  product_code: string;
  description: string;
  quantity: string;
  unit_price: string;
  received_quantity?: string;
  last_receipt_date?: string;
  last_purchase_price?: string;
  ipi_percent?: string;
  discount_1?: string;
  discount_2?: string;
  discount_3?: string;
  discount_4?: string;
  discount_5?: string;
};
type PurchaseOrder = {
  code: string;
  supplier_code: string | null;
  supplier_name: string;
  details: Values;
  items: OrderItem[];
};
type Option = { code: string; name: string };
type OrderPage = { items: PurchaseOrder[]; total: number };
type Mode = "inclusao" | "consulta";
type Field = { key: string; label: string; type?: "date" | "number"; max?: number };
// The generated Database type has not yet included the ERP purchase-order tables.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const PAGE_SIZE = 50;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const emptyItem = (): OrderItem => ({
  product_code: "",
  description: "",
  quantity: "1",
  unit_price: "0",
  received_quantity: "0",
  ipi_percent: "0",
});

const basics: Field[] = [
  { key: "contato", label: "Contato", max: 15 },
  { key: "fone", label: "Fone" },
  { key: "data_emissao", label: "Data de emissão", type: "date" },
  { key: "previsao_faturamento", label: "Previsão de faturamento", type: "date" },
  { key: "data_pagamento_antecipado", label: "Pagamento antecipado", type: "date" },
];
const terms: Field[] = Array.from({ length: 9 }, (_, index) => ({
  key: `prazo_pagamento_${index + 1}`,
  label: `Prazo ${index + 1} (dias)`,
  type: "number",
}));
const charges: Field[] = [
  { key: "desconto_valor", label: "Desconto em R$", type: "number" },
  ...Array.from({ length: 4 }, (_, index) => ({
    key: `desconto_percentual_${index + 1}`,
    label: `Desconto ${index + 1} (%)`,
    type: "number" as const,
  })),
  { key: "despesa_descricao", label: "Descrição da despesa", max: 20 },
  { key: "despesa_valor", label: "Despesa em R$", type: "number" },
  { key: "despesa_percentual_1", label: "Despesa 1 (%)", type: "number" },
  { key: "despesa_percentual_2", label: "Despesa 2 (%)", type: "number" },
];
const other: Field[] = [
  { key: "forma_compra", label: "Forma de compra", max: 25 },
  { key: "pedido_fornecedor", label: "Pedido no fornecedor", max: 15 },
  { key: "transportador", label: "Transportador / frete", max: 55 },
  { key: "pendencias", label: "Pendências (S/N)", max: 1 },
  { key: "grupo_compra", label: "Grupo de compra", type: "number" },
  { key: "prazo_fixo", label: "Prazo fixo (S/N)", max: 1 },
];
const sections = [
  { title: "Dados do pedido", fields: basics },
  { title: "Condições de pagamento", fields: terms },
  { title: "Descontos e despesas", fields: charges },
  { title: "Complementos", fields: other },
];

function decimal(value: string | undefined): number {
  const raw = (value ?? "").trim();
  return Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
}
function subtotal(items: OrderItem[]): number {
  return items.reduce(
    (sum, item) => sum + (decimal(item.quantity) || 0) * (decimal(item.unit_price) || 0),
    0,
  );
}
function status(order: PurchaseOrder): string {
  const items = order.items ?? [];
  if (!items.length) return "Sem itens";
  const received = items.filter(
    (item) => decimal(item.received_quantity) >= decimal(item.quantity),
  );
  return received.length === items.length ? "Recebido" : received.length ? "Parcial" : "Pendente";
}
function dateBR(value: string | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}
async function listOrders(term: string, page: number): Promise<OrderPage> {
  let query = db
    .from("erp_purchase_orders")
    .select("code,supplier_code,supplier_name,details,items", { count: "exact" })
    .order("supplier_name", { ascending: true })
    .order("code", { ascending: true });
  if (term) {
    const digits = term.replace(/\D/g, "");
    query =
      digits.length === term.length && digits.length <= 5
        ? query.eq("code", digits.padStart(5, "0"))
        : query.ilike("supplier_name", `%${term.replace(/[\\%_]/g, "\\$&")}%`);
  }
  const { data, count, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (error) throw error;
  return { items: (data ?? []) as PurchaseOrder[], total: count ?? 0 };
}
async function listOptions(table: "erp_suppliers" | "erp_products"): Promise<Option[]> {
  const { data, error } = await db.from(table).select("code,name").order("name").limit(500);
  if (error) throw error;
  return (data ?? []) as Option[];
}
async function lookup(
  table: "erp_suppliers" | "erp_products",
  code: string,
  width: number,
): Promise<Option | null> {
  if (!/^\d+$/.test(code.trim())) return null;
  const { data, error } = await db
    .from(table)
    .select("code,name")
    .eq("code", code.trim().padStart(width, "0"))
    .maybeSingle();
  if (error) throw error;
  return data as Option | null;
}
function displayField(value: string | undefined, field: Field): string {
  if (!value) return "—";
  if (field.type === "date") return dateBR(value);
  return value;
}

function OrderDetails({ order }: { order: PurchaseOrder }) {
  const items = order.items ?? [];
  const details = order.details ?? {};
  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs text-muted-foreground">Pedido de compra · {order.code}</p>
        <h4 className="mt-1 font-semibold">{order.supplier_name}</h4>
        <p className="text-sm text-muted-foreground">
          Fornecedor {order.supplier_code || "—"} · {status(order)}
        </p>
      </div>
      {sections.map((section) => (
        <section key={section.title} className="space-y-2">
          <h4 className="font-semibold">{section.title}</h4>
          <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {section.fields.map((field) => (
              <div key={field.key} className="rounded-md border bg-card px-3 py-2">
                <dt className="text-xs text-muted-foreground">{field.label}</dt>
                <dd className="min-h-5 break-words text-sm font-medium">
                  {displayField(details[field.key], field)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <section className="space-y-2">
        <h4 className="font-semibold">Itens ({items.length})</h4>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[830px] text-left text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="p-2">Item</th>
                <th className="p-2">Produto</th>
                <th className="p-2 text-right">Pedida</th>
                <th className="p-2 text-right">Recebida</th>
                <th className="p-2 text-right">Preço unit.</th>
                <th className="p-2 text-right">IPI %</th>
                <th className="p-2">Última entrada</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-t">
                  <td className="p-2">{item.item_number ?? index + 1}</td>
                  <td className="p-2">
                    <span className="font-mono text-xs">{item.product_code}</span>{" "}
                    {item.description}
                  </td>
                  <td className="p-2 text-right">{item.quantity}</td>
                  <td className="p-2 text-right">{item.received_quantity ?? "0"}</td>
                  <td className="p-2 text-right">{item.unit_price}</td>
                  <td className="p-2 text-right">{item.ipi_percent ?? "0"}</td>
                  <td className="p-2">{dateBR(item.last_receipt_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && (
            <p className="p-3 text-sm text-muted-foreground">Nenhum item cadastrado.</p>
          )}
        </div>
        <p className="text-right text-sm">
          Subtotal bruto dos itens: <strong>{money.format(subtotal(items))}</strong>
        </p>
      </section>
      <section className="rounded-lg border bg-card p-4">
        <h4 className="font-semibold">Observações</h4>
        <p className="mt-2 whitespace-pre-wrap text-sm">
          {details.observacoes || "Nenhuma observação."}
        </p>
      </section>
    </div>
  );
}

function OrderForm({
  initial,
  suppliers,
  products,
  saving,
  onSave,
  onCancel,
}: {
  initial?: PurchaseOrder;
  suppliers: Option[];
  products: Option[];
  saving: boolean;
  onSave: (value: Omit<PurchaseOrder, "code">) => void;
  onCancel: () => void;
}) {
  const [supplierCode, setSupplierCode] = useState(initial?.supplier_code ?? "");
  const [supplierName, setSupplierName] = useState(initial?.supplier_name ?? "");
  const [details, setDetails] = useState<Values>(
    initial?.details ?? { data_emissao: new Date().toISOString().slice(0, 10), pendencias: "N" },
  );
  const [items, setItems] = useState<OrderItem[]>(initial?.items ?? []);
  const updateDetail = (key: string, value: string) =>
    setDetails((old) => ({ ...old, [key]: value }));
  const updateItem = (index: number, patch: Partial<OrderItem>) =>
    setItems((old) =>
      old.map((item, current) => (current === index ? { ...item, ...patch } : item)),
    );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supplierCode.trim() || !supplierName.trim())
      return toast.error("Informe um fornecedor cadastrado.");
    if (
      details.data_emissao &&
      details.previsao_faturamento &&
      details.previsao_faturamento < details.data_emissao
    )
      return toast.error("A previsão não pode anteceder a emissão.");
    if (
      items.some(
        (item) =>
          (!item.product_code.trim() && !item.description.trim()) ||
          !Number.isFinite(decimal(item.quantity)) ||
          decimal(item.quantity) <= 0 ||
          !Number.isFinite(decimal(item.unit_price)) ||
          decimal(item.unit_price) < 0 ||
          decimal(item.quantity) < decimal(item.received_quantity),
      )
    )
      return toast.error(
        "Confira os itens. A quantidade pedida não pode ser menor que a recebida.",
      );
    if (
      initial &&
      items.some((item) => {
        const original = initial.items.find((old) => old.item_number === item.item_number);
        return original && decimal(item.quantity) < decimal(original.received_quantity);
      })
    )
      return toast.error(
        "Um item já recebido não pode ter a quantidade reduzida abaixo do recebido.",
      );
    onSave({
      supplier_code: supplierCode.trim().padStart(5, "0"),
      supplier_name: supplierName.trim(),
      details,
      items: items.map((item, index) => ({ ...item, item_number: item.item_number ?? index + 1 })),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="space-y-1 text-sm font-medium">
          Pedido
          <Input readOnly value={initial?.code ?? "Gerado ao salvar"} className="bg-muted/40" />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Código do fornecedor *
          <Input
            list="erp-order-suppliers"
            inputMode="numeric"
            maxLength={5}
            value={supplierCode}
            onChange={(event) => {
              const code = event.target.value;
              setSupplierCode(code);
              const found = suppliers.find((item) => item.code === code.padStart(5, "0"));
              if (found) setSupplierName(found.name);
            }}
            onBlur={async () => {
              try {
                const found = await lookup("erp_suppliers", supplierCode, 5);
                if (found) setSupplierName(found.name);
              } catch {
                toast.error("Falha ao consultar fornecedor.");
              }
            }}
          />
          <datalist id="erp-order-suppliers">
            {suppliers.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </datalist>
        </label>
        <label className="space-y-1 text-sm font-medium">
          Fornecedor *
          <Input
            required
            value={supplierName}
            onChange={(event) => setSupplierName(event.target.value)}
          />
        </label>
      </div>
      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h4 className="font-semibold">{section.title}</h4>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.fields.map((field) => (
              <label key={field.key} className="space-y-1 text-sm font-medium">
                {field.label}
                <Input
                  type={field.type ?? "text"}
                  inputMode={field.type === "number" ? "decimal" : undefined}
                  min={field.type === "number" ? "0" : undefined}
                  step={field.type === "number" ? "any" : undefined}
                  maxLength={field.max}
                  value={details[field.key] ?? ""}
                  onChange={(event) => updateDetail(field.key, event.target.value)}
                />
              </label>
            ))}
          </div>
        </section>
      ))}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="font-semibold">Itens do pedido</h4>
            <p className="text-xs text-muted-foreground">
              Código, quantidade, preço, IPI e descontos de cada produto.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((old) => [...old, emptyItem()])}
          >
            <Plus className="mr-2 h-4 w-4" /> Adicionar item
          </Button>
        </div>
        <datalist id="erp-order-products">
          {products.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </datalist>
        {items.map((item, index) => (
          <div key={index} className="space-y-3 rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between">
              <strong className="text-sm">Item {item.item_number ?? index + 1}</strong>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={decimal(item.received_quantity) > 0}
                onClick={() => setItems((old) => old.filter((_, current) => current !== index))}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Remover
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <label className="text-xs">
                Código do produto
                <Input
                  list="erp-order-products"
                  value={item.product_code}
                  onChange={(event) => {
                    const code = event.target.value;
                    const found = products.find((option) => option.code === code.padStart(6, "0"));
                    updateItem(index, {
                      product_code: code,
                      ...(found ? { description: found.name } : {}),
                    });
                  }}
                  onBlur={async () => {
                    try {
                      const found = await lookup("erp_products", item.product_code, 6);
                      if (found)
                        updateItem(index, { product_code: found.code, description: found.name });
                    } catch {
                      toast.error("Falha ao consultar produto.");
                    }
                  }}
                />
              </label>
              <label className="text-xs xl:col-span-2">
                Descrição
                <Input
                  value={item.description}
                  onChange={(event) => updateItem(index, { description: event.target.value })}
                />
              </label>
              <label className="text-xs">
                Quantidade pedida
                <Input
                  inputMode="decimal"
                  value={item.quantity}
                  onChange={(event) => updateItem(index, { quantity: event.target.value })}
                />
              </label>
              <label className="text-xs">
                Preço unitário
                <Input
                  inputMode="decimal"
                  value={item.unit_price}
                  onChange={(event) => updateItem(index, { unit_price: event.target.value })}
                />
              </label>
              <label className="text-xs">
                IPI (%)
                <Input
                  inputMode="decimal"
                  value={item.ipi_percent ?? ""}
                  onChange={(event) => updateItem(index, { ipi_percent: event.target.value })}
                />
              </label>
              <label className="text-xs">
                Quantidade recebida
                <Input readOnly value={item.received_quantity ?? "0"} className="bg-muted/40" />
              </label>
              <label className="text-xs">
                Última entrada
                <Input readOnly value={dateBR(item.last_receipt_date)} className="bg-muted/40" />
              </label>
              {Array.from({ length: 5 }, (_, discount) => (
                <label key={discount} className="text-xs">
                  Desconto {discount + 1} (%)
                  <Input
                    inputMode="decimal"
                    value={item[`discount_${discount + 1}` as keyof OrderItem] ?? ""}
                    onChange={(event) =>
                      updateItem(index, { [`discount_${discount + 1}`]: event.target.value })
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        <p className="text-right text-sm">
          Subtotal bruto dos itens: <strong>{money.format(subtotal(items))}</strong>
        </p>
      </section>
      <label className="block space-y-1 text-sm font-medium">
        Observações
        <textarea
          className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          maxLength={5000}
          value={details.observacoes ?? ""}
          onChange={(event) => updateDetail("observacoes", event.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : initial ? "Salvar alterações" : "Cadastrar pedido"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function ErpPurchaseOrderMaintenance() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("consulta");
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [page, setPage] = useState(0);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogView, setDialogView] = useState<ErpRecordView>("visualizar");
  const results = useQuery({
    queryKey: ["erp-purchase-orders", submitted, page],
    queryFn: () => listOrders(submitted, page),
  });
  const supplierOptions = useQuery({
    queryKey: ["erp-suppliers-options"],
    queryFn: () => listOptions("erp_suppliers"),
    enabled: mode === "inclusao" || (dialogOpen && dialogView === "editar"),
  });
  const productOptions = useQuery({
    queryKey: ["erp-products-options"],
    queryFn: () => listOptions("erp_products"),
    enabled: mode === "inclusao" || (dialogOpen && dialogView === "editar"),
  });
  const selected = results.data?.items.find((order) => order.code === selectedCode) ?? null;

  const save = useMutation({
    mutationFn: async (order: Omit<PurchaseOrder, "code">) => {
      const supplier = await lookup("erp_suppliers", order.supplier_code ?? "", 5);
      if (!supplier) throw new Error("Fornecedor não encontrado no cadastro do ERP.");
      if (mode === "inclusao") {
        const { data, error } = await db
          .from("erp_purchase_orders")
          .insert(order)
          .select("code")
          .single();
        if (error) throw error;
        return String(data.code);
      }
      if (!selectedCode) throw new Error("Selecione um pedido para alterar.");
      const { error } = await db
        .from("erp_purchase_orders")
        .update(order)
        .eq("code", selectedCode)
        .select("code")
        .single();
      if (error) throw error;
      return selectedCode;
    },
    onSuccess: async (code) => {
      toast.success(mode === "inclusao" ? `Pedido ${code} cadastrado.` : "Pedido atualizado.");
      await queryClient.invalidateQueries({ queryKey: ["erp-purchase-orders"] });
      setSearch(code);
      setSubmitted(code);
      setPage(0);
      setSelectedCode(null);
      setDialogOpen(false);
      setMode("consulta");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o pedido."),
  });
  const remove = useMutation({
    mutationFn: async (code: string) => {
      if (selected?.items?.some((item) => decimal(item.received_quantity) > 0))
        throw new Error("Pedido com itens recebidos não pode ser excluído.");
      const { error } = await db
        .from("erp_purchase_orders")
        .delete()
        .eq("code", code)
        .select("code")
        .single();
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Pedido excluído.");
      setSelectedCode(null);
      setDialogOpen(false);
      setSearch("");
      setSubmitted("");
      setPage(0);
      await queryClient.invalidateQueries({ queryKey: ["erp-purchase-orders"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o pedido."),
  });
  function choose(next: Mode) {
    setMode(next);
    setSearch("");
    setSubmitted("");
    setPage(0);
    setSelectedCode(null);
    setDialogOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {mode === "inclusao" ? (
          <>
            <h3 className="text-lg font-semibold">Novo pedido de compra</h3>
            <Button variant="ghost" size="sm" onClick={() => choose("consulta")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar aos pedidos
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => choose("inclusao")}>
            <Plus className="mr-2 h-4 w-4" /> Novo pedido
          </Button>
        )}
      </div>
      {mode === "inclusao" && (
        <OrderForm
          saving={save.isPending}
          suppliers={supplierOptions.data ?? []}
          products={productOptions.data ?? []}
          onSave={(order) => save.mutate(order)}
          onCancel={() => choose("consulta")}
        />
      )}
      {mode === "consulta" && (
        <>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              setSelectedCode(null);
              setDialogOpen(false);
              setPage(0);
              setSubmitted(search.trim());
            }}
          >
            <label htmlFor="erp-purchase-order-search" className="sr-only">
              Número do pedido ou fornecedor
            </label>
            <Input
              id="erp-purchase-order-search"
              inputMode="search"
              className="sm:max-w-md"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Número do pedido ou nome do fornecedor"
            />
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" /> Pesquisar
            </Button>
          </form>
          <div className="rounded-lg border bg-card">
            <p className="border-b px-4 py-2 text-xs text-muted-foreground">
              {submitted ? "Resultado da pesquisa" : "Pedidos cadastrados"}
              {results.data && ` · ${results.data.total.toLocaleString("pt-BR")} resultado(s)`}
            </p>
            {results.isPending ? (
              <p className="p-4 text-sm">Carregando pedidos...</p>
            ) : results.isError ? (
              <p role="alert" className="p-4 text-sm text-destructive">
                Erro ao consultar pedidos:{" "}
                {results.error instanceof Error ? results.error.message : "tente novamente"}
              </p>
            ) : results.data?.items.length ? (
              <div className="max-h-[32rem] overflow-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="sticky top-0 bg-muted/90">
                    <tr>
                      <th className="p-2">Fornecedor</th>
                      <th className="p-2">Pedido</th>
                      <th className="p-2">Emissão</th>
                      <th className="p-2">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.data.items.map((order) => (
                      <tr key={order.code} className="border-t hover:bg-accent">
                        <td colSpan={4} className="p-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCode(order.code);
                              setDialogView("visualizar");
                              setDialogOpen(true);
                            }}
                            className="grid w-full grid-cols-[minmax(180px,1fr)_90px_100px_90px] gap-2 p-2 text-left"
                          >
                            <span>{order.supplier_name}</span>
                            <span className="font-mono">{order.code}</span>
                            <span>{dateBR(order.details?.data_emissao)}</span>
                            <span>{status(order)}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
            )}
          </div>
          {results.data && results.data.total > PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                Exibindo {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, results.data.total)} de{" "}
                {results.data.total.toLocaleString("pt-BR")}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0 || results.isFetching}
                  onClick={() => setPage((old) => old - 1)}
                >
                  Anterior
                </Button>
                <span>
                  Página {page + 1} de {Math.ceil(results.data.total / PAGE_SIZE)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(page + 1) * PAGE_SIZE >= results.data.total || results.isFetching}
                  onClick={() => setPage((old) => old + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      <ErpRecordDialog
        open={dialogOpen && Boolean(selected)}
        title={selected ? `${selected.code} · ${selected.supplier_name}` : "Pedido de compra"}
        view={dialogView}
        onViewChange={setDialogView}
        onClose={() => {
          setDialogOpen(false);
          setSelectedCode(null);
        }}
        details={selected ? <OrderDetails order={selected} /> : null}
        editForm={
          selected ? (
            <OrderForm
              key={selected.code}
              initial={selected}
              saving={save.isPending}
              suppliers={supplierOptions.data ?? []}
              products={productOptions.data ?? []}
              onSave={(order) => save.mutate(order)}
              onCancel={() => setDialogView("visualizar")}
            />
          ) : null
        }
        deleteLabel="Excluir pedido"
        deleteDescription="O pedido será excluído. Pedidos com itens já recebidos não podem ser excluídos."
        onDelete={() => {
          if (selected) remove.mutate(selected.code);
        }}
        deleting={remove.isPending}
      />
    </div>
  );
}
