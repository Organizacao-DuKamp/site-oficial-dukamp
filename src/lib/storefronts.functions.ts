import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  storeConfigSchema,
  storeProductSchema,
  storeCheckoutSchema,
  storeCustomerSchema,
  storeSlugSchema,
} from "./storefronts";
export const storeDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) =>
    z.object({ page: z.number().int().min(1).max(100000).default(1) }).parse(v),
  )
  .handler(async ({ context, data }) =>
    (await import("./storefronts.server")).dashboard(context.userId, data.page),
  );
export const saveStoreConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => storeConfigSchema.parse(v))
  .handler(async ({ context, data }) =>
    (await import("./storefronts.server")).saveStore(context.userId, data),
  );
export const saveStoreProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => storeProductSchema.parse(v))
  .handler(async ({ context, data }) =>
    (await import("./storefronts.server")).saveProduct(context.userId, data),
  );
export const archiveStoreProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) =>
    (await import("./storefronts.server")).deleteProduct(context.userId, data.id),
  );
export const uploadStoreImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) =>
    z
      .object({
        base64: z.string().max(7000000),
        mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
      })
      .parse(v),
  )
  .handler(async ({ context, data }) =>
    (await import("./storefronts.server")).uploadImage(context.userId, data),
  );
export const connectStorePayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) =>
    z
      .object({
        access_token: z
          .string()
          .trim()
          .min(20)
          .max(500)
          .regex(/^APP_USR-/, "Use o Access Token de produção da sua conta."),
        ack_owner: z.literal(true),
      })
      .parse(v),
  )
  .handler(async ({ context, data }) =>
    (await import("./storefronts.server")).connectCredentials(context.userId, data.access_token),
  );
export const disconnectStorePayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) =>
    (await import("./storefronts.server")).disconnectPayments(context.userId),
  );
export const startStoreOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) =>
    (await import("./storefronts.server")).beginOAuth(context.userId),
  );
export const registerStoreSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => storeCheckoutSchema.parse(v))
  .handler(async ({ context, data }) =>
    (await import("./storefronts.server")).createStoreOrder(data, context.userId),
  );
export const updateStoreSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["edit", "delete", "archive", "refresh", "cancel"]),
        patch: z
          .object({
            delivery_status: z.enum(["preparando", "enviado", "entregue"]).optional(),
            notes: z.string().max(1500).optional(),
            customer: storeCustomerSchema.optional(),
          })
          .default({}),
      })
      .parse(v),
  )
  .handler(async ({ context, data }) =>
    (await import("./storefronts.server")).manageStoreOrder(
      context.userId,
      data.id,
      data.action,
      data.patch,
    ),
  );
export const loadStorefront = createServerFn({ method: "GET" })
  .validator((v: unknown) =>
    z.object({ slug: storeSlugSchema, order_page: z.boolean().default(false) }).parse(v),
  )
  .handler(async ({ data }) =>
    (await import("./storefronts.server")).publicStore(data.slug, data.order_page),
  );
export const visitStorefront = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z.object({ slug: storeSlugSchema, visitor: z.string().uuid() }).parse(v),
  )
  .handler(async ({ data }) =>
    (await import("./storefronts.server")).recordVisit(data.slug, data.visitor),
  );
export const checkoutStorefront = createServerFn({ method: "POST" })
  .validator((v: unknown) => storeCheckoutSchema.parse(v))
  .handler(async ({ data }) => (await import("./storefronts.server")).createStoreOrder(data));
export const loadStoreOrder = createServerFn({ method: "GET" })
  .validator((v: unknown) =>
    z
      .object({
        slug: storeSlugSchema,
        id: z.string().uuid(),
        token: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .parse(v),
  )
  .handler(async ({ data }) =>
    (await import("./storefronts.server")).publicOrder(data.slug, data.id, data.token),
  );

export const retryStorePayment = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z
      .object({
        slug: storeSlugSchema,
        id: z.string().uuid(),
        token: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .parse(v),
  )
  .handler(async ({ data }) =>
    (await import("./storefronts.server")).retryPublicStorePayment(data.slug, data.id, data.token),
  );
