import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PageHeading,
  SummaryCards,
  useAdminPartnerData,
  ErrorNotice,
  EmptyState,
} from "@/components/partners/PartnerUi";
import { formatBRL } from "@/lib/cart";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/admin/parceiros/")({ component: PartnerOverview });
function PartnerOverview() {
  const query = useAdminPartnerData();
  if (query.isPending) return <p>Carregando parcerias...</p>;
  if (query.error) return <ErrorNotice error={query.error} retry={() => query.refetch()} />;
  const { partners, summaries } = query.data;
  return (
    <>
      <PageHeading
        title="Visão geral das parcerias"
        description="Acompanhe o resultado de cada loja e os dados de contato da parceria."
        action={
          <Button asChild>
            <Link to="/admin/parceiros/lojas">Gerenciar parceiros</Link>
          </Button>
        }
      />
      <SummaryCards
        summaries={summaries}
        partners={partners.filter((p) => p.active && !p.deleted_at).length}
      />
      {!partners.length ? (
        <EmptyState>Cadastre a primeira loja em Gerenciar parceiros.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60">
              <tr>
                {[
                  "Parceiro / informações",
                  "Vendas confirmadas",
                  "Faturamento",
                  "Comissão",
                  "Pago à Dukamp",
                ].map((t) => (
                  <th key={t} className="whitespace-nowrap p-4 font-medium">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => {
                const s = summaries.find((s) => s.partner_id === p.id);
                return (
                  <tr className="border-t align-top" key={p.id}>
                    <td className="min-w-64 p-4">
                      <details>
                        <summary className="cursor-pointer font-medium">
                          {p.razao_social}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {p.active && !p.deleted_at ? "Ativo" : "Inativo"}
                          </span>
                        </summary>
                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          <p>CNPJ: {p.cnpj}</p>
                          <p>Responsável: {p.nome_completo}</p>
                          <p>Usuário: {p.username}</p>
                          <p>
                            {p.rua}, {p.numero} · {p.bairro}
                          </p>
                          <p>
                            {p.cidade}/{p.estado} · CEP {p.cep}
                          </p>
                          <p>Cadastro: {new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
                        </div>
                      </details>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.cidade}/{p.estado}
                      </p>
                    </td>
                    <td className="p-4">{Number(s?.paid_orders || 0)}</td>
                    <td className="whitespace-nowrap p-4 tabular-nums">
                      {formatBRL(Number(s?.gross_total || 0))}
                    </td>
                    <td className="whitespace-nowrap p-4 tabular-nums">
                      {formatBRL(Number(s?.commission_total || 0))}
                    </td>
                    <td className="whitespace-nowrap p-4 tabular-nums">
                      {formatBRL(Number(s?.dukamp_total || 0))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
