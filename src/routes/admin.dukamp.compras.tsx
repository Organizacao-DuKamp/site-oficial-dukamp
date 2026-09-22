import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  Boxes,
  CalendarClock,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  FileInput,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/dukamp/compras")({
  component: DukampPurchasingPage,
});

type Supplier = {
  id: string;
  legacy_code: number | null;
  legal_name: string;
  trade_name: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  active: boolean;
};

type ErpProduct = {
  id: string;
  legacy_code: number;
  name: string;
  unit: string;
  sale_price: number;
  cost_price: number;
  average_cost: number;
  target_margin: number;
  stock: number;
  warehouse_stock: number;
  minimum_stock: number;
  maximum_stock: number;
};

type PurchaseItem = {
  id: string;
  line_number: number;
  product_id: string | null;
  description: string;
  unit: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  discount_percent: number;
  ipi_percent: number;
  total_amount: number;
};

type PurchaseOrder = {
  id: string;
  order_number: number;
  issue_date: string;
  expected_date: string | null;
  status: "draft" | "approved" | "partial" | "received" | "cancelled";
  payment_terms: string | null;
  total_amount: number;
  supplier_order_number: string | null;
  notes: string | null;
  legacy_source: boolean;
  supplier: Pick<Supplier, "id" | "legal_name" | "legacy_code">;
  items: PurchaseItem[];
};

type GoodsReceipt = {
  id: string;
  receipt_number: number;
  invoice_number: string;
  issue_date: string | null;
  received_at: string;
  status: string;
  invoice_amount: number;
  legacy_source: boolean;
  supplier: Pick<Supplier, "legal_name" | "legacy_code">;
  order: { order_number: number } | null;
};

type Payable = {
  id: string;
  title_number: string;
  description: string | null;
  issue_date: string;
  due_date: string;
  amount: number;
  open_amount: number;
  status: string;
  source_type: string;
  supplier: Pick<Supplier, "legal_name" | "legacy_code"> | null;
};

type Dashboard = {
  suppliers: number;
  products: number;
  orders_open: number;
  orders_overdue: number;
  orders_open_value: number;
  payables_open: number;
  payables_overdue: number;
  payables_open_value: number;
  negative_stock: number;
  below_minimum_stock: number;
};

type OrderFormItem = {
  key: string;
  product_id: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  ipi_percent: number;
};

// As tabelas do ERP são adicionadas por migration e ainda não constam nos tipos gerados do Supabase.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const quantity = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

function dateBR(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

function statusLabel(status: string) {
  return (
    (
      {
        draft: "Rascunho",
        approved: "Aprovado",
        partial: "Parcial",
        received: "Recebido",
        cancelled: "Cancelado",
        open: "Em aberto",
        paid: "Pago",
      } as Record<string, string>
    )[status] ?? status
  );
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["received", "paid"].includes(status)) return "secondary";
  if (status === "cancelled") return "destructive";
  if (["approved", "partial"].includes(status)) return "default";
  return "outline";
}

async function loadAll<T>(table: string, columns: string, orderColumn: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .order(orderColumn, { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if ((data ?? []).length < 1000) return rows;
  }
}

function usePurchasingData() {
  const dashboard = useQuery({
    queryKey: ["dukamp-erp", "purchasing-dashboard"],
    queryFn: async () => {
      const { data, error } = await db.rpc("dukamp_purchasing_dashboard");
      if (error) throw error;
      return data as Dashboard;
    },
  });
  const suppliers = useQuery({
    queryKey: ["dukamp-erp", "suppliers"],
    queryFn: () =>
      loadAll<Supplier>(
        "dukamp_erp_suppliers",
        "id,legacy_code,legal_name,trade_name,tax_id,email,phone,contact_name,active",
        "legal_name",
      ),
  });
  const products = useQuery({
    queryKey: ["dukamp-erp", "products"],
    queryFn: () =>
      loadAll<ErpProduct>(
        "dukamp_erp_products",
        "id,legacy_code,name,unit,sale_price,cost_price,average_cost,target_margin,stock,warehouse_stock,minimum_stock,maximum_stock",
        "name",
      ),
  });
  const orders = useQuery({
    queryKey: ["dukamp-erp", "purchase-orders"],
    queryFn: async () => {
      const { data, error } = await db
        .from("dukamp_purchase_orders")
        .select(
          "*,supplier:dukamp_erp_suppliers(id,legacy_code,legal_name),items:dukamp_purchase_order_items(*)",
        )
        .order("order_number", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as PurchaseOrder[];
    },
  });
  const receipts = useQuery({
    queryKey: ["dukamp-erp", "goods-receipts"],
    queryFn: async () => {
      const { data, error } = await db
        .from("dukamp_goods_receipts")
        .select(
          "*,supplier:dukamp_erp_suppliers(legacy_code,legal_name),order:dukamp_purchase_orders(order_number)",
        )
        .order("received_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as GoodsReceipt[];
    },
  });
  const payables = useQuery({
    queryKey: ["dukamp-erp", "purchase-payables"],
    queryFn: async () => {
      const { data, error } = await db
        .from("dukamp_accounts_payable")
        .select("*,supplier:dukamp_erp_suppliers(legacy_code,legal_name)")
        .in("status", ["open", "partial"])
        .order("due_date", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Payable[];
    },
  });
  return { dashboard, suppliers, products, orders, receipts, payables };
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  alert = false,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof ShoppingCart;
  alert?: boolean;
}) {
  return (
    <Card className={alert ? "border-amber-500/40" : undefined}>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div
          className={`rounded-lg p-2 ${alert ? "bg-amber-500/10 text-amber-700" : "bg-primary/10 text-primary"}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function SupplierDialog({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    legal_name: "",
    trade_name: "",
    tax_id: "",
    email: "",
    phone: "",
    contact_name: "",
  });
  useEffect(() => {
    setForm({
      legal_name: supplier?.legal_name ?? "",
      trade_name: supplier?.trade_name ?? "",
      tax_id: supplier?.tax_id ?? "",
      email: supplier?.email ?? "",
      phone: supplier?.phone ?? "",
      contact_name: supplier?.contact_name ?? "",
    });
  }, [supplier, open]);
  const save = useMutation({
    mutationFn: async () => {
      if (!form.legal_name.trim()) throw new Error("Informe a razão social.");
      const payload = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value.trim() || null]),
      );
      const result = supplier
        ? await db.from("dukamp_erp_suppliers").update(payload).eq("id", supplier.id)
        : await db.from("dukamp_erp_suppliers").insert(payload);
      if (result.error) throw result.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dukamp-erp"] });
      toast.success(supplier ? "Fornecedor atualizado." : "Fornecedor cadastrado.");
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao salvar fornecedor."),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{supplier ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["legal_name", "Razão social *"],
            ["trade_name", "Nome fantasia"],
            ["tax_id", "CNPJ/CPF"],
            ["contact_name", "Contato"],
            ["phone", "Telefone"],
            ["email", "E-mail"],
          ].map(([name, label]) => (
            <div key={name} className="space-y-1.5">
              <Label>{label}</Label>
              <Input
                value={form[name as keyof typeof form]}
                onChange={(event) =>
                  setForm((current) => ({ ...current, [name]: event.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function emptyOrderItem(): OrderFormItem {
  return {
    key: crypto.randomUUID(),
    product_id: "",
    description: "",
    unit: "UN",
    quantity: 1,
    unit_price: 0,
    discount_percent: 0,
    ipi_percent: 0,
  };
}

function PurchaseOrderDialog({
  open,
  onOpenChange,
  suppliers,
  products,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  products: ErpProduct[];
}) {
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [freight, setFreight] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [extra, setExtra] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderFormItem[]>([emptyOrderItem()]);
  useEffect(() => {
    if (!open) return;
    setSupplierId("");
    setExpectedDate("");
    setPaymentTerms("");
    setFreight(0);
    setDiscount(0);
    setExtra(0);
    setNotes("");
    setItems([emptyOrderItem()]);
  }, [open]);
  const setItem = (key: string, values: Partial<OrderFormItem>) =>
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...values } : item)),
    );
  const chooseProduct = (key: string, productId: string) => {
    const product = products.find((item) => item.id === productId);
    setItem(key, {
      product_id: productId,
      description: product?.name ?? "",
      unit: product?.unit ?? "UN",
      unit_price: Number(product?.cost_price ?? 0),
    });
  };
  const itemTotal = (item: OrderFormItem) =>
    item.quantity *
    item.unit_price *
    (1 - item.discount_percent / 100) *
    (1 + item.ipi_percent / 100);
  const total = items.reduce((sum, item) => sum + itemTotal(item), 0) + freight + extra - discount;
  const create = useMutation({
    mutationFn: async () => {
      if (!supplierId) throw new Error("Selecione o fornecedor.");
      if (
        items.some((item) => !item.description.trim() || item.quantity <= 0 || item.unit_price < 0)
      )
        throw new Error("Revise os itens do pedido.");
      const { data, error } = await db.rpc("dukamp_create_purchase_order", {
        _supplier_id: supplierId,
        _issue_date: issueDate,
        _expected_date: expectedDate || null,
        _payment_terms: paymentTerms || null,
        _freight_amount: freight,
        _discount_amount: discount,
        _extra_amount: extra,
        _supplier_order_number: null,
        _transport: null,
        _contact_name: null,
        _notes: notes || null,
        _items: items.map(
          ({
            product_id,
            description,
            unit,
            quantity,
            unit_price,
            discount_percent,
            ipi_percent,
          }) => ({
            product_id: product_id || null,
            description,
            unit,
            quantity,
            unit_price,
            discount_percent,
            ipi_percent,
          }),
        ),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dukamp-erp"] });
      toast.success("Pedido de compra criado.");
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao criar pedido."),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo pedido de compra</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Fornecedor *</Label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {suppliers
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.legacy_code ? `${s.legacy_code} · ` : ""}
                    {s.legal_name}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Emissão</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Previsão de entrega</Label>
            <Input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Condição de pagamento</Label>
            <Input
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="Ex.: 30/60/90"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Frete</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={freight}
              onChange={(e) => setFreight(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Desconto</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Itens</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItems((current) => [...current, emptyOrderItem()])}
            >
              <Plus className="mr-1 h-4 w-4" /> Item
            </Button>
          </div>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.key}
                className="grid gap-2 rounded-lg border p-3 lg:grid-cols-[2fr_80px_100px_120px_90px_90px_110px_36px]"
              >
                <div>
                  <Label className="text-xs">Produto</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-xs"
                    value={item.product_id}
                    onChange={(e) => chooseProduct(item.key, e.target.value)}
                  >
                    <option value="">Item sem cadastro...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.legacy_code} · {p.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    className="mt-1"
                    value={item.description}
                    onChange={(e) => setItem(item.key, { description: e.target.value })}
                    placeholder="Descrição"
                  />
                </div>
                <div>
                  <Label className="text-xs">Un.</Label>
                  <Input
                    className="mt-1"
                    value={item.unit}
                    onChange={(e) => setItem(item.key, { unit: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Quantidade</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={item.quantity}
                    onChange={(e) => setItem(item.key, { quantity: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor unit.</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min="0"
                    step="0.0001"
                    value={item.unit_price}
                    onChange={(e) => setItem(item.key, { unit_price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Desc. %</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.discount_percent}
                    onChange={(e) =>
                      setItem(item.key, { discount_percent: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">IPI %</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.ipi_percent}
                    onChange={(e) => setItem(item.key, { ipi_percent: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Total</Label>
                  <div className="mt-1 h-9 rounded-md bg-muted px-2 py-2 text-xs font-medium">
                    {money.format(itemTotal(item))}
                  </div>
                </div>
                <Button
                  className="mt-5"
                  variant="ghost"
                  size="icon"
                  disabled={items.length === 1}
                  onClick={() =>
                    setItems((current) => current.filter((row) => row.key !== item.key))
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
                <span className="sr-only">Item {index + 1}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="rounded-lg bg-primary/10 p-4 text-right">
            <p className="text-xs text-muted-foreground">Total do pedido</p>
            <p className="text-2xl font-bold text-primary">{money.format(total)}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Criando..." : "Criar pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReceiveOrderDialog({
  order,
  onOpenChange,
}: {
  order: PurchaseOrder | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [invoice, setInvoice] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [nfeKey, setNfeKey] = useState("");
  const [freight, setFreight] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [lines, setLines] = useState<Record<string, { quantity: number; unit_cost: number }>>({});
  useEffect(() => {
    if (!order) return;
    setInvoice("");
    setDueDate("");
    setNfeKey("");
    setFreight(0);
    setExpenses(0);
    setDiscount(0);
    setLines(
      Object.fromEntries(
        order.items
          .filter((item) => item.quantity_received < item.quantity_ordered)
          .map((item) => [
            item.id,
            {
              quantity: item.quantity_ordered - item.quantity_received,
              unit_cost: item.unit_price,
            },
          ]),
      ),
    );
  }, [order]);
  const receive = useMutation({
    mutationFn: async () => {
      const items = Object.entries(lines)
        .filter(([, value]) => value.quantity > 0)
        .map(([order_item_id, value]) => ({ order_item_id, ...value }));
      if (!invoice.trim()) throw new Error("Informe o número da nota.");
      if (!items.length) throw new Error("Informe ao menos uma quantidade recebida.");
      const { error } = await db.rpc("dukamp_receive_purchase_order", {
        _order_id: order?.id,
        _invoice_number: invoice,
        _issue_date: issueDate,
        _nfe_key: nfeKey || null,
        _freight_amount: freight,
        _expense_amount: expenses,
        _discount_amount: discount,
        _due_date: dueDate || null,
        _items: items,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dukamp-erp"] });
      toast.success("Entrada registrada e estoque atualizado.");
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao receber pedido."),
  });
  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receber pedido {order?.order_number}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Número da nota *</Label>
            <Input value={invoice} onChange={(e) => setInvoice(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Emissão da nota</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Vencimento</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Chave NFe</Label>
            <Input value={nfeKey} onChange={(e) => setNfeKey(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Frete</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={freight}
              onChange={(e) => setFreight(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Despesas</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={expenses}
              onChange={(e) => setExpenses(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Desconto</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Pendente</TableHead>
                <TableHead>Receber</TableHead>
                <TableHead>Custo unitário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order?.items
                .filter((item) => item.quantity_received < item.quantity_ordered)
                .map((item) => {
                  const remaining = item.quantity_ordered - item.quantity_received;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.line_number}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>
                        {quantity.format(remaining)} {item.unit}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="w-28"
                          type="number"
                          min="0"
                          max={remaining}
                          step="0.001"
                          value={lines[item.id]?.quantity ?? 0}
                          onChange={(e) =>
                            setLines((current) => ({
                              ...current,
                              [item.id]: { ...current[item.id], quantity: Number(e.target.value) },
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="w-32"
                          type="number"
                          min="0"
                          step="0.0001"
                          value={lines[item.id]?.unit_cost ?? item.unit_price}
                          onChange={(e) =>
                            setLines((current) => ({
                              ...current,
                              [item.id]: { ...current[item.id], unit_cost: Number(e.target.value) },
                            }))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          Ao confirmar, o recebimento, o estoque, o custo do produto e o título a pagar são
          atualizados na mesma transação.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => receive.mutate()} disabled={receive.isPending}>
            {receive.isPending ? "Registrando..." : "Confirmar entrada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrdersPanel({
  orders,
  suppliers,
  products,
}: {
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  products: ErpProduct[];
}) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [receiveOrder, setReceiveOrder] = useState<PurchaseOrder | null>(null);
  const filtered = orders.filter((order) =>
    `${order.order_number} ${order.supplier?.legal_name ?? ""}`
      .toLocaleLowerCase("pt-BR")
      .includes(query.toLocaleLowerCase("pt-BR")),
  );
  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db.rpc("dukamp_set_purchase_order_status", {
        _order_id: id,
        _status: status,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dukamp-erp"] });
      toast.success("Status atualizado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar pedido."),
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pedido ou fornecedor..."
          />
        </div>
        <Button onClick={() => setNewOrderOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo pedido
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Previsão</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">#{order.order_number}</TableCell>
                <TableCell>{dateBR(order.issue_date)}</TableCell>
                <TableCell>{dateBR(order.expected_date)}</TableCell>
                <TableCell>{order.supplier?.legal_name ?? "—"}</TableCell>
                <TableCell>{order.items?.length ?? 0}</TableCell>
                <TableCell>{money.format(Number(order.total_amount))}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(order.status)}>{statusLabel(order.status)}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {order.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => changeStatus.mutate({ id: order.id, status: "approved" })}
                      >
                        <Check className="mr-1 h-4 w-4" /> Aprovar
                      </Button>
                    )}
                    {["approved", "partial"].includes(order.status) && (
                      <Button size="sm" onClick={() => setReceiveOrder(order)}>
                        <FileInput className="mr-1 h-4 w-4" /> Receber
                      </Button>
                    )}
                    {["draft", "approved"].includes(order.status) && !order.legacy_source && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => changeStatus.mutate({ id: order.id, status: "cancelled" })}
                        aria-label="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Nenhum pedido encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <PurchaseOrderDialog
        open={newOrderOpen}
        onOpenChange={setNewOrderOpen}
        suppliers={suppliers}
        products={products}
      />
      <ReceiveOrderDialog
        order={receiveOrder}
        onOpenChange={(open) => {
          if (!open) setReceiveOrder(null);
        }}
      />
    </div>
  );
}

function SuppliersPanel({ suppliers }: { suppliers: Supplier[] }) {
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const filtered = suppliers.filter((supplier) =>
    `${supplier.legacy_code ?? ""} ${supplier.legal_name} ${supplier.trade_name ?? ""} ${supplier.tax_id ?? ""}`
      .toLocaleLowerCase("pt-BR")
      .includes(query.toLocaleLowerCase("pt-BR")),
  );
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome, código ou CNPJ..."
          />
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Fornecedor
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>CNPJ/CPF</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 500).map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>{supplier.legacy_code ?? "Novo"}</TableCell>
                <TableCell>
                  <div className="font-medium">{supplier.legal_name}</div>
                  <div className="text-xs text-muted-foreground">{supplier.trade_name}</div>
                </TableCell>
                <TableCell>{supplier.tax_id ?? "—"}</TableCell>
                <TableCell>{supplier.contact_name ?? supplier.email ?? "—"}</TableCell>
                <TableCell>{supplier.phone ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={supplier.active ? "secondary" : "outline"}>
                    {supplier.active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(supplier);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <SupplierDialog open={dialogOpen} onOpenChange={setDialogOpen} supplier={editing} />
    </div>
  );
}

function ProductsReportsPanel({ products }: { products: ErpProduct[] }) {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<"margin" | "suggestion" | "negative">("margin");
  const rows = useMemo(
    () =>
      products
        .map((product) => ({
          ...product,
          margin:
            product.sale_price > 0
              ? ((product.sale_price - product.cost_price) / product.sale_price) * 100
              : 0,
          suggested: Math.max(0, (product.maximum_stock || product.minimum_stock) - product.stock),
        }))
        .filter((product) => {
          if (
            report === "suggestion" &&
            !(product.minimum_stock > 0 && product.stock < product.minimum_stock)
          )
            return false;
          if (report === "negative" && product.stock >= 0) return false;
          return `${product.legacy_code} ${product.name}`
            .toLocaleLowerCase("pt-BR")
            .includes(query.toLocaleLowerCase("pt-BR"));
        })
        .sort((a, b) => (report === "margin" ? a.margin - b.margin : b.suggested - a.suggested)),
    [products, query, report],
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={report === "margin" ? "default" : "outline"}
            onClick={() => setReport("margin")}
          >
            Margem de venda
          </Button>
          <Button
            size="sm"
            variant={report === "suggestion" ? "default" : "outline"}
            onClick={() => setReport("suggestion")}
          >
            Sugestão de compras
          </Button>
          <Button
            size="sm"
            variant={report === "negative" ? "default" : "outline"}
            onClick={() => setReport("negative")}
          >
            Estoque negativo
          </Button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Código ou produto..."
          />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Mínimo</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Venda</TableHead>
              <TableHead>Margem</TableHead>
              {report === "suggestion" && <TableHead>Sugestão</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 1000).map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.legacy_code}</TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className={product.stock < 0 ? "font-semibold text-destructive" : ""}>
                  {quantity.format(product.stock)} {product.unit}
                </TableCell>
                <TableCell>{quantity.format(product.minimum_stock)}</TableCell>
                <TableCell>{money.format(product.cost_price)}</TableCell>
                <TableCell>{money.format(product.sale_price)}</TableCell>
                <TableCell>
                  <Badge
                    variant={product.margin < product.target_margin ? "destructive" : "secondary"}
                  >
                    {product.margin.toFixed(1)}%
                  </Badge>
                </TableCell>
                {report === "suggestion" && (
                  <TableCell className="font-semibold">
                    {quantity.format(product.suggested)} {product.unit}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Nenhum produto neste relatório.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ReceiptsPanel({ receipts }: { receipts: GoodsReceipt[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entrada</TableHead>
            <TableHead>Nota</TableHead>
            <TableHead>Emissão</TableHead>
            <TableHead>Recebimento</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Pedido</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Origem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {receipts.map((receipt) => (
            <TableRow key={receipt.id}>
              <TableCell>#{receipt.receipt_number}</TableCell>
              <TableCell className="font-medium">{receipt.invoice_number}</TableCell>
              <TableCell>{dateBR(receipt.issue_date)}</TableCell>
              <TableCell>{new Date(receipt.received_at).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell>{receipt.supplier?.legal_name ?? "—"}</TableCell>
              <TableCell>
                {receipt.order?.order_number ? `#${receipt.order.order_number}` : "—"}
              </TableCell>
              <TableCell>{money.format(Number(receipt.invoice_amount))}</TableCell>
              <TableCell>
                <Badge variant="outline">{receipt.legacy_source ? "Legado" : "ERP web"}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PayablesPanel({ payables }: { payables: Payable[] }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
        Mostrando os primeiros 500 títulos em aberto, ordenados pelo vencimento.
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Em aberto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Origem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payables.map((payable) => {
              const overdue = payable.due_date < today;
              return (
                <TableRow key={payable.id} className={overdue ? "bg-destructive/5" : undefined}>
                  <TableCell>
                    <div className="font-medium">{payable.title_number}</div>
                    <div className="text-xs text-muted-foreground">{payable.description}</div>
                  </TableCell>
                  <TableCell>{payable.supplier?.legal_name ?? "—"}</TableCell>
                  <TableCell>{dateBR(payable.issue_date)}</TableCell>
                  <TableCell className={overdue ? "font-semibold text-destructive" : ""}>
                    {dateBR(payable.due_date)}
                  </TableCell>
                  <TableCell>{money.format(Number(payable.amount))}</TableCell>
                  <TableCell>{money.format(Number(payable.open_amount))}</TableCell>
                  <TableCell>
                    <Badge variant={overdue ? "destructive" : statusVariant(payable.status)}>
                      {overdue ? "Vencido" : statusLabel(payable.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {payable.source_type === "legacy" ? "Sistema anterior" : "ERP web"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DukampPurchasingPage() {
  const data = usePurchasingData();
  const dashboard = data.dashboard.data;
  const loadError = [data.dashboard, data.suppliers, data.products, data.orders].find(
    (query) => query.isError,
  )?.error;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild variant="outline" size="icon">
            <Link to="/admin/dukamp">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Compras</h1>
              <Badge>Operacional</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Pedidos, recebimentos, fornecedores, estoque, margem e contas a pagar.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-xs text-muted-foreground">
          <ClipboardCheck className="h-4 w-4 text-primary" /> Operações com auditoria
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
          <p className="font-semibold">O banco operacional de Compras ainda não está disponível.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {loadError instanceof Error
              ? loadError.message
              : "Aplique a migration do módulo para continuar."}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Pedidos em aberto"
          value={dashboard?.orders_open ?? "—"}
          detail={money.format(Number(dashboard?.orders_open_value ?? 0))}
          icon={ShoppingCart}
        />
        <MetricCard
          label="Entregas atrasadas"
          value={dashboard?.orders_overdue ?? "—"}
          detail="pedidos fora da previsão"
          icon={CalendarClock}
          alert={Boolean(dashboard?.orders_overdue)}
        />
        <MetricCard
          label="Contas a pagar"
          value={money.format(Number(dashboard?.payables_open_value ?? 0))}
          detail={`${dashboard?.payables_open ?? 0} títulos em aberto`}
          icon={CircleDollarSign}
        />
        <MetricCard
          label="Estoque abaixo mínimo"
          value={dashboard?.below_minimum_stock ?? "—"}
          detail="produtos para recomprar"
          icon={Boxes}
          alert={Boolean(dashboard?.below_minimum_stock)}
        />
        <MetricCard
          label="Fornecedores"
          value={dashboard?.suppliers ?? "—"}
          detail={`${dashboard?.products ?? 0} produtos ativos`}
          icon={Store}
        />
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="h-auto min-w-max flex-wrap justify-start">
            <TabsTrigger value="orders">
              <ShoppingCart className="mr-1.5 h-4 w-4" /> Pedidos
            </TabsTrigger>
            <TabsTrigger value="receipts">
              <PackageCheck className="mr-1.5 h-4 w-4" /> Entradas
            </TabsTrigger>
            <TabsTrigger value="suppliers">
              <Truck className="mr-1.5 h-4 w-4" /> Fornecedores
            </TabsTrigger>
            <TabsTrigger value="reports">
              <Boxes className="mr-1.5 h-4 w-4" /> Consultas e margem
            </TabsTrigger>
            <TabsTrigger value="payables">
              <BadgeDollarSign className="mr-1.5 h-4 w-4" /> Contas a pagar
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="orders">
          <OrdersPanel
            orders={data.orders.data ?? []}
            suppliers={data.suppliers.data ?? []}
            products={data.products.data ?? []}
          />
        </TabsContent>
        <TabsContent value="receipts">
          <ReceiptsPanel receipts={data.receipts.data ?? []} />
        </TabsContent>
        <TabsContent value="suppliers">
          <SuppliersPanel suppliers={data.suppliers.data ?? []} />
        </TabsContent>
        <TabsContent value="reports">
          <ProductsReportsPanel products={data.products.data ?? []} />
        </TabsContent>
        <TabsContent value="payables">
          <PayablesPanel payables={data.payables.data ?? []} />
        </TabsContent>
      </Tabs>

      <div className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <p>
          Antes do corte definitivo dos executáveis, confira saldos iniciais, pedidos pendentes e
          títulos em aberto. Entradas criadas nesta tela já movimentam a base operacional do ERP
          web.
        </p>
      </div>
    </div>
  );
}
