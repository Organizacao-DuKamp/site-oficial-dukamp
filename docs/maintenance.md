# Manutenção e Extensão

## Regras de ouro

1. **Nunca edite arquivos auto-gerados**: `src/routeTree.gen.ts`, `src/integrations/supabase/{client,client.server,auth-middleware,auth-attacher,types}.ts`, `.env` gerado pela plataforma, `supabase/config.toml`.
2. **Nunca guarde papéis em `profiles`.** Sempre em `user_roles` + `has_role()`.
3. **Cores só via tokens** (`bg-primary`, `text-foreground`, …). Não use `#hex` nem `bg-white/text-black` em componentes.
4. **Server functions com auth** só podem ser chamadas de componentes (via `useServerFn`) ou loaders sob `_authenticated`. Nunca em loader de rota pública.
5. **Todo `CREATE TABLE public.<x>`** vem acompanhado, na mesma migration, de `GRANT` + `ENABLE RLS` + `POLICY`.

## Adicionando uma nova rota

1. Crie o arquivo em `src/routes/`. Ex.: `promocoes.tsx` → `/promocoes`.
2. Use `createFileRoute("/promocoes")` — o caminho deve bater com o nome do arquivo (pontos → barras).
3. Defina `head()` com `title`, `description`, `og:title`, `og:description`.
4. Se a rota expor imagem principal, adicione `og:image` (URL absoluta) só nela.
5. Não edite `routeTree.gen.ts` — o Vite plugin regenera.

## Adicionando um endpoint público

1. Crie em `src/routes/api/public/<nome>.ts`.
2. Valide assinatura/segredo dentro do handler.
3. Carregue `supabaseAdmin` dinamicamente:
   ```ts
   const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
   ```

## Adicionando uma server function

1. Novo arquivo `src/lib/<dominio>.functions.ts`.
2. `createServerFn({ method: "GET" | "POST" }).middleware([requireSupabaseAuth]).inputValidator(zodSchema).handler(...)`.
3. Se for admin: chame `has_role` via RPC antes de qualquer mutação.
4. Consuma no componente com `useServerFn` + `useQuery`/`useMutation`.

## Nova tabela no banco

Template mínimo de migration:

```sql
CREATE TABLE public.exemplo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exemplo TO authenticated;
GRANT ALL ON public.exemplo TO service_role;
-- GRANT SELECT ON public.exemplo TO anon;   -- só se leitura pública

ALTER TABLE public.exemplo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select" ON public.exemplo
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
```

## Debug e observabilidade

- Erros SSR caem em `src/lib/error-capture.ts` e renderizam `error-page.ts`.
- Logs de server functions aparecem no painel Lovable.
- Erros do cliente são reportados por `lovable-error-reporting.ts`.

## Boas práticas de UI

- Reuse `ResourceCrud` para novas telas administrativas simples.
- Use `LazyMount` para pesados fora da dobra.
- Prefira `<Link to=... params=...>` de `@tanstack/react-router` — nunca `<a href>` para rotas internas.

## Quando algo estiver incerto

Marque **"A verificar"** na documentação, abra tarefa para revisar, e **não** faça suposições sobre o schema — consulte as migrations em `supabase/migrations/` ou os arquivos `*.functions.ts` relacionados.
