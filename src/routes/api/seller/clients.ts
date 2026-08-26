import { createFileRoute } from "@tanstack/react-router";

type PortfolioCustomer = {
  id: string;
  codigo: string | null;
  cliente: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  cnpj_cpf: string | null;
  ultima_compra: string | null;
  compra_ano: number | null;
  vendedor_codigo: string | null;
  vendedor_nome: string | null;
};

type SellerUser = { app_metadata?: Record<string, unknown> | null };
type CustomerScope = "portfolio" | "blue";

function sellerCodeFromUser(user: SellerUser): string {
  const value = user.app_metadata?.seller_code;
  return typeof value === "string" ? value.trim() : "";
}
function sixMonthsAgoDate(): string {
  const cutoff = new Date();
  cutoff.setHours(12, 0, 0, 0);
  cutoff.setMonth(cutoff.getMonth() - 6);
  return cutoff.toISOString().slice(0, 10);
}
function customerSearchText(customer: PortfolioCustomer): string {
  return [customer.cliente, customer.codigo, customer.cidade, customer.uf, customer.telefone, customer.celular, customer.email, customer.cnpj_cpf].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
}
async function listPortfolioCustomers(supabaseAdmin: any, sellerCode: string): Promise<PortfolioCustomer[]> {
  const rows: PortfolioCustomer[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin.from("customers").select("id,codigo,cliente,cidade,uf,telefone,celular,email,cnpj_cpf,ultima_compra,compra_ano,vendedor_codigo,vendedor_nome").eq("vendedor_codigo", sellerCode).eq("abc_na_carteira_atual", true).range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = (data ?? []) as PortfolioCustomer[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}
function topCustomersFromPortfolio(portfolio: PortfolioCustomer[]) {
  return portfolio.map(customer => ({ id: customer.id, code: customer.codigo, name: customer.cliente?.trim() || (customer.codigo ? `Cliente ${customer.codigo}` : "Cliente sem nome"), total: Number(customer.compra_ano ?? 0) })).filter(customer => Number.isFinite(customer.total) && customer.total > 0).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR")).slice(0, 3);
}
function blueDeadline(lastPurchase: string): Date | null {
  const date = new Date(`${lastPurchase.slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return null;
  date.setMonth(date.getMonth() + 6);
  return date;
}
function cleanText(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function parseSaleValue(value: unknown): number {
  const raw = String(value ?? "").trim().replace(/\s/g, "");
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}
async function authorizedCustomer(supabaseAdmin: any, user: SellerUser, customerId: string, scope: CustomerScope) {
  const { data: customer, error } = await supabaseAdmin.from("customers").select("*").eq("id", customerId).maybeSingle();
  if (error) throw error;
  if (!customer) return null;
  if (scope === "portfolio") {
    const sellerCode = sellerCodeFromUser(user);
    if (!sellerCode || customer.abc_na_carteira_atual !== true || String(customer.vendedor_codigo ?? "").trim() !== sellerCode) return null;
  } else {
    const cutoff = sixMonthsAgoDate();
    const lastPurchase = customer.ultima_compra ? String(customer.ultima_compra).slice(0, 10) : null;
    if (lastPurchase && lastPurchase >= cutoff) return null;
  }
  return customer;
}

export const Route = createFileRoute("/api/seller/clients")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authenticateRequest, errorResponse, listLinkedClients, normalizeSearch, resolveSellerIdentity } = await import("@/lib/seller-system.server");
        const authorization = await authenticateRequest(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin, user } = authorization;
        const seller = await resolveSellerIdentity(supabaseAdmin, user);
        if (!seller) return errorResponse("Conta de vendedor sem cadastro interno associado.", 403);

        const url = new URL(request.url);
        const source = url.searchParams.get("source")?.trim() || "linked";

        if (source === "detail") {
          const customerId = cleanText(url.searchParams.get("id"), 80);
          const scope = url.searchParams.get("scope") === "blue" ? "blue" : "portfolio";
          if (!customerId) return errorResponse("Cliente inválido.", 400);
          try {
            const customer = await authorizedCustomer(supabaseAdmin, user, customerId, scope);
            if (!customer) return errorResponse("Cliente não encontrado ou fora da sua permissão.", 404);
            return Response.json({ customer }, { headers: { "Cache-Control": "no-store" } });
          } catch (error) {
            console.error("[seller-customer-detail] Falha ao carregar ficha:", error);
            return errorResponse("Não foi possível carregar a ficha do cliente.", 500);
          }
        }

        if (source === "portfolio" || source === "dashboard") {
          const sellerCode = sellerCodeFromUser(user);
          const nowForSelection = new Date();
          const requestedYear = Number(url.searchParams.get("year") ?? String(nowForSelection.getFullYear()));
          const requestedMonth = Number(url.searchParams.get("month") ?? String(nowForSelection.getMonth() + 1));
          const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100 ? requestedYear : nowForSelection.getFullYear();
          const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : nowForSelection.getMonth() + 1;

          if (!sellerCode) {
            if (source === "dashboard") return Response.json({ sellerCodeMissing: true, seller: { id: seller.sellerId, name: seller.name, code: null }, portfolioCount: 0, nearBlueClients: [], nearBlueCount: 0, topCustomers: [], sales: { year, month, total: 0, hasReport: false } }, { headers: { "Cache-Control": "no-store" } });
            return Response.json({ associationMissing: true, sellerCodeMissing: true, seller: { id: seller.sellerId, name: seller.name, code: null }, clients: [], count: 0, page: 1, pageSize: 10 }, { headers: { "Cache-Control": "no-store" } });
          }

          let portfolio: PortfolioCustomer[];
          try { portfolio = await listPortfolioCustomers(supabaseAdmin, sellerCode); }
          catch (error) { console.error("[seller-portfolio] Falha ao listar clientes:", error); return errorResponse("Não foi possível consultar a carteira de clientes.", 500); }

          if (source === "portfolio") {
            const search = normalizeSearch(url.searchParams.get("search") ?? "");
            const requestedPage = Number(url.searchParams.get("page") ?? "1");
            const requestedPageSize = Number(url.searchParams.get("pageSize") ?? "10");
            const page = Number.isFinite(requestedPage) ? Math.max(1, Math.trunc(requestedPage)) : 1;
            const pageSize = Number.isFinite(requestedPageSize) ? Math.min(100, Math.max(1, Math.trunc(requestedPageSize))) : 10;
            const filtered = search ? portfolio.filter(client => customerSearchText(client).includes(search)) : portfolio;
            filtered.sort((a, b) => (a.cliente || a.codigo || "").localeCompare(b.cliente || b.codigo || "", "pt-BR"));
            const count = filtered.length;
            const from = (page - 1) * pageSize;
            const clients = filtered.slice(from, from + pageSize).map(client => ({ id: client.id, full_name: client.cliente, contact_email: client.email, email: client.email, phone: client.celular || client.telefone, municipio_propriedade: client.cidade, uf: client.uf, customer_code: client.codigo, seller_code: client.vendedor_codigo, seller_name: client.vendedor_nome, chat_ticket_id: null }));
            return Response.json({ associationMissing: false, sellerCodeMissing: false, seller: { id: seller.sellerId, name: seller.name, code: sellerCode }, clients, count, page, pageSize }, { headers: { "Cache-Control": "no-store" } });
          }

          const now = new Date(); now.setHours(12, 0, 0, 0);
          const portfolioCount = portfolio.filter(client => {
            if (!client.ultima_compra) return false;
            const deadline = blueDeadline(client.ultima_compra);
            return Boolean(deadline && deadline >= now);
          }).length;
          const horizon = new Date(now); horizon.setDate(horizon.getDate() + 30);
          const nearBlueClients = portfolio.map(client => {
            if (!client.ultima_compra) return null;
            const deadline = blueDeadline(client.ultima_compra);
            if (!deadline || deadline <= now || deadline > horizon) return null;
            return { id: client.id, codigo: client.codigo, cliente: client.cliente, cidade: client.cidade, uf: client.uf, ultima_compra: client.ultima_compra, entersBlueAt: deadline.toISOString().slice(0, 10), daysRemaining: Math.max(1, Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000)) };
          }).filter(Boolean).sort((a: any, b: any) => a.daysRemaining - b.daysRemaining);
          const topCustomers = topCustomersFromPortfolio(portfolio);
          let monthlyReport: { total_venda: number | string } | null = null;
          try {
            const { data: report, error } = await supabaseAdmin
              .from("seller_monthly_margin_reports")
              .select("total_venda")
              .eq("seller_user_id", user.id)
              .eq("report_year", year)
              .eq("report_month", month)
              .maybeSingle();
            if (error) throw error;
            monthlyReport = report;
          } catch (error) { console.error("[seller-dashboard] Falha ao consultar o relatório mensal:", error); }
          return Response.json({ sellerCodeMissing: false, seller: { id: seller.sellerId, name: seller.name, code: sellerCode }, portfolioCount, nearBlueClients: nearBlueClients.slice(0, 10), nearBlueCount: nearBlueClients.length, topCustomers, sales: { year, month, total: Number(monthlyReport?.total_venda ?? 0), hasReport: Boolean(monthlyReport) } }, { headers: { "Cache-Control": "no-store" } });
        }

        const search = normalizeSearch(url.searchParams.get("search") ?? "");
        const requestedPage = Number(url.searchParams.get("page") ?? "1");
        const requestedPageSize = Number(url.searchParams.get("pageSize") ?? "10");
        const page = Number.isFinite(requestedPage) ? Math.max(1, Math.trunc(requestedPage)) : 1;
        const pageSize = Number.isFinite(requestedPageSize) ? Math.min(50, Math.max(1, Math.trunc(requestedPageSize))) : 10;
        let clients: Awaited<ReturnType<typeof listLinkedClients>>;
        try { clients = await listLinkedClients(supabaseAdmin, seller.sellerId); }
        catch (error) { console.error("[seller-clients] Falha ao listar clientes:", error); return errorResponse("Não foi possível consultar os clientes.", 500); }
        const filtered = search ? clients.filter(client => [client.full_name, client.contact_email, client.email, client.phone].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").includes(search)) : clients;
        filtered.sort((a, b) => (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "", "pt-BR"));
        const count = filtered.length, from = (page - 1) * pageSize;
        const rows = filtered.slice(from, from + pageSize).map(({ user: clientUser, ...client }) => {
          const protectedMetadata = clientUser.app_metadata ?? {};
          const ticketId = protectedMetadata.seller_chat_seller_id === seller.sellerId && typeof protectedMetadata.seller_chat_ticket_id === "string" ? protectedMetadata.seller_chat_ticket_id.trim() : "";
          return { ...client, chat_ticket_id: ticketId || null };
        });
        return Response.json({ associationMissing: false, seller: { id: seller.sellerId, name: seller.name }, clients: rows, count, page, pageSize }, { headers: { "Cache-Control": "no-store" } });
      },

      POST: async ({ request }) => {
        const { authenticateRequest, errorResponse, resolveSellerIdentity } = await import("@/lib/seller-system.server");
        const authorization = await authenticateRequest(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin, user } = authorization;
        const seller = await resolveSellerIdentity(supabaseAdmin, user);
        if (!seller) return errorResponse("Conta de vendedor inválida.", 403);
        let payload: any;
        try { payload = await request.json(); } catch { return errorResponse("Dados inválidos.", 400); }

        if (payload.action === "updateCustomer") {
          const customerId = cleanText(payload.customerId, 80);
          const scope: CustomerScope = payload.scope === "blue" ? "blue" : "portfolio";
          if (!customerId) return errorResponse("Cliente inválido.", 400);
          try {
            const current = await authorizedCustomer(supabaseAdmin, user, customerId, scope);
            if (!current) return errorResponse("Cliente não encontrado ou fora da sua permissão.", 404);
            const fields = payload.fields && typeof payload.fields === "object" ? payload.fields : {};
            const update = {
              endereco: cleanText(fields.endereco, 250) || null,
              numero: cleanText(fields.numero, 50) || null,
              bairro: cleanText(fields.bairro, 120) || null,
              cidade: cleanText(fields.cidade, 120) || null,
              uf: cleanText(fields.uf, 2).toUpperCase() || null,
              cep: cleanText(fields.cep, 20) || null,
              contato: cleanText(fields.contato, 160) || null,
              telefone: cleanText(fields.telefone, 50) || null,
              telefone_2: cleanText(fields.telefone_2, 50) || null,
              celular: cleanText(fields.celular, 50) || null,
              email: cleanText(fields.email, 254) || null,
              observacao_vendedor: cleanText(fields.observacao_vendedor, 2000) || null,
              roteiro: cleanText(fields.roteiro, 6000) || null,
              updated_at: new Date().toISOString(),
            };
            const { data: customer, error } = await supabaseAdmin.from("customers").update(update).eq("id", customerId).select("*").single();
            if (error) throw error;
            return Response.json({ ok: true, customer });
          } catch (error) {
            console.error("[seller-customer-update] Falha ao atualizar cliente:", error);
            return errorResponse("Não foi possível atualizar os dados permitidos do cliente.", 500);
          }
        }

        if (payload.action === "submitSale") {
          const sellerCode = sellerCodeFromUser(user);
          if (!sellerCode) return errorResponse("Código do vendedor não configurado.", 400);
          const customerCode = cleanText(payload.customerCode, 50);
          const saleNotes = cleanText(payload.saleNotes, 4000);
          const saleValue = parseSaleValue(payload.saleValue);
          if (!customerCode || !saleNotes || saleValue <= 0 || saleValue > 999999999999) return errorResponse("Informe código do cliente, produtos/observação e um valor válido.", 400);
          try {
            const { data: customer, error: customerError } = await supabaseAdmin.from("customers").select("id,codigo,cliente,vendedor_codigo").eq("codigo", customerCode).eq("vendedor_codigo", sellerCode).eq("abc_na_carteira_atual", true).maybeSingle();
            if (customerError) throw customerError;
            if (!customer) return errorResponse("Esse código de cliente não pertence à sua carteira.", 404);
            const { data: saleRequest, error } = await supabaseAdmin.from("seller_sale_requests").insert({ seller_user_id: user.id, seller_record_id: seller.sellerId, seller_code: sellerCode, seller_name: seller.name, customer_id: customer.id, customer_code: customer.codigo, customer_name: customer.cliente, sale_notes: saleNotes, sale_value: Number(saleValue.toFixed(2)), status: "new" }).select("id,status,created_at").single();
            if (error) throw error;
            return Response.json({ ok: true, request: saleRequest, customer: { id: customer.id, code: customer.codigo, name: customer.cliente } }, { status: 201 });
          } catch (error) {
            console.error("[seller-sale-request] Falha ao registrar venda:", error);
            return errorResponse("Não foi possível enviar a solicitação de venda.", 500);
          }
        }

        return errorResponse("Ação inválida.", 400);
      },
    },
  },
});