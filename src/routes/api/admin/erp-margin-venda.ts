import { loadWebSales, normalizeWebSellerCode, webSalesInRange, webSalesTotals } from "@/lib/web-sales.server";
import { createFileRoute } from "@tanstack/react-router";
// A tabela nova ainda não consta dos tipos gerados pelo Lovable Cloud.
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  aggregateSeller,
  normalizeSellerCode,
  sumMargins,
  weekdays,
  type MarginSnapshot,
} from "@/lib/erp-margin";

type Location = "monte-aprazivel" | "sao-jose-do-rio-preto";
const cities: Record<Location, string> = {
  "monte-aprazivel": "Monte Aprazível",
  "sao-jose-do-rio-preto": "São José do Rio Preto",
};
function cityFromRegion(region: string | null): Location | null {
  const normalized = (region ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  if (normalized === "monte aprazivel") return "monte-aprazivel";
  if (normalized === "sao jose do rio preto") return "sao-jose-do-rio-preto";
  return null;
}
function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
async function admin(request: Request) {
  const { authenticateRequest } = await import("@/lib/seller-system.server");
  const result = await authenticateRequest(request);
  if ("response" in result) return result;
  const { data, error } = await result.supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", result.user.id)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  if (error || !data)
    return { response: json({ error: "Acesso restrito ao administrativo." }, 403) } as const;
  return result;
}
function validDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
async function allRows(db: any, table: string, fromMonth: string, toMonth: string) {
  const rows: MarginSnapshot[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from(table)
      .select("*")
      .gte("period_start", fromMonth)
      .lte("period_start", toMonth)
      .order("period_end", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return rows;
}

export const Route = createFileRoute("/api/admin/erp-margin-venda")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authorization = await admin(request);
        if ("response" in authorization) return authorization.response;
        const params = new URL(request.url).searchParams;
        const from = params.get("from"),
          to = params.get("to");
        if (
          !validDate(from) ||
          !validDate(to) ||
          !from ||
          !to ||
          to < from ||
          (Date.parse(to) - Date.parse(from)) / 86_400_000 > 366
        ) {
          return json({ error: "Escolha um período válido de até 367 dias." }, 400);
        }
        try {
          const db = authorization.supabaseAdmin as any;
          const monthStart = `${from.slice(0, 7)}-01`,
            monthEnd = `${to.slice(0, 7)}-01`;
          const [snapshots, monthly, sellersResult, locationsResult, websiteData] = await Promise.all([
            allRows(db, "seller_margin_report_snapshots", monthStart, monthEnd),
            allRows(db, "seller_monthly_margin_reports", monthStart, monthEnd),
            db
              .from("sellers")
              .select("name,slug,region,erp_seller_code,active")
              .not("erp_seller_code", "is", null),
            db.from("erp_seller_locations").select("seller_code,location"),
            loadWebSales(db),
          ]);
          if (sellersResult.error) throw sellersResult.error;
          if (locationsResult.error) throw locationsResult.error;
          const merged = new Map<string, MarginSnapshot>();
          for (const row of monthly)
            merged.set(
              `${normalizeSellerCode(row.report_seller_code)}:${row.period_start}:${row.period_end}`,
              row,
            );
          for (const row of snapshots)
            merged.set(
              `${normalizeSellerCode(row.report_seller_code)}:${row.period_start}:${row.period_end}`,
              row,
            );
          const reports = [...merged.values()];
          const byCode = new Map<string, MarginSnapshot[]>();
          for (const row of reports) {
            const code = normalizeSellerCode(row.report_seller_code);
            byCode.set(code, [...(byCode.get(code) ?? []), row]);
          }
          const sellers = new Map<
            string,
            {
              code: string;
              name: string;
              region: string | null;
              location: Location | null;
              active: boolean;
            }
          >();
          // Os registros conta-* são internos. O cartão público tem a região de atuação.
          for (const row of sellersResult.data ?? []) {
            const code = normalizeSellerCode(row.erp_seller_code);
            if (!code || (sellers.has(code) && row.slug?.startsWith("conta-"))) continue;
            sellers.set(code, {
              code,
              name: row.name,
              region: row.slug?.startsWith("conta-") ? null : row.region,
              location: row.slug?.startsWith("conta-") ? null : cityFromRegion(row.region),
              active: row.active,
            });
          }
          for (const [code, rows] of byCode)
            if (!sellers.has(code))
              sellers.set(code, {
                code,
                name: rows.at(-1)!.report_seller_name,
                region: null,
                location: null,
                active: false,
              });
          const websiteSales = webSalesInRange(websiteData, from, to);
          for (const sale of websiteSales) {
            const code = normalizeWebSellerCode(sale.seller_code) || (sale.seller_id ? `site-${sale.seller_id}` : "sem-vendedor");
            if (!sellers.has(code)) sellers.set(code, { code, name: sale.seller_name || "Vendas do site sem vendedor", region: null, location: null, active: true });
          }
          const overrides = new Map<string, Location>(
            (locationsResult.data ?? []).map((row: any) => [
              normalizeSellerCode(row.seller_code),
              row.location,
            ]),
          );
          const result = [...sellers.values()]
            .map((seller) => {
              const rows = byCode.get(seller.code) ?? [];
              const aggregate = aggregateSeller(rows, from, to);
              const online = webSalesTotals(websiteSales.filter(sale => (normalizeWebSellerCode(sale.seller_code) || (sale.seller_id ? `site-${sale.seller_id}` : "sem-vendedor")) === seller.code));
              aggregate.totals.total_venda += online.total_venda;
              aggregate.totals.total_custo += online.total_custo;
              aggregate.totals.margem_bruta += online.margem_bruta;
              aggregate.totals.tonelagem += online.tonelagem;
              if (online.count) aggregate.covered.push("site");
              const assigned = overrides.get(seller.code) ?? seller.location;
              return {
                ...seller,
                location: assigned,
                locationName: assigned ? cities[assigned] : null,
                ...aggregate,
                websiteSales: online.count, websiteTotal: online.total_venda, unknownWebsiteCosts: online.unknownCostCount,
                lastReport:
                  rows
                    .filter((row) => row.period_end <= to && row.period_end >= from)
                    .sort((a, b) => b.period_end.localeCompare(a.period_end))[0]?.period_end ??
                  null,
              };
            })
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
          return json({
            from,
            to,
            weekdays: weekdays(from, to),
            websiteSales: webSalesTotals(websiteSales),
            sellers: result,
            totals: sumMargins(
              result
                .filter((row) => (row.covered.length && !row.missingBaseline.length) || row.websiteSales > 0)
                .map((row) => row.totals),
            ),
          });
        } catch (error) {
          console.error("[erp-margin-venda] Falha na consulta:", error);
          return json(
            {
              error:
                "Não foi possível consultar as margens. Verifique a migração e tente novamente.",
            },
            500,
          );
        }
      },
      POST: async ({ request }) => {
        const authorization = await admin(request);
        if ("response" in authorization) return authorization.response;
        const payload = await request.json().catch(() => null);
        const code = normalizeSellerCode(payload?.sellerCode);
        const location = payload?.location;
        if (
          !/^\d{1,10}$/.test(code) ||
          (location !== null &&
            location !== "monte-aprazivel" &&
            location !== "sao-jose-do-rio-preto")
        )
          return json({ error: "Código ou local inválido." }, 400);
        const db = authorization.supabaseAdmin as any;
        const [{ data: seller, error: sellerError }, { data: report, error: reportError }] =
          await Promise.all([
            db
              .from("sellers")
              .select("erp_seller_code")
              .in("erp_seller_code", [code, code.padStart(3, "0")])
              .limit(1),
            db
              .from("seller_margin_report_snapshots")
              .select("report_seller_code")
              .in("report_seller_code", [code, code.padStart(3, "0")])
              .limit(1),
          ]);
        if (sellerError || reportError) return json({ error: "Falha ao validar o vendedor." }, 500);
        if (!seller?.length && !report?.length)
          return json({ error: "Código de vendedor não encontrado." }, 404);
        const { error } =
          location === null
            ? await db.from("erp_seller_locations").delete().eq("seller_code", code)
            : await db
                .from("erp_seller_locations")
                .upsert({ seller_code: code, location }, { onConflict: "seller_code" });
        if (error) return json({ error: "Não foi possível salvar o local." }, 500);
        return json({ ok: true });
      },
    },
  },
});
