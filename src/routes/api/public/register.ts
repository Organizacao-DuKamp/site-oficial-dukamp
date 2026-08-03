import { createFileRoute } from "@tanstack/react-router";

type AccountKind = "cliente" | "produtor" | "empresa";

type RegisterPayload = {
  accountKind?: AccountKind;
  fullName?: string;
  email?: string;
  password?: string;
  phone?: string;
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

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function errorResponse(error: string, status = 400) {
  return Response.json({ error }, { status });
}

export const Route = createFileRoute("/api/public/register")({
  server: {
    handlers: {
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
        const needsExtra = accountKind === "produtor" || accountKind === "empresa";

        if (!accountKind || !ACCOUNT_KINDS.includes(accountKind)) {
          return errorResponse("Tipo de conta inválido.");
        }
        if (!fullName) return errorResponse("Informe seu nome completo.");
        if (!EMAIL_RE.test(email)) return errorResponse("E-mail inválido.");
        if (password.length < 6) return errorResponse("A senha deve ter no mínimo 6 caracteres.");
        if (!phone) return errorResponse("Informe o telefone.");

        if (
          !Number.isFinite(payload.challengeA) ||
          !Number.isFinite(payload.challengeB) ||
          !Number.isFinite(payload.challengeAnswer) ||
          Number(payload.challengeA) + Number(payload.challengeB) !== Number(payload.challengeAnswer)
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

        if (needsExtra) {
          if (!extra.cpf) return errorResponse("Informe o CPF.");
          if (!extra.fazenda) return errorResponse("Informe a Fazenda.");
          if (!extra.cnpjPropriedade) return errorResponse("Informe o CNPJ da propriedade.");
          if (!extra.nomePropriedade) return errorResponse("Informe o nome da propriedade.");
          if (!extra.inscricaoEstadual) return errorResponse("Informe a inscrição estadual.");
          if (!extra.municipioPropriedade) return errorResponse("Informe o município da propriedade.");
          if (!extra.uf) return errorResponse("Selecione o estado.");
          if (
            !extra.cobRua ||
            !extra.cobBairro ||
            !extra.cobNumero ||
            !extra.cobMunicipio ||
            !extra.cobCep ||
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
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            phone,
            requested_type: accountKind,
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

        if (needsExtra) {
          const { error: requestError } = await supabaseAdmin.from("account_requests").insert({
            user_id: userId,
            full_name: fullName,
            email,
            requested_type: accountKind,
            uf: extra.uf,
            cnpj: accountKind === "empresa" ? extra.cnpjPropriedade : null,
            cpf: extra.cpf,
            phone,
            contact_email: extra.cobEmail,
            fazenda: extra.fazenda,
            cnpj_propriedade: extra.cnpjPropriedade,
            nome_propriedade: extra.nomePropriedade,
            inscricao_estadual: extra.inscricaoEstadual,
            municipio_propriedade: extra.municipioPropriedade,
            estado_propriedade: extra.uf,
            cobranca_rua: extra.cobRua,
            cobranca_bairro: extra.cobBairro,
            cobranca_numero: extra.cobNumero,
            cobranca_municipio: extra.cobMunicipio,
            cobranca_cep: extra.cobCep,
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

        return Response.json({ ok: true, needsApproval: needsExtra });
      },
    },
  },
});
