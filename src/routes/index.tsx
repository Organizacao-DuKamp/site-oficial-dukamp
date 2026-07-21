import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { LazyMount } from "@/components/site/LazyMount";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dukamp Saúde Animal — Catálogo de Produtos Veterinários" },
      {
        name: "description",
        content:
          "Catálogo Dukamp Saúde Animal: vermífugos, vacinas, suplementos e rações para bovinos, equinos, ovinos, suínos, aves e pets.",
      },
    ],
  }),
  component: Home,
});

const PRODUCT_COLS =
  "id,name,slug,code,price,consumer_price,reseller_price,producer_price,pix_price,consumer_pix_price,reseller_pix_price,producer_pix_price,images,brand,stock,installments,catalog_id,featured,created_at,category_position";

const INITIAL_ROWS = 3;
const ROWS_INCREMENT = 3;

function ProductCarousel({
  items,
  eagerFirst = false,
}: {
  items: any[];
  eagerFirst?: boolean;
}) {
  return (
    <Carousel
      opts={{ align: "start", slidesToScroll: "auto", containScroll: "trimSnaps" }}
      className="relative group"
    >
      <CarouselContent className="-ml-3">
        {items.map((p, i) => (
          <CarouselItem
            key={p.id}
            className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
          >
            <ProductCard p={p as any} eager={eagerFirst && i < 5} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden md:flex -left-4 opacity-0 group-hover:opacity-100 transition-opacity" />
      <CarouselNext className="hidden md:flex -right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Carousel>
  );
}

function Home() {
  const [visibleRows, setVisibleRows] = useState<number>(INITIAL_ROWS);

  const featured = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select(PRODUCT_COLS)
        .eq("active", true)
        .eq("featured", true)
        .gt("stock", 0)
        .limit(20);
      return data ?? [];
    },
  });
  const categories = useQuery({
    queryKey: ["catalogs", "active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("catalogs")
        .select("id,name,slug,active,sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      return data ?? [];
    },
  });
  const catIds = (categories.data ?? []).map((c) => c.id).sort().join(",");
  const allProducts = useQuery({
    enabled: !!categories.data && categories.data.length > 0,
    queryKey: ["products", "home-by-cat", catIds],
    queryFn: async () => {
      const ids = (categories.data ?? []).map((c) => c.id);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("products")
        .select(PRODUCT_COLS)
        .eq("active", true)
        .gt("stock", 0)
        .in("catalog_id", ids)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const sections = (categories.data ?? [])
    .map((cat) => {
      const prods = (allProducts.data ?? [])
        .filter((p) => p.catalog_id === cat.id)
        .sort((a: any, b: any) => {
          const ap = a.category_position;
          const bp = b.category_position;
          if (ap != null && bp != null) return ap - bp;
          if (ap != null) return -1;
          if (bp != null) return 1;
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
        });
      return { cat, prods };
    })
    .filter((s) => s.prods.length > 0)
    .sort((a, b) => {
      if (b.prods.length !== a.prods.length)
        return b.prods.length - a.prods.length;
      return a.cat.name.localeCompare(b.cat.name, "pt-BR");
    });

  const visibleSections = sections.slice(0, visibleRows);
  const hasMoreRows = sections.length > visibleRows;

  return (
    <SiteLayout>
      <section className="lg:pb-8">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg md:text-xl font-bold uppercase tracking-wide border-l-4 border-primary pl-3">
            Produtos em destaque
          </h1>
          <Button asChild variant="ghost" size="sm">
            <Link to="/produtos">
              Ver todos <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        {featured.data && featured.data.length > 0 && (
          <ProductCarousel items={featured.data} eagerFirst />
        )}
      </section>

      {visibleSections.map((s, idx) => {
        const content = (
          <section className="mt-10 min-w-0">
            <div className="flex items-center justify-between mb-3 gap-2">
              <h2 className="text-lg md:text-xl font-bold uppercase tracking-wide border-l-4 border-primary pl-3 truncate min-w-0">
                {s.cat.name}
              </h2>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link to="/produtos" search={{ categoria: s.cat.slug } as any}>
                  Ver todos <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <ProductCarousel items={s.prods} />
          </section>
        );
        if (idx === 0) return <div key={s.cat.id}>{content}</div>;
        return (
          <LazyMount key={s.cat.id} minHeight={360}>
            {content}
          </LazyMount>
        );
      })}

      {hasMoreRows && (
        <div className="mt-10 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setVisibleRows((v) => v + ROWS_INCREMENT)}
          >
            Carregar mais
          </Button>
        </div>
      )}
    </SiteLayout>
  );
}
