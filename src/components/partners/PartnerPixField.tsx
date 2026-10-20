import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { savePartnerPix } from "@/lib/partners.functions";
import { usePartnerData, Field } from "./PartnerUi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PartnerPixField() {
  const { data, isPending, error } = usePartnerData();
  const save = useServerFn(savePartnerPix);
  const client = useQueryClient();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setKey(data.partner.pix_key || ""); }, [data?.partner.pix_key]);
  if (isPending) return <p>Carregando chave Pix...</p>;
  if (error || !data) return <p role="alert">Não foi possível carregar sua chave Pix.</p>;
  return <section className="rounded-xl border bg-card p-5">
    <h2 className="mb-4 font-semibold">Recebimento de comissões</h2>
    <Field label="Chave Pix">
      <Input value={key} maxLength={180} autoComplete="off" placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" onChange={e => setKey(e.target.value)} />
    </Field>
    <Button type="button" className="mt-4" disabled={busy || key.trim() === (data.partner.pix_key || "")}
      onClick={async () => {
        setBusy(true);
        try {
          await save({ data: { pix_key: key.trim() } });
          await client.invalidateQueries({ queryKey: ["partner-area"] });
          toast.success("Chave Pix atualizada.");
        } catch (e) { toast.error((e as Error).message); }
        finally { setBusy(false); }
      }}>{busy ? "Salvando..." : "Salvar chave Pix"}</Button>
    <p className="mt-4 text-sm text-muted-foreground">
      As comissões aprovadas no mês são pagas até o 10º dia útil do mês seguinte nesta chave Pix. O valor é definido pela Dukamp ao aceitar cada venda e aparece em Gerenciar vendas.
    </p>
  </section>;
}
