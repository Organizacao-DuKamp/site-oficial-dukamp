import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const DUKAMP_FREIGHT_SERVICE = "Frete Dukamp" as const;

const DUKAMP_RATE_PER_KM = 8;
const DUKAMP_DISTANCE_BANDS = [
  50,
  100,
  150,
  200,
  250,
  300,
  350,
  400,
  500,
  600,
  700,
  800,
  900,
  1000,
  1100,
  1200,
  1300,
  1400,
  1500,
  1600,
  1700,
  1800,
  1900,
  2000,
  2200,
  2400,
  2500,
  2800,
  3000,
] as const;

// Referência da matriz/logística em Monte Aprazível (Av. Santos Dumont, 403).
// Pode ser refinada em produção sem alterar código por DUKAMP_ORIGIN_LAT/LNG.
const DEFAULT_DUKAMP_ORIGIN = { lat: -20.76411, lng: -49.7095 };

type ProductForDukampFreight = {
  id: string;
  name: string | null;
  peso?: number | string | null;
  weight?: number | string | null;
  active?: boolean | null;
};

type Coordinates = { latitude: number; longitude: number };

function asNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

/**
 * Regra autoritativa para o Frete Dukamp:
 * - produto próprio (nome contém DUKAMP);
 * - produto em sacaria, identificado pelo peso cadastrado (>= 15 kg)
 *   ou indicação explícita de KG/SACO no nome.
 *
 * Isso evita liberar o frete próprio para medicamentos, utensílios ou itens
 * de terceiros que estejam misturados no carrinho.
 */
export function isDukampBagProduct(product: ProductForDukampFreight) {
  if (product.active === false) return false;
  const name = normalizeText(product.name || "");
  if (!name.includes("DUKAMP")) return false;

  const weightKg = Math.max(asNumber(product.peso), asNumber(product.weight));
  const bagInName = /\b(?:SACO|15\s*KGS?|20\s*KGS?|25\s*KGS?|30\s*KGS?|40\s*KGS?|50\s*KGS?)\b/.test(name);
  return weightKg >= 15 || bagInName;
}

function getOrigin() {
  const lat = asNumber(process.env.DUKAMP_ORIGIN_LAT);
  const lng = asNumber(process.env.DUKAMP_ORIGIN_LNG);
  if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0)) {
    return { lat, lng };
  }
  return DEFAULT_DUKAMP_ORIGIN;
}

function validateCoordinates(coords: Coordinates) {
  return (
    Number.isFinite(coords.latitude) &&
    Number.isFinite(coords.longitude) &&
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
}

async function getRoadDistanceKm(destination: Coordinates) {
  if (!validateCoordinates(destination)) throw new Error("Coordenadas de entrega inválidas");

  const origin = getOrigin();
  const baseUrl = (process.env.DUKAMP_ROUTING_URL || "https://router.project-osrm.org").replace(/\/$/, "");
  const url = `${baseUrl}/route/v1/driving/${origin.lng},${origin.lat};${destination.longitude},${destination.latitude}?overview=false&steps=false`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`roteador HTTP ${response.status}`);
    const body = (await response.json()) as {
      code?: string;
      routes?: Array<{ distance?: number }>;
    };
    const meters = Number(body.routes?.[0]?.distance ?? 0);
    if (body.code !== "Ok" || !Number.isFinite(meters) || meters <= 0) {
      throw new Error("rota rodoviária não encontrada");
    }
    return meters / 1000;
  } finally {
    clearTimeout(timeout);
  }
}

function calculateFromTable(distanceKm: number, totalSacks: number) {
  const bandKm = DUKAMP_DISTANCE_BANDS.find((band) => distanceKm <= band);
  if (!bandKm) {
    throw new Error("Frete Dukamp disponível pela tabela para distâncias de até 3.000 km");
  }

  // Pela tabela: até 400 km considera ida + volta (x2).
  // A partir da faixa de 500 km considera somente a ida (x1).
  const roundTripMultiplier = bandKm <= 400 ? 2 : 1;
  const chargedKm = bandKm * roundTripMultiplier;
  const value = chargedKm * DUKAMP_RATE_PER_KM;

  return {
    servico: DUKAMP_FREIGHT_SERVICE,
    valor: Number(value.toFixed(2)),
    prazoDias: 0,
    distanciaKm: Number(distanceKm.toFixed(1)),
    faixaKm: bandKm,
    kmCobrados: chargedKm,
    idaVolta: roundTripMultiplier === 2,
    totalSacos: totalSacks,
  };
}

async function getServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase não configurado para calcular o Frete Dukamp");

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

const dukampFreightInput = z.object({
  items: z.array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().positive() })).min(1),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const calculateDukampShipping = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => dukampFreightInput.parse(data))
  .handler(async ({ data }) => {
    const supa = await getServerSupabase();
    const ids = [...new Set(data.items.map((item) => item.product_id))];
    const { data: products, error } = await supa
      .from("products")
      .select("id,name,peso,weight,active")
      .in("id", ids);

    if (error) throw new Error(error.message || "Falha ao validar produtos para o Frete Dukamp");
    if (!products || products.length !== ids.length) {
      return {
        option: null,
        status: {
          eligible: false,
          available: false,
          reason: "Há produto inválido ou não encontrado no carrinho.",
        },
      };
    }

    const eligible = products.every((product) => isDukampBagProduct(product));
    if (!eligible) {
      return {
        option: null,
        status: {
          eligible: false,
          available: false,
          reason: "Frete Dukamp disponível somente quando o carrinho contém exclusivamente sacarias da Dukamp.",
        },
      };
    }

    const hasCoordinates = data.latitude != null && data.longitude != null;
    if (!hasCoordinates) {
      return {
        option: null,
        status: {
          eligible: true,
          available: false,
          reason: "Informe latitude e longitude ou escolha o ponto no mapa para calcular o Frete Dukamp.",
        },
      };
    }

    try {
      const distanceKm = await getRoadDistanceKm({
        latitude: data.latitude!,
        longitude: data.longitude!,
      });
      const totalSacks = data.items.reduce((sum, item) => sum + item.quantity, 0);
      const option = calculateFromTable(distanceKm, totalSacks);
      return {
        option,
        status: {
          eligible: true,
          available: true,
          reason: null as string | null,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível calcular a distância";
      return {
        option: null,
        status: {
          eligible: true,
          available: false,
          reason: message.startsWith("Frete Dukamp")
            ? message
            : `Não foi possível calcular a rota do Frete Dukamp: ${message}. Tente novamente em instantes.`,
        },
      };
    }
  });
