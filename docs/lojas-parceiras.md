# Lojas online dos parceiros Dukamp

O painel `/parceiro` agora inclui **Gerenciar meu site**, com Definições, Estoque, Vendas (Visão geral, Registrar venda e Histórico), Visão geral, Footer, Navbar e Configurações. A loja pública usa o caminho `/<slug>` no mesmo domínio da Dukamp; por exemplo, `/agropet`. A produção atual utiliza `https://dukamp.netlify.app`. O mesmo caminho funcionará no domínio próprio quando ele estiver conectado à hospedagem.

## Como ativar uma loja

1. Entre com o acesso da parceria e abra **Gerenciar meu site → Definições**. O cadastro inicial da loja é criado automaticamente, ainda não publicado.
2. Escolha o nome, endereço exclusivo e logo. O endereço precisa ser único e não pode ocupar as rotas da Dukamp.
3. Em **Configurações**, preencha e-mail, telefone, endereço, slogan, apresentação da vitrine, cor, retirada e entrega. A entrega dos produtos próprios usa frete fixo e prefixos de CEP explicitamente atendidos pela loja, com prazo e opção de gratuidade por valor mínimo. A loja é responsável por essa logística.
4. Conecte o Mercado Pago da empresa. A integração aceita o Access Token de produção, validado na API da conta, com confirmação de titularidade. Quando o OAuth da plataforma estiver configurado, também apresenta o botão de autorização no Mercado Pago. Uma conta com identificação CNPJ precisa corresponder ao CNPJ da parceria.
5. Cadastre os produtos, preços, custos, estoque, imagens, marca, unidade e categoria em **Estoque**. Categorias cadastradas nos produtos aparecem como filtros no catálogo.
6. Personalize as páginas institucionais do rodapé e a ordem, visibilidade, rótulos e links do menu. Publique nas Definições e compartilhe a URL.

Imagens PNG/JPG/WebP de até 5 MB podem ser enviadas pelo painel. As imagens ficam em caminhos aleatórios separados por parceiro. HTML de descrições e páginas é sanitizado no servidor.

## Produtos, recebimentos e comissão

| Venda | Conta recebedora | Logística | Comissão |
| --- | --- | --- | --- |
| Produto próprio do parceiro | Mercado Pago da loja | Loja parceira | Nenhuma comissão para a Dukamp; taxas normais do Mercado Pago |
| Produto Dukamp comprado pelo consumidor a partir da vitrine da loja | Mercado Pago da Dukamp, no checkout existente | Dukamp | 10% sobre produtos + frete registrados para repasse à parceira após aprovação, excluindo taxas de cartão; cancelamentos/reembolsos não contam |
| Venda Dukamp assistida pelo parceiro, em Registrar compra | Mercado Pago da Dukamp | Dukamp | Mantém a regra anterior: comissão já retida pela loja e deduzida do valor pago à Dukamp |

A vitrine destaca rações Dukamp e inclui os produtos Dukamp ativos no catálogo público. O parceiro administra apenas seu estoque próprio. Os carrinhos de produtos próprios e Dukamp são separados e a página do produto informa quem vende, entrega e recebe o pagamento. A compra Dukamp abre o carrinho e o checkout originais. A origem da loja acompanha os itens no carrinho, inclusive após recarregar a página. Se itens atribuídos a lojas diferentes forem misturados em um único pedido Dukamp, o pedido não atribui comissão a uma loja arbitrariamente.

As vendas Dukamp originadas na vitrine aparecem no gerenciamento de vendas da parceria e no resumo administrativo. A comissão online é um crédito registrado para repasse, separado da comissão retida nas vendas assistidas; não há transferência automática para a loja nesta entrega.

## Pedidos e estoque próprio

- O servidor e a transação PostgreSQL recalculam preços e frete, verificam a loja ativa e reservam estoque de maneira atômica antes de emitir o pagamento. Quantidades repetidas do mesmo produto são somadas.
- Reenvios usam o mesmo identificador de solicitação, hash dos dados, token de acompanhamento e idempotência Pix. A emissão tem trava no banco; recuperações de Checkout Pro consultam preferências anteriores por referência antes de criar outra.
- Pix mostra QR Code e copia e cola. Cartão abre o Checkout Pro da conta da loja; os dados do cartão não passam pelo servidor Dukamp.
- Notificações e consultas de status verificam o pagamento diretamente na API da conta da loja. O servidor verifica a conta recebedora e a moeda; a transação valida referência, valor, eventos fora de ordem e duplicação. O retorno do navegador nunca aprova uma venda sozinho.
- Pedidos emitidos mantêm uma reserva até confirmação ou cancelamento. O parceiro pode cancelar Pix pendente; o sistema consulta e cancela no provedor antes de devolver o estoque. Um checkout sem pagamento emitido só pode ser cancelado após uma hora do vencimento e consulta ao provedor. Pagamentos tardios depois de uma reserva liberada exigem conferência/reembolso na conta da loja e não baixam estoque inexistente.
- Reembolsos totais/estornos/cancelamentos reconhecidos pela API devolvem estoque uma vez. Reembolso parcial continua exigindo conferência da loja no Mercado Pago; o status do pedido só é totalmente reembolsado quando o provedor informa esse estado.
- **Registrar venda** registra uma venda manual já recebida, sem criar cobrança. Permite editar cliente, notas e etapa da entrega; excluir cancela o registro e devolve os itens ao estoque. Os registros são arquivados, preservando histórico.
- Pedidos online pagos preservam valores e itens. A loja pode alterar notas e a etapa (Preparando, Enviado, Entregue). Cancelamentos/reembolsos de pagamentos aprovados são feitos no Mercado Pago e depois atualizados por webhook ou pelo botão Consultar pagamento. Pedidos cancelados/reembolsados podem ser arquivados.
- Edições de produtos conferem a versão do registro para não sobrescrever estoque alterado por uma compra simultânea.
- O comprador acompanha o pedido por link com token aleatório de 256 bits. Somente o hash é guardado no banco. Essa consulta não expõe dados pessoais do cliente nem custos internos.

## Configuração do ambiente

As variáveis existentes `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já sustentam as operações de servidor. Credenciais Mercado Pago são criptografadas com AES-256-GCM e uma chave derivada por HKDF com contexto específico. `PARTNER_STORE_ENCRYPTION_KEY` pode definir uma chave independente; deve permanecer estável entre deploys. Sem ela, a derivação usa a chave de serviço Supabase já configurada. Alterar a chave utilizada exige reconectar as contas, pois os dados existentes não serão descriptografados pela nova chave.

`PUBLIC_APP_URL` define a origem canônica para notificações e retorno de pagamento. Na ausência dela, usa a URL Netlify e, por último, a origem atual de produção. Os caminhos de lojas funcionam automaticamente no domínio conectado. Ao conectar um domínio próprio, atualize também essa variável e a URL de redirecionamento da aplicação Mercado Pago.

Para habilitar OAuth: configure `MERCADO_PAGO_CLIENT_ID` e `MERCADO_PAGO_CLIENT_SECRET` da aplicação plataforma e registre a URL `https://<dominio>/api/partner-store/oauth` no Mercado Pago. O fluxo usa PKCE S256, estado de uso único com validade de dez minutos e cookie HttpOnly/Secure/SameSite=Lax. Tokens OAuth são renovados no servidor. Sem essas variáveis, a conexão por credencial de produção permanece disponível, sem apresentar um botão de autorização que não funcionaria.

Desconectar desabilita novos pagamentos, preservando a credencial protegida para acompanhar pedidos existentes. Depois de emitir pedidos online, trocar a conta recebedora por outro titular é bloqueado para preservar o acompanhamento financeiro; a credencial da mesma conta pode ser renovada.

A migração `partner_storefronts` cria as tabelas, índices, visões e RPCs de loja. Todas as tabelas possuem RLS e acesso direto negado a anon/authenticated. As funções de escrita e leitura privilegiada são exclusivas do serviço. As operações autenticadas validam a parceria ativa a cada solicitação e derivam a loja no servidor; não aceitam identificador de parceiro enviado pelo navegador como autorização.

Testes: `npm run test:stores` e `npm run test:partners`. Os testes PostgreSQL usam PGlite isolado com as migrações reais, sem alterar produção e sem efetuar pagamentos. Há testes de isolamento, reservas, idempotência, totais, reembolsos, tokens, sanitização e credenciais. A validação visual usa contas, produtos e provedor de pagamento simulados, com desktop e celular.
