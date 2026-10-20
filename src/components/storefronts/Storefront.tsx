import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  loadStorefront,
  visitStorefront,
  checkoutStorefront,
  loadStoreOrder,
  retryStorePayment,
} from "@/lib/storefronts.functions";
import {
  storeMoney,
  storeDelivery,
  storeCheckoutSchema,
  type StoreCheckout,
} from "@/lib/storefronts";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichContent } from "@/components/site/RichContent";
import { ProductOptionSelector } from "@/components/site/ProductOptionSelector";
import { readProductOptions, resolveOptionSelections } from "@/lib/product-options";
import { CustomerFields, EMPTY_CUSTOMER, newCheckoutSecrets } from "./StoreShared";
import { ErrorNotice, Field, fieldClass, EmptyState } from "@/components/partners/PartnerUi";
import { FOOTER_PAGES } from "@/lib/footer-pages";
import { toast } from "sonner";
import {
  ArrowRight,
  ChevronRight,
  ShoppingCart,
  Package,
  MapPin,
  Phone,
  Mail,
  Menu,
  X,
  Truck,
  ShieldCheck,
  Store,
  Minus,
  Plus,
  Copy,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
type StoreData = Awaited<ReturnType<typeof loadStorefront>>;
type PublicProduct = StoreData["products"][number];
type Line = { product_id: string; quantity: number };
const Context = createContext<{
  data: StoreData;
  items: Line[];
  setItems: (v: Line[] | ((v: Line[]) => Line[])) => void;
  add: (id: string) => void;
} | null>(null);
function useStore() {
  const c = useContext(Context);
  if (!c) throw new Error("Loja indisponível.");
  return c;
}
function storeLink(slug: string, to: string) {
  return to.startsWith("https://") ? to : `/${slug}${to === "/" ? "" : to}`;
}
export function StorefrontLayout({ data }: { data: StoreData }) {
  const { store } = data,
    [items, setItems] = useState<Line[]>([]),
    [ready, setReady] = useState(false),
    [menu, setMenu] = useState(false),
    visit = useServerFn(visitStorefront);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(`store-cart-${store.id}`) || "[]");
      if (Array.isArray(stored))
        setItems(
          stored.filter(
            (i) =>
              typeof i.product_id === "string" && Number.isInteger(i.quantity) && i.quantity > 0,
          ),
        );
    } catch {
      /* Storage may be disabled in this browser. */
    }
    setReady(true);
    let visitor = localStorage.getItem("store-visitor");
    if (!visitor) {
      visitor = crypto.randomUUID();
      localStorage.setItem("store-visitor", visitor);
    }
    visit({ data: { slug: store.slug, visitor } }).catch(() => {});
  }, [store.id, store.slug, visit]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(`store-cart-${store.id}`, JSON.stringify(items));
      } catch {
        /* Storage may be disabled in this browser. */
      }
  }, [items, ready, store.id]);
  const add = (id: string) => {
    const p = data.products.find((p) => p.id === id);
    if (!p || p.stock <= 0) return;
    const current = items.find((i) => i.product_id === id)?.quantity || 0;
    if (current >= p.stock) {
      toast.error("Quantidade máxima em estoque atingida.");
      return;
    }
    setItems((prev) =>
      prev.some((i) => i.product_id === id)
        ? prev.map((i) => (i.product_id === id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...prev, { product_id: id, quantity: 1 }],
    );
    toast.success("Produto adicionado ao carrinho da loja.");
  };
  return (
    <Context.Provider value={{ data, items, setItems, add }}>
      <div
        className="min-h-screen bg-background"
        style={{ "--store-accent": store.accent } as CSSProperties}
      >
        <div className="bg-[var(--store-accent)] px-4 py-2 text-center text-xs text-white">
          {store.tagline || "Sua loja agropecuária, agora online"} · Parceiro Dukamp
        </div>
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-7">
            <a href={`/${store.slug}`} className="flex items-center gap-3">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  className="h-14 w-14 object-contain"
                  alt={`Logo ${store.name}`}
                />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted">
                  <Store size={25} />
                </div>
              )}
              <div>
                <p className="text-xl font-bold tracking-tight">{store.name}</p>
                <p className="text-xs text-muted-foreground">Loja parceira Dukamp</p>
              </div>
            </a>
            <div className="flex items-center gap-3">
              <a
                href={`/${store.slug}/carrinho`}
                aria-label="Carrinho da loja"
                className="relative rounded-lg border p-3"
              >
                <ShoppingCart size={20} />
                {items.length > 0 && (
                  <span className="absolute -right-2 -top-2 rounded-full bg-[var(--store-accent)] px-1.5 py-0.5 text-[10px] text-white">
                    {items.reduce((n, i) => n + i.quantity, 0)}
                  </span>
                )}
              </a>
              <Button
                className="md:hidden"
                variant="outline"
                size="icon"
                aria-label="Abrir menu da loja"
                onClick={() => setMenu((v) => !v)}
              >
                {menu ? <X size={20} /> : <Menu size={20} />}
              </Button>
            </div>
          </div>
          <nav
            aria-label="Menu da loja"
            className={`${menu ? "flex" : "hidden"} mx-auto max-w-7xl flex-col gap-1 px-4 pb-4 md:flex md:flex-row md:gap-6 sm:px-7`}
          >
            {store.navbar
              .filter((n) => n.visible)
              .map((n) => (
                <a
                  key={n.key}
                  href={storeLink(store.slug, n.to)}
                  className="rounded-md px-2 py-2 text-sm font-medium hover:bg-muted"
                >
                  {n.label}
                </a>
              ))}
          </nav>
        </header>
        <main className="mx-auto min-h-[55vh] max-w-7xl px-4 py-7 sm:px-7">
          <Outlet />
        </main>
        <footer className="mt-10 border-t bg-muted/40">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 sm:px-7">
            <div>
              <h2 className="text-lg font-bold">{store.name}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{store.tagline}</p>
              <p className="mt-3 text-xs text-muted-foreground">CNPJ: {store.cnpj}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                Tecnologia Dukamp. Produtos da loja são vendidos e entregues por {store.name}.
              </p>
            </div>
            <div>
              <h3 className="mb-3 font-semibold">Atendimento</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                {store.phone && (
                  <a
                    className="flex items-center gap-2"
                    href={`tel:${store.phone.replace(/[^+0-9]/g, "")}`}
                  >
                    <Phone size={15} />
                    {store.phone}
                  </a>
                )}
                {store.email && (
                  <a className="flex items-center gap-2 break-all" href={`mailto:${store.email}`}>
                    <Mail size={15} />
                    {store.email}
                  </a>
                )}
                <p className="flex items-start gap-2">
                  <MapPin size={15} className="shrink-0" />
                  {store.address}
                </p>
              </div>
            </div>
            {(["informacoes", "seguranca"] as const).map((g) => (
              <div key={g}>
                <h3 className="mb-3 font-semibold">
                  {g === "informacoes" ? "Informações" : "Segurança"}
                </h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  {FOOTER_PAGES.filter((p) => p.group === g).map((p) => (
                    <a
                      className="block hover:underline"
                      key={p.slug}
                      href={`/${store.slug}/paginas/${p.slug}`}
                    >
                      {store.footer[p.slug]?.title || p.title}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
            {store.name} · Loja parceira da Dukamp Saúde Animal
          </div>
        </footer>
      </div>
    </Context.Provider>
  );
}
function OwnCard({ p }: { p: PublicProduct }) {
  const { data, add } = useStore();
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <a
        className="grid aspect-square place-items-center bg-white p-5"
        href={`/${data.store.slug}/produto/${p.id}`}
      >
        {p.images[0] ? (
          <img
            src={p.images[0]}
            alt={p.name}
            loading="lazy"
            className="h-full max-h-52 w-full object-contain"
          />
        ) : (
          <Package className="h-20 w-20 text-muted-foreground/20" />
        )}
      </a>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {p.category || data.store.name}
        </p>
        <a className="font-semibold leading-snug" href={`/${data.store.slug}/produto/${p.id}`}>
          {p.name}
        </a>
        <p className="mt-auto pt-2 text-xl font-bold">{storeMoney(p.price)}</p>
        <p className="text-xs text-muted-foreground">
          {p.stock > 0 ? `Vendido por ${data.store.name}` : "Produto esgotado"}
        </p>
        <Button
          className="mt-2 bg-[var(--store-accent)] text-white hover:opacity-90"
          disabled={p.stock <= 0 || !data.store.payment_connected}
          onClick={() => add(p.id)}
        >
          <ShoppingCart size={16} />
          {!data.store.payment_connected ? "Em breve" : p.stock > 0 ? "Adicionar" : "Indisponível"}
        </Button>
      </div>
    </article>
  );
}
function DukampCard({ p }: { p: StoreData["dukamp"][number] }) {
  const { data } = useStore();
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-primary/20 bg-card">
      <a
        className="relative grid aspect-square place-items-center bg-white p-5"
        href={`/${data.store.slug}/dukamp/${p.slug}`}
      >
        <span className="absolute left-3 top-3 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
          DUKAMP
        </span>
        {p.images[0] ? (
          <img
            src={p.images[0]}
            alt={p.name}
            loading="lazy"
            className="h-full max-h-52 w-full object-contain"
          />
        ) : (
          <Package size={60} />
        )}
      </a>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Nutrição Dukamp</p>
        <h3 className="font-semibold">{p.name}</h3>
        <p className="mt-auto pt-2 text-xl font-bold">{storeMoney(p.price)}</p>
        <p className="text-xs text-muted-foreground">Vendido e entregue pela Dukamp</p>
        <Button asChild variant="outline" className="mt-2">
          <a href={`/${data.store.slug}/dukamp/${p.slug}`}>
            Ver produto
            <ArrowRight size={16} />
          </a>
        </Button>
      </div>
    </article>
  );
}
export function StorefrontPage({ path = "" }: { path?: string }) {
  const { data } = useStore();
  const { store, products, dukamp } = data;
  const section = path.replace(/^\/+|\/+$/g, "");
  if (section === "carrinho") return <StoreCart />;
  if (section.startsWith("pedido/")) return <StorePayment id={section.split("/")[1]} />;
  if (section.startsWith("produto/")) return <OwnProduct id={section.split("/")[1]} />;
  if (section.startsWith("dukamp/")) return <DukampProduct slug={section.split("/")[1]} />;
  if (section.startsWith("paginas/")) {
    const slug = section.split("/")[1],
      p = store.footer[slug],
      defaultPage = FOOTER_PAGES.find((p) => p.slug === slug);
    return defaultPage ? (
      <article className="mx-auto max-w-3xl space-y-5">
        <h1 className="text-3xl font-bold">{p?.title || defaultPage.title}</h1>
        {p?.html ? (
          <RichContent html={p.html} />
        ) : (
          <p className="text-muted-foreground">
            Para informações sobre {defaultPage.title.toLowerCase()}, fale com {store.name}:{" "}
            {store.email || store.phone}.
          </p>
        )}
      </article>
    ) : (
      <Missing />
    );
  }
  if (section === "sobre" || section === "contato")
    return (
      <article className="mx-auto max-w-3xl space-y-5 rounded-2xl border p-6">
        <h1 className="text-3xl font-bold">
          {section === "contato" ? "Fale com a loja" : store.name}
        </h1>
        <p className="text-muted-foreground">{store.hero_text}</p>
        <p>{store.address}</p>
        <p>
          {store.email} · {store.phone}
        </p>
        <p className="text-sm text-muted-foreground">CNPJ {store.cnpj} · Loja parceira Dukamp</p>
      </article>
    );
  if (section === "produtos") return <Catalog />;
  if (section) return <Missing />;
  const feed = dukamp
    .filter((p) => /ra[cç][aã]o|ra[cç][oõ]es/i.test(`${p.name} ${p.category}`) && p.stock > 0)
    .slice(0, 8);
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-2xl bg-[var(--store-accent)] px-6 py-10 text-white sm:px-12 sm:py-16">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[.2em] text-white/75">
            {store.name} · Parceiro Dukamp
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">{store.hero_title}</h1>
          <p className="mt-5 max-w-xl text-base text-white/80">{store.hero_text}</p>
          <Button variant="secondary" asChild className="mt-7">
            <a href={`/${store.slug}/produtos`}>
              Explorar produtos
              <ArrowRight size={16} />
            </a>
          </Button>
        </div>
        <Store className="pointer-events-none absolute -bottom-14 -right-7 h-72 w-72 rotate-[-12deg] text-white/10" />
      </section>
      <div className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-3">
        {[
          [Store, "Produtos da sua loja"],
          [Truck, "Nutrição e entrega Dukamp"],
          [ShieldCheck, "Pagamento com Mercado Pago"],
        ].map(([Icon, text]) => {
          const I = Icon as typeof Store;
          return (
            <p key={String(text)} className="flex items-center gap-3 text-sm">
              <I size={22} className="text-[var(--store-accent)]" />
              {String(text)}
            </p>
          );
        })}
      </div>
      {feed.length > 0 && (
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Parceria que nutre
              </p>
              <h2 className="mt-1 text-2xl font-bold">Rações Dukamp em destaque</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {feed.map((p) => (
              <DukampCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              O que você encontra aqui
            </p>
            <h2 className="mt-1 text-2xl font-bold">Produtos de {store.name}</h2>
          </div>
          <a
            href={`/${store.slug}/produtos`}
            className="flex items-center gap-1 text-sm font-semibold text-[var(--store-accent)]"
          >
            Ver todos
            <ChevronRight size={16} />
          </a>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {products.slice(0, 8).map((p) => (
            <OwnCard key={p.id} p={p} />
          ))}
        </div>
        {products.length === 0 && (
          <EmptyState>A loja está preparando seu catálogo. Confira as opções Dukamp.</EmptyState>
        )}
      </section>
    </div>
  );
}
function Missing() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada nesta loja</h1>
      <p className="mt-3 text-muted-foreground">Use o menu para continuar navegando.</p>
    </div>
  );
}
function Catalog() {
  const { data } = useStore(),
    [term, setTerm] = useState(""),
    [category, setCategory] = useState(""),
    [supplier, setSupplier] = useState("");
  const categories = [
    ...new Set([...data.products.map((p) => p.category), ...data.dukamp.map((p) => p.category)]),
  ].filter(Boolean);
  const match = (p: { name: string; category: string }) =>
    (!category || p.category === category) && p.name.toLowerCase().includes(term.toLowerCase());
  const own = data.products.filter(match),
    dukamp = data.dukamp.filter(match);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Produtos</h1>
      <div className="grid gap-3 sm:grid-cols-[1fr_15rem_15rem]">
        <Input
          aria-label="Buscar produtos"
          placeholder="O que você está procurando?"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <select
          className={fieldClass}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Categoria"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          className={fieldClass}
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          aria-label="Vendido por"
        >
          <option value="">Todos os vendedores</option>
          <option value="loja">{data.store.name}</option>
          <option value="dukamp">Dukamp</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {supplier !== "dukamp" && own.map((p) => <OwnCard key={p.id} p={p} />)}
        {supplier !== "loja" && dukamp.map((p) => <DukampCard key={p.id} p={p} />)}
      </div>
      {!own.length && !dukamp.length && <EmptyState>Nenhum produto encontrado.</EmptyState>}
    </div>
  );
}
function OwnProduct({ id }: { id: string }) {
  const { data, add } = useStore();
  const p = data.products.find((p) => p.id === id),
    [image, setImage] = useState(0);
  if (!p) return <Missing />;
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="grid aspect-square place-items-center rounded-2xl border bg-white p-8">
          {p.images[image] ? (
            <img src={p.images[image]} alt={p.name} className="max-h-96 w-full object-contain" />
          ) : (
            <Package size={80} />
          )}
        </div>
        <div className="mt-3 flex gap-2">
          {p.images.map((src, i) => (
            <button key={src + i} onClick={() => setImage(i)} aria-label={`Ver imagem ${i + 1}`}>
              <img src={src} className="h-16 w-16 rounded-lg border object-contain" alt="" />
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {p.category} · {p.brand}
        </p>
        <h1 className="text-3xl font-bold">{p.name}</h1>
        <p className="text-3xl font-bold text-[var(--store-accent)]">{storeMoney(p.price)}</p>
        <p className="text-sm">
          {p.stock > 0 ? `${p.stock} ${p.unit} disponíveis` : "Produto esgotado"}
        </p>
        <Button
          className="bg-[var(--store-accent)] text-white"
          disabled={p.stock <= 0 || !data.store.payment_connected}
          onClick={() => add(id)}
        >
          <ShoppingCart size={18} />
          Adicionar ao carrinho
        </Button>
        <p className="text-sm text-muted-foreground">
          Vendido e entregue por {data.store.name}. Frete e retirada calculados no carrinho.
        </p>
        <RichContent html={p.description} />
      </div>
    </div>
  );
}
function DukampProduct({ slug }: { slug: string }) {
  const { data } = useStore(),
    cart = useCart(),
    nav = useNavigate();
  const p = data.dukamp.find((p) => p.slug === slug),
    [choices, setChoices] = useState<Record<string, string>>({}),
    [qty, setQty] = useState(1);
  if (!p) return <Missing />;
  const options = readProductOptions(p.options);
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="grid aspect-square place-items-center rounded-2xl border bg-white p-8">
        {p.images[0] ? (
          <img src={p.images[0]} alt={p.name} className="max-h-96 w-full object-contain" />
        ) : (
          <Package size={80} />
        )}
      </div>
      <div className="space-y-5">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Dukamp Saúde Animal
        </span>
        <h1 className="text-3xl font-bold">{p.name}</h1>
        <p className="text-3xl font-bold text-primary">{storeMoney(p.price)}</p>
        {options.length > 0 && (
          <ProductOptionSelector
            options={options}
            selected={choices}
            onSelect={(id, value) => setChoices((p) => ({ ...p, [id]: value }))}
          />
        )}
        <Field label="Quantidade">
          <Input
            className="max-w-28"
            type="number"
            min="1"
            max={p.stock}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
          />
        </Field>
        <Button
          disabled={p.stock <= 0}
          onClick={() => {
            try {
              const selectedOptions = resolveOptionSelections(
                options,
                Object.entries(choices).map(([option_id, value_id]) => ({ option_id, value_id })),
              );
              cart.add(
                {
                  id: p.id,
                  name: p.name,
                  price: p.price,
                  image: p.images[0],
                  slug: p.slug,
                  selectedOptions,
                  storeSlug: data.store.slug,
                },
                qty,
              );
              nav({ to: "/carrinho" });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Selecione as opções do produto.");
            }
          }}
        >
          Comprar com a Dukamp
          <ArrowRight size={16} />
        </Button>
        <p className="rounded-lg bg-primary/5 p-4 text-sm text-muted-foreground">
          Este produto é vendido, fabricado e entregue pela Dukamp. Você será direcionado ao
          carrinho Dukamp para calcular o frete e pagar. Os produtos de {data.store.name} têm
          carrinho e entrega próprios.
        </p>
        <RichContent html={p.description} />
      </div>
    </div>
  );
}
function StoreCart() {
  const { data, items, setItems } = useStore(),
    { store } = data,
    [customer, setCustomer] = useState({ ...EMPTY_CUSTOMER }),
    [fulfillment, setFulfillment] = useState<"pickup" | "delivery">(
      store.pickup_enabled ? "pickup" : "delivery",
    ),
    [method, setMethod] = useState<"pix" | "card">("pix"),
    [secrets, setSecrets] = useState(() => newCheckoutSecrets()),
    [locked, setLocked] = useState(false),
    checkout = useServerFn(checkoutStorefront);
  const subtotal = items.reduce(
    (n, i) => n + (data.products.find((p) => p.id === i.product_id)?.price || 0) * i.quantity,
    0,
  );
  let shipping = 0,
    error = "";
  try {
    shipping = storeDelivery(store, fulfillment, customer.cep, subtotal);
  } catch (e) {
    error = e instanceof Error ? e.message : "Entrega indisponível.";
  }
  const mutation = useMutation({
    mutationFn: () => {
      const input = storeCheckoutSchema.safeParse({
        slug: store.slug,
        ...secrets,
        items,
        customer,
        fulfillment,
        payment_method: method,
      });
      if (!input.success)
        throw new Error(input.error.issues[0]?.message || "Confira os dados da compra.");
      setLocked(true);
      return checkout({ data: input.data });
    },
    onSuccess: (r) => {
      localStorage.setItem(`store-order-${r.id}`, secrets.access_token);
      setItems([]);
      window.location.assign(`/${store.slug}/pedido/${r.id}?token=${secrets.access_token}`);
    },
    onError: (e) => {
      if (
        e instanceof Error &&
        /estoque|CEP|Produto indisponível|Loja indisponível|Checkout indisponível/.test(e.message)
      )
        setLocked(false);
      toast.error(
        e instanceof Error ? e.message : "Não foi possível emitir o pagamento. Tente novamente.",
      );
    },
  });
  if (!items.length)
    return (
      <div className="py-12 text-center">
        <ShoppingCart className="mx-auto mb-5 h-12 w-12 text-muted-foreground/40" />
        <h1 className="text-2xl font-bold">Seu carrinho está vazio</h1>
        <Button asChild className="mt-5">
          <a href={`/${store.slug}/produtos`}>Explorar produtos</a>
        </Button>
      </div>
    );
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Finalizar compra em {store.name}</h1>
      <p className="text-sm text-muted-foreground">
        Pagamento recebido por {store.name}. Produtos e entrega sob responsabilidade desta loja.
      </p>
      <form
        className="grid gap-6 lg:grid-cols-[1fr_23rem]"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <fieldset disabled={locked} className="min-w-0 space-y-5">
          <section className="space-y-4 rounded-xl border p-5">
            {items.map((i) => {
              const p = data.products.find((p) => p.id === i.product_id);
              return (
                <div
                  key={i.product_id}
                  className="flex flex-wrap items-center gap-3 border-b pb-4 last:border-b-0"
                >
                  {p?.images[0] && (
                    <img src={p.images[0]} className="h-16 w-16 object-contain" alt="" />
                  )}
                  <div className="min-w-32 flex-1">
                    <p className="font-semibold">{p?.name || "Produto indisponível"}</p>
                    <p className="text-sm text-muted-foreground">{storeMoney(p?.price || 0)}</p>
                  </div>
                  <Input
                    className="w-20"
                    type="number"
                    min="1"
                    max={p?.stock || 1}
                    aria-label={`Quantidade de ${p?.name}`}
                    value={i.quantity}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((l) =>
                          l.product_id === i.product_id
                            ? { ...l, quantity: Math.max(1, Number(e.target.value)) }
                            : l,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    aria-label="Remover produto"
                    onClick={() =>
                      setItems((prev) => prev.filter((l) => l.product_id !== i.product_id))
                    }
                  >
                    <X size={18} />
                  </button>
                </div>
              );
            })}
          </section>
          <section className="space-y-5 rounded-xl border p-5">
            <h2 className="font-semibold">Dados do comprador e entrega</h2>
            <Field label="Como deseja receber?">
              <select
                className={fieldClass}
                value={fulfillment}
                onChange={(e) => setFulfillment(e.target.value as typeof fulfillment)}
              >
                {store.pickup_enabled && <option value="pickup">Retirada em {store.name}</option>}
                {store.delivery_enabled && (
                  <option value="delivery">
                    Entrega pela loja — {store.delivery_days} dias úteis
                  </option>
                )}
              </select>
            </Field>
            {fulfillment === "pickup" && (
              <p className="text-xs text-muted-foreground">
                Retirada: {store.address}. Aguarde a confirmação da loja antes de se deslocar.
              </p>
            )}
            <CustomerFields
              value={customer}
              onChange={setCustomer}
              delivery={fulfillment === "delivery"}
            />
          </section>
        </fieldset>
        <aside className="h-fit space-y-4 rounded-xl border bg-card p-5 lg:sticky lg:top-5">
          <h2 className="font-semibold">Resumo da compra</h2>
          <p className="flex justify-between text-sm">
            Produtos<span>{storeMoney(subtotal)}</span>
          </p>
          <p className="flex justify-between text-sm">
            {fulfillment === "pickup" ? "Retirada" : "Frete"}
            <span>{storeMoney(shipping)}</span>
          </p>
          <p className="flex justify-between border-t pt-4 text-xl font-bold">
            Total<span>{storeMoney(subtotal + shipping)}</span>
          </p>
          <Field label="Pagamento">
            <select
              className={fieldClass}
              disabled={locked}
              value={method}
              onChange={(e) => setMethod(e.target.value as typeof method)}
            >
              <option value="pix">Pix — QR Code e copia e cola</option>
              <option value="card">Cartão pelo Mercado Pago</option>
            </select>
          </Field>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {!store.payment_connected && (
            <p className="text-sm text-destructive">
              Esta loja ainda não habilitou pagamentos online.
            </p>
          )}
          <Button
            type="submit"
            className="w-full bg-[var(--store-accent)] text-white"
            disabled={mutation.isPending || !!error || !store.payment_connected}
          >
            {mutation.isPending
              ? "Emitindo pagamento..."
              : locked
                ? "Tentar emitir novamente"
                : method === "pix"
                  ? "Gerar Pix"
                  : "Continuar para cartão"}
          </Button>
          {locked && (
            <p className="text-xs text-muted-foreground">
              Os dados foram preservados para evitar cobranças duplicadas. Tente emitir novamente; o
              mesmo pedido será retomado.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Ao continuar, você concorda com os{" "}
            <a className="underline" href={`/${store.slug}/paginas/termos-e-condicoes`}>
              termos da loja
            </a>{" "}
            e a{" "}
            <a
              className="underline"
              href={`/${store.slug}/paginas/privacidade-e-protecao-de-dados`}
            >
              política de privacidade
            </a>
            .
          </p>
        </aside>
      </form>
    </div>
  );
}
function StorePayment({ id }: { id: string }) {
  const { data } = useStore(),
    load = useServerFn(loadStoreOrder),
    [token] = useState(
      () =>
        new URLSearchParams(window.location.search).get("token") ||
        localStorage.getItem(`store-order-${id}`) ||
        "",
    );
  const q = useQuery({
    queryKey: ["store-order", data.store.id, id, token],
    queryFn: () => load({ data: { slug: data.store.slug, id, token } }),
    enabled: !!token,
    retry: false,
    refetchInterval: (q) =>
      q.state.data &&
      ["approved", "cancelled", "refunded", "charged_back"].includes(q.state.data.payment_status)
        ? false
        : 12000,
  });
  const retryPayment = useServerFn(retryStorePayment);
  const retry = useMutation({
    mutationFn: () => retryPayment({ data: { slug: data.store.slug, id, token } }),
    onSuccess: () => q.refetch(),
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível emitir o pagamento."),
  });
  useEffect(() => {
    if (token) {
      localStorage.setItem(`store-order-${id}`, token);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [id, token]);
  if (!token)
    return (
      <ErrorNotice
        error={new Error("Abra o link completo do pedido no mesmo navegador usado para a compra.")}
      />
    );
  if (q.isPending) return <p>Consultando pagamento...</p>;
  if (q.error || !q.data) return <ErrorNotice error={q.error} retry={() => q.refetch()} />;
  const o = q.data,
    paid = o.payment_status === "approved",
    expired = Date.parse(o.expires_at) < Date.now();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        {paid && <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-primary" />}
        <h1 className="text-3xl font-bold">
          {paid
            ? "Pedido confirmado!"
            : o.payment_status === "refunded"
              ? "Pagamento reembolsado"
              : o.payment_status === "cancelled"
                ? "Pedido cancelado"
                : "Seu pedido foi registrado"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Pedido #{o.order_number} · {o.store_name}
        </p>
      </div>
      <section className="space-y-4 rounded-xl border bg-card p-6">
        <p className="text-center text-3xl font-bold">{storeMoney(o.total)}</p>
        {paid ? (
          <div className="space-y-3 text-center">
            <p className="font-medium">Pagamento confirmado. Agora é com {o.store_name}!</p>
            <p className="text-sm text-muted-foreground">
              Etapa: <span className="capitalize">{o.delivery_status}</span> ·{" "}
              {o.fulfillment === "pickup" ? "Retirada na loja" : "Entrega pela loja"}
            </p>
          </div>
        ) : (
          <>
            {expired ? (
              <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-950">
                O prazo deste pagamento terminou. Consulte o status e fale com a loja antes de
                emitir outro pedido.
              </p>
            ) : o.payment_method === "pix" ? (
              <div className="space-y-4 text-center">
                {o.qr_image && (
                  <img
                    src={`data:image/png;base64,${o.qr_image}`}
                    className="mx-auto h-64 w-64"
                    alt="QR Code Pix da compra"
                  />
                )}
                <p className="text-sm">
                  Pague pelo aplicativo do seu banco. O recebimento será de {o.store_name}.
                </p>
                {o.qr_code && (
                  <>
                    <Input readOnly value={o.qr_code} aria-label="Pix copia e cola" />
                    <Button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(o.qr_code!);
                          toast.success("Código Pix copiado.");
                        } catch {
                          toast.error("Selecione e copie o código Pix acima.");
                        }
                      }}
                    >
                      <Copy size={16} />
                      Copiar código Pix
                    </Button>
                  </>
                )}
                <p className="text-xs text-muted-foreground">
                  Válido até {new Date(o.expires_at).toLocaleString("pt-BR")}
                </p>
              </div>
            ) : (
              o.checkout_url && (
                <Button asChild className="w-full">
                  <a href={o.checkout_url} rel="noreferrer">
                    <CreditCard size={18} />
                    Pagar com cartão no Mercado Pago
                  </a>
                </Button>
              )
            )}
            {!expired && !o.qr_code && !o.checkout_url && (
              <div className="space-y-3">
                <p className="text-sm">
                  O pedido foi salvo. A emissão do pagamento ainda não foi concluída.
                </p>
                <Button
                  className="w-full"
                  disabled={retry.isPending}
                  onClick={() => retry.mutate()}
                >
                  {retry.isPending ? "Emitindo..." : "Retomar emissão do pagamento"}
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              className="w-full"
              disabled={q.isFetching}
              onClick={() => q.refetch()}
            >
              {q.isFetching ? "Consultando..." : "Já paguei — consultar status"}
            </Button>
          </>
        )}
        <div className="border-t pt-4 text-sm">
          {o.items.map((i) => (
            <p key={i.product_id} className="flex justify-between gap-3 py-2">
              <span>
                {i.quantity} × {i.name}
              </span>
              <span>{storeMoney(i.subtotal)}</span>
            </p>
          ))}
          <p className="mt-2 flex justify-between">
            Frete<span>{storeMoney(o.shipping_cost)}</span>
          </p>
        </div>
      </section>
      <Button
        variant="outline"
        onClick={async () => {
          await navigator.clipboard.writeText(
            `${window.location.origin}/${data.store.slug}/pedido/${id}?token=${token}`,
          );
          toast.success("Link do pedido copiado.");
        }}
      >
        Copiar link para acompanhar o pedido
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Salve o endereço deste pedido para acompanhar a compra. Atendimento: {data.store.phone} ·{" "}
        {data.store.email}
      </p>
      <Button variant="outline" asChild className="w-full">
        <a href={`/${data.store.slug}`}>Voltar à loja</a>
      </Button>
    </div>
  );
}
