// Tradução dos status de pagamento e rastreio para português (client-safe).

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pagamento pendente",
  in_process: "Pagamento em análise",
  approved: "Pagamento aprovado",
  rejected: "Pagamento recusado",
  cancelled: "Pagamento cancelado",
  refunded: "Pagamento estornado",
};

export const TRACKING_STATUS_LABEL: Record<string, string> = {
  label_created: "Etiqueta gerada",
  awaiting_post: "Aguardando postagem",
  posted: "Postado nos Correios",
  in_transit: "Em trânsito",
  out_for_delivery: "Saiu para entrega",
  delivered: "Entregue",
  failed_delivery: "Não foi possível realizar a entrega",
  returned: "Objeto devolvido ao remetente",
};

export function paymentStatusLabel(status?: string | null) {
  if (!status) return "Status indisponível";
  return PAYMENT_STATUS_LABEL[status] ?? status;
}

export function trackingStatusLabel(status?: string | null) {
  if (!status) return null;
  return TRACKING_STATUS_LABEL[status] ?? status;
}

/** Mensagem para o cliente quando ainda não existe código de rastreio. */
export function noTrackingMessage(paymentStatus?: string | null) {
  if (paymentStatus === "approved") return "Pagamento aprovado. Seu pedido está sendo preparado para envio.";
  if (paymentStatus === "in_process") return "Aguardando confirmação do pagamento.";
  if (paymentStatus === "pending") return "Aguardando confirmação do pagamento.";
  return "Preparando envio.";
}

export const CORREIOS_TRACKING_URL = "https://rastreamento.correios.com.br/app/index.php";
