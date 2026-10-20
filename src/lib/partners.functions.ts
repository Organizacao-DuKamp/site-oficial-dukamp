import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { partnerSchema, partnerSettingsSchema, partnerAddressSchema, partnerCustomerDetailsSchema } from "./partners";
import { optionChoicesSchema } from "./product-options";

export const partnerQuoteSchema = partnerAddressSchema.extend({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(10000),
        selected_options: optionChoicesSchema,
      }),
    )
    .min(1)
    .max(100),
  fulfillment_method: z.enum(["delivery", "pickup"]).default("delivery"),
  shipping_service: z.string().max(80).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export const partnerBootstrap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { bootstrapPartner } = await import("./partners.server");
    return bootstrapPartner(context.userId);
  });
export const adminPartnerData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAdminPartnerData } = await import("./partners.server");
    return getAdminPartnerData(context.userId);
  });
export const savePartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => partnerSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { upsertPartner } = await import("./partners.server");
    return upsertPartner(context.userId, data);
  });
export const archivePartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { deletePartner } = await import("./partners.server");
    return deletePartner(context.userId, data.id);
  });
export const savePartnerSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => partnerSettingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { updatePartnerSettings } = await import("./partners.server");
    return updatePartnerSettings(context.userId, data);
  });
export const partnerProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getPartnerProducts } = await import("./partners.server");
    return getPartnerProducts(context.userId);
  });
export const quotePartnerPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => partnerQuoteSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { quotePurchase } = await import("./partners.server");
    return quotePurchase(context.userId, data);
  });
export const partnerSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        page: z.number().int().min(1).default(1),
        partnerId: z.string().uuid().optional(),
        admin: z.boolean().default(false),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { getPartnerSales } = await import("./partners.server");
    return getPartnerSales(context.userId, data);
  });
export const partnerSale = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ id: z.string().uuid(), admin: z.boolean().default(false) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { getPartnerSale } = await import("./partners.server");
    return getPartnerSale(context.userId, data.id, data.admin);
  });

export const partnerRequestSchema = partnerQuoteSchema.extend({
  partner_quote_id: z.string().uuid(),
  customer_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().min(8).max(30),
  cpf_cnpj: z.string().transform(v => v.replace(/\D/g, "")).refine(v => /^\d{11}$|^\d{14}$/.test(v), "Informe CPF ou CNPJ."),
  referencia_entrega: z.string().trim().max(300).optional(),
  pessoa_autorizada: z.string().trim().max(120).optional(),
  partner_customer_details: partnerCustomerDetailsSchema,
});
export const submitPartnerSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => partnerRequestSchema.parse(data))
  .handler(async ({ data, context }) => (await import("./partner-requests.server")).submitPartnerRequest(context.userId, data));
export const reviewPartnerSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    id: z.string().uuid(), action: z.enum(["approve", "reject", "delivery"]),
    commission: z.number().finite().min(0).max(9999999999).multipleOf(0.01).optional(),
    reason: z.string().trim().min(3).max(1000).optional(),
    status: z.enum(["preparando", "pronto", "a_caminho", "entregue"]).optional(),
  }).superRefine((v, c) => {
    if (v.action === "approve" && v.commission == null) c.addIssue({ code: "custom", path: ["commission"], message: "Informe a comissão em reais." });
    if (v.action === "reject" && !v.reason) c.addIssue({ code: "custom", path: ["reason"], message: "Informe o motivo da recusa." });
    if (v.action === "delivery" && !v.status) c.addIssue({ code: "custom", path: ["status"], message: "Informe a etapa da entrega." });
  }).parse(data))
  .handler(async ({ data, context }) => (await import("./partner-requests.server")).reviewPartnerRequest(context.userId, data));
export const savePartnerPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ pix_key: z.string().trim().max(180) }).parse(data))
  .handler(async ({ data, context }) => (await import("./partner-requests.server")).updatePartnerPix(context.userId, data.pix_key));
