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
        table="customers"
        orderBy={{ column: "cliente", ascending: true }}
        searchField="cliente"
        searchPlaceholder="Pesquisar cliente por nome..."
        columns={[
          { key: "cliente", label: "Cliente" },
          { key: "codigo", label: "Código" },
          { key: "cidade", label: "Cidade" },
          { key: "uf", label: "UF" },
          { key: "contato", label: "Contato", format: (v) => v || "—" },
          { key: "telefone", label: "Telefone", format: (v) => v || "—" },
          { key: "repr", label: "REPR", format: (v) => v || "—" },
          {
            key: "ultima_compra",
            label: "Últ. Compra",
            format: (v) => v ? new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR") : "—",
          },
          { key: "cob", label: "COB", format: (v) => v || "—" },
          { key: "cnpj_cpf", label: "CNPJ/CPF", format: (v) => v || "—" },
          { key: "celular", label: "Celular", format: (v) => v || "—" },
          { key: "email", label: "Email", format: (v) => v || "—" },
        ]}
        fields={[
          { name: "cliente", label: "Cliente", required: true },
          { name: "codigo", label: "Código", required: true },
          { name: "cidade", label: "Cidade" },
          { name: "uf", label: "UF" },
          { name: "contato", label: "Contato" },
          { name: "telefone", label: "Telefone" },
          { name: "repr", label: "REPR" },
          { name: "ultima_compra", label: "Última Compra" },
          { name: "cob", label: "COB" },
          { name: "cnpj_cpf", label: "CNPJ/CPF" },
          { name: "celular", label: "Celular" },
          { name: "email", label: "Email" },
        ]}
      />
    </div>
  );
}
