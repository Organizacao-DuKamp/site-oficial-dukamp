-- Nomes completos dos vendedores usados pelo relatório ABC CLIENTE.
-- O PDF limita a largura do nome; o código de 3 dígitos é a chave confiável.
create or replace function public._abc_seller_name(p_code text)
returns text
language sql
immutable
as $$
  select case p_code
    when '013' then 'ILDENEA DE OLIVEIRA TASSONI'
    when '023' then 'ROGERIO CEZAR GOMES DE REZENDE'
    when '030' then 'JOSE JUSTINO ESPLENDOR'
    when '034' then 'RAFAELA CRISTINA'
    when '037' then 'ALESSANDRO AUGUSTO DA SILVA'
    when '065' then 'BRENDA'
    when '069' then 'FLAVIO MANO HAKME'
    when '075' then 'DEBORA'
    when '077' then 'MARCOS ROBERTO GUIMARAES'
    when '101' then 'FORA VENDA'
    when '129' then 'MARCO ANTONIO SARTORI'
    when '207' then 'GERVAZIO DA SILVEIRA TEODORO'
    when '208' then 'ANDRESSA MARTINS DE SOUZA'
    when '268' then 'CASSIANO DE OLIVEIRA LOCATELLI'
    when '312' then 'OSVANI PEREIRA MACHADO'
    when '346' then 'SARAH'
    when '347' then 'GABRIEL'
    when '387' then 'MAYSA BORGUEZAN MELO SANCHES'
    when '388' then 'ENEIAS NEVES OLIVEIRA'
    when '389' then 'DANIELLE LOPES DOMINE'
    when '390' then 'STEFANY FERNANDA AMANCIO'
    when '391' then 'FRANCISCO GAUDENCIO DE MACEDO'
    when '395' then 'JOAO CARLOS PASCUTI'
    when '396' then 'CARLOS HENRIQUE GIRARDI'
    when '398' then 'SILES VANDERLEI CALANDRIA'
    when '417' then 'AMANDA APARECIDA'
    when '708' then 'RAFAEL LAURENCE MARQUES'
    when '712' then 'DUDA VEND RIO PRETO'
    when '722' then 'FERNANDO / NUCLEO'
    when '925' then 'LEONARDO RECHE'
    when '936' then 'MARIANA'
    else null
  end;
$$;
