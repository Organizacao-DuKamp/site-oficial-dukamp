import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ResourceCrud } from "@/components/admin/ResourceCrud";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/vendas/clientes")({
  component: CustomersAdmin,
});

function CustomersAdmin() {
  return (
    <ResourceCrud
      title="Clientes"
      table="profiles"
      orderBy={{ column: "full_name", ascending: true }}
      searchField="full_name"
      searchPlaceholder="Pesquisar cliente por nome..."
      columns={[
        { key: "full_name", label: "Cliente" },
        { key: "id", label: "Código", format: (v) => v?.slice(0, 8) ?? "—" },
        { key: "municipio_propriedade", label: "Cidade" },
        { key: "uf", label: "UF" },
        { key: "full_name", label: "Contato" }, // Reusing full_name as specific contact field is missing
        { key: "phone", label: "Telefone" },
        { key: "account_type", label: "REPR" }, // REPR usually means representative, using account_type as proxy
        { 
          key: "id", 
          label: "Últ. Compra", 
          // Note: ResourceCrud doesn't support complex joins in columns easily, 
          // but we can add a format that fetches or just leave it for now if we don't want to change ResourceCrud
          format: () => "—" 
        },
        { key: "cobranca_municipio", label: "COB" },
        { 
          key: "cpf", 
          label: "CNPJ/CPF", 
          format: (_, row: any) => row.cpf || row.cnpj || "—" 
        },
        { key: "phone", label: "Celular" }, // Using phone as celular
        { key: "email", label: "Email" },
      ]}
      fields={[
        { name: "full_name", label: "Nome Completo", required: true },
        { name: "email", label: "Email", required: true },
        { name: "phone", label: "Telefone/Celular" },
        { name: "cpf", label: "CPF" },
        { name: "cnpj", label: "CNPJ" },
        { name: "uf", label: "UF" },
        { name: "municipio_propriedade", label: "Cidade" },
        { name: "cobranca_municipio", label: "Cidade Cobrança" },
      ]}
    />
  );
}
