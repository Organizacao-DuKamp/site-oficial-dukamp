import { PartnerCommissionAccount } from "@/components/partners/PartnerCommissionAccount";
import { formatBRL } from "@/lib/cart";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Archive, Store } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { savePartner, archivePartner } from "@/lib/partners.functions";
import { partnerSchema, type Partner, type PartnerInput } from "@/lib/partners";
import {
  PageHeading,
  useAdminPartnerData,
  ErrorNotice,
  Field,
  fieldClass,
  EmptyState,
} from "@/components/partners/PartnerUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export const Route = createFileRoute("/admin/parceiros/lojas")({ component: PartnersManagement });
const blank = {
  cnpj: "",
  razao_social: "",
  nome_completo: "",
  logo_url: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "SP",
  username: "",
  password: "",
  active: true,
};
function PartnersManagement() {
  const query = useAdminPartnerData();
  const client = useQueryClient();
  const save = useServerFn(savePartner);
  const archive = useServerFn(archivePartner);
  const [form, setForm] = useState<(PartnerInput & { deleted_at?: string | null }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);
  function edit(partner?: Partner) {
    setLogo(null);
    setForm(partner ? { ...partner, password: "" } : { ...blank });
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const parsed = partnerSchema.parse(form);
      if (!parsed.id && !parsed.password) throw new Error("Defina a senha de acesso.");
      if (logo) {
        if (
          !["image/png", "image/jpeg", "image/webp"].includes(logo.type) ||
          logo.size > 2 * 1024 * 1024
        )
          throw new Error("A logo deve ser PNG, JPG ou WebP de até 2 MB.");
        const path = `${crypto.randomUUID()}.${logo.type === "image/png" ? "png" : logo.type === "image/webp" ? "webp" : "jpg"}`;
        const result = await supabase.storage.from("dukamp-partner-logos").upload(path, logo);
        if (result.error) throw result.error;
        parsed.logo_url = supabase.storage
          .from("dukamp-partner-logos")
          .getPublicUrl(path).data.publicUrl;
      }
      await save({ data: parsed });
      await client.invalidateQueries({ queryKey: ["admin-partners"] });
      toast.success(parsed.id ? "Parceiro atualizado." : "Parceria e acesso criados.");
      setForm(null);
    } catch (error) {
      toast.error(error instanceof z.ZodError ? error.issues[0].message : (error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(partner: Partner) {
    if (
      !window.confirm(
        `Excluir o acesso de ${partner.razao_social}? O histórico de vendas será preservado e a parceria poderá ser reativada.`,
      )
    )
      return;
    setBusy(true);
    try {
      await archive({ data: { id: partner.id } });
      await client.invalidateQueries({ queryKey: ["admin-partners"] });
      toast.success("Parceria arquivada e acesso bloqueado.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (query.isPending) return <p>Carregando parceiros...</p>;
  if (query.error) return <ErrorNotice error={query.error} retry={() => query.refetch()} />;
  const rows = query.data.partners.filter(
    (p) =>
      (showArchived || !p.deleted_at) &&
      `${p.razao_social} ${p.cnpj} ${p.cidade} ${p.username}`
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
  );
  const input = (key: keyof PartnerInput, label: string, required = true, type = "text") => (
    <Field key={key} label={label} required={required}>
      <Input
        value={String(form?.[key] || "")}
        type={type}
        required={required}
        minLength={key === "password" ? 10 : undefined}
        maxLength={key === "estado" ? 2 : key === "password" ? 128 : 200}
        autoComplete={key === "password" ? "new-password" : "off"}
        onChange={(e) =>
          setForm((current) => (current ? { ...current, [key]: e.target.value } : current))
        }
      />
    </Field>
  );
  return (
    <>
      <PageHeading
        title="Gerenciar parceiros"
        description="Cadastre lojas, edite seus dados e controle o acesso ao portal."
        action={
          <Button onClick={() => edit()}>
            <Plus className="mr-2 h-4 w-4" />
            Criar parceiro
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <Input
          className="max-w-sm"
          placeholder="Buscar loja, CNPJ, usuário ou cidade"
          aria-label="Buscar parceiros"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Incluir arquivados
        </label>
      </div>
      {!rows.length ? (
        <EmptyState>Nenhum parceiro encontrado.</EmptyState>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map((p) => (
            <div key={p.id} className="rounded-xl border bg-card p-5">
              <div className="flex gap-3">
                {p.logo_url ? (
                  <img
                    src={p.logo_url}
                    alt={`Logo ${p.razao_social}`}
                    className="h-12 w-12 rounded-lg border object-contain"
                  />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Store />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{p.razao_social}</h2>
                  <p className="text-xs text-muted-foreground">
                    CNPJ {p.cnpj} · {p.cidade}/{p.estado}
                  </p>
                  <p className="mt-1 text-xs">
                    {p.deleted_at ? "Arquivado" : p.active ? "Acesso ativo" : "Acesso desativado"}
                  </p>
                </div>
              </div>
              <div className="my-4 space-y-1 text-sm text-muted-foreground">
                <p>Responsável: {p.nome_completo}</p>
                <p>
                  Usuário: <strong className="text-foreground">{p.username}</strong>
                </p>
                <p>
                  {p.rua}, {p.numero} · {p.bairro}
                </p>
              </div>
              <p className="mb-4 text-sm">Comissão a receber: <strong>{formatBRL(Number(query.data.summaries.find(s => s.partner_id === p.id)?.commission_balance || 0))}</strong></p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => edit(p)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Gerenciar{p.deleted_at ? " / reativar" : ""}
                </Button>
                {!p.deleted_at && (
                  <Button disabled={busy} variant="ghost" size="sm" onClick={() => remove(p)}>
                    <Archive className="mr-2 h-4 w-4" />
                    Excluir parceria
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog
        open={!!form}
        onOpenChange={(open) => {
          if (!open && !busy) setForm(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Gerenciar parceria" : "Criar parceiro Dukamp"}</DialogTitle>
            <DialogDescription>
              Campos com * são obrigatórios. A senha fica protegida no sistema de autenticação.
            </DialogDescription>
          </DialogHeader>
          {form?.id && <PartnerCommissionAccount key={form.id} partnerId={form.id} />}
          {form && (
            <form onSubmit={submit} className="space-y-6">
              <section>
                <h3 className="mb-3 font-semibold">Empresa e responsável</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {input("cnpj", "CNPJ")}
                  {input("razao_social", "Razão social")}
                  {input("nome_completo", "Nome completo do responsável")}
                  <div className="grid gap-1.5 text-sm font-medium">
                    <label htmlFor="partner-logo">Logo da empresa (opcional)</label>
                    <input
                      id="partner-logo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="text-sm"
                      onChange={(e) => setLogo(e.target.files?.[0] || null)}
                    />
                    <span className="text-xs text-muted-foreground">
                      PNG, JPG ou WebP · até 2 MB
                    </span>
                    {form.logo_url && (
                      <label className="flex gap-2 text-xs">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) setForm({ ...form, logo_url: "" });
                          }}
                        />
                        Remover logo atual
                      </label>
                    )}
                  </div>
                </div>
              </section>
              <section>
                <h3 className="mb-3 font-semibold">Endereço</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {input("cep", "CEP")}
                  {input("rua", "Rua / estrada")}
                  {input("numero", "Número / KM")}
                  {input("bairro", "Bairro")}
                  {input("cidade", "Cidade")}
                  {input("estado", "Estado (UF)")}
                  {input("complemento", "Complemento", false)}
                </div>
              </section>
              <section>
                <h3 className="mb-3 font-semibold">Acesso ao portal</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {input("username", "Usuário")}
                  {input(
                    "password",
                    form.id
                      ? "Nova senha (deixe em branco para manter)"
                      : "Senha (mínimo 10 caracteres)",
                    !form.id,
                    "password",
                  )}
                </div>
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                  Acesso ativo{form.deleted_at && " (reativa a parceria arquivada)"}
                </label>
                <p className="mt-2 text-xs text-muted-foreground">
                  A loja entra em /parceiro-login com este usuário e senha. Alterar a senha não
                  exige informar a senha atual.
                </p>
              </section>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setForm(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Salvando..." : "Salvar parceiro"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
