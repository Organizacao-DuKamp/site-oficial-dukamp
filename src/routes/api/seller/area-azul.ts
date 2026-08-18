import { createFileRoute } from "@tanstack/react-router";

type CustomerRow = {
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
};

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
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("pt-BR");
}

export const Route = createFileRoute("/api/seller/area-azul")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const {
          authenticateRequest,
          errorResponse,
          normalizeSearch,
          resolveSellerIdentity,
        } = await import("@/lib/seller-system.server");

        const authorization = await authenticateRequest(request);
        if ("response" in authorization) return authorization.response;
        const { supabaseAdmin, user } = authorization;

        // A Área Azul é compartilhada por todas as contas de vendedor.
        // O vínculo da conta com um vendedor interno só é usado para validar
        // que a sessão realmente pertence a uma conta vendedor.
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

        const rows: CustomerRow[] = [];
        const fetchSize = 1000;

        try {
          for (let from = 0; ; from += fetchSize) {
            const { data, error } = await supabaseAdmin
              .from("customers")
              .select(
                "codigo,cliente,cidade,uf,telefone,celular,email,ultima_compra,valor_ultima_compra,compra_ano,valor_maior_compra",
              )
              .or(`ultima_compra.lt.${cutoffDate},ultima_compra.is.null`)
              .range(from, from + fetchSize - 1);
            if (error) throw error;

            const batch = (data ?? []) as CustomerRow[];
            rows.push(...batch);
            if (batch.length < fetchSize) break;
          }
        } catch (error) {
          console.error("[seller-blue-area] Falha ao listar clientes:", error);
          return errorResponse("Não foi possível consultar a Área Azul.", 500);
        }

        const filtered = search
          ? rows.filter((customer) => customerSearchText(customer).includes(search))
          : rows;

        filtered.sort((first, second) => {
          if (!first.ultima_compra && second.ultima_compra) return -1;
          if (first.ultima_compra && !second.ultima_compra) return 1;
          if (first.ultima_compra && second.ultima_compra) {
            const byDate = first.ultima_compra.localeCompare(second.ultima_compra);
            if (byDate !== 0) return byDate;
          }
          return (first.cliente ?? "").localeCompare(second.cliente ?? "", "pt-BR");
        });

        const count = filtered.length;
        const from = (page - 1) * pageSize;
        const clients = filtered.slice(from, from + pageSize);

        return Response.json(
          {
            cutoffDate,
            clients,
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
