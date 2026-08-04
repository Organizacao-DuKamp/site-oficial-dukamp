// Integração com a API de pré-postagem e rastreamento dos Correios (server-only).
// Nenhum código de rastreio é inventado: só gravamos o que os Correios devolvem.

const API = "https://api.correios.com.br";

function cleanSecret(value?: string | null) {
  return (value ?? "").trim().replace(/^["']|["']$/g, "");
}

function onlyDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function correiosToken(): Promise<string> {
  const envToken = cleanSecret(process.env.CORREIOS_TOKEN);
  if (envToken) return envToken;

  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const usuario = cleanSecret(process.env.CORREIOS_USUARIO);
  const senha = cleanSecret(process.env.CORREIOS_SENHA);
  const cartao = onlyDigits(cleanSecret(process.env.CORREIOS_CARTAO_POSTAGEM));
  const contrato = onlyDigits(cleanSecret(process.env.CORREIOS_CONTRATO));

  const missing = [
    ...(!usuario ? ["CORREIOS_USUARIO"] : []),
    ...(!senha ? ["CORREIOS_SENHA"] : []),
    ...(!cartao ? ["CORREIOS_CARTAO_POSTAGEM"] : []),
  ];
  if (missing.length) {
    throw new Error(`Credenciais dos Correios ausentes: ${missing.join(", ")}.`);
  }

  const basic = Buffer.from(`${usuario}:${senha}`).toString("base64");
  const headers = {
    Authorization: `Basic ${basic}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  async function tryToken(url: string, body?: Record<string, string>) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("[Correios] token falhou", { url, status: res.status, detail: detail.slice(0, 300) });
        return null;
      }
      return (await res.json()) as { token: string };
    } catch (e) {
      console.error("[Correios] token erro de rede", { url, message: (e as Error).message });
      return null;
    }
  }

  const cardBody: Record<string, string> = { numero: cartao };
  if (contrato) cardBody.contrato = contrato;

  const issued =
    (await tryToken(`${API}/token/v1/autentica/cartaopostagem`, cardBody)) ||
    (contrato ? await tryToken(`${API}/token/v1/autentica/contrato`, { numero: contrato }) : null) ||
    (await tryToken(`${API}/token/v1/autentica`));

  if (!issued?.token) {
    throw new Error(
      "Não foi possível autenticar nos Correios. Verifique CORREIOS_USUARIO, CORREIOS_SENHA e CORREIOS_CARTAO_POSTAGEM e se o contrato está habilitado para a API de pré-postagem.",
    );
  }

  cachedToken = { token: issued.token, expiresAt: Date.now() + 20 * 60 * 60 * 1000 };
  return issued.token;
}

export type ShippingOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  email: string | null;
  phone: string | null;
  cpf_cnpj: string | null;
  cep: string;
  rua: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  shipping_service: string | null;
};

export type ShippingItem = {
  name: string;
  quantity: number;
  unit_price: number | string;
  peso: number | string | null;
  altura: number | string | null;
  largura: number | string | null;
  comprimento: number | string | null;
};

function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function serviceCodeFor(service?: string | null) {
  const sedex = cleanSecret(process.env.CORREIOS_COD_SEDEX) || "03220";
  const pac = cleanSecret(process.env.CORREIOS_COD_PAC) || "03298";
  return (service || "").toUpperCase().includes("SEDEX") ? sedex : pac;
}

/** Soma peso e calcula um volume único a partir dos itens do pedido. */
export function buildVolume(items: ShippingItem[]) {
  let pesoKg = 0;
  let alturaCm = 2;
  let larguraCm = 11;
  let comprimentoCm = 16;

  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    pesoKg += num(item.peso, 0.3) * qty;
    alturaCm += num(item.altura, 2) * qty;
    larguraCm = Math.max(larguraCm, num(item.largura, 11));
    comprimentoCm = Math.max(comprimentoCm, num(item.comprimento, 16));
  }

  return {
    pesoGramas: Math.max(300, Math.round(pesoKg * 1000)),
    alturaCm: Math.min(100, Math.max(2, Math.round(alturaCm))),
    larguraCm: Math.min(100, Math.max(11, Math.round(larguraCm))),
    comprimentoCm: Math.min(100, Math.max(16, Math.round(comprimentoCm))),
  };
}

/** Valida os dados obrigatórios antes de chamar os Correios. */
export function validateShippingData(order: ShippingOrder) {
  const problems: string[] = [];
  if (onlyDigits(order.cep).length !== 8) problems.push("CEP do destinatário inválido");
  if (!order.rua?.trim()) problems.push("Rua do destinatário");
  if (!order.numero?.trim()) problems.push("Número do endereço");
  if (!order.bairro?.trim()) problems.push("Bairro");
  if (!order.cidade?.trim()) problems.push("Cidade");
  if (!order.estado?.trim()) problems.push("Estado (UF)");
  if (!order.customer_name?.trim()) problems.push("Nome do destinatário");

  const cepOrigem = onlyDigits(cleanSecret(process.env.CORREIOS_CEP_ORIGEM));
  if (cepOrigem.length !== 8) problems.push("CEP de origem (CORREIOS_CEP_ORIGEM)");

  return problems;
}

function remetente() {
  return {
    nome: cleanSecret(process.env.CORREIOS_REMETENTE_NOME) || "Dukamp",
    dddTelefone: onlyDigits(cleanSecret(process.env.CORREIOS_REMETENTE_TELEFONE)).slice(0, 2),
    telefone: onlyDigits(cleanSecret(process.env.CORREIOS_REMETENTE_TELEFONE)).slice(2, 11),
    email: cleanSecret(process.env.CORREIOS_REMETENTE_EMAIL),
    cpfCnpj: onlyDigits(cleanSecret(process.env.CORREIOS_REMETENTE_DOCUMENTO)),
    endereco: {
      cep: onlyDigits(cleanSecret(process.env.CORREIOS_CEP_ORIGEM)),
      logradouro: cleanSecret(process.env.CORREIOS_REMETENTE_LOGRADOURO),
      numero: cleanSecret(process.env.CORREIOS_REMETENTE_NUMERO),
      bairro: cleanSecret(process.env.CORREIOS_REMETENTE_BAIRRO),
      cidade: cleanSecret(process.env.CORREIOS_REMETENTE_CIDADE),
      uf: cleanSecret(process.env.CORREIOS_REMETENTE_UF).toUpperCase(),
    },
  };
}

export type PrepostagemResult = {
  trackingCode: string;
  prepostagemId: string | null;
  serviceCode: string;
};

/** Cria a pré-postagem nos Correios e devolve o código de rastreio REAL. */
export async function createPrepostagem(
  order: ShippingOrder,
  items: ShippingItem[],
): Promise<PrepostagemResult> {
  const token = await correiosToken();
  const cartao = onlyDigits(cleanSecret(process.env.CORREIOS_CARTAO_POSTAGEM));
  const contrato = onlyDigits(cleanSecret(process.env.CORREIOS_CONTRATO));
  const codigoServico = serviceCodeFor(order.shipping_service);
  const volume = buildVolume(items);
  const rem = remetente();
  const telefoneDestino = onlyDigits(order.phone);

  const valorTotal = items.reduce(
    (sum, i) => sum + Number(i.unit_price || 0) * Math.max(1, Number(i.quantity) || 1),
    0,
  );

  const body = {
    idCorreios: cleanSecret(process.env.CORREIOS_USUARIO),
    codigoServico,
    numeroCartaoPostagem: cartao,
    ...(contrato ? { numeroContrato: contrato } : {}),
    remetente: {
      nome: rem.nome,
      dddTelefone: rem.dddTelefone || undefined,
      telefone: rem.telefone || undefined,
      email: rem.email || undefined,
      cpfCnpj: rem.cpfCnpj || undefined,
      endereco: {
        cep: rem.endereco.cep,
        logradouro: rem.endereco.logradouro || undefined,
        numero: rem.endereco.numero || undefined,
        bairro: rem.endereco.bairro || undefined,
        cidade: rem.endereco.cidade || undefined,
        uf: rem.endereco.uf || undefined,
      },
    },
    destinatario: {
      nome: order.customer_name.slice(0, 50),
      dddTelefone: telefoneDestino.slice(0, 2) || undefined,
      telefone: telefoneDestino.slice(2, 11) || undefined,
      email: order.email || undefined,
      cpfCnpj: onlyDigits(order.cpf_cnpj) || undefined,
      endereco: {
        cep: onlyDigits(order.cep),
        logradouro: order.rua.slice(0, 50),
        numero: order.numero.slice(0, 6),
        complemento: (order.complemento || "").slice(0, 30) || undefined,
        bairro: order.bairro.slice(0, 30),
        cidade: order.cidade.slice(0, 30),
        uf: order.estado.slice(0, 2).toUpperCase(),
      },
    },
    codigoFormatoObjetoInformado: "2", // pacote/caixa
    pesoInformado: String(volume.pesoGramas),
    alturaInformada: String(volume.alturaCm),
    larguraInformada: String(volume.larguraCm),
    comprimentoInformado: String(volume.comprimentoCm),
    cienteObjetoNaoProibido: "1",
    solicitarColeta: "N",
    observacao: `Pedido ${order.order_number}`,
    itensDeclaracaoConteudo: items.slice(0, 20).map((i) => ({
      conteudo: i.name.slice(0, 60),
      quantidade: String(Math.max(1, Number(i.quantity) || 1)),
      valor: String(Number(i.unit_price || 0).toFixed(2)),
    })),
    ...(valorTotal > 0 ? { valorNotaFiscal: valorTotal.toFixed(2) } : {}),
  };

  const res = await fetch(`${API}/prepostagem/v1/prepostagens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  if (!res.ok) {
    console.error("[Correios] pré-postagem falhou", { status: res.status, body: raw.slice(0, 600) });
    let msg = `Correios recusou a pré-postagem (HTTP ${res.status}).`;
    try {
      const parsed = JSON.parse(raw) as { msgs?: string[]; msg?: string; mensagem?: string };
      const detail = parsed.msgs?.join(" ") || parsed.msg || parsed.mensagem;
      if (detail) msg += ` ${detail}`;
    } catch {
      if (raw) msg += ` ${raw.slice(0, 200)}`;
    }
    throw new Error(msg);
  }

  let json: any = {};
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("Resposta inválida dos Correios ao criar a pré-postagem.");
  }

  const trackingCode: string | undefined =
    json?.codigoObjeto || json?.objetoPostal?.codigoObjeto || json?.prepostagem?.codigoObjeto;

  if (!trackingCode) {
    console.error("[Correios] pré-postagem sem código de objeto", { body: raw.slice(0, 400) });
    throw new Error(
      "Os Correios criaram a pré-postagem, mas não devolveram o código de rastreamento. Verifique o contrato/faixa de etiquetas.",
    );
  }

  return {
    trackingCode: String(trackingCode).toUpperCase(),
    prepostagemId: json?.id ? String(json.id) : null,
    serviceCode: codigoServico,
  };
}

/** Busca o link do rótulo (etiqueta) quando o contrato permitir. */
export async function fetchLabelUrl(prepostagemId: string): Promise<string | null> {
  try {
    const token = await correiosToken();
    const res = await fetch(
      `${API}/prepostagem/v1/prepostagens/rotulo/assincrono/pdf?idsPrePostagem=${encodeURIComponent(prepostagemId)}&tipoRotulo=P&formatoRotulo=ET&layoutImpressao=PADRAO`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { idRecibo?: string; url?: string };
    return json?.url ?? null;
  } catch (e) {
    console.error("[Correios] rótulo indisponível", { message: (e as Error).message });
    return null;
  }
}

const EVENT_MAP: Array<{ match: RegExp; status: string }> = [
  { match: /entregue/i, status: "delivered" },
  { match: /saiu para entrega/i, status: "out_for_delivery" },
  { match: /tentativa de entrega|carteiro n[ãa]o atendido|n[ãa]o efetuada/i, status: "failed_delivery" },
  { match: /devolvido|devolu[çc][ãa]o/i, status: "returned" },
  { match: /postado/i, status: "posted" },
];

export type TrackingResult = {
  status: string;
  description: string | null;
  postedAt: string | null;
};

/** Consulta o rastreamento (SRO) de um objeto. */
export async function fetchTracking(code: string): Promise<TrackingResult | null> {
  const token = await correiosToken();
  const res = await fetch(`${API}/srorastro/v1/objetos/${encodeURIComponent(code)}?resultado=T`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[Correios] rastreio falhou", { status: res.status, detail: detail.slice(0, 300) });
    return null;
  }
  const json = (await res.json()) as any;
  const objeto = json?.objetos?.[0];
  const eventos: any[] = objeto?.eventos ?? [];
  if (!eventos.length) return { status: "awaiting_post", description: null, postedAt: null };

  const latest = eventos[0];
  const description: string = [latest?.descricao, latest?.unidade?.nome].filter(Boolean).join(" — ");
  const status = EVENT_MAP.find((e) => e.match.test(latest?.descricao || ""))?.status ?? "in_transit";

  const postagem = eventos.find((e) => /postado/i.test(e?.descricao || ""));
  const postedAt = postagem?.dtHrCriado ? new Date(postagem.dtHrCriado).toISOString() : null;

  return { status, description: description || null, postedAt };
}
