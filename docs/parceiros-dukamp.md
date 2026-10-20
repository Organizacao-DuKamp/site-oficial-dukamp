# Parceiros Dukamp

## Fluxo atual

O parceiro consulta produtos fabricados pela Dukamp, simula produtos + frete e registra o pedido **sem pagamento**. Não escolhe Pix, boleto ou cartão e nenhuma cobrança é iniciada. A ficha inclui nome, CPF/CNPJ, telefone, e-mail, endereço e os dados complementares informados.

O pedido aparece em **Administração → Parceiros Dukamp → Gerenciar vendas** como aguardando confirmação. O administrador abre os detalhes, confere produtos, preços, quantidades, variantes, frete e contato e entra em contato com o cliente fora do sistema. Após confirmar a compra, informa a **comissão em reais** e clica em **Aceitar venda e definir comissão**. Pode recusar uma solicitação pendente com justificativa. A comissão não tem percentual automático nas novas vendas.

O parceiro acompanha a aprovação, comissão e entrega em Gerenciar vendas. A chave Pix fica na página inicial do parceiro e em **Gerenciar meu site → Definições**. Ela é privada, acessível apenas ao próprio parceiro e aos administradores. As comissões aprovadas no mês têm pagamento previsto até o **10º dia útil do mês seguinte**, no começo de cada mês. Não há transferência bancária automática nem marcação de comissão como já paga.

Registrar venda da loja própria também envia uma solicitação para a mesma análise administrativa, com preços e frete calculados pelo servidor sobre os produtos daquela loja. O histórico anterior da loja continua disponível. O checkout público e as conciliações de pagamentos já emitidos preservam seu funcionamento.

## Dados e autorização

Novas solicitações são gravadas em `partner_sale_requests`, separadas dos pedidos com pagamento online. A aceitação comercial não altera `payment_status`, não cria lançamento financeiro de pagamento e não usa Mercado Pago. Os pedidos antigos continuam nos registros originais, com reconciliação e histórico preservados. Os endpoints de conectar Mercado Pago e o retorno de OAuth foram retirados do fluxo do parceiro.

As tabelas e funções de escrita são restritas a `service_role`; as funções do servidor verificam a identidade ativa do parceiro ou o papel administrativo no banco. O parceiro não pode informar o identificador de outra loja, aceitar uma venda, definir sua comissão ou alterar seu andamento.

A simulação vale 15 minutos e vincula produtos, quantidades, variantes, modalidade e endereço. Os valores vêm da cotação persistida no servidor, nunca de preços enviados pelo navegador. Reenvios usam a mesma chave e retornam a mesma solicitação; alterar os dados exige nova simulação. As vendas manuais da loja usam uma chave de idempotência própria.

O estoque não é baixado ao enviar o pedido. Ao aceitar, uma transação bloqueia a solicitação e os produtos, confere disponibilidade e baixa o estoque uma única vez. Se algum item estiver indisponível, toda a aceitação é revertida. Recusas pendentes não baixam estoque nem geram comissão.

O histórico e as novas solicitações compartilham uma consulta paginada no banco, com totais calculados sem depender da página. As novas comissões são reconhecidas somente depois do aceite administrativo.

## Validação

- Testes de regras de parceiros, carrinho, opções, histórico de pagamentos, lojas e entrega.
- Testes PostgreSQL com PGlite: migrações reais, privilégio de acesso, isolamento entre parceiros, idempotência, aprovação administrativa, comissão manual, recusa e baixa de estoque transacional.
- Testes do servidor: preços/frete autoritativos, catálogo Dukamp, parceiro inativo, dados alterados, permissões da chave Pix e das comissões.
- Compilação de produção em execução remota no GitHub Actions, sem credenciais de produção e sem pagamentos reais.

## Confirmação de pagamento das comissões

Em **Gerenciar parceiros → Gerenciar**, o administrador confere a chave Pix e o saldo e usa **Confirmar pagamento da comissão** depois de fazer a transferência. A ação registra o valor quitado, data, administrador, parceiro, chave Pix daquele momento e as vendas incluídas.

A baixa zera o saldo das comissões pendentes daquele conjunto de vendas. Não apaga nem altera as comissões originais: preserva vendas, faturamento e histórico. Novas comissões aprovadas voltam a compor o saldo. Comissões antigas já retidas em checkouts assistidos não são pagas novamente.

A página inicial do parceiro mostra o saldo, o total pago e o histórico paginado. A venda também indica quando sua comissão foi paga. A confirmação é registrada na auditoria administrativa com identificação do responsável.

A operação é restrita a administradores, transacional e idempotente. O valor e a lista de vendas são conferidos novamente na confirmação; se o saldo mudou desde a conferência, o administrador precisa atualizar e verificar o Pix. Vendas quitadas não entram em outra baixa.
