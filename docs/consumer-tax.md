# Preço por perfil — regra comercial de 18%

O preço-base é o preço do produtor cadastrado. Para consumidor e visitante, aplica-se uma única vez base × 1,18. Produtor rural paga a base sem acréscimo.

Categorias isentas: Pets, Utensílios Gerais, Lonas e Coberturas, Arames e Ferragens. No banco atual Arames e Ferragens são dois catálogos separados; ambos são isentos. A categoria combinada também é reconhecida.

A regra central está em src/lib/pricing.ts e é compartilhada por vitrine, busca, carrinho, simulação e criação do pedido. As consultas incluem catalogs(name,slug). Promoções e Pix usam os valores de produtor correspondentes como base; campos de consumidor antigos não prevalecem sobre essa base.

O checkout verifica a sessão e lê o perfil no servidor. O tipo informado pelo cliente na simulação não concede preço de produtor. Não existe acréscimo adicional por UF: os campos tax_amount e icms_rate dos novos pedidos representam imposto adicional e permanecem zerados. Pedidos anteriores não são alterados.

Produtos legados sem preço-base de produtor válido mantêm o preço explícito de consumidor como fallback; devem ter o preço-base cadastrado para participar do cálculo automático.

Testes: node --test tests/pricing.test.mjs

