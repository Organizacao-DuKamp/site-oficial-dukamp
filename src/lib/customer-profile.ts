export const BRAZIL_STATES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export type DeliveryAddress = {
  cep: string; estado: string; cidade: string; rua: string; numero: string; bairro: string;
  complemento: string; referencia_entrega: string; pessoa_autorizada: string;
};
export const EMPTY_DELIVERY_ADDRESS: DeliveryAddress = { cep: "", estado: "", cidade: "", rua: "", numero: "", bairro: "", complemento: "", referencia_entrega: "", pessoa_autorizada: "" };
export const DELIVERY_LABELS: Record<keyof DeliveryAddress, string> = {
  cep: "CEP", estado: "Estado", cidade: "Cidade", rua: "Rua", numero: "Número", bairro: "Bairro",
  complemento: "Complemento", referencia_entrega: "Referência para entrega", pessoa_autorizada: "Pessoa autorizada a receber a entrega",
};
export const OPTIONAL_DELIVERY_FIELDS = ["complemento", "referencia_entrega", "pessoa_autorizada"];
export function validCpf(value: string): boolean {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  for (const count of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < count; i++) sum += Number(cpf[i]) * (count + 1 - i);
    const digit = (sum * 10) % 11;
    if ((digit === 10 ? 0 : digit) !== Number(cpf[count])) return false;
  }
  return true;
}
export function consumerAddressError(address: DeliveryAddress, cpf: string): string | null {
  if (!validCpf(cpf)) return "Informe um CPF válido.";
  if (address.cep.replace(/\D/g, "").length !== 8) return "Informe um CEP com 8 dígitos.";
  if (!BRAZIL_STATES.includes(address.estado.trim().toUpperCase())) return "Selecione um estado válido.";
  for (const key of ["cidade", "rua", "numero", "bairro"] as const) {
    if (!address[key].trim()) return `Preencha o campo ${DELIVERY_LABELS[key]}.`;
  }
  for (const [key, value] of Object.entries(address)) {
    const max = key === "referencia_entrega" ? 300 : key === "numero" ? 20 : key === "rua" ? 200 : 120;
    if (value.length > max) return `O campo ${DELIVERY_LABELS[key as keyof DeliveryAddress]} está muito longo.`;
  }
  return null;
}
// Only known contact fields are read. Never overwrite data the customer has
// already typed while an asynchronous profile request was in flight.
export function checkoutPrefill(profile: Record<string, any> | null, user: { email?: string; user_metadata?: Record<string, any> }) {
  const p = profile ?? {};
  const address = p.delivery_address ?? {};
  return {
    customer_name: p.full_name || user.user_metadata?.full_name || "",
    email: p.email || user.email || "", phone: p.phone || p.cobranca_telefone || user.user_metadata?.phone || "",
    cpf_cnpj: p.cpf || p.cnpj || "", cep: address.cep || p.cobranca_cep || "",
    rua: address.rua || p.cobranca_rua || "", numero: address.numero || p.cobranca_numero || "",
    bairro: address.bairro || p.cobranca_bairro || "", cidade: address.cidade || p.cobranca_municipio || "",
    estado: address.estado || p.uf || p.estado_propriedade || "",
    complemento: address.complemento || p.apartamento_info || "",
    referencia_entrega: address.referencia_entrega || "", pessoa_autorizada: address.pessoa_autorizada || "",
  };
}
