-- Finaliza o snapshot ABC 01/01/2025–25/08/2026.
-- A migration aborta antes de trocar a carteira atual se a carga não estiver íntegra.

do $$
declare
  v_rows integer;
  v_unique_codes integer;
  v_unique_positions integer;
  v_min_position integer;
  v_max_position integer;
  v_total numeric(18,2);
  v_missing_seller_code integer;
  v_unknown_seller_code integer;
  v_wrong_seller_name integer;
begin
  select
    count(*),
    count(distinct codigo),
    count(distinct abc_posicao),
    min(abc_posicao),
    max(abc_posicao),
    coalesce(sum(abc_total_acumulado), 0)::numeric(18,2),
    count(*) filter (where nullif(trim(vendedor_codigo), '') is null),
    count(*) filter (where public._abc_seller_name(vendedor_codigo) is null),
    count(*) filter (
      where vendedor_nome is distinct from public._abc_seller_name(vendedor_codigo)
    )
  into
    v_rows,
    v_unique_codes,
    v_unique_positions,
    v_min_position,
    v_max_position,
    v_total,
    v_missing_seller_code,
    v_unknown_seller_code,
    v_wrong_seller_name
  from public.customers
  where abc_periodo_inicio = date '2025-01-01'
    and abc_periodo_fim = date '2026-08-25'
    and abc_posicao between 1 and 1810;

  if v_rows <> 1810 then
    raise exception 'Snapshot ABC inválido: esperado 1810 linhas, encontrado %.', v_rows;
  end if;

  if v_unique_codes <> 1810 then
    raise exception 'Snapshot ABC inválido: esperado 1810 códigos únicos, encontrado %.', v_unique_codes;
  end if;

  if v_unique_positions <> 1810 or v_min_position <> 1 or v_max_position <> 1810 then
    raise exception 'Snapshot ABC inválido: posições esperadas 1..1810; únicas %, mínimo %, máximo %.',
      v_unique_positions, v_min_position, v_max_position;
  end if;

  if v_total <> 24458800.51::numeric(18,2) then
    raise exception 'Snapshot ABC inválido: total esperado R$ 24.458.800,51; encontrado %.', v_total;
  end if;

  if v_missing_seller_code <> 0 then
    raise exception 'Snapshot ABC inválido: % clientes sem vendedor_codigo.', v_missing_seller_code;
  end if;

  if v_unknown_seller_code <> 0 then
    raise exception 'Snapshot ABC inválido: % clientes usam vendedor_codigo sem mapeamento.', v_unknown_seller_code;
  end if;

  if v_wrong_seller_name <> 0 then
    raise exception 'Snapshot ABC inválido: % clientes têm vendedor_nome divergente do vendedor_codigo.', v_wrong_seller_name;
  end if;
end
$$;

-- Apenas os registros do relatório vigente compõem a carteira atual.
-- vendedor_codigo/vendedor_nome antigos não são apagados: ficam preservados como histórico,
-- enquanto abc_na_carteira_atual controla a visibilidade operacional no painel.
update public.customers
set
  abc_na_carteira_atual = case
    when abc_periodo_inicio = date '2025-01-01'
      and abc_periodo_fim = date '2026-08-25'
      and abc_posicao between 1 and 1810
    then true
    else false
  end,
  updated_at = now()
where abc_na_carteira_atual is distinct from case
  when abc_periodo_inicio = date '2025-01-01'
    and abc_periodo_fim = date '2026-08-25'
    and abc_posicao between 1 and 1810
  then true
  else false
end;

do $$
declare
  v_current integer;
  v_stale_current integer;
begin
  select
    count(*) filter (where abc_na_carteira_atual),
    count(*) filter (
      where abc_na_carteira_atual
        and not (
          abc_periodo_inicio = date '2025-01-01'
          and abc_periodo_fim = date '2026-08-25'
          and abc_posicao between 1 and 1810
        )
    )
  into v_current, v_stale_current
  from public.customers;

  if v_current <> 1810 or v_stale_current <> 0 then
    raise exception 'Finalização ABC inválida: carteira atual %, registros antigos ainda ativos %.',
      v_current, v_stale_current;
  end if;
end
$$;

-- Helpers temporários usados somente durante esta carga.
drop function if exists public._abc_load_customer_line(text);
drop function if exists public._abc_seller_name(text);
