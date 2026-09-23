// Contas-mestre protegidas do sistema. A autorização crítica também é validada no banco.
export const MASTER_ADMIN_USER_IDS = [
  "fd53c206-dd10-4b36-aa7b-28e4d12ad85b",
  "d73787af-d738-494d-a6bb-07c984b80cae",
] as const;

export function isMasterAdminUserId(userId?: string | null): boolean {
  if (!userId) return false;
  return MASTER_ADMIN_USER_IDS.includes(userId as (typeof MASTER_ADMIN_USER_IDS)[number]);
}

// Mantido por compatibilidade com trechos legados e com a inicialização da conta original.
export const PROTECTED_ADMIN_EMAIL = "dukamp8442@dukamp.local";
