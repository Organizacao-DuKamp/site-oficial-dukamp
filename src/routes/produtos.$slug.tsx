import { productSeo, seoHead } from "@/lib/seo";
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { formatBRL, useCart } from "@/lib/cart";
import { useAuth, priceForAccount, pixPriceForAccount } from "@/lib/auth";
import { ShoppingCart, Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RichContent } from "@/components/site/RichContent";
import { OptimizedImage } from "@/components/ui/optimized-image";

function ZoomBox({ children }: { children: React.ReactNode }) {
  const [origin, setOrigin] = useState("50% 50%");
  const [zoom, setZoom] = useState(false);
  return (
    <div
      className="aspect-square rounded-lg bg-white border overflow-hidden cursor-zoom-in"
      onMouseEnter={() => setZoom(true)}
      onMouseLeave={() => setZoom(false)}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        setOrigin(`${x}% ${y}%`);
      }}
      style={{
        // @ts-expect-error CSS custom property
        "--zoom-origin": origin,
      }}
    >
      <div
        className="w-full h-full transition-transform duration-150 ease-out"
        style={{
          transform: zoom ? "scale(2.2)" : "scale(1)",
          transformOrigin: origin,
        }}
      >
        {children}
      </div>
    </div>
  );
}




export const Route = createFileRoute("/produtos/$slug")({
  loader: async ({ params, context }) => {
    const product = await context.queryClient.ensureQueryData({
      queryKey: ["product", params.slug],
      queryFn: async () => {
        const { data, error } = await supabase.from("products").select("*,catalogs(name,slug)").eq("slug", params.slug).eq("active", true).maybeSingle();
        if (error) throw error;
        return data;
      },
    });
    if (!product) throw notFound();
    return product;
  },
  head: ({ loaderData, params }) => loaderData ? productSeo(loaderData) : seoHead({ title: "Produto não encontrado | DuKamp", description: "Este produto não está disponível no catálogo da DuKamp.", path: `/produtos/${encodeURIComponent(params.slug)}`, noindex: true }),
  notFoundComponent: () => <SiteLayout><h1 className="text-2xl font-bold">Produto não encontrado</h1><p className="mt-2">Este produto não está disponível no catálogo.</p><Link to="/produtos" className="mt-4 inline-block text-primary underline">Ver produtos</Link></SiteLayout>,
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const initialProduct = Route.useLoaderData();
  const { add } = useCart();
  const { accountType } = useAuth();
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQtyState] = useState(1);
  const { data: p, isLoading, isFetched } = useQuery({
    initialData: initialProduct,
    queryKey: ["product", slug],
    queryFn: async () => (await supabase.from("products").select("*,catalogs(name,slug)").eq("slug", slug).eq("active", true).maybeSingle()).data,
  });
  if (isLoading || !isFetched) {
    return (
      <SiteLayout>
        <div className="grid md:grid-cols-2 gap-8 animate-pulse">
          <div className="aspect-square rounded-lg bg-muted" />
          <div className="space-y-3">
            <div className="h-6 w-2/3 bg-muted rounded" />
            <div className="h-4 w-1/3 bg-muted rounded" />
            <div className="h-10 w-1/2 bg-muted rounded mt-6" />
            <div className="h-10 w-40 bg-muted rounded mt-4" />
          </div>
        </div>
      </SiteLayout>
    );
  }
  if (!p) return <SiteLayout><p>Produto não encontrado.</p></SiteLayout>;
  const images: string[] = (p.images && p.images.length > 0) ? p.images : ["/placeholder.svg"];
  const displayPrice = priceForAccount(p as any, accountType);
  const displayPix = pixPriceForAccount(p as any, accountType);
  const installments = Math.max(1, Number(p.installments ?? 1));
  const tierLabel = accountType === "produtor" ? "Produtor Rural" : null;
  return (
    <SiteLayout>
      <nav aria-label="Navegação do produto" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-primary">Início</Link><span aria-hidden="true">/</span>
        <Link to="/produtos" className="hover:text-primary">Produtos</Link>
        {p.catalogs?.slug && <><span aria-hidden="true">/</span><Link to="/catalogos/$slug" params={{ slug: p.catalogs.slug }} className="hover:text-primary">{p.catalogs.name}</Link></>}
        <span aria-hidden="true">/</span><span aria-current="page">{p.name}</span>
      </nav>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-3">
          {images.length > 1 ? (
            <Carousel opts={{ loop: true, startIndex: activeImg }} className="w-full">
              <CarouselContent>
                {images.map((src, i) => (
                  <CarouselItem key={i}>
                    <ZoomBox>
                      <OptimizedImage
                        src={src}
                        alt={`${p.name} ${i + 1}`}
                        width={800}
                        height={800}
                        quality={80}
                        srcsetWidths={[400, 600, 800, 1000]}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority={i === 0}
                        fit="contain"
                        wrapperClassName="w-full h-full bg-white"
                        className="p-4"
                      />
                    </ZoomBox>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>
          ) : (
            <ZoomBox>
              <OptimizedImage
                src={images[0]}
                alt={p.name}
                width={800}
                height={800}
                quality={80}
                srcsetWidths={[400, 600, 800, 1000]}
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                fit="contain"
                wrapperClassName="w-full h-full bg-white"
                className="p-4"
              />
            </ZoomBox>
          )}
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  className={cn(
                    "aspect-square rounded border bg-white overflow-hidden",
                    activeImg === i ? "ring-2 ring-primary" : "hover:border-primary/60",
                  )}
                >
                  <OptimizedImage
                    src={src}
                    alt={`thumb ${i + 1}`}
                    width={120}
                    height={120}
                    quality={65}
                    sizes="120px"
                    fit="contain"
                    wrapperClassName="w-full h-full bg-white"
                    className="p-1"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          {p.brand && <div className="text-xs uppercase text-muted-foreground tracking-wider">{p.brand}</div>}
          <h1 className="text-2xl font-bold mt-1">{p.name}</h1>
          <div className="text-xs text-muted-foreground mt-1">Cód: {p.code}</div>
          <div className="mt-4">
            {tierLabel && <div className="text-[11px] uppercase tracking-wider text-primary font-semibold">Preço {tierLabel}</div>}
            <div className="text-3xl font-bold">{formatBRL(displayPrice)}</div>
            {displayPix != null && <div className="text-sm text-primary mt-1">ou {formatBRL(displayPix)} no PIX</div>}
            {installments > 1 && <div className="text-sm text-muted-foreground">em até {installments}x sem juros</div>}
          </div>
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="inline-flex items-center border rounded-md h-10">
              <button
                type="button"
                onClick={() => setQtyState((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="h-10 w-10 grid place-items-center disabled:opacity-40"
                aria-label="Diminuir quantidade"
              >
                <Minus className="h-4 w-4" />
              </button>
              <Input
                type="text"
                inputMode="numeric"
                value={qty}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  if (raw === "") { setQtyState(1); return; }
                  const n = parseInt(raw, 10);
                  if (Number.isFinite(n) && n > 0) setQtyState(Math.min(n, Math.max(1, p.stock || 999)));
                }}
                onBlur={(e) => {
                  const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                  setQtyState(Number.isFinite(n) && n > 0 ? n : 1);
                }}
                className="h-10 w-14 text-center border-0 focus-visible:ring-0 px-0"
                aria-label="Quantidade"
              />
              <button
                type="button"
                onClick={() => setQtyState((q) => q + 1)}
                className="h-10 w-10 grid place-items-center"
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              className="flex-1 sm:flex-none"
              disabled={p.stock <= 0}
              onClick={() => {
                add({ id: p.id, name: p.name, price: displayPrice, image: images[0] }, qty);
                toast.success(`${qty} ${qty === 1 ? "item adicionado" : "itens adicionados"} ao carrinho`);
              }}
            >
              <ShoppingCart className="h-4 w-4 mr-2" /> {p.stock > 0 ? "Adicionar ao carrinho" : "Indisponível"}
            </Button>
          </div>
          <div className="mt-6 text-sm text-muted-foreground">
            <div>Estoque: {p.stock}</div>
            {p.weight != null && <div>Peso: {p.weight} kg</div>}
          </div>
        </div>
      </div>
      {p.description && (
        <div className="mt-10 border-t pt-6">
          <h2 className="font-semibold mb-4 text-lg">Descrição</h2>
          <RichContent html={p.description} className="text-muted-foreground max-w-4xl" />
        </div>
      )}
    </SiteLayout>
  );
}
