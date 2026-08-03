import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { money, rpc, unreadQuotes, type SellerQuote } from "@/lib/seller-quotes";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SellerQuoteNotifications() {
  const { user, accountType } = useAuth();
  const qc = useQueryClient();
  const [current, setCurrent] = useState<SellerQuote | null>(null);
  const quotes = useQuery({ queryKey: ["seller-quotes", "unread", user?.id], queryFn: unreadQuotes, enabled: !!user && accountType !== "vendedor" && accountType !== "admin", staleTime: 30_000 });
  useEffect(() => { if (!current && quotes.data?.[0]) setCurrent(quotes.data[0]); }, [quotes.data, current]);
  const viewed = useMutation({ mutationFn: (id: string) => rpc("mark_seller_quote_viewed", { _quote_id: id }), onSuccess: () => qc.invalidateQueries({ queryKey: ["seller-quotes"] }) });
  useEffect(() => { if (current && !current.viewed_at && !viewed.isPending) viewed.mutate(current.id); }, [current?.id]);
  const respond = useMutation({ mutationFn: ({ id, accept }: { id: string; accept: boolean }) => rpc("respond_seller_quote", { _quote_id: id, _accept: accept }), onSuccess: (_, vars) => { toast.success(vars.accept ? "Orçamento aceito" : "Orçamento recusado"); setCurrent(null); qc.invalidateQueries({ queryKey: ["seller-quotes"] }); }, onError: (e: Error) => toast.error(e.message) });
  if (!current) return null;
  const total = current.seller_quote_items?.reduce((sum, item) => sum + item.quantity * Number(item.unit_price_snapshot ?? 0), 0) ?? 0;
  return <Dialog open onOpenChange={(open) => { if (!open) { viewed.mutate(current.id); setCurrent(null); } }}>
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Novo orçamento</DialogTitle><DialogDescription>Enviado por {current.seller_name_snapshot ?? current.seller?.full_name ?? "seu vendedor"}.</DialogDescription></DialogHeader>
      <div className="max-h-64 space-y-2 overflow-auto rounded-md border p-3">
        {current.seller_quote_items?.map((item) => <div key={item.id} className="flex justify-between gap-4 text-sm"><span>{item.quantity}× {item.product_name_snapshot}</span><strong>{money(item.quantity * Number(item.unit_price_snapshot))}</strong></div>)}
      </div>
      <div className="flex justify-between text-sm"><span>Válido até {new Date(current.valid_until).toLocaleString("pt-BR")}</span><strong>Total: {money(total)}</strong></div>
      {current.notes && <p className="rounded-md bg-muted p-3 text-sm">{current.notes}</p>}
      <div className="flex justify-end gap-2"><Button variant="outline" disabled={respond.isPending} onClick={() => respond.mutate({ id: current.id, accept: false })}>Recusar</Button><Button disabled={respond.isPending} onClick={() => respond.mutate({ id: current.id, accept: true })}>Aceitar</Button></div>
    </DialogContent>
  </Dialog>;
}
