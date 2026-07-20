import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSiteSettings } from "@/lib/site-settings";

export const Route = createFileRoute("/contato")({
  head: () => ({ meta: [{ title: "Contato — Dukamp" }] }),
  component: ContatoPage,
});

function ContatoPage() {
  const { data: settings } = useSiteSettings();
  const email = settings?.email || "contato@dukamp.com.br";
  const phone = settings?.phone || "(00) 0000-0000";
  const address = settings?.address || "—";

  return (
    <SiteLayout>
      <h1 className="text-2xl font-bold">Contato</h1>
      <div className="grid md:grid-cols-2 gap-8 mt-6">
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); toast.success("Mensagem enviada!"); }}
        >
          <Input placeholder="Seu nome" required />
          <Input type="email" placeholder="Seu e-mail" required />
          <Textarea placeholder="Mensagem" rows={5} required />
          <Button type="submit">Enviar</Button>
        </form>
        <div className="text-sm text-muted-foreground space-y-2">
          <div><strong className="text-foreground">E-mail:</strong> {email}</div>
          <div><strong className="text-foreground">Telefone:</strong> {phone}</div>
          <div className="whitespace-pre-line"><strong className="text-foreground">Endereço:</strong> {address}</div>
        </div>
      </div>
    </SiteLayout>
  );
}
