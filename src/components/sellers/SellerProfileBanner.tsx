import type { Seller } from "@/lib/sellers";
import { formatPhoneDisplay, telHref, whatsappUrl } from "@/lib/sellers";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { MapPin, Phone, Star, MessageCircle, ImageIcon } from "lucide-react";
import bannerBg from "@/assets/seller-banner-bg.jpg";

export function SellerProfileBanner({ seller }: { seller: Seller }) {
  const wa = whatsappUrl(
    seller.whatsapp ?? seller.phone,
    `Olá ${seller.name}, vim pelo site da Dukamp!`,
  );
  const phoneDisplay = formatPhoneDisplay(seller.phone ?? seller.whatsapp);
  const heroImage = seller.banner_url || bannerBg;
  const hasHero = !!seller.banner_url || !!bannerBg;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-white shadow-xl">
      <div className="grid grid-cols-2 min-h-[220px] md:min-h-[360px]">
        {/* ============ ESQUERDA — arte pronta enviada pelo admin ============ */}
        <div className="relative min-h-full bg-muted">
          {hasHero ? (
            <OptimizedImage
              src={heroImage}
              alt={`Banner do vendedor ${seller.name}`}
              width={1200}
              height={720}
              quality={82}
              srcsetWidths={[600, 900, 1200, 1600]}
              sizes="(max-width: 768px) 50vw, 600px"
              priority
              wrapperClassName="absolute inset-0 w-full h-full"
              className="object-left md:object-center"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="h-10 w-10" />
                <span className="text-sm">Sem imagem cadastrada</span>
              </div>
            </div>
          )}
        </div>

        {/* ============ DIREITA — informações do vendedor ============ */}
        <div className="relative overflow-hidden bg-white p-3 sm:p-6 md:p-10 flex flex-col justify-center">
          {/* Faixas decorativas discretas — canto superior direito */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[#f6c515]/80 md:h-44 md:w-44"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-8 -top-20 h-24 w-24 rounded-full bg-[#d81f26] md:h-32 md:w-32"
            aria-hidden
          />
          {/* Traço amarelo fino inclinado — canto inferior direito */}
          <div
            className="pointer-events-none absolute -bottom-6 -right-10 h-2 w-40 rotate-[-14deg] rounded-full bg-[#f6c515] md:h-2.5 md:w-56"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-3 -right-6 h-1.5 w-28 rotate-[-14deg] rounded-full bg-[#d81f26] md:h-2 md:w-40"
            aria-hidden
          />

          <div className="relative space-y-2 md:space-y-3 text-left">

            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d81f26] px-3 py-1 text-xs font-bold text-white shadow">
              <Star className="h-3.5 w-3.5 fill-white" /> DESTAQUE
            </span>

            <h1 className="text-lg sm:text-2xl md:text-4xl font-black leading-tight text-foreground break-words">
              {seller.name}
            </h1>

            {seller.role && (
              <p className="text-sm sm:text-base md:text-lg font-semibold text-[#d81f26]">
                {seller.role}
              </p>
            )}

            <div className="space-y-1.5 pt-1 text-xs sm:text-sm md:text-base text-foreground/90">
              {seller.region && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-[#d81f26]" />
                  <span className="break-words">{seller.region}</span>
                </p>
              )}
              {phoneDisplay && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-[#d81f26]" />
                  <a
                    href={telHref(seller.phone ?? seller.whatsapp)}
                    className="hover:underline"
                  >
                    Tel: {phoneDisplay}
                  </a>
                </p>
              )}
            </div>

            {(seller.whatsapp || seller.phone) && (
              <div className="pt-4">
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-3 py-2 text-xs sm:text-sm md:text-base md:px-6 md:py-3 font-bold text-white shadow-lg transition-colors hover:bg-[#1fbe5a] sm:w-auto"
                >
                  <MessageCircle className="h-4 w-4 md:h-5 md:w-5 fill-white" />
                  <span className="whitespace-nowrap">WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
