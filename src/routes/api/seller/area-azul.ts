import { createFileRoute } from "@tanstack/react-router";

type CustomerRow = {
  id: string;
  codigo: string | null;
  cliente: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  ultima_compra: string | null;
  valor_ultima_compra: number | null;
  compra_ano: number | null;
  valor_maior_compra: number | null;
  data_cadastro: string | null;
  vendedor_codigo: string | null;
  vendedor_nome: string | null;
};

type SellerOption = { code: string; name: string };
type BlueSort =
  | "oldest_last_purchase"
  | "newest_last_purchase"
  | "highest_largest_purchase"
  | "lowest_largest_purchase"
  | "highest_year_purchase"
  | "oldest_registration"
  | "newest_registration"
  | "newest_blue_entry"
  | "name_asc";

const BLUE_SORTS: BlueSort[] = [
  "oldest_last_purchase",
  "newest_last_purchase",
  "highest_largest_purchase",
  "lowest_largest_purchase",
  "highest_year_purchase",
  "oldest_registration",
  "newest_registration",
  "newest_blue_entry",
  "name_asc",
];
const BLUE_ENTRY_WINDOWS = [7, 30, 90, 180];

function sixMonthsAgoDate(): string {
  const cutoff = new Date();
  cutoff.setHours(12, 0, 0, 0);
  cutoff.setMonth(cutoff.getMonth() - 6);
  return cutoff.toISOString().slice(0, 10);
}
function customerSearchText(customer: CustomerRow): string {
  return [
    customer.cliente,
    customer.codigo,
    customer.cidade,
    customer.uf,
    customer.telefone,
    customer.celular,
    customer.email,
    customer.vendedor_codigo,
    customer.vendedor_nome,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("pt-BR");
}
function parseDateParam(value: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}
function parseAmountParam(value: string | null): number | null {
  const raw = value?.trim().replace(/\s/g, "") ?? "";
  if (!raw) return null;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}
function validSort(value: string | null): BlueSort {
  return BLUE_SORTS.includes(value as BlueSort) ? (value as BlueSort) : "oldest_last_purchase";
}
function safeDate(value: string | null): Date | null {
  if (!value) return null;
  const raw = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T12:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}
function blueEntryDate(lastPurchase: string | null): string | null {
  const date = safeDate(lastPurchase);
  if (!date) return null;
  date.setMonth(date.getMonth() + 6);
  return date.toISOString().slice(0, 10);
}
function compareNullableDate(
  a: string | null,
  b: string | null,
  descending: boolean,
  nullsFirst = false,
) {
  if (!a && !b) return 0;
  if (!a) return nullsFirst ? -1 : 1;
  if (!b) return nullsFirst ? 1 : -1;
  const comparison = a.localeCompare(b);
  return descending ? -comparison : comparison;
}
function numberValue(value: number | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function compareNullableNumber(a: number | null, b: number | null, descending: boolean) {
  const left = numberValue(a);
  const right = numberValue(b);
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return descending ? right - left : left - right;
}
function compareNames(a: CustomerRow, b: CustomerRow) {
  return (a.cliente ?? a.codigo ?? "").localeCompare(b.cliente ?? b.codigo ?? "", "pt-BR");
}
function sortBlueCustomers(customers: CustomerRow[], sort: BlueSort) {
  customers.sort((a, b) => {
    let comparison = 0;
    if (sort === "oldest_last_purchase")
      comparison = compareNullableDate(a.ultima_compra, b.ultima_compra, false, true);
    if (sort === "newest_last_purchase")
      comparison = compareNullableDate(a.ultima_compra, b.ultima_compra, true);
    if (sort === "highest_largest_purchase")
      comparison = compareNullableNumber(a.valor_maior_compra, b.valor_maior_compra, true);
    if (sort === "lowest_largest_purchase")
      comparison = compareNullableNumber(a.valor_maior_compra, b.valor_maior_compra, false);
    if (sort === "highest_year_purchase")
      comparison = compareNullableNumber(a.compra_ano, b.compra_ano, true);
    if (sort === "oldest_registration")
      comparison = compareNullableDate(a.data_cadastro, b.data_cadastro, false);
    if (sort === "newest_registration")
      comparison = compareNullableDate(a.data_cadastro, b.data_cadastro, true);
    if (sort === "newest_blue_entry")
      comparison = compareNullableDate(
        blueEntryDate(a.ultima_compra),
        blueEntryDate(b.ultima_compra),
        true,
      );
    if (comparison !== 0) return comparison;
    return compareNames(a, b);
  });
}

export const Route = createFileRoute("/api/seller/area-azul")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authenticateRequest, errorResponse, normalizeSearch, resolveSellerIdentity } =
          await import("@/lib/seller-system.server");
        const authorization = await authenticateRequest(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin, user } = authorization;
        const seller = await resolveSellerIdentity(supabaseAdmin, user);
        if (!seller) return errorResponse("Conta de vendedor sem cadastro interno associado.", 403);

        const url = new URL(request.url);
        const search = normalizeSearch(url.searchParams.get("search") ?? "");
        const requestedPage = Number(url.searchParams.get("page") ?? "1");
        const requestedPageSize = Number(url.searchParams.get("pageSize") ?? "25");
        const page = Number.isFinite(requestedPage) ? Math.max(1, Math.trunc(requestedPage)) : 1;
        const pageSize = Number.isFinite(requestedPageSize)
          ? Math.min(100, Math.max(1, Math.trunc(requestedPageSize)))
          : 25;
        const cutoffDate = sixMonthsAgoDate();
        const rows: CustomerRow[] = [],
          fetchSize = 1000;

        try {
          for (let from = 0; ; from += fetchSize) {
            const { data, error } = await supabaseAdmin
              .from("customers")
              .select(
                "id,codigo,cliente,cidade,uf,telefone,celular,email,ultima_compra,valor_ultima_compra,compra_ano,valor_maior_compra,data_cadastro,vendedor_codigo,vendedor_nome",
              )
              .or(`ultima_compra.lt.${cutoffDate},ultima_compra.is.null`)
              .order("id", { ascending: true })
              .range(from, from + fetchSize - 1);
            if (error) throw error;
            const batch = (data ?? []) as CustomerRow[];
            rows.push(...batch);
            if (batch.length < fetchSize) break;
          }
        } catch (error) {
          console.error("[seller-blue-area] Falha ao listar clientes:", error);
          return errorResponse("Não foi possível consultar a Lista Azul.", 500);
        }

        const sort = validSort(url.searchParams.get("sort"));
        const sellerCode = (url.searchParams.get("seller") ?? "").trim().slice(0, 40);
        const lastPurchaseFrom = parseDateParam(url.searchParams.get("lastPurchaseFrom"));
        const lastPurchaseTo = parseDateParam(url.searchParams.get("lastPurchaseTo"));
        const largestPurchaseMin = parseAmountParam(url.searchParams.get("largestPurchaseMin"));
        const largestPurchaseMax = parseAmountParam(url.searchParams.get("largestPurchaseMax"));
        const requestedEntryWindow = Number(url.searchParams.get("enteredWithinDays"));
        const enteredWithinDays = BLUE_ENTRY_WINDOWS.includes(requestedEntryWindow)
          ? requestedEntryWindow
          : null;
        const sellerMap = new Map<string, SellerOption>();
        rows.forEach((customer) => {
          const code = customer.vendedor_codigo?.trim();
          if (code)
            sellerMap.set(code, {
              code,
              name: customer.vendedor_nome?.trim() || `Vendedor ${code}`,
            });
        });
        const sellers = [...sellerMap.values()].sort(
          (a, b) => a.name.localeCompare(b.name, "pt-BR") || a.code.localeCompare(b.code, "pt-BR"),
        );
        const now = new Date();
        now.setHours(12, 0, 0, 0);
        const entryWindowStart = enteredWithinDays == null ? null : new Date(now);
        if (entryWindowStart && enteredWithinDays != null) {
          entryWindowStart.setDate(entryWindowStart.getDate() - enteredWithinDays);
        }
        const entryWindowStartIso = entryWindowStart?.toISOString().slice(0, 10) ?? null;
        const todayIso = now.toISOString().slice(0, 10);
        const filtered = rows.filter((customer) => {
          if (search && !customerSearchText(customer).includes(search)) return false;
          if (sellerCode && (customer.vendedor_codigo ?? "").trim() !== sellerCode) return false;
          if (
            lastPurchaseFrom &&
            (!customer.ultima_compra || customer.ultima_compra < lastPurchaseFrom)
          )
            return false;
          if (
            lastPurchaseTo &&
            (!customer.ultima_compra || customer.ultima_compra > lastPurchaseTo)
          )
            return false;
          const largestPurchase = numberValue(customer.valor_maior_compra);
          if (
            largestPurchaseMin != null &&
            (largestPurchase == null || largestPurchase < largestPurchaseMin)
          )
            return false;
          if (
            largestPurchaseMax != null &&
            (largestPurchase == null || largestPurchase > largestPurchaseMax)
          )
            return false;
          if (entryWindowStartIso) {
            const entryDate = blueEntryDate(customer.ultima_compra);
            if (!entryDate || entryDate < entryWindowStartIso || entryDate > todayIso) return false;
          }
          return true;
        });
        sortBlueCustomers(filtered, sort);
        const count = filtered.length;
        const from = (page - 1) * pageSize;
        const clients = filtered.slice(from, from + pageSize).map((customer) => ({
          ...customer,
          entersBlueAt: blueEntryDate(customer.ultima_compra),
        }));
        return Response.json(
          { cutoffDate, clients, count, page, pageSize, sellers },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
