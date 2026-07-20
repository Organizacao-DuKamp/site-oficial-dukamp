import { createFileRoute } from "@tanstack/react-router";
import { ResourceCrud } from "@/components/admin/ResourceCrud";

export const Route = createFileRoute("/admin/banners")({
  component: () => (
    <ResourceCrud
      title="Banners"
      table="banners"
      orderBy={{ column: "sort_order" }}
      columns={[
        { key: "title", label: "Título" },
        { key: "active", label: "Ativo", format: (v) => v ? "Sim" : "Não" },
        { key: "sort_order", label: "Ordem" },
      ]}
      fields={[
        { name: "title", label: "Título", required: true },
        { name: "subtitle", label: "Subtítulo" },
        { name: "image_url", label: "Imagem", type: "image", required: true },
        { name: "link_url", label: "Link" },
        { name: "sort_order", label: "Ordem", type: "number", defaultValue: 0 },
        { name: "active", label: "Ativo", type: "boolean", defaultValue: true },
      ]}
    />
  ),
});
