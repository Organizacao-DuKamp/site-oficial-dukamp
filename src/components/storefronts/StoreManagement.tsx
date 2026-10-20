import { PartnerPixField } from "@/components/partners/PartnerPixField";
import { PartnerSales } from "@/components/partners/PartnerSales";
import { CustomerFields, EMPTY_CUSTOMER, newCheckoutSecrets } from "./StoreShared";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import {
  storeDashboard,
  saveStoreConfig,
  saveStoreProduct,
  archiveStoreProduct,
  uploadStoreImage,
  registerStoreSale,
  updateStoreSale,
} from "@/lib/storefronts.functions";
import {
  storeConfigSchema,
  storeMoney,
  storeDelivery,
  type Store,
  type StoreConfig,
  type StoreProduct,
  type StoreProductInput,
  type StoreOrder,
  type StoreCheckout,
} from "@/lib/storefronts";
import {
  PageHeading,
  ErrorNotice,
  Field,
  fieldClass,
  EmptyState,
} from "@/components/partners/PartnerUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { FOOTER_PAGES } from "@/lib/footer-pages";
import { toast } from "sonner";
import {
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Plus,
  Search,
  Package,
  Store as StoreIcon,
  Wallet,
  Eye,
  ShoppingBag,
  Check,
  Copy,
  Trash2,
  Pencil,
  Link2,
  ImagePlus,
  RefreshCw,
} from "lucide-react";
function Panel({ children }: { children: ReactNode }) {
  return <section className="rounded-xl border bg-card p-5 sm:p-6">{children}</section>;
}
function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Não foi possível concluir. Tente novamente.";
}
export function StoreManagement({ section = "visao-geral" }: { section?: string }) {
  const { user } = useAuth(),
    fetch = useServerFn(storeDashboard),
    [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["my-store", user?.id, page],
    queryFn: () => fetch({ data: { page } }),
    enabled: !!user,
    retry: false,
  });
  if (q.isPending) return <p className="text-sm text-muted-foreground">Carregando sua loja...</p>;
  if (q.error || !q.data) return <ErrorNotice error={q.error} retry={() => q.refetch()} />;
  const data = q.data;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <StoreIcon size={20} />
          </div>
          <div>
            <p className="font-semibold">{data.store.name}</p>
            <p className="text-xs text-muted-foreground">
              /{data.store.slug} · {data.store.published ? "Loja publicada" : "Em preparação"}
            </p>
          </div>
        </div>
        {data.store.published ? (
          <Button variant="outline" asChild>
            <a href={`/${data.store.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              Ver minha loja
            </a>
          </Button>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900">
            Configure e publique nas definições
          </span>
        )}
      </div>
      {["definicoes", "footer", "navbar", "configuracoes"].includes(section) ? (
        <StoreEditors
          key={section + data.store.updated_at}
          section={section}
          store={data.store}
        />
      ) : section === "estoque" ? (
        <Inventory products={data.products} />
      ) : section === "vendas/nova" ? (
        <ManualSale store={data.store} products={data.products} />
      ) : section === "vendas/historico" ? (
        <>
        <PartnerSales />
        <h2 className="text-lg font-semibold">Histórico anterior da loja</h2>
        <StoreSales
          orders={data.orders}
          page={page}
          pages={Math.max(1, Math.ceil(data.orderCount / 30))}
          setPage={setPage}
        />
        </>
      ) : section === "vendas/painel" || section === "visao-geral" ? (
        <>
          <PageHeading
            title={section === "visao-geral" ? "Visão geral do meu site" : "Visão geral das vendas"}
            description="Acompanhe sua loja. Novos registros de venda são confirmados pela Dukamp e a comissão aparece em Gerenciar vendas."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Faturamento recebido",
                value: storeMoney(data.summary.revenue),
                icon: Wallet,
              },
              { label: "Vendas pagas", value: data.summary.paid_orders, icon: ShoppingBag },
              { label: "Produtos próprios", value: data.summary.products, icon: Package },
              { label: "Visitas nos últimos 30 dias", value: data.summary.visits_30d, icon: Eye },
            ].map((c) => (
              <Panel key={c.label}>
                <div className="flex justify-between text-sm text-muted-foreground">
                  {c.label}
                  <c.icon size={18} />
                </div>
                <p className="mt-3 text-3xl font-bold">{c.value}</p>
              </Panel>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <h2 className="mb-4 font-semibold">Sua loja está pronta?</h2>
              <div className="space-y-3 text-sm">
                {[
                  [data.store.published, "Site publicado"],
                  [
                    data.products.some((p) => p.active && p.stock > 0),
                    "Produtos próprios disponíveis",
                  ],
                  [!!data.store.phone && !!data.store.email, "Contato da loja preenchido"],
                ].map(([done, label]) => (
                  <p key={String(label)} className="flex items-center gap-2">
                    <Check
                      size={16}
                      className={done ? "text-primary" : "text-muted-foreground/30"}
                    />
                    {label}
                  </p>
                ))}
              </div>
              <Button className="mt-5" variant="outline" asChild>
                <a href="/parceiro/site/definicoes">Ajustar definições</a>
              </Button>
            </Panel>
            <Panel>
              <h2 className="font-semibold">Catálogo com dois responsáveis</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Seus produtos, estoque, recebimentos e entregas são administrados aqui. As rações
                Dukamp aparecem em destaque e são compradas pelo checkout da Dukamp.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {data.summary.units} unidades em estoque · {data.summary.pending} pedidos aguardando
                pagamento. Visitas contam um navegador por loja por dia.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">Cadastre sua chave Pix nas definições. As novas vendas registradas no painel aguardam confirmação da Dukamp e comissão definida pelo administrador.</p>
            </Panel>
          </div>
          <StoreSales orders={data.orders.slice(0, 5)} compact />
        </>
      ) : (
        <EmptyState>Área não encontrada.</EmptyState>
      )}
    </div>
  );
}
function ImageUpload({
  value,
  onChange,
  label = "Imagem",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const upload = useServerFn(uploadStoreImage),
    [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <Field label={`${label} (URL HTTPS)`}>
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://..." />
      </Field>
      <div className="flex items-center gap-3">
        {value && (
          <img
            src={value}
            alt={label}
            className="h-16 w-16 rounded-lg border bg-white object-contain"
          />
        )}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <ImagePlus size={16} />
          {busy ? "Enviando..." : "Enviar PNG, JPG ou WebP"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 5 * 1024 * 1024) {
                toast.error("Limite de 5 MB por imagem.");
                return;
              }
              setBusy(true);
              try {
                const b64 = await new Promise<string>((resolve, reject) => {
                  const r = new FileReader();
                  r.onload = () => resolve(String(r.result).split(",")[1]);
                  r.onerror = reject;
                  r.readAsDataURL(f);
                });
                onChange(
                  (
                    await upload({
                      data: {
                        base64: b64,
                        mime: f.type as "image/png" | "image/jpeg" | "image/webp",
                      },
                    })
                  ).url,
                );
              } catch (err) {
                toast.error(errorMessage(err));
              } finally {
                setBusy(false);
                e.target.value = "";
              }
            }}
          />
        </label>
      </div>
    </div>
  );
}
function StoreEditors({
  section,
  store,
}: {
  section: string;
  store: Store;
}) {
  const [form, setForm] = useState<StoreConfig>(() => storeConfigSchema.parse(store)),
    [footerSlug, setFooterSlug] = useState<string>(FOOTER_PAGES[0].slug);
  const save = useServerFn(saveStoreConfig),
    qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["my-store"] });
  const mutation = useMutation({
    mutationFn: () => save({ data: storeConfigSchema.parse(form) }),
    onSuccess: () => {
      refresh();
      toast.success("Sua loja foi atualizada.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const field = (k: keyof StoreConfig, label: string, multiline = false) => (
    <Field label={label}>
      {multiline ? (
        <Textarea
          value={String(form[k] ?? "")}
          onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
        />
      ) : (
        <Input
          value={String(form[k] ?? "")}
          onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
        />
      )}
    </Field>
  );
  const toggle = (k: "published" | "pickup_enabled" | "delivery_enabled", label: string) => (
    <label className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">
      <span>{label}</span>
      <Switch checked={form[k]} onCheckedChange={(v) => setForm((p) => ({ ...p, [k]: v }))} />
    </label>
  );
  const page = form.footer[footerSlug] || {
    title: FOOTER_PAGES.find((p) => p.slug === footerSlug)?.title || "",
    html: "",
  };
  const updateFooter = (patch: Partial<typeof page>) =>
    setForm((p) => ({ ...p, footer: { ...p.footer, [footerSlug]: { ...page, ...patch } } }));
  return (
    <>
      <PageHeading
        title={
          {
            definicoes: "Definições da loja",
            footer: "Footer — páginas institucionais",
            navbar: "Menu do site (Navbar)",
            configuracoes: "Configurações do site",
          }[section] || ""
        }
        description="Personalize sua loja online. As alterações se aplicam apenas ao seu site."
      />
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        {section === "definicoes" && (
          <>
            <Panel>
              <h2 className="mb-5 font-semibold">Identidade e endereço da loja</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {field("name", "Nome da loja")}
                <Field label="Endereço exclusivo">
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase() }))}
                    placeholder="agropet"
                  />
                  <span className="text-xs font-normal text-muted-foreground">
                    {typeof window !== "undefined"
                      ? window.location.origin
                      : "https://dukamp.netlify.app"}
                    /{form.slug}
                  </span>
                </Field>
                <div className="sm:col-span-2">
                  <ImageUpload
                    value={form.logo_url}
                    onChange={(v) => setForm((p) => ({ ...p, logo_url: v }))}
                    label="Logo da loja"
                  />
                </div>
                <div className="sm:col-span-2">{toggle("published", "Publicar minha loja")}</div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                O endereço usa o domínio da Dukamp. Depois de trocar a URL, atualize os links que já
                compartilhou. Preencha o contato nas configurações antes de publicar.
              </p>
            </Panel>
            <PartnerPixField />
          </>
        )}
        {section === "configuracoes" && (
          <>
            <Panel>
              <div className="grid gap-4 sm:grid-cols-2">
                {field("name", "Nome do site")}
                {field("tagline", "Slogan")}
                {field("email", "E-mail de atendimento")}
                {field("phone", "Telefone / WhatsApp")}
                <div className="sm:col-span-2">{field("address", "Endereço da loja", true)}</div>
                {field("hero_title", "Título da vitrine")}
                {field("accent", "Cor principal (hexadecimal)")}
                <div className="sm:col-span-2">
                  {field("hero_text", "Texto de apresentação", true)}
                </div>
              </div>
            </Panel>
            <Panel>
              <h2 className="mb-4 font-semibold">Entrega dos seus produtos</h2>
              <div className="space-y-4">
                {toggle("pickup_enabled", "Permitir retirada na loja")}
                {toggle("delivery_enabled", "Permitir entrega pela loja")}
                <div className="grid gap-4 sm:grid-cols-3">
                  {(["delivery_fee", "delivery_days", "free_shipping_from"] as const).map(
                    (k, i) => (
                      <Field
                        key={k}
                        label={
                          [
                            "Frete fixo (R$)",
                            "Prazo (dias úteis)",
                            "Frete grátis a partir de (R$)",
                          ][i]
                        }
                      >
                        <Input
                          type="number"
                          min="0"
                          step={k === "delivery_days" ? 1 : 0.01}
                          value={form[k]}
                          onChange={(e) => setForm((p) => ({ ...p, [k]: Number(e.target.value) }))}
                        />
                      </Field>
                    ),
                  )}
                </div>
                <Field label="Prefixos de CEP atendidos (separados por vírgula)">
                  <Input
                    value={form.delivery_cep_prefixes.join(", ")}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        delivery_cep_prefixes: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }))
                    }
                    placeholder="15150, 15155"
                  />
                </Field>
                <p className="text-xs text-muted-foreground">
                  Exemplo: 15150 atende os CEPs que começam com 15150. A entrega desses produtos é
                  responsabilidade da sua loja. Zero no limite de frete grátis desativa o benefício.
                </p>
              </div>
            </Panel>
          </>
        )}
        {section === "navbar" && (
          <>
            <Panel>
              <p className="mb-4 text-sm text-muted-foreground">
                Altere rótulos, links, visibilidade e ordem. Caminhos como /produtos abrem dentro da
                sua loja.
              </p>
              <div className="divide-y">
                {form.navbar.map((it, i) => (
                  <div key={it.key} className="grid gap-3 py-4 sm:grid-cols-[1fr_1fr_auto_auto]">
                    <Field label="Rótulo">
                      <Input
                        value={it.label}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            navbar: p.navbar.map((n, j) =>
                              j === i ? { ...n, label: e.target.value } : n,
                            ),
                          }))
                        }
                      />
                    </Field>
                    <Field label="Link">
                      <Input
                        value={it.to}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            navbar: p.navbar.map((n, j) =>
                              j === i ? { ...n, to: e.target.value } : n,
                            ),
                          }))
                        }
                      />
                    </Field>
                    <label className="flex items-center gap-2 self-end py-2 text-xs">
                      <Switch
                        checked={it.visible}
                        onCheckedChange={(v) =>
                          setForm((p) => ({
                            ...p,
                            navbar: p.navbar.map((n, j) => (j === i ? { ...n, visible: v } : n)),
                          }))
                        }
                      />
                      Visível
                    </label>
                    <div className="flex self-end gap-1">
                      {[-1, 1].map((dir) => (
                        <Button
                          key={dir}
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={dir === -1 ? "Mover para cima" : "Mover para baixo"}
                          disabled={i + dir < 0 || i + dir >= form.navbar.length}
                          onClick={() =>
                            setForm((p) => {
                              const a = [...p.navbar];
                              [a[i], a[i + dir]] = [a[i + dir], a[i]];
                              return { ...p, navbar: a };
                            })
                          }
                        >
                          {dir === -1 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setForm((p) => ({
                  ...p,
                  navbar: storeConfigSchema.parse(store).navbar.map((n) => n),
                }))
              }
            >
              Desfazer alterações do menu
            </Button>
          </>
        )}
        {section === "footer" && (
          <div className="grid gap-5 lg:grid-cols-[15rem_1fr]">
            <Panel>
              {(["informacoes", "seguranca"] as const).map((group) => (
                <div key={group} className="mb-4">
                  <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    {group === "informacoes" ? "Informações" : "Segurança"}
                  </p>
                  {FOOTER_PAGES.filter((p) => p.group === group).map((p) => (
                    <button
                      type="button"
                      key={p.slug}
                      onClick={() => setFooterSlug(p.slug)}
                      className={`my-1 w-full rounded-md px-3 py-2 text-left text-sm ${footerSlug === p.slug ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              ))}
            </Panel>
            <Panel>
              <div className="space-y-4">
                <Field label="Título da página">
                  <Input
                    value={page.title}
                    onChange={(e) => updateFooter({ title: e.target.value })}
                  />
                </Field>
                <Field label="Conteúdo">
                  <RichTextEditor
                    key={footerSlug}
                    value={page.html}
                    onChange={(html) => updateFooter({ html })}
                  />
                </Field>
                {store.published && (
                  <a
                    className="text-sm text-primary underline"
                    href={`/${store.slug}/paginas/${footerSlug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver página no site
                  </a>
                )}
              </div>
            </Panel>
          </div>
        )}
        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </form>
    </>
  );
}
const blankProduct: StoreProductInput = {
  name: "",
  code: "",
  description: "",
  category: "",
  brand: "",
  unit: "un",
  images: [],
  price: 0,
  cost: 0,
  stock: 0,
  active: true,
};
function Inventory({ products }: { products: StoreProduct[] }) {
  const [term, setTerm] = useState(""),
    [editing, setEditing] = useState<StoreProductInput | null>(null),
    save = useServerFn(saveStoreProduct),
    archive = useServerFn(archiveStoreProduct),
    qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => save({ data: editing! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-store"] });
      setEditing(null);
      toast.success("Produto salvo.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const rows = products.filter((p) =>
    `${p.name} ${p.code} ${p.category}`.toLowerCase().includes(term.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="Estoque da minha loja"
        description="Cadastre e administre seus produtos. As rações Dukamp entram automaticamente no catálogo público."
        action={
          <Button onClick={() => setEditing({ ...blankProduct })}>
            <Plus size={16} />
            Novo produto
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Produtos", products.length],
          ["Unidades", products.reduce((n, p) => n + p.stock, 0)],
          ["Valor em estoque", storeMoney(products.reduce((n, p) => n + p.stock * p.cost, 0))],
        ].map(([label, n]) => (
          <Panel key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{n}</p>
          </Panel>
        ))}
      </div>
      <Input
        aria-label="Buscar produtos da minha loja"
        placeholder="Buscar produto, código ou categoria..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              {["Produto", "Categoria", "Preço", "Estoque", "Status", "Ações"].map((h) => (
                <th className="p-4" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {p.images[0] ? (
                      <img
                        src={p.images[0]}
                        alt=""
                        className="h-12 w-12 rounded-md object-contain"
                      />
                    ) : (
                      <Package className="h-10 w-10 text-muted-foreground/30" />
                    )}
                    <div className="min-w-32 font-medium">
                      {p.name}
                      <p className="text-xs font-normal text-muted-foreground">
                        {p.code || "Sem código"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-4">{p.category || "—"}</td>
                <td className="whitespace-nowrap p-4">{storeMoney(p.price)}</td>
                <td className="p-4">
                  {p.stock} {p.unit}
                </td>
                <td className="p-4">{p.active ? "Ativo" : "Inativo"}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <Button
                      aria-label={`Editar ${p.name}`}
                      size="icon"
                      variant="outline"
                      onClick={() => setEditing({ ...p, version: p.updated_at })}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      aria-label={`Excluir ${p.name}`}
                      size="icon"
                      variant="outline"
                      onClick={async () => {
                        if (
                          !confirm(
                            `Arquivar ${p.name}? Ele sairá do catálogo. As vendas serão preservadas.`,
                          )
                        )
                          return;
                        try {
                          await archive({ data: { id: p.id } });
                          qc.invalidateQueries({ queryKey: ["my-store"] });
                          toast.success("Produto arquivado.");
                        } catch (e) {
                          toast.error(errorMessage(e));
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <EmptyState>Nenhum produto encontrado. Cadastre o primeiro produto da loja.</EmptyState>
        )}
      </div>
      <Dialog
        open={!!editing}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar produto" : "Novo produto da loja"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {(["name", "code", "category", "brand", "unit"] as const).map((k, i) => (
                  <Field
                    key={k}
                    label={["Nome", "Código / SKU", "Categoria / catálogo", "Marca", "Unidade"][i]}
                  >
                    <Input
                      required={k === "name"}
                      value={editing[k]}
                      onChange={(e) => setEditing((p) => ({ ...p!, [k]: e.target.value }))}
                    />
                  </Field>
                ))}
                {(["price", "cost", "stock"] as const).map((k, i) => (
                  <Field
                    key={k}
                    label={["Preço de venda (R$)", "Custo (R$)", "Estoque disponível"][i]}
                  >
                    <Input
                      type="number"
                      min={k === "price" ? 0.01 : 0}
                      step={k === "stock" ? 1 : 0.01}
                      required
                      value={editing[k]}
                      onChange={(e) => setEditing((p) => ({ ...p!, [k]: Number(e.target.value) }))}
                    />
                  </Field>
                ))}
              </div>
              <ImageUpload
                value={editing.images[0] || ""}
                onChange={(v) =>
                  setEditing((p) => ({
                    ...p!,
                    images: v ? [v, ...p!.images.slice(1)] : p!.images.slice(1),
                  }))
                }
              />
              <Field label="Outras imagens (uma URL HTTPS por linha)">
                <Textarea
                  value={editing.images.slice(1).join("\n")}
                  onChange={(e) =>
                    setEditing((p) => ({
                      ...p!,
                      images: [
                        p!.images[0] || "",
                        ...e.target.value.split("\n").filter(Boolean),
                      ].filter(Boolean),
                    }))
                  }
                />
              </Field>
              <Field label="Descrição">
                <RichTextEditor
                  value={editing.description}
                  onChange={(v) => setEditing((p) => ({ ...p!, description: v }))}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={editing.active}
                  onCheckedChange={(v) => setEditing((p) => ({ ...p!, active: v }))}
                />
                Produto ativo na loja
              </label>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Salvar produto"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function ManualSale({ store, products }: { store: Store; products: StoreProduct[] }) {
  const [customer, setCustomer] = useState({ ...EMPTY_CUSTOMER }),
    [items, setItems] = useState<Array<{ product_id: string; quantity: number }>>([]),
    [fulfillment, setFulfillment] = useState<"pickup" | "delivery">(
      store.pickup_enabled ? "pickup" : "delivery",
    ),
    [secrets, setSecrets] = useState(() => newCheckoutSecrets()),
    register = useServerFn(registerStoreSale),
    qc = useQueryClient();
  const subtotal = items.reduce(
    (n, i) => n + (products.find((p) => p.id === i.product_id)?.price || 0) * i.quantity,
    0,
  );
  let shipping = 0,
    shippingError = "";
  try {
    shipping = storeDelivery(store, fulfillment, customer.cep, subtotal);
  } catch (e) {
    shippingError = errorMessage(e);
  }
  const save = useMutation({
    mutationFn: () =>
      register({
        data: {
          slug: store.slug,
          ...secrets,
          items,
          customer,
          fulfillment,
          payment_method: "manual",
        },
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["my-store"] });
      setSecrets(newCheckoutSecrets());
      setItems([]);
      setCustomer({ ...EMPTY_CUSTOMER });
      qc.invalidateQueries({ queryKey: ["partner-sales"] });
      toast.success(`Pedido ${r.order_number} enviado para confirmação da Dukamp.`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <>
      <PageHeading
        title="Registrar venda da loja"
        description="Registre o pedido sem pagamento. A Dukamp entrará em contato com o cliente, confirmará a compra e definirá sua comissão."
      />
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Panel>
          <h2 className="mb-4 font-semibold">Produtos da sua loja</h2>
          <select
            className={fieldClass}
            value=""
            aria-label="Adicionar produto à venda"
            onChange={(e) => {
              const id = e.target.value;
              setItems((p) =>
                p.some((i) => i.product_id === id)
                  ? p.map((i) => (i.product_id === id ? { ...i, quantity: i.quantity + 1 } : i))
                  : [...p, { product_id: id, quantity: 1 }],
              );
            }}
          >
            <option value="">Selecione um produto...</option>
            {products
              .filter((p) => p.active && p.stock > 0)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {storeMoney(p.price)} ({p.stock} em estoque)
                </option>
              ))}
          </select>
          <div className="mt-4 space-y-3">
            {items.map((i) => (
              <div key={i.product_id} className="flex items-center gap-3 text-sm">
                <span className="flex-1">{products.find((p) => p.id === i.product_id)?.name}</span>
                <Input
                  className="w-20"
                  aria-label="Quantidade"
                  type="number"
                  min="1"
                  value={i.quantity}
                  onChange={(e) =>
                    setItems((p) =>
                      p.map((x) =>
                        x.product_id === i.product_id
                          ? { ...x, quantity: Math.max(1, Number(e.target.value)) }
                          : x,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setItems((p) => p.filter((x) => x.product_id !== i.product_id))}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-4 font-semibold">Cliente e entrega</h2>
          <select
            className={`${fieldClass} mb-4`}
            value={fulfillment}
            onChange={(e) => setFulfillment(e.target.value as typeof fulfillment)}
            aria-label="Forma de entrega"
          >
            {store.pickup_enabled && <option value="pickup">Retirada na loja</option>}
            {store.delivery_enabled && <option value="delivery">Entrega pela loja</option>}
          </select>
          <CustomerFields
            value={customer}
            onChange={setCustomer}
            delivery={fulfillment === "delivery"}
          />
        </Panel>
        <Panel>
          <p className="text-sm">
            Produtos: {storeMoney(subtotal)} · Frete: {storeMoney(shipping)}
          </p>
          <p className="my-3 text-xl font-semibold">
            Total do pedido: {storeMoney(subtotal + shipping)}
          </p>
          {shippingError && (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {shippingError}
            </p>
          )}
          <Button type="submit" disabled={save.isPending || !items.length || !!shippingError}>
            {save.isPending ? "Registrando..." : "Registrar venda sem pagamento"}
          </Button>
        </Panel>
      </form>
    </>
  );
}
const PAYMENT_LABELS: Record<string, string> = {
  pending: "Aguardando pagamento",
  in_process: "Em análise",
  approved: "Pago",
  rejected: "Pagamento recusado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  charged_back: "Estornado",
};
function StoreSales({
  orders,
  page = 1,
  pages = 1,
  setPage,
  compact = false,
}: {
  orders: StoreOrder[];
  page?: number;
  pages?: number;
  setPage?: (n: number) => void;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<StoreOrder | null>(null),
    [status, setStatus] = useState("preparando"),
    [notes, setNotes] = useState(""),
    [customer, setCustomer] = useState({ ...EMPTY_CUSTOMER }),
    [filter, setFilter] = useState(""),
    [term, setTerm] = useState(""),
    update = useServerFn(updateStoreSale),
    qc = useQueryClient();
  const action = useMutation({
    mutationFn: ({
      order,
      action,
    }: {
      order: StoreOrder;
      action: "edit" | "refresh" | "delete" | "archive" | "cancel";
    }) =>
      update({
        data: {
          id: order.id,
          action,
          patch:
            action === "edit"
              ? {
                  delivery_status: status as "preparando" | "enviado" | "entregue",
                  notes,
                  ...(order.source === "manual" ? { customer } : {}),
                }
              : {},
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-store"] });
      setSelected(null);
      toast.success("Venda atualizada.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const rows = orders.filter(
    (o) =>
      (!filter || o.payment_status === filter) &&
      `${o.order_number} ${o.customer.name}`.toLowerCase().includes(term.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title={compact ? "Últimas vendas" : "Histórico de vendas da loja"}
        description={
          compact
            ? "Compras dos produtos próprios da sua loja."
            : "Consulte pagamentos, acompanhe entregas e edite os registros da sua loja."
        }
      />
      {!compact && (
        <div className="flex flex-wrap gap-3">
          <Input
            className="max-w-sm"
            placeholder="Buscar nesta página por número ou cliente..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <select
            className={`${fieldClass} max-w-xs`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filtrar pagamentos"
          >
            <option value="">Todos os pagamentos</option>
            {Object.entries(PAYMENT_LABELS).map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Pedido / cliente", "Data", "Valor", "Pagamento", "Entrega", ""].map((h, i) => (
                <th className="p-4" key={i}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((o) => (
              <tr key={o.id}>
                <td className="p-4">
                  <p className="font-semibold">
                    #{o.order_number} · {o.customer.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.source === "manual" ? "Registro manual" : "Loja online"}
                  </p>
                </td>
                <td className="whitespace-nowrap p-4">
                  {new Date(o.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="whitespace-nowrap p-4">{storeMoney(o.total)}</td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${o.payment_status === "approved" ? "bg-primary/10 text-primary" : "bg-muted"}`}
                  >
                    {PAYMENT_LABELS[o.payment_status] || o.payment_status}
                  </span>
                </td>
                <td className="p-4 capitalize">{o.delivery_status}</td>
                <td className="p-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelected(o);
                      setStatus(
                        o.delivery_status === "cancelado" ? "preparando" : o.delivery_status,
                      );
                      setNotes(o.notes);
                      setCustomer(o.customer);
                    }}
                  >
                    Abrir
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState>Nenhuma venda encontrada.</EmptyState>}
      </div>
      {setPage && (
        <div className="flex items-center justify-between text-sm">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          Página {page} de {pages}
          <Button variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Próxima
          </Button>
        </div>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Venda #{selected?.order_number}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <p className="text-sm">
                {selected.customer.name} · {PAYMENT_LABELS[selected.payment_status]} ·{" "}
                {selected.customer.phone}
              </p>
              <div className="rounded-lg border p-4 text-sm">
                {selected.items.map((i) => (
                  <p key={i.product_id} className="flex justify-between gap-2 py-1">
                    <span>
                      {i.quantity} × {i.name}
                    </span>
                    <span>{storeMoney(i.subtotal)}</span>
                  </p>
                ))}
                <p className="mt-3 border-t pt-3 font-semibold">
                  Frete: {storeMoney(selected.shipping_cost)} · Total: {storeMoney(selected.total)}
                </p>
              </div>
              <p className="text-sm">
                {selected.fulfillment === "pickup"
                  ? "Retirada na loja"
                  : `${selected.customer.street}, ${selected.customer.number} — ${selected.customer.neighborhood}, ${selected.customer.city}/${selected.customer.state}, ${selected.customer.cep}`}
              </p>
              {selected.source === "manual" && (
                <CustomerFields
                  value={customer}
                  onChange={setCustomer}
                  delivery={selected.fulfillment === "delivery"}
                />
              )}
              <Field label="Etapa da entrega">
                <select
                  className={fieldClass}
                  disabled={selected.payment_status !== "approved"}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="preparando">Preparando</option>
                  <option value="enviado">Enviado</option>
                  <option value="entregue">Entregue</option>
                </select>
              </Field>
              <Field label="Notas internas da venda">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={action.isPending || selected.payment_status !== "approved"}
                  onClick={() => action.mutate({ order: selected, action: "edit" })}
                >
                  Salvar venda
                </Button>
                {selected.source === "online" && (
                  <Button
                    variant="outline"
                    disabled={action.isPending}
                    onClick={() => action.mutate({ order: selected, action: "refresh" })}
                  >
                    <RefreshCw size={16} />
                    Consultar pagamento
                  </Button>
                )}
                {selected.source === "online" &&
                  ["pending", "rejected"].includes(selected.payment_status) && (
                    <Button
                      variant="outline"
                      disabled={action.isPending}
                      onClick={() => {
                        if (
                          confirm("Cancelar o pagamento pendente e devolver os itens ao estoque?")
                        )
                          action.mutate({ order: selected, action: "cancel" });
                      }}
                    >
                      Cancelar pedido pendente
                    </Button>
                  )}
                {(selected.source === "manual" ||
                  ["refunded", "charged_back", "cancelled"].includes(selected.payment_status)) && (
                  <Button
                    variant="destructive"
                    disabled={action.isPending}
                    onClick={() => {
                      if (
                        confirm(
                          selected.source === "manual"
                            ? "Excluir registro e devolver itens ao estoque?"
                            : "Arquivar esta venda cancelada?",
                        )
                      )
                        action.mutate({
                          order: selected,
                          action: selected.source === "manual" ? "delete" : "archive",
                        });
                    }}
                  >
                    Excluir / arquivar venda
                  </Button>
                )}
              </div>
              {selected.source === "online" && (
                <p className="text-xs text-muted-foreground">
                  Pedidos online pagos mantêm o histórico financeiro. Faça cancelamentos ou
                  reembolsos na conta Mercado Pago da loja e clique em Consultar pagamento para
                  atualizar o pedido.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
