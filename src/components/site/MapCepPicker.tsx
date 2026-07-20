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
};

async function reverseGeocode(pos: LatLng): Promise<ReverseResult | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.lat}&lon=${pos.lng}&addressdetails=1&accept-language=pt-BR`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) return null;
  const j = await r.json();
  const a = j.address ?? {};
  const cepRaw: string | undefined = a.postcode;
  const cep = (cepRaw ?? "").replace(/\D/g, "");
  if (cep.length !== 8) return null;
  return {
    cep,
    rua: a.road || a.pedestrian || a.path || a.cycleway,
    bairro: a.suburb || a.neighbourhood || a.village || a.hamlet,
    cidade: a.city || a.town || a.municipality || a.village,
    estado: (a.state_code || a["ISO3166-2-lvl4"] || a.state || "").toString().slice(-2).toUpperCase(),
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
      const r = await reverseGeocode(p);
      if (!r) {
        toast.error("Não foi possível identificar o CEP nesse ponto. Tente marcar mais próximo de uma rua.");
        return;
      }
      onResult(r);
      toast.success(`CEP encontrado: ${r.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}`);
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") {
        toast.error("Erro ao buscar CEP do ponto selecionado.");
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
              Buscando CEP…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
