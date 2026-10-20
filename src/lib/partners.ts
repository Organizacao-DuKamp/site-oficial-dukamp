import { z } from "zod";

export const PARTNER_COMMISSION_RATE = 0.1;
export const PARTNER_QUOTE_MINUTES = 15;
export const PARTNER_LOGIN_DOMAIN = "parceiros.dukamp.com.br";
export const partnerUsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9._-]{2,49}$/,
    "Use de 3 a 50 letras sem acento, números, ponto, traço ou sublinhado.",
  );
export function partnerLoginEmail(username: string) {
  return `${partnerUsernameSchema.parse(username)}@${PARTNER_LOGIN_DOMAIN}`;
}
export function validCnpj(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
  const digit = (base: string) => {
    let weight = base.length - 7;
    const sum = [...base].reduce((total, char) => {
      const result = total + Number(char) * weight;
      weight = weight === 2 ? 9 : weight - 1;
      return result;
    }, 0);
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };
  return (
    digit(digits.slice(0, 12)) === Number(digits[12]) &&
    digit(digits.slice(0, 13)) === Number(digits[13])
  );
}
const text = (max: number) => z.string().trim().min(1, "Preencha este campo.").max(max);
export const partnerAddressSchema = z.object({
  cep: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().length(8, "Informe um CEP com 8 dígitos.")),
  rua: text(200),
  numero: text(20),
  bairro: text(120),
  cidade: text(120),
  estado: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (v) =>
        /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(
          v,
        ),
      "UF inválida.",
    ),
  complemento: z.string().trim().max(120).default(""),
});
export const partnerSchema = partnerAddressSchema.extend({
  id: z.string().uuid().optional(),
  cnpj: z
    .string()
    .refine(validCnpj, "CNPJ inválido.")
    .transform((v) => v.replace(/\D/g, "")),
  razao_social: text(200),
  nome_completo: text(120),
  logo_url: z.union([z.literal(""), z.string().url().startsWith("https://").max(2048)]).default(""),
  username: partnerUsernameSchema,
  password: z
    .string()
    .max(128)
    .refine((v) => !v || v.length >= 10, "Use uma senha com pelo menos 10 caracteres.")
    .optional(),
  active: z.boolean().default(true),
});
export const partnerSettingsSchema = z.object({
  title: text(100),
  welcome_message: z.string().trim().max(1500),
  support_phone: z.string().trim().max(30),
  support_email: z.union([z.literal(""), z.string().email().max(200)]),
  partnership_terms: z.string().trim().max(15000),
});
export const defaultPartnerSettings = {
  title: "Parceiros Dukamp",
  welcome_message: "Sua loja vende. A Dukamp produz, prepara e entrega.",
  support_phone: "",
  support_email: "",
  partnership_terms:
    "O parceiro registra o pedido sem pagamento. A Dukamp entra em contato com o cliente e confirma a compra. Após a confirmação, o administrador aceita a venda e informa a comissão em reais, que fica disponível no painel do parceiro. As comissões aprovadas no mês são pagas pela chave Pix cadastrada até o 10º dia útil do mês seguinte. Preços, estoque, frete e prazos são conferidos na simulação; o estoque é baixado ao aceitar a venda.",
};
export type Partner = z.infer<typeof partnerSchema> & {
  id: string;
  pix_key: string;
  user_id: string;
  created_at: string;
  deleted_at: string | null;
};
export type PartnerSettings = z.infer<typeof partnerSettingsSchema>;

// Work in cents: the provider amount and the commission must always reconcile.
export function partnerAmounts(subtotal: number, shipping: number) {
  if (![subtotal, shipping].every((n) => Number.isFinite(n) && n >= 0))
    throw new Error("Valor inválido.");
  const grossCents = Math.round(subtotal * 100) + Math.round(shipping * 100);
  if (!Number.isSafeInteger(grossCents) || grossCents <= 0) throw new Error("Total inválido.");
  const commissionCents = Math.round(grossCents * PARTNER_COMMISSION_RATE);
  return {
    gross: grossCents / 100,
    commission: commissionCents / 100,
    net: (grossCents - commissionCents) / 100,
  };
}
export type PartnerCartItem = {
  product_id: string;
  quantity: number;
  selected_options: { option_id: string; value_id: string }[];
};
export type PartnerQuoteInput = z.infer<typeof partnerAddressSchema> & {
  items: PartnerCartItem[];
  fulfillment_method: "delivery" | "pickup";
  latitude?: number;
  longitude?: number;
  shipping_service?: string;
};
// Stable across object property order, cart ordering and formatting of CEP/UF.
export function partnerQuoteFingerprint(
  data: Omit<PartnerQuoteInput, "latitude" | "longitude" | "complemento"> & {
    complemento?: string | null;
  },
) {
  return JSON.stringify({
    address: Object.fromEntries(
      ["cep", "rua", "numero", "bairro", "cidade", "estado", "complemento"].map((key) => {
        let value = String(data[key as keyof typeof data] ?? "").trim();
        if (key === "cep") value = value.replace(/\D/g, "");
        if (key === "estado") value = value.toUpperCase();
        return [key, value];
      }),
    ),
    fulfillment_method: data.fulfillment_method,
    items: data.items
      .map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        selected_options: [...(item.selected_options || [])].sort((a, b) =>
          a.option_id.localeCompare(b.option_id),
        ),
      }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  });
}
export function recognizedPartnerSale(order: {
  payment_status: string;
  delivery_status: string;
  refund_status?: string | null;
  request_kind?: string;
  approval_status?: string;
}) {
  return (
    (order.request_kind === "approval" ? order.approval_status === "approved" : order.payment_status === "approved") &&
    order.delivery_status !== "cancelada" &&
    !["requested", "refunded"].includes(order.refund_status ?? "")
  );
}
export const partnerDeliveryLabels: Record<string, string> = {
  preparando: "Preparando",
  pronto: "Pronto para retirada",
  a_caminho: "Enviado",
  entregue: "Entregue",
  cancelada: "Cancelado",
};
export const partnerPaymentLabels: Record<string, string> = {
  pending: "Aguardando pagamento",
  in_process: "Em análise",
  approved: "Pago",
  rejected: "Recusado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};
export const partnerCustomerDetailsSchema = z
  .object({
    inscricao_estadual: z.string().trim().max(40).optional(),
    contato: z.string().trim().max(120).optional(),
    telefone_alternativo: z.string().trim().max(30).optional(),
    propriedade: z.string().trim().max(160).optional(),
    observacoes: z.string().trim().max(2000).optional(),
    cobranca: z
      .object({
        rua: z.string().trim().max(200),
        numero: z.string().trim().max(20),
        bairro: z.string().trim().max(120),
        cep: z.string().trim().max(10),
        cidade: z.string().trim().max(120),
        estado: z.string().trim().max(2),
      })
      .optional(),
  })
  .default({});

export type PartnerInput = z.infer<typeof partnerSchema>;
export type PartnerCustomerDetails = z.infer<typeof partnerCustomerDetailsSchema>;
export type PartnerSummary = {
  partner_id: string;
  registered_orders: number;
  paid_orders: number;
  gross_total: number;
  commission_total: number;
  commission_balance: number;
  commission_paid_total: number;
  dukamp_total: number;
};
export type PartnerProduct = {
  id: string;
  name: string;
  code: string | null;
  images: string[] | null;
  stock: number;
  price: number;
  options: import("./product-options").ProductOption[];
};
export type PartnerCheckoutData = Omit<
  PartnerQuoteInput,
  "latitude" | "longitude" | "complemento"
> & { complemento?: string | null } & {
  partner_quote_id?: string;
  customer_name: string;
  email: string;
  phone: string;
  cpf_cnpj: string;
  referencia_entrega?: string | null;
  pessoa_autorizada?: string | null;
  partner_customer_details?: PartnerCustomerDetails;
  payment_method: "pix" | "card" | "boleto";
  card_installments?: 1 | 2 | 3;
};
export type PartnerOrder = Omit<
  import("@/integrations/supabase/types").Database["public"]["Tables"]["orders"]["Row"],
  "delivery_status"
> & {
  request_kind?: "approval";
  approval_status?: "pending" | "approved" | "rejected";
  commission_payout_month?: string | null;
  commission_paid_at?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  source_store_id?: string | null;
  partner_pix_key?: string;
  partner_id: string;
  partner_quote_id: string;
  origin_store_id?: string | null;
  origin_commission_amount?: number;
  partner_name: string;
  partner_gross_total: number;
  partner_commission_amount: number;
  partner_customer_details: PartnerCustomerDetails;
  delivery_status: string;
  fulfillment_method: "delivery" | "pickup";
  refund_status: string;
  cancellation_reason: string | null;
  referencia_entrega: string | null;
  pessoa_autorizada: string | null;
  tax_amount: number;
  order_items: PartnerOrderItem[];
};
export type PartnerOrderItem = Omit<
  import("@/integrations/supabase/types").Database["public"]["Tables"]["order_items"]["Row"],
  "selected_options"
> & {
  selected_options: import("./product-options").SelectedOption[];
};
export type PartnerStoredQuote = {
  id: string;
  partner_id: string;
  order_id: string | null;
  checkout_hash: string | null;
  expires_at: string;
  gross_total: number;
  commission_amount: number;
  net_total: number;
  subtotal: number;
  shipping_cost: number;
  payload: { fingerprint: string; shipping: { servico: string; prazoDias: number; valor: number } };
};
