# Fluxo de Dados

## Visão geral

```text
Componente React
   │
   ├─ Leituras públicas ──► supabase (client.ts) ──► Postgres (RLS anon/authenticated)
   │
   ├─ Ações do usuário  ──► useServerFn(fn) ──► createServerFn
   │                                              ├─ requireSupabaseAuth
   │                                              │    └─ context.supabase (JWT do user)
   │                                              └─ Zod validate → handler
   │
   └─ Cache / SSR       ──► TanStack Query (queryClient no router context)
```

## Padrões usados no projeto

### 1. Leitura pública com Supabase JS + React Query

Exemplo em `src/lib/site-settings.ts`:

```ts
useQuery({
  queryKey: ["settings", "general"],
  queryFn: async () => {
    const { data } = await supabase
      .from("site_settings").select("value").eq("key", "general").maybeSingle();
    return data?.value ?? {};
  },
});
```

Usado sempre que a policy permite leitura anônima/autenticada direto do PostgREST.

### 2. Server function protegida (`requireSupabaseAuth`)

`src/lib/orders.functions.ts` mostra o padrão:

```ts
export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // consultas usam o JWT do usuário → RLS aplica
  });
```

Regras críticas:

- **Nunca** chame server functions protegidas em `loader` de rota pública (SSR/prerender não tem sessão). Chame do componente com `useServerFn` + `useQuery`, ou de dentro de `_authenticated/`.
- O middleware `attachSupabaseAuth` (`src/start.ts`) anexa o bearer token na chamada RPC.

### 3. Admin (verificação de papel)

Em server functions administrativas há um `assertAdmin(supabase, userId)` que chama a RPC `has_role`:

```ts
await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
```

Isso mantém a checagem no banco (SECURITY DEFINER) e evita recursão em RLS.

### 4. Webhooks (Mercado Pago)

`src/routes/api/public/mercadopago-webhook.ts`:

1. Verifica assinatura HMAC com `MERCADOPAGO_WEBHOOK_SECRET`.
2. Carrega dinamicamente `supabaseAdmin` (service role) para atualizar `orders`.
3. Retorna `200 ok` só depois de persistir.

### 5. Autenticação

`AuthProvider` (`src/lib/auth.tsx`):

1. Assina `supabase.auth.onAuthStateChange`.
2. Ao autenticar, carrega em paralelo `user_roles` e `profiles`.
3. Exponibiliza `isAdmin`, `accountType`, `approvalNotice`.
4. `signIn` usa `signInWithPassword`; `signOut` limpa a sessão.

### 6. Preço dinâmico

`priceForAccount(product, accountType)` e `pixPriceForAccount(...)` decidem qual campo usar:

- `produtor` → `producer_price` / `producer_pix_price`.
- Demais → `consumer_price` (ou `price` legado) / `consumer_pix_price` / `pix_price`.

### 7. Notificação de entrega

`DeliveryNoticeWatcher` (montado em `SiteLayout`/`__root.tsx`):

1. `getMyDeliveryNotices` retorna pedidos com `delivery_status='entregue'` e `delivery_notified=false`.
2. UI exibe toast/modal.
3. `markDeliveryNotified` fecha o ciclo.

## Ciclo de checkout (resumo)

```text
Carrinho (cart.tsx)
   │ getSelectedItems
   ▼
checkout.tsx ──► checkout.functions.ts::createPixOrder
                    │
                    ├─ cria linhas em `orders` + `order_items`
                    └─ chama Mercado Pago → devolve `qr_code`
   │
   ▼
Pedido.$id.tsx (mostra QR Code, polling do status)
   ▲
   │
Mercado Pago ─► /api/public/mercadopago-webhook (atualiza payment_status)
```

> Nomes exatos das funções podem variar; consulte `src/lib/checkout.functions.ts` para o contrato atual. **A verificar** se novas etapas foram adicionadas (frete, cupons, etc.).
