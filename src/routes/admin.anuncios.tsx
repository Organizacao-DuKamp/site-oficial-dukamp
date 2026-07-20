import { createFileRoute } from "@tanstack/react-router";
import { ResourceCrud } from "@/components/admin/ResourceCrud";

export const Route = createFileRoute("/admin/anuncios")({
  component: () => (
    <ResourceCrud
      title="Anúncios Institucionais"
      table="institutional_ads"
      orderBy={{ column: "sort_order" }}
      columns={[
        { key: "title", label: "Título" },
        { key: "active", label: "Ativo", format: (v) => v ? "Sim" : "Não" },
        { key: "sort_order", label: "Ordem" },
      ]}
      fields={[
        { name: "title", label: "Título", required: true },
        { name: "content", label: "Conteúdo", type: "textarea" },
        { name: "media", label: "Imagens / Vídeos", type: "mediaList", defaultValue: [] },
        { name: "link_url", label: "Link" },
        { name: "sort_order", label: "Ordem", type: "number", defaultValue: 0 },
        { name: "active", label: "Ativo", type: "boolean", defaultValue: true },
      ]}
    />
  ),
});
