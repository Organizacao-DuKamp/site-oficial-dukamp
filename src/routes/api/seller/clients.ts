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

function sellerCodeFromUser(user: { app_metadata?: Record<string, unknown> | null }): string {
  const value = user.app_metadata?.seller_code;
  return typeof value === "string" ? value.trim() : "";
}

function customerSearchText(customer: PortfolioCustomer): string {
  return [
    customer.cliente,
    customer.codigo,
    customer.cidade,
    customer.uf,
    customer.telefone,
    customer.celular,
    customer.email,
    customer.cnpj_cpf,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("pt-BR");
}

async function listPortfolioCustomers(supabaseAdmin: any, sellerCode: string): Promise<PortfolioCustomer[]> {
  const rows: PortfolioCustomer[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("customers")
      .select(
        "id,codigo,cliente,cidade,uf,telefone,celular,email,cnpj_cpf,ultima_compra,compra_ano,vendedor_codigo,vendedor_nome",
      )
      .eq("vendedor_codigo", sellerCode)
      .range(from, from + pageSize - 1);
    if (error) throw error;

    const batch = (data ?? []) as PortfolioCustomer[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
}

function topCustomersFromPortfolio(portfolio: PortfolioCustomer[]) {
  return portfolio
    .map((customer) => ({
      id: customer.id,
      code: customer.codigo,
      name:
        customer.cliente?.trim() ||
        (customer.codigo ? `Cliente ${customer.codigo}` : "Cliente sem nome"),
      total: Number(customer.compra_ano ?? 0),
    }))
    .filter((customer) => Number.isFinite(customer.total) && customer.total > 0)
    .sort(
      (first, second) =>
        second.total - first.total || first.name.localeCompare(second.name, "pt-BR"),
    )
    .slice(0, 3);
}

function blueDeadline(lastPurchase: string): Date | null {
  const date = new Date(`${lastPurchase.slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return null;
  date.setMonth(date.getMonth() + 6);
  return date;
}

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase("pt-BR");
}

function normalizeDocument(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function selectedMonthRange(year: number, month: number) {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));
  const start = `${startDate.toISOString().slice(0, 10)}T00:00:00-03:00`;
  const end = `${endDate.toISOString().slice(0, 10)}T00:00:00-03:00`;
  return { start, end };
}

export const Route = createFileRoute("/api/seller/clients")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const {
          authenticateRequest,
          errorResponse,
          listLinkedClients,
          normalizeSearch,
          resolveSellerIdentity,
        } = await import("@/lib/seller-system.server");

        const authorization = await authenticateRequest(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin, user } = authorization;

        const seller = await resolveSellerIdentity(supabaseAdmin, user);
        if (!seller) return errorResponse("Conta de vendedor sem cadastro interno associado.", 403);

        const url = new URL(request.url);
        const source = url.searchParams.get("source")?.trim() || "linked";

        if (source === "portfolio" || source === "dashboard") {
          const sellerCode = sellerCodeFromUser(user);
          const nowForSelection = new Date();
          const requestedYear = Number(
            url.searchParams.get("year") ?? String(nowForSelection.getFullYear()),
          );
          const requestedMonth = Number(
            url.searchParams.get("month") ?? String(nowForSelection.getMonth() + 1),
          );
          const year =
            Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
              ? requestedYear
              : nowForSelection.getFullYear();
          const month =
            Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
              ? requestedMonth
              : nowForSelection.getMonth() + 1;

          if (!sellerCode) {
            if (source === "dashboard") {
              return Response.json(
                {
                  sellerCodeMissing: true,
                  seller: { id: seller.sellerId, name: seller.name, code: null },
                  portfolioCount: 0,
                  nearBlueClients: [],
                  nearBlueCount: 0,
                  topCustomers: [],
                  sales: {
                    year,
                    month,
                    total: 0,
                    count: 0,
                  },
                },
                { headers: { "Cache-Control": "no-store" } },
              );
            }

            return Response.json(
              {
                associationMissing: true,
                sellerCodeMissing: true,
                seller: { id: seller.sellerId, name: seller.name, code: null },
                clients: [],
                count: 0,
                page: 1,
                pageSize: 10,
              },
              { headers: { "Cache-Control": "no-store" } },
            );
          }

          let portfolio: PortfolioCustomer[];
          try {
            portfolio = await listPortfolioCustomers(supabaseAdmin, sellerCode);
          } catch (error) {
            console.error("[seller-portfolio] Falha ao listar clientes:", error);
            return errorResponse("Não foi possível consultar a carteira de clientes.", 500);
          }

          if (source === "portfolio") {
            const search = normalizeSearch(url.searchParams.get("search") ?? "");
            const requestedPage = Number(url.searchParams.get("page") ?? "1");
            const requestedPageSize = Number(url.searchParams.get("pageSize") ?? "10");
            const page = Number.isFinite(requestedPage) ? Math.max(1, Math.trunc(requestedPage)) : 1;
            const pageSize = Number.isFinite(requestedPageSize)
              ? Math.min(100, Math.max(1, Math.trunc(requestedPageSize)))
              : 10;

            const filtered = search
              ? portfolio.filter((client) => customerSearchText(client).includes(search))
              : portfolio;

            filtered.sort((first, second) =>
              (first.cliente || first.codigo || "").localeCompare(
                second.cliente || second.codigo || "",
                "pt-BR",
              ),
            );

            const count = filtered.length;
            const from = (page - 1) * pageSize;
            const clients = filtered.slice(from, from + pageSize).map((client) => ({
              id: client.id,
              full_name: client.cliente,
              contact_email: client.email,
              email: client.email,
              phone: client.celular || client.telefone,
              municipio_propriedade: client.cidade,
              uf: client.uf,
              customer_code: client.codigo,
              seller_code: client.vendedor_codigo,
              seller_name: client.vendedor_nome,
              chat_ticket_id: null,
            }));

            return Response.json(
              {
                associationMissing: false,
                sellerCodeMissing: false,
                seller: { id: seller.sellerId, name: seller.name, code: sellerCode },
                clients,
                count,
                page,
                pageSize,
              },
              { headers: { "Cache-Control": "no-store" } },
            );
          }

          const now = new Date();
          now.setHours(12, 0, 0, 0);
          const horizon = new Date(now);
          horizon.setDate(horizon.getDate() + 30);

          const nearBlueClients = portfolio
            .map((client) => {
              if (!client.ultima_compra) return null;
              const deadline = blueDeadline(client.ultima_compra);
              if (!deadline || deadline <= now || deadline > horizon) return null;
              const daysRemaining = Math.max(
                1,
                Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000),
              );
              return {
                id: client.id,
                codigo: client.codigo,
                cliente: client.cliente,
                cidade: client.cidade,
                uf: client.uf,
                ultima_compra: client.ultima_compra,
                entersBlueAt: deadline.toISOString().slice(0, 10),
                daysRemaining,
              };
            })
            .filter(Boolean)
            .sort((first: any, second: any) => first.daysRemaining - second.daysRemaining);

          const topCustomers = topCustomersFromPortfolio(portfolio);

          let salesTotal = 0;
          let salesCount = 0;
          try {
            const emails = new Set(
              portfolio.map((client) => normalizeEmail(client.email)).filter(Boolean),
            );
            const documents = new Set(
              portfolio.map((client) => normalizeDocument(client.cnpj_cpf)).filter(Boolean),
            );

            if (emails.size || documents.size) {
              const { start, end } = selectedMonthRange(year, month);
              const orderPageSize = 1000;
              for (let from = 0; ; from += orderPageSize) {
                const { data: orders, error } = await supabaseAdmin
                  .from("orders")
                  .select("total,email,cpf_cnpj,payment_status,created_at")
                  .eq("payment_status", "approved")
                  .gte("created_at", start)
                  .lt("created_at", end)
                  .range(from, from + orderPageSize - 1);
                if (error) throw error;

                for (const order of orders ?? []) {
                  const emailMatch = emails.has(normalizeEmail(order.email));
                  const documentMatch = documents.has(normalizeDocument(order.cpf_cnpj));
                  if (!emailMatch && !documentMatch) continue;
                  salesTotal += Number(order.total ?? 0);
                  salesCount += 1;
                }
                if ((orders ?? []).length < orderPageSize) break;
              }
            }
          } catch (error) {
            console.error("[seller-dashboard] Falha ao calcular vendas do período:", error);
          }

          return Response.json(
            {
              sellerCodeMissing: false,
              seller: { id: seller.sellerId, name: seller.name, code: sellerCode },
              portfolioCount: portfolio.length,
              nearBlueClients: nearBlueClients.slice(0, 10),
              nearBlueCount: nearBlueClients.length,
              topCustomers,
              sales: {
                year,
                month,
                total: Number(salesTotal.toFixed(2)),
                count: salesCount,
              },
            },
            { headers: { "Cache-Control": "no-store" } },
          );
        }

        const search = normalizeSearch(url.searchParams.get("search") ?? "");
        const requestedPage = Number(url.searchParams.get("page") ?? "1");
        const requestedPageSize = Number(url.searchParams.get("pageSize") ?? "10");
        const page = Number.isFinite(requestedPage) ? Math.max(1, Math.trunc(requestedPage)) : 1;
        const pageSize = Number.isFinite(requestedPageSize)
          ? Math.min(50, Math.max(1, Math.trunc(requestedPageSize)))
          : 10;

        let clients: Awaited<ReturnType<typeof listLinkedClients>>;
        try {
          clients = await listLinkedClients(supabaseAdmin, seller.sellerId);
        } catch (error) {
          console.error("[seller-clients] Falha ao listar clientes:", error);
          return errorResponse("Não foi possível consultar os clientes.", 500);
        }

        const filtered = search
          ? clients.filter((client) =>
              [client.full_name, client.contact_email, client.email, client.phone]
                .filter(Boolean)
                .join(" ")
                .toLocaleLowerCase("pt-BR")
                .includes(search),
            )
          : clients;

        filtered.sort((first, second) =>
          (first.full_name || first.email || "").localeCompare(
            second.full_name || second.email || "",
            "pt-BR",
          ),
        );

        const count = filtered.length;
        const from = (page - 1) * pageSize;
        const rows = filtered.slice(from, from + pageSize).map(({ user: clientUser, ...client }) => {
          const protectedMetadata = clientUser.app_metadata ?? {};
          const ticketId =
            protectedMetadata.seller_chat_seller_id === seller.sellerId &&
            typeof protectedMetadata.seller_chat_ticket_id === "string"
              ? protectedMetadata.seller_chat_ticket_id.trim()
              : "";
          return {
            ...client,
            chat_ticket_id: ticketId || null,
          };
        });

        return Response.json(
          {
            associationMissing: false,
            seller: { id: seller.sellerId, name: seller.name },
            clients: rows,
            count,
            page,
            pageSize,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
