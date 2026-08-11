import type { Database as GeneratedDatabase } from "./types";

type CustomersTable = {
  Row: {
    celular: string | null;
    cidade: string | null;
    cliente: string;
    cnpj_cpf: string | null;
    cob: string | null;
    codigo: string;
    contato: string | null;
    created_at: string;
    email: string | null;
    id: string;
    repr: string | null;
    telefone: string | null;
    uf: string | null;
    ultima_compra: string | null;
    updated_at: string;
  };
  Insert: {
    celular?: string | null;
    cidade?: string | null;
    cliente: string;
    cnpj_cpf?: string | null;
    cob?: string | null;
    codigo: string;
    contato?: string | null;
    created_at?: string;
    email?: string | null;
    id?: string;
    repr?: string | null;
    telefone?: string | null;
    uf?: string | null;
    ultima_compra?: string | null;
    updated_at?: string;
  };
  Update: {
    celular?: string | null;
    cidade?: string | null;
    cliente?: string;
    cnpj_cpf?: string | null;
    cob?: string | null;
    codigo?: string;
    contato?: string | null;
    created_at?: string;
    email?: string | null;
    id?: string;
    repr?: string | null;
    telefone?: string | null;
    uf?: string | null;
    ultima_compra?: string | null;
    updated_at?: string;
  };
  Relationships: [];
};

/**
 * Compatibilidade temporária entre o schema real do Supabase e o arquivo
 * types.ts gerado anteriormente. O projeto real já possui public.customers,
 * mas o snapshot gerado no repositório ainda não contém essa tabela.
 *
 * Quando types.ts for regenerado novamente, este tipo continua compatível e
 * pode ser removido sem alterar as chamadas do cliente Supabase.
 */
export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Tables"> & {
    Tables: GeneratedDatabase["public"]["Tables"] & {
      customers: CustomersTable;
    };
  };
};
