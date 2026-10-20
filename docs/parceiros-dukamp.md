# Parceiros Dukamp

A área administrativa fica em `/admin/parceiros`; as lojas entram por `/parceiro-login` com usuário e senha criados pela Dukamp.

## Operação

- **Visão geral:** resultado por parceiro, cadastro, faturamento comercial, comissão e pagamento à Dukamp. Os totais consideram apenas vendas aprovadas, sem cancelamento ou reembolso solicitado/concluído.
- **Gerenciar parceiros:** CNPJ validado, razão social, responsável, logo opcional (PNG/JPG/WebP, até 2 MB), endereço, usuário e senha. Senhas são geridas pelo Supabase Auth e nunca gravadas no cadastro da loja. É possível editar, redefinir senha, desativar, arquivar e reativar acessos. Arquivar preserva os pedidos.
- **Gerenciar vendas:** pedidos das lojas, pagamento, ficha do cliente e preparação/expedição/entrega. O administrador usa as mesmas funções de entrega do painel atual. Pedidos para retirada continuam sendo administrados também pela tela normal de pedidos.
- **Gerenciar minha área:** título, mensagem de boas-vindas, contatos de suporte e condições exibidas no portal.

O parceiro consulta o catálogo ativo com fotos/preços/estoque, simula uma compra e registra o cliente. Produtos e endereço são preservados ao passar da simulação para o registro, apenas em memória e separados por sessão. Nome, documento, e-mail, telefone e endereço são exigidos para o checkout; inscrição estadual, contato alternativo, propriedade, observações, cobrança e instruções de entrega são opcionais.

## Comissão e pagamento

O catálogo da parceria é restrito aos produtos fabricados pela Dukamp (rações, proteinados, núcleos, suplementos e a linha de aditivos ADEKAMP). A regra usa a marca e a identificação do fabricante no nome dos cadastros legados; pertencer a uma categoria de rações não basta. A listagem, a simulação, as cotações anteriores ainda sem pedido e o checkout validam a restrição no servidor. A vitrine parceira aplica a mesma regra à seção de produtos Dukamp.

No carrinho do parceiro, novas inclusões do mesmo produto e das mesmas opções somam a quantidade em uma linha. Alternativas diferentes permanecem separadas. As quantidades totais por produto respeitam o estoque, inclusive quando existem opções diferentes. O login do parceiro usa a logo oficial no desktop e no celular.

A regra implementada segue a última solicitação: **a cobrança à Dukamp desconta 10% de produtos + frete**. A comissão é retida pela loja, sem um segundo pagamento da Dukamp ao parceiro.

Exemplo: R$ 1.000 em produtos + R$ 100 de frete = R$ 1.100 comerciais; comissão de R$ 110; saldo à Dukamp de R$ 990. No cartão, as mesmas taxas do checkout são acrescentadas ao saldo de R$ 990. A taxa não aumenta a base de comissão.

O pedido armazena os valores bruto, comissão, líquido, taxa e total pago separadamente. O total do pedido representa a cobrança ao Mercado Pago. Isso também permite que a reconciliação já existente confira o valor efetivamente pago. Pagamentos vão para a conta Mercado Pago atualmente configurada da Dukamp.

O portal usa `createPixOrder`, `processCardPayment` e a reconciliação/webhook existentes. Pix e boleto são gerados pelo mesmo fluxo; cartão utiliza o formulário seguro do Mercado Pago. O detalhe de venda consulta o pagamento enquanto estiver pendente e exibe a confirmação quando aprovada. Nenhuma cobrança real foi feita durante os testes.

## Cotação e isolamento

A simulação usa `priceForAccount(..., 'cliente')`, opções/estoque atuais e os mesmos serviços de frete do checkout: Frete Dukamp para sacarias elegíveis com coordenadas, Correios como alternativa e retirada sem frete. As opções dos Correios podem ser selecionadas. Prazo zero aparece como prazo a confirmar, sem prometer entrega imediata.

Cada simulação vale 15 minutos e fica vinculada à loja, aos produtos, quantidades, variantes, modalidade e endereço. No checkout, o servidor substitui os valores de frete recebidos pelo navegador, verifica os preços atuais e calcula a comissão em centavos. Uma transação persiste pedido e itens e vincula a cotação uma única vez. Repetições da mesma requisição reutilizam o pedido e a chave de idempotência de pagamento. Alterar cliente ou pagamento requer uma nova simulação.

As ações validam o usuário autenticado e o cadastro ativo no banco. Somente administradores gerenciam lojas e alterações de entrega; o parceiro acessa apenas seus próprios pedidos. As tabelas de cotações e configurações e a função de gravação do pedido não podem ser usadas diretamente por `anon`/`authenticated`. As políticas também impedem a inserção direta de itens em pedidos de parceiros. Pedidos de parceiros não usam o `user_id` da loja como proprietário varejista do pedido do consumidor.

## Migração e publicação

A migração é `supabase/migrations/20261019200751_dukamp_partners.sql`. Ela cria os cadastros/cotações/configurações, acrescenta colunas aos pedidos, cria a visão de resultados, função transacional, políticas e bucket de logos. Deve ser aplicada **antes** de publicar as rotas novas. A migração foi testada em PostgreSQL isolado e aplicada no projeto de produção em 19/10/2026 após autorização explícita do responsável. O nome do arquivo acompanha a versão registrada no histórico do Supabase para evitar aplicação duplicada.

O projeto indicado por `supabase/config.toml` e `vite.config.ts` é `pioyrbcdprnplhcoyzam`. O servidor usa as variáveis já utilizadas no site: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_PUBLIC_KEY` e `PUBLIC_APP_URL` (HTTPS), além das configurações de frete existentes. A chave de serviço continua restrita ao servidor. A autorização para a aplicação e publicação foi concedida em 19/10/2026.

Após aplicar a migração e publicar o código, criar uma loja pelo administrador, testar seu login e realizar uma compra controlada com as credenciais de teste do Mercado Pago antes de disponibilizar o acesso às lojas. O roteiro inclui conferir o valor líquido, o webhook, o pedido administrativo, a entrega e o cancelamento/reembolso.

## Validação reproduzível

- `npm run test:partners`: regras de comissão, cadastro, isolamento, cotação, checkout, PostgreSQL/RLS, transação, reconciliação, estoque e reembolso; todos os fixtures de banco são revertidos.
- `npm run build`: compilação de produção.
- `npm test`: inclui a suíte existente; há uma falha anterior em `erp-product-pricing.test.mjs` (28.35 versus 28.36), reproduzida também no commit base `7620e41`.
- `npx tsc --noEmit`: os nove diagnósticos anteriores no ERP e no link dos orçamentos de vendedor foram reproduzidos no mesmo commit base; não há novos diagnósticos nas áreas alteradas.

A inspeção de interface usa contas e respostas fictícias em um backend local isolado. Ela não substitui o teste final de frete e pagamento com as credenciais reais do ambiente de homologação.
