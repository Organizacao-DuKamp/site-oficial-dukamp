// Traduz mensagens de erro do Supabase Auth para PT-BR.
const MAP: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/invalid email/i, "E-mail inválido."],
  [/email not confirmed/i, "Confirme seu e-mail antes de entrar."],
  [/user already registered|already registered|already exists|duplicate key/i, "Este e-mail já está cadastrado."],
  [/password should be at least (\d+)/i, "A senha deve ter no mínimo $1 caracteres."],
  [/password.*(short|weak)/i, "A senha é muito curta ou fraca."],
  [/passwords?.*(do not|don't)\s*match/i, "As senhas não coincidem."],
  [/email rate limit exceeded|over_email_send_rate_limit|rate limit|too many requests/i, "Muitas tentativas de cadastro. Aguarde alguns minutos, confira sua caixa de entrada e tente novamente somente se não tiver recebido o e-mail."],
  [/database error saving new user/i, "Não foi possível concluir o cadastro. Tente novamente; se o problema continuar, entre em contato com o suporte."],
  [/network|failed to fetch/i, "Falha de conexão. Verifique sua internet."],
  [/user not found/i, "Usuário não encontrado."],
  [/signup.*disabled/i, "Cadastros estão temporariamente desativados."],
  [/captcha/i, "Falha na verificação. Tente novamente."],
  [/token.*(expired|invalid)/i, "Sessão expirada. Entre novamente."],
  [/unauthorized/i, "Não autorizado."],
];

function applyCaptures(template: string, match: RegExpMatchArray): string {
  return template.replace(/\$(\d+)/g, (_, index: string) => match[Number(index)] ?? "");
}

export function traduzErroAuth(msg?: string | null): string {
  if (!msg) return "Ocorreu um erro inesperado. Tente novamente.";

  for (const [re, pt] of MAP) {
    const match = msg.match(re);
    if (match) return applyCaptures(pt, match);
  }

  // Se já estiver em PT-BR, mantém a mensagem original.
  if (/[áéíóúãõç]|senha|e-mail|cadastr|conta/i.test(msg)) return msg;
  return "Ocorreu um erro inesperado. Tente novamente.";
}
