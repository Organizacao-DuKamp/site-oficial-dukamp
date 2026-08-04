import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Truck, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  CORREIOS_TRACKING_URL,
  noTrackingMessage,
  trackingStatusLabel,
} from "@/lib/shipping-status";

export type TrackedOrder = {
  payment_status: string;
  shipping_service?: string | null;
  tracking_code?: string | null;
  tracking_status?: string | null;
  posted_at?: string | null;
  label_created_at?: string | null;
};

export function OrderTracking({ order }: { order: TrackedOrder }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!order.tracking_code) return;
    navigator.clipboard.writeText(order.tracking_code);
    setCopied(true);
    toast.success("Código de rastreamento copiado");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Truck className="h-4 w-4 text-primary" /> Entrega
      </div>

      {order.tracking_code ? (
        <div className="space-y-2">
          <div>
            <div className="text-xs text-muted-foreground">Código de rastreamento</div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="font-mono text-sm font-semibold tracking-wide">{order.tracking_code}</span>
              <Button size="icon" variant="outline" className="h-7 w-7" onClick={copy} title="Copiar código">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={CORREIOS_TRACKING_URL} target="_blank" rel="noopener noreferrer">
                  Rastrear pedido <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </a>
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {order.posted_at
              ? `${trackingStatusLabel(order.tracking_status) ?? "Postado nos Correios"} — postado em ${new Date(order.posted_at).toLocaleDateString("pt-BR")}`
              : "Etiqueta gerada — aguardando postagem."}
            {order.shipping_service ? ` (${order.shipping_service})` : ""}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{noTrackingMessage(order.payment_status)}</p>
      )}
    </div>
  );
}
