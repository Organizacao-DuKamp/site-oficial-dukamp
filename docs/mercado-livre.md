# Mercado Livre — integração Dukamp

## URLs de produção

- Redirect URI: `https://dukamp.netlify.app/api/mercado-livre/oauth/callback`
- Notification Callback: `https://dukamp.netlify.app/api/mercado-livre/notifications`
- Administração: `https://dukamp.netlify.app/admin/erp?modulo=mercado-livre`

Este é o domínio HTTPS confirmado no projeto Netlify `dukamp`. Não trocar pelo domínio institucional sem confirmar o apontamento e alterar também a configuração OAuth. A conexão deve ser iniciada no mesmo domínio do Redirect URI: o cookie seguro está vinculado a ele.

## Configuração

Configurar em Netlify > Project configuration > Environment variables, contexto **Production**, incluindo o escopo **Functions** (ou **All scopes** nos planos sem escopos separados). Alterações exigem um novo deploy. Não colocar segredos em `netlify.toml` ou em variáveis com prefixo de frontend.

| Variável                             | Conteúdo                                                                                                                            |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `MERCADO_LIVRE_CLIENT_ID`            | App ID real da aplicação **Mercado Livre**, não Mercado Pago.                                                                       |
| `MERCADO_LIVRE_CLIENT_SECRET`        | Client Secret real dessa aplicação; usar a opção de segredo quando disponível no plano.                                                                            |
| `MERCADO_LIVRE_TOKEN_ENCRYPTION_KEY` | Chave aleatória de 32 bytes em Base64; usar a opção de segredo quando disponível no plano. Não trocar sem reautorizar as contas ou migrar os dados criptografados. |
| `MERCADO_LIVRE_REDIRECT_URI`         | Redirect URI exata indicada acima, sem barra final ou parâmetros.                                                                   |
| `MERCADO_LIVRE_ALLOWED_SELLER_IDS`   | Opcional: IDs das contas Dukamp, separados por vírgula. Restringe novas conexões.                                                   |

Reutiliza `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já usados pelo backend. O acesso às novas tabelas e RPCs é exclusivo de `service_role`, com RLS habilitado e sem permissões para `anon` ou `authenticated`. A interface administrativa usa o endpoint autenticado; não lê tokens diretamente.

No Mercado Livre Developers:

1. Cadastrar exatamente as duas URLs acima.
2. Habilitar **PKCE**. O backend usa S256 em todas as autorizações.
3. Permitir `read` e `offline_access` e as permissões funcionais mínimas de usuários, anúncios, pedidos e envios em leitura. Não habilitar escrita nesta etapa.
4. Selecionar os tópicos implementados: `orders_v2`, `items`, `items_prices`, `shipments` e, se necessário, `questions`. Outros tópicos são reconhecidos como não suportados e recebem ACK sem processamento. Pagamentos Mercado Pago permanecem na integração existente.
5. Na administração Dukamp, abrir ERP > Integrações > Mercado Livre > Conectar conta Mercado Livre; autenticar e autorizar a conta da Dukamp. Somente contas brasileiras `MLB` são aceitas.

O retorno OAuth sem autorização válida deve responder 400; isso comprova a rota, não uma conexão com o seller. Antes das credenciais reais, webhooks válidos retornam 503 e a tela informa configuração pendente. O GET do webhook é apenas uma verificação da rota, não da autorização da conta.

## Arquitetura e limites

Frontend React/TanStack Start; as rotas `/api` são handlers do mesmo backend Nitro já publicado na Netlify. A integração segue essa estrutura, sem criar um serviço ou projeto de banco separado. Um Scheduled Function exclusivo da Netlify consulta a fila persistida no mesmo Supabase a cada minuto.

- OAuth: sessão Supabase verificada no servidor e cargo `admin` consultado em `user_roles`; origem exata nas ações administrativas; `state` aleatório com hash, cookie `__Host-` HttpOnly/Secure/SameSite=Lax, validade de 10 minutos e resgate atômico; PKCE cifrado; nova checagem do administrador no callback.
- Tokens: somente backend; AES-256-GCM com nonce aleatório e AAD por finalidade/conta. Access Token e Refresh Token atualizados juntos, com trava persistente e versão. Resultado incerto de renovação exige reconexão, evitando repetir um Refresh Token possivelmente consumido. Credenciais rejeitadas/revogadas e travas abandonadas são sinalizadas na conta.
- Webhook: limite de 16 KiB inclusive em streaming; aplicação e conta autorizada; caminhos e tópicos permitidos; deduplicação por identidade estável do evento (sem `sent`/`attempts`); controle de volume por conta; uma chamada de banco para persistir antes do HTTP 200. Se o banco falha, retorna 503 para permitir reenvio. O limite oficial de 500 ms é uma meta de entrega, dependente de cold start e latência da plataforma; a confirmação não aguarda a API do Mercado Livre.
- O protocolo consultado de notificações do Mercado Livre não documenta a assinatura HMAC de webhooks do Mercado Pago. Não tratar `application_id` como segredo ou prova de origem. O envelope é uma indicação não confiável: o worker faz GET autenticado em host fixo, sem redirects, e verifica a propriedade real do recurso pelo seller. Uma allowlist de IPs pode ser aplicada no firewall da hospedagem após validar a lista oficial vigente; ela não substitui a consulta autenticada.
- Worker: lotes de 3 eventos em paralelo, até 10 lotes quando rápidos, leases com `SKIP LOCKED`, até 8 tentativas, backoff, recuperação de workers interrompidos e reprocessamento administrativo. Novos lotes só começam nos primeiros 4 segundos para reservar tempo ao limite de 30 segundos da função agendada. O cron é executado apenas em deploys de produção. As consultas HTTP têm timeout de 4 s; eventos excedendo a execução são recuperáveis pelo lease. Escalar a fila/worker ao crescer o volume.
- Dados: snapshots mínimos cifrados, sem nome, contato, endereço ou mensagens de compradores. Eventos terminados retidos por 30 dias; auditoria de conexão por 180 dias; estados OAuth e limites expirados removidos pelo worker. Logs contêm apenas tipo, código técnico e identificador interno de evento.
- **Nenhum handler cria pedidos ERP, emite notas, altera estoque/preços ou grava em produtos.** Antes dessa fase, validar regras comerciais e mapear item/variação/SKU Mercado Livre para o produto ERP. Os snapshots confirmados permitem implementar essa etapa depois.

## Operação

GET no webhook informa serviço, modo e SHA publicado. A tela ERP mostra conta, status e últimas 30 notificações, com reprocessamento de falhas. “Desconectar” remove as credenciais armazenadas e cancela a fila local; para revogar também no Mercado Livre, remover a autorização no painel Mercado Livre.

Se uma conta exigir reconexão, usar novamente o botão de conectar. Não repetir o fluxo com o mesmo `code`, `state` ou Refresh Token. Trocas da chave de criptografia exigem reautorização ou migração controlada.

Notificações nunca entregues podem ser recuperadas manualmente pela API oficial `GET /missed_feeds?app_id=APP_ID`; para `items`, incluir `topic=items&site_id=MLB`. O provedor mantém até dois dias. A recuperação desse histórico ainda não é automática: a fila cobre eventos efetivamente recebidos. Não registrar tokens nem parâmetros de autorização em logs. Conferir também políticas de retenção/redação dos logs de acesso da hospedagem, que podem registrar a query do callback independentemente do código da aplicação.

## Validação

`node --test tests/mercado-livre.test.mjs` exercita HTTP simulado, OAuth/PKCE/CSRF, consumo único de state, criptografia, permissões reais de banco via PGlite, deduplicação, propriedade de recursos, refresh concorrente e recuperação da fila.

`npm test` executa a suíte existente junto com a integração. `NITRO_PRESET=netlify npm run build` compila cliente e servidor. O script `scripts/mercado-livre-smoke.mjs` verifica rotas reais, rejeição de requisições simuladas e disponibilidade da loja. A verificação no GitHub Actions espera o mesmo SHA do deploy. Isso não substitui a autorização real do seller após configurar as credenciais.

## Documentação oficial consultada em 05/11/2026

- [Autenticação e autorização](https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao)
- [Notificações](https://developers.mercadolivre.com.br/pt_br/produto-receba-notificacoes)
- [Preços de produtos](https://developers.mercadolivre.com.br/en_us/price-apl)
- [Desenvolvimento in-house](https://developers.mercadolivre.com.br/pt_br/tendencias/desenvolvimento-in-house)
- [Segurança de aplicações](https://developers.mercadolivre.com.br/pt_br/automovel-gerenciamento-de-contatos/seguranca-de-aplicacoes)

As URLs definitivas só devem ser declaradas publicadas após confirmar o deploy e as requisições de produção. Credenciais e consentimento do seller são requisitos distintos da disponibilidade das rotas.
