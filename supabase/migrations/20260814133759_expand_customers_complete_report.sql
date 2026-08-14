alter table public.customers
  add column if not exists inscricao_estadual text,
  add column if not exists telefone_2 text,
  add column if not exists classificacao_l text,
  add column if not exists conceito text,
  add column if not exists marcador_relatorio text,
  add column if not exists endereco text,
  add column if not exists numero text,
  add column if not exists bairro text,
  add column if not exists cep text,
  add column if not exists data_cadastro date,
  add column if not exists endereco_pagamento text,
  add column if not exists numero_pagamento text,
  add column if not exists bairro_pagamento text,
  add column if not exists cidade_pagamento text,
  add column if not exists uf_pagamento text,
  add column if not exists cep_pagamento text,
  add column if not exists data_maior_compra date,
  add column if not exists valor_maior_compra numeric(14, 2),
  add column if not exists valor_ultima_compra numeric(14, 2),
  add column if not exists maior_atraso_dias integer,
  add column if not exists media_atraso_dias integer,
  add column if not exists compra_ano numeric(14, 2),
  add column if not exists compra_ano_anterior numeric(14, 2),
  add column if not exists dados_relatorio_atualizados_em timestamptz;

comment on column public.customers.classificacao_l is
  'Campo L do relatório FARCLIEN de clientes.';
comment on column public.customers.conceito is
  'Conceito cadastral informado pelo relatório FARCLIEN.';
comment on column public.customers.marcador_relatorio is
  'Marcador que antecede o nome no relatório de origem, como #, * ou @.';
comment on column public.customers.dados_relatorio_atualizados_em is
  'Data e hora da última sincronização usando o relatório completo de clientes.';

alter table public.customers enable row level security;
