import type { StoreCheckout } from "@/lib/storefronts";
import { Field } from "@/components/partners/PartnerUi";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
export function newCheckoutSecrets() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return {
    request_id: crypto.randomUUID(),
    access_token: Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""),
  };
}
export const EMPTY_CUSTOMER = {
  name: "",
  email: "",
  phone: "",
  document: "",
  cep: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  complement: "",
  notes: "",
};
export function CustomerFields({
  value,
  onChange,
  delivery,
}: {
  value: StoreCheckout["customer"];
  onChange: (v: StoreCheckout["customer"]) => void;
  delivery: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(
        [
          "name",
          "email",
          "phone",
          "document",
          ...(delivery
            ? ["cep", "street", "number", "neighborhood", "city", "state", "complement"]
            : []),
        ] as (keyof StoreCheckout["customer"])[]
      ).map((k) => (
        <Field
          key={k}
          label={
            {
              name: "Nome completo",
              email: "E-mail",
              phone: "Telefone / WhatsApp",
              document: "CPF / CNPJ",
              cep: "CEP",
              street: "Rua / estrada",
              number: "Número / km",
              neighborhood: "Bairro",
              city: "Cidade",
              state: "UF",
              complement: "Complemento",
              notes: "Observações",
            }[k]
          }
          required={k !== "complement"}
        >
          <Input
            required={k !== "complement"}
            type={k === "email" ? "email" : "text"}
            value={value[k]}
            onChange={(e) =>
              onChange({
                ...value,
                [k]: k === "state" ? e.target.value.toUpperCase().slice(0, 2) : e.target.value,
              })
            }
          />
        </Field>
      ))}
      <div className="sm:col-span-2">
        <Field label="Observações">
          <Textarea
            value={value.notes}
            onChange={(e) => onChange({ ...value, notes: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}
