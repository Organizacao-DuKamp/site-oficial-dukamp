import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCart, formatBRL } from "@/lib/cart";
import { useSiteSettings, whatsappLink } from "@/lib/site-settings";
import { useAuth, priceForAccount, pixPriceForAccount } from "@/lib/auth";
import { optimizedImage } from "@/lib/image-url";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { toast } from "sonner";

export type ProductLite = {
  id: string;
  name: string;
  slug: string;
  code: string;
  price: number;
  consumer_price?: number | null;
  reseller_price?: number | null;
  producer_price?: number | null;
  pix_price: number | null;
  consumer_pix_price?: number | null;
  reseller_pix_price?: number | null;
  producer_pix_price?: number | null;
  images: string[];
  brand: string | null;
  stock: number;
  installments?: number | null;
};

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.555-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l.6.95-1 3.648 3.74-.978.94.42zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
  </svg>
);

export function ProductCard({ p, eager = false }: { p: ProductLite; eager?: boolean }) {
  const { add } = useCart();
  const navigate = useNavigate();
  const { data: settings } = useSiteSettings();
  const { accountType } = useAuth();
  const rawImage = p.images?.[0] || "/placeholder.svg";
  const image = optimizedImage(rawImage, { width: 320, quality: 65 });

  const installments = Math.max(1, Number(p.installments ?? 1));
  const displayPrice = priceForAccount(p, accountType);
  const displayPix = pixPriceForAccount(p, accountType);
  const parcela = displayPrice / installments;
  const tierLabel = accountType === "produtor" ? "Produtor Rural" : null;
  const wa = whatsappLink(
    settings?.phone,
    `Olá, tenho interesse no produto: ${p.name} (cód. ${p.code}) - ${formatBRL(displayPrice)}`,
  );

  const stopNav = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="group relative h-full rounded-lg border bg-card overflow-hidden flex flex-col hover:shadow-lg transition-shadow"
    >
      <Link
        to="/produtos/$slug"
        params={{ slug: p.slug }}
        preload="intent"
        aria-label={`Ver detalhes de ${p.name}`}
        className="absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="sr-only">Ver detalhes de {p.name}</span>
      </Link>
      <div className="aspect-[5/4] bg-white overflow-hidden">
        <OptimizedImage
          src={rawImage}
          alt={p.name}
          width={320}
          height={256}
          quality={65}
          srcsetWidths={[160, 240, 320, 480]}
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, (max-width: 1280px) 22vw, 18vw"
          priority={eager}
          fit="contain"
          wrapperClassName="w-full h-full bg-white"
          className="p-2 group-hover:scale-105 transition-transform"
        />
      </div>


      <div className="p-3 flex-1 flex flex-col">
        <div className="min-h-[0.875rem] text-[10px] uppercase tracking-wider text-muted-foreground">
          {p.brand ?? ""}
        </div>
        <div className="mt-1 min-h-[4.5rem] font-medium text-sm leading-[1.3] break-words whitespace-normal group-hover:text-primary flex-1">
          {p.name}
        </div>
        <div className="mt-3 space-y-0.5">
          {tierLabel && <div className="text-[10px] uppercase tracking-wider text-primary font-semibold">Preço {tierLabel}</div>}
          <div className="text-xl font-bold text-foreground">{formatBRL(displayPrice)}</div>
          {displayPix != null && (
            <div className="text-xs text-primary font-medium">ou {formatBRL(displayPix)} no PIX</div>
          )}
          {installments > 1 && (
            <div className="text-xs text-muted-foreground">
              em até {installments}x de {formatBRL(parcela)}
            </div>
          )}
        </div>
        <div className="mt-auto pt-3 space-y-2">
          <Button
            size="sm"
            className="relative z-20 w-full h-10 text-base font-semibold"
            disabled={p.stock <= 0}
            onClick={(e) => {
              stopNav(e);
              add({ id: p.id, name: p.name, price: displayPrice, image });
              toast.success("Adicionado ao carrinho");
            }}
          >
            <ShoppingCart className="h-4 w-4 mr-1.5" /> {p.stock > 0 ? "Comprar" : "Indisponível"}
          </Button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              navigate({ to: "/equipe-de-vendas" });
            }}
            aria-label="Comprar pelo WhatsApp"
            className="relative z-20 w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#25D366] hover:bg-[#1ebe57] text-white text-sm font-semibold h-10 px-3 shadow-sm hover:shadow-md ring-1 ring-black/5 transition-all"
          >
            <WhatsAppIcon className="h-4 w-4 shrink-0" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
