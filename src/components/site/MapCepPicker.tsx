import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Crosshair } from "lucide-react";
import { toast } from "sonner";

// Fix default icon paths (Leaflet + bundlers)
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

type LatLng = { lat: number; lng: number };

type ReverseResult = {
  cep: string;
  rua?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  latitude: number;
  longitude: number;
};

type AddressParts = {
  cep: string;
  rua?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
};

function normalizeCep(value: unknown) {
  const cep = String(value ?? "").replace(/\D/g, "");
  return cep.length === 8 ? cep : "";
}

async function findCepViaAddress(parts: AddressParts, signal?: AbortSignal) {
  const estado = (parts.estado || "").trim().toUpperCase();
  const cidade = (parts.cidade || "").trim();
  const rua = (parts.rua || "").trim();
  if (estado.length !== 2 || cidade.length < 3 || rua.length < 3) return "";

  try {
    const url = `https://viacep.com.br/ws/${encodeURIComponent(estado)}/${encodeURIComponent(cidade)}/${encodeURIComponent(rua)}/json/`;
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal });
    if (!response.ok) return "";
    const rows = (await response.json()) as Array<{ cep?: string; localidade?: string; uf?: string }>;
    if (!Array.isArray(rows)) return "";

    const sameCity = rows.find(
      (row) =>
        (row.uf || "").toUpperCase() === estado &&
        (row.localidade || "").localeCompare(cidade, "pt-BR", { sensitivity: "base" }) === 0,
    );
    return normalizeCep(sameCity?.cep || rows[0]?.cep);
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") throw error;
    return "";
  }
}

async function findCepViaNominatimSearch(parts: AddressParts, signal?: AbortSignal) {
  const cidade = (parts.cidade || "").trim();
  const estado = (parts.estado || "").trim();
  if (!cidade) return "";

  try {
    const params = new URLSearchParams({
      format: "jsonv2",
      addressdetails: "1",
      limit: "5",
      country: "Brasil",
      city: cidade,
    });
    if (estado) params.set("state", estado);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal,
    });
    if (!response.ok) return "";
    const rows = (await response.json()) as Array<{ address?: { postcode?: string } }>;
    if (!Array.isArray(rows)) return "";
    for (const row of rows) {
      const cep = normalizeCep(row.address?.postcode);
      if (cep) return cep;
    }
    return "";
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") throw error;
    return "";
  }
}

async function reverseGeocode(pos: LatLng, signal?: AbortSignal): Promise<ReverseResult | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.lat}&lon=${pos.lng}&addressdetails=1&accept-language=pt-BR`;
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal });
  if (!response.ok) return null;

  const json = await response.json();
  const address = json.address ?? {};
  const parts: AddressParts = {
    cep: normalizeCep(address.postcode),
    rua: address.road || address.pedestrian || address.path || address.cycleway,
    bairro: address.suburb || address.neighbourhood || address.village || address.hamlet,
    cidade: address.city || address.town || address.municipality || address.village,
    estado: (address.state_code || address["ISO3166-2-lvl4"] || address.state || "")
      .toString()
      .slice(-2)
      .toUpperCase(),
  };

  // Alguns pontos do OpenStreetMap têm cidade/rua, mas não trazem o postcode no reverse.
  // Nesses casos tentamos descobrir o CEP pelo endereço antes de desistir.
  if (!parts.cep) parts.cep = await findCepViaAddress(parts, signal);
  if (!parts.cep) parts.cep = await findCepViaNominatimSearch(parts, signal);

  return {
    ...parts,
    latitude: pos.lat,
    longitude: pos.lng,
  };
}

function ClickHandler({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ pos }: { pos: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [pos, map]);
  return null;
}

export function MapCepPicker({
  onResult,
}: {
  onResult: (r: ReverseResult) => void;
}) {
  const [pos, setPos] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [center] = useState<LatLng>({ lat: -15.78, lng: -47.93 }); // Brasil
  const abortRef = useRef<AbortController | null>(null);

  async function handlePick(p: LatLng) {
    setPos(p);
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const result = await reverseGeocode(p, abortRef.current.signal);
      if (!result) {
        toast.error("Não foi possível identificar esse ponto. Tente marcar mais próximo de uma rua.");
        return;
      }
      onResult(result);
      if (result.cep) {
        toast.success(`CEP encontrado: ${result.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}`);
      } else {
        toast.info(
          "Localização encontrada pelas coordenadas. O CEP não apareceu nessa base, mas o Frete Dukamp pode ser calculado; preencha o CEP antes de finalizar o pedido.",
          { duration: 7000 },
        );
      }
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") {
        toast.error("Erro ao identificar o endereço do ponto selecionado.");
      }
    } finally {
      setLoading(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error("Geolocalização indisponível neste dispositivo.");
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (g) => handlePick({ lat: g.coords.latitude, lng: g.coords.longitude }),
      () => {
        setLoading(false);
        toast.error("Não foi possível obter sua localização. Verifique as permissões.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          Toque no mapa para marcar o local de entrega.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={useMyLocation} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
          Usar minha localização
        </Button>
      </div>
      <div className="relative h-[320px] sm:h-[380px] w-full overflow-hidden rounded-lg border">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={4}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={handlePick} />
          {pos && <Marker position={[pos.lat, pos.lng]} />}
          <Recenter pos={pos} />
        </MapContainer>
        {loading && (
          <div className="absolute inset-0 z-[500] grid place-items-center bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-md bg-background border px-3 py-2 shadow-md text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Identificando endereço…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
