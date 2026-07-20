# Funcionalidades

Descrição das áreas funcionais mais importantes e os arquivos que as implementam.

## 1. Vitrine e catálogo

- **Home (`src/routes/index.tsx`)** — vitrine agrupada por categoria, ordenada por quantidade de produtos, com bin-packing para aproveitar o espaço horizontal e limite de 5 cards por linha no desktop; botão "Ver todos/Ver menos" alterna a expansão da categoria.
- **Produtos (`produtos.index.tsx`, `produtos.$slug.tsx`)** — listagem, filtros e página de detalhe.
- **Catálogos institucionais (`catalogos.*`)** — coleções organizadas por slug.
- **Preço por tipo de conta** — `priceForAccount` / `pixPriceForAccount` em `src/lib/auth.tsx` escolhem preço `consumer_*` ou `producer_*` conforme `accountType`.

## 2. Carrinho e checkout

- Contexto: `src/lib/cart.tsx` (`CartProvider`, `useCart`).
- Página: `src/routes/carrinho.tsx`.
- Checkout: `src/routes/checkout.tsx` chama server functions de `src/lib/checkout.functions.ts` para criar pedido e gerar Pix no Mercado Pago.
- Confirmação: `src/routes/pedido.$id.tsx`.
- Webhook: `src/routes/api/public/mercadopago-webhook.ts` atualiza `payment_status`.

## 3. Pedidos

- Cliente: `minhas-compras.tsx` usa `listMyOrders` (`orders.functions.ts`).
- Notificação de entrega: `DeliveryNoticeWatcher` consulta `getMyDeliveryNotices` e marca como notificado via `markDeliveryNotified`.
- Admin: `admin.vendas.*` usam `adminListOrders`, `adminUpdateDeliveryStatus`, `adminSalesStats`.

## 4. Autenticação e perfis

- `AuthProvider` (`src/lib/auth.tsx`) escuta `onAuthStateChange` e carrega:
  - `user_roles` (checa `admin`).
  - `profiles` (`account_type`, `approval_notified`).
- Tipos de conta: `cliente`, `produtor`, `admin`. Produtor exige aprovação — o modal `ApprovalNoticeModal` avisa uma única vez.
- Rota `admin.tsx` bloqueia acesso quando `!isAdmin`.

## 5. Admin

O layout em `src/routes/admin.tsx` renderiza uma sidebar com as seções:

| Rota | Função |
| --- | --- |
| `/admin` | Dashboard resumo. |
| `/admin/produtos` | CRUD de produtos. |
| `/admin/categorias` | Categorias. |
| `/admin/estoque` | Ajuste de estoque. |
| `/admin/atualizar-valores` | Atualização em massa de preços. |
| `/admin/banners`, `/admin/anuncios` | Banners e anúncios da home. |
| `/admin/catalogos` | Catálogos institucionais. |
| `/admin/contas` | Contas e aprovação de produtores. |
| `/admin/equipe-vendas` | CRUD de vendedores. |
| `/admin/footer`, `/admin/navbar`, `/admin/configuracoes` | Personalizações do site. |
| `/admin/solicitacoes`, `/admin/atendimentos` | Suporte e leads. |
| `/admin/vendas/*` | Painel, pedidos e histórico de vendas. |

O componente `ResourceCrud` (em `src/components/admin/`) padroniza tabelas administrativas.

## 6. Cotações

- `QuotesWidget`, `QuotesPanel`, `NavbarQuoteTicker` exibem cotações; estado do painel em `src/lib/quotes-panel.tsx`; dados via `src/lib/quotes.functions.ts`.

## 7. Equipe de vendas

- Lista pública `equipe-de-vendas.index.tsx` e perfil `equipe-de-vendas.$slug.tsx` com banner customizado (`SellerProfileBanner`) e CTA WhatsApp.
- Detalhes de tabelas e RLS em `.lovable/plan.md`.

## 8. Páginas institucionais e rodapé

- `paginas.$slug.tsx` renderiza páginas armazenadas em `site_settings` (`footer_page:<slug>`) via `useFooterPage` (`src/lib/footer-pages.ts`).
- `Footer.tsx` monta grupos "Informações" e "Segurança" a partir de `FOOTER_PAGES`.

## 9. Suporte / chat

- Contexto: `src/lib/support.tsx`.
- UI: `ChatLauncher`, `ChatWindow`, `MessageList`; admin em `AdminChatPanel` e `admin.atendimentos.tsx`.

## 10. SEO / metadados

Cada rota define `head()` próprio com `title`, `description`, `og:*` e `twitter:*`. `og:image` só em rotas leaf com imagem real (ver `docs/api-and-integrations.md`).
