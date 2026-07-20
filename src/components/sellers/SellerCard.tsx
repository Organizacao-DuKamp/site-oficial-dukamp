import { Link } from "@tanstack/react-router";
import type { Seller } from "@/lib/sellers";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { MapPin } from "lucide-react";

export function SellerCard({ seller }: { seller: Seller }) {
  return (
    <Link
      to="/equipe-de-vendas/$slug"
      params={{ slug: seller.slug }}
      className="group flex flex-col items-center text-center bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      <div className="relative">
        <div
          className="absolute -inset-1 rounded-full"
          style={{
            background:
              "conic-gradient(from 220deg, #d81f26 0deg, #d81f26 120deg, #f6c515 120deg, #f6c515 240deg, #d81f26 240deg)",
          }}
          aria-hidden
        />
        <div className="relative h-28 w-28 rounded-full overflow-hidden bg-muted ring-4 ring-card">
          <OptimizedImage
            src={seller.photo_url}
            alt={seller.name}
            width={112}
            height={112}
            quality={80}
            srcsetWidths={[112, 168, 224]}
            sizes="112px"
            wrapperClassName="w-full h-full"
          />
        </div>
      </div>
      <h3 className="mt-4 font-bold text-base leading-tight group-hover:text-primary transition-colors">
        {seller.name}
      </h3>
      {seller.role && (
        <p className="mt-0.5 text-sm text-[#d81f26] font-medium">{seller.role}</p>
      )}
      {seller.region && (
        <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {seller.region}
        </p>
      )}
    </Link>
  );
}
