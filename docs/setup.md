# Setup local

## Pré-requisitos

- **Node.js 20+** (recomendado) ou **Bun 1.x**.
- Acesso ao projeto Lovable (o backend Cloud já vem configurado — não é preciso subir Supabase local).

## Instalação

```bash
bun install       # ou: npm install / pnpm install
```

## Variáveis de ambiente

O `vite.config.ts` já injeta valores padrão para o Supabase publishable, então o app roda sem `.env` local. Para sobrescrever:

| Variável | Escopo | Uso |
| --- | --- | --- |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | build/runtime | URL do projeto Supabase. |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | build/runtime | Chave pública (anon). |
| `MERCADOPAGO_ACCESS_TOKEN` | server | Token para criar pagamentos Pix. Configurar via **secrets** do Lovable. |
| `MERCADOPAGO_WEBHOOK_SECRET` | server | Assinatura HMAC do webhook. Configurar via secrets. |

Secrets sensíveis (`sb_secret_*`, tokens do Mercado Pago) **não** vão em `.env` versionado; use o painel de secrets do Lovable.

## Scripts

```bash
bun run dev        # vite dev — SSR + HMR em http://localhost:8080
bun run build      # build de produção
bun run build:dev  # build com modo development (usado no preview)
bun run preview    # servir o build local
bun run lint       # ESLint
bun run format     # Prettier
```

## Estrutura do banco

Migrations vivem em `supabase/migrations/`. São aplicadas automaticamente pelo Lovable Cloud. Ao criar uma nova migration:

1. Nome no padrão `YYYYMMDDHHMMSS_<slug>.sql`.
2. Toda `CREATE TABLE public.<x>` precisa de blocos `GRANT` + `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` na mesma migration.
3. Papéis (admin, produtor) ficam em `user_roles`, não em `profiles`.

## Primeiro admin

Endpoint público `POST /api/public/init-admin` promove a conta cadastrada no `PROTECTED_ADMIN_EMAIL` (ver `src/lib/constants.ts`). Detalhes em `api-and-integrations.md`.
