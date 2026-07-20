import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { FOOTER_PAGES, footerPageKey, type FooterPageContent } from "@/lib/footer-pages";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/footer")({
  component: FooterAdmin,
});

function FooterAdmin() {
  const [activeSlug, setActiveSlug] = useState(FOOTER_PAGES[0].slug);
  const active = FOOTER_PAGES.find((p) => p.slug === activeSlug)!;
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">Footer — Páginas Institucionais</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Edite o conteúdo de cada página exibida no rodapé. As alterações aparecem imediatamente no site.
      </p>
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="rounded-lg border bg-card p-2 h-fit">
          {(["informacoes", "seguranca"] as const).map((group) => (
            <div key={group} className="mb-2">
              <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                {group === "informacoes" ? "Informações" : "Segurança"}
              </div>
              {FOOTER_PAGES.filter((p) => p.group === group).map((p) => (
                <button
                  key={p.slug}
                  onClick={() => setActiveSlug(p.slug)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${activeSlug === p.slug ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                >
                  {p.title}
                </button>
              ))}
            </div>
          ))}
        </aside>
        <PageEditor key={active.slug} slug={active.slug} defaultTitle={active.title} />
      </div>
    </div>
  );
}

function PageEditor({ slug, defaultTitle }: { slug: string; defaultTitle: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["footer_page", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", footerPageKey(slug))
        .maybeSingle();
      return (data?.value as FooterPageContent | null) ?? null;
    },
  });

  const [title, setTitle] = useState(defaultTitle);
  const [html, setHtml] = useState("");

  useEffect(() => {
    setTitle(data?.title ?? defaultTitle);
    setHtml(data?.html ?? "");
  }, [data, defaultTitle]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: footerPageKey(slug), value: { title, html } }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["footer_page", slug] });
      toast.success("Página salva");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <div>
        <Label>Título da página</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label>Conteúdo</Label>
        <RichTextEditor value={html} onChange={setHtml} />
        <p className="text-xs text-muted-foreground mt-2">
          Use os botões da barra para títulos, subtítulos, negrito, listas e parágrafos.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Salvando..." : "Salvar"}
        </Button>
        <a
          href={`/paginas/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-muted-foreground hover:text-primary underline"
        >
          Ver página no site
        </a>
      </div>
    </div>
  );
}
