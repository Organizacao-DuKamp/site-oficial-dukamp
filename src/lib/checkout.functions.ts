import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CEP_ORIGEM = (process.env.CORREIOS_CEP_ORIGEM || "15150104").replace(/\D/g, "");

type ServiceName = "PAC" | "SEDEX";
const SERVICES: Record<ServiceName, { rest: string; legacy: string }> = {
  SEDEX: {
    rest: (process.env.CORREIOS_COD_SEDEX || "03220").trim(),
    legacy: "04014",
  },
  PAC: {
    rest: (process.env.CORREIOS_COD_PAC || "03298").trim(),
    legacy: "04510",
  },
};

type ShippingPackage = {
  pesoKg: number;
  alturaCm: number;
  larguraCm: number;
  comprimentoCm: number;
};

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

async function getServerSupabase(mode: "admin" | "public" = "admin") {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const key = mode === "public" ? publishableKey : serviceKey || publishableKey;

  if (!url || !key) {
    const missing = [
      ...(!url ? ["SUPABASE_URL"] : []),
      ...(!key
        ? [mode === "public" ? "SUPABASE_PUBLISHABLE_KEY" : "SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_PUBLISHABLE_KEY"]
        : []),
    ];
    throw new Error(
      `Supabase não configurado no ambiente atual (faltando: ${missing.join(", ")}). ` +
        `Adicione essas variáveis nas Environment variables do Netlify e faça Clear cache and deploy.`,
    );
  }

  const { createClient } = await import("@supabase/supabase-js");
  const isOpaque = key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        // Novas API keys sb_* são opacas — PostgREST rejeita Authorization: Bearer sb_*
        // como "Invalid API key" / "Expected 3 parts in JWT; got 1".
        if (isOpaque && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}


function translateMpError(msg: string): string {
  const m = (msg || "").toLowerCase();
  if (!m) return "Não foi possível gerar o pagamento. Tente novamente em instantes.";
  if (m.includes("identification")) return "CPF/CNPJ inválido. Verifique o número informado (somente dígitos: 11 para CPF, 14 para CNPJ).";
  if (m.includes("email")) return "E-mail inválido para pagamento. Confira o endereço informado.";
  if (m.includes("amount") || m.includes("transaction_amount")) return "Valor do pedido inválido para pagamento.";
  if (m.includes("payer")) return "Dados do pagador inválidos. Revise nome, e-mail e CPF/CNPJ.";
  if (m.includes("date_of_expiration") || m.includes("expiration")) return "Erro ao definir o prazo do Pix. Tente novamente.";
  if (m.includes("unauthorized") || m.includes("invalid access token")) return "Falha na integração de pagamento. Contate o suporte.";
  return "Não foi possível gerar o pagamento. Verifique seus dados e tente novamente.";
}


function cleanSecret(value?: string) {
  return (value || "").trim();
}

function normalizeCorreiosUser(value?: string) {
  const raw = cleanSecret(value);
  const digits = onlyDigits(raw);
  return digits.length === 11 || digits.length === 14 ? digits : raw;
}

function summarizeCorreiosAuthIssue(attempts: Array<{ name: string; status: number; detail: string }>, usuario: string) {
  const allUnauthorized = attempts.length > 0 && attempts.every((attempt) => attempt.status === 401);
  if (!allUnauthorized) return "";

  const userHint =
    onlyDigits(usuario).length === 14
      ? " O usuário configurado parece ser CNPJ; use o login/idCorreios do Meu Correios, não CNPJ."
      : "";

  return `${userHint} O retorno 401 em todos os endpoints significa que os Correios recusaram o Basic Auth antes de validar contrato/cartão. O problema está em CORREIOS_USUARIO ou CORREIOS_SENHA: o usuário deve ser exatamente o login/idCorreios exibido em Credenciais no CWS, e a senha deve ser o código de acesso às APIs gerado em Gestão de acesso a APIs. Se ambos estiverem corretos, esse contrato/login ainda não está habilitado/autorizado para a API REST nova dos Correios e precisa ser liberado pelo gerente/suporte tecnológico dos Correios.`;
}

function validateCorreiosCredentials(usuario: string, senha: string, cartao: string) {
  const missing: string[] = [];
  if (!usuario) missing.push("CORREIOS_USUARIO");
  if (!senha) missing.push("CORREIOS_SENHA");
  if (!cartao) missing.push("CORREIOS_CARTAO_POSTAGEM");
  if (missing.length) {
    console.error("[Correios] credenciais ausentes", { missing });
    throw new Error(
      `Credenciais Correios ausentes neste ambiente: ${missing.join(", ")}. ` +
        `Adicione esses secrets (e/ou CORREIOS_TOKEN) no ambiente atual do Lovable Cloud — ` +
        `secrets salvos em Produção não são compartilhados com o Preview.`,
    );
  }
}

function toCorreiosDimension(value: unknown, min: number) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return min;
  return Math.min(Math.max(Math.ceil(n), min), 105);
}

function toCorreiosWeight(value: unknown) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(Math.max(n, 0.3), 30);
}

function parseCorreiosXmlTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\/${tag}>`, "i"));
  return match?.[1]?.trim() || "";
}

async function calculateLegacyCorreiosPackage(cepDest: string, servico: ServiceName, pacote: ShippingPackage) {
  const url = new URL("https://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx");
  url.searchParams.set("nCdEmpresa", "");
  url.searchParams.set("sDsSenha", "");
  url.searchParams.set("sCepOrigem", CEP_ORIGEM);
  url.searchParams.set("sCepDestino", cepDest);
  url.searchParams.set("nVlPeso", pacote.pesoKg.toFixed(3));
  url.searchParams.set("nCdFormato", "1");
  url.searchParams.set("nVlComprimento", String(pacote.comprimentoCm));
  url.searchParams.set("nVlAltura", String(pacote.alturaCm));
  url.searchParams.set("nVlLargura", String(pacote.larguraCm));
  url.searchParams.set("nVlDiametro", "0");
  url.searchParams.set("sCdMaoPropria", "N");
  url.searchParams.set("nVlValorDeclarado", "0");
  url.searchParams.set("sCdAvisoRecebimento", "N");
  url.searchParams.set("nCdServico", SERVICES[servico].legacy);
  url.searchParams.set("StrRetorno", "xml");
  url.searchParams.set("nIndicaCalculo", "3");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  let xml = "";
  let res: Response;
  try {
    res = await fetch(url.toString(), { method: "GET", signal: controller.signal });
    xml = await res.text();
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw new Error(`calculador público HTTP ${res.status}`);

  const erro = parseCorreiosXmlTag(xml, "Erro");
  const msgErro = parseCorreiosXmlTag(xml, "MsgErro");
  if (erro && erro !== "0") throw new Error(msgErro || `calculador público retornou erro ${erro}`);

  const valor = Number(parseCorreiosXmlTag(xml, "Valor").replace(".", "").replace(",", "."));
  const prazoDias = Number(parseCorreiosXmlTag(xml, "PrazoEntrega"));
  if (!Number.isFinite(valor) || valor <= 0) throw new Error("calculador público não retornou valor de frete");

  return { valor, prazoDias: Number.isFinite(prazoDias) && prazoDias > 0 ? prazoDias : 7 };
}

async function calculateLegacyCorreiosShipping(cepDest: string, servico: ServiceName, pacotes: ShippingPackage[]) {
  let valor = 0;
  let prazoDias = 0;

  for (const pacote of pacotes) {
    const result = await calculateLegacyCorreiosPackage(cepDest, servico, pacote);
    valor += result.valor;
    prazoDias = Math.max(prazoDias, result.prazoDias);
  }

  return {
    servico,
    valor: Number(valor.toFixed(2)),
    prazoDias: prazoDias || 7,
  };
}

async function calculateCorreiosRestShipping(token: string, cepDest: string, _contrato: string, servico: ServiceName, pacotes: ShippingPackage[]) {
  const cod = SERVICES[servico].rest;
  const headers = { Authorization: `Bearer ${token}`, accept: "application/json" };

  let valor = 0;
  let prazoDias = 0;
  let dataMaxima: string | undefined;

  for (const pacote of pacotes) {
    // ----- PREÇO: GET /preco/v1/nacional/{coProduto}
    const precoUrl = new URL(`https://api.correios.com.br/preco/v1/nacional/${cod}`);
    precoUrl.searchParams.set("cepOrigem", CEP_ORIGEM);
    precoUrl.searchParams.set("cepDestino", cepDest);
    precoUrl.searchParams.set("psObjeto", String(Math.max(1, Math.ceil(pacote.pesoKg * 1000))));
    precoUrl.searchParams.set("tpObjeto", "2");
    precoUrl.searchParams.set("comprimento", String(pacote.comprimentoCm));
    precoUrl.searchParams.set("largura", String(pacote.larguraCm));
    precoUrl.searchParams.set("altura", String(pacote.alturaCm));

    const precoRes = await fetch(precoUrl.toString(), { headers });
    if (!precoRes.ok) {
      const detail = await readCorreiosError(precoRes);
      const restricted = getCorreiosRestrictedApiMessage(detail);
      if (restricted) throw new Error(restricted);
      if (precoRes.status === 401 || precoRes.status === 403) {
        throw new Error(`Correios: token inválido ou sem permissão (HTTP ${precoRes.status}). Verifique CORREIOS_TOKEN.`);
      }
      if (precoRes.status === 404) {
        throw new Error(`Correios: produto ${cod} ou CEP não encontrado (HTTP 404). ${detail.slice(0, 200)}`);
      }
      throw new Error(`Correios preço falhou: ${precoRes.status} ${detail.slice(0, 200)}`);
    }
    const precoJson = (await precoRes.json()) as { pcFinal?: string; txErro?: string };
    if (precoJson.txErro) throw new Error(precoJson.txErro);
    const parsed = Number(String(precoJson.pcFinal || "0").replace(".", "").replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Correios não retornou valor de frete (pcFinal)");
    valor += parsed;

    // ----- PRAZO: GET /prazo/v1/nacional/{coProduto}
    const prazoUrl = new URL(`https://api.correios.com.br/prazo/v1/nacional/${cod}`);
    prazoUrl.searchParams.set("cepOrigem", CEP_ORIGEM);
    prazoUrl.searchParams.set("cepDestino", cepDest);
    const prazoRes = await fetch(prazoUrl.toString(), { headers });
    if (prazoRes.ok) {
      const prazoJson = (await prazoRes.json()) as { prazoEntrega?: number; dataMaxima?: string };
      const p = Number(prazoJson.prazoEntrega ?? 0);
      if (Number.isFinite(p) && p > 0) prazoDias = Math.max(prazoDias, p);
      if (prazoJson.dataMaxima) dataMaxima = prazoJson.dataMaxima;
    }
  }

  return {
    servico,
    valor: Number(valor.toFixed(2)),
    prazoDias: prazoDias || 7,
    dataMaxima,
  };
}

function getCorreiosRestrictedApiMessage(body: string) {
  if (!body.includes("GTW-012") && !body.toLowerCase().includes("api restrita")) return "";

  let apiCode = "34";
  try {
    const parsed = JSON.parse(body) as { msgs?: string[] };
    const message = parsed.msgs?.join(" ") || body;
    apiCode = message.match(/API:\s*(\d+)/i)?.[1] || apiCode;
  } catch {
    apiCode = body.match(/API:\s*(\d+)/i)?.[1] || apiCode;
  }

  return `Correios REST bloqueado: seu usuário autenticou, mas não tem permissão para a API de preços em produção (GTW-012 / API ${apiCode}). Isso não é erro de CEP, peso ou dimensão. Peça aos Correios para liberar no contrato/cartão de postagem o acesso à API REST de Preço Nacional (/preco/v1/nacional, API ${apiCode}) para o idCorreios configurado.`;
}

function isCorreiosPermissionError(message: string) {
  return message.includes("GTW-012") || message.includes("Correios REST bloqueado") || message.toLowerCase().includes("api restrita");
}

async function readCorreiosError(res: Response) {
  const text = await res.text();
  try {
    const json = JSON.parse(text) as { msgs?: string[]; mensagem?: string; message?: string; erro?: string };
    return json.msgs?.join("; ") || json.mensagem || json.message || json.erro || text;
  } catch {
    return text;
  }
}

// ---------- Correios CWS ----------
// Cache em memória do token (válido por ~24h; renovamos a cada 20h).
let cachedCorreiosToken: { token: string; expiresAt: number } | null = null;

async function correiosToken() {
  if (cachedCorreiosToken && cachedCorreiosToken.expiresAt > Date.now()) {
    return { token: cachedCorreiosToken.token };
  }

  const rawUsuario = cleanSecret(process.env.CORREIOS_USUARIO);
  const usuario = normalizeCorreiosUser(process.env.CORREIOS_USUARIO);
  const senha = cleanSecret(process.env.CORREIOS_SENHA);
  const cartao = onlyDigits(cleanSecret(process.env.CORREIOS_CARTAO_POSTAGEM));
  const contrato = onlyDigits(cleanSecret(process.env.CORREIOS_CONTRATO));

  const senhaFingerprint = senha
    ? `${senha.slice(0, 2)}***${senha.slice(-2)} (len=${senha.length})`
    : "vazia";
  const senhaHasWhitespace = /\s/.test(process.env.CORREIOS_SENHA || "");
  const senhaHasQuotes = /["']/.test(process.env.CORREIOS_SENHA || "");
  const usuarioPreview = usuario ? `${usuario.slice(0, 2)}***${usuario.slice(-2)}` : "vazio";

  console.log("[Correios] auth start", {
    usuarioPreview,
    usuarioLen: usuario.length,
    usuarioDigits: onlyDigits(usuario).length,
    usuarioNormalizedEqualsRaw: usuario === rawUsuario,
    senhaFingerprint,
    senhaHasWhitespace,
    senhaHasQuotes,
    cartaoLen: cartao.length,
    contratoLen: contrato.length,
  });

  validateCorreiosCredentials(usuario, senha, cartao);

  const basic = Buffer.from(`${usuario}:${senha}`).toString("base64");
  const headers = { Authorization: `Basic ${basic}`, "Content-Type": "application/json", Accept: "application/json" };
  const attempts: Array<{ name: string; status: number; detail: string }> = [];

  async function tryToken(name: string, url: string, body?: Record<string, string | number>) {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) {
      const json = (await res.json()) as { token: string; ambiente?: string; expiraEm?: string };
      console.log(`[Correios] auth OK via ${name}`, { ambiente: json.ambiente, tokenLen: json.token?.length });
      return json;
    }
    const detail = await readCorreiosError(res);
    attempts.push({ name, status: res.status, detail });
    console.error(`[Correios] ${name} falhou`, { status: res.status, body: detail?.slice(0, 300) });
    return null;
  }

  const defaultToken =
    (await tryToken("autentica-v1", "https://api.correios.com.br/token/v1/autentica")) ||
    (await tryToken("autentica", "https://api.correios.com.br/token/autentica"));

  let issued: { token: string } | null = defaultToken;

  if (!issued && contrato) {
    issued =
      (await tryToken("contrato-v1", "https://api.correios.com.br/token/v1/autentica/contrato", { numero: contrato })) ||
      (await tryToken("contrato", "https://api.correios.com.br/token/autentica/contrato", { numero: contrato }));
  }

  if (!issued) {
    const cardBody: Record<string, string> = { numero: cartao };
    if (contrato) cardBody.contrato = contrato;
    issued =
      (await tryToken("cartaopostagem-v1", "https://api.correios.com.br/token/v1/autentica/cartaopostagem", cardBody)) ||
      (await tryToken("cartaopostagem", "https://api.correios.com.br/token/autentica/cartaopostagem", cardBody));
  }

  if (!issued) {
    const details = attempts
      .map((a) => `${a.name}=${a.status} (${a.detail?.slice(0, 200) || "sem detalhe"})`)
      .join(". ");
    const authIssue = summarizeCorreiosAuthIssue(attempts, usuario);
    throw new Error(`Correios auth falhou: ${attempts.at(-1)?.status || 401}. ${details}.${authIssue}`);
  }

  // cache 20h — o token dos Correios normalmente vale 24h
  cachedCorreiosToken = { token: issued.token, expiresAt: Date.now() + 20 * 60 * 60 * 1000 };
  return { token: issued.token };
}


export const calculateShipping = createServerFn({ method: "POST" })
  .inputValidator((data: { cepDestino: string; servico?: "PAC" | "SEDEX"; items: Array<{ product_id: string; quantity: number }> }) =>
    z
      .object({
        cepDestino: z.string().min(8),
        servico: z.enum(["PAC", "SEDEX"]).optional(),
        items: z
          .array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().positive() }))
          .min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const cepDest = onlyDigits(data.cepDestino);
    if (cepDest.length !== 8) throw new Error("CEP de destino inválido");

    // Buscar dimensões dos produtos
    const supa = await getServerSupabase("public");
    const ids = data.items.map((i) => i.product_id);
    const { data: prods, error } = await supa
      .from("products")
      .select("id,name,peso,altura,largura,comprimento")
      .in("id", ids);
    if (error) {
      const message = error.message || "Falha ao consultar produtos";
      if (/invalid api key/i.test(message)) {
        throw new Error(
          "Backend: chave pública inválida ao consultar produtos para o frete. " +
            "Confira VITE_SUPABASE_PUBLISHABLE_KEY e SUPABASE_PUBLISHABLE_KEY no Netlify e faça Clear cache and deploy.",
        );
      }
      throw new Error(message);
    }

    const pacotes: ShippingPackage[] = [];
    for (const item of data.items) {
      const p = prods?.find((x) => x.id === item.product_id);
      if (!p) continue;
      const pacote = {
        pesoKg: toCorreiosWeight(p.peso),
        alturaCm: toCorreiosDimension(p.altura, 2),
        larguraCm: toCorreiosDimension(p.largura, 11),
        comprimentoCm: toCorreiosDimension(p.comprimento, 16),
      };
      for (let q = 0; q < item.quantity; q += 1) pacotes.push(pacote);
    }

    if (!pacotes.length) throw new Error("Produto inválido no carrinho");

    const services: ServiceName[] = data.servico ? [data.servico] : ["SEDEX", "PAC"];

    const calcOne = async (servico: ServiceName) => {
      let restMsg = "";
      try {
        const envToken = cleanSecret(process.env.CORREIOS_TOKEN);
        const token = envToken || (await correiosToken()).token;
        const contrato = onlyDigits(cleanSecret(process.env.CORREIOS_CONTRATO));
        return await calculateCorreiosRestShipping(token, cepDest, contrato, servico, pacotes);
      } catch (error) {
        restMsg = error instanceof Error ? error.message : String(error);
        // Invalida cache de token em 401/403 para tentar re-autenticar na próxima chamada
        if (/HTTP 401|HTTP 403|token inválido/i.test(restMsg)) {
          cachedCorreiosToken = null;
        }
        console.error(`[Correios] REST falhou (${servico}); tentando calculador público`, {
          reason: restMsg.slice(0, 500),
          packages: pacotes.length,
        });
      }
      // Fallback SEMPRE — inclusive para erros de permissão (GTW-012),
      // pois o calculador público não exige contrato/token.
      try {
        return await calculateLegacyCorreiosShipping(cepDest, servico, pacotes);
      } catch (legacyError) {
        const legacyMsg = legacyError instanceof Error ? legacyError.message : String(legacyError);
        throw new Error(
          `Não foi possível calcular o frete ${servico} para o CEP ${cepDest}. ` +
            `Tente novamente em instantes. Detalhes técnicos — REST: ${restMsg || "n/a"} | Público: ${legacyMsg}`,
        );
      }
    };


    const results = await Promise.allSettled(services.map(calcOne));
    const opcoes = results
      .map((r, i) => (r.status === "fulfilled" ? r.value : null))
      .filter((v): v is NonNullable<typeof v> => v !== null);

    if (!opcoes.length) {
      const firstErr = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      throw new Error(firstErr?.reason instanceof Error ? firstErr.reason.message : "Falha ao calcular frete");
    }

    // Retrocompat: primeiro item = escolha padrão (SEDEX quando ambos)
    const primary = opcoes[0];
    return { ...primary, opcoes };
  });

// ---------- Order + Mercado Pago Pix ----------

// Tabela de taxas do cartão de crédito — canônico no servidor.
// Frontend só EXIBE; o servidor recalcula do zero e ignora qualquer valor enviado.
export const CARD_FEE_TABLE = {
  1: 0.0502, // à vista
  2: 0.0702,
  3: 0.0890,
} as const;
export type CardInstallments = keyof typeof CARD_FEE_TABLE;

export function computePaymentTotals(
  base: number,
  method: "pix" | "card" | "boleto",
  installments: CardInstallments | null,
) {
  const baseAmount = Number(base.toFixed(2));
  if (method === "pix" || method === "boleto") {
    return { baseAmount, feePct: 0, feeAmount: 0, total: baseAmount, installments: null as null };
  }
  const inst = (installments ?? 1) as CardInstallments;
  const feePct = CARD_FEE_TABLE[inst];
  if (feePct == null) throw new Error("Parcelamento inválido");
  const total = Number((baseAmount * (1 + feePct)).toFixed(2));
  const feeAmount = Number((total - baseAmount).toFixed(2));
  return { baseAmount, feePct, feeAmount, total, installments: inst };
}

const orderSchema = z.object({
  customer_name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(8).max(30),
  cpf_cnpj: z.string().min(11).max(20),
  cep: z.string().min(8),
  rua: z.string().min(2).max(200),
  numero: z.string().min(1).max(20),
  complemento: z.string().max(120).optional().nullable(),
  bairro: z.string().min(2).max(120),
  cidade: z.string().min(2).max(120),
  estado: z.string().length(2),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().positive(),
        unit_price: z.number().positive(),
      }),
    )
    .min(1),
  shipping_cost: z.number().nonnegative(),
  shipping_service: z.string().min(1),
  shipping_deadline_days: z.number().int().nonnegative(),
  payment_method: z.enum(["pix", "card"]).default("pix"),
  card_installments: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});


export const createPixOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderSchema.parse(data))
  .handler(async ({ data }) => {
    const supa = await getServerSupabase();

    // Se o usuário estiver logado, associa o pedido a ele
    let authUserId: string | null = null;
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const req = getRequest();
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
      const token = authHeader?.replace(/^Bearer\s+/i, "");
      if (token) {
        const { data: u } = await supa.auth.getUser(token);
        if (u.user?.id) authUserId = u.user.id;
      }
    } catch {
      // segue anônimo
    }

    // Buscar produtos autoritativos (preços/nome/stock)
    const ids = data.items.map((i) => i.product_id);
    const { data: prods, error: pe } = await supa
      .from("products")
      .select("id,name,code,price,consumer_price,producer_price,peso,altura,largura,comprimento,stock,active")
      .in("id", ids);
    if (pe) throw new Error(pe.message);
    if (!prods || prods.length !== ids.length) throw new Error("Produto inválido no carrinho");

    // Monta itens usando o preço enviado pelo cliente, mas validando limites
    let subtotal = 0;
    const orderItems = data.items.map((i) => {
      const p = prods.find((x) => x.id === i.product_id)!;
      if (!p.active) throw new Error(`Produto indisponível: ${p.name}`);
      if ((p.stock ?? 0) < i.quantity) throw new Error(`Estoque insuficiente: ${p.name}`);
      const unit = Number(i.unit_price);
      const sub = unit * i.quantity;
      subtotal += sub;
      return {
        product_id: p.id,
        product_code: p.code,
        name: p.name,
        unit_price: unit,
        quantity: i.quantity,
        subtotal: sub,
        peso: p.peso,
        altura: p.altura,
        largura: p.largura,
        comprimento: p.comprimento,
      };
    });

    // Cálculo AUTORITATIVO de taxas e total (nunca confie no cliente)
    const baseAmount = Number((subtotal + data.shipping_cost).toFixed(2));
    const paymentMethod = data.payment_method ?? "pix";
    const installments =
      paymentMethod === "card" ? ((data.card_installments ?? 1) as CardInstallments) : null;
    const totals = computePaymentTotals(baseAmount, paymentMethod, installments);
    const total = totals.total;

    // Cria ordem
    const { data: order, error: oe } = await supa
      .from("orders")
      .insert({
        user_id: authUserId,
        customer_name: data.customer_name,
        email: data.email,
        phone: data.phone,
        cpf_cnpj: data.cpf_cnpj,
        cep: onlyDigits(data.cep),
        rua: data.rua,
        numero: data.numero,
        complemento: data.complemento || null,
        bairro: data.bairro,
        cidade: data.cidade,
        estado: data.estado.toUpperCase(),
        subtotal,
        shipping_cost: data.shipping_cost,
        shipping_service: data.shipping_service,
        shipping_deadline_days: data.shipping_deadline_days,
        total,
        payment_method: paymentMethod,
        payment_status: "pending",
        payment_base_amount: baseAmount,
        payment_fee: totals.feeAmount,
        card_installments: totals.installments,
      } as any)
      .select("*")
      .single();
    if (oe || !order) throw new Error(oe?.message || "Falha ao criar pedido");

    const { error: ie } = await supa
      .from("order_items")
      .insert(orderItems.map((oi) => ({ ...oi, order_id: order.id })));
    if (ie) throw new Error(ie.message);

    const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN!;
    if (!mpToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN ausente");

    const [firstName, ...rest] = data.customer_name.trim().split(/\s+/);
    const lastName = rest.join(" ") || firstName;
    const cpf = onlyDigits(data.cpf_cnpj);
    if (cpf.length !== 11 && cpf.length !== 14) {
      throw new Error("CPF/CNPJ inválido: informe 11 dígitos (CPF) ou 14 dígitos (CNPJ)");
    }
    const idType = cpf.length === 14 ? "CNPJ" : "CPF";

    const notifBase = process.env.PUBLIC_APP_URL || "https://dukamp.lovable.app";
    const notification_url = `${notifBase.replace(/\/$/, "")}/api/public/mercadopago-webhook`;

    if (paymentMethod === "card") {
      // Cartão de crédito é finalizado inline via Card Payment Brick (tokenização no navegador)
      // e cobrança pelo servidor em `processCardPayment`. Aqui só criamos o pedido pendente.
      return {
        orderId: order.id,
        orderNumber: order.order_number,
        redirectUrl: null as string | null,
        amount: total,
      };
    }

    // ---------- Pix (fluxo original inalterado) ----------
    const expires = new Date(Date.now() + 30 * 60 * 1000);
    const expiresIso = expires.toISOString().replace("Z", "-00:00");

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": order.id,
      },
      body: JSON.stringify({
        transaction_amount: total,
        description: `Pedido ${order.order_number} - Dukamp`,
        payment_method_id: "pix",
        external_reference: order.id,
        notification_url,
        date_of_expiration: expiresIso,
        payer: {
          email: data.email,
          first_name: firstName,
          last_name: lastName,
          identification: { type: idType, number: cpf },
        },
      }),
    });
    if (!mpRes.ok) {
      const raw = await mpRes.text();
      console.error("[MercadoPago] pagamento recusado", mpRes.status, raw);
      let mpMsg = "";
      try {
        const j = JSON.parse(raw) as { message?: string; cause?: Array<{ code?: number; description?: string }> };
        mpMsg = j.cause?.[0]?.description || j.message || "";
      } catch {
        // ignore
      }
      const friendly = translateMpError(mpMsg);
      throw new Error(friendly);
    }
    const mp = (await mpRes.json()) as {
      id: number | string;
      status: string;
      point_of_interaction?: {
        transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string };
      };
    };

    const td = mp.point_of_interaction?.transaction_data;
    await supa
      .from("orders")
      .update({
        mp_payment_id: String(mp.id),
        mp_qr_code: td?.qr_code || null,
        mp_qr_code_base64: td?.qr_code_base64 || null,
        mp_ticket_url: td?.ticket_url || null,
        mp_expires_at: expires.toISOString(),
        payment_status: (mp.status as "pending" | "approved" | "in_process") || "pending",
      })
      .eq("id", order.id);

    return { orderId: order.id, orderNumber: order.order_number, redirectUrl: null as string | null, amount: total };
  });

// Retorna a Public Key do Mercado Pago para o Card Payment Brick no navegador.
export const getMpPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env.MERCADO_PAGO_PUBLIC_KEY;
  if (!key) throw new Error("MERCADO_PAGO_PUBLIC_KEY não configurada");
  return { publicKey: key };
});

const cardPaymentSchema = z.object({
  order_id: z.string().uuid(),
  token: z.string().min(4),
  payment_method_id: z.string().min(2),
  issuer_id: z.string().optional().nullable(),
  installments: z.number().int().min(1).max(3),
  payer: z.object({
    email: z.string().email(),
    identification: z.object({
      type: z.string().min(2),
      number: z.string().min(4),
    }),
  }),
});

// Cobra um pedido pendente via Mercado Pago usando o token de cartão gerado no navegador.
// O valor cobrado é SEMPRE o `orders.total` recalculado no servidor — cliente não pode manipular.
export const processCardPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => cardPaymentSchema.parse(data))
  .handler(async ({ data }) => {
    const supa = await getServerSupabase();
    const { data: order, error } = await supa
      .from("orders")
      .select("id,order_number,total,payment_method,payment_status,card_installments,email,customer_name,cpf_cnpj" as any)
      .eq("id", data.order_id)
      .single<{ id: string; order_number: string; total: number; payment_method: string; payment_status: string; card_installments: number | null; email: string; customer_name: string; cpf_cnpj: string }>();
    if (error || !order) throw new Error("Pedido não encontrado");

    if (order.payment_method !== "card") throw new Error("Pedido não é de cartão de crédito");
    if (order.payment_status === "approved") throw new Error("Pedido já foi pago");
    if (order.card_installments && order.card_installments !== data.installments) {
      throw new Error("Parcelamento diferente do escolhido no pedido");
    }

    const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN!;
    if (!mpToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN ausente");

    const notifBase = process.env.PUBLIC_APP_URL || "https://dukamp.lovable.app";
    const notification_url = `${notifBase.replace(/\/$/, "")}/api/public/mercadopago-webhook`;

    const payRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${order.id}-card`,
      },
      body: JSON.stringify({
        transaction_amount: Number(order.total),
        token: data.token,
        description: `Pedido ${order.order_number} - Dukamp`,
        installments: data.installments,
        payment_method_id: data.payment_method_id,
        issuer_id: data.issuer_id || undefined,
        external_reference: order.id,
        notification_url,
        statement_descriptor: "DUKAMP",
        payer: {
          email: data.payer.email,
          identification: data.payer.identification,
        },
      }),
    });

    const raw = await payRes.text();
    let body: any = {};
    try { body = JSON.parse(raw); } catch {}
    if (!payRes.ok) {
      console.error("[MercadoPago] cartão recusado", payRes.status, raw);
      const mpMsg = body?.cause?.[0]?.description || body?.message || "";
      throw new Error(translateMpError(mpMsg));
    }

    const validStatuses = ["pending", "in_process", "approved", "rejected", "cancelled", "refunded"] as const;
    const rawStatus = String(body.status || "pending");
    const status = (validStatuses as readonly string[]).includes(rawStatus) ? rawStatus : "pending";
    await supa
      .from("orders")
      .update({
        mp_payment_id: String(body.id),
        payment_status: status as any,
      })
      .eq("id", order.id);

    return {
      orderId: order.id,
      status,
      statusDetail: String(body.status_detail || ""),
    };
  });

export const getOrderPublic = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const supa = await getServerSupabase();
    const { data: order, error } = await supa
      .from("orders")
      .select(
        "id,order_number,customer_name,email,total,subtotal,shipping_cost,shipping_service,shipping_deadline_days,payment_method,payment_status,mp_qr_code,mp_qr_code_base64,mp_ticket_url,mp_expires_at,created_at",
      )
      .eq("id", data.id)
      .single();
    if (error || !order) throw new Error("Pedido não encontrado");
    const { data: items } = await supa
      .from("order_items")
      .select("name,quantity,unit_price,subtotal")
      .eq("order_id", data.id);
    return { order, items: items || [] };
  });
