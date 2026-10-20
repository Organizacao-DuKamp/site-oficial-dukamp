import { z } from "zod";

export const RESERVED_STORE_SLUGS = new Set(
  "admin api auth assets build carrinho catalogos checkout contato cotacoes dashboard equipe-de-vendas favicon.ico institucional loja lojas minha-conta minhas-compras orcamento paginas parceiro parceiro-login pedido produtos recuperar-senha robots.txt sitemap.xml sobre unidades vendedor dukamp www static public netlify .netlify".split(
    " ",
  ),
);
export const storeSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífen.")
  .refine((s) => !RESERVED_STORE_SLUGS.has(s), "Este endereço está reservado pela Dukamp.");
export const imageUrlSchema = z
  .string()
  .max(2000)
  .refine((s) => !s || /^https:\/\/[^\s]+$/i.test(s), "Use uma imagem com endereço HTTPS.");
export function safeStoreLink(s: string) {
  if (/^https:\/\/[^\s]+$/i.test(s)) return true;
  if (!/^\/(?!\/)[a-z0-9/#?=._%&+-]*$/i.test(s)) return false;
  try {
    const path = decodeURIComponent(s.split(/[?#]/)[0]);
    return !path.includes("\\") && !path.split("/").some((p) => p === "." || p === "..");
  } catch {
    return false;
  }
}
export const storeConfigSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: storeSlugSchema,
  logo_url: imageUrlSchema.default(""),
  published: z.boolean().default(false),
  tagline: z.string().max(250).default(""),
  email: z.union([z.string().email(), z.literal("")]).default(""),
  phone: z.string().max(30).default(""),
  address: z.string().max(500).default(""),
  hero_title: z.string().max(150).default("Tudo para cuidar de quem você cria"),
  hero_text: z
    .string()
    .max(800)
    .default("Produtos da nossa loja e nutrição Dukamp em um só lugar."),
  accent: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .default("#11834b"),
  pickup_enabled: z.boolean().default(true),
  delivery_enabled: z.boolean().default(false),
  delivery_fee: z.number().min(0).max(100000).default(0),
  delivery_days: z.number().int().min(0).max(120).default(3),
  delivery_cep_prefixes: z
    .array(z.string().regex(/^\d{2,8}$/))
    .max(100)
    .default([]),
  free_shipping_from: z.number().min(0).max(1000000).default(0),
  navbar: z
    .array(
      z.object({
        key: z.string().max(60),
        label: z.string().trim().min(1).max(70),
        to: z.string().max(1000).refine(safeStoreLink, "Use um caminho da loja ou um link HTTPS."),
        visible: z.boolean(),
      }),
    )
    .max(12)
    .default([
      { key: "inicio", label: "Início", to: "/", visible: true },
      { key: "produtos", label: "Produtos", to: "/produtos", visible: true },
      { key: "sobre", label: "Sobre a loja", to: "/sobre", visible: true },
      { key: "contato", label: "Contato", to: "/contato", visible: true },
      { key: "carrinho", label: "Meu carrinho", to: "/carrinho", visible: true },
    ]),
  footer: z
    .record(z.object({ title: z.string().max(150), html: z.string().max(50000) }))
    .default({}),
});
export const storeProductSchema = z.object({
  id: z.string().uuid().optional(),
  version: z.string().datetime({ offset: true }).optional(),
  name: z.string().trim().min(2).max(200),
  code: z.string().trim().max(80).default(""),
  description: z.string().max(30000).default(""),
  category: z.string().trim().max(120).default(""),
  brand: z.string().max(120).default(""),
  unit: z.string().max(30).default("un"),
  images: z.array(imageUrlSchema).max(8).default([]),
  price: z.number().positive().max(1000000),
  cost: z.number().min(0).max(1000000).default(0),
  stock: z.number().int().min(0).max(10000000),
  active: z.boolean().default(true),
});
export const storeCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(180),
  phone: z.string().min(8).max(30),
  document: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .refine((s) => /^\d{11}$|^\d{14}$/.test(s), "Informe CPF ou CNPJ."),
  cep: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .default(""),
  street: z.string().max(200).default(""),
  number: z.string().max(20).default(""),
  neighborhood: z.string().max(120).default(""),
  city: z.string().max(120).default(""),
  state: z.string().max(2).default(""),
  complement: z.string().max(150).default(""),
  notes: z.string().max(1500).default(""),
});
export const storeCheckoutSchema = z
  .object({
    slug: storeSlugSchema,
    request_id: z.string().uuid(),
    access_token: z.string().regex(/^[a-f0-9]{64}$/),
    items: z
      .array(
        z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(10000) }),
      )
      .min(1)
      .max(100),
    customer: storeCustomerSchema,
    fulfillment: z.enum(["pickup", "delivery"]),
    payment_method: z.enum(["pix", "card", "manual"]),
  })
  .superRefine((v, c) => {
    if (v.fulfillment === "delivery")
      for (const k of ["cep", "street", "number", "neighborhood", "city", "state"] as const)
        if (
          !v.customer[k] ||
          (k === "cep" && v.customer.cep.length !== 8) ||
          (k === "state" && !/^[A-Za-z]{2}$/.test(v.customer.state))
        )
          c.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["customer", k],
            message: "Preencha o endereço completo para entrega.",
          });
  });
export type StoreConfig = z.infer<typeof storeConfigSchema>;
export type StoreProductInput = z.infer<typeof storeProductSchema>;
export type StoreProduct = StoreProductInput & { id: string; store_id: string; created_at: string };
export type Store = StoreConfig & {
  id: string;
  partner_id: string;
  created_at: string;
  updated_at: string;
  payment_connected: boolean;
  payment_account: string;
  cnpj: string;
};
export type StoreCheckout = z.infer<typeof storeCheckoutSchema>;
export type StoreOrder = {
  id: string;
  store_id: string;
  order_number: number;
  customer: z.infer<typeof storeCustomerSchema>;
  items: Array<{
    product_id: string;
    name: string;
    unit_price: number;
    quantity: number;
    subtotal: number;
    cost: number;
  }>;
  subtotal: number;
  shipping_cost: number;
  total: number;
  fulfillment: "pickup" | "delivery";
  payment_method: "pix" | "card" | "manual";
  payment_status: string;
  delivery_status: string;
  source: "online" | "manual";
  created_at: string;
  deleted_at: string | null;
  notes: string;
  payment_id: string | null;
  qr_code: string | null;
  qr_image: string | null;
  checkout_url: string | null;
  preference_id?: string | null;
  expires_at: string;
  stock_released: boolean;
};
export function storeDelivery(
  config: Pick<
    StoreConfig,
    | "pickup_enabled"
    | "delivery_enabled"
    | "delivery_fee"
    | "free_shipping_from"
    | "delivery_cep_prefixes"
  >,
  fulfillment: string,
  cep: string,
  subtotal: number,
) {
  if (fulfillment === "pickup") {
    if (!config.pickup_enabled) throw new Error("Retirada não disponível nesta loja.");
    return 0;
  }
  if (
    !config.delivery_enabled ||
    !config.delivery_cep_prefixes.some((p) => cep.replace(/\D/g, "").startsWith(p))
  )
    throw new Error("A loja não entrega neste CEP. Consulte a retirada ou fale com a loja.");
  return config.free_shipping_from > 0 && subtotal >= config.free_shipping_from
    ? 0
    : config.delivery_fee;
}
export function storeTotals(products: StoreProduct[], items: StoreCheckout["items"]) {
  const qty = new Map<string, number>();
  for (const i of items) qty.set(i.product_id, (qty.get(i.product_id) || 0) + i.quantity);
  const lines = [...qty].map(([id, quantity]) => {
    const p = products.find((p) => p.id === id);
    if (!p || !p.active || p.stock < quantity)
      throw new Error(`Produto indisponível ou estoque insuficiente: ${p?.name || id}`);
    return {
      product_id: p.id,
      name: p.name,
      unit_price: p.price,
      quantity,
      subtotal: (Math.round(p.price * 100) * quantity) / 100,
      cost: p.cost,
    };
  });
  return {
    items: lines,
    subtotal: Math.round(lines.reduce((n, i) => n + i.subtotal, 0) * 100) / 100,
  };
}
export function storeMoney(n: number) {
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
