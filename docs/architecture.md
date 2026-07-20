# Arquitetura

## Stack principal

- **Framework:** [TanStack Start v1](https://tanstack.com/start) (SSR + roteamento file-based) rodando em runtime **Cloudflare Workers** via Nitro.
- **UI:** React 19 + TypeScript, componentes shadcn/ui sobre **Radix UI**.
- **Estilo:** Tailwind CSS v4 (configuração via `src/styles.css`, sem `tailwind.config.js`).
- **Estado servidor:** TanStack Query 5.
- **Formulários:** react-hook-form + Zod.
- **Backend / Auth / Storage:** Lovable Cloud (Supabase gerenciado).
- **Pagamentos:** Mercado Pago (Pix), integração via webhook público.
- **Mapa/CEP:** Leaflet + react-leaflet.
- **Build:** Vite 8 com preset `@lovable.dev/vite-tanstack-config`.

## Camadas

```text
┌──────────────────────────────────────────────────────────┐
│ Browser (React 19 + TanStack Router)                     │
│  ├─ src/routes/*         páginas SSR + client            │
│  ├─ src/components/*     UI                              │
│  └─ src/lib/*            hooks, contexts, client SDKs    │
└─────────────▲──────────────────────────────▲─────────────┘
              │ createServerFn RPC           │ fetch direto
              │ (auth-attacher)              │
┌─────────────┴──────────────────────────────┴─────────────┐
│ Edge (Cloudflare Worker via TanStack Start)              │
│  ├─ src/routes/api/public/*   webhooks / endpoints HTTP  │
│  ├─ src/lib/*.functions.ts    server functions RPC       │
│  └─ src/server.ts             entry SSR + error wrap     │
└─────────────▲──────────────────────────────▲─────────────┘
              │ Supabase JS (anon/user JWT)  │ service_role
              │                              │ (client.server)
┌─────────────┴──────────────────────────────┴─────────────┐
│ Lovable Cloud (Supabase)                                 │
│  Postgres + RLS + Auth + Storage (bucket `media`)        │
│  Migrations em supabase/migrations/*.sql                 │
└──────────────────────────────────────────────────────────┘
```

## Três clientes Supabase

| Client | Arquivo | Uso |
| --- | --- | --- |
| Publishable (browser) | `src/integrations/supabase/client.ts` | Auth flows, realtime, leituras públicas com RLS. |
| Auth middleware | `src/integrations/supabase/auth-middleware.ts` | Injetado em server functions protegidas via `requireSupabaseAuth`. Fornece `context.supabase`, `userId`, `claims`. |
| Admin (service role) | `src/integrations/supabase/client.server.ts` | Apenas em `*.server.ts`/webhooks verificados. **Bypassa RLS.** |

O bearer JWT é anexado às chamadas RPC pelo `attachSupabaseAuth`, registrado em `src/start.ts`.

## Roteamento

File-based em `src/routes/`. Pontos-alto:

- `__root.tsx` — shell HTML, providers globais (`AuthProvider`, `QueryClientProvider`, `CartProvider`, etc.), `<Outlet />`.
- `index.tsx` — home com bin-packing de categorias.
- `admin.*` — painel administrativo (layout em `admin.tsx`, subrotas por área).
- `api/public/*` — endpoints HTTP públicos (webhook Mercado Pago, bootstrap admin).

`src/routeTree.gen.ts` é gerado automaticamente — **não editar**.

## Server Functions vs Server Routes

- **`createServerFn`** (arquivos `*.functions.ts` em `src/lib/`): RPC tipado consumido do cliente com `useServerFn`/loaders. Exemplos: `checkout.functions.ts`, `orders.functions.ts`, `quotes.functions.ts`.
- **Server routes** (`src/routes/api/public/*`): endpoints HTTP crus, usados para webhooks (Mercado Pago) e bootstrap de admin. Sempre validam assinatura/segredo dentro do handler.

## Autenticação

- Fluxo padrão Supabase (`signInWithPassword`, OAuth). Contexto em `src/lib/auth.tsx` expõe `user`, `session`, `isAdmin`, `accountType` (`cliente | produtor | admin`).
- Papéis em tabela dedicada `user_roles` verificados via função `has_role(user_id, role)` (SECURITY DEFINER) — **nunca** armazenados em `profiles`.
- Rota `_authenticated` não é utilizada aqui; guards são feitos por componente (`admin.tsx` faz redirect quando `!isAdmin`).

## Deploy

Publicação gerida pelo Lovable (`https://dukamp.lovable.app`). Build é executado automaticamente pela plataforma; nada de scripts manuais de deploy.
