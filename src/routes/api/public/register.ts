import { createFileRoute } from "@tanstack/react-router";

type AccountKind = "cliente" | "produtor" | "empresa";
type RequestedAccountKind = "produtor" | "empresa";

type RegisterPayload = {
  accountKind?: AccountKind;
  fullName?: string;
  email?: string;
  password?: string;
  phone?: string;
  sellerId?: string | null;
  cpf?: string;
  fazenda?: string;
  cnpjPropriedade?: string;
  nomePropriedade?: string;
  inscricaoEstadual?: string;
  municipioPropriedade?: string;
  uf?: string;
  cobRua?: string;
  cobBairro?: string;
  cobNumero?: string;
  cobMunicipio?: string;
  cobCep?: string;
  cobTelefone?: string;
  cobEmail?: string;
  isApto?: boolean;
  aptoInfo?: string;
  challengeA?: number;
  challengeB?: number;
  challengeAnswer?: number;
};

const ACCOUNT_KINDS: AccountKind[] = ["cliente", "produtor", "empresa"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function digits(value: unknown, max = Number.POSITIVE_INFINITY): string {
  return text(value).replace(/\D/g, "").slice(0, max);
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const normalized = text(value);
    if (normalized) return normalized;
  }
  return "";
}

function firstValidPhone(...values: unknown[]): string {
  for (const value of values) {
    const normalized = text(value);
    const phoneDigits = digits(normalized);
    if (phoneDigits.length === 10 || phoneDigits.length === 11) return normalized;
  }
  return "";
}

function firstValidCep(...values: unknown[]): string {
  for (const value of values) {
    const normalized = text(value);
    if (digits(normalized).length === 8) return normalized;
  }
  return "";
}

function firstValidUf(...values: unknown[]): string {
  for (const value of values) {
    const normalized = text(value).toUpperCase();
    if (/^[A-Z]{2}$/.test(normalized)) return normalized;
  }
  return "";
}

function errorResponse(error: string, status = 400) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/public/register")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const document = digits(new URL(request.url).searchParams.get("document"), 14);
        if (document.length !== 11 && document.length !== 14) {
          return errorResponse("Informe um CPF ou CNPJ completo.");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("customers")
          .select(
            "cliente, cnpj_cpf, inscricao_estadual, telefone, telefone_2, celular, email, endereco, numero, bairro, cidade, uf, cep, endereco_pagamento, numero_pagamento, bairro_pagamento, cidade_pagamento, uf_pagamento, cep_pagamento, ultima_compra, updated_at",
          )
          .eq("cnpj_cpf", document)
          .order("ultima_compra", { ascending: false, nullsFirst: false })
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("[register-prefill] Falha ao consultar cliente:", error.message);
          return errorResponse("Não foi possível consultar o cadastro. Tente novamente.", 500);
        }

        if (!data) {
          return Response.json({ found: false }, { headers: { "Cache-Control": "no-store" } });
        }

        const phone = firstValidPhone(data.telefone, data.telefone_2, data.celular);
        const email = EMAIL_RE.test(text(data.email).toLowerCase()) ? text(data.email).toLowerCase() : "";
        const propertyAddress = firstText(data.endereco, data.endereco_pagamento);
        const propertyCity = firstText(data.cidade, data.cidade_pagamento);
        const propertyUf = firstValidUf(data.uf, data.uf_pagamento);

        return Response.json(
          {
            found: true,
            customer: {
              fullName: text(data.cliente),
              phone,
              email,
              fazenda: propertyAddress,
              cnpjPropriedade: document.length === 14 ? document : "",
              nomePropriedade: propertyAddress,
              inscricaoEstadual: text(data.inscricao_estadual),
              municipioPropriedade: propertyCity,
              uf: propertyUf,
              cobRua: firstText(data.endereco_pagamento, data.endereco),
              cobBairro: firstText(data.bairro_pagamento, data.bairro),
              cobNumero: firstText(data.numero_pagamento, data.numero),
              cobMunicipio: firstText(data.cidade_pagamento, data.cidade),
              cobCep: firstValidCep(data.cep_pagamento, data.cep),
              cobTelefone: phone,
              cobEmail: email,
            },
          },
          { headers: { "Cache-Control": "private, no-store, max-age=0" } },
        );
      },

      POST: async ({ request }) => {
        let payload: RegisterPayload;

        try {
          payload = (await request.json()) as RegisterPayload;
        } catch {
          return errorResponse("Dados de cadastro inválidos.");
        }

        const accountKind = payload.accountKind;
        const fullName = text(payload.fullName);
        const email = text(payload.email).toLowerCase();
        const password = typeof payload.password === "string" ? payload.password : "";
        const phone = text(payload.phone);
        const sellerId = payload.sellerId == null ? null : text(payload.sellerId);

        if (!accountKind || !ACCOUNT_KINDS.includes(accountKind)) {
          return errorResponse("Tipo de conta inválido.");
        }

        const requestedType: RequestedAccountKind | null =
          accountKind === "produtor" || accountKind === "empresa" ? accountKind : null;

        if (!fullName) return errorResponse("Informe seu nome completo.");
        if (!EMAIL_RE.test(email)) return errorResponse("E-mail inválido.");
        if (password.length < 6) return errorResponse("A senha deve ter no mínimo 6 caracteres.");
        if (!phone) return errorResponse("Informe o telefone.");
        if (sellerId !== null && !UUID_RE.test(sellerId)) {
          return errorResponse("Vendedor inválido.");
        }

        if (
          typeof payload.challengeA !== "number" ||
          typeof payload.challengeB !== "number" ||
          typeof payload.challengeAnswer !== "number" ||
          payload.challengeA + payload.challengeB !== payload.challengeAnswer
        ) {
          return errorResponse("Resposta do desafio incorreta.");
        }

        const extra = {
          cpf: text(payload.cpf),
          fazenda: text(payload.fazenda),
          cnpjPropriedade: text(payload.cnpjPropriedade),
          nomePropriedade: text(payload.nomePropriedade),
          inscricaoEstadual: text(payload.inscricaoEstadual),
          municipioPropriedade: text(payload.municipioPropriedade),
          uf: text(payload.uf),
          cobRua: text(payload.cobRua),
          cobBairro: text(payload.cobBairro),
          cobNumero: text(payload.cobNumero),
          cobMunicipio: text(payload.cobMunicipio),
          cobCep: text(payload.cobCep),
          cobTelefone: text(payload.cobTelefone),
          cobEmail: text(payload.cobEmail).toLowerCase(),
          aptoInfo: text(payload.aptoInfo),
        };

        if (requestedType) {
          const cpfRawDigits = digits(extra.cpf);
          const cnpjRawDigits = digits(extra.cnpjPropriedade);
          const cpfDigits = cpfRawDigits.length === 11 ? cpfRawDigits : "";
          const cnpjDigits = cnpjRawDigits.length === 14 ? cnpjRawDigits : "";

          if (requestedType === "produtor") {
            const hasCpf = cpfDigits.length === 11;
            const hasCnpj = cnpjDigits.length === 14;
            if (!hasCpf && !hasCnpj) return errorResponse("Informe um CPF ou CNPJ válido.");
          } else {
            if (!cpfDigits) return errorResponse("Informe o CPF do responsável.");
            if (!cnpjDigits) return errorResponse("Informe o CNPJ da empresa/propriedade.");
          }

          if (!extra.fazenda) return errorResponse("Informe a Fazenda.");
          if (!extra.nomePropriedade) return errorResponse("Informe o nome da propriedade.");
          if (!extra.inscricaoEstadual) return errorResponse("Informe a inscrição estadual.");
          if (!extra.municipioPropriedade) return errorResponse("Informe o município da propriedade.");
          if (!extra.uf) return errorResponse("Selecione o estado.");
          if (
            !extra.cobRua ||
            !extra.cobBairro ||
            !extra.cobNumero ||
            !extra.cobMunicipio ||
            digits(extra.cobCep, 8).length !== 8 ||
            !extra.cobTelefone ||
            !EMAIL_RE.test(extra.cobEmail)
          ) {
            return errorResponse("Preencha todos os campos da área de cobrança.");
          }
          if (payload.isApto === true && !extra.aptoInfo) {
            return errorResponse("Informe os dados do apartamento.");
          }
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (sellerId) {
          const { data: seller, error: sellerError } = await supabaseAdmin
            .from("sellers")
            .select("id, slug, active")
            .eq("id", sellerId)
            .maybeSingle();

          if (sellerError) {
            console.error("[register] Falha ao validar vendedor:", sellerError.message);
            return errorResponse("Não foi possível validar o vendedor. Tente novamente.", 500);
          }
          if (!seller || !seller.active || !seller.slug?.startsWith("conta-")) {
            return errorResponse("Vendedor inválido ou inativo.");
          }
        }

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            phone,
            requested_type: accountKind,
            selected_seller_id: sellerId,
          },
        });

        if (error) {
          if (/already registered|already exists|duplicate/i.test(error.message)) {
            return errorResponse("Este e-mail já está cadastrado.", 409);
          }
          console.error("[register] Falha ao criar usuário:", error.message);
          return errorResponse("Não foi possível criar a conta. Tente novamente.", 500);
        }

        const userId = data.user?.id;
        if (!userId) return errorResponse("Não foi possível criar a conta. Tente novamente.", 500);

        if (requestedType) {
          const cpfRawDigits = digits(extra.cpf);
          const cnpjRawDigits = digits(extra.cnpjPropriedade);
          const cpfDigits = cpfRawDigits.length === 11 ? cpfRawDigits : "";
          const cnpjDigits = cnpjRawDigits.length === 14 ? cnpjRawDigits : "";
          const { error: requestError } = await supabaseAdmin.from("account_requests").insert({
            user_id: userId,
            full_name: fullName,
            email,
            requested_type: requestedType,
            uf: extra.uf,
            cnpj: cnpjDigits.length === 14 ? cnpjDigits : null,
            cpf: cpfDigits.length === 11 ? cpfDigits : null,
            phone,
            contact_email: extra.cobEmail,
            fazenda: extra.fazenda,
            cnpj_propriedade: cnpjDigits.length === 14 ? cnpjDigits : null,
            nome_propriedade: extra.nomePropriedade,
            inscricao_estadual: extra.inscricaoEstadual,
            municipio_propriedade: extra.municipioPropriedade,
            estado_propriedade: extra.uf,
            cobranca_rua: extra.cobRua,
            cobranca_bairro: extra.cobBairro,
            cobranca_numero: extra.cobNumero,
            cobranca_municipio: extra.cobMunicipio,
            cobranca_cep: digits(extra.cobCep, 8),
            cobranca_telefone: extra.cobTelefone,
            cobranca_email: extra.cobEmail,
            is_apartamento: payload.isApto === true,
            apartamento_info: payload.isApto === true ? extra.aptoInfo : null,
          });

          if (requestError) {
            console.error("[register] Falha ao criar solicitação:", requestError.message);
            await supabaseAdmin.auth.admin.deleteUser(userId);
            return errorResponse("Não foi possível salvar a solicitação. Tente novamente.", 500);
          }
        }

        return Response.json({ ok: true, needsApproval: requestedType !== null });
      },
    },
  },
});
