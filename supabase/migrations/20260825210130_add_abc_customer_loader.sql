-- Helper temporário para carregar o snapshot ABC em lotes compactos.
create or replace function public._abc_load_customer_line(p_line text)
returns void
language plpgsql
as $$
declare
  v text[];
begin
  if nullif(trim(p_line), '') is null then
    return;
  end if;

  v := string_to_array(p_line, E'\t');

  insert into public.customers (
    codigo, cliente, cidade, uf, telefone, ultima_compra,
    vendedor_codigo, vendedor_nome, dados_vendedor_atualizados_em,
    abc_posicao, abc_total_acumulado, abc_percentual, abc_percentual_acumulado,
    abc_s, abc_c, abc_l, abc_periodo_inicio, abc_periodo_fim,
    abc_na_carteira_atual, dados_abc_atualizados_em, updated_at
  )
  values (
    v[2], v[3], nullif(v[4], ''), nullif(v[5], ''), nullif(v[6], ''), v[7]::date,
    v[14], public._abc_seller_name(v[14]), now(),
    v[1]::integer, v[8]::numeric(16,2), v[9]::numeric(8,2), v[10]::numeric(8,2),
    nullif(v[11], ''), nullif(v[12], ''), nullif(v[13], ''),
    date '2025-01-01', date '2026-08-25',
    true, now(), now()
  )
  on conflict (codigo) do update set
    cliente = excluded.cliente,
    cidade = excluded.cidade,
    uf = excluded.uf,
    telefone = excluded.telefone,
    ultima_compra = excluded.ultima_compra,
    vendedor_codigo = excluded.vendedor_codigo,
    vendedor_nome = excluded.vendedor_nome,
    dados_vendedor_atualizados_em = excluded.dados_vendedor_atualizados_em,
    abc_posicao = excluded.abc_posicao,
    abc_total_acumulado = excluded.abc_total_acumulado,
    abc_percentual = excluded.abc_percentual,
    abc_percentual_acumulado = excluded.abc_percentual_acumulado,
    abc_s = excluded.abc_s,
    abc_c = excluded.abc_c,
    abc_l = excluded.abc_l,
    abc_periodo_inicio = excluded.abc_periodo_inicio,
    abc_periodo_fim = excluded.abc_periodo_fim,
    abc_na_carteira_atual = true,
    dados_abc_atualizados_em = excluded.dados_abc_atualizados_em,
    updated_at = now();
end;
$$;
