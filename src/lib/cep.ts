type DeliveryCoordinates = { latitude: number; longitude: number };
export type CepLookupResult = {
  cep: string;
  rua?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  coordinates?: DeliveryCoordinates;
};

function validCoordinates(latitude: number, longitude: number): DeliveryCoordinates | null {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

export async function lookupCepWithFallback(digits: string): Promise<CepLookupResult> {
  const brasilApiRequest = fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  }).then(async (response) => {
    if (!response.ok) throw new Error(`BrasilAPI HTTP ${response.status}`);
    const data = (await response.json()) as {
      cep?: string;
      state?: string;
      city?: string;
      neighborhood?: string;
      street?: string;
      location?: { coordinates?: { latitude?: string | number; longitude?: string | number } };
    };
    const latitude = Number(data.location?.coordinates?.latitude);
    const longitude = Number(data.location?.coordinates?.longitude);
    return {
      cep: String(data.cep || digits).replace(/\D/g, ""),
      rua: data.street || "",
      bairro: data.neighborhood || "",
      cidade: data.city || "",
      estado: data.state || "",
      coordinates: validCoordinates(latitude, longitude) || undefined,
    } satisfies CepLookupResult;
  });

  const viaCepRequest = fetch(`https://viacep.com.br/ws/${digits}/json/`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  }).then(async (response) => {
    if (!response.ok) throw new Error(`ViaCEP HTTP ${response.status}`);
    const data = (await response.json()) as {
      erro?: boolean;
      cep?: string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) throw new Error("CEP não encontrado no ViaCEP");
    return {
      cep: String(data.cep || digits).replace(/\D/g, ""),
      rua: data.logradouro || "",
      bairro: data.bairro || "",
      cidade: data.localidade || "",
      estado: data.uf || "",
    } satisfies CepLookupResult;
  });

  const [brasilApiResult, viaCepResult] = await Promise.allSettled([brasilApiRequest, viaCepRequest]);
  const brasilApi = brasilApiResult.status === "fulfilled" ? brasilApiResult.value : null;
  const viaCep = viaCepResult.status === "fulfilled" ? viaCepResult.value : null;

  if (!brasilApi && !viaCep) throw new Error("CEP não encontrado nas bases consultadas");

  return {
    cep: brasilApi?.cep || viaCep?.cep || digits,
    rua: brasilApi?.rua || viaCep?.rua || "",
    bairro: brasilApi?.bairro || viaCep?.bairro || "",
    cidade: brasilApi?.cidade || viaCep?.cidade || "",
    estado: brasilApi?.estado || viaCep?.estado || "",
    coordinates: brasilApi?.coordinates,
  };
}

