import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  calculateItemIcms,
  consumerPriceFromProducer,
  isSupportedTaxCode,
  normalizeTaxCode,
  roundMoney,
} from "@/lib/tax";

async function getServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase não configurado para calcular impostos.");

  const { createClient } = await import("@supabase/supabase-js");
  const isOpaque = key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (isOpaque && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

const taxInput = z.object({
  destinationUf: z.string().length(2),
  accountType: z.enum(["produtor", "cliente"]).default("cliente"),
  items: z
    .array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().positive() }))
    .min(1),
});

export const calculateCartTax = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => taxInput.parse(data))
  .handler(async ({ data }) => {
    const supa = await getServerSupabase();
    const ids = [...new Set(data.items.map((item) => item.product_id))];
    const { data: products, error } = await supa
      .from("products")
      .select("id,name,active,producer_price,tax_code")
      .in("id", ids);

    if (error) throw new Error(error.message || "Falha ao consultar os produtos para cálculo de ICMS.");
    if (!products || products.length !== ids.length) throw new Error("Há produto inválido no carrinho.");

    let merchandiseAmount = 0;
    let taxAmount = 0;
    const lines = data.items.map((item) => {
      const product = products.find((p: any) => p.id === item.product_id) as any;
      if (!product?.active) throw new Error(`Produto indisponível: ${product?.name || item.product_id}`);

      const taxCode = normalizeTaxCode(product.tax_code);
      if (!isSupportedTaxCode(taxCode)) {
        throw new Error(
          `O produto ${product.name} possui código tributário ${taxCode || "não informado"}. ` +
            "O cálculo automático aceita somente 000 e 040.",
        );
      }

      const producerPrice = Number(product.producer_price ?? 0);
      if (!Number.isFinite(producerPrice) || producerPrice <= 0) {
        throw new Error(`Preço do produtor indisponível: ${product.name}`);
      }

      const unitPrice = data.accountType === "produtor" ? producerPrice : consumerPriceFromProducer(producerPrice);
      const baseAmount = roundMoney(unitPrice * item.quantity);
      const icms = calculateItemIcms(baseAmount, taxCode, data.destinationUf);
      merchandiseAmount = roundMoney(merchandiseAmount + baseAmount);
      taxAmount = roundMoney(taxAmount + icms.amount);

      return {
        productId: product.id,
        name: product.name,
        taxCode,
        unitPrice,
        quantity: item.quantity,
        baseAmount,
        icmsRate: icms.rate,
        taxAmount: icms.amount,
      };
    });

    return {
      destinationUf: data.destinationUf.toUpperCase(),
      merchandiseAmount,
      taxAmount,
      totalWithTax: roundMoney(merchandiseAmount + taxAmount),
      lines,
    };
  });
