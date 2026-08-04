# Rastreamento dos Correios nos pedidos

Objetivo: gravar e exibir o código real de rastreio (ex.: `AA123456789BR`) devolvido pela API dos Correios na criação da pré-postagem — nunca um código inventado — no painel admin e em "Minhas Compras".

Confirmado na análise atual do projeto:
- A tabela `orders` **não** possui hoje nenhum campo de rastreio (`tracking_code`, `posted_at`, etc.). Só existem `shipping_service`, `shipping_cost`, `shipping_deadline_days` e `delivery_status`.
- A integração dos Correios em `src/lib/checkout.functions.ts` faz **apenas** autenticação (token CWS) + cálculo de preço/prazo. Não há pré-postagem nem etiqueta.
- O webhook do Mercado Pago (`src/routes/api/public/mercadopago-webhook.ts`) já atualiza `payment_status` e baixa estoque quando aprovado.
- `listMyOrders` e `adminListOrders` (`src/lib/orders.functions.ts`) não selecionam campos de envio além de `shipping_service`.

## 1. Banco de dados (migration)

Adicionar em `public.orders`, todos nullable (pedidos antigos continuam válidos):

`tracking_code`, `tracking_status`, `correios_prepostagem_id`, `shipping_label_url`, `shipping_service_code`, `shipping_error` (texto) e `tracking_updated_at`, `posted_at`, `label_created_at` (timestamptz).

Índice único parcial em `correios_prepostagem_id` para impedir duplicidade, e índice em `tracking_code`.

Nenhuma policy nova: o cliente já lê os próprios pedidos e o admin já lê tudo.

## 2. Backend — Correios pré-postagem

Novo módulo `src/lib/correios-shipping.server.ts`, reaproveitando a autenticação existente (que será extraída de `checkout.functions.ts` para esse módulo compartilhado, sem mudar o comportamento do cálculo de frete):

- `createPrepostagem(order, items)`: `POST https://api.correios.com.br/prepostagem/v1/prepostagens` com remetente (dados do cartão/contrato + `CORREIOS_CEP_ORIGEM`), destinatário (dados do pedido), serviço (`CORREIOS_COD_PAC` / `CORREIOS_COD_SEDEX`) e volume (peso/dimensões somados dos itens).
- O **código de rastreio é lido do campo `codigoObjeto`** da resposta da pré-postagem (fallback `objetoPostal.codigoObjeto`), junto com `id` (→ `correios_prepostagem_id`).
- `fetchLabelUrl(prepostagemId)`: rótulo assíncrono (`/prepostagem/v1/rotulo`) quando disponível; se o contrato não liberar, `shipping_label_url` fica nulo e a UI apenas não mostra o botão de imprimir.
- `fetchTracking(code)`: `GET /srorastro/v1/objetos/{code}` para atualizar `tracking_status`, `posted_at` e `tracking_updated_at`.
- Erros da API são registrados no log do servidor e resumidos em `shipping_error` (mensagem curta, sem token/credencial).

## 3. Geração da etiqueta (idempotente)

Server functions em `src/lib/shipping.functions.ts`:

- `adminGenerateShippingLabel({ orderId })` — protegida por `requireSupabaseAuth` + `has_role('admin')`. Passos: buscar pedido → exigir `payment_status = 'approved'` → se já houver `tracking_code` ou `correios_prepostagem_id`, retorna o existente (idempotente) → validar CEP, endereço, peso e dimensões (mensagem clara do que falta) → criar pré-postagem → gravar código real e metadados.
- `adminRefreshTracking({ orderId })` — atualiza status do objeto.
- Guarda contra cliques repetidos: `UPDATE ... WHERE tracking_code IS NULL` como trava otimista, botão desabilitado durante o loading.

Além disso, o webhook do Mercado Pago passa a **tentar** gerar a pré-postagem logo após o pagamento ficar `approved` (só nesse status; `pending`/`rejected`/`cancelled`/`refunded` nunca geram). Se falhar, grava `shipping_error` e responde 200 normalmente — o admin refaz pelo botão. O restante do webhook (status e baixa de estoque) não muda.

## 4. Painel administrativo

Nova seção "Envio pelos Correios" no card de cada pedido em `src/routes/admin.vendas.pedidos.tsx` (componente novo `src/components/admin/OrderShippingPanel.tsx`, reaproveitado no histórico):

- Sem rastreio: "Código de rastreamento ainda não gerado", status do pagamento, botão "Gerar etiqueta dos Correios" (habilitado só com pagamento aprovado) e aviso do que está faltando (CEP, peso, dimensões…).
- Com rastreio: código, botão copiar, status amigável, serviço (PAC/SEDEX), "Imprimir etiqueta" (quando houver URL), "Rastrear nos Correios", data da etiqueta, data de postagem, última atualização e o erro registrado, se houver.

`adminListOrders` passa a selecionar os novos campos.

## 5. Área do cliente

Seção "Entrega" em `src/routes/minhas-compras.tsx` e em `src/routes/pedido.$id.tsx`:

- Sem código: mensagem por estado — "Aguardando confirmação do pagamento" / "Pagamento aprovado. Seu pedido está sendo preparado" / "Preparando envio". Nunca campo vazio.
- Com código: "Código de rastreamento", o código, botão copiar, botão "Rastrear pedido" (abre `https://rastreamento.correios.com.br/app/index.php` em nova aba), status amigável e "Etiqueta gerada — aguardando postagem" enquanto não houver `posted_at`.

`listMyOrders` passa a retornar os campos de rastreio, sempre filtrado por `user_id` (cliente nunca vê pedido de outro). `getOrderPublic` retorna apenas código/status/serviço — sem IDs internos dos Correios.

## 6. Status em português

Mapa único em `src/lib/shipping-status.ts` traduzindo pagamento e rastreio (Pagamento pendente, Pagamento aprovado, Etiqueta gerada, Aguardando postagem, Postado nos Correios, Em trânsito, Saiu para entrega, Entregue, Não foi possível realizar a entrega).

## 7. Segurança e visual

Todas as chamadas aos Correios no servidor; nenhuma credencial no bundle do cliente; endpoint admin validando papel e UUID do pedido; erros técnicos só no log. Visual segue o padrão atual (verde da marca, cards com borda suave, responsivo, estados de carregamento e toasts em português).

## Variáveis de ambiente

Reaproveita as existentes (`CORREIOS_USUARIO`, `CORREIOS_SENHA`, `CORREIOS_CARTAO_POSTAGEM`, `CORREIOS_CONTRATO`, `CORREIOS_CEP_ORIGEM`, `CORREIOS_COD_PAC`, `CORREIOS_COD_SEDEX`). A pré-postagem exige também dados do remetente — serão documentados como opcionais: `CORREIOS_REMETENTE_NOME`, `CORREIOS_REMETENTE_LOGRADOURO`, `CORREIOS_REMETENTE_NUMERO`, `CORREIOS_REMETENTE_BAIRRO`, `CORREIOS_REMETENTE_CIDADE`, `CORREIOS_REMETENTE_UF`, `CORREIOS_REMETENTE_TELEFONE`, `CORREIOS_REMETENTE_EMAIL`, `CORREIOS_REMETENTE_DOCUMENTO`.

## Observação importante

A API de pré-postagem depende de liberação do contrato junto aos Correios (mesmo tipo de permissão que já causou o bloqueio `GTW-012` no cálculo de preço). Se o contrato ainda não estiver habilitado, o sistema **não** inventará código: o pedido fica sem rastreio, o admin vê a mensagem de erro retornada e o cliente vê "Preparando envio".
