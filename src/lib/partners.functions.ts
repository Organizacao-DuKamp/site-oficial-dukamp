import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { partnerSchema, partnerSettingsSchema, partnerAddressSchema } from "./partners";
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
