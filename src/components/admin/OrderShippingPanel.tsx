import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminGenerateShippingLabel, adminRefreshTracking } from "@/lib/shipping.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Loader2,
  Truck,
  Printer,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import {
  CORREIOS_TRACKING_URL,
  paymentStatusLabel,
  trackingStatusLabel,
} from "@/lib/shipping-status";

export type ShippingOrderRow = {
  id: string;
  payment_status: string;
  shipping_service?: string | null;
  tracking_code?: string | null;
  tracking_status?: string | null;
  shipping_label_url?: string | null;
  shipping_error?: string | null;
  posted_at?: string | null;
  label_created_at?: string | null;
  tracking_updated_at?: string | null;
};

function fmt(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("pt-BR");
}

export function OrderShippingPanel({ order }: { order: ShippingOrderRow }) {
  const generate = useServerFn(adminGenerateShippingLabel);
  const refresh = useServerFn(adminRefreshTracking);
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-orders"] });

  const genMutation = useMutation({
    mutationFn: () => generate({ data: { orderId: order.id } }),
    onSuccess: (r) => {
      toast.success(r.message);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao gerar etiqueta"),
  });

  const refreshMutation = useMutation({
    mutationFn: () => refresh({ data: { orderId: order.id } }),
    onSuccess: () => {
      toast.success("Rastreamento atualizado");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar rastreamento"),
  });

  function copy() {
    if (!order.tracking_code) return;
    navigator.clipboard.writeText(order.tracking_code);
    setCopied(true);
    toast.success("Código copiado");
    setTimeout(() => setCopied(false), 1500);
  }

  const approved = order.payment_status === "approved";

  return (
    <div className="w-full mt-3 border-t pt-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Truck className="h-4 w-4 text-primary" /> Envio pelos Correios
      </div>

      {order.tracking_code ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold tracking-wide">{order.tracking_code}</span>
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={copy} title="Copiar código">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <a
              href={CORREIOS_TRACKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              Rastrear nos Correios <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>
              Status: <strong>{trackingStatusLabel(order.tracking_status) ?? "Etiqueta gerada"}</strong>
              {order.shipping_service ? ` — ${order.shipping_service}` : ""}
            </div>
            {fmt(order.label_created_at) && <div>Etiqueta gerada em {fmt(order.label_created_at)}</div>}
            {fmt(order.posted_at) && <div>Postado em {fmt(order.posted_at)}</div>}
            {fmt(order.tracking_updated_at) && <div>Atualizado em {fmt(order.tracking_updated_at)}</div>}
          </div>
          <div className="flex flex-wrap gap-2">
            {order.shipping_label_url && (
              <Button asChild size="sm" variant="outline">
                <a href={order.shipping_label_url} target="_blank" rel="noopener noreferrer">
                  <Printer className="h-4 w-4 mr-1" /> Imprimir etiqueta
                </a>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
            >
              {refreshMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Atualizar rastreio
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Código de rastreamento ainda não gerado. {paymentStatusLabel(order.payment_status)}.
          </p>
          <Button
            size="sm"
            onClick={() => genMutation.mutate()}
            disabled={!approved || genMutation.isPending}
            title={approved ? undefined : "Disponível após a confirmação do pagamento"}
          >
            {genMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Truck className="h-4 w-4 mr-1" />
            )}
            Gerar etiqueta dos Correios
          </Button>
        </div>
      )}

      {order.shipping_error && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{order.shipping_error}</span>
        </div>
      )}
    </div>
  );
}
