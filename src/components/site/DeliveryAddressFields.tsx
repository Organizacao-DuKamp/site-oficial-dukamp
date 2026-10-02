import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAZIL_STATES, DELIVERY_LABELS, OPTIONAL_DELIVERY_FIELDS, type DeliveryAddress } from "@/lib/customer-profile";

export function DeliveryAddressFields({ address, onChange, loadingCep }: {
  address: DeliveryAddress; onChange: (key: keyof DeliveryAddress, value: string) => void; loadingCep: boolean;
}) {
  return <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
    <h3 className="font-semibold">Endereço de entrega</h3>
    <p className="text-sm text-muted-foreground">Preencha o CEP para buscar seu endereço. Confira os dados e informe o número. Os campos com * são obrigatórios.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      {(Object.keys(DELIVERY_LABELS) as (keyof DeliveryAddress)[]).map(key => {
        const required = !OPTIONAL_DELIVERY_FIELDS.includes(key);
        const value = address[key];
        const valid = key === "cep" ? value.replace(/\D/g, "").length === 8 : key === "estado" ? BRAZIL_STATES.includes(value) : Boolean(value.trim());
        const props = { id: `delivery-${key}`, value, required, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange(key, e.target.value), className: required || value ? valid ? "border-green-600 focus-visible:ring-green-600/40" : "border-red-500 focus-visible:ring-red-500/40" : "" };
        return <div key={key} className={key === "rua" || key === "referencia_entrega" ? "sm:col-span-2" : ""}>
          <Label htmlFor={props.id}>{DELIVERY_LABELS[key]}{required ? " *" : " (opcional)"}</Label>
          {key === "estado" ? <select {...props} autoComplete="address-level1" className={`flex h-10 w-full rounded-md border bg-background px-3 text-sm ${props.className}`}>
            <option value="">Selecione o estado</option>{BRAZIL_STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select> : <Input {...props} inputMode={key === "cep" ? "numeric" : "text"} maxLength={key === "cep" ? 9 : key === "numero" ? 20 : key === "referencia_entrega" ? 300 : key === "rua" ? 200 : 120} placeholder={key === "cep" ? "00000-000" : key === "numero" ? "Número ou S/N" : undefined} autoComplete={key === "cep" ? "postal-code" : key === "cidade" ? "address-level2" : key === "rua" ? "address-line1" : "off"} />}
          {key === "cep" && loadingCep && <p className="mt-1 text-xs text-muted-foreground" role="status">Buscando endereço…</p>}
        </div>;
      })}
    </div>
  </section>;
}
