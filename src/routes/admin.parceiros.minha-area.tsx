import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { savePartnerSettings } from "@/lib/partners.functions";
import { partnerSettingsSchema, type PartnerSettings } from "@/lib/partners";
import {
  PageHeading,
  useAdminPartnerData,
  ErrorNotice,
  Field,
  fieldClass,
} from "@/components/partners/PartnerUi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/admin/parceiros/minha-area")({
  component: PartnerAreaSettings,
});
function PartnerAreaSettings() {
  const query = useAdminPartnerData();
  if (query.isPending) return <p>Carregando configurações...</p>;
  if (query.error) return <ErrorNotice error={query.error} retry={() => query.refetch()} />;
  return <AreaForm initial={query.data.settings} />;
}
function AreaForm({ initial }: { initial: PartnerSettings }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const save = useServerFn(savePartnerSettings);
  const client = useQueryClient();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save({ data: partnerSettingsSchema.parse(form) });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin-partners"] }),
        client.invalidateQueries({ queryKey: ["partner-area"] }),
      ]);
      toast.success("Área de parceiros atualizada.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Gerenciar minha área"
        description="Personalize a mensagem do portal, os contatos de suporte e as condições apresentadas às lojas."
      />
      <form className="max-w-3xl space-y-5 rounded-xl border bg-card p-5" onSubmit={submit}>
        <Field label="Nome da área" required>
          <Input
            required
            maxLength={100}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Mensagem de boas-vindas">
          <textarea
            className={`${fieldClass} min-h-24 py-3`}
            maxLength={1500}
            value={form.welcome_message}
            onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefone do suporte">
            <Input
              maxLength={30}
              value={form.support_phone}
              onChange={(e) => setForm({ ...form, support_phone: e.target.value })}
            />
          </Field>
          <Field label="E-mail do suporte">
            <Input
              type="email"
              value={form.support_email}
              onChange={(e) => setForm({ ...form, support_email: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Condições da parceria">
          <textarea
            className={`${fieldClass} min-h-64 py-3`}
            maxLength={15000}
            value={form.partnership_terms}
            onChange={(e) => setForm({ ...form, partnership_terms: e.target.value })}
          />
        </Field>
        <p className="rounded-lg bg-muted p-3 text-sm">
          A comissão é de 10% sobre produtos + frete. O pagamento à Dukamp desconta essa comissão;
          taxas do cartão seguem as regras do checkout. Alterar o texto não modifica esses cálculos.
        </p>
        <Button disabled={busy}>{busy ? "Salvando..." : "Salvar minha área"}</Button>
      </form>
    </>
  );
}
