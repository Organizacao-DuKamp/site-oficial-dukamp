// Traduz mensagens de erro do Supabase Auth para PT-BR.
const MAP: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/invalid email/i, "E-mail inválido."],
  [/email not confirmed/i, "Confirme seu e-mail antes de entrar."],
  [/user already registered|already registered|already exists|duplicate key/i, "Este e-mail já está cadastrado."],
  [/password should be at least (\d+)/i, "A senha deve ter no mínimo $1 caracteres."],
  [/password.*(short|weak)/i, "A senha é muito curta ou fraca."],
  [/passwords?.*(do not|don't)\s*match/i, "As senhas não coincidem."],
  [/rate limit|too many requests/i, "Muitas tentativas. Aguarde alguns instantes e tente novamente."],
  [/network|failed to fetch/i, "Falha de conexão. Verifique sua internet."],
  [/user not found/i, "Usuário não encontrado."],
  [/signup.*disabled/i, "Cadastros estão temporariamente desativados."],
  [/captcha/i, "Falha na verificação. Tente novamente."],
  [/token.*(expired|invalid)/i, "Sessão expirada. Entre novamente."],
  [/unauthorized/i, "Não autorizado."],
];

export function traduzErroAuth(msg?: string | null): string {
  if (!msg) return "Ocorreu um erro inesperado. Tente novamente.";
  for (const [re, pt] of MAP) {
    if (re.test(msg)) return msg.replace(re, pt);
  }
  // se já estiver em PT (tem acento ou palavras comuns), mantém
  if (/[áéíóúãõç]|senha|e-mail|cadastr|conta/i.test(msg)) return msg;
  return "Ocorreu um erro inesperado. Tente novamente.";
}
