import { Landmark, CalendarClock } from "lucide-react";
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
  return <section className="partner-pix-panel rounded-xl border bg-card p-5">
    <div className="partner-pix-heading mb-4"><span className="partner-pix-icon"><Landmark size={21} /></span><div><h2 className="font-semibold">Recebimento de comissões</h2><span className="partner-pix-status" data-state={data.partner.pix_key ? "ready" : "missing"}>{data.partner.pix_key ? "Chave cadastrada" : "Cadastre sua chave Pix"}</span></div></div>
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
    <div className="partner-pix-deadline mt-5"><CalendarClock size={18} aria-hidden="true" /><p><strong>Até o 10º dia útil</strong><span>Comissões aprovadas no mês são pagas no mês seguinte, nesta chave Pix.</span></p></div>
  </section>;
}
