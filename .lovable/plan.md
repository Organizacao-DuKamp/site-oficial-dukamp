## Objetivo
Fazer o site publicado (`dukamp-oficial.lovable.app`) usar o novo Supabase conectado (`pioyrbcdprnplhcoyzam`), garantindo que os 170 produtos, catálogos, categorias, vendedores e imagens do bucket `media` apareçam no ambiente de produção.

## Passos

1. **Atualizar fallbacks do Supabase no `vite.config.ts`**
   - Substituir a URL e a anon key do Supabase antigo (`mkehkhngltpltrtxdksi`) pelos valores do novo projeto (`pioyrbcdprnplhcoyzam`).
   - Garantir que `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` apontem para o novo projeto.

2. **Atualizar `supabase/config.toml`**
   - Alterar o `project_id` para `pioyrbcdprnplhcoyzam`.

3. **Verificar conexão local e preview**
   - Rodar o build local (`bun run build`) para confirmar que não há erros de configuração.
   - Verificar no preview da Lovable se os produtos e imagens carregam corretamente.

4. **Republicar o site publicado**
   - Usar a ferramenta de publish para gerar um novo deploy em produção.
   - Validar em `https://dukamp-oficial.lovable.app` se os produtos e imagens estão visíveis.

## Resultado esperado
O site publicado passa a consumir os dados e imagens do novo Supabase, exibindo os 170 produtos, 23 catálogos, 22 categorias e 13 vendedores corretamente.
