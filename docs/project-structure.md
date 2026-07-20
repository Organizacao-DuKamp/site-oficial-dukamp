# Estrutura do Projeto

Mapa comentado das pastas e arquivos mais relevantes.

## Raiz

| Caminho | Função |
| --- | --- |
| `package.json` | Dependências e scripts (`dev`, `build`, `lint`). |
| `vite.config.ts` | Configuração Vite via `@lovable.dev/vite-tanstack-config`. Injeta `VITE_SUPABASE_*` e aponta o entry SSR para `src/server.ts`. |
| `components.json` | Configuração shadcn/ui (aliases e estilo). |
| `eslint.config.js`, `.prettierrc` | Lint e formatação. |
| `tsconfig.json` | TypeScript strict + path alias `@/* → src/*`. |
| `supabase/config.toml` | Config do projeto Supabase (gerido). |
| `supabase/migrations/*.sql` | Migrations do banco (ordem cronológica). |
| `.lovable/plan.md` | Plano em andamento (uso interno da plataforma). |

## `src/`

### Bootstrap

| Arquivo | Função |
| --- | --- |
| `router.tsx` | Cria o `Router` do TanStack com `QueryClient` no contexto e `defaultPreloadStaleTime`. |
| `start.ts` | Registra `functionMiddleware` (`attachSupabaseAuth`) e `requestMiddleware` de erro. |
| `server.ts` | Entry SSR — envolve o handler do TanStack Start com captura de erro e página HTML de fallback. |
| `styles.css` | Tailwind v4 + tokens de design (cores semânticas, tipografia). |

### `src/routes/` — rotas file-based

Convenção: pontos viram barras. `admin.produtos.tsx` → `/admin/produtos`.

Grupos principais:

- **Público / loja**
  - `index.tsx` — home (vitrine com bin-packing de categorias).
  - `produtos.tsx` / `produtos.index.tsx` / `produtos.$slug.tsx` — listagem e detalhe de produto.
  - `catalogos.tsx` / `.index.tsx` / `.$slug.tsx` — catálogos institucionais.
  - `carrinho.tsx`, `checkout.tsx`, `pedido.$id.tsx` — fluxo de compra.
  - `cotacoes.tsx` — cotações de commodities (aço, dólar, etc.).
  - `equipe-de-vendas.index.tsx` / `.$slug.tsx` — vendedores e perfil individual.
  - `contato.tsx`, `sobre.tsx`, `unidades.tsx`, `paginas.$slug.tsx` — institucionais.
  - `auth.tsx`, `dashboard.tsx`, `minha-conta.tsx`, `minhas-compras.tsx` — conta do cliente.
- **Admin** (`admin.tsx` é o layout, subrotas usam `has_role('admin')`):
  - `admin.index.tsx`, `admin.produtos.tsx`, `admin.categorias.tsx`, `admin.banners.tsx`, `admin.catalogos.tsx`, `admin.estoque.tsx`, `admin.contas.index.tsx` / `.$id.tsx`, `admin.equipe-vendas.tsx`, `admin.footer.tsx`, `admin.navbar.tsx`, `admin.configuracoes.tsx`, `admin.solicitacoes.tsx`, `admin.atendimentos.tsx`, `admin.atualizar-valores.tsx`, `admin.anuncios.tsx`.
  - `admin.vendas.painel.tsx`, `admin.vendas.pedidos.tsx`, `admin.vendas.historico.tsx` — vendas.
- **API pública** (`src/routes/api/public/`):
  - `mercadopago-webhook.ts` — recebe callbacks de pagamento.
  - `init-admin.ts` — bootstrap do primeiro admin.

### `src/components/`

- `ui/` — biblioteca shadcn/ui (Radix + Tailwind). Não editar sem necessidade.
- `site/` — componentes da loja: `Header`, `Footer`, `MainNav`, `SiteLayout`, `ProductCard`, `QuotesPanel`, `QuotesWidget`, `NavbarQuoteTicker`, `InstitutionalSidebar`, `MapCepPicker`, `RichContent`, `ApprovalNoticeModal`, `DeliveryNoticeWatcher`, `LazyMount`, `BrandIcons`.
- `admin/` — `ImageUpload`, `ResourceCrud` (CRUD genérico baseado em tabelas), `RichTextEditor`.
- `sellers/` — `SellerCard`, `SellerProfileBanner` (banner estilo Dukamp da página de perfil).
- `support/` — chat interno: `ChatLauncher`, `ChatWindow`, `MessageList`, `AdminChatPanel`.

### `src/lib/`

| Arquivo | Descrição |
| --- | --- |
| `auth.tsx` | `AuthProvider`, `useAuth`, resolvedores de preço por tipo de conta (`priceForAccount`, `pixPriceForAccount`). |
| `cart.tsx` | Contexto do carrinho (persistência local + sincronização). |
| `support.tsx` | Contexto do chat de atendimento. |
| `quotes-panel.tsx` | Estado do painel expandido de cotações. |
| `checkout.functions.ts` | Server functions do checkout (criar pedido, gerar Pix). |
| `orders.functions.ts` | Server functions de pedidos (usuário e admin). |
| `quotes.functions.ts` | Server functions para leitura/atualização de cotações. |
| `sellers.ts` | Helpers do módulo vendedores. |
| `site-settings.ts` | Hook `useSiteSettings` (chave `general` em `site_settings`). |
| `footer-pages.ts` | Páginas institucionais renderizadas do banco. |
| `navbar-settings.ts` | Config default do menu principal. |
| `constants.ts` | Constantes (e.g. `PROTECTED_ADMIN_EMAIL`). |
| `product-dimensions.ts` | Utilidades de dimensões de produto. |
| `image-url.ts` | Resolve URLs do bucket `media`. |
| `utils.ts` | `cn`, helpers gerais. |
| `auth-errors.ts` | Tradução de erros do Supabase. |
| `error-capture.ts`, `error-page.ts`, `lovable-error-reporting.ts` | Captura de erros SSR e página de fallback. |

### `src/integrations/supabase/`

Arquivos **auto-gerados** — não editar manualmente:

- `client.ts` — client publishable (browser).
- `client.server.ts` — client admin (service role, apenas `*.server.ts`).
- `auth-middleware.ts` — middleware `requireSupabaseAuth` para server functions.
- `auth-attacher.ts` — anexa bearer token nas chamadas RPC.
- `types.ts` — tipos gerados do schema.

### `src/hooks/`

- `use-mobile.tsx` — hook de breakpoint.

### `src/assets/`

Imagens estáticas importadas via ES modules.

## `supabase/`

- `config.toml` — configurado pela plataforma (não alterar campos globais).
- `migrations/` — SQL versionado. Cada nova tabela em `public` deve incluir `GRANT` explícito para `authenticated`/`service_role`/`anon` conforme as policies.
