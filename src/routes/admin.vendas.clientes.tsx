import { createFileRoute } from "@tanstack/react-router";
import { ResourceCrud } from "@/components/admin/ResourceCrud";

export const Route = createFileRoute("/admin/vendas/clientes")({
  component: CustomersAdmin,
});

function CustomersAdmin() {
  return (
    <div className="space-y-6">
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
          { key: "full_name", label: "Contato", format: (v) => v || "—" },
          { key: "phone", label: "Telefone" },
          { key: "account_type", label: "REPR", format: (v) => v === "reseller" ? "1" : "0" },
          { 
            key: "updated_at", 
            label: "Últ. Compra", 
            format: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "—" 
          },
          { key: "cobranca_municipio", label: "COB", format: (v) => v || "—" },
          { 
            key: "cpf", 
            label: "CNPJ/CPF", 
            format: (_, row: any) => row.cpf || row.cnpj || "—" 
          },
          { key: "phone", label: "Celular" },
          { key: "email", label: "Email" },
        ]}
        fields={[
          { name: "full_name", label: "Cliente", required: true },
          { name: "email", label: "Email", required: true },
          { name: "phone", label: "Telefone/Celular" },
          { name: "cpf", label: "CPF" },
          { name: "cnpj", label: "CNPJ" },
          { name: "uf", label: "UF" },
          { name: "municipio_propriedade", label: "Cidade" },
          { name: "cobranca_municipio", label: "Cidade Cobrança" },
          { 
            name: "account_type", 
            label: "Tipo de Conta", 
            type: "select", 
            options: [
              { value: "consumer", label: "Consumidor" },
              { value: "producer", label: "Produtor" },
              { value: "reseller", label: "Revendedor" }
            ] 
          },
        ]}
      />
    </div>
  );
}
