import { createFileRoute } from "@tanstack/react-router";
import { ResourceCrud } from "@/components/admin/ResourceCrud";

export const Route = createFileRoute("/admin/categorias")({
  component: () => (
    <ResourceCrud
      title="Categorias"
      table="categories"
      orderBy={{ column: "sort_order" }}
      columns={[
        { key: "name", label: "Nome" },
        { key: "slug", label: "Slug" },
        { key: "active", label: "Ativo", format: (v) => v ? "Sim" : "Não" },
        { key: "sort_order", label: "Ordem" },
      ]}
      fields={[
        { name: "name", label: "Nome", required: true },
        { name: "slug", label: "Slug (URL)", required: true },
        { name: "description", label: "Descrição", type: "textarea" },
        { name: "image_url", label: "Imagem", type: "image" },
        { name: "sort_order", label: "Ordem", type: "number", defaultValue: 0 },
        { name: "active", label: "Ativo", type: "boolean", defaultValue: true },
      ]}
    />
  ),
});
