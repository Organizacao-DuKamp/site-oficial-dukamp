import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { partnerCommissionAccount, confirmPartnerCommissionPayment } from "@/lib/partners.functions";
import { useAuth } from "@/lib/auth";
import { formatBRL } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "./PartnerUi";

export function PartnerCommissionAccount({ partnerId }: { partnerId?: string }) {
  const { user } = useAuth(), client = useQueryClient();
  const fetch = useServerFn(partnerCommissionAccount), confirmPayment = useServerFn(confirmPartnerCommissionPayment);
  const [page, setPage] = useState(1), [busy, setBusy] = useState(false);
  const attempt = useRef<{ token: string; id: string } | null>(null);
  const query = useQuery({
    queryKey: ["partner-commission-account", user?.id, partnerId || "own", page],
    queryFn: () => fetch({ data: { partnerId, page } }),
    enabled: !!user, refetchInterval: 15000, staleTime: 5000,
  });
  useEffect(() => {
    if (!query.data) return;
    void Promise.all(["partner-area", "admin-partners"].map(key => client.invalidateQueries({ queryKey: [key] })));
  }, [query.data?.balance_token, query.data?.paid_total, client]);
  async function settle() {
    const data = query.data;
    if (!data || !partnerId || busy || data.balance <= 0) return;
    if (!attempt.current || attempt.current.token !== data.balance_token) attempt.current = { token: data.balance_token, id: crypto.randomUUID() };
    setBusy(true);
    try {
      await confirmPayment({ data: { partnerId, requestId: attempt.current.id, amount: data.balance, balanceToken: data.balance_token } });
      await Promise.all(["partner-commission-account","admin-partners","partner-area","partner-sales","partner-sale"].map(key => client.invalidateQueries({ queryKey: [key] })));
      toast.success("Pagamento da comissão confirmado e registrado no histórico.");
    } catch (error) {
      await query.refetch();
      toast.error((error as Error).message);
    } finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-xl border bg-card p-5">
    <h2 className="font-semibold">Comissões e histórico de pagamentos</h2>
    {query.isPending ? <p className="text-sm">Carregando comissões...</p> : query.error ? <ErrorNotice error={query.error} retry={() => query.refetch()} /> : query.data && <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-primary/5 p-4"><p className="text-sm text-muted-foreground">Comissão a receber</p><p className="mt-1 text-2xl font-bold">{formatBRL(query.data.balance)}</p></div>
        <div className="rounded-lg bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Comissões pagas</p><p className="mt-1 text-2xl font-bold">{formatBRL(query.data.paid_total)}</p></div>
      </div>
      {partnerId && <div className="space-y-3 rounded-lg border p-4">
        <p className="break-all text-sm">Chave Pix: <strong>{query.data.pix_key || "Não cadastrada"}</strong></p>
        <p className="text-sm text-muted-foreground">Após fazer o Pix de {formatBRL(query.data.balance)} para {query.data.partner_name}, confirme abaixo para dar baixa nas comissões pendentes. O pagamento ficará registrado na auditoria e no histórico do parceiro.</p>
        <Button type="button" disabled={busy || query.isFetching || query.data.balance <= 0} onClick={settle}>{busy ? "Confirmando..." : "Confirmar pagamento da comissão"}</Button>
      </div>}
      {!partnerId && <p className="text-xs text-muted-foreground">As comissões aprovadas no mês são pagas até o 10º dia útil do mês seguinte. Após a confirmação do Pix pela administração, o saldo é atualizado e o pagamento aparece neste histórico.</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b"><th className="p-3">Pagamento confirmado em</th><th className="p-3">Valor pago</th><th className="p-3">Vendas quitadas</th><th className="p-3">Chave Pix no pagamento</th></tr></thead>
          <tbody>{query.data.history.map(payment => <tr key={payment.id} className="border-b"><td className="whitespace-nowrap p-3">{new Date(payment.paid_at).toLocaleString("pt-BR")}</td><td className="whitespace-nowrap p-3 font-medium">{formatBRL(Number(payment.amount))}</td><td className="p-3">{payment.paid_sales_count}</td><td className="break-all p-3">{payment.pix_key_snapshot || "Não informada"}</td></tr>)}</tbody>
        </table>
        {!query.data.history.length && <p className="p-4 text-sm text-muted-foreground">Nenhum pagamento de comissão registrado.</p>}
      </div>
      {query.data.count > 20 && <div className="flex items-center justify-between gap-3 text-sm">
        <Button type="button" variant="outline" disabled={page === 1 || busy} onClick={() => setPage(page - 1)}>Anterior</Button><span>Página {page} de {Math.ceil(query.data.count / 20)}</span><Button type="button" variant="outline" disabled={page * 20 >= query.data.count || busy} onClick={() => setPage(page + 1)}>Próxima</Button>
      </div>}
    </>}
  </section>;
}
