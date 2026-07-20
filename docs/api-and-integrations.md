# APIs e Integrações

## Lovable Cloud (Supabase)

- **URL/keys**: injetadas em build via `vite.config.ts` a partir de `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`.
- **Clients**:
  - `@/integrations/supabase/client` — browser (anon key).
  - `@/integrations/supabase/auth-middleware` — server functions (`requireSupabaseAuth`).
  - `@/integrations/supabase/client.server` — service role, **apenas** dentro de `*.server.ts` ou webhooks verificados.
- **Storage**: bucket `media` (upload via `ImageUpload`).
- **Auth**: e-mail/senha + provedores sociais. Emails, redirects e provedores configurados pelo painel Lovable.

## Server Functions (`createServerFn`)

Localizadas em `src/lib/*.functions.ts`. Consumidas via `useServerFn` ou diretamente em loaders de rotas autenticadas.

| Arquivo | Principais funções |
| --- | --- |
| `checkout.functions.ts` | Criação de pedido, integração Pix. |
| `orders.functions.ts` | `listMyOrders`, `getMyDeliveryNotices`, `markDeliveryNotified`, `adminListOrders`, `adminUpdateDeliveryStatus`, `adminSalesStats`. |
| `quotes.functions.ts` | Leitura/atualização de cotações. |

## Rotas HTTP públicas (`src/routes/api/public/`)

| Rota | Método | Descrição |
| --- | --- | --- |
| `/api/public/mercadopago-webhook` | `POST` | Recebe callback do Mercado Pago; valida HMAC (`MERCADOPAGO_WEBHOOK_SECRET`) e atualiza `payment_status` do pedido usando `supabaseAdmin`. |
| `/api/public/init-admin` | `POST` | Promove o email definido em `PROTECTED_ADMIN_EMAIL` ao papel `admin` na primeira execução. |

> Todas as rotas em `/api/public/*` são públicas — a autenticação/verificação **deve** ser feita no handler.

## Integrações externas

| Integração | Onde | Notas |
| --- | --- | --- |
| **Mercado Pago (Pix)** | `checkout.functions.ts` + webhook | Requer `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` nos secrets. |
| **Leaflet / OpenStreetMap** | `MapCepPicker` | Sem chave, uso comunitário. |
| **WhatsApp** | `whatsappLink` em `src/lib/site-settings.ts` e `SellerProfileBanner` | Gera URLs `https://wa.me/<numero>`. |

## Variáveis de ambiente

Prefixo `VITE_` = exposto ao browser. Sem prefixo = server-only.

| Variável | Escopo | Uso |
| --- | --- | --- |
| `SUPABASE_URL`, `VITE_SUPABASE_URL` | build | URL do projeto Supabase. |
| `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY` | build | Chave publishable. |
| `MERCADOPAGO_ACCESS_TOKEN` | server | Requisições à API do Mercado Pago. |
| `MERCADOPAGO_WEBHOOK_SECRET` | server | HMAC do webhook. |

**A verificar** se há outros secrets configurados via painel Lovable (e-mail transacional, analytics etc.).

## SEO

- `head()` por rota define `title`, `description`, `og:*`, `twitter:card`.
- `og:image` só em rotas leaf, com URL absoluta.
- Nunca definir `og:image` em `__root.tsx` (sobrescreveria todas as rotas).
