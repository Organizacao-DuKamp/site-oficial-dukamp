-- Arquivo gerado por scripts/legacy_dbf_to_supabase.py.
-- Estrutura somente leitura do ERP Clipper da Dukamp; os dados são importados fora do Git.
create table if not exists public.dukamp_legacy_tables (
  source_name text primary key,
  target_name text not null unique,
  label text not null,
  module text not null,
  source_file text not null,
  source_record_count bigint not null default 0,
  imported_record_count bigint not null default 0,
  columns jsonb not null default '[]'::jsonb,
  imported_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.dukamp_legacy_tables enable row level security;
revoke all on public.dukamp_legacy_tables from public, anon;
grant select on public.dukamp_legacy_tables to authenticated;
grant all on public.dukamp_legacy_tables to service_role;
drop policy if exists "Admins read legacy table catalog" on public.dukamp_legacy_tables;
create policy "Admins read legacy table catalog" on public.dukamp_legacy_tables
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CMACBENE.DBF: CMACBENE
create table if not exists public."dukamp_legacy_cmacbene" (
  _row_id bigint generated always as identity primary key,
  "cbenef" varchar(8),
  "descri" varchar(30),
  "objeto" varchar(30),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cmacbene" enable row level security;
revoke all on public."dukamp_legacy_cmacbene" from public, anon;
grant select on public."dukamp_legacy_cmacbene" to authenticated;
grant all on public."dukamp_legacy_cmacbene" to service_role;
drop policy if exists "Admins read cmacbene" on public."dukamp_legacy_cmacbene";
create policy "Admins read cmacbene" on public."dukamp_legacy_cmacbene"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CMACDFIS.DBF: CMACDFIS
create table if not exists public."dukamp_legacy_cmacdfis" (
  _row_id bigint generated always as identity primary key,
  "codfis" integer,
  "desfis1" varchar(65),
  "desfis2" varchar(65),
  "tipo" varchar(20),
  "dificm" numeric(5,2),
  "cbenef" varchar(8),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cmacdfis" enable row level security;
revoke all on public."dukamp_legacy_cmacdfis" from public, anon;
grant select on public."dukamp_legacy_cmacdfis" to authenticated;
grant all on public."dukamp_legacy_cmacdfis" to service_role;
drop policy if exists "Admins read cmacdfis" on public."dukamp_legacy_cmacdfis";
create policy "Admins read cmacdfis" on public."dukamp_legacy_cmacdfis"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CMACDNCM.DBF: CMACDNCM
create table if not exists public."dukamp_legacy_cmacdncm" (
  _row_id bigint generated always as identity primary key,
  "codncm" integer,
  "iva_sp" numeric(6,2),
  "mva_mg" numeric(6,2),
  "prt_mg" integer,
  "dic_mg" numeric(5,2),
  "mva_mt" numeric(6,2),
  "prt_mt" integer,
  "dic_mt" numeric(5,2),
  "mva_ms" numeric(6,2),
  "prt_ms" integer,
  "dic_ms" numeric(5,2),
  "ibpt_nac" numeric(5,2),
  "ibpt_imp" numeric(5,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cmacdncm" enable row level security;
revoke all on public."dukamp_legacy_cmacdncm" from public, anon;
grant select on public."dukamp_legacy_cmacdncm" to authenticated;
grant all on public."dukamp_legacy_cmacdncm" to service_role;
drop policy if exists "Admins read cmacdncm" on public."dukamp_legacy_cmacdncm";
create policy "Admins read cmacdncm" on public."dukamp_legacy_cmacdncm"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CMACMPEQ.DBF: CMACMPEQ
create table if not exists public."dukamp_legacy_cmacmpeq" (
  _row_id bigint generated always as identity primary key,
  "codigo" integer,
  "descri" varchar(40),
  "compon" text,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cmacmpeq" enable row level security;
revoke all on public."dukamp_legacy_cmacmpeq" from public, anon;
grant select on public."dukamp_legacy_cmacmpeq" to authenticated;
grant all on public."dukamp_legacy_cmacmpeq" to service_role;
drop policy if exists "Admins read cmacmpeq" on public."dukamp_legacy_cmacmpeq";
create policy "Admins read cmacmpeq" on public."dukamp_legacy_cmacmpeq"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CMAFALTA.DBF: CMAFALTA
create table if not exists public."dukamp_legacy_cmafalta" (
  _row_id bigint generated always as identity primary key,
  "codigo" integer,
  "descri" varchar(40),
  "falta" text,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cmafalta" enable row level security;
revoke all on public."dukamp_legacy_cmafalta" from public, anon;
grant select on public."dukamp_legacy_cmafalta" to authenticated;
grant all on public."dukamp_legacy_cmafalta" to service_role;
drop policy if exists "Admins read cmafalta" on public."dukamp_legacy_cmafalta";
create policy "Admins read cmafalta" on public."dukamp_legacy_cmafalta"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CMAIBXPC.DBF: CMAIBXPC
create table if not exists public."dukamp_legacy_cmaibxpc" (
  _row_id bigint generated always as identity primary key,
  "segmen" integer,
  "codfor" integer,
  "nronff" varchar(10),
  "nroite" integer,
  "numped" integer,
  "iteped" integer,
  "quabxa" numeric(9,2),
  "datped" date,
  "prcped" numeric(13,2),
  "qtdarc" numeric(9,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cmaibxpc" enable row level security;
revoke all on public."dukamp_legacy_cmaibxpc" from public, anon;
grant select on public."dukamp_legacy_cmaibxpc" to authenticated;
grant all on public."dukamp_legacy_cmaibxpc" to service_role;
drop policy if exists "Admins read cmaibxpc" on public."dukamp_legacy_cmaibxpc";
create policy "Admins read cmaibxpc" on public."dukamp_legacy_cmaibxpc"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CMAITENT.DBF: Itens das notas de entrada
create table if not exists public."dukamp_legacy_cmaitent" (
  _row_id bigint generated always as identity primary key,
  "segmen" integer,
  "codfor" integer,
  "nronff" varchar(10),
  "nroite" integer,
  "codpro" integer,
  "quapro" numeric(9,2),
  "cstpro" numeric(12,2),
  "perdsc" numeric(7,4),
  "peripi" numeric(5,2),
  "pericm" numeric(5,2),
  "prerec" numeric(12,4),
  "nompro" varchar(45),
  "cstrea" numeric(12,2),
  "pretab" numeric(15,2),
  "mrgprd" numeric(5,2),
  "vlrfre" numeric(15,2),
  "quaalm" numeric(9,2),
  "qualoj" numeric(9,2),
  "basicm" numeric(12,2),
  "redicm" numeric(5,2),
  "vlripi" numeric(12,2),
  "totite" numeric(12,2),
  "codtri" integer,
  "cfopit" integer,
  "codnbm" integer,
  "valics" numeric(10,2),
  "vlicst" numeric(12,2),
  "vlfret" numeric(10,2),
  "vldesc" numeric(10,2),
  "vlsegu" numeric(10,2),
  "vloutr" numeric(10,2),
  "cdprfo" varchar(20),
  "vbicst" numeric(12,2),
  "cest" integer,
  "bpericm" numeric(5,2),
  "bbasicm" numeric(12,2),
  "bredicm" numeric(5,2),
  "cusmed" numeric(15,2),
  "difcus" numeric(12,2),
  "mrgaju" numeric(10,2),
  "mrgicmaju" numeric(6,2),
  "mrgcstaju" numeric(15,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cmaitent" enable row level security;
revoke all on public."dukamp_legacy_cmaitent" from public, anon;
grant select on public."dukamp_legacy_cmaitent" to authenticated;
grant all on public."dukamp_legacy_cmaitent" to service_role;
drop policy if exists "Admins read cmaitent" on public."dukamp_legacy_cmaitent";
create policy "Admins read cmaitent" on public."dukamp_legacy_cmaitent"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CMAITPED.DBF: Itens dos pedidos de compra
create table if not exists public."dukamp_legacy_cmaitped" (
  _row_id bigint generated always as identity primary key,
  "pcnropdi" integer,
  "pciteped" integer,
  "pccodpro" integer,
  "pcqtdpro" numeric(10,3),
  "pcvlruni" numeric(13,3),
  "pcperipi" numeric(5,2),
  "pcqtdent" numeric(10,3),
  "pcultent" date,
  "pcdespro" varchar(40),
  "pcprerec" numeric(15,3),
  "pcdscit1" numeric(5,2),
  "pcdscit2" numeric(5,2),
  "pcdscit3" numeric(5,2),
  "pcdscit4" numeric(5,2),
  "pcdscit5" numeric(5,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cmaitped" enable row level security;
revoke all on public."dukamp_legacy_cmaitped" from public, anon;
grant select on public."dukamp_legacy_cmaitped" to authenticated;
grant all on public."dukamp_legacy_cmaitped" to service_role;
drop policy if exists "Admins read cmaitped" on public."dukamp_legacy_cmaitped";
create policy "Admins read cmaitped" on public."dukamp_legacy_cmaitped"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CMAMETAS.DBF: CMAMETAS
create table if not exists public."dukamp_legacy_cmametas" (
  _row_id bigint generated always as identity primary key,
  "mcanomes" varchar(6),
  "mccodlin" integer,
  "mcvalmet" numeric(12,2),
  "mcvaldup" numeric(12,2),
  "mcpermet" numeric(5,2),
  "mcliqmet" numeric(18,2),
  "mcvalpdc" numeric(18,2),
  "mcvalrec" numeric(18,2),
  "mcprvrec" numeric(18,2),
  "mcvaldsp" numeric(18,2),
  "mcsalfin" numeric(18,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cmametas" enable row level security;
revoke all on public."dukamp_legacy_cmametas" from public, anon;
grant select on public."dukamp_legacy_cmametas" to authenticated;
grant all on public."dukamp_legacy_cmametas" to service_role;
drop policy if exists "Admins read cmametas" on public."dukamp_legacy_cmametas";
create policy "Admins read cmametas" on public."dukamp_legacy_cmametas"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CMAMETPG.DBF: CMAMETPG
create table if not exists public."dukamp_legacy_cmametpg" (
  _row_id bigint generated always as identity primary key,
  "ano" varchar(4),
  "mcfatano" numeric(18,2),
  "mc000" numeric(5,2),
  "mc030" numeric(5,2),
  "mc060" numeric(5,2),
  "mc090" numeric(5,2),
  "mc120" numeric(5,2),
  "mc150" numeric(5,2),
  "mc180" numeric(5,2),
  "mc210" numeric(5,2),
  "mc240" numeric(5,2),
  "mc270" numeric(5,2),
  "mc300" numeric(5,2),
  "mc330" numeric(5,2),
  "perlu01" numeric(5,2),
  "perlu02" numeric(5,2),
  "perlu03" numeric(5,2),
  "perlu04" numeric(5,2),
  "perlu05" numeric(5,2),
  "perlu06" numeric(5,2),
  "perlu07" numeric(5,2),
  "perlu08" numeric(5,2),
  "perlu09" numeric(5,2),
  "perlu10" numeric(5,2),
  "perlu11" numeric(5,2),
  "perlu12" numeric(5,2),
  "perce01" numeric(5,2),
  "perce02" numeric(5,2),
  "perce03" numeric(5,2),
  "perce04" numeric(5,2),
  "perce05" numeric(5,2),
  "perce06" numeric(5,2),
  "perce07" numeric(5,2),
  "perce08" numeric(5,2),
  "perce09" numeric(5,2),
  "perce10" numeric(5,2),
  "perce11" numeric(5,2),
  "perce12" numeric(5,2),
  "prvft01" numeric(18,2),
  "prvft02" numeric(18,2),
  "prvft03" numeric(18,2),
  "prvft04" numeric(18,2),
  "prvft05" numeric(18,2),
  "prvft06" numeric(18,2),
  "prvft07" numeric(18,2),
  "prvft08" numeric(18,2),
  "prvft09" numeric(18,2),
  "prvft10" numeric(18,2),
  "prvft11" numeric(18,2),
  "prvft12" numeric(18,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cmametpg" enable row level security;
revoke all on public."dukamp_legacy_cmametpg" from public, anon;
grant select on public."dukamp_legacy_cmametpg" to authenticated;
grant all on public."dukamp_legacy_cmametpg" to service_role;
drop policy if exists "Admins read cmametpg" on public."dukamp_legacy_cmametpg";
create policy "Admins read cmametpg" on public."dukamp_legacy_cmametpg"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CMANOTEN.DBF: Notas de entrada
create table if not exists public."dukamp_legacy_cmanoten" (
  _row_id bigint generated always as identity primary key,
  "segmen" integer,
  "codfor" integer,
  "nronff" varchar(10),
  "datemi" date,
  "valnot" numeric(15,2),
  "valfre" numeric(12,2),
  "valdsp" numeric(12,2),
  "valdsc" numeric(12,2),
  "vlbfre" numeric(15,2),
  "vlbdsp" numeric(15,2),
  "vlbdsc" numeric(15,2),
  "atucst" varchar(1),
  "cndpgt" varchar(10),
  "flglib" varchar(1),
  "perfrt" numeric(5,2),
  "perfin" numeric(5,2),
  "valicm" numeric(13,2),
  "vlbicm" numeric(15,2),
  "dticms" date,
  "dathoj" date,
  "codfis" integer,
  "serie" varchar(3),
  "flag" varchar(1),
  "uf" varchar(2),
  "cgc" varchar(14),
  "inscr" varchar(16),
  "datdig" date,
  "especie" varchar(3),
  "nomfor" varchar(35),
  "fnrocnh" varchar(10),
  "fnomfor" varchar(35),
  "fuf" varchar(2),
  "fcgc" varchar(14),
  "finscr" varchar(16),
  "fserie" varchar(3),
  "fespeci" varchar(3),
  "fcodfis" integer,
  "fdatemi" date,
  "fvalfrt" numeric(12,2),
  "fbasicm" numeric(12,2),
  "fpericm" numeric(5,2),
  "fvlricm" numeric(10,2),
  "nvalfrt" numeric(12,2),
  "npericm" numeric(5,2),
  "nvlricm" numeric(10,2),
  "nbasicm" numeric(12,2),
  "nvaldsp" numeric(12,2),
  "npericd" numeric(5,2),
  "nvlricd" numeric(10,2),
  "nbasicd" numeric(12,2),
  "codemp" integer,
  "valics" numeric(10,2),
  "vlbics" numeric(12,2),
  "vtpics" numeric(12,2),
  "chave_nfe" varchar(44),
  "prot_nfe" varchar(20),
  "cnae" varchar(7),
  "codibge" varchar(7),
  "codpais" varchar(4),
  "nompais" varchar(30),
  "endfor" varchar(60),
  "endnum" varchar(10),
  "baifor" varchar(30),
  "ind_emit" varchar(1),
  "datsai" date,
  "antecipa" varchar(1),
  "crt" varchar(1),
  "vcgc" varchar(14),
  "vfcgc" varchar(14),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cmanoten" enable row level security;
revoke all on public."dukamp_legacy_cmanoten" from public, anon;
grant select on public."dukamp_legacy_cmanoten" to authenticated;
grant all on public."dukamp_legacy_cmanoten" to service_role;
drop policy if exists "Admins read cmanoten" on public."dukamp_legacy_cmanoten";
create policy "Admins read cmanoten" on public."dukamp_legacy_cmanoten"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CMAPEDID.DBF: Pedidos de compra
create table if not exists public."dukamp_legacy_cmapedid" (
  _row_id bigint generated always as identity primary key,
  "pcnroped" integer,
  "pccodfor" integer,
  "pcnomfor" varchar(20),
  "pcdatemi" date,
  "pcprvent" date,
  "pcconpg1" integer,
  "pcconpg2" integer,
  "pcconpg3" integer,
  "pcconpg4" integer,
  "pcconpg5" integer,
  "pcconpg6" integer,
  "pcconpg7" integer,
  "pcconpg8" integer,
  "pcconpg9" integer,
  "pcvlrdsc" numeric(13,2),
  "pcperds1" numeric(5,2),
  "pcperds2" numeric(5,2),
  "pcperds3" numeric(5,2),
  "pcperds4" numeric(5,2),
  "pcdesdsp" varchar(20),
  "pcvlrdsp" numeric(13,2),
  "pcperdsp" numeric(5,2),
  "pcforcom" varchar(25),
  "pcpedfor" varchar(15),
  "pctransp" varchar(55),
  "pcatendi" varchar(1),
  "pcgrucmp" integer,
  "pccontat" varchar(15),
  "pcperdp2" numeric(5,2),
  "pcobserv" text,
  "pcprzfix" varchar(1),
  "pcpenden" varchar(1),
  "pcpgtant" date,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cmapedid" enable row level security;
revoke all on public."dukamp_legacy_cmapedid" from public, anon;
grant select on public."dukamp_legacy_cmapedid" to authenticated;
grant all on public."dukamp_legacy_cmapedid" to service_role;
drop policy if exists "Admins read cmapedid" on public."dukamp_legacy_cmapedid";
create policy "Admins read cmapedid" on public."dukamp_legacy_cmapedid"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CMASTNCM.DBF: CMASTNCM
create table if not exists public."dukamp_legacy_cmastncm" (
  _row_id bigint generated always as identity primary key,
  "codncm" integer,
  "ufe" varchar(2),
  "codfis" integer,
  "iva" numeric(6,2),
  "protoc" integer,
  "dificm" numeric(5,2),
  "alquforg" numeric(5,2),
  "alqufdst" numeric(5,2),
  "alqfcpst" numeric(5,2),
  "peripi" numeric(5,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cmastncm" enable row level security;
revoke all on public."dukamp_legacy_cmastncm" from public, anon;
grant select on public."dukamp_legacy_cmastncm" to authenticated;
grant all on public."dukamp_legacy_cmastncm" to service_role;
drop policy if exists "Admins read cmastncm" on public."dukamp_legacy_cmastncm";
create policy "Admins read cmastncm" on public."dukamp_legacy_cmastncm"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CPAADFOR.DBF: CPAADFOR
create table if not exists public."dukamp_legacy_cpaadfor" (
  _row_id bigint generated always as identity primary key,
  "codfor" integer,
  "data" date,
  "valor" numeric(12,2),
  "debcre" varchar(1),
  "histo" varchar(30),
  "saldo" numeric(12,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cpaadfor" enable row level security;
revoke all on public."dukamp_legacy_cpaadfor" from public, anon;
grant select on public."dukamp_legacy_cpaadfor" to authenticated;
grant all on public."dukamp_legacy_cpaadfor" to service_role;
drop policy if exists "Admins read cpaadfor" on public."dukamp_legacy_cpaadfor";
create policy "Admins read cpaadfor" on public."dukamp_legacy_cpaadfor"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CPAAUTPG.DBF: Autorizações de pagamento
create table if not exists public."dukamp_legacy_cpaautpg" (
  _row_id bigint generated always as identity primary key,
  "apcodfor" integer,
  "apnrodoc" varchar(15),
  "apdatemi" date,
  "apvaldoc" numeric(15,2),
  "aptipdoc" varchar(15),
  "apforpag" varchar(15),
  "apflgemi" varchar(1),
  "apflgins" varchar(1),
  "apcodaut" varchar(15),
  "apnatdb1" varchar(35),
  "apnatdb2" varchar(35),
  "apnatdb3" varchar(35),
  "apnatdb4" varchar(35),
  "apnatdb5" varchar(35),
  "apnatdb6" varchar(35),
  "aptippag" varchar(1),
  "apgrucmp" integer,
  "apcodemp" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cpaautpg" enable row level security;
revoke all on public."dukamp_legacy_cpaautpg" from public, anon;
grant select on public."dukamp_legacy_cpaautpg" to authenticated;
grant all on public."dukamp_legacy_cpaautpg" to service_role;
drop policy if exists "Admins read cpaautpg" on public."dukamp_legacy_cpaautpg";
create policy "Admins read cpaautpg" on public."dukamp_legacy_cpaautpg"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CPACONTA.DBF: CPACONTA
create table if not exists public."dukamp_legacy_cpaconta" (
  _row_id bigint generated always as identity primary key,
  "tipreg" varchar(1),
  "layout" varchar(1),
  "apelido" varchar(6),
  "carpag" integer,
  "descri" varchar(30),
  "cta_cred" integer,
  "cta_debi" integer,
  "hist_pad" integer,
  "hist_dsr" varchar(30),
  "hist_mult" integer,
  "hist_dsr_m" varchar(30),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cpaconta" enable row level security;
revoke all on public."dukamp_legacy_cpaconta" from public, anon;
grant select on public."dukamp_legacy_cpaconta" to authenticated;
grant all on public."dukamp_legacy_cpaconta" to service_role;
drop policy if exists "Admins read cpaconta" on public."dukamp_legacy_cpaconta";
create policy "Admins read cpaconta" on public."dukamp_legacy_cpaconta"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CPAEMPRE.DBF: CPAEMPRE
create table if not exists public."dukamp_legacy_cpaempre" (
  _row_id bigint generated always as identity primary key,
  "codemp" integer,
  "nomemp" varchar(25),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cpaempre" enable row level security;
revoke all on public."dukamp_legacy_cpaempre" from public, anon;
grant select on public."dukamp_legacy_cpaempre" to authenticated;
grant all on public."dukamp_legacy_cpaempre" to service_role;
drop policy if exists "Admins read cpaempre" on public."dukamp_legacy_cpaempre";
create policy "Admins read cpaempre" on public."dukamp_legacy_cpaempre"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CPAFERIA.DBF: CPAFERIA
create table if not exists public."dukamp_legacy_cpaferia" (
  _row_id bigint generated always as identity primary key,
  "frdatfer" date,
  "frdescri" varchar(25),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cpaferia" enable row level security;
revoke all on public."dukamp_legacy_cpaferia" from public, anon;
grant select on public."dukamp_legacy_cpaferia" to authenticated;
grant all on public."dukamp_legacy_cpaferia" to service_role;
drop policy if exists "Admins read cpaferia" on public."dukamp_legacy_cpaferia";
create policy "Admins read cpaferia" on public."dukamp_legacy_cpaferia"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CPAFORNE.DBF: Fornecedores
create table if not exists public."dukamp_legacy_cpaforne" (
  _row_id bigint generated always as identity primary key,
  "fcod" integer,
  "fnome" varchar(40),
  "fend" varchar(40),
  "fcid" integer,
  "fbair" varchar(10),
  "fcep" integer,
  "ffone" bigint,
  "ftelex" bigint,
  "fcgc" varchar(14),
  "finsc" varchar(16),
  "fdtcad" date,
  "fdtutcp" date,
  "fvrutcp" integer,
  "fdtmacp" date,
  "fvrmacp" integer,
  "fcpaatu" bigint,
  "fcpaant" bigint,
  "ftipfor" integer,
  "findpcv" numeric(5,2),
  "concont" integer,
  "fcontat" varchar(45),
  "fnomfan" varchar(20),
  "fobserv" text,
  "femail" varchar(40),
  "saldoad" numeric(12,2),
  "vfcgc" varchar(14),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cpaforne" enable row level security;
revoke all on public."dukamp_legacy_cpaforne" from public, anon;
grant select on public."dukamp_legacy_cpaforne" to authenticated;
grant all on public."dukamp_legacy_cpaforne" to service_role;
drop policy if exists "Admins read cpaforne" on public."dukamp_legacy_cpaforne";
create policy "Admins read cpaforne" on public."dukamp_legacy_cpaforne"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CPAGENDA.DBF: CPAGENDA
create table if not exists public."dukamp_legacy_cpagenda" (
  _row_id bigint generated always as identity primary key,
  "codigo" integer,
  "nomage" varchar(40),
  "endage" varchar(40),
  "cidage" varchar(20),
  "fonres" varchar(15),
  "foncel" varchar(15),
  "fonemp" varchar(15),
  "conage" varchar(50),
  "observ" varchar(50),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cpagenda" enable row level security;
revoke all on public."dukamp_legacy_cpagenda" from public, anon;
grant select on public."dukamp_legacy_cpagenda" to authenticated;
grant all on public."dukamp_legacy_cpagenda" to service_role;
drop policy if exists "Admins read cpagenda" on public."dukamp_legacy_cpagenda";
create policy "Admins read cpagenda" on public."dukamp_legacy_cpagenda"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CPAMETAS.DBF: CPAMETAS
create table if not exists public."dukamp_legacy_cpametas" (
  _row_id bigint generated always as identity primary key,
  "mtcodgru" integer,
  "mtdatval" date,
  "mtvlrmet" numeric(12,2),
  "mtpermet" numeric(7,4),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cpametas" enable row level security;
revoke all on public."dukamp_legacy_cpametas" from public, anon;
grant select on public."dukamp_legacy_cpametas" to authenticated;
grant all on public."dukamp_legacy_cpametas" to service_role;
drop policy if exists "Admins read cpametas" on public."dukamp_legacy_cpametas";
create policy "Admins read cpametas" on public."dukamp_legacy_cpametas"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CPATIAPG.DBF: Baixas de contas a pagar
create table if not exists public."dukamp_legacy_cpatiapg" (
  _row_id bigint generated always as identity primary key,
  "atcodfor" integer,
  "atnrodoc" varchar(15),
  "atnroapg" integer,
  "atnrotit" varchar(12),
  "atdiasvc" integer,
  "atdatven" date,
  "atvalpar" numeric(14,2),
  "atdesvct" numeric(5,2),
  "atvlrdsc" numeric(12,2),
  "atemitit" date,
  "atvalabt" numeric(12,2),
  "atbancob" varchar(15),
  "atobseap" varchar(35),
  "atdatpgt" date,
  "atforpgt" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cpatiapg" enable row level security;
revoke all on public."dukamp_legacy_cpatiapg" from public, anon;
grant select on public."dukamp_legacy_cpatiapg" to authenticated;
grant all on public."dukamp_legacy_cpatiapg" to service_role;
drop policy if exists "Admins read cpatiapg" on public."dukamp_legacy_cpatiapg";
create policy "Admins read cpatiapg" on public."dukamp_legacy_cpatiapg"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CPATITUP.DBF: Títulos a pagar
create table if not exists public."dukamp_legacy_cpatitup" (
  _row_id bigint generated always as identity primary key,
  "pnroap" integer,
  "pnrtit" varchar(12),
  "pforne" integer,
  "pemiss" date,
  "pvrtit" numeric(13,2),
  "pvrabe" numeric(13,2),
  "pvecto" date,
  "pdesvc" numeric(13,2),
  "pcarpa" integer,
  "ppagto" date,
  "pjuros" numeric(12,2),
  "ppago" varchar(1),
  "ptippg" varchar(2),
  "pgrucm" integer,
  "pdtins" date,
  "pobser" varchar(35),
  "pcodemp" integer,
  "pdescr" varchar(40),
  "pinss" numeric(10,2),
  "pirrf" numeric(10,2),
  "pbcocred" integer,
  "pcodhist" integer,
  "pdsccred" integer,
  "pdschist" integer,
  "pjurdebi" integer,
  "pjurhist" integer,
  "pinscred" integer,
  "pinshist" integer,
  "pirfcred" integer,
  "pirfhist" integer,
  "ptippgt" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cpatitup" enable row level security;
revoke all on public."dukamp_legacy_cpatitup" from public, anon;
grant select on public."dukamp_legacy_cpatitup" to authenticated;
grant all on public."dukamp_legacy_cpatitup" to service_role;
drop policy if exists "Admins read cpatitup" on public."dukamp_legacy_cpatitup";
create policy "Admins read cpatitup" on public."dukamp_legacy_cpatitup"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CPATPFOR.DBF: CPATPFOR
create table if not exists public."dukamp_legacy_cpatpfor" (
  _row_id bigint generated always as identity primary key,
  "tfcodigo" integer,
  "tfdescri" varchar(25),
  "tfgrupo" integer,
  "tftipo" varchar(2),
  "tfemicmp" varchar(2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cpatpfor" enable row level security;
revoke all on public."dukamp_legacy_cpatpfor" from public, anon;
grant select on public."dukamp_legacy_cpatpfor" to authenticated;
grant all on public."dukamp_legacy_cpatpfor" to service_role;
drop policy if exists "Admins read cpatpfor" on public."dukamp_legacy_cpatpfor";
create policy "Admins read cpatpfor" on public."dukamp_legacy_cpatpfor"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CRAADCLI.DBF: CRAADCLI
create table if not exists public."dukamp_legacy_craadcli" (
  _row_id bigint generated always as identity primary key,
  "codcli" integer,
  "data" date,
  "valor" numeric(12,2),
  "debcre" varchar(1),
  "histo" varchar(30),
  "saldo" numeric(12,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_craadcli" enable row level security;
revoke all on public."dukamp_legacy_craadcli" from public, anon;
grant select on public."dukamp_legacy_craadcli" to authenticated;
grant all on public."dukamp_legacy_craadcli" to service_role;
drop policy if exists "Admins read craadcli" on public."dukamp_legacy_craadcli";
create policy "Admins read craadcli" on public."dukamp_legacy_craadcli"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CRACABCP.DBF: CRACABCP
create table if not exists public."dukamp_legacy_cracabcp" (
  _row_id bigint generated always as identity primary key,
  "codigo" integer,
  "nome" varchar(15),
  "abvnome" varchar(2),
  "conceito" integer,
  "diasatrz" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cracabcp" enable row level security;
revoke all on public."dukamp_legacy_cracabcp" from public, anon;
grant select on public."dukamp_legacy_cracabcp" to authenticated;
grant all on public."dukamp_legacy_cracabcp" to service_role;
drop policy if exists "Admins read cracabcp" on public."dukamp_legacy_cracabcp";
create policy "Admins read cracabcp" on public."dukamp_legacy_cracabcp"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CRACORTI.DBF: CRACORTI
create table if not exists public."dukamp_legacy_cracorti" (
  _row_id bigint generated always as identity primary key,
  "vlmult" numeric(14,2),
  "txmult" numeric(5,2),
  "pricor" varchar(1),
  "txjuro" numeric(9,6),
  "mesdia" varchar(1),
  "smpcmp" varchar(1),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cracorti" enable row level security;
revoke all on public."dukamp_legacy_cracorti" from public, anon;
grant select on public."dukamp_legacy_cracorti" to authenticated;
grant all on public."dukamp_legacy_cracorti" to service_role;
drop policy if exists "Admins read cracorti" on public."dukamp_legacy_cracorti";
create policy "Admins read cracorti" on public."dukamp_legacy_cracorti"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CRADSPTI.DBF: CRADSPTI
create table if not exists public."dukamp_legacy_cradspti" (
  _row_id bigint generated always as identity primary key,
  "nrtit" integer,
  "data" date,
  "histo" varchar(30),
  "valor" numeric(12,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cradspti" enable row level security;
revoke all on public."dukamp_legacy_cradspti" from public, anon;
grant select on public."dukamp_legacy_cradspti" to authenticated;
grant all on public."dukamp_legacy_cradspti" to service_role;
drop policy if exists "Admins read cradspti" on public."dukamp_legacy_cradspti";
create policy "Admins read cradspti" on public."dukamp_legacy_cradspti"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CRALOGTI.DBF: Log de títulos a receber
create table if not exists public."dukamp_legacy_cralogti" (
  _row_id bigint generated always as identity primary key,
  "lnrtit" integer,
  "lclien" integer,
  "lvrtit" numeric(15,2),
  "lcarpa" integer,
  "ljuros" numeric(13,2),
  "ldesco" numeric(15,2),
  "lvecto" date,
  "lopera" varchar(1),
  "ldata" date,
  "lhora" varchar(8),
  "ljurct" numeric(12,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cralogti" enable row level security;
revoke all on public."dukamp_legacy_cralogti" from public, anon;
grant select on public."dukamp_legacy_cralogti" to authenticated;
grant all on public."dukamp_legacy_cralogti" to service_role;
drop policy if exists "Admins read cralogti" on public."dukamp_legacy_cralogti";
create policy "Admins read cralogti" on public."dukamp_legacy_cralogti"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CRASDCAR.DBF: CRASDCAR
create table if not exists public."dukamp_legacy_crasdcar" (
  _row_id bigint generated always as identity primary key,
  "snrcar" integer,
  "santer" numeric(16,2),
  "sbaixa" numeric(15,2),
  "sdesco" numeric(15,2),
  "sestor" numeric(15,2),
  "scance" numeric(15,2),
  "stranr" numeric(15,2),
  "strans" numeric(15,2),
  "sinser" numeric(15,2),
  "satual" numeric(16,2),
  "sdtope" date,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_crasdcar" enable row level security;
revoke all on public."dukamp_legacy_crasdcar" from public, anon;
grant select on public."dukamp_legacy_crasdcar" to authenticated;
grant all on public."dukamp_legacy_crasdcar" to service_role;
drop policy if exists "Admins read crasdcar" on public."dukamp_legacy_crasdcar";
create policy "Admins read crasdcar" on public."dukamp_legacy_crasdcar"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CRATITUL.DBF: Títulos a receber
create table if not exists public."dukamp_legacy_cratitul" (
  _row_id bigint generated always as identity primary key,
  "dnrtit" integer,
  "dclien" integer,
  "demiss" date,
  "dvrtit" numeric(15,2),
  "dvrabe" numeric(15,2),
  "dvecto" date,
  "dcarpa" integer,
  "dcarco" integer,
  "dsubcar" integer,
  "dvesubc" date,
  "dpagto" date,
  "djuros" numeric(13,2),
  "dvende" integer,
  "dtippg" varchar(2),
  "dpago" varchar(1),
  "dnosnro" varchar(15),
  "dflgurv" varchar(1),
  "dagecob" varchar(6),
  "ddscvct" numeric(5,2),
  "dobserv" varchar(15),
  "dtarifa" numeric(10,2),
  "mobserv" text,
  "datcred" date,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_cratitul" enable row level security;
revoke all on public."dukamp_legacy_cratitul" from public, anon;
grant select on public."dukamp_legacy_cratitul" to authenticated;
grant all on public."dukamp_legacy_cratitul" to service_role;
drop policy if exists "Admins read cratitul" on public."dukamp_legacy_cratitul";
create policy "Admins read cratitul" on public."dukamp_legacy_cratitul"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFAAREAP.DBF: EFAAREAP
create table if not exists public."dukamp_legacy_efaareap" (
  _row_id bigint generated always as identity primary key,
  "arcdarea" varchar(6),
  "ardescri" varchar(15),
  "arvenrsp" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efaareap" enable row level security;
revoke all on public."dukamp_legacy_efaareap" from public, anon;
grant select on public."dukamp_legacy_efaareap" to authenticated;
grant all on public."dukamp_legacy_efaareap" to service_role;
drop policy if exists "Admins read efaareap" on public."dukamp_legacy_efaareap";
create policy "Admins read efaareap" on public."dukamp_legacy_efaareap"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFABOLET.DBF: EFABOLET
create table if not exists public."dukamp_legacy_efabolet" (
  _row_id bigint generated always as identity primary key,
  "codigo" integer,
  "data" date,
  "vendedor" integer,
  "cliente" integer,
  "motivo" varchar(60),
  "prodent01" integer,
  "prodent02" integer,
  "prodent03" integer,
  "prodent04" integer,
  "prodent05" integer,
  "prodent06" integer,
  "prodent07" integer,
  "prodent08" integer,
  "prodent09" integer,
  "prodent10" integer,
  "prodent11" integer,
  "prodent12" integer,
  "prodent13" integer,
  "prodent14" integer,
  "qtdent01" numeric(7,2),
  "qtdent02" numeric(7,2),
  "qtdent03" numeric(7,2),
  "qtdent04" numeric(7,2),
  "qtdent05" numeric(7,2),
  "qtdent06" numeric(7,2),
  "qtdent07" numeric(7,2),
  "qtdent08" numeric(7,2),
  "qtdent09" numeric(7,2),
  "qtdent10" numeric(7,2),
  "qtdent11" numeric(7,2),
  "qtdent12" numeric(7,2),
  "qtdent13" numeric(7,2),
  "qtdent14" numeric(7,2),
  "precent01" numeric(18,2),
  "precent02" numeric(18,2),
  "precent03" numeric(18,2),
  "precent04" numeric(18,2),
  "precent05" numeric(18,2),
  "precent06" numeric(18,2),
  "precent07" numeric(18,2),
  "precent08" numeric(18,2),
  "precent09" numeric(18,2),
  "precent10" numeric(18,2),
  "precent11" numeric(18,2),
  "precent12" numeric(18,2),
  "precent13" numeric(18,2),
  "precent14" numeric(18,2),
  "prodsai01" integer,
  "prodsai02" integer,
  "prodsai03" integer,
  "prodsai04" integer,
  "prodsai05" integer,
  "prodsai06" integer,
  "prodsai07" integer,
  "prodsai08" integer,
  "prodsai09" integer,
  "prodsai10" integer,
  "prodsai11" integer,
  "prodsai12" integer,
  "prodsai13" integer,
  "prodsai14" integer,
  "qtdsai01" numeric(7,2),
  "qtdsai02" numeric(7,2),
  "qtdsai03" numeric(7,2),
  "qtdsai04" numeric(7,2),
  "qtdsai05" numeric(7,2),
  "qtdsai06" numeric(7,2),
  "qtdsai07" numeric(7,2),
  "qtdsai08" numeric(7,2),
  "qtdsai09" numeric(7,2),
  "qtdsai10" numeric(7,2),
  "qtdsai11" numeric(7,2),
  "qtdsai12" numeric(7,2),
  "qtdsai13" numeric(7,2),
  "qtdsai14" numeric(7,2),
  "precsai01" numeric(18,2),
  "precsai02" numeric(18,2),
  "precsai03" numeric(18,2),
  "precsai04" numeric(18,2),
  "precsai05" numeric(18,2),
  "precsai06" numeric(18,2),
  "precsai07" numeric(18,2),
  "precsai08" numeric(18,2),
  "precsai09" numeric(18,2),
  "precsai10" numeric(18,2),
  "precsai11" numeric(18,2),
  "precsai12" numeric(18,2),
  "precsai13" numeric(18,2),
  "precsai14" numeric(18,2),
  "nomcli" varchar(40),
  "ajuestq" varchar(1),
  "docori" varchar(20),
  "datori" date,
  "hora" varchar(8),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efabolet" enable row level security;
revoke all on public."dukamp_legacy_efabolet" from public, anon;
grant select on public."dukamp_legacy_efabolet" to authenticated;
grant all on public."dukamp_legacy_efabolet" to service_role;
drop policy if exists "Admins read efabolet" on public."dukamp_legacy_efabolet";
create policy "Admins read efabolet" on public."dukamp_legacy_efabolet"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFACSTRI.DBF: EFACSTRI
create table if not exists public."dukamp_legacy_efacstri" (
  _row_id bigint generated always as identity primary key,
  "cst" varchar(3),
  "nomecst" varchar(30),
  "clastrib" varchar(6),
  "ativo" varchar(1),
  "nomecla" varchar(30),
  "descrcla" varchar(50),
  "predibs" numeric(6,2),
  "predcbs" numeric(6,2),
  "tipoaliq" varchar(15),
  "redutorbc" varchar(5),
  "gibscbs" varchar(1),
  "gibscbsmon" varchar(1),
  "gred" varchar(1),
  "gdif" varchar(1),
  "gtranscred" varchar(1),
  "gcredibszf" varchar(1),
  "gajustecom" varchar(1),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efacstri" enable row level security;
revoke all on public."dukamp_legacy_efacstri" from public, anon;
grant select on public."dukamp_legacy_efacstri" to authenticated;
grant all on public."dukamp_legacy_efacstri" to service_role;
drop policy if exists "Admins read efacstri" on public."dukamp_legacy_efacstri";
create policy "Admins read efacstri" on public."dukamp_legacy_efacstri"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFACTEST.DBF: EFACTEST
create table if not exists public."dukamp_legacy_efactest" (
  _row_id bigint generated always as identity primary key,
  "codpro" integer,
  "codbar" bigint,
  "quacnt" numeric(9,2),
  "datcnt" date,
  "horcnt" varchar(8),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efactest" enable row level security;
revoke all on public."dukamp_legacy_efactest" from public, anon;
grant select on public."dukamp_legacy_efactest" to authenticated;
grant all on public."dukamp_legacy_efactest" to service_role;
drop policy if exists "Admins read efactest" on public."dukamp_legacy_efactest";
create policy "Admins read efactest" on public."dukamp_legacy_efactest"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFACTLOG.DBF: EFACTLOG
create table if not exists public."dukamp_legacy_efactlog" (
  _row_id bigint generated always as identity primary key,
  "codpro" integer,
  "codbar" bigint,
  "quacnt" numeric(9,2),
  "quaest" numeric(9,2),
  "quadif" numeric(10,2),
  "dataju" date,
  "horaju" varchar(8),
  "nomusu" varchar(10),
  "datbas" date,
  "segcnt" varchar(1),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efactlog" enable row level security;
revoke all on public."dukamp_legacy_efactlog" from public, anon;
grant select on public."dukamp_legacy_efactlog" to authenticated;
grant all on public."dukamp_legacy_efactlog" to service_role;
drop policy if exists "Admins read efactlog" on public."dukamp_legacy_efactlog";
create policy "Admins read efactlog" on public."dukamp_legacy_efactlog"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFAGRPRD.DBF: EFAGRPRD
create table if not exists public."dukamp_legacy_efagrprd" (
  _row_id bigint generated always as identity primary key,
  "lncodlin" integer,
  "lndeslin" varchar(35),
  "lncabeca" varchar(1),
  "lngrauln" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efagrprd" enable row level security;
revoke all on public."dukamp_legacy_efagrprd" from public, anon;
grant select on public."dukamp_legacy_efagrprd" to authenticated;
grant all on public."dukamp_legacy_efagrprd" to service_role;
drop policy if exists "Admins read efagrprd" on public."dukamp_legacy_efagrprd";
create policy "Admins read efagrprd" on public."dukamp_legacy_efagrprd"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFAITORC.DBF: EFAITORC
create table if not exists public."dukamp_legacy_efaitorc" (
  _row_id bigint generated always as identity primary key,
  "nroorc" integer,
  "nroite" integer,
  "quapro" numeric(9,2),
  "codpro" integer,
  "preuni" numeric(13,2),
  "perdsc" numeric(5,2),
  "unidad" varchar(2),
  "comple" text,
  "classi" varchar(8),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efaitorc" enable row level security;
revoke all on public."dukamp_legacy_efaitorc" from public, anon;
grant select on public."dukamp_legacy_efaitorc" to authenticated;
grant all on public."dukamp_legacy_efaitorc" to service_role;
drop policy if exists "Admins read efaitorc" on public."dukamp_legacy_efaitorc";
create policy "Admins read efaitorc" on public."dukamp_legacy_efaitorc"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFALOGA2.DBF: EFALOGA2
create table if not exists public."dukamp_legacy_efaloga2" (
  _row_id bigint generated always as identity primary key,
  "dathoj" date,
  "horhoj" varchar(8),
  "documt" varchar(10),
  "qtdpro" numeric(8,2),
  "codpro" integer,
  "tipope" varchar(8),
  "nomusu" varchar(10),
  "saldo" numeric(9,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efaloga2" enable row level security;
revoke all on public."dukamp_legacy_efaloga2" from public, anon;
grant select on public."dukamp_legacy_efaloga2" to authenticated;
grant all on public."dukamp_legacy_efaloga2" to service_role;
drop policy if exists "Admins read efaloga2" on public."dukamp_legacy_efaloga2";
create policy "Admins read efaloga2" on public."dukamp_legacy_efaloga2"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFALOGAL.DBF: EFALOGAL
create table if not exists public."dukamp_legacy_efalogal" (
  _row_id bigint generated always as identity primary key,
  "dathoj" date,
  "horhoj" varchar(8),
  "documt" varchar(10),
  "qtdpro" numeric(10,3),
  "codpro" integer,
  "tipope" varchar(8),
  "nomusu" varchar(10),
  "saldo" numeric(10,3),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efalogal" enable row level security;
revoke all on public."dukamp_legacy_efalogal" from public, anon;
grant select on public."dukamp_legacy_efalogal" to authenticated;
grant all on public."dukamp_legacy_efalogal" to service_role;
drop policy if exists "Admins read efalogal" on public."dukamp_legacy_efalogal";
create policy "Admins read efalogal" on public."dukamp_legacy_efalogal"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- efalogfb.DBF: EFALOGFB
create table if not exists public."dukamp_legacy_efalogfb" (
  _row_id bigint generated always as identity primary key,
  "dathoj" date,
  "horhoj" varchar(8),
  "documt" varchar(10),
  "qtdpro" numeric(10,3),
  "codpro" integer,
  "tipope" varchar(8),
  "nomusu" varchar(10),
  "saldo" numeric(10,3),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efalogfb" enable row level security;
revoke all on public."dukamp_legacy_efalogfb" from public, anon;
grant select on public."dukamp_legacy_efalogfb" to authenticated;
grant all on public."dukamp_legacy_efalogfb" to service_role;
drop policy if exists "Admins read efalogfb" on public."dukamp_legacy_efalogfb";
create policy "Admins read efalogfb" on public."dukamp_legacy_efalogfb"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFALOGP1.DBF: EFALOGP1
create table if not exists public."dukamp_legacy_efalogp1" (
  _row_id bigint generated always as identity primary key,
  "dathoj" date,
  "horhoj" varchar(8),
  "documt" varchar(15),
  "qtdpro" numeric(13,3),
  "codpro" integer,
  "tipope" varchar(8),
  "nomusu" varchar(10),
  "saldo" numeric(13,3),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efalogp1" enable row level security;
revoke all on public."dukamp_legacy_efalogp1" from public, anon;
grant select on public."dukamp_legacy_efalogp1" to authenticated;
grant all on public."dukamp_legacy_efalogp1" to service_role;
drop policy if exists "Admins read efalogp1" on public."dukamp_legacy_efalogp1";
create policy "Admins read efalogp1" on public."dukamp_legacy_efalogp1"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFALOGPR.DBF: Log de produtos
create table if not exists public."dukamp_legacy_efalogpr" (
  _row_id bigint generated always as identity primary key,
  "dathoj" date,
  "horhoj" varchar(8),
  "documt" varchar(15),
  "qtdpro" numeric(13,3),
  "codpro" integer,
  "tipope" varchar(8),
  "nomusu" varchar(10),
  "saldo" numeric(13,3),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efalogpr" enable row level security;
revoke all on public."dukamp_legacy_efalogpr" from public, anon;
grant select on public."dukamp_legacy_efalogpr" to authenticated;
grant all on public."dukamp_legacy_efalogpr" to service_role;
drop policy if exists "Admins read efalogpr" on public."dukamp_legacy_efalogpr";
create policy "Admins read efalogpr" on public."dukamp_legacy_efalogpr"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFAORCAM.DBF: EFAORCAM
create table if not exists public."dukamp_legacy_efaorcam" (
  _row_id bigint generated always as identity primary key,
  "nroorc" integer,
  "codcli" integer,
  "datemi" date,
  "codven" integer,
  "compra" varchar(15),
  "cndpgt" varchar(50),
  "valida" varchar(20),
  "przent" varchar(20),
  "perdsc" numeric(5,2),
  "vlrdsc" numeric(15,2),
  "nomcli" varchar(40),
  "endcli" varchar(40),
  "cidcli" varchar(20),
  "ufecid" varchar(2),
  "foncli" varchar(15),
  "faxcli" varchar(15),
  "obsini" text,
  "restec" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efaorcam" enable row level security;
revoke all on public."dukamp_legacy_efaorcam" from public, anon;
grant select on public."dukamp_legacy_efaorcam" to authenticated;
grant all on public."dukamp_legacy_efaorcam" to service_role;
drop policy if exists "Admins read efaorcam" on public."dukamp_legacy_efaorcam";
create policy "Admins read efaorcam" on public."dukamp_legacy_efaorcam"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFAPRIAT.DBF: EFAPRIAT
create table if not exists public."dukamp_legacy_efapriat" (
  _row_id bigint generated always as identity primary key,
  "prcodigo" integer,
  "prdescri" varchar(25),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efapriat" enable row level security;
revoke all on public."dukamp_legacy_efapriat" from public, anon;
grant select on public."dukamp_legacy_efapriat" to authenticated;
grant all on public."dukamp_legacy_efapriat" to service_role;
drop policy if exists "Admins read efapriat" on public."dukamp_legacy_efapriat";
create policy "Admins read efapriat" on public."dukamp_legacy_efapriat"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFAPRMTB.DBF: EFAPRMTB
create table if not exists public."dukamp_legacy_efaprmtb" (
  _row_id bigint generated always as identity primary key,
  "codpro" integer,
  "lucro1" numeric(6,2),
  "lucro2" numeric(6,2),
  "lucro3" numeric(6,2),
  "lucro4" numeric(6,2),
  "lucro5" numeric(6,2),
  "lucro6" numeric(6,2),
  "comis1" numeric(6,2),
  "comis2" numeric(6,2),
  "comis3" numeric(6,2),
  "comis4" numeric(6,2),
  "comis5" numeric(6,2),
  "comis6" numeric(6,2),
  "marge1" numeric(8,2),
  "marge2" numeric(8,2),
  "marge3" numeric(8,2),
  "marge4" numeric(8,2),
  "marge5" numeric(8,2),
  "marge6" numeric(8,2),
  "extco1" numeric(6,2),
  "extco2" numeric(6,2),
  "extco3" numeric(6,2),
  "extco4" numeric(6,2),
  "extco5" numeric(6,2),
  "extco6" numeric(6,2),
  "extlu1" numeric(6,2),
  "extlu2" numeric(6,2),
  "extlu3" numeric(6,2),
  "extlu4" numeric(6,2),
  "extlu5" numeric(6,2),
  "extlu6" numeric(6,2),
  "extma1" numeric(6,2),
  "extma2" numeric(6,2),
  "extma3" numeric(6,2),
  "extma4" numeric(6,2),
  "extma5" numeric(6,2),
  "extma6" numeric(6,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efaprmtb" enable row level security;
revoke all on public."dukamp_legacy_efaprmtb" from public, anon;
grant select on public."dukamp_legacy_efaprmtb" to authenticated;
grant all on public."dukamp_legacy_efaprmtb" to service_role;
drop policy if exists "Admins read efaprmtb" on public."dukamp_legacy_efaprmtb";
create policy "Admins read efaprmtb" on public."dukamp_legacy_efaprmtb"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFAPRODU.DBF: Produtos
create table if not exists public."dukamp_legacy_efaprodu" (
  _row_id bigint generated always as identity primary key,
  "codpro" integer,
  "nompro" varchar(45),
  "codlin" integer,
  "codfor" integer,
  "unipro" varchar(3),
  "comple" varchar(35),
  "pretab" numeric(15,3),
  "alqicm" integer,
  "ultsai" date,
  "dtcust" date,
  "cusrea" numeric(15,3),
  "ultcus" numeric(15,3),
  "cuscor" numeric(15,3),
  "redicm" numeric(5,2),
  "classi" varchar(15),
  "codtri" integer,
  "salest" numeric(12,3),
  "entr01" numeric(10,2),
  "entr02" numeric(10,2),
  "entr03" numeric(10,2),
  "entr04" numeric(10,2),
  "entr05" numeric(10,2),
  "entr06" numeric(10,2),
  "entr07" numeric(10,2),
  "entr08" numeric(10,2),
  "entr09" numeric(10,2),
  "entr10" numeric(10,2),
  "entr11" numeric(10,2),
  "entr12" numeric(10,2),
  "said01" numeric(10,2),
  "said02" numeric(10,2),
  "said03" numeric(10,2),
  "said04" numeric(10,2),
  "said05" numeric(10,2),
  "said06" numeric(10,2),
  "said07" numeric(10,2),
  "said08" numeric(10,2),
  "said09" numeric(10,2),
  "said10" numeric(10,2),
  "said11" numeric(10,2),
  "said12" numeric(10,2),
  "cndcmp" varchar(10),
  "prcsml" numeric(15,3),
  "mrgvnd" numeric(5,2),
  "acrsbt" numeric(5,2),
  "codfis" integer,
  "estmin" numeric(12,3),
  "valida" varchar(35),
  "prcata" numeric(18,3),
  "przcmp" integer,
  "przvnd" integer,
  "cmsvnd" numeric(5,2),
  "cmsatc" numeric(5,2),
  "vlrfrt" numeric(10,4),
  "icmscm" numeric(5,2),
  "przcom" integer,
  "deprec" numeric(5,2),
  "lucro1" numeric(6,2),
  "lucro2" numeric(6,2),
  "lucro3" numeric(6,2),
  "lucro4" numeric(6,2),
  "lucro5" numeric(6,2),
  "lucro6" numeric(6,2),
  "comis1" numeric(6,2),
  "comis2" numeric(6,2),
  "comis3" numeric(6,2),
  "comis4" numeric(6,2),
  "comis5" numeric(6,2),
  "comis6" numeric(6,2),
  "cusfin" numeric(10,3),
  "marge1" numeric(8,2),
  "marge2" numeric(8,2),
  "marge3" numeric(8,2),
  "marge4" numeric(8,2),
  "marge5" numeric(8,2),
  "marge6" numeric(8,2),
  "doses" integer,
  "tabrep" varchar(1),
  "sugcmp" varchar(1),
  "abcprd" varchar(1),
  "imptab" varchar(1),
  "crgdes" numeric(9,3),
  "refere" varchar(15),
  "peraju" numeric(6,2),
  "dsraju" varchar(55),
  "observ" text,
  "local" varchar(4),
  "venrsp" integer,
  "saldep" numeric(10,3),
  "permin" numeric(6,2),
  "codfis2" integer,
  "codtr2" integer,
  "alqipi" integer,
  "estmax" numeric(12,3),
  "clafis" integer,
  "piscof" varchar(1),
  "cusmed" numeric(12,2),
  "peripi" numeric(5,2),
  "tabfix" varchar(1),
  "ptsite" numeric(9,3),
  "perfin" numeric(5,2),
  "qcmprz" numeric(5,2),
  "qcmprc" numeric(5,2),
  "dsmxpr" numeric(5,2),
  "perprm" numeric(5,2),
  "datprm" date,
  "przvmi" varchar(1),
  "qtdprm" numeric(9,2),
  "cstpis" integer,
  "cdprfo" varchar(20),
  "tipprd" varchar(2),
  "icms4" varchar(1),
  "cuscot" numeric(15,3),
  "datcot" date,
  "obscot" varchar(35),
  "cest" integer,
  "setor" varchar(1),
  "dsmxrv" numeric(5,2),
  "cdtri_nfes" varchar(8),
  "areloj" varchar(6),
  "arealm" varchar(6),
  "peso" numeric(7,3),
  "priati" integer,
  "proweb" varchar(1),
  "saldep2" numeric(9,2),
  "codanp" integer,
  "pagfrt" varchar(1),
  "qtesrp" numeric(9,2),
  "recvet" varchar(1),
  "receit" varchar(1),
  "redagr" varchar(2),
  "extlu1" numeric(6,2),
  "extlu2" numeric(6,2),
  "extco1" numeric(5,2),
  "extco2" numeric(5,2),
  "localm" varchar(12),
  "extma1" numeric(6,2),
  "extma2" numeric(6,2),
  "salfil" numeric(9,2),
  "almfil" numeric(9,2),
  "fabfil" numeric(9,2),
  "aentr01" numeric(10,2),
  "aentr02" numeric(10,2),
  "aentr03" numeric(10,2),
  "aentr04" numeric(10,2),
  "aentr05" numeric(10,2),
  "aentr06" numeric(10,2),
  "aentr07" numeric(10,2),
  "aentr08" numeric(10,2),
  "aentr09" numeric(10,2),
  "aentr10" numeric(10,2),
  "aentr11" numeric(10,2),
  "aentr12" numeric(10,2),
  "asaid01" numeric(10,2),
  "asaid02" numeric(10,2),
  "asaid03" numeric(10,2),
  "asaid04" numeric(10,2),
  "asaid05" numeric(10,2),
  "asaid06" numeric(10,2),
  "asaid07" numeric(10,2),
  "asaid08" numeric(10,2),
  "asaid09" numeric(10,2),
  "asaid10" numeric(10,2),
  "asaid11" numeric(10,2),
  "asaid12" numeric(10,2),
  "salfab" numeric(9,2),
  "autser" varchar(1),
  "datprc" date,
  "flgeta" varchar(1),
  "alterou" varchar(1),
  "extlu3" numeric(6,2),
  "extlu4" numeric(6,2),
  "extma3" numeric(6,2),
  "extma4" numeric(6,2),
  "extco3" numeric(5,2),
  "extco4" numeric(5,2),
  "temser" varchar(1),
  "salfi3" numeric(9,2),
  "almfi3" numeric(9,2),
  "fabfi3" numeric(9,2),
  "clastrib" varchar(6),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efaprodu" enable row level security;
revoke all on public."dukamp_legacy_efaprodu" from public, anon;
grant select on public."dukamp_legacy_efaprodu" to authenticated;
grant all on public."dukamp_legacy_efaprodu" to service_role;
drop policy if exists "Admins read efaprodu" on public."dukamp_legacy_efaprodu";
create policy "Admins read efaprodu" on public."dukamp_legacy_efaprodu"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFATABLG.DBF: EFATABLG
create table if not exists public."dukamp_legacy_efatablg" (
  _row_id bigint generated always as identity primary key,
  "codpro" integer,
  "przvnd" integer,
  "preco1" numeric(9,2),
  "preco2" numeric(9,2),
  "preco3" numeric(9,2),
  "preco4" numeric(9,2),
  "preco5" numeric(9,2),
  "preco6" numeric(9,2),
  "nomusu" varchar(10),
  "data" date,
  "hora" varchar(8),
  "lcusrea" numeric(10,2),
  "lvlrfrt" numeric(10,2),
  "lcrgdes" numeric(9,2),
  "lpermin" numeric(6,2),
  "lprzvmi" varchar(1),
  "lprzcom" integer,
  "ldeprec" numeric(5,2),
  "lcusfin" numeric(10,2),
  "lperaju" numeric(6,2),
  "lcstaju" numeric(10,2),
  "lprcmin" numeric(10,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efatablg" enable row level security;
revoke all on public."dukamp_legacy_efatablg" from public, anon;
grant select on public."dukamp_legacy_efatablg" to authenticated;
grant all on public."dukamp_legacy_efatablg" to service_role;
drop policy if exists "Admins read efatablg" on public."dukamp_legacy_efatablg";
create policy "Admins read efatablg" on public."dukamp_legacy_efatablg"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFATABPR.DBF: EFATABPR
create table if not exists public."dukamp_legacy_efatabpr" (
  _row_id bigint generated always as identity primary key,
  "codpro" integer,
  "przvnd" integer,
  "preco1" numeric(9,2),
  "preco2" numeric(9,2),
  "preco3" numeric(9,2),
  "preco4" numeric(9,2),
  "preco5" numeric(9,2),
  "preco6" numeric(9,2),
  "nomusu" varchar(10),
  "data" date,
  "hora" varchar(8),
  "lcusrea" numeric(10,2),
  "lvlrfrt" numeric(10,2),
  "lcrgdes" numeric(9,2),
  "lpermin" numeric(6,2),
  "lprzvmi" varchar(1),
  "lprzcom" integer,
  "ldeprec" numeric(5,2),
  "lcusfin" numeric(10,2),
  "lperaju" numeric(6,2),
  "lcstaju" numeric(10,2),
  "lprcmin" numeric(10,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efatabpr" enable row level security;
revoke all on public."dukamp_legacy_efatabpr" from public, anon;
grant select on public."dukamp_legacy_efatabpr" to authenticated;
grant all on public."dukamp_legacy_efatabpr" to service_role;
drop policy if exists "Admins read efatabpr" on public."dukamp_legacy_efatabpr";
create policy "Admins read efatabpr" on public."dukamp_legacy_efatabpr"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFATPPRD.DBF: EFATPPRD
create table if not exists public."dukamp_legacy_efatpprd" (
  _row_id bigint generated always as identity primary key,
  "tipprd" varchar(2),
  "descri" varchar(25),
  "blocok" varchar(1),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efatpprd" enable row level security;
revoke all on public."dukamp_legacy_efatpprd" from public, anon;
grant select on public."dukamp_legacy_efatpprd" to authenticated;
grant all on public."dukamp_legacy_efatpprd" to service_role;
drop policy if exists "Admins read efatpprd" on public."dukamp_legacy_efatpprd";
create policy "Admins read efatpprd" on public."dukamp_legacy_efatpprd"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFAUNIDA.DBF: EFAUNIDA
create table if not exists public."dukamp_legacy_efaunida" (
  _row_id bigint generated always as identity primary key,
  "frunidad" varchar(3),
  "frcasdec" integer,
  "frdescri" varchar(15),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efaunida" enable row level security;
revoke all on public."dukamp_legacy_efaunida" from public, anon;
grant select on public."dukamp_legacy_efaunida" to authenticated;
grant all on public."dukamp_legacy_efaunida" to service_role;
drop policy if exists "Admins read efaunida" on public."dukamp_legacy_efaunida";
create policy "Admins read efaunida" on public."dukamp_legacy_efaunida"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- EFAVALID.DBF: EFAVALID
create table if not exists public."dukamp_legacy_efavalid" (
  _row_id bigint generated always as identity primary key,
  "codpro" integer,
  "nronff" varchar(15),
  "datemi" date,
  "datval" date,
  "quanti" numeric(12,2),
  "codfor" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_efavalid" enable row level security;
revoke all on public."dukamp_legacy_efavalid" from public, anon;
grant select on public."dukamp_legacy_efavalid" to authenticated;
grant all on public."dukamp_legacy_efavalid" to service_role;
drop policy if exists "Admins read efavalid" on public."dukamp_legacy_efavalid";
create policy "Admins read efavalid" on public."dukamp_legacy_efavalid"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAALQCM.DBF: FAAALQCM
create table if not exists public."dukamp_legacy_faaalqcm" (
  _row_id bigint generated always as identity primary key,
  "tabela" varchar(5),
  "letcom" varchar(2),
  "perdsc" numeric(5,2),
  "perven" numeric(6,2),
  "persup" numeric(6,2),
  "perger" numeric(6,2),
  "cmttnf" varchar(1),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faaalqcm" enable row level security;
revoke all on public."dukamp_legacy_faaalqcm" from public, anon;
grant select on public."dukamp_legacy_faaalqcm" to authenticated;
grant all on public."dukamp_legacy_faaalqcm" to service_role;
drop policy if exists "Admins read faaalqcm" on public."dukamp_legacy_faaalqcm";
create policy "Admins read faaalqcm" on public."dukamp_legacy_faaalqcm"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAANP.DBF: FAAANP
create table if not exists public."dukamp_legacy_faaanp" (
  _row_id bigint generated always as identity primary key,
  "codanp" varchar(9),
  "descri" varchar(90),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faaanp" enable row level security;
revoke all on public."dukamp_legacy_faaanp" from public, anon;
grant select on public."dukamp_legacy_faaanp" to authenticated;
grant all on public."dukamp_legacy_faaanp" to service_role;
drop policy if exists "Admins read faaanp" on public."dukamp_legacy_faaanp";
create policy "Admins read faaanp" on public."dukamp_legacy_faaanp"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAABARRA.DBF: FAABARRA
create table if not exists public."dukamp_legacy_faabarra" (
  _row_id bigint generated always as identity primary key,
  "brcodpro" integer,
  "brcodbar" bigint,
  "valido_nfe" varchar(1),
  "status" varchar(4),
  "motivo" varchar(40),
  "produto" varchar(60),
  "ncm" varchar(8),
  "cest" varchar(7),
  "data" varchar(25),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faabarra" enable row level security;
revoke all on public."dukamp_legacy_faabarra" from public, anon;
grant select on public."dukamp_legacy_faabarra" to authenticated;
grant all on public."dukamp_legacy_faabarra" to service_role;
drop policy if exists "Admins read faabarra" on public."dukamp_legacy_faabarra";
create policy "Admins read faabarra" on public."dukamp_legacy_faabarra"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- faabolet.dbf: FAABOLET
create table if not exists public."dukamp_legacy_faabolet" (
  _row_id bigint generated always as identity primary key,
  "bnumdupl" integer,
  "bnossonr" varchar(12),
  "bcodclie" integer,
  "bdatvect" date,
  "bvalparc" numeric(10,2),
  "bdathoj" date,
  "bhorhoj" varchar(8),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faabolet" enable row level security;
revoke all on public."dukamp_legacy_faabolet" from public, anon;
grant select on public."dukamp_legacy_faabolet" to authenticated;
grant all on public."dukamp_legacy_faabolet" to service_role;
drop policy if exists "Admins read faabolet" on public."dukamp_legacy_faabolet";
create policy "Admins read faabolet" on public."dukamp_legacy_faabolet"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAABSICM.DBF: FAABSICM
create table if not exists public."dukamp_legacy_faabsicm" (
  _row_id bigint generated always as identity primary key,
  "nnronota" integer,
  "nbscicms" numeric(14,2),
  "nalqicms" integer,
  "nvlricms" numeric(12,2),
  "nvlrcont" numeric(14,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faabsicm" enable row level security;
revoke all on public."dukamp_legacy_faabsicm" from public, anon;
grant select on public."dukamp_legacy_faabsicm" to authenticated;
grant all on public."dukamp_legacy_faabsicm" to service_role;
drop policy if exists "Admins read faabsicm" on public."dukamp_legacy_faabsicm";
create policy "Admins read faabsicm" on public."dukamp_legacy_faabsicm"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- faabsipv.DBF: FAABSIPV
create table if not exists public."dukamp_legacy_faabsipv" (
  _row_id bigint generated always as identity primary key,
  "nnronota" integer,
  "nbscicms" numeric(14,2),
  "nalqicms" integer,
  "nvlricms" numeric(12,2),
  "nvlrcont" numeric(14,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faabsipv" enable row level security;
revoke all on public."dukamp_legacy_faabsipv" from public, anon;
grant select on public."dukamp_legacy_faabsipv" to authenticated;
grant all on public."dukamp_legacy_faabsipv" to service_role;
drop policy if exists "Admins read faabsipv" on public."dukamp_legacy_faabsipv";
create policy "Admins read faabsipv" on public."dukamp_legacy_faabsipv"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAACEP.DBF: Cadastro nacional de CEPs
create table if not exists public."dukamp_legacy_faacep" (
  _row_id bigint generated always as identity primary key,
  "cep" varchar(8),
  "end" varchar(50),
  "lado" varchar(25),
  "obs" varchar(25),
  "bairro" varchar(25),
  "cidade" varchar(25),
  "codibge" varchar(7),
  "uf" varchar(2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faacep" enable row level security;
revoke all on public."dukamp_legacy_faacep" from public, anon;
grant select on public."dukamp_legacy_faacep" to authenticated;
grant all on public."dukamp_legacy_faacep" to service_role;
drop policy if exists "Admins read faacep" on public."dukamp_legacy_faacep";
create policy "Admins read faacep" on public."dukamp_legacy_faacep"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAACFOP.DBF: FAACFOP
create table if not exists public."dukamp_legacy_faacfop" (
  _row_id bigint generated always as identity primary key,
  "cfop" integer,
  "descri" varchar(200),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faacfop" enable row level security;
revoke all on public."dukamp_legacy_faacfop" from public, anon;
grant select on public."dukamp_legacy_faacfop" to authenticated;
grant all on public."dukamp_legacy_faacfop" to service_role;
drop policy if exists "Admins read faacfop" on public."dukamp_legacy_faacfop";
create policy "Admins read faacfop" on public."dukamp_legacy_faacfop"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAACIDAD.DBF: Cidades
create table if not exists public."dukamp_legacy_faacidad" (
  _row_id bigint generated always as identity primary key,
  "cdcodi" integer,
  "cdnome" varchar(20),
  "cduf" varchar(2),
  "cdcep" integer,
  "cdddd" integer,
  "cdbco1" integer,
  "cdbco2" integer,
  "cdbco3" integer,
  "cdbco4" integer,
  "cdbco5" integer,
  "cdbco6" integer,
  "cdbco7" integer,
  "cdbco8" integer,
  "cdbco9" integer,
  "cdbco10" integer,
  "cdrep" integer,
  "cdmuncd" integer,
  "cdregia" varchar(6),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faacidad" enable row level security;
revoke all on public."dukamp_legacy_faacidad" from public, anon;
grant select on public."dukamp_legacy_faacidad" to authenticated;
grant all on public."dukamp_legacy_faacidad" to service_role;
drop policy if exists "Admins read faacidad" on public."dukamp_legacy_faacidad";
create policy "Admins read faacidad" on public."dukamp_legacy_faacidad"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAACLIEN.DBF: Clientes
create table if not exists public."dukamp_legacy_faaclien" (
  _row_id bigint generated always as identity primary key,
  "ccod" integer,
  "cnome" varchar(40),
  "cend" varchar(40),
  "ccid" integer,
  "cbair" varchar(20),
  "ccep" integer,
  "cfone" integer,
  "ctelex" bigint,
  "ccgc" varchar(14),
  "cinsc" varchar(16),
  "cendp" varchar(40),
  "ccidp" integer,
  "cbaip" varchar(20),
  "ccepp" integer,
  "clicre" varchar(1),
  "cconce" integer,
  "ccobra" integer,
  "cdtcad" date,
  "ccodrep" integer,
  "cttpago" bigint,
  "cttdias" bigint,
  "cmedatr" numeric(7,2),
  "cmaiatr" integer,
  "cdtutcp" date,
  "cvrutcp" integer,
  "cdtmacp" date,
  "cvrmacp" integer,
  "ccpames" integer,
  "ccpaatu" integer,
  "ccpaant" integer,
  "cendent" varchar(45),
  "ccodsuf" bigint,
  "cobserv" text,
  "cfisjur" integer,
  "cfonp" integer,
  "ctipcli" varchar(3),
  "cabccli" varchar(1),
  "ccontat" varchar(15),
  "cgrucli" integer,
  "codant" integer,
  "cetique" varchar(1),
  "obsrot" text,
  "obstel" text,
  "telfon" varchar(40),
  "teldtc" date,
  "telcnt" varchar(30),
  "cemail" varchar(60),
  "ccel" integer,
  "emailnfe" varchar(60),
  "dtulcon" date,
  "crg" varchar(15),
  "socgrau" varchar(30),
  "socnome" varchar(60),
  "socende" varchar(60),
  "socfone" varchar(30),
  "trablocal" varchar(60),
  "trabend" varchar(60),
  "trabfone" varchar(30),
  "comemp" varchar(60),
  "comfone" varchar(30),
  "comdtcd" date,
  "comdtul" date,
  "comvlul" numeric(12,2),
  "comdtma" date,
  "comvlma" numeric(12,2),
  "comconpg" varchar(60),
  "altvend" varchar(1),
  "cnum" varchar(6),
  "cnump" varchar(6),
  "cnomfan" varchar(15),
  "cdddte1" integer,
  "cdddte2" integer,
  "cdddtep" integer,
  "cdddcel" integer,
  "tabcli" varchar(3),
  "cgruecon" integer,
  "emailbol" varchar(60),
  "gedave" varchar(1),
  "obsgedave" varchar(15),
  "taxabol" varchar(1),
  "clissp" varchar(1),
  "cins_muni" integer,
  "protescli" varchar(1),
  "alterou" varchar(1),
  "saldoad" numeric(12,2),
  "pedcomp" varchar(1),
  "cpfprodu" bigint,
  "retirf" varchar(1),
  "vccgc" varchar(14),
  "danfesimpl" varchar(1),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faaclien" enable row level security;
revoke all on public."dukamp_legacy_faaclien" from public, anon;
grant select on public."dukamp_legacy_faaclien" to authenticated;
grant all on public."dukamp_legacy_faaclien" to service_role;
drop policy if exists "Admins read faaclien" on public."dukamp_legacy_faaclien";
create policy "Admins read faaclien" on public."dukamp_legacy_faaclien"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAACODTR.DBF: FAACODTR
create table if not exists public."dukamp_legacy_faacodtr" (
  _row_id bigint generated always as identity primary key,
  "codtri" integer,
  "substi" varchar(1),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faacodtr" enable row level security;
revoke all on public."dukamp_legacy_faacodtr" from public, anon;
grant select on public."dukamp_legacy_faacodtr" to authenticated;
grant all on public."dukamp_legacy_faacodtr" to service_role;
drop policy if exists "Admins read faacodtr" on public."dukamp_legacy_faacodtr";
create policy "Admins read faacodtr" on public."dukamp_legacy_faacodtr"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAACOMIS.DBF: Comissões
create table if not exists public."dukamp_legacy_faacomis" (
  _row_id bigint generated always as identity primary key,
  "covende" integer,
  "conrnot" integer,
  "conrped" integer,
  "coclien" integer,
  "codatan" date,
  "covlnot" numeric(15,2),
  "covlcom" numeric(14,2),
  "coobser" varchar(40),
  "coperco" numeric(5,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faacomis" enable row level security;
revoke all on public."dukamp_legacy_faacomis" from public, anon;
grant select on public."dukamp_legacy_faacomis" to authenticated;
grant all on public."dukamp_legacy_faacomis" to service_role;
drop policy if exists "Admins read faacomis" on public."dukamp_legacy_faacomis";
create policy "Admins read faacomis" on public."dukamp_legacy_faacomis"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- faacompv.DBF: Comissões de pré-venda
create table if not exists public."dukamp_legacy_faacompv" (
  _row_id bigint generated always as identity primary key,
  "covende" integer,
  "conrnot" integer,
  "conrped" integer,
  "coclien" integer,
  "codatan" date,
  "covlnot" numeric(15,2),
  "covlcom" numeric(14,2),
  "coobser" varchar(40),
  "coperco" numeric(5,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faacompv" enable row level security;
revoke all on public."dukamp_legacy_faacompv" from public, anon;
grant select on public."dukamp_legacy_faacompv" to authenticated;
grant all on public."dukamp_legacy_faacompv" to service_role;
drop policy if exists "Admins read faacompv" on public."dukamp_legacy_faacompv";
create policy "Admins read faacompv" on public."dukamp_legacy_faacompv"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAACOMTI.DBF: Comissões por título
create table if not exists public."dukamp_legacy_faacomti" (
  _row_id bigint generated always as identity primary key,
  "covende" integer,
  "conrtit" integer,
  "coclien" integer,
  "codatan" date,
  "covlnot" numeric(15,2),
  "covlcom" numeric(14,2),
  "coobser" varchar(40),
  "coperco" numeric(5,2),
  "codtvct" date,
  "codtemi" date,
  "cotipvd" integer,
  "covltit" numeric(12,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faacomti" enable row level security;
revoke all on public."dukamp_legacy_faacomti" from public, anon;
grant select on public."dukamp_legacy_faacomti" to authenticated;
grant all on public."dukamp_legacy_faacomti" to service_role;
drop policy if exists "Admins read faacomti" on public."dukamp_legacy_faacomti";
create policy "Admins read faacomti" on public."dukamp_legacy_faacomti"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAACOMTP.DBF: Comissões por pedido
create table if not exists public."dukamp_legacy_faacomtp" (
  _row_id bigint generated always as identity primary key,
  "covende" integer,
  "conrtit" integer,
  "coclien" integer,
  "codatan" date,
  "covlnot" numeric(15,2),
  "covlcom" numeric(14,2),
  "coobser" varchar(40),
  "coperco" numeric(5,2),
  "codtvct" date,
  "codtemi" date,
  "cotipvd" integer,
  "covltit" numeric(15,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faacomtp" enable row level security;
revoke all on public."dukamp_legacy_faacomtp" from public, anon;
grant select on public."dukamp_legacy_faacomtp" to authenticated;
grant all on public."dukamp_legacy_faacomtp" to service_role;
drop policy if exists "Admins read faacomtp" on public."dukamp_legacy_faacomtp";
create policy "Admins read faacomtp" on public."dukamp_legacy_faacomtp"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAACONCL.DBF: FAACONCL
create table if not exists public."dukamp_legacy_faaconcl" (
  _row_id bigint generated always as identity primary key,
  "cccodigo" integer,
  "ccdescri" varchar(40),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faaconcl" enable row level security;
revoke all on public."dukamp_legacy_faaconcl" from public, anon;
grant select on public."dukamp_legacy_faaconcl" to authenticated;
grant all on public."dukamp_legacy_faaconcl" to service_role;
drop policy if exists "Admins read faaconcl" on public."dukamp_legacy_faaconcl";
create policy "Admins read faaconcl" on public."dukamp_legacy_faaconcl"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAADESCO.DBF: FAADESCO
create table if not exists public."dukamp_legacy_faadesco" (
  _row_id bigint generated always as identity primary key,
  "devende" integer,
  "dedescr" varchar(40),
  "devalor" numeric(15,2),
  "detipod" integer,
  "dedtdes" date,
  "dedevol" numeric(12,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faadesco" enable row level security;
revoke all on public."dukamp_legacy_faadesco" from public, anon;
grant select on public."dukamp_legacy_faadesco" to authenticated;
grant all on public."dukamp_legacy_faadesco" to service_role;
drop policy if exists "Admins read faadesco" on public."dukamp_legacy_faadesco";
create policy "Admins read faadesco" on public."dukamp_legacy_faadesco"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAADOLAR.DBF: FAADOLAR
create table if not exists public."dukamp_legacy_faadolar" (
  _row_id bigint generated always as identity primary key,
  "ddata" date,
  "dvalor" numeric(12,2),
  "dvalurv" numeric(12,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faadolar" enable row level security;
revoke all on public."dukamp_legacy_faadolar" from public, anon;
grant select on public."dukamp_legacy_faadolar" to authenticated;
grant all on public."dukamp_legacy_faadolar" to service_role;
drop policy if exists "Admins read faadolar" on public."dukamp_legacy_faadolar";
create policy "Admins read faadolar" on public."dukamp_legacy_faadolar"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAADSCTI.DBF: FAADSCTI
create table if not exists public."dukamp_legacy_faadscti" (
  _row_id bigint generated always as identity primary key,
  "devende" integer,
  "dedescr" varchar(40),
  "devalor" numeric(15,2),
  "detipod" integer,
  "dedtdes" date,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faadscti" enable row level security;
revoke all on public."dukamp_legacy_faadscti" from public, anon;
grant select on public."dukamp_legacy_faadscti" to authenticated;
grant all on public."dukamp_legacy_faadscti" to service_role;
drop policy if exists "Admins read faadscti" on public."dukamp_legacy_faadscti";
create policy "Admins read faadscti" on public."dukamp_legacy_faadscti"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAADSCTP.DBF: FAADSCTP
create table if not exists public."dukamp_legacy_faadsctp" (
  _row_id bigint generated always as identity primary key,
  "devende" integer,
  "dedescr" varchar(40),
  "devalor" numeric(15,2),
  "detipod" integer,
  "dedtdes" date,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faadsctp" enable row level security;
revoke all on public."dukamp_legacy_faadsctp" from public, anon;
grant select on public."dukamp_legacy_faadsctp" to authenticated;
grant all on public."dukamp_legacy_faadsctp" to service_role;
drop policy if exists "Admins read faadsctp" on public."dukamp_legacy_faadsctp";
create policy "Admins read faadsctp" on public."dukamp_legacy_faadsctp"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAADSVLR.DBF: FAADSVLR
create table if not exists public."dukamp_legacy_faadsvlr" (
  _row_id bigint generated always as identity primary key,
  "devende" integer,
  "dedescr" varchar(40),
  "devalor" numeric(15,2),
  "detipod" integer,
  "dedtdes" date,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faadsvlr" enable row level security;
revoke all on public."dukamp_legacy_faadsvlr" from public, anon;
grant select on public."dukamp_legacy_faadsvlr" to authenticated;
grant all on public."dukamp_legacy_faadsvlr" to service_role;
drop policy if exists "Admins read faadsvlr" on public."dukamp_legacy_faadsvlr";
create policy "Admins read faadsvlr" on public."dukamp_legacy_faadsvlr"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAENTFO.DBF: FAAENTFO
create table if not exists public."dukamp_legacy_faaentfo" (
  _row_id bigint generated always as identity primary key,
  "ncodform" integer,
  "ndescri" varchar(15),
  "nentregu" varchar(1),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faaentfo" enable row level security;
revoke all on public."dukamp_legacy_faaentfo" from public, anon;
grant select on public."dukamp_legacy_faaentfo" to authenticated;
grant all on public."dukamp_legacy_faaentfo" to service_role;
drop policy if exists "Admins read faaentfo" on public."dukamp_legacy_faaentfo";
create policy "Admins read faaentfo" on public."dukamp_legacy_faaentfo"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAENTIT.DBF: Movimentações de estoque
create table if not exists public."dukamp_legacy_faaentit" (
  _row_id bigint generated always as identity primary key,
  "nnumpedi" integer,
  "nnrorcar" integer,
  "nseqentr" integer,
  "ndatconf" date,
  "nhorconf" varchar(17),
  "ncodprod" integer,
  "nqtdconf" numeric(10,3),
  "ndesprod" varchar(45),
  "ncusfina" numeric(10,2),
  "nunidade" varchar(3),
  "nnropedi" integer,
  "nitepedi" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faaentit" enable row level security;
revoke all on public."dukamp_legacy_faaentit" from public, anon;
grant select on public."dukamp_legacy_faaentit" to authenticated;
grant all on public."dukamp_legacy_faaentit" to service_role;
drop policy if exists "Admins read faaentit" on public."dukamp_legacy_faaentit";
create policy "Admins read faaentit" on public."dukamp_legacy_faaentit"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAENTRE.DBF: FAAENTRE
create table if not exists public."dukamp_legacy_faaentre" (
  _row_id bigint generated always as identity primary key,
  "ecod" integer,
  "eend" varchar(40),
  "ecid" varchar(20),
  "euf" varchar(2),
  "ebair" varchar(20),
  "eddd" integer,
  "efone" integer,
  "edatult" date,
  "eptoref" varchar(55),
  "eseq" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faaentre" enable row level security;
revoke all on public."dukamp_legacy_faaentre" from public, anon;
grant select on public."dukamp_legacy_faaentre" to authenticated;
grant all on public."dukamp_legacy_faaentre" to service_role;
drop policy if exists "Admins read faaentre" on public."dukamp_legacy_faaentre";
create policy "Admins read faaentre" on public."dukamp_legacy_faaentre"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAENTSQ.DBF: Saldos de estoque
create table if not exists public."dukamp_legacy_faaentsq" (
  _row_id bigint generated always as identity primary key,
  "nnumpedi" integer,
  "nnrorcar" integer,
  "nseqentr" integer,
  "ncodform" integer,
  "obstranp" varchar(30),
  "ndatentr" date,
  "nhorentr" varchar(15),
  "ndatretr" date,
  "nhorretr" varchar(15),
  "ncodclie" integer,
  "nnomclie" varchar(40),
  "nendclie" varchar(40),
  "ncidclie" varchar(20),
  "nufeclie" varchar(2),
  "nobserv1" varchar(41),
  "nobserv2" varchar(41),
  "ncodvend" integer,
  "ntotorca" numeric(12,2),
  "nusuario" varchar(30),
  "nnropedi" integer,
  "nfornece" varchar(15),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faaentsq" enable row level security;
revoke all on public."dukamp_legacy_faaentsq" from public, anon;
grant select on public."dukamp_legacy_faaentsq" to authenticated;
grant all on public."dukamp_legacy_faaentsq" to service_role;
drop policy if exists "Admins read faaentsq" on public."dukamp_legacy_faaentsq";
create policy "Admins read faaentsq" on public."dukamp_legacy_faaentsq"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAFRET2.DBF: FAAFRET2
create table if not exists public."dukamp_legacy_faafret2" (
  _row_id bigint generated always as identity primary key,
  "ftmargem" numeric(6,2),
  "ftpercen" numeric(5,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faafret2" enable row level security;
revoke all on public."dukamp_legacy_faafret2" from public, anon;
grant select on public."dukamp_legacy_faafret2" to authenticated;
grant all on public."dukamp_legacy_faafret2" to service_role;
drop policy if exists "Admins read faafret2" on public."dukamp_legacy_faafret2";
create policy "Admins read faafret2" on public."dukamp_legacy_faafret2"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAFRETE.DBF: FAAFRETE
create table if not exists public."dukamp_legacy_faafrete" (
  _row_id bigint generated always as identity primary key,
  "frestado" varchar(2),
  "fralqicm" integer,
  "fralqdes" numeric(5,2),
  "fralqfdp" numeric(5,2),
  "frinscst" varchar(16),
  "frdifalden" varchar(1),
  "pibsuf" numeric(8,4),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faafrete" enable row level security;
revoke all on public."dukamp_legacy_faafrete" from public, anon;
grant select on public."dukamp_legacy_faafrete" to authenticated;
grant all on public."dukamp_legacy_faafrete" to service_role;
drop policy if exists "Admins read faafrete" on public."dukamp_legacy_faafrete";
create policy "Admins read faafrete" on public."dukamp_legacy_faafrete"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAGRUCL.DBF: FAAGRUCL
create table if not exists public."dukamp_legacy_faagrucl" (
  _row_id bigint generated always as identity primary key,
  "lncodlin" integer,
  "lndeslin" varchar(25),
  "lncabeca" varchar(1),
  "lngrauln" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faagrucl" enable row level security;
revoke all on public."dukamp_legacy_faagrucl" from public, anon;
grant select on public."dukamp_legacy_faagrucl" to authenticated;
grant all on public."dukamp_legacy_faagrucl" to service_role;
drop policy if exists "Admins read faagrucl" on public."dukamp_legacy_faagrucl";
create policy "Admins read faagrucl" on public."dukamp_legacy_faagrucl"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAIBGE.DBF: Códigos IBGE
create table if not exists public."dukamp_legacy_faaibge" (
  _row_id bigint generated always as identity primary key,
  "uf" varchar(2),
  "codigo" varchar(5),
  "cidade" varchar(35),
  "uf2" varchar(2),
  "pibsmu" numeric(8,4),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faaibge" enable row level security;
revoke all on public."dukamp_legacy_faaibge" from public, anon;
grant select on public."dukamp_legacy_faaibge" to authenticated;
grant all on public."dukamp_legacy_faaibge" to service_role;
drop policy if exists "Admins read faaibge" on public."dukamp_legacy_faaibge";
create policy "Admins read faaibge" on public."dukamp_legacy_faaibge"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAITMAO.DBF: FAAITMAO
create table if not exists public."dukamp_legacy_faaitmao" (
  _row_id bigint generated always as identity primary key,
  "nnronota" integer,
  "nitenota" integer,
  "codser" integer,
  "preuni" numeric(13,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faaitmao" enable row level security;
revoke all on public."dukamp_legacy_faaitmao" from public, anon;
grant select on public."dukamp_legacy_faaitmao" to authenticated;
grant all on public."dukamp_legacy_faaitmao" to service_role;
drop policy if exists "Admins read faaitmao" on public."dukamp_legacy_faaitmao";
create policy "Admins read faaitmao" on public."dukamp_legacy_faaitmao"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAJUNVC.DBF: FAAJUNVC
create table if not exists public."dukamp_legacy_faajunvc" (
  _row_id bigint generated always as identity primary key,
  "vdatemis" date,
  "vcodclie" integer,
  "vdatvect" date,
  "vvalparc" numeric(15,2),
  "vcodcart" integer,
  "vnumdupl" integer,
  "vnumnot1" integer,
  "vnumnot2" integer,
  "vnumnot3" integer,
  "vnumnot4" integer,
  "vnumnot5" integer,
  "vnumnot6" integer,
  "vnumnot7" integer,
  "vnumnot8" integer,
  "vnumnot9" integer,
  "vvalnot1" numeric(12,2),
  "vvalnot2" numeric(12,2),
  "vvalnot3" numeric(12,2),
  "vvalnot4" numeric(12,2),
  "vvalnot5" numeric(12,2),
  "vvalnot6" numeric(12,2),
  "vvalnot7" numeric(12,2),
  "vvalnot8" numeric(12,2),
  "vvalnot9" numeric(12,2),
  "vconpgt1" integer,
  "vconpgt2" integer,
  "vconpgt3" integer,
  "vconpgt4" integer,
  "vconpgt5" integer,
  "vconpgt6" integer,
  "vconpgt7" integer,
  "vconpgt8" integer,
  "vconpgt9" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faajunvc" enable row level security;
revoke all on public."dukamp_legacy_faajunvc" from public, anon;
grant select on public."dukamp_legacy_faajunvc" to authenticated;
grant all on public."dukamp_legacy_faajunvc" to service_role;
drop policy if exists "Admins read faajunvc" on public."dukamp_legacy_faajunvc";
create policy "Admins read faajunvc" on public."dukamp_legacy_faajunvc"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAALIMIT.DBF: FAALIMIT
create table if not exists public."dukamp_legacy_faalimit" (
  _row_id bigint generated always as identity primary key,
  "lcodigo" varchar(1),
  "lvalor" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faalimit" enable row level security;
revoke all on public."dukamp_legacy_faalimit" from public, anon;
grant select on public."dukamp_legacy_faalimit" to authenticated;
grant all on public."dukamp_legacy_faalimit" to service_role;
drop policy if exists "Admins read faalimit" on public."dukamp_legacy_faalimit";
create policy "Admins read faalimit" on public."dukamp_legacy_faalimit"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAMETAS.DBF: FAAMETAS
create table if not exists public."dukamp_legacy_faametas" (
  _row_id bigint generated always as identity primary key,
  "codven" integer,
  "datval" date,
  "datfim" date,
  "codpro" integer,
  "meta" integer,
  "premio" numeric(13,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faametas" enable row level security;
revoke all on public."dukamp_legacy_faametas" from public, anon;
grant select on public."dukamp_legacy_faametas" to authenticated;
grant all on public."dukamp_legacy_faametas" to service_role;
drop policy if exists "Admins read faametas" on public."dukamp_legacy_faametas";
create policy "Admins read faametas" on public."dukamp_legacy_faametas"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAMETAV.DBF: FAAMETAV
create table if not exists public."dukamp_legacy_faametav" (
  _row_id bigint generated always as identity primary key,
  "codven" integer,
  "datval" date,
  "vlrmeta" numeric(12,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faametav" enable row level security;
revoke all on public."dukamp_legacy_faametav" from public, anon;
grant select on public."dukamp_legacy_faametav" to authenticated;
grant all on public."dukamp_legacy_faametav" to service_role;
drop policy if exists "Admins read faametav" on public."dukamp_legacy_faametav";
create policy "Admins read faametav" on public."dukamp_legacy_faametav"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAMIXIT.DBF: FAAMIXIT
create table if not exists public."dukamp_legacy_faamixit" (
  _row_id bigint generated always as identity primary key,
  "codmix" integer,
  "codpro" integer,
  "qtdpro" numeric(9,3),
  "valor" numeric(10,3),
  "nompro" varchar(30),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faamixit" enable row level security;
revoke all on public."dukamp_legacy_faamixit" from public, anon;
grant select on public."dukamp_legacy_faamixit" to authenticated;
grant all on public."dukamp_legacy_faamixit" to service_role;
drop policy if exists "Admins read faamixit" on public."dukamp_legacy_faamixit";
create policy "Admins read faamixit" on public."dukamp_legacy_faamixit"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAMIXPR.DBF: FAAMIXPR
create table if not exists public."dukamp_legacy_faamixpr" (
  _row_id bigint generated always as identity primary key,
  "codmix" integer,
  "datemi" date,
  "codven" integer,
  "codcli" integer,
  "cndpgt" varchar(30),
  "nomcom" varchar(40),
  "observ" varchar(60),
  "nomcli" varchar(40),
  "endcli" varchar(40),
  "cidcli" varchar(20),
  "estcli" varchar(2),
  "cgccli" varchar(14),
  "insccli" varchar(16),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faamixpr" enable row level security;
revoke all on public."dukamp_legacy_faamixpr" from public, anon;
grant select on public."dukamp_legacy_faamixpr" to authenticated;
grant all on public."dukamp_legacy_faamixpr" to service_role;
drop policy if exists "Admins read faamixpr" on public."dukamp_legacy_faamixpr";
create policy "Admins read faamixpr" on public."dukamp_legacy_faamixpr"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAMVFRE.DBF: FAAMVFRE
create table if not exists public."dukamp_legacy_faamvfre" (
  _row_id bigint generated always as identity primary key,
  "fnumnot" integer,
  "fcodtra" integer,
  "fdatemi" date,
  "fvlrnot" numeric(12,2),
  "fvlfnot" numeric(12,2),
  "fcodcli" integer,
  "fvlrfre" numeric(12,2),
  "fpesbru" numeric(10,3),
  "fqtdvol" integer,
  "fobserv" varchar(50),
  "fnrocnh" varchar(15),
  "fdatcnh" date,
  "finfpgt" varchar(50),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faamvfre" enable row level security;
revoke all on public."dukamp_legacy_faamvfre" from public, anon;
grant select on public."dukamp_legacy_faamvfre" to authenticated;
grant all on public."dukamp_legacy_faamvfre" to service_role;
drop policy if exists "Admins read faamvfre" on public."dukamp_legacy_faamvfre";
create policy "Admins read faamvfre" on public."dukamp_legacy_faamvfre"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAANAOBL.DBF: FAANAOBL
create table if not exists public."dukamp_legacy_faanaobl" (
  _row_id bigint generated always as identity primary key,
  "codcli" integer,
  "cpf_cnpj" varchar(14),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faanaobl" enable row level security;
revoke all on public."dukamp_legacy_faanaobl" from public, anon;
grant select on public."dukamp_legacy_faanaobl" to authenticated;
grant all on public."dukamp_legacy_faanaobl" to service_role;
drop policy if exists "Admins read faanaobl" on public."dukamp_legacy_faanaobl";
create policy "Admins read faanaobl" on public."dukamp_legacy_faanaobl"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAANATOP.DBF: FAANATOP
create table if not exists public."dukamp_legacy_faanatop" (
  _row_id bigint generated always as identity primary key,
  "codoper" varchar(4),
  "tipooper" varchar(1),
  "nomeoper" varchar(26),
  "fundope1" varchar(80),
  "fundope2" varchar(80),
  "aliqoper" integer,
  "flagoper" varchar(1),
  "percredu" numeric(5,2),
  "codcontb" integer,
  "entrsaid" varchar(1),
  "saidestq" varchar(1),
  "entrestq" varchar(1),
  "cmploper" integer,
  "novocfop" varchar(4),
  "per_pis" numeric(5,2),
  "per_cof" numeric(5,2),
  "cste_pis" integer,
  "csts_pis" integer,
  "cste_cof" integer,
  "csts_cof" integer,
  "clastrib" varchar(6),
  "clasfixa" varchar(1),
  "cbenef" varchar(8),
  "tiponfe" varchar(1),
  "tpcredeb" varchar(2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faanatop" enable row level security;
revoke all on public."dukamp_legacy_faanatop" from public, anon;
grant select on public."dukamp_legacy_faanatop" to authenticated;
grant all on public."dukamp_legacy_faanatop" to service_role;
drop policy if exists "Admins read faanatop" on public."dukamp_legacy_faanatop";
create policy "Admins read faanatop" on public."dukamp_legacy_faanatop"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAANCM.DBF: NCM
create table if not exists public."dukamp_legacy_faancm" (
  _row_id bigint generated always as identity primary key,
  "ncm" integer,
  "descri" varchar(100),
  "clastrib1" varchar(6),
  "clastrib2" varchar(6),
  "clastrib3" varchar(6),
  "clastrib4" varchar(6),
  "lei1" varchar(80),
  "lei2" varchar(80),
  "lei3" varchar(80),
  "lei4" varchar(80),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faancm" enable row level security;
revoke all on public."dukamp_legacy_faancm" from public, anon;
grant select on public."dukamp_legacy_faancm" to authenticated;
grant all on public."dukamp_legacy_faancm" to service_role;
drop policy if exists "Admins read faancm" on public."dukamp_legacy_faancm";
create policy "Admins read faancm" on public."dukamp_legacy_faancm"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAANFE.DBF: FAANFE
create table if not exists public."dukamp_legacy_faanfe" (
  _row_id bigint generated always as identity primary key,
  "cpj_emi" varchar(14),
  "ins_emi" varchar(14),
  "emp_emi" varchar(60),
  "nom_fan" varchar(60),
  "end_emi" varchar(60),
  "nro_emi" varchar(60),
  "cmp_emi" varchar(60),
  "bai_emi" varchar(60),
  "cid_emi" varchar(60),
  "ufe_emi" varchar(2),
  "cep_emi" integer,
  "fon_emi" varchar(10),
  "ser_nfe" varchar(3),
  "mun_emi" varchar(7),
  "mod_nfe" varchar(2),
  "prd_hom" varchar(1),
  "lay_txt" varchar(1),
  "email" varchar(60),
  "dir_nfe" varchar(11),
  "versao" varchar(2),
  "imu_emi" varchar(10),
  "cnae_emi" varchar(7),
  "regtri_emi" varchar(1),
  "form_env" varchar(1),
  "hrverao" varchar(1),
  "dir_sat" varchar(21),
  "sat_signac" varchar(344),
  "sat_cnpjac" varchar(14),
  "sat_prdhom" varchar(1),
  "sat_versao" varchar(4),
  "nfce" varchar(1),
  "nfce_dir" varchar(20),
  "nfce_versa" varchar(2),
  "nfce_prdho" varchar(1),
  "nfce_serie" varchar(3),
  "nfce_mod" varchar(2),
  "nfce_foren" varchar(1),
  "nfce_layou" varchar(1),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faanfe" enable row level security;
revoke all on public."dukamp_legacy_faanfe" from public, anon;
grant select on public."dukamp_legacy_faanfe" to authenticated;
grant all on public."dukamp_legacy_faanfe" to service_role;
drop policy if exists "Admins read faanfe" on public."dukamp_legacy_faanfe";
create policy "Admins read faanfe" on public."dukamp_legacy_faanfe"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAANITPV.DBF: Itens das pré-vendas
create table if not exists public."dukamp_legacy_faanitpv" (
  _row_id bigint generated always as identity primary key,
  "nnronota" integer,
  "nitenota" integer,
  "ncodprod" integer,
  "nqtdprod" numeric(10,3),
  "nvrunliq" numeric(15,3),
  "nnropedi" integer,
  "ndesprod" varchar(45),
  "nitepedi" integer,
  "nalqicms" numeric(5,2),
  "nvlrtabe" numeric(15,3),
  "nvlricms" numeric(13,2),
  "nbscicms" numeric(15,2),
  "nbsccomi" numeric(12,2),
  "npercomi" numeric(5,2),
  "nvlrcomi" numeric(10,2),
  "ncusfina" numeric(12,2),
  "ncodtrib" varchar(3),
  "nredicms" numeric(5,2),
  "ncfopite" varchar(4),
  "nproxcom" date,
  "nalqiva" numeric(5,2),
  "nbscicst" numeric(12,2),
  "nvlricst" numeric(12,2),
  "nalqredu" numeric(5,2),
  "nalqipi" numeric(5,2),
  "nbscipi" numeric(12,2),
  "nvlripi" numeric(10,2),
  "nbscpis" numeric(12,2),
  "nalqpis" numeric(5,2),
  "nvlrpis" numeric(10,2),
  "nbsccof" numeric(12,2),
  "nvlrcof" numeric(10,2),
  "nalqcof" numeric(5,2),
  "ncstipi" varchar(2),
  "nvlrfret" numeric(12,2),
  "ndesaces" numeric(12,2),
  "nvlrdesc" numeric(12,2),
  "nclasfis" varchar(8),
  "ndthrafe" varchar(24),
  "nqtdconf" numeric(9,3),
  "npivasbt" numeric(5,2),
  "npicmsbt" numeric(5,2),
  "npdicsbt" numeric(5,2),
  "ndicmsbt" numeric(10,2),
  "npicmsmp" numeric(5,2),
  "nvicmsmp" numeric(10,2),
  "ncstpis" varchar(2),
  "ncstcof" varchar(2),
  "nvlribpt" numeric(10,2),
  "nunidade" varchar(3),
  "ncest" integer,
  "nvbscdes" numeric(12,2),
  "npfdpdes" numeric(5,2),
  "npicmdes" numeric(5,2),
  "npicmorg" numeric(5,2),
  "npprtdes" numeric(6,2),
  "nvfdpdes" numeric(12,2),
  "nvicmdes" numeric(12,2),
  "nvicmorg" numeric(12,2),
  "nnotboni" integer,
  "niteboni" integer,
  "nbfcpst" numeric(12,2),
  "npfcpst" numeric(5,2),
  "nvfcpst" numeric(10,2),
  "npedcomp" varchar(15),
  "nitecomp" varchar(6),
  "ncodcul" integer,
  "ntabela" integer,
  "cbenef" varchar(8),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faanitpv" enable row level security;
revoke all on public."dukamp_legacy_faanitpv" from public, anon;
grant select on public."dukamp_legacy_faanitpv" to authenticated;
grant all on public."dukamp_legacy_faanitpv" to service_role;
drop policy if exists "Admins read faanitpv" on public."dukamp_legacy_faanitpv";
create policy "Admins read faanitpv" on public."dukamp_legacy_faanitpv"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- faanobpv.DBF: Observações das pré-vendas
create table if not exists public."dukamp_legacy_faanobpv" (
  _row_id bigint generated always as identity primary key,
  "nnumnota" integer,
  "tipobs" integer,
  "observ" varchar(150),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faanobpv" enable row level security;
revoke all on public."dukamp_legacy_faanobpv" from public, anon;
grant select on public."dukamp_legacy_faanobpv" to authenticated;
grant all on public."dukamp_legacy_faanobpv" to service_role;
drop policy if exists "Admins read faanobpv" on public."dukamp_legacy_faanobpv";
create policy "Admins read faanobpv" on public."dukamp_legacy_faanobpv"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAANOTAI.DBF: Itens das notas fiscais
create table if not exists public."dukamp_legacy_faanotai" (
  _row_id bigint generated always as identity primary key,
  "nnronota" integer,
  "nitenota" integer,
  "ncodprod" integer,
  "nqtdprod" numeric(10,3),
  "nvrunliq" numeric(15,3),
  "nnropedi" integer,
  "ndesprod" varchar(45),
  "nitepedi" integer,
  "nalqicms" numeric(5,2),
  "nvlrtabe" numeric(15,3),
  "nvlricms" numeric(13,2),
  "nbscicms" numeric(15,2),
  "nbsccomi" numeric(12,2),
  "nperven" numeric(5,2),
  "ncmsven" numeric(10,2),
  "ncusfina" numeric(12,3),
  "nalqipi" integer,
  "nvlripi" numeric(13,2),
  "nperger" numeric(5,2),
  "ncmsger" numeric(10,2),
  "npersup" numeric(5,2),
  "ncmssup" numeric(10,2),
  "nfincom" numeric(5,2),
  "nfrtcom" numeric(8,2),
  "nletite" varchar(2),
  "ncodtrib" varchar(3),
  "nalqiva" numeric(5,2),
  "nbscicst" numeric(12,2),
  "nvlricst" numeric(12,2),
  "npivasbt" numeric(5,2),
  "npicmsbt" numeric(5,2),
  "npdicsbt" numeric(5,2),
  "ndicmsbt" numeric(10,2),
  "nalqredu" numeric(5,2),
  "nbscipi" numeric(12,2),
  "nbscpis" numeric(12,2),
  "nalqpis" numeric(5,2),
  "nvlrpis" numeric(10,2),
  "ncstpis" varchar(2),
  "nbsccof" numeric(12,2),
  "nalqcof" numeric(5,2),
  "nvlrcof" numeric(10,2),
  "ncstcof" varchar(2),
  "nclasfis" varchar(8),
  "ncstipi" varchar(2),
  "nvlrfret" numeric(12,2),
  "ndesaces" numeric(12,2),
  "nvlrdesc" numeric(12,2),
  "ncfopite" varchar(4),
  "nunidade" varchar(3),
  "npicmsmp" numeric(5,2),
  "nvicmsmp" numeric(10,2),
  "nnotboni" integer,
  "niteboni" integer,
  "nvlribpt" numeric(10,2),
  "nvbscdes" numeric(12,2),
  "npfdpdes" numeric(5,2),
  "npicmdes" numeric(5,2),
  "npicmorg" numeric(5,2),
  "npprtdes" numeric(6,2),
  "nvfdpdes" numeric(12,2),
  "nvicmdes" numeric(12,2),
  "nvicmorg" numeric(12,2),
  "ncest" integer,
  "nvlrcomi" numeric(10,2),
  "npercomi" numeric(5,2),
  "nredicms" numeric(5,2),
  "nproxcom" date,
  "ndthrafe" varchar(24),
  "nqtdconf" numeric(9,3),
  "npedcomp" varchar(15),
  "nitecomp" varchar(6),
  "nbfcpst" numeric(12,2),
  "npfcpst" numeric(5,2),
  "nvfcpst" numeric(10,2),
  "ncodcul" integer,
  "ntabela" integer,
  "nunitrib" varchar(6),
  "nqtdtrib" numeric(10,4),
  "nvrutrib" numeric(12,5),
  "nvlrii" numeric(12,2),
  "chave_ref" varchar(44),
  "item_ref" integer,
  "cstis" varchar(3),
  "clastribis" varchar(6),
  "bcis" numeric(15,2),
  "pis" numeric(8,4),
  "pisespec" numeric(8,4),
  "untribis" varchar(6),
  "qttribis" numeric(11,4),
  "vis" numeric(15,2),
  "cstibscbs" varchar(3),
  "clastrib" varchar(6),
  "bcibscbs" numeric(15,2),
  "pibsuf" numeric(8,4),
  "pdifuf" numeric(8,4),
  "vdifuf" numeric(15,2),
  "vdevtriuf" numeric(15,2),
  "predalquf" numeric(8,4),
  "palqefeuf" numeric(8,4),
  "vibsuf" numeric(15,2),
  "pibsmu" numeric(8,4),
  "pdifmu" numeric(8,4),
  "vdifmu" numeric(15,2),
  "vdevtrimu" numeric(15,2),
  "predalqmu" numeric(8,4),
  "palqefemu" numeric(8,4),
  "vibsmu" numeric(15,2),
  "pcbs" numeric(8,4),
  "pdifcbs" numeric(8,4),
  "vdifcbs" numeric(15,2),
  "vdevtricbs" numeric(15,2),
  "predalqcbs" numeric(8,4),
  "palqefecbs" numeric(8,4),
  "vcbs" numeric(15,2),
  "vtotite" numeric(15,2),
  "cbenef" varchar(8),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faanotai" enable row level security;
revoke all on public."dukamp_legacy_faanotai" from public, anon;
grant select on public."dukamp_legacy_faanotai" to authenticated;
grant all on public."dukamp_legacy_faanotai" to service_role;
drop policy if exists "Admins read faanotai" on public."dukamp_legacy_faanotai";
create policy "Admins read faanotai" on public."dukamp_legacy_faanotai"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAANOTAS.DBF: Notas fiscais
create table if not exists public."dukamp_legacy_faanotas" (
  _row_id bigint generated always as identity primary key,
  "nnumnota" integer,
  "ndatemis" date,
  "ncodvend" integer,
  "nnatoper" varchar(4),
  "ncodclie" integer,
  "nufclien" varchar(2),
  "ntotnota" numeric(15,2),
  "nalqicms" integer,
  "ntipbicm" varchar(1),
  "nvlrbicm" numeric(15,2),
  "nvlricms" numeric(12,2),
  "nvlrmerc" numeric(15,2),
  "nvlrfret" numeric(14,2),
  "nttbscom" numeric(15,2),
  "nvlrcomi" numeric(15,2),
  "nnumpedi" integer,
  "ntiponot" varchar(1),
  "ncancela" varchar(1),
  "nlocentr" varchar(64),
  "npesobru" numeric(9,3),
  "npesoliq" numeric(9,3),
  "nconpgt1" integer,
  "nconpgt2" integer,
  "nconpgt3" integer,
  "nconpgt4" integer,
  "nconpgt5" integer,
  "nconpgt6" integer,
  "nconpgt7" integer,
  "nconpgt8" integer,
  "nconpgt9" integer,
  "nconpgt10" integer,
  "nconpgt11" integer,
  "nconpgt12" integer,
  "nconpgt13" integer,
  "nconpgt14" integer,
  "nconpgt15" integer,
  "nconpgt16" integer,
  "nconpgt17" integer,
  "nconpgt18" integer,
  "nconpgt19" integer,
  "nconpgt20" integer,
  "nvlrdesc" numeric(15,2),
  "nemidupl" varchar(1),
  "ninsdupl" varchar(1),
  "nmarca" varchar(10),
  "ncodtran" integer,
  "nnomtran" varchar(40),
  "nqtdvolu" integer,
  "nobserv1" varchar(64),
  "nobserv2" varchar(64),
  "nobserv3" varchar(64),
  "nobserv4" varchar(64),
  "nobserv5" varchar(64),
  "nflgurv" varchar(1),
  "ntoturvs" numeric(10,2),
  "ndescicm" numeric(15,2),
  "nnomclie" varchar(35),
  "ncodcomp" integer,
  "npercomp" numeric(5,2),
  "ntip_ser" varchar(3),
  "ndathoje" date,
  "ndesaces" numeric(12,2),
  "nbxcaixa" varchar(1),
  "nrepsupe" integer,
  "nrepgere" integer,
  "npervend" numeric(8,5),
  "npersupe" numeric(8,5),
  "npergere" numeric(8,5),
  "nnatope2" varchar(4),
  "ntcmsven" numeric(10,2),
  "ntcmssup" numeric(10,2),
  "ntcmsger" numeric(10,2),
  "ntabecom" varchar(5),
  "nvlrdes1" numeric(12,2),
  "nvlrdes2" numeric(12,2),
  "nvendor" varchar(1),
  "nobsadic" text,
  "ntotcust" numeric(10,2),
  "ntotserv" numeric(10,2),
  "nflemicf" varchar(1),
  "ndatsaid" date,
  "ntiponfe" varchar(1),
  "npgtfret" integer,
  "nseq_nfe" integer,
  "nesp_vol" varchar(10),
  "nins_tra" varchar(17),
  "nend_tra" varchar(40),
  "ncid_tra" varchar(30),
  "nufe_tra" varchar(2),
  "npla_vei" varchar(8),
  "nufe_pla" varchar(2),
  "chave_nfe" varchar(44),
  "nobscanc" varchar(30),
  "nvicmsbt" numeric(12,2),
  "nbicmsbt" numeric(12,2),
  "nvlrtipi" numeric(12,2),
  "protc_nfe" varchar(15),
  "ncodven2" integer,
  "ntotibpt" numeric(12,2),
  "ncons_rev" varchar(1),
  "ncntr_icm" varchar(1),
  "ncli_pres" varchar(1),
  "noper_int" varchar(1),
  "chave_ref" varchar(44),
  "ntfdpdes" numeric(12,2),
  "ntdifdes" numeric(12,2),
  "ntdiforg" numeric(12,2),
  "ninscrst" varchar(16),
  "ncodaten" integer,
  "ntrpfret" numeric(10,2),
  "ncodlibv" integer,
  "nemconfe" varchar(9),
  "npedcomp" varchar(11),
  "nvissret" numeric(12,2),
  "npercomi" numeric(5,2),
  "ntfcpst" numeric(12,2),
  "indinterm" varchar(1),
  "idcadinter" varchar(40),
  "meiopagto" varchar(2),
  "nsepsth" varchar(1),
  "nnroprev" integer,
  "naviprz" integer,
  "ncarpag" integer,
  "nfeestoq" varchar(2),
  "emailcet" varchar(2),
  "nmkt" integer,
  "nmktped" varchar(20),
  "nnumnfce" integer,
  "ser_nfce" varchar(3),
  "tbcibscbs" numeric(15,2),
  "tdifuf" numeric(15,2),
  "tdevtriuf" numeric(15,2),
  "tvibsuf" numeric(15,2),
  "tdifmu" numeric(15,2),
  "tdevtrimu" numeric(15,2),
  "tvibsmu" numeric(15,2),
  "tvibs" numeric(15,2),
  "tcredpibs" numeric(15,2),
  "tcredpcibs" numeric(15,2),
  "tdifcbs" numeric(15,2),
  "tdevtricbs" numeric(15,2),
  "tvcbs" numeric(15,2),
  "tcredpcbs" numeric(15,2),
  "tcredpccbs" numeric(15,2),
  "tibsmono" numeric(15,2),
  "tcbsmono" numeric(15,2),
  "tibsmonrte" numeric(15,2),
  "tcbsmonrte" numeric(15,2),
  "tibsmonret" numeric(15,2),
  "tcbsmonret" numeric(15,2),
  "tvis" numeric(15,2),
  "tvnftot" numeric(15,2),
  "ctipcli" varchar(3),
  "receituari" varchar(10),
  "cpfresptec" bigint,
  "vcnpj_tra" varchar(14),
  "vncpfcnpj" varchar(14),
  "vcnpjinter" varchar(14),
  "vcnpjinstp" varchar(14),
  "cnpj_tra" varchar(14),
  "ncpfcnpj" varchar(14),
  "cnpjinter" varchar(14),
  "cnpjinstpg" varchar(14),
  "moddanfe" varchar(1),
  "tocredeb" varchar(2),
  "ncodpgt" integer,
  "nroparc" integer,
  "fluxodias" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faanotas" enable row level security;
revoke all on public."dukamp_legacy_faanotas" from public, anon;
grant select on public."dukamp_legacy_faanotas" to authenticated;
grant all on public."dukamp_legacy_faanotas" to service_role;
drop policy if exists "Admins read faanotas" on public."dukamp_legacy_faanotas";
create policy "Admins read faanotas" on public."dukamp_legacy_faanotas"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAANOTOB.DBF: Observações das notas fiscais
create table if not exists public."dukamp_legacy_faanotob" (
  _row_id bigint generated always as identity primary key,
  "nnumnota" integer,
  "tipobs" integer,
  "observ" varchar(200),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faanotob" enable row level security;
revoke all on public."dukamp_legacy_faanotob" from public, anon;
grant select on public."dukamp_legacy_faanotob" to authenticated;
grant all on public."dukamp_legacy_faanotob" to service_role;
drop policy if exists "Admins read faanotob" on public."dukamp_legacy_faanotob";
create policy "Admins read faanotob" on public."dukamp_legacy_faanotob"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAANOTPV.DBF: Pré-vendas
create table if not exists public."dukamp_legacy_faanotpv" (
  _row_id bigint generated always as identity primary key,
  "nnumnota" integer,
  "ndatemis" date,
  "ncodvend" integer,
  "nnatoper" varchar(4),
  "ncodclie" integer,
  "nufclien" varchar(2),
  "ntotnota" numeric(15,2),
  "nalqicms" integer,
  "ntipbicm" varchar(1),
  "nvlrbicm" numeric(15,2),
  "nvlricms" numeric(12,2),
  "nvlrmerc" numeric(15,2),
  "nvlrfret" numeric(14,2),
  "nvlrcomi" numeric(15,2),
  "nnumpedi" integer,
  "ntiponot" varchar(1),
  "ncancela" varchar(1),
  "nlocentr" varchar(64),
  "npesobru" numeric(9,3),
  "nconpgt1" integer,
  "nconpgt2" integer,
  "nconpgt3" integer,
  "nconpgt4" integer,
  "nconpgt5" integer,
  "nconpgt6" integer,
  "nconpgt7" integer,
  "nconpgt8" integer,
  "nconpgt9" integer,
  "nconpgt10" integer,
  "nconpgt11" integer,
  "nconpgt12" integer,
  "nconpgt13" integer,
  "nconpgt14" integer,
  "nconpgt15" integer,
  "nconpgt16" integer,
  "nconpgt17" integer,
  "nconpgt18" integer,
  "nconpgt19" integer,
  "nconpgt20" integer,
  "nvlrdesc" numeric(15,2),
  "nemidupl" varchar(1),
  "ninsdupl" varchar(1),
  "nmarca" varchar(10),
  "ncodtran" integer,
  "nnomtran" varchar(40),
  "nqtdvolu" integer,
  "nobserv1" varchar(64),
  "nobserv2" varchar(64),
  "nobserv3" varchar(64),
  "nobserv4" varchar(64),
  "nobserv5" varchar(64),
  "nflgurv" varchar(1),
  "ntoturvs" numeric(10,2),
  "ndescicm" numeric(15,2),
  "nnomclie" varchar(35),
  "ncodcomp" integer,
  "npercomp" numeric(5,2),
  "ntip_ser" varchar(3),
  "ndathoje" date,
  "ndesaces" numeric(12,2),
  "nbxcaixa" varchar(1),
  "ncodven2" integer,
  "nnatope2" varchar(4),
  "ntotserv" numeric(12,2),
  "nalqiss" numeric(5,2),
  "nbasciss" numeric(12,2),
  "nvlrtipi" numeric(12,2),
  "nbascirf" numeric(10,2),
  "nalqirf" numeric(5,2),
  "ntrpfret" numeric(10,2),
  "ncodaten" integer,
  "nflemicf" varchar(1),
  "ncodlibv" integer,
  "ndatsaid" date,
  "ntiponfe" varchar(1),
  "npgtfret" integer,
  "nseq_nfe" integer,
  "nesp_vol" varchar(10),
  "nins_tra" varchar(17),
  "nend_tra" varchar(40),
  "ncid_tra" varchar(30),
  "nufe_tra" varchar(2),
  "npla_vei" varchar(8),
  "nufe_pla" varchar(2),
  "chave_nfe" varchar(44),
  "nobscanc" varchar(30),
  "nvicmsbt" numeric(12,2),
  "nbicmsbt" numeric(12,2),
  "npesoliq" numeric(9,3),
  "protc_nfe" varchar(15),
  "nendclie" varchar(40),
  "ncidclie" varchar(20),
  "ninsclie" varchar(16),
  "ntotibpt" numeric(12,2),
  "nemconfe" varchar(9),
  "ncons_rev" varchar(1),
  "ncntr_icm" varchar(1),
  "ncli_pres" varchar(1),
  "noper_int" varchar(1),
  "chave_ref" varchar(44),
  "ntfdpdes" numeric(12,2),
  "ntdifdes" numeric(12,2),
  "ntdiforg" numeric(12,2),
  "ninscrst" varchar(16),
  "nvissret" numeric(12,2),
  "npedcomp" varchar(11),
  "nobsadic" text,
  "nvendor" varchar(1),
  "ntcmssup" numeric(10,2),
  "ntcmsger" numeric(10,2),
  "ntcnsven" numeric(10,2),
  "npergere" numeric(8,5),
  "npersupe" numeric(8,5),
  "npervend" numeric(8,5),
  "indinterm" varchar(1),
  "idcadinter" varchar(40),
  "meiopagto" varchar(2),
  "ntfcpst" numeric(12,2),
  "horaprev" varchar(8),
  "dataemi" date,
  "horaemi" varchar(8),
  "nsepsth" varchar(1),
  "naviprz" integer,
  "ncarpag" integer,
  "obs1prev" varchar(64),
  "obs2prev" varchar(64),
  "nfeestoq" varchar(2),
  "emailcet" varchar(2),
  "vncpfcnpj" varchar(14),
  "vcnpj_tra" varchar(14),
  "vcnpjinter" varchar(14),
  "vcnpjinstp" varchar(14),
  "ncpfcnpj" varchar(14),
  "cnpjinter" varchar(14),
  "cnpj_tra" varchar(14),
  "cnpjinstpg" varchar(14),
  "moddanfe" varchar(1),
  "tpcredeb" varchar(2),
  "ncodpgt" integer,
  "nroparc" integer,
  "fluxodias" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faanotpv" enable row level security;
revoke all on public."dukamp_legacy_faanotpv" from public, anon;
grant select on public."dukamp_legacy_faanotpv" to authenticated;
grant all on public."dukamp_legacy_faanotpv" to service_role;
drop policy if exists "Admins read faanotpv" on public."dukamp_legacy_faanotpv";
create policy "Admins read faanotpv" on public."dukamp_legacy_faanotpv"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAPEDID.DBF: Pedidos de venda
create table if not exists public."dukamp_legacy_faapedid" (
  _row_id bigint generated always as identity primary key,
  "nnumpedi" integer,
  "ndatemis" date,
  "ncodvend" integer,
  "nnatoper" varchar(4),
  "ncodclie" integer,
  "nufclien" varchar(2),
  "ntotpedi" numeric(15,2),
  "nalqicms" integer,
  "nvlrmerc" numeric(15,2),
  "nvlrfret" numeric(14,2),
  "nttbscom" numeric(12,2),
  "nvlrcomi" numeric(18,2),
  "ncancela" varchar(1),
  "nlocentr" varchar(64),
  "nconpgt1" integer,
  "nconpgt2" integer,
  "nconpgt3" integer,
  "nconpgt4" integer,
  "nconpgt5" integer,
  "nconpgt6" integer,
  "nconpgt7" integer,
  "nconpgt8" integer,
  "nconpgt9" integer,
  "nconpgt10" integer,
  "nconpgt11" integer,
  "nconpgt12" integer,
  "nvlrdesc" numeric(15,2),
  "nobserv1" varchar(64),
  "nobserv2" varchar(64),
  "nflgurv" varchar(1),
  "ntoturvs" numeric(10,2),
  "ndescicm" numeric(15,2),
  "nnomclie" varchar(35),
  "ncodcomp" integer,
  "npercomp" numeric(5,2),
  "ndathoje" date,
  "ncomprad" varchar(40),
  "npedfatu" varchar(1),
  "nbxcaixa" varchar(1),
  "nrepsupe" integer,
  "nrepgere" integer,
  "npervend" numeric(8,5),
  "npersupe" numeric(8,5),
  "npergere" numeric(8,5),
  "ntcmsven" numeric(10,2),
  "ntcmssup" numeric(10,2),
  "ntcmsger" numeric(10,2),
  "ntabecom" varchar(5),
  "ntippedi" varchar(1),
  "ninsdupl" varchar(1),
  "nnrficha" integer,
  "ncodpgt" integer,
  "ncodven2" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faapedid" enable row level security;
revoke all on public."dukamp_legacy_faapedid" from public, anon;
grant select on public."dukamp_legacy_faapedid" to authenticated;
grant all on public."dukamp_legacy_faapedid" to service_role;
drop policy if exists "Admins read faapedid" on public."dukamp_legacy_faapedid";
create policy "Admins read faapedid" on public."dukamp_legacy_faapedid"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAPEDII.DBF: Itens dos pedidos de venda
create table if not exists public."dukamp_legacy_faapedii" (
  _row_id bigint generated always as identity primary key,
  "nnropedi" integer,
  "nitepedi" integer,
  "ncodprod" integer,
  "nqtdprod" numeric(10,3),
  "nvrunliq" numeric(15,3),
  "ndesprod" varchar(45),
  "nvlrtabe" numeric(15,3),
  "natendid" varchar(1),
  "nftnronf" integer,
  "nalqicms" integer,
  "nperven" numeric(5,2),
  "nbsccomi" numeric(12,2),
  "ncmsven" numeric(10,2),
  "ncusfina" numeric(12,3),
  "nperger" numeric(5,2),
  "ncmsger" numeric(10,2),
  "npersup" numeric(5,2),
  "ncmssup" numeric(10,2),
  "nfincom" numeric(5,2),
  "nfrtcom" numeric(8,2),
  "nletite" varchar(2),
  "npercomi" numeric(5,2),
  "nvlrcomi" numeric(12,2),
  "ntabela" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faapedii" enable row level security;
revoke all on public."dukamp_legacy_faapedii" from public, anon;
grant select on public."dukamp_legacy_faapedii" to authenticated;
grant all on public."dukamp_legacy_faapedii" to service_role;
drop policy if exists "Admins read faapedii" on public."dukamp_legacy_faapedii";
create policy "Admins read faapedii" on public."dukamp_legacy_faapedii"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAPEDVC.DBF: FAAPEDVC
create table if not exists public."dukamp_legacy_faapedvc" (
  _row_id bigint generated always as identity primary key,
  "vnumpedi" integer,
  "vnroparc" integer,
  "vdatemis" date,
  "vcodclie" integer,
  "vdatvect" date,
  "vvalparc" numeric(15,2),
  "vcodcart" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faapedvc" enable row level security;
revoke all on public."dukamp_legacy_faapedvc" from public, anon;
grant select on public."dukamp_legacy_faapedvc" to authenticated;
grant all on public."dukamp_legacy_faapedvc" to service_role;
drop policy if exists "Admins read faapedvc" on public."dukamp_legacy_faapedvc";
create policy "Admins read faapedvc" on public."dukamp_legacy_faapedvc"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAREGSA.DBF: FAAREGSA
create table if not exists public."dukamp_legacy_faaregsa" (
  _row_id bigint generated always as identity primary key,
  "cpf" bigint,
  "codcli" integer,
  "letra" varchar(1),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faaregsa" enable row level security;
revoke all on public."dukamp_legacy_faaregsa" from public, anon;
grant select on public."dukamp_legacy_faaregsa" to authenticated;
grant all on public."dukamp_legacy_faaregsa" to service_role;
drop policy if exists "Admins read faaregsa" on public."dukamp_legacy_faaregsa";
create policy "Admins read faaregsa" on public."dukamp_legacy_faaregsa"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAREPRE.DBF: Representantes e vendedores
create table if not exists public."dukamp_legacy_faarepre" (
  _row_id bigint generated always as identity primary key,
  "repcodi" integer,
  "repnome" varchar(35),
  "repende" varchar(35),
  "repfon1" varchar(14),
  "repfon2" varchar(14),
  "repcomi" numeric(5,2),
  "reptimp" varchar(1),
  "repcida" varchar(20),
  "repufe" varchar(2),
  "repccor" varchar(10),
  "repagen" varchar(10),
  "repban" varchar(30),
  "repcep" integer,
  "repinsc" varchar(20),
  "repsitu" varchar(10),
  "repobs" varchar(40),
  "repcgc" varchar(20),
  "repadmi" date,
  "repafas" date,
  "agenda" text,
  "senha" varchar(10),
  "repbloq" varchar(1),
  "repobsb" varchar(50),
  "repsupe" integer,
  "repgere" integer,
  "repsetor" varchar(10),
  "observ" text,
  "reppix" varchar(60),
  "repagenb" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faarepre" enable row level security;
revoke all on public."dukamp_legacy_faarepre" from public, anon;
grant select on public."dukamp_legacy_faarepre" to authenticated;
grant all on public."dukamp_legacy_faarepre" to service_role;
drop policy if exists "Admins read faarepre" on public."dukamp_legacy_faarepre";
create policy "Admins read faarepre" on public."dukamp_legacy_faarepre"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAASATAD.DBF: FAASATAD
create table if not exists public."dukamp_legacy_faasatad" (
  _row_id bigint generated always as identity primary key,
  "codadm" varchar(3),
  "descri" varchar(60),
  "cnpj" varchar(18),
  "ativo" varchar(1),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faasatad" enable row level security;
revoke all on public."dukamp_legacy_faasatad" from public, anon;
grant select on public."dukamp_legacy_faasatad" to authenticated;
grant all on public."dukamp_legacy_faasatad" to service_role;
drop policy if exists "Admins read faasatad" on public."dukamp_legacy_faasatad";
create policy "Admins read faasatad" on public."dukamp_legacy_faasatad"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAASENHA.DBF: FAASENHA
create table if not exists public."dukamp_legacy_faasenha" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(7),
  "nronot" integer,
  "codven" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faasenha" enable row level security;
revoke all on public."dukamp_legacy_faasenha" from public, anon;
grant select on public."dukamp_legacy_faasenha" to authenticated;
grant all on public."dukamp_legacy_faasenha" to service_role;
drop policy if exists "Admins read faasenha" on public."dukamp_legacy_faasenha";
create policy "Admins read faasenha" on public."dukamp_legacy_faasenha"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAASPED.DBF: FAASPED
create table if not exists public."dukamp_legacy_faasped" (
  _row_id bigint generated always as identity primary key,
  "tipreg" varchar(1),
  "ecf" varchar(8),
  "ecf_nro" varchar(20),
  "dir_ecf" varchar(20),
  "nome" varchar(60),
  "cpf" varchar(11),
  "crc" varchar(15),
  "cnpj" varchar(14),
  "cep" varchar(8),
  "end" varchar(60),
  "num" varchar(15),
  "compl" varchar(30),
  "bairro" varchar(30),
  "fone" varchar(15),
  "fax" varchar(15),
  "email" varchar(60),
  "cod_mun" varchar(7),
  "hcodcta" varchar(15),
  "temcupom" varchar(1),
  "c170tem" varchar(1),
  "c200cst" varchar(1),
  "cmpl_sist" varchar(1),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faasped" enable row level security;
revoke all on public."dukamp_legacy_faasped" from public, anon;
grant select on public."dukamp_legacy_faasped" to authenticated;
grant all on public."dukamp_legacy_faasped" to service_role;
drop policy if exists "Admins read faasped" on public."dukamp_legacy_faasped";
create policy "Admins read faasped" on public."dukamp_legacy_faasped"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAATABIR.DBF: FAATABIR
create table if not exists public."dukamp_legacy_faatabir" (
  _row_id bigint generated always as identity primary key,
  "irmesref" integer,
  "iraliqu1" numeric(5,2),
  "irvlrbs1" numeric(18,2),
  "irvlrde1" numeric(18,2),
  "iraliqu2" numeric(5,2),
  "irvlrbs2" numeric(18,2),
  "irvlrde2" numeric(18,2),
  "iraliqu3" numeric(5,2),
  "irvlrbs3" numeric(18,2),
  "irvlrde3" numeric(18,2),
  "iraliqu4" numeric(5,2),
  "irvlrbs4" numeric(18,2),
  "irvlrde4" numeric(18,2),
  "iraliqu5" numeric(5,2),
  "irvlrbs5" numeric(18,2),
  "irvlrde5" numeric(18,2),
  "irvalmin" numeric(12,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faatabir" enable row level security;
revoke all on public."dukamp_legacy_faatabir" from public, anon;
grant select on public."dukamp_legacy_faatabir" to authenticated;
grant all on public."dukamp_legacy_faatabir" to service_role;
drop policy if exists "Admins read faatabir" on public."dukamp_legacy_faatabir";
create policy "Admins read faatabir" on public."dukamp_legacy_faatabir"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAATBICM.DBF: FAATBICM
create table if not exists public."dukamp_legacy_faatbicm" (
  _row_id bigint generated always as identity primary key,
  "tiptab" varchar(1),
  "diamed" numeric(4,1),
  "perfin" numeric(7,3),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faatbicm" enable row level security;
revoke all on public."dukamp_legacy_faatbicm" from public, anon;
grant select on public."dukamp_legacy_faatbicm" to authenticated;
grant all on public."dukamp_legacy_faatbicm" to service_role;
drop policy if exists "Admins read faatbicm" on public."dukamp_legacy_faatbicm";
create policy "Admins read faatbicm" on public."dukamp_legacy_faatbicm"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAATPCLI.DBF: FAATPCLI
create table if not exists public."dukamp_legacy_faatpcli" (
  _row_id bigint generated always as identity primary key,
  "tipcli" varchar(3),
  "descri" varchar(30),
  "codnfe" integer,
  "cbenef" varchar(8),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faatpcli" enable row level security;
revoke all on public."dukamp_legacy_faatpcli" from public, anon;
grant select on public."dukamp_legacy_faatpcli" to authenticated;
grant all on public."dukamp_legacy_faatpcli" to service_role;
drop policy if exists "Admins read faatpcli" on public."dukamp_legacy_faatpcli";
create policy "Admins read faatpcli" on public."dukamp_legacy_faatpcli"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAATPPGT.DBF: FAATPPGT
create table if not exists public."dukamp_legacy_faatppgt" (
  _row_id bigint generated always as identity primary key,
  "ncodpgt" integer,
  "ndescri" varchar(20),
  "ncodcxa" integer,
  "ntipped" varchar(1),
  "sat" varchar(1),
  "satcodmoe" varchar(2),
  "satadm" varchar(1),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faatppgt" enable row level security;
revoke all on public."dukamp_legacy_faatppgt" from public, anon;
grant select on public."dukamp_legacy_faatppgt" to authenticated;
grant all on public."dukamp_legacy_faatppgt" to service_role;
drop policy if exists "Admins read faatppgt" on public."dukamp_legacy_faatppgt";
create policy "Admins read faatppgt" on public."dukamp_legacy_faatppgt"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAATRANS.DBF: Transportadoras
create table if not exists public."dukamp_legacy_faatrans" (
  _row_id bigint generated always as identity primary key,
  "tcodi" integer,
  "tnome" varchar(40),
  "tende" varchar(40),
  "tmuni" varchar(30),
  "testa" varchar(2),
  "tplac" varchar(8),
  "tmarc" varchar(11),
  "tufpl" varchar(2),
  "tcgc" varchar(14),
  "tins" varchar(17),
  "tfone" varchar(20),
  "tobs" text,
  "tcep" integer,
  "tbai" varchar(12),
  "tnomfan" varchar(20),
  "tibge" integer,
  "tcel" varchar(12),
  "tnomesp" varchar(35),
  "ttelesp" varchar(12),
  "trenavan" varchar(12),
  "tcrnt" varchar(10),
  "ttara" varchar(10),
  "tplacacav" varchar(8),
  "tpesobru" numeric(10,3),
  "tpesoliq" numeric(10,3),
  "trg" varchar(15),
  "trgdt" date,
  "tpis" varchar(15),
  "tnommae" varchar(35),
  "testcivil" varchar(10),
  "tcidnasc" varchar(20),
  "tbanco" varchar(10),
  "tagencia" varchar(10),
  "tconta" varchar(20),
  "tregiao" varchar(10),
  "tdatnas" date,
  "vtcgc" varchar(14),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faatrans" enable row level security;
revoke all on public."dukamp_legacy_faatrans" from public, anon;
grant select on public."dukamp_legacy_faatrans" to authenticated;
grant all on public."dukamp_legacy_faatrans" to service_role;
drop policy if exists "Admins read faatrans" on public."dukamp_legacy_faatrans";
create policy "Admins read faatrans" on public."dukamp_legacy_faatrans"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAATRFRE.DBF: FAATRFRE
create table if not exists public."dukamp_legacy_faatrfre" (
  _row_id bigint generated always as identity primary key,
  "ftcodtra" integer,
  "ftestado" varchar(2),
  "ftpesmin" numeric(8,3),
  "ftvlrmin" numeric(12,2),
  "ftperacr" numeric(5,2),
  "ftvlracr" numeric(12,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faatrfre" enable row level security;
revoke all on public."dukamp_legacy_faatrfre" from public, anon;
grant select on public."dukamp_legacy_faatrfre" to authenticated;
grant all on public."dukamp_legacy_faatrfre" to service_role;
drop policy if exists "Admins read faatrfre" on public."dukamp_legacy_faatrfre";
create policy "Admins read faatrfre" on public."dukamp_legacy_faatrfre"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAVENCT.DBF: Vencimentos
create table if not exists public."dukamp_legacy_faavenct" (
  _row_id bigint generated always as identity primary key,
  "vnumnota" integer,
  "vnroparc" integer,
  "vdatemis" date,
  "vcodclie" integer,
  "vdatvect" date,
  "vvalparc" numeric(15,2),
  "vcodcart" integer,
  "vnumdupl" integer,
  "vtaxvend" numeric(6,3),
  "vtaxcomp" numeric(6,3),
  "vnossonr" varchar(15),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faavenct" enable row level security;
revoke all on public."dukamp_legacy_faavenct" from public, anon;
grant select on public."dukamp_legacy_faavenct" to authenticated;
grant all on public."dukamp_legacy_faavenct" to service_role;
drop policy if exists "Admins read faavenct" on public."dukamp_legacy_faavenct";
create policy "Admins read faavenct" on public."dukamp_legacy_faavenct"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAVENPV.DBF: Vencimentos de pré-venda
create table if not exists public."dukamp_legacy_faavenpv" (
  _row_id bigint generated always as identity primary key,
  "vnumnota" integer,
  "vnroparc" integer,
  "vdatemis" date,
  "vcodclie" integer,
  "vdatvect" date,
  "vvalparc" numeric(15,2),
  "vcodcart" integer,
  "vnumdupl" integer,
  "vnossonr" varchar(15),
  "vtaxvend" numeric(6,3),
  "vtaxcomp" numeric(6,3),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faavenpv" enable row level security;
revoke all on public."dukamp_legacy_faavenpv" from public, anon;
grant select on public."dukamp_legacy_faavenpv" to authenticated;
grant all on public."dukamp_legacy_faavenpv" to service_role;
drop policy if exists "Admins read faavenpv" on public."dukamp_legacy_faavenpv";
create policy "Admins read faavenpv" on public."dukamp_legacy_faavenpv"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAVLREC.DBF: FAAVLREC
create table if not exists public."dukamp_legacy_faavlrec" (
  _row_id bigint generated always as identity primary key,
  "covende" integer,
  "conrnot" integer,
  "conrped" integer,
  "coclien" integer,
  "codatan" date,
  "covlnot" numeric(15,2),
  "covlcom" numeric(14,2),
  "coobser" varchar(40),
  "coperco" numeric(5,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faavlrec" enable row level security;
revoke all on public."dukamp_legacy_faavlrec" from public, anon;
grant select on public."dukamp_legacy_faavlrec" to authenticated;
grant all on public."dukamp_legacy_faavlrec" to service_role;
drop policy if exists "Admins read faavlrec" on public."dukamp_legacy_faavlrec";
create policy "Admins read faavlrec" on public."dukamp_legacy_faavlrec"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAAVNDSG.DBF: FAAVNDSG
create table if not exists public."dukamp_legacy_faavndsg" (
  _row_id bigint generated always as identity primary key,
  "codven" integer,
  "datemi" date,
  "valsg1" numeric(10,2),
  "valsg2" numeric(10,2),
  "valsg3" numeric(10,2),
  "valsg4" numeric(10,2),
  "valsg5" numeric(10,2),
  "valsg6" numeric(10,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_faavndsg" enable row level security;
revoke all on public."dukamp_legacy_faavndsg" from public, anon;
grant select on public."dukamp_legacy_faavndsg" to authenticated;
grant all on public."dukamp_legacy_faavndsg" to service_role;
drop policy if exists "Admins read faavndsg" on public."dukamp_legacy_faavndsg";
create policy "Admins read faavndsg" on public."dukamp_legacy_faavndsg"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FECHAMES.DBF: FECHAMES
create table if not exists public."dukamp_legacy_fechames" (
  _row_id bigint generated always as identity primary key,
  "firestat" integer,
  "firabccl" integer,
  "nrodupl" integer,
  "nronotsu" integer,
  "nropedid" integer,
  "nronotcm" integer,
  "dircheq" varchar(15),
  "marcon" numeric(5,3),
  "impost" numeric(5,3),
  "perdas" numeric(5,3),
  "perfin" numeric(5,2),
  "diasute" integer,
  "vlrvet" numeric(15,2),
  "vlrfer" numeric(15,2),
  "vlrdef" numeric(15,2),
  "vlrali" numeric(15,2),
  "dirprev" varchar(14),
  "cartcob1" text,
  "cartcob2" text,
  "nfe" varchar(1),
  "seqcli" integer,
  "nseq_nfe" integer,
  "nrontnfe" integer,
  "per_pis" numeric(5,2),
  "per_cof" numeric(5,2),
  "per_smpnac" numeric(5,2),
  "nrobarra" bigint,
  "grupo_emp" varchar(6),
  "dirsped" varchar(12),
  "seqrec" integer,
  "ibpt_med" numeric(5,2),
  "cobr_bol" integer,
  "prz2_bol" integer,
  "bco2_bol" integer,
  "prz3_bol" integer,
  "bco3_bol" integer,
  "usunota" varchar(10),
  "markplace" varchar(1),
  "nronotpv" integer,
  "seqnfce" integer,
  "pibsger" numeric(8,4),
  "pcbsger" numeric(8,4),
  "pisger" numeric(8,4),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_fechames" enable row level security;
revoke all on public."dukamp_legacy_fechames" from public, anon;
grant select on public."dukamp_legacy_fechames" to authenticated;
grant all on public."dukamp_legacy_fechames" to service_role;
drop policy if exists "Admins read fechames" on public."dukamp_legacy_fechames";
create policy "Admins read fechames" on public."dukamp_legacy_fechames"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FIAABCTP.dbf: FIAABCTP
create table if not exists public."dukamp_legacy_fiaabctp" (
  _row_id bigint generated always as identity primary key,
  "tcodcli" integer,
  "tcidcli" varchar(20),
  "testcli" varchar(2),
  "tvalano" integer,
  "trepcli" integer,
  "tultcmp" date,
  "tconcei" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_fiaabctp" enable row level security;
revoke all on public."dukamp_legacy_fiaabctp" from public, anon;
grant select on public."dukamp_legacy_fiaabctp" to authenticated;
grant all on public."dukamp_legacy_fiaabctp" to service_role;
drop policy if exists "Admins read fiaabctp" on public."dukamp_legacy_fiaabctp";
create policy "Admins read fiaabctp" on public."dukamp_legacy_fiaabctp"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- LIBERADO.DBF: LIBERADO
create table if not exists public."dukamp_legacy_liberado" (
  _row_id bigint generated always as identity primary key,
  "libfat" varchar(3),
  "libfin" varchar(3),
  "libcom" varchar(3),
  "libest" varchar(3),
  "libcont" varchar(3),
  "libfolh" varchar(3),
  "libescr" varchar(3),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_liberado" enable row level security;
revoke all on public."dukamp_legacy_liberado" from public, anon;
grant select on public."dukamp_legacy_liberado" to authenticated;
grant all on public."dukamp_legacy_liberado" to service_role;
drop policy if exists "Admins read liberado" on public."dukamp_legacy_liberado";
create policy "Admins read liberado" on public."dukamp_legacy_liberado"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- OSAITORC.DBF: OSAITORC
create table if not exists public."dukamp_legacy_osaitorc" (
  _row_id bigint generated always as identity primary key,
  "nroorc" integer,
  "nroite" integer,
  "quapro" numeric(9,2),
  "codpro" integer,
  "preuni" numeric(13,2),
  "perdsc" numeric(5,2),
  "unidad" varchar(2),
  "comple" text,
  "classi" varchar(8),
  "reserv" varchar(1),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_osaitorc" enable row level security;
revoke all on public."dukamp_legacy_osaitorc" from public, anon;
grant select on public."dukamp_legacy_osaitorc" to authenticated;
grant all on public."dukamp_legacy_osaitorc" to service_role;
drop policy if exists "Admins read osaitorc" on public."dukamp_legacy_osaitorc";
create policy "Admins read osaitorc" on public."dukamp_legacy_osaitorc"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- OSAORCAM.DBF: OSAORCAM
create table if not exists public."dukamp_legacy_osaorcam" (
  _row_id bigint generated always as identity primary key,
  "nroorc" integer,
  "codcli" integer,
  "datemi" date,
  "codven" integer,
  "compra" varchar(15),
  "cndpgt" varchar(50),
  "valida" varchar(20),
  "przent" varchar(20),
  "perdsc" numeric(5,2),
  "vlrdsc" numeric(15,2),
  "nomcli" varchar(40),
  "endcli" varchar(40),
  "cidcli" varchar(20),
  "ufecid" varchar(2),
  "foncli" varchar(15),
  "faxcli" varchar(15),
  "obsini" text,
  "equipa" varchar(25),
  "nroser" varchar(25),
  "servic" varchar(50),
  "orcos" varchar(1),
  "staorc" integer,
  "datsta" date,
  "horsta" varchar(8),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_osaorcam" enable row level security;
revoke all on public."dukamp_legacy_osaorcam" from public, anon;
grant select on public."dukamp_legacy_osaorcam" to authenticated;
grant all on public."dukamp_legacy_osaorcam" to service_role;
drop policy if exists "Admins read osaorcam" on public."dukamp_legacy_osaorcam";
create policy "Admins read osaorcam" on public."dukamp_legacy_osaorcam"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- OSASOLIC.DBF: OSASOLIC
create table if not exists public."dukamp_legacy_osasolic" (
  _row_id bigint generated always as identity primary key,
  "nrosol" integer,
  "vensol" integer,
  "clisol" varchar(50),
  "obssol" varchar(50),
  "flgemi" varchar(1),
  "datsol" date,
  "horsol" varchar(8),
  "datimp" date,
  "horimp" varchar(8),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_osasolic" enable row level security;
revoke all on public."dukamp_legacy_osasolic" from public, anon;
grant select on public."dukamp_legacy_osasolic" to authenticated;
grant all on public."dukamp_legacy_osasolic" to service_role;
drop policy if exists "Admins read osasolic" on public."dukamp_legacy_osasolic";
create policy "Admins read osasolic" on public."dukamp_legacy_osasolic"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- OSASOLIT.DBF: OSASOLIT
create table if not exists public."dukamp_legacy_osasolit" (
  _row_id bigint generated always as identity primary key,
  "nrosol" integer,
  "prosol" integer,
  "qtdsol" numeric(9,2),
  "observ" text,
  "seqret" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_osasolit" enable row level security;
revoke all on public."dukamp_legacy_osasolit" from public, anon;
grant select on public."dukamp_legacy_osasolit" to authenticated;
grant all on public."dukamp_legacy_osasolit" to service_role;
drop policy if exists "Admins read osasolit" on public."dukamp_legacy_osasolit";
create policy "Admins read osasolit" on public."dukamp_legacy_osasolit"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- OSASTAOR.DBF: OSASTAOR
create table if not exists public."dukamp_legacy_osastaor" (
  _row_id bigint generated always as identity primary key,
  "stcodigo" integer,
  "stdescri" varchar(25),
  "streserv" varchar(1),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_osastaor" enable row level security;
revoke all on public."dukamp_legacy_osastaor" from public, anon;
grant select on public."dukamp_legacy_osastaor" to authenticated;
grant all on public."dukamp_legacy_osastaor" to service_role;
drop policy if exists "Admins read osastaor" on public."dukamp_legacy_osastaor";
create policy "Admins read osastaor" on public."dukamp_legacy_osastaor"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- pal_aln.DBF: PAL_ALN
create table if not exists public."dukamp_legacy_pal_aln" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_aln" enable row level security;
revoke all on public."dukamp_legacy_pal_aln" from public, anon;
grant select on public."dukamp_legacy_pal_aln" to authenticated;
grant all on public."dukamp_legacy_pal_aln" to service_role;
drop policy if exists "Admins read pal_aln" on public."dukamp_legacy_pal_aln";
create policy "Admins read pal_aln" on public."dukamp_legacy_pal_aln"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PAL_ALP.DBF: PAL_ALP
create table if not exists public."dukamp_legacy_pal_alp" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_alp" enable row level security;
revoke all on public."dukamp_legacy_pal_alp" from public, anon;
grant select on public."dukamp_legacy_pal_alp" to authenticated;
grant all on public."dukamp_legacy_pal_alp" to service_role;
drop policy if exists "Admins read pal_alp" on public."dukamp_legacy_pal_alp";
create policy "Admins read pal_alp" on public."dukamp_legacy_pal_alp"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PAL_CAD.DBF: PAL_CAD
create table if not exists public."dukamp_legacy_pal_cad" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_cad" enable row level security;
revoke all on public."dukamp_legacy_pal_cad" from public, anon;
grant select on public."dukamp_legacy_pal_cad" to authenticated;
grant all on public."dukamp_legacy_pal_cad" to service_role;
drop policy if exists "Admins read pal_cad" on public."dukamp_legacy_pal_cad";
create policy "Admins read pal_cad" on public."dukamp_legacy_pal_cad"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PAL_CMP.DBF: PAL_CMP
create table if not exists public."dukamp_legacy_pal_cmp" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_cmp" enable row level security;
revoke all on public."dukamp_legacy_pal_cmp" from public, anon;
grant select on public."dukamp_legacy_pal_cmp" to authenticated;
grant all on public."dukamp_legacy_pal_cmp" to service_role;
drop policy if exists "Admins read pal_cmp" on public."dukamp_legacy_pal_cmp";
create policy "Admins read pal_cmp" on public."dukamp_legacy_pal_cmp"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PAL_COT.DBF: PAL_COT
create table if not exists public."dukamp_legacy_pal_cot" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_cot" enable row level security;
revoke all on public."dukamp_legacy_pal_cot" from public, anon;
grant select on public."dukamp_legacy_pal_cot" to authenticated;
grant all on public."dukamp_legacy_pal_cot" to service_role;
drop policy if exists "Admins read pal_cot" on public."dukamp_legacy_pal_cot";
create policy "Admins read pal_cot" on public."dukamp_legacy_pal_cot"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PAL_CPP.DBF: PAL_CPP
create table if not exists public."dukamp_legacy_pal_cpp" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_cpp" enable row level security;
revoke all on public."dukamp_legacy_pal_cpp" from public, anon;
grant select on public."dukamp_legacy_pal_cpp" to authenticated;
grant all on public."dukamp_legacy_pal_cpp" to service_role;
drop policy if exists "Admins read pal_cpp" on public."dukamp_legacy_pal_cpp";
create policy "Admins read pal_cpp" on public."dukamp_legacy_pal_cpp"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- pal_cus.DBF: PAL_CUS
create table if not exists public."dukamp_legacy_pal_cus" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_cus" enable row level security;
revoke all on public."dukamp_legacy_pal_cus" from public, anon;
grant select on public."dukamp_legacy_pal_cus" to authenticated;
grant all on public."dukamp_legacy_pal_cus" to service_role;
drop policy if exists "Admins read pal_cus" on public."dukamp_legacy_pal_cus";
create policy "Admins read pal_cus" on public."dukamp_legacy_pal_cus"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PAL_DIF.DBF: PAL_DIF
create table if not exists public."dukamp_legacy_pal_dif" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_dif" enable row level security;
revoke all on public."dukamp_legacy_pal_dif" from public, anon;
grant select on public."dukamp_legacy_pal_dif" to authenticated;
grant all on public."dukamp_legacy_pal_dif" to service_role;
drop policy if exists "Admins read pal_dif" on public."dukamp_legacy_pal_dif";
create policy "Admins read pal_dif" on public."dukamp_legacy_pal_dif"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- pal_dir.dbf: PAL_DIR
create table if not exists public."dukamp_legacy_pal_dir" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_dir" enable row level security;
revoke all on public."dukamp_legacy_pal_dir" from public, anon;
grant select on public."dukamp_legacy_pal_dir" to authenticated;
grant all on public."dukamp_legacy_pal_dir" to service_role;
drop policy if exists "Admins read pal_dir" on public."dukamp_legacy_pal_dir";
create policy "Admins read pal_dir" on public."dukamp_legacy_pal_dir"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PAL_DSC.DBF: PAL_DSC
create table if not exists public."dukamp_legacy_pal_dsc" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_dsc" enable row level security;
revoke all on public."dukamp_legacy_pal_dsc" from public, anon;
grant select on public."dukamp_legacy_pal_dsc" to authenticated;
grant all on public."dukamp_legacy_pal_dsc" to service_role;
drop policy if exists "Admins read pal_dsc" on public."dukamp_legacy_pal_dsc";
create policy "Admins read pal_dsc" on public."dukamp_legacy_pal_dsc"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PAL_EAL.DBF: PAL_EAL
create table if not exists public."dukamp_legacy_pal_eal" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_eal" enable row level security;
revoke all on public."dukamp_legacy_pal_eal" from public, anon;
grant select on public."dukamp_legacy_pal_eal" to authenticated;
grant all on public."dukamp_legacy_pal_eal" to service_role;
drop policy if exists "Admins read pal_eal" on public."dukamp_legacy_pal_eal";
create policy "Admins read pal_eal" on public."dukamp_legacy_pal_eal"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PAL_EST.DBF: PAL_EST
create table if not exists public."dukamp_legacy_pal_est" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_est" enable row level security;
revoke all on public."dukamp_legacy_pal_est" from public, anon;
grant select on public."dukamp_legacy_pal_est" to authenticated;
grant all on public."dukamp_legacy_pal_est" to service_role;
drop policy if exists "Admins read pal_est" on public."dukamp_legacy_pal_est";
create policy "Admins read pal_est" on public."dukamp_legacy_pal_est"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PAL_FAT.DBF: PAL_FAT
create table if not exists public."dukamp_legacy_pal_fat" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_fat" enable row level security;
revoke all on public."dukamp_legacy_pal_fat" from public, anon;
grant select on public."dukamp_legacy_pal_fat" to authenticated;
grant all on public."dukamp_legacy_pal_fat" to service_role;
drop policy if exists "Admins read pal_fat" on public."dukamp_legacy_pal_fat";
create policy "Admins read pal_fat" on public."dukamp_legacy_pal_fat"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PAL_FES.DBF: PAL_FES
create table if not exists public."dukamp_legacy_pal_fes" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_fes" enable row level security;
revoke all on public."dukamp_legacy_pal_fes" from public, anon;
grant select on public."dukamp_legacy_pal_fes" to authenticated;
grant all on public."dukamp_legacy_pal_fes" to service_role;
drop policy if exists "Admins read pal_fes" on public."dukamp_legacy_pal_fes";
create policy "Admins read pal_fes" on public."dukamp_legacy_pal_fes"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- pal_ger.dbf: PAL_GER
create table if not exists public."dukamp_legacy_pal_ger" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_ger" enable row level security;
revoke all on public."dukamp_legacy_pal_ger" from public, anon;
grant select on public."dukamp_legacy_pal_ger" to authenticated;
grant all on public."dukamp_legacy_pal_ger" to service_role;
drop policy if exists "Admins read pal_ger" on public."dukamp_legacy_pal_ger";
create policy "Admins read pal_ger" on public."dukamp_legacy_pal_ger"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PAL_NFU.DBF: PAL_NFU
create table if not exists public."dukamp_legacy_pal_nfu" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_nfu" enable row level security;
revoke all on public."dukamp_legacy_pal_nfu" from public, anon;
grant select on public."dukamp_legacy_pal_nfu" to authenticated;
grant all on public."dukamp_legacy_pal_nfu" to service_role;
drop policy if exists "Admins read pal_nfu" on public."dukamp_legacy_pal_nfu";
create policy "Admins read pal_nfu" on public."dukamp_legacy_pal_nfu"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PAL_PEN.DBF: PAL_PEN
create table if not exists public."dukamp_legacy_pal_pen" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_pen" enable row level security;
revoke all on public."dukamp_legacy_pal_pen" from public, anon;
grant select on public."dukamp_legacy_pal_pen" to authenticated;
grant all on public."dukamp_legacy_pal_pen" to service_role;
drop policy if exists "Admins read pal_pen" on public."dukamp_legacy_pal_pen";
create policy "Admins read pal_pen" on public."dukamp_legacy_pal_pen"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PAL_RRR.DBF: PAL_RRR
create table if not exists public."dukamp_legacy_pal_rrr" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_rrr" enable row level security;
revoke all on public."dukamp_legacy_pal_rrr" from public, anon;
grant select on public."dukamp_legacy_pal_rrr" to authenticated;
grant all on public."dukamp_legacy_pal_rrr" to service_role;
drop policy if exists "Admins read pal_rrr" on public."dukamp_legacy_pal_rrr";
create policy "Admins read pal_rrr" on public."dukamp_legacy_pal_rrr"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PAL_TBF.DBF: PAL_TBF
create table if not exists public."dukamp_legacy_pal_tbf" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_tbf" enable row level security;
revoke all on public."dukamp_legacy_pal_tbf" from public, anon;
grant select on public."dukamp_legacy_pal_tbf" to authenticated;
grant all on public."dukamp_legacy_pal_tbf" to service_role;
drop policy if exists "Admins read pal_tbf" on public."dukamp_legacy_pal_tbf";
create policy "Admins read pal_tbf" on public."dukamp_legacy_pal_tbf"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PAL_TCH.DBF: PAL_TCH
create table if not exists public."dukamp_legacy_pal_tch" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_tch" enable row level security;
revoke all on public."dukamp_legacy_pal_tch" from public, anon;
grant select on public."dukamp_legacy_pal_tch" to authenticated;
grant all on public."dukamp_legacy_pal_tch" to service_role;
drop policy if exists "Admins read pal_tch" on public."dukamp_legacy_pal_tch";
create policy "Admins read pal_tch" on public."dukamp_legacy_pal_tch"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PAL_VMC.DBF: PAL_VMC
create table if not exists public."dukamp_legacy_pal_vmc" (
  _row_id bigint generated always as identity primary key,
  "senha" varchar(10),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_pal_vmc" enable row level security;
revoke all on public."dukamp_legacy_pal_vmc" from public, anon;
grant select on public."dukamp_legacy_pal_vmc" to authenticated;
grant all on public."dukamp_legacy_pal_vmc" to service_role;
drop policy if exists "Admins read pal_vmc" on public."dukamp_legacy_pal_vmc";
create policy "Admins read pal_vmc" on public."dukamp_legacy_pal_vmc"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- REACDART.DBF: REACDART
create table if not exists public."dukamp_legacy_reacdart" (
  _row_id bigint generated always as identity primary key,
  "art" varchar(20),
  "seqemi" integer,
  "libera" varchar(1),
  "codres" integer,
  "artmes" varchar(6),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_reacdart" enable row level security;
revoke all on public."dukamp_legacy_reacdart" from public, anon;
grant select on public."dukamp_legacy_reacdart" to authenticated;
grant all on public."dukamp_legacy_reacdart" to service_role;
drop policy if exists "Admins read reacdart" on public."dukamp_legacy_reacdart";
create policy "Admins read reacdart" on public."dukamp_legacy_reacdart"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- REACULTU.DBF: REACULTU
create table if not exists public."dukamp_legacy_reacultu" (
  _row_id bigint generated always as identity primary key,
  "codcul" integer,
  "descul" varchar(30),
  "diagno" varchar(40),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_reacultu" enable row level security;
revoke all on public."dukamp_legacy_reacultu" from public, anon;
grant select on public."dukamp_legacy_reacultu" to authenticated;
grant all on public."dukamp_legacy_reacultu" to service_role;
drop policy if exists "Admins read reacultu" on public."dukamp_legacy_reacultu";
create policy "Admins read reacultu" on public."dukamp_legacy_reacultu"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- REAPROFI.DBF: REAPROFI
create table if not exists public."dukamp_legacy_reaprofi" (
  _row_id bigint generated always as identity primary key,
  "codres" integer,
  "prores" varchar(40),
  "cpfres" varchar(14),
  "creres" varchar(20),
  "endres" varchar(40),
  "cidres" varchar(30),
  "uferes" varchar(2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_reaprofi" enable row level security;
revoke all on public."dukamp_legacy_reaprofi" from public, anon;
grant select on public."dukamp_legacy_reaprofi" to authenticated;
grant all on public."dukamp_legacy_reaprofi" to service_role;
drop policy if exists "Admins read reaprofi" on public."dukamp_legacy_reaprofi";
create policy "Admins read reaprofi" on public."dukamp_legacy_reaprofi"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- REARECEI.DBF: REARECEI
create table if not exists public."dukamp_legacy_rearecei" (
  _row_id bigint generated always as identity primary key,
  "nronff" integer,
  "itenff" integer,
  "codpro" integer,
  "qtdpro" numeric(9,2),
  "unipro" varchar(3),
  "qtdemb" integer,
  "uniare" varchar(3),
  "codcul" integer,
  "art" varchar(20),
  "seqart" integer,
  "emirec" varchar(1),
  "datemi" date,
  "codres" integer,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_rearecei" enable row level security;
revoke all on public."dukamp_legacy_rearecei" from public, anon;
grant select on public."dukamp_legacy_rearecei" to authenticated;
grant all on public."dukamp_legacy_rearecei" to service_role;
drop policy if exists "Admins read rearecei" on public."dukamp_legacy_rearecei";
create policy "Admins read rearecei" on public."dukamp_legacy_rearecei"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- REARECTE.DBF: REARECTE
create table if not exists public."dukamp_legacy_rearecte" (
  _row_id bigint generated always as identity primary key,
  "codpro" integer,
  "codcul" integer,
  "nomcom" varchar(28),
  "gruqui" varchar(28),
  "dosapl" varchar(28),
  "intcar" varchar(28),
  "clatox" varchar(30),
  "concen" varchar(30),
  "formul" varchar(30),
  "nroapl" varchar(22),
  "modapl" varchar(55),
  "epoapl" varchar(55),
  "manint" varchar(60),
  "preuso" varchar(60),
  "prisoc" varchar(60),
  "advrel" varchar(60),
  "insemb" varchar(55),
  "eqppro" varchar(55),
  "infad1" varchar(60),
  "infad2" varchar(60),
  "infant" text,
  "qtdagu" numeric(7,1),
  "unipro" varchar(3),
  "qtdemb" integer,
  "uniare" varchar(3),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_rearecte" enable row level security;
revoke all on public."dukamp_legacy_rearecte" from public, anon;
grant select on public."dukamp_legacy_rearecte" to authenticated;
grant all on public."dukamp_legacy_rearecte" to service_role;
drop policy if exists "Admins read rearecte" on public."dukamp_legacy_rearecte";
create policy "Admins read rearecte" on public."dukamp_legacy_rearecte"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- RET_GTIN.DBF: RET_GTIN
create table if not exists public."dukamp_legacy_ret_gtin" (
  _row_id bigint generated always as identity primary key,
  "dadosxml" text,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_ret_gtin" enable row level security;
revoke all on public."dukamp_legacy_ret_gtin" from public, anon;
grant select on public."dukamp_legacy_ret_gtin" to authenticated;
grant all on public."dukamp_legacy_ret_gtin" to service_role;
drop policy if exists "Admins read ret_gtin" on public."dukamp_legacy_ret_gtin";
create policy "Admins read ret_gtin" on public."dukamp_legacy_ret_gtin"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- RRACORTI.DBF: RRACORTI
create table if not exists public."dukamp_legacy_rracorti" (
  _row_id bigint generated always as identity primary key,
  "vlmult" numeric(14,2),
  "txmult" numeric(5,2),
  "pricor" varchar(1),
  "txjuro" numeric(9,6),
  "mesdia" varchar(1),
  "smpcmp" varchar(1),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_rracorti" enable row level security;
revoke all on public."dukamp_legacy_rracorti" from public, anon;
grant select on public."dukamp_legacy_rracorti" to authenticated;
grant all on public."dukamp_legacy_rracorti" to service_role;
drop policy if exists "Admins read rracorti" on public."dukamp_legacy_rracorti";
create policy "Admins read rracorti" on public."dukamp_legacy_rracorti"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- RRADSPTI.DBF: RRADSPTI
create table if not exists public."dukamp_legacy_rradspti" (
  _row_id bigint generated always as identity primary key,
  "nrtit" integer,
  "data" date,
  "histo" varchar(30),
  "valor" numeric(12,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_rradspti" enable row level security;
revoke all on public."dukamp_legacy_rradspti" from public, anon;
grant select on public."dukamp_legacy_rradspti" to authenticated;
grant all on public."dukamp_legacy_rradspti" to service_role;
drop policy if exists "Admins read rradspti" on public."dukamp_legacy_rradspti";
create policy "Admins read rradspti" on public."dukamp_legacy_rradspti"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- RRALOGTI.DBF: RRALOGTI
create table if not exists public."dukamp_legacy_rralogti" (
  _row_id bigint generated always as identity primary key,
  "lnrtit" integer,
  "lclien" integer,
  "lvrtit" numeric(15,2),
  "lcarpa" integer,
  "ljuros" numeric(13,2),
  "ldesco" numeric(15,2),
  "lvecto" date,
  "lopera" varchar(1),
  "ldata" date,
  "lhora" varchar(8),
  "ljurct" numeric(12,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_rralogti" enable row level security;
revoke all on public."dukamp_legacy_rralogti" from public, anon;
grant select on public."dukamp_legacy_rralogti" to authenticated;
grant all on public."dukamp_legacy_rralogti" to service_role;
drop policy if exists "Admins read rralogti" on public."dukamp_legacy_rralogti";
create policy "Admins read rralogti" on public."dukamp_legacy_rralogti"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- RRASDCAR.DBF: RRASDCAR
create table if not exists public."dukamp_legacy_rrasdcar" (
  _row_id bigint generated always as identity primary key,
  "snrcar" integer,
  "santer" numeric(16,2),
  "sbaixa" numeric(15,2),
  "sdesco" numeric(15,2),
  "sestor" numeric(15,2),
  "scance" numeric(15,2),
  "stranr" numeric(15,2),
  "strans" numeric(15,2),
  "sinser" numeric(15,2),
  "satual" numeric(16,2),
  "sdtope" date,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_rrasdcar" enable row level security;
revoke all on public."dukamp_legacy_rrasdcar" from public, anon;
grant select on public."dukamp_legacy_rrasdcar" to authenticated;
grant all on public."dukamp_legacy_rrasdcar" to service_role;
drop policy if exists "Admins read rrasdcar" on public."dukamp_legacy_rrasdcar";
create policy "Admins read rrasdcar" on public."dukamp_legacy_rrasdcar"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- RRATITUL.DBF: Histórico de títulos a receber
create table if not exists public."dukamp_legacy_rratitul" (
  _row_id bigint generated always as identity primary key,
  "dnrtit" integer,
  "dclien" integer,
  "demiss" date,
  "dvrtit" numeric(15,2),
  "dvrabe" numeric(15,2),
  "dvecto" date,
  "dcarpa" integer,
  "dcarco" integer,
  "dsubcar" integer,
  "dvesubc" date,
  "dpagto" date,
  "djuros" numeric(13,2),
  "dvende" integer,
  "dtippg" varchar(2),
  "dpago" varchar(1),
  "dnosnro" varchar(15),
  "dflgurv" varchar(1),
  "dagecob" varchar(6),
  "ddscvct" numeric(5,2),
  "dobserv" varchar(15),
  "dtarifa" numeric(12,2),
  "mobserv" text,
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_rratitul" enable row level security;
revoke all on public."dukamp_legacy_rratitul" from public, anon;
grant select on public."dukamp_legacy_rratitul" to authenticated;
grant all on public."dukamp_legacy_rratitul" to service_role;
drop policy if exists "Admins read rratitul" on public."dukamp_legacy_rratitul";
create policy "Admins read rratitul" on public."dukamp_legacy_rratitul"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- SIALOGUS.DBF: Log de usuários
create table if not exists public."dukamp_legacy_sialogus" (
  _row_id bigint generated always as identity primary key,
  "programa" varchar(10),
  "codigo" varchar(15),
  "data" date,
  "hora" varchar(8),
  "descri" text,
  "usuario" integer,
  "nome" varchar(15),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_sialogus" enable row level security;
revoke all on public."dukamp_legacy_sialogus" from public, anon;
grant select on public."dukamp_legacy_sialogus" to authenticated;
grant all on public."dukamp_legacy_sialogus" to service_role;
drop policy if exists "Admins read sialogus" on public."dukamp_legacy_sialogus";
create policy "Admins read sialogus" on public."dukamp_legacy_sialogus"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- SIANATEX.DBF: SIANATEX
create table if not exists public."dukamp_legacy_sianatex" (
  _row_id bigint generated always as identity primary key,
  "nnatope2" varchar(4),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_sianatex" enable row level security;
revoke all on public."dukamp_legacy_sianatex" from public, anon;
grant select on public."dukamp_legacy_sianatex" to authenticated;
grant all on public."dukamp_legacy_sianatex" to service_role;
drop policy if exists "Admins read sianatex" on public."dukamp_legacy_sianatex";
create policy "Admins read sianatex" on public."dukamp_legacy_sianatex"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- T0040085.dbf: T0040085
create table if not exists public."dukamp_legacy_t0040085" (
  _row_id bigint generated always as identity primary key,
  "nropdi" integer,
  "iteped" integer,
  "qtdabe" numeric(10,3),
  "nomfor" varchar(20),
  "prvent" date,
  "nomcom" varchar(15),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_t0040085" enable row level security;
revoke all on public."dukamp_legacy_t0040085" from public, anon;
grant select on public."dukamp_legacy_t0040085" to authenticated;
grant all on public."dukamp_legacy_t0040085" to service_role;
drop policy if exists "Admins read t0040085" on public."dukamp_legacy_t0040085";
create policy "Admins read t0040085" on public."dukamp_legacy_t0040085"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- T0043395.dbf: T0043395
create table if not exists public."dukamp_legacy_t0043395" (
  _row_id bigint generated always as identity primary key,
  "nropdi" integer,
  "iteped" integer,
  "qtdabe" numeric(10,3),
  "nomfor" varchar(20),
  "prvent" date,
  "nomcom" varchar(15),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_t0043395" enable row level security;
revoke all on public."dukamp_legacy_t0043395" from public, anon;
grant select on public."dukamp_legacy_t0043395" to authenticated;
grant all on public."dukamp_legacy_t0043395" to service_role;
drop policy if exists "Admins read t0043395" on public."dukamp_legacy_t0043395";
create policy "Admins read t0043395" on public."dukamp_legacy_t0043395"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- T0043551.dbf: T0043551
create table if not exists public."dukamp_legacy_t0043551" (
  _row_id bigint generated always as identity primary key,
  "nropdi" integer,
  "iteped" integer,
  "qtdabe" numeric(10,3),
  "nomfor" varchar(20),
  "prvent" date,
  "nomcom" varchar(15),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_t0043551" enable row level security;
revoke all on public."dukamp_legacy_t0043551" from public, anon;
grant select on public."dukamp_legacy_t0043551" to authenticated;
grant all on public."dukamp_legacy_t0043551" to service_role;
drop policy if exists "Admins read t0043551" on public."dukamp_legacy_t0043551";
create policy "Admins read t0043551" on public."dukamp_legacy_t0043551"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- T2881190.dbf: T2881190
create table if not exists public."dukamp_legacy_t2881190" (
  _row_id bigint generated always as identity primary key,
  "tcodrep" integer,
  "trepvnd" numeric(18,2),
  "trepdev" numeric(18,2),
  "trepcus" numeric(18,2),
  "trepcad" numeric(18,2),
  "trepcsa" numeric(18,2),
  "trepcma" numeric(18,2),
  "tcomven" numeric(18,2),
  "tcomsac" numeric(18,2),
  "tcomadi" numeric(18,2),
  "tcommat" numeric(18,2),
  "tcomsup" numeric(18,2),
  "tcomger" numeric(18,2),
  "ttotton" numeric(10,3),
  "tvltotd" numeric(18,2),
  "tprzmed" numeric(18,2),
  "tvndnot" integer,
  "tvndped" integer,
  "ttotavi" numeric(18,2),
  "ttot30d" numeric(18,2),
  "ttot60d" numeric(18,2),
  "ttot90d" numeric(18,2),
  "ttot120" numeric(18,2),
  "ttot150" numeric(18,2),
  "ttot180" numeric(18,2),
  "ttot210" numeric(18,2),
  "ttotaci" numeric(18,2),
  "tcodsup" integer,
  "ttotadi" numeric(18,2),
  "ttotsac" numeric(18,2),
  "ttotmat" numeric(18,2),
  "tcomi01" numeric(10,2),
  "tcomi02" numeric(10,2),
  "tcomi03" numeric(10,2),
  "tcomi04" numeric(10,2),
  "tcomi05" numeric(10,2),
  "tcomi06" numeric(10,2),
  "tcomi07" numeric(10,2),
  "tcomi08" numeric(10,2),
  "tcomi09" numeric(10,2),
  "tcomi10" numeric(10,2),
  "tcomi11" numeric(10,2),
  "tcomi12" numeric(10,2),
  "ttotbon" numeric(12,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_t2881190" enable row level security;
revoke all on public."dukamp_legacy_t2881190" from public, anon;
grant select on public."dukamp_legacy_t2881190" to authenticated;
grant all on public."dukamp_legacy_t2881190" to service_role;
drop policy if exists "Admins read t2881190" on public."dukamp_legacy_t2881190";
create policy "Admins read t2881190" on public."dukamp_legacy_t2881190"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- T3071359.dbf: T3071359
create table if not exists public."dukamp_legacy_t3071359" (
  _row_id bigint generated always as identity primary key,
  "tnroite" integer,
  "tcodpro" integer,
  "tnompro" varchar(45),
  "tquapro" numeric(11,4),
  "tpreuni" numeric(18,5),
  "tpretab" numeric(15,2),
  "tunidad" varchar(3),
  "talqicm" numeric(5,2),
  "ttotite" numeric(12,2),
  "tvlricm" numeric(10,2),
  "tbscicm" numeric(12,2),
  "tcodtri" varchar(3),
  "tbcicst" numeric(12,2),
  "tvricst" numeric(10,2),
  "talqred" numeric(5,2),
  "tcbenef" varchar(8),
  "talqipi" numeric(5,2),
  "tbscipi" numeric(12,2),
  "tvlripi" numeric(10,2),
  "talqpis" numeric(5,3),
  "tbscpis" numeric(12,2),
  "tvlrpis" numeric(10,2),
  "tcstpis" varchar(2),
  "talqcof" numeric(5,3),
  "tbsccof" numeric(12,2),
  "tvlrcof" numeric(10,2),
  "tcstcof" varchar(2),
  "tcodncm" varchar(8),
  "tvlrfre" numeric(10,2),
  "tdesace" numeric(10,2),
  "tvlrdes" numeric(10,2),
  "tunidad_2" varchar(3),
  "tcfopit" varchar(4),
  "tcest" integer,
  "tpedcmp" integer,
  "titecmp" integer,
  "chave_ref" varchar(44),
  "item_ref" integer,
  "tpedforn" varchar(15),
  "tcstcmp" numeric(12,2),
  "tcstbrut" numeric(12,2),
  "tcusfina" numeric(12,2),
  "tcstcarg" numeric(9,2),
  "tperfina" numeric(6,2),
  "tvlrfrt1" numeric(9,2),
  "tvlrfrt2" numeric(9,2),
  "tprzvnd" date,
  "tprzcmp" date,
  "tfincust" numeric(7,3),
  "cstis" varchar(3),
  "clastribis" varchar(6),
  "bcis" numeric(15,2),
  "pis" numeric(8,4),
  "pisespec" numeric(8,4),
  "untribis" varchar(6),
  "qttribis" numeric(11,4),
  "vis" numeric(15,2),
  "cstibscbs" varchar(3),
  "clastrib" varchar(6),
  "bcibscbs" numeric(15,2),
  "pibsuf" numeric(8,4),
  "pdifuf" numeric(8,4),
  "vdifuf" numeric(15,2),
  "vdevtriuf" numeric(15,2),
  "predalquf" numeric(8,4),
  "palqefeuf" numeric(8,4),
  "vibsuf" numeric(15,2),
  "pibsmu" numeric(8,4),
  "pdifmu" numeric(8,4),
  "vdifmu" numeric(15,2),
  "vdevtrimu" numeric(15,2),
  "predalqmu" numeric(8,4),
  "palqefemu" numeric(8,4),
  "vibsmu" numeric(15,2),
  "pcbs" numeric(8,4),
  "pdifcbs" numeric(8,4),
  "vdifcbs" numeric(15,2),
  "vdevtricbs" numeric(15,2),
  "predalqcbs" numeric(8,4),
  "palqefecbs" numeric(8,4),
  "vcbs" numeric(15,2),
  "vtotite" numeric(15,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_t3071359" enable row level security;
revoke all on public."dukamp_legacy_t3071359" from public, anon;
grant select on public."dukamp_legacy_t3071359" to authenticated;
grant all on public."dukamp_legacy_t3071359" to service_role;
drop policy if exists "Admins read t3071359" on public."dukamp_legacy_t3071359";
create policy "Admins read t3071359" on public."dukamp_legacy_t3071359"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- T3071415.dbf: T3071415
create table if not exists public."dukamp_legacy_t3071415" (
  _row_id bigint generated always as identity primary key,
  "trecno" integer,
  "ttipobs" integer,
  "tobserv" varchar(200),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_t3071415" enable row level security;
revoke all on public."dukamp_legacy_t3071415" from public, anon;
grant select on public."dukamp_legacy_t3071415" to authenticated;
grant all on public."dukamp_legacy_t3071415" to service_role;
drop policy if exists "Admins read t3071415" on public."dukamp_legacy_t3071415";
create policy "Admins read t3071415" on public."dukamp_legacy_t3071415"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- T3329334.dbf: T3329334
create table if not exists public."dukamp_legacy_t3329334" (
  _row_id bigint generated always as identity primary key,
  "tnumnota" integer,
  "ttotnota" numeric(18,2),
  "tdatemis" date,
  "tcodvend" integer,
  "tstatus" varchar(15),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_t3329334" enable row level security;
revoke all on public."dukamp_legacy_t3329334" from public, anon;
grant select on public."dukamp_legacy_t3329334" to authenticated;
grant all on public."dukamp_legacy_t3329334" to service_role;
drop policy if exists "Admins read t3329334" on public."dukamp_legacy_t3329334";
create policy "Admins read t3329334" on public."dukamp_legacy_t3329334"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- T3329350.dbf: T3329350
create table if not exists public."dukamp_legacy_t3329350" (
  _row_id bigint generated always as identity primary key,
  "tnroite" integer,
  "tcodpro" integer,
  "tnompro" varchar(45),
  "tquapro" numeric(9,3),
  "tpreuni" numeric(15,3),
  "tpretab" numeric(15,2),
  "tunidad" varchar(3),
  "talqicm" numeric(5,2),
  "ttotite" numeric(12,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_t3329350" enable row level security;
revoke all on public."dukamp_legacy_t3329350" from public, anon;
grant select on public."dukamp_legacy_t3329350" to authenticated;
grant all on public."dukamp_legacy_t3329350" to service_role;
drop policy if exists "Admins read t3329350" on public."dukamp_legacy_t3329350";
create policy "Admins read t3329350" on public."dukamp_legacy_t3329350"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- T3329364.dbf: T3329364
create table if not exists public."dukamp_legacy_t3329364" (
  _row_id bigint generated always as identity primary key,
  "ttipobs" integer,
  "tobserv" varchar(200),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_t3329364" enable row level security;
revoke all on public."dukamp_legacy_t3329364" from public, anon;
grant select on public."dukamp_legacy_t3329364" to authenticated;
grant all on public."dukamp_legacy_t3329364" to service_role;
drop policy if exists "Admins read t3329364" on public."dukamp_legacy_t3329364";
create policy "Admins read t3329364" on public."dukamp_legacy_t3329364"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- T3615863.dbf: T3615863
create table if not exists public."dukamp_legacy_t3615863" (
  _row_id bigint generated always as identity primary key,
  "tcodfor" integer,
  "tcodpro" integer,
  "tnompro" varchar(45),
  "ttotcom" numeric(18,2),
  "tqtdcom" numeric(10,2),
  "tvltotd" numeric(18,2),
  "tprzmed" numeric(18,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_t3615863" enable row level security;
revoke all on public."dukamp_legacy_t3615863" from public, anon;
grant select on public."dukamp_legacy_t3615863" to authenticated;
grant all on public."dukamp_legacy_t3615863" to service_role;
drop policy if exists "Admins read t3615863" on public."dukamp_legacy_t3615863";
create policy "Admins read t3615863" on public."dukamp_legacy_t3615863"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- T3968533.dbf: T3968533
create table if not exists public."dukamp_legacy_t3968533" (
  _row_id bigint generated always as identity primary key,
  "tbnomusu" varchar(10),
  "tbdata" date,
  "tbhora" varchar(8),
  "tbprzvnd" integer,
  "tbpreco1" numeric(9,2),
  "tbpreco2" numeric(9,2),
  "tbcusrea" numeric(10,2),
  "tbvlrfrt" numeric(10,2),
  "tbcrgdes" numeric(10,2),
  "tbpermin" numeric(6,2),
  "tbprzvmi" varchar(1),
  "tbprzcom" integer,
  "tbdeprec" numeric(5,2),
  "tbcusfin" numeric(10,2),
  "tbperaju" numeric(6,2),
  "tbcstaju" numeric(10,2),
  "tbprcmin" numeric(10,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_t3968533" enable row level security;
revoke all on public."dukamp_legacy_t3968533" from public, anon;
grant select on public."dukamp_legacy_t3968533" to authenticated;
grant all on public."dukamp_legacy_t3968533" to service_role;
drop policy if exists "Admins read t3968533" on public."dukamp_legacy_t3968533";
create policy "Admins read t3968533" on public."dukamp_legacy_t3968533"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- T4299500.dbf: T4299500
create table if not exists public."dukamp_legacy_t4299500" (
  _row_id bigint generated always as identity primary key,
  "tbnomusu" varchar(10),
  "tbdata" date,
  "tbhora" varchar(8),
  "tbprzvnd" integer,
  "tbpreco1" numeric(9,2),
  "tbpreco2" numeric(9,2),
  "tbcusrea" numeric(10,2),
  "tbvlrfrt" numeric(10,2),
  "tbcrgdes" numeric(10,2),
  "tbpermin" numeric(6,2),
  "tbprzvmi" varchar(1),
  "tbprzcom" integer,
  "tbdeprec" numeric(5,2),
  "tbcusfin" numeric(10,2),
  "tbperaju" numeric(6,2),
  "tbcstaju" numeric(10,2),
  "tbprcmin" numeric(10,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_t4299500" enable row level security;
revoke all on public."dukamp_legacy_t4299500" from public, anon;
grant select on public."dukamp_legacy_t4299500" to authenticated;
grant all on public."dukamp_legacy_t4299500" to service_role;
drop policy if exists "Admins read t4299500" on public."dukamp_legacy_t4299500";
create policy "Admins read t4299500" on public."dukamp_legacy_t4299500"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- T4315071.dbf: T4315071
create table if not exists public."dukamp_legacy_t4315071" (
  _row_id bigint generated always as identity primary key,
  "tbnomusu" varchar(10),
  "tbdata" date,
  "tbhora" varchar(8),
  "tbprzvnd" integer,
  "tbpreco1" numeric(9,2),
  "tbpreco2" numeric(9,2),
  "tbcusrea" numeric(10,2),
  "tbvlrfrt" numeric(10,2),
  "tbcrgdes" numeric(10,2),
  "tbpermin" numeric(6,2),
  "tbprzvmi" varchar(1),
  "tbprzcom" integer,
  "tbdeprec" numeric(5,2),
  "tbcusfin" numeric(10,2),
  "tbperaju" numeric(6,2),
  "tbcstaju" numeric(10,2),
  "tbprcmin" numeric(10,2),
  _imported_at timestamptz not null default now()
);
alter table public."dukamp_legacy_t4315071" enable row level security;
revoke all on public."dukamp_legacy_t4315071" from public, anon;
grant select on public."dukamp_legacy_t4315071" to authenticated;
grant all on public."dukamp_legacy_t4315071" to service_role;
drop policy if exists "Admins read t4315071" on public."dukamp_legacy_t4315071";
create policy "Admins read t4315071" on public."dukamp_legacy_t4315071"
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

insert into public.dukamp_legacy_tables
  (source_name, target_name, label, module, source_file, source_record_count, columns)
values
('cmacbene', 'dukamp_legacy_cmacbene', 'CMACBENE', 'Compras e almoxarifado', 'CMACBENE.DBF', 309, '[{"name": "cbenef", "source": "CBENEF", "type": "varchar(8)", "searchable": true}, {"name": "descri", "source": "DESCRI", "type": "varchar(30)", "searchable": true}, {"name": "objeto", "source": "OBJETO", "type": "varchar(30)", "searchable": true}]'::jsonb),
('cmacdfis', 'dukamp_legacy_cmacdfis', 'CMACDFIS', 'Compras e almoxarifado', 'CMACDFIS.DBF', 67, '[{"name": "codfis", "source": "CODFIS", "type": "integer", "searchable": false}, {"name": "desfis1", "source": "DESFIS1", "type": "varchar(65)", "searchable": true}, {"name": "desfis2", "source": "DESFIS2", "type": "varchar(65)", "searchable": true}, {"name": "tipo", "source": "TIPO", "type": "varchar(20)", "searchable": true}, {"name": "dificm", "source": "DIFICM", "type": "numeric(5,2)", "searchable": false}, {"name": "cbenef", "source": "CBENEF", "type": "varchar(8)", "searchable": true}]'::jsonb),
('cmacdncm', 'dukamp_legacy_cmacdncm', 'CMACDNCM', 'Compras e almoxarifado', 'CMACDNCM.DBF', 10230, '[{"name": "codncm", "source": "CODNCM", "type": "integer", "searchable": false}, {"name": "iva_sp", "source": "IVA_SP", "type": "numeric(6,2)", "searchable": false}, {"name": "mva_mg", "source": "MVA_MG", "type": "numeric(6,2)", "searchable": false}, {"name": "prt_mg", "source": "PRT_MG", "type": "integer", "searchable": false}, {"name": "dic_mg", "source": "DIC_MG", "type": "numeric(5,2)", "searchable": false}, {"name": "mva_mt", "source": "MVA_MT", "type": "numeric(6,2)", "searchable": false}, {"name": "prt_mt", "source": "PRT_MT", "type": "integer", "searchable": false}, {"name": "dic_mt", "source": "DIC_MT", "type": "numeric(5,2)", "searchable": false}, {"name": "mva_ms", "source": "MVA_MS", "type": "numeric(6,2)", "searchable": false}, {"name": "prt_ms", "source": "PRT_MS", "type": "integer", "searchable": false}, {"name": "dic_ms", "source": "DIC_MS", "type": "numeric(5,2)", "searchable": false}, {"name": "ibpt_nac", "source": "IBPT_NAC", "type": "numeric(5,2)", "searchable": false}, {"name": "ibpt_imp", "source": "IBPT_IMP", "type": "numeric(5,2)", "searchable": false}]'::jsonb),
('cmacmpeq', 'dukamp_legacy_cmacmpeq', 'CMACMPEQ', 'Compras e almoxarifado', 'CMACMPEQ.DBF', 1, '[{"name": "codigo", "source": "CODIGO", "type": "integer", "searchable": false}, {"name": "descri", "source": "DESCRI", "type": "varchar(40)", "searchable": true}, {"name": "compon", "source": "COMPON", "type": "text", "searchable": true}]'::jsonb),
('cmafalta', 'dukamp_legacy_cmafalta', 'CMAFALTA', 'Compras e almoxarifado', 'CMAFALTA.DBF', 2, '[{"name": "codigo", "source": "CODIGO", "type": "integer", "searchable": false}, {"name": "descri", "source": "DESCRI", "type": "varchar(40)", "searchable": true}, {"name": "falta", "source": "FALTA", "type": "text", "searchable": true}]'::jsonb),
('cmaibxpc', 'dukamp_legacy_cmaibxpc', 'CMAIBXPC', 'Compras e almoxarifado', 'CMAIBXPC.DBF', 7401, '[{"name": "segmen", "source": "SEGMEN", "type": "integer", "searchable": false}, {"name": "codfor", "source": "CODFOR", "type": "integer", "searchable": false}, {"name": "nronff", "source": "NRONFF", "type": "varchar(10)", "searchable": true}, {"name": "nroite", "source": "NROITE", "type": "integer", "searchable": false}, {"name": "numped", "source": "NUMPED", "type": "integer", "searchable": false}, {"name": "iteped", "source": "ITEPED", "type": "integer", "searchable": false}, {"name": "quabxa", "source": "QUABXA", "type": "numeric(9,2)", "searchable": false}, {"name": "datped", "source": "DATPED", "type": "date", "searchable": false}, {"name": "prcped", "source": "PRCPED", "type": "numeric(13,2)", "searchable": false}, {"name": "qtdarc", "source": "QTDARC", "type": "numeric(9,2)", "searchable": false}]'::jsonb),
('cmaitent', 'dukamp_legacy_cmaitent', 'Itens das notas de entrada', 'Compras e almoxarifado', 'CMAITENT.DBF', 37841, '[{"name": "segmen", "source": "SEGMEN", "type": "integer", "searchable": false}, {"name": "codfor", "source": "CODFOR", "type": "integer", "searchable": false}, {"name": "nronff", "source": "NRONFF", "type": "varchar(10)", "searchable": true}, {"name": "nroite", "source": "NROITE", "type": "integer", "searchable": false}, {"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "quapro", "source": "QUAPRO", "type": "numeric(9,2)", "searchable": false}, {"name": "cstpro", "source": "CSTPRO", "type": "numeric(12,2)", "searchable": false}, {"name": "perdsc", "source": "PERDSC", "type": "numeric(7,4)", "searchable": false}, {"name": "peripi", "source": "PERIPI", "type": "numeric(5,2)", "searchable": false}, {"name": "pericm", "source": "PERICM", "type": "numeric(5,2)", "searchable": false}, {"name": "prerec", "source": "PREREC", "type": "numeric(12,4)", "searchable": false}, {"name": "nompro", "source": "NOMPRO", "type": "varchar(45)", "searchable": true}, {"name": "cstrea", "source": "CSTREA", "type": "numeric(12,2)", "searchable": false}, {"name": "pretab", "source": "PRETAB", "type": "numeric(15,2)", "searchable": false}, {"name": "mrgprd", "source": "MRGPRD", "type": "numeric(5,2)", "searchable": false}, {"name": "vlrfre", "source": "VLRFRE", "type": "numeric(15,2)", "searchable": false}, {"name": "quaalm", "source": "QUAALM", "type": "numeric(9,2)", "searchable": false}, {"name": "qualoj", "source": "QUALOJ", "type": "numeric(9,2)", "searchable": false}, {"name": "basicm", "source": "BASICM", "type": "numeric(12,2)", "searchable": false}, {"name": "redicm", "source": "REDICM", "type": "numeric(5,2)", "searchable": false}, {"name": "vlripi", "source": "VLRIPI", "type": "numeric(12,2)", "searchable": false}, {"name": "totite", "source": "TOTITE", "type": "numeric(12,2)", "searchable": false}, {"name": "codtri", "source": "CODTRI", "type": "integer", "searchable": false}, {"name": "cfopit", "source": "CFOPIT", "type": "integer", "searchable": false}, {"name": "codnbm", "source": "CODNBM", "type": "integer", "searchable": false}, {"name": "valics", "source": "VALICS", "type": "numeric(10,2)", "searchable": false}, {"name": "vlicst", "source": "VLICST", "type": "numeric(12,2)", "searchable": false}, {"name": "vlfret", "source": "VLFRET", "type": "numeric(10,2)", "searchable": false}, {"name": "vldesc", "source": "VLDESC", "type": "numeric(10,2)", "searchable": false}, {"name": "vlsegu", "source": "VLSEGU", "type": "numeric(10,2)", "searchable": false}, {"name": "vloutr", "source": "VLOUTR", "type": "numeric(10,2)", "searchable": false}, {"name": "cdprfo", "source": "CDPRFO", "type": "varchar(20)", "searchable": true}, {"name": "vbicst", "source": "VBICST", "type": "numeric(12,2)", "searchable": false}, {"name": "cest", "source": "CEST", "type": "integer", "searchable": false}, {"name": "bpericm", "source": "BPERICM", "type": "numeric(5,2)", "searchable": false}, {"name": "bbasicm", "source": "BBASICM", "type": "numeric(12,2)", "searchable": false}, {"name": "bredicm", "source": "BREDICM", "type": "numeric(5,2)", "searchable": false}, {"name": "cusmed", "source": "CUSMED", "type": "numeric(15,2)", "searchable": false}, {"name": "difcus", "source": "DIFCUS", "type": "numeric(12,2)", "searchable": false}, {"name": "mrgaju", "source": "MRGAJU", "type": "numeric(10,2)", "searchable": false}, {"name": "mrgicmaju", "source": "MRGICMAJU", "type": "numeric(6,2)", "searchable": false}, {"name": "mrgcstaju", "source": "MRGCSTAJU", "type": "numeric(15,2)", "searchable": false}]'::jsonb),
('cmaitped', 'dukamp_legacy_cmaitped', 'Itens dos pedidos de compra', 'Compras e almoxarifado', 'CMAITPED.DBF', 6330, '[{"name": "pcnropdi", "source": "PCNROPDI", "type": "integer", "searchable": false}, {"name": "pciteped", "source": "PCITEPED", "type": "integer", "searchable": false}, {"name": "pccodpro", "source": "PCCODPRO", "type": "integer", "searchable": false}, {"name": "pcqtdpro", "source": "PCQTDPRO", "type": "numeric(10,3)", "searchable": false}, {"name": "pcvlruni", "source": "PCVLRUNI", "type": "numeric(13,3)", "searchable": false}, {"name": "pcperipi", "source": "PCPERIPI", "type": "numeric(5,2)", "searchable": false}, {"name": "pcqtdent", "source": "PCQTDENT", "type": "numeric(10,3)", "searchable": false}, {"name": "pcultent", "source": "PCULTENT", "type": "date", "searchable": false}, {"name": "pcdespro", "source": "PCDESPRO", "type": "varchar(40)", "searchable": true}, {"name": "pcprerec", "source": "PCPREREC", "type": "numeric(15,3)", "searchable": false}, {"name": "pcdscit1", "source": "PCDSCIT1", "type": "numeric(5,2)", "searchable": false}, {"name": "pcdscit2", "source": "PCDSCIT2", "type": "numeric(5,2)", "searchable": false}, {"name": "pcdscit3", "source": "PCDSCIT3", "type": "numeric(5,2)", "searchable": false}, {"name": "pcdscit4", "source": "PCDSCIT4", "type": "numeric(5,2)", "searchable": false}, {"name": "pcdscit5", "source": "PCDSCIT5", "type": "numeric(5,2)", "searchable": false}]'::jsonb),
('cmametas', 'dukamp_legacy_cmametas', 'CMAMETAS', 'Compras e almoxarifado', 'CMAMETAS.DBF', 549, '[{"name": "mcanomes", "source": "MCANOMES", "type": "varchar(6)", "searchable": true}, {"name": "mccodlin", "source": "MCCODLIN", "type": "integer", "searchable": false}, {"name": "mcvalmet", "source": "MCVALMET", "type": "numeric(12,2)", "searchable": false}, {"name": "mcvaldup", "source": "MCVALDUP", "type": "numeric(12,2)", "searchable": false}, {"name": "mcpermet", "source": "MCPERMET", "type": "numeric(5,2)", "searchable": false}, {"name": "mcliqmet", "source": "MCLIQMET", "type": "numeric(18,2)", "searchable": false}, {"name": "mcvalpdc", "source": "MCVALPDC", "type": "numeric(18,2)", "searchable": false}, {"name": "mcvalrec", "source": "MCVALREC", "type": "numeric(18,2)", "searchable": false}, {"name": "mcprvrec", "source": "MCPRVREC", "type": "numeric(18,2)", "searchable": false}, {"name": "mcvaldsp", "source": "MCVALDSP", "type": "numeric(18,2)", "searchable": false}, {"name": "mcsalfin", "source": "MCSALFIN", "type": "numeric(18,2)", "searchable": false}]'::jsonb),
('cmametpg', 'dukamp_legacy_cmametpg', 'CMAMETPG', 'Compras e almoxarifado', 'CMAMETPG.DBF', 6, '[{"name": "ano", "source": "ANO", "type": "varchar(4)", "searchable": true}, {"name": "mcfatano", "source": "MCFATANO", "type": "numeric(18,2)", "searchable": false}, {"name": "mc000", "source": "MC000", "type": "numeric(5,2)", "searchable": false}, {"name": "mc030", "source": "MC030", "type": "numeric(5,2)", "searchable": false}, {"name": "mc060", "source": "MC060", "type": "numeric(5,2)", "searchable": false}, {"name": "mc090", "source": "MC090", "type": "numeric(5,2)", "searchable": false}, {"name": "mc120", "source": "MC120", "type": "numeric(5,2)", "searchable": false}, {"name": "mc150", "source": "MC150", "type": "numeric(5,2)", "searchable": false}, {"name": "mc180", "source": "MC180", "type": "numeric(5,2)", "searchable": false}, {"name": "mc210", "source": "MC210", "type": "numeric(5,2)", "searchable": false}, {"name": "mc240", "source": "MC240", "type": "numeric(5,2)", "searchable": false}, {"name": "mc270", "source": "MC270", "type": "numeric(5,2)", "searchable": false}, {"name": "mc300", "source": "MC300", "type": "numeric(5,2)", "searchable": false}, {"name": "mc330", "source": "MC330", "type": "numeric(5,2)", "searchable": false}, {"name": "perlu01", "source": "PERLU01", "type": "numeric(5,2)", "searchable": false}, {"name": "perlu02", "source": "PERLU02", "type": "numeric(5,2)", "searchable": false}, {"name": "perlu03", "source": "PERLU03", "type": "numeric(5,2)", "searchable": false}, {"name": "perlu04", "source": "PERLU04", "type": "numeric(5,2)", "searchable": false}, {"name": "perlu05", "source": "PERLU05", "type": "numeric(5,2)", "searchable": false}, {"name": "perlu06", "source": "PERLU06", "type": "numeric(5,2)", "searchable": false}, {"name": "perlu07", "source": "PERLU07", "type": "numeric(5,2)", "searchable": false}, {"name": "perlu08", "source": "PERLU08", "type": "numeric(5,2)", "searchable": false}, {"name": "perlu09", "source": "PERLU09", "type": "numeric(5,2)", "searchable": false}, {"name": "perlu10", "source": "PERLU10", "type": "numeric(5,2)", "searchable": false}, {"name": "perlu11", "source": "PERLU11", "type": "numeric(5,2)", "searchable": false}, {"name": "perlu12", "source": "PERLU12", "type": "numeric(5,2)", "searchable": false}, {"name": "perce01", "source": "PERCE01", "type": "numeric(5,2)", "searchable": false}, {"name": "perce02", "source": "PERCE02", "type": "numeric(5,2)", "searchable": false}, {"name": "perce03", "source": "PERCE03", "type": "numeric(5,2)", "searchable": false}, {"name": "perce04", "source": "PERCE04", "type": "numeric(5,2)", "searchable": false}, {"name": "perce05", "source": "PERCE05", "type": "numeric(5,2)", "searchable": false}, {"name": "perce06", "source": "PERCE06", "type": "numeric(5,2)", "searchable": false}, {"name": "perce07", "source": "PERCE07", "type": "numeric(5,2)", "searchable": false}, {"name": "perce08", "source": "PERCE08", "type": "numeric(5,2)", "searchable": false}, {"name": "perce09", "source": "PERCE09", "type": "numeric(5,2)", "searchable": false}, {"name": "perce10", "source": "PERCE10", "type": "numeric(5,2)", "searchable": false}, {"name": "perce11", "source": "PERCE11", "type": "numeric(5,2)", "searchable": false}, {"name": "perce12", "source": "PERCE12", "type": "numeric(5,2)", "searchable": false}, {"name": "prvft01", "source": "PRVFT01", "type": "numeric(18,2)", "searchable": false}, {"name": "prvft02", "source": "PRVFT02", "type": "numeric(18,2)", "searchable": false}, {"name": "prvft03", "source": "PRVFT03", "type": "numeric(18,2)", "searchable": false}, {"name": "prvft04", "source": "PRVFT04", "type": "numeric(18,2)", "searchable": false}, {"name": "prvft05", "source": "PRVFT05", "type": "numeric(18,2)", "searchable": false}, {"name": "prvft06", "source": "PRVFT06", "type": "numeric(18,2)", "searchable": false}, {"name": "prvft07", "source": "PRVFT07", "type": "numeric(18,2)", "searchable": false}, {"name": "prvft08", "source": "PRVFT08", "type": "numeric(18,2)", "searchable": false}, {"name": "prvft09", "source": "PRVFT09", "type": "numeric(18,2)", "searchable": false}, {"name": "prvft10", "source": "PRVFT10", "type": "numeric(18,2)", "searchable": false}, {"name": "prvft11", "source": "PRVFT11", "type": "numeric(18,2)", "searchable": false}, {"name": "prvft12", "source": "PRVFT12", "type": "numeric(18,2)", "searchable": false}]'::jsonb),
('cmanoten', 'dukamp_legacy_cmanoten', 'Notas de entrada', 'Compras e almoxarifado', 'CMANOTEN.DBF', 16471, '[{"name": "segmen", "source": "SEGMEN", "type": "integer", "searchable": false}, {"name": "codfor", "source": "CODFOR", "type": "integer", "searchable": false}, {"name": "nronff", "source": "NRONFF", "type": "varchar(10)", "searchable": true}, {"name": "datemi", "source": "DATEMI", "type": "date", "searchable": false}, {"name": "valnot", "source": "VALNOT", "type": "numeric(15,2)", "searchable": false}, {"name": "valfre", "source": "VALFRE", "type": "numeric(12,2)", "searchable": false}, {"name": "valdsp", "source": "VALDSP", "type": "numeric(12,2)", "searchable": false}, {"name": "valdsc", "source": "VALDSC", "type": "numeric(12,2)", "searchable": false}, {"name": "vlbfre", "source": "VLBFRE", "type": "numeric(15,2)", "searchable": false}, {"name": "vlbdsp", "source": "VLBDSP", "type": "numeric(15,2)", "searchable": false}, {"name": "vlbdsc", "source": "VLBDSC", "type": "numeric(15,2)", "searchable": false}, {"name": "atucst", "source": "ATUCST", "type": "varchar(1)", "searchable": true}, {"name": "cndpgt", "source": "CNDPGT", "type": "varchar(10)", "searchable": true}, {"name": "flglib", "source": "FLGLIB", "type": "varchar(1)", "searchable": true}, {"name": "perfrt", "source": "PERFRT", "type": "numeric(5,2)", "searchable": false}, {"name": "perfin", "source": "PERFIN", "type": "numeric(5,2)", "searchable": false}, {"name": "valicm", "source": "VALICM", "type": "numeric(13,2)", "searchable": false}, {"name": "vlbicm", "source": "VLBICM", "type": "numeric(15,2)", "searchable": false}, {"name": "dticms", "source": "DTICMS", "type": "date", "searchable": false}, {"name": "dathoj", "source": "DATHOJ", "type": "date", "searchable": false}, {"name": "codfis", "source": "CODFIS", "type": "integer", "searchable": false}, {"name": "serie", "source": "SERIE", "type": "varchar(3)", "searchable": true}, {"name": "flag", "source": "FLAG", "type": "varchar(1)", "searchable": true}, {"name": "uf", "source": "UF", "type": "varchar(2)", "searchable": true}, {"name": "cgc", "source": "CGC", "type": "varchar(14)", "searchable": true}, {"name": "inscr", "source": "INSCR", "type": "varchar(16)", "searchable": true}, {"name": "datdig", "source": "DATDIG", "type": "date", "searchable": false}, {"name": "especie", "source": "ESPECIE", "type": "varchar(3)", "searchable": true}, {"name": "nomfor", "source": "NOMFOR", "type": "varchar(35)", "searchable": true}, {"name": "fnrocnh", "source": "FNROCNH", "type": "varchar(10)", "searchable": true}, {"name": "fnomfor", "source": "FNOMFOR", "type": "varchar(35)", "searchable": true}, {"name": "fuf", "source": "FUF", "type": "varchar(2)", "searchable": true}, {"name": "fcgc", "source": "FCGC", "type": "varchar(14)", "searchable": true}, {"name": "finscr", "source": "FINSCR", "type": "varchar(16)", "searchable": true}, {"name": "fserie", "source": "FSERIE", "type": "varchar(3)", "searchable": true}, {"name": "fespeci", "source": "FESPECI", "type": "varchar(3)", "searchable": true}, {"name": "fcodfis", "source": "FCODFIS", "type": "integer", "searchable": false}, {"name": "fdatemi", "source": "FDATEMI", "type": "date", "searchable": false}, {"name": "fvalfrt", "source": "FVALFRT", "type": "numeric(12,2)", "searchable": false}, {"name": "fbasicm", "source": "FBASICM", "type": "numeric(12,2)", "searchable": false}, {"name": "fpericm", "source": "FPERICM", "type": "numeric(5,2)", "searchable": false}, {"name": "fvlricm", "source": "FVLRICM", "type": "numeric(10,2)", "searchable": false}, {"name": "nvalfrt", "source": "NVALFRT", "type": "numeric(12,2)", "searchable": false}, {"name": "npericm", "source": "NPERICM", "type": "numeric(5,2)", "searchable": false}, {"name": "nvlricm", "source": "NVLRICM", "type": "numeric(10,2)", "searchable": false}, {"name": "nbasicm", "source": "NBASICM", "type": "numeric(12,2)", "searchable": false}, {"name": "nvaldsp", "source": "NVALDSP", "type": "numeric(12,2)", "searchable": false}, {"name": "npericd", "source": "NPERICD", "type": "numeric(5,2)", "searchable": false}, {"name": "nvlricd", "source": "NVLRICD", "type": "numeric(10,2)", "searchable": false}, {"name": "nbasicd", "source": "NBASICD", "type": "numeric(12,2)", "searchable": false}, {"name": "codemp", "source": "CODEMP", "type": "integer", "searchable": false}, {"name": "valics", "source": "VALICS", "type": "numeric(10,2)", "searchable": false}, {"name": "vlbics", "source": "VLBICS", "type": "numeric(12,2)", "searchable": false}, {"name": "vtpics", "source": "VTPICS", "type": "numeric(12,2)", "searchable": false}, {"name": "chave_nfe", "source": "CHAVE_NFE", "type": "varchar(44)", "searchable": true}, {"name": "prot_nfe", "source": "PROT_NFE", "type": "varchar(20)", "searchable": true}, {"name": "cnae", "source": "CNAE", "type": "varchar(7)", "searchable": true}, {"name": "codibge", "source": "CODIBGE", "type": "varchar(7)", "searchable": true}, {"name": "codpais", "source": "CODPAIS", "type": "varchar(4)", "searchable": true}, {"name": "nompais", "source": "NOMPAIS", "type": "varchar(30)", "searchable": true}, {"name": "endfor", "source": "ENDFOR", "type": "varchar(60)", "searchable": true}, {"name": "endnum", "source": "ENDNUM", "type": "varchar(10)", "searchable": true}, {"name": "baifor", "source": "BAIFOR", "type": "varchar(30)", "searchable": true}, {"name": "ind_emit", "source": "IND_EMIT", "type": "varchar(1)", "searchable": true}, {"name": "datsai", "source": "DATSAI", "type": "date", "searchable": false}, {"name": "antecipa", "source": "ANTECIPA", "type": "varchar(1)", "searchable": true}, {"name": "crt", "source": "CRT", "type": "varchar(1)", "searchable": true}, {"name": "vcgc", "source": "VCGC", "type": "varchar(14)", "searchable": true}, {"name": "vfcgc", "source": "VFCGC", "type": "varchar(14)", "searchable": true}]'::jsonb),
('cmapedid', 'dukamp_legacy_cmapedid', 'Pedidos de compra', 'Compras e almoxarifado', 'CMAPEDID.DBF', 3630, '[{"name": "pcnroped", "source": "PCNROPED", "type": "integer", "searchable": false}, {"name": "pccodfor", "source": "PCCODFOR", "type": "integer", "searchable": false}, {"name": "pcnomfor", "source": "PCNOMFOR", "type": "varchar(20)", "searchable": true}, {"name": "pcdatemi", "source": "PCDATEMI", "type": "date", "searchable": false}, {"name": "pcprvent", "source": "PCPRVENT", "type": "date", "searchable": false}, {"name": "pcconpg1", "source": "PCCONPG1", "type": "integer", "searchable": false}, {"name": "pcconpg2", "source": "PCCONPG2", "type": "integer", "searchable": false}, {"name": "pcconpg3", "source": "PCCONPG3", "type": "integer", "searchable": false}, {"name": "pcconpg4", "source": "PCCONPG4", "type": "integer", "searchable": false}, {"name": "pcconpg5", "source": "PCCONPG5", "type": "integer", "searchable": false}, {"name": "pcconpg6", "source": "PCCONPG6", "type": "integer", "searchable": false}, {"name": "pcconpg7", "source": "PCCONPG7", "type": "integer", "searchable": false}, {"name": "pcconpg8", "source": "PCCONPG8", "type": "integer", "searchable": false}, {"name": "pcconpg9", "source": "PCCONPG9", "type": "integer", "searchable": false}, {"name": "pcvlrdsc", "source": "PCVLRDSC", "type": "numeric(13,2)", "searchable": false}, {"name": "pcperds1", "source": "PCPERDS1", "type": "numeric(5,2)", "searchable": false}, {"name": "pcperds2", "source": "PCPERDS2", "type": "numeric(5,2)", "searchable": false}, {"name": "pcperds3", "source": "PCPERDS3", "type": "numeric(5,2)", "searchable": false}, {"name": "pcperds4", "source": "PCPERDS4", "type": "numeric(5,2)", "searchable": false}, {"name": "pcdesdsp", "source": "PCDESDSP", "type": "varchar(20)", "searchable": true}, {"name": "pcvlrdsp", "source": "PCVLRDSP", "type": "numeric(13,2)", "searchable": false}, {"name": "pcperdsp", "source": "PCPERDSP", "type": "numeric(5,2)", "searchable": false}, {"name": "pcforcom", "source": "PCFORCOM", "type": "varchar(25)", "searchable": true}, {"name": "pcpedfor", "source": "PCPEDFOR", "type": "varchar(15)", "searchable": true}, {"name": "pctransp", "source": "PCTRANSP", "type": "varchar(55)", "searchable": true}, {"name": "pcatendi", "source": "PCATENDI", "type": "varchar(1)", "searchable": true}, {"name": "pcgrucmp", "source": "PCGRUCMP", "type": "integer", "searchable": false}, {"name": "pccontat", "source": "PCCONTAT", "type": "varchar(15)", "searchable": true}, {"name": "pcperdp2", "source": "PCPERDP2", "type": "numeric(5,2)", "searchable": false}, {"name": "pcobserv", "source": "PCOBSERV", "type": "text", "searchable": true}, {"name": "pcprzfix", "source": "PCPRZFIX", "type": "varchar(1)", "searchable": true}, {"name": "pcpenden", "source": "PCPENDEN", "type": "varchar(1)", "searchable": true}, {"name": "pcpgtant", "source": "PCPGTANT", "type": "date", "searchable": false}]'::jsonb),
('cmastncm', 'dukamp_legacy_cmastncm', 'CMASTNCM', 'Compras e almoxarifado', 'CMASTNCM.DBF', 0, '[{"name": "codncm", "source": "CODNCM", "type": "integer", "searchable": false}, {"name": "ufe", "source": "UFE", "type": "varchar(2)", "searchable": true}, {"name": "codfis", "source": "CODFIS", "type": "integer", "searchable": false}, {"name": "iva", "source": "IVA", "type": "numeric(6,2)", "searchable": false}, {"name": "protoc", "source": "PROTOC", "type": "integer", "searchable": false}, {"name": "dificm", "source": "DIFICM", "type": "numeric(5,2)", "searchable": false}, {"name": "alquforg", "source": "ALQUFORG", "type": "numeric(5,2)", "searchable": false}, {"name": "alqufdst", "source": "ALQUFDST", "type": "numeric(5,2)", "searchable": false}, {"name": "alqfcpst", "source": "ALQFCPST", "type": "numeric(5,2)", "searchable": false}, {"name": "peripi", "source": "PERIPI", "type": "numeric(5,2)", "searchable": false}]'::jsonb),
('cpaadfor', 'dukamp_legacy_cpaadfor', 'CPAADFOR', 'Contas a pagar', 'CPAADFOR.DBF', 1, '[{"name": "codfor", "source": "CODFOR", "type": "integer", "searchable": false}, {"name": "data", "source": "DATA", "type": "date", "searchable": false}, {"name": "valor", "source": "VALOR", "type": "numeric(12,2)", "searchable": false}, {"name": "debcre", "source": "DEBCRE", "type": "varchar(1)", "searchable": true}, {"name": "histo", "source": "HISTO", "type": "varchar(30)", "searchable": true}, {"name": "saldo", "source": "SALDO", "type": "numeric(12,2)", "searchable": false}]'::jsonb),
('cpaautpg', 'dukamp_legacy_cpaautpg', 'Autorizações de pagamento', 'Contas a pagar', 'CPAAUTPG.DBF', 7562, '[{"name": "apcodfor", "source": "APCODFOR", "type": "integer", "searchable": false}, {"name": "apnrodoc", "source": "APNRODOC", "type": "varchar(15)", "searchable": true}, {"name": "apdatemi", "source": "APDATEMI", "type": "date", "searchable": false}, {"name": "apvaldoc", "source": "APVALDOC", "type": "numeric(15,2)", "searchable": false}, {"name": "aptipdoc", "source": "APTIPDOC", "type": "varchar(15)", "searchable": true}, {"name": "apforpag", "source": "APFORPAG", "type": "varchar(15)", "searchable": true}, {"name": "apflgemi", "source": "APFLGEMI", "type": "varchar(1)", "searchable": true}, {"name": "apflgins", "source": "APFLGINS", "type": "varchar(1)", "searchable": true}, {"name": "apcodaut", "source": "APCODAUT", "type": "varchar(15)", "searchable": true}, {"name": "apnatdb1", "source": "APNATDB1", "type": "varchar(35)", "searchable": true}, {"name": "apnatdb2", "source": "APNATDB2", "type": "varchar(35)", "searchable": true}, {"name": "apnatdb3", "source": "APNATDB3", "type": "varchar(35)", "searchable": true}, {"name": "apnatdb4", "source": "APNATDB4", "type": "varchar(35)", "searchable": true}, {"name": "apnatdb5", "source": "APNATDB5", "type": "varchar(35)", "searchable": true}, {"name": "apnatdb6", "source": "APNATDB6", "type": "varchar(35)", "searchable": true}, {"name": "aptippag", "source": "APTIPPAG", "type": "varchar(1)", "searchable": true}, {"name": "apgrucmp", "source": "APGRUCMP", "type": "integer", "searchable": false}, {"name": "apcodemp", "source": "APCODEMP", "type": "integer", "searchable": false}]'::jsonb),
('cpaconta', 'dukamp_legacy_cpaconta', 'CPACONTA', 'Contas a pagar', 'CPACONTA.DBF', 25, '[{"name": "tipreg", "source": "TIPREG", "type": "varchar(1)", "searchable": true}, {"name": "layout", "source": "LAYOUT", "type": "varchar(1)", "searchable": true}, {"name": "apelido", "source": "APELIDO", "type": "varchar(6)", "searchable": true}, {"name": "carpag", "source": "CARPAG", "type": "integer", "searchable": false}, {"name": "descri", "source": "DESCRI", "type": "varchar(30)", "searchable": true}, {"name": "cta_cred", "source": "CTA_CRED", "type": "integer", "searchable": false}, {"name": "cta_debi", "source": "CTA_DEBI", "type": "integer", "searchable": false}, {"name": "hist_pad", "source": "HIST_PAD", "type": "integer", "searchable": false}, {"name": "hist_dsr", "source": "HIST_DSR", "type": "varchar(30)", "searchable": true}, {"name": "hist_mult", "source": "HIST_MULT", "type": "integer", "searchable": false}, {"name": "hist_dsr_m", "source": "HIST_DSR_M", "type": "varchar(30)", "searchable": true}]'::jsonb),
('cpaempre', 'dukamp_legacy_cpaempre', 'CPAEMPRE', 'Contas a pagar', 'CPAEMPRE.DBF', 10, '[{"name": "codemp", "source": "CODEMP", "type": "integer", "searchable": false}, {"name": "nomemp", "source": "NOMEMP", "type": "varchar(25)", "searchable": true}]'::jsonb),
('cpaferia', 'dukamp_legacy_cpaferia', 'CPAFERIA', 'Contas a pagar', 'CPAFERIA.DBF', 108, '[{"name": "frdatfer", "source": "FRDATFER", "type": "date", "searchable": false}, {"name": "frdescri", "source": "FRDESCRI", "type": "varchar(25)", "searchable": true}]'::jsonb),
('cpaforne', 'dukamp_legacy_cpaforne', 'Fornecedores', 'Contas a pagar', 'CPAFORNE.DBF', 2274, '[{"name": "fcod", "source": "FCOD", "type": "integer", "searchable": false}, {"name": "fnome", "source": "FNOME", "type": "varchar(40)", "searchable": true}, {"name": "fend", "source": "FEND", "type": "varchar(40)", "searchable": true}, {"name": "fcid", "source": "FCID", "type": "integer", "searchable": false}, {"name": "fbair", "source": "FBAIR", "type": "varchar(10)", "searchable": true}, {"name": "fcep", "source": "FCEP", "type": "integer", "searchable": false}, {"name": "ffone", "source": "FFONE", "type": "bigint", "searchable": false}, {"name": "ftelex", "source": "FTELEX", "type": "bigint", "searchable": false}, {"name": "fcgc", "source": "FCGC", "type": "varchar(14)", "searchable": true}, {"name": "finsc", "source": "FINSC", "type": "varchar(16)", "searchable": true}, {"name": "fdtcad", "source": "FDTCAD", "type": "date", "searchable": false}, {"name": "fdtutcp", "source": "FDTUTCP", "type": "date", "searchable": false}, {"name": "fvrutcp", "source": "FVRUTCP", "type": "integer", "searchable": false}, {"name": "fdtmacp", "source": "FDTMACP", "type": "date", "searchable": false}, {"name": "fvrmacp", "source": "FVRMACP", "type": "integer", "searchable": false}, {"name": "fcpaatu", "source": "FCPAATU", "type": "bigint", "searchable": false}, {"name": "fcpaant", "source": "FCPAANT", "type": "bigint", "searchable": false}, {"name": "ftipfor", "source": "FTIPFOR", "type": "integer", "searchable": false}, {"name": "findpcv", "source": "FINDPCV", "type": "numeric(5,2)", "searchable": false}, {"name": "concont", "source": "CONCONT", "type": "integer", "searchable": false}, {"name": "fcontat", "source": "FCONTAT", "type": "varchar(45)", "searchable": true}, {"name": "fnomfan", "source": "FNOMFAN", "type": "varchar(20)", "searchable": true}, {"name": "fobserv", "source": "FOBSERV", "type": "text", "searchable": true}, {"name": "femail", "source": "FEMAIL", "type": "varchar(40)", "searchable": true}, {"name": "saldoad", "source": "SALDOAD", "type": "numeric(12,2)", "searchable": false}, {"name": "vfcgc", "source": "VFCGC", "type": "varchar(14)", "searchable": true}]'::jsonb),
('cpagenda', 'dukamp_legacy_cpagenda', 'CPAGENDA', 'Contas a pagar', 'CPAGENDA.DBF', 0, '[{"name": "codigo", "source": "CODIGO", "type": "integer", "searchable": false}, {"name": "nomage", "source": "NOMAGE", "type": "varchar(40)", "searchable": true}, {"name": "endage", "source": "ENDAGE", "type": "varchar(40)", "searchable": true}, {"name": "cidage", "source": "CIDAGE", "type": "varchar(20)", "searchable": true}, {"name": "fonres", "source": "FONRES", "type": "varchar(15)", "searchable": true}, {"name": "foncel", "source": "FONCEL", "type": "varchar(15)", "searchable": true}, {"name": "fonemp", "source": "FONEMP", "type": "varchar(15)", "searchable": true}, {"name": "conage", "source": "CONAGE", "type": "varchar(50)", "searchable": true}, {"name": "observ", "source": "OBSERV", "type": "varchar(50)", "searchable": true}]'::jsonb),
('cpametas', 'dukamp_legacy_cpametas', 'CPAMETAS', 'Contas a pagar', 'CPAMETAS.DBF', 1221, '[{"name": "mtcodgru", "source": "MTCODGRU", "type": "integer", "searchable": false}, {"name": "mtdatval", "source": "MTDATVAL", "type": "date", "searchable": false}, {"name": "mtvlrmet", "source": "MTVLRMET", "type": "numeric(12,2)", "searchable": false}, {"name": "mtpermet", "source": "MTPERMET", "type": "numeric(7,4)", "searchable": false}]'::jsonb),
('cpatiapg', 'dukamp_legacy_cpatiapg', 'Baixas de contas a pagar', 'Contas a pagar', 'CPATIAPG.DBF', 10264, '[{"name": "atcodfor", "source": "ATCODFOR", "type": "integer", "searchable": false}, {"name": "atnrodoc", "source": "ATNRODOC", "type": "varchar(15)", "searchable": true}, {"name": "atnroapg", "source": "ATNROAPG", "type": "integer", "searchable": false}, {"name": "atnrotit", "source": "ATNROTIT", "type": "varchar(12)", "searchable": true}, {"name": "atdiasvc", "source": "ATDIASVC", "type": "integer", "searchable": false}, {"name": "atdatven", "source": "ATDATVEN", "type": "date", "searchable": false}, {"name": "atvalpar", "source": "ATVALPAR", "type": "numeric(14,2)", "searchable": false}, {"name": "atdesvct", "source": "ATDESVCT", "type": "numeric(5,2)", "searchable": false}, {"name": "atvlrdsc", "source": "ATVLRDSC", "type": "numeric(12,2)", "searchable": false}, {"name": "atemitit", "source": "ATEMITIT", "type": "date", "searchable": false}, {"name": "atvalabt", "source": "ATVALABT", "type": "numeric(12,2)", "searchable": false}, {"name": "atbancob", "source": "ATBANCOB", "type": "varchar(15)", "searchable": true}, {"name": "atobseap", "source": "ATOBSEAP", "type": "varchar(35)", "searchable": true}, {"name": "atdatpgt", "source": "ATDATPGT", "type": "date", "searchable": false}, {"name": "atforpgt", "source": "ATFORPGT", "type": "integer", "searchable": false}]'::jsonb),
('cpatitup', 'dukamp_legacy_cpatitup', 'Títulos a pagar', 'Contas a pagar', 'CPATITUP.DBF', 47082, '[{"name": "pnroap", "source": "PNROAP", "type": "integer", "searchable": false}, {"name": "pnrtit", "source": "PNRTIT", "type": "varchar(12)", "searchable": true}, {"name": "pforne", "source": "PFORNE", "type": "integer", "searchable": false}, {"name": "pemiss", "source": "PEMISS", "type": "date", "searchable": false}, {"name": "pvrtit", "source": "PVRTIT", "type": "numeric(13,2)", "searchable": false}, {"name": "pvrabe", "source": "PVRABE", "type": "numeric(13,2)", "searchable": false}, {"name": "pvecto", "source": "PVECTO", "type": "date", "searchable": false}, {"name": "pdesvc", "source": "PDESVC", "type": "numeric(13,2)", "searchable": false}, {"name": "pcarpa", "source": "PCARPA", "type": "integer", "searchable": false}, {"name": "ppagto", "source": "PPAGTO", "type": "date", "searchable": false}, {"name": "pjuros", "source": "PJUROS", "type": "numeric(12,2)", "searchable": false}, {"name": "ppago", "source": "PPAGO", "type": "varchar(1)", "searchable": true}, {"name": "ptippg", "source": "PTIPPG", "type": "varchar(2)", "searchable": true}, {"name": "pgrucm", "source": "PGRUCM", "type": "integer", "searchable": false}, {"name": "pdtins", "source": "PDTINS", "type": "date", "searchable": false}, {"name": "pobser", "source": "POBSER", "type": "varchar(35)", "searchable": true}, {"name": "pcodemp", "source": "PCODEMP", "type": "integer", "searchable": false}, {"name": "pdescr", "source": "PDESCR", "type": "varchar(40)", "searchable": true}, {"name": "pinss", "source": "PINSS", "type": "numeric(10,2)", "searchable": false}, {"name": "pirrf", "source": "PIRRF", "type": "numeric(10,2)", "searchable": false}, {"name": "pbcocred", "source": "PBCOCRED", "type": "integer", "searchable": false}, {"name": "pcodhist", "source": "PCODHIST", "type": "integer", "searchable": false}, {"name": "pdsccred", "source": "PDSCCRED", "type": "integer", "searchable": false}, {"name": "pdschist", "source": "PDSCHIST", "type": "integer", "searchable": false}, {"name": "pjurdebi", "source": "PJURDEBI", "type": "integer", "searchable": false}, {"name": "pjurhist", "source": "PJURHIST", "type": "integer", "searchable": false}, {"name": "pinscred", "source": "PINSCRED", "type": "integer", "searchable": false}, {"name": "pinshist", "source": "PINSHIST", "type": "integer", "searchable": false}, {"name": "pirfcred", "source": "PIRFCRED", "type": "integer", "searchable": false}, {"name": "pirfhist", "source": "PIRFHIST", "type": "integer", "searchable": false}, {"name": "ptippgt", "source": "PTIPPGT", "type": "integer", "searchable": false}]'::jsonb),
('cpatpfor', 'dukamp_legacy_cpatpfor', 'CPATPFOR', 'Contas a pagar', 'CPATPFOR.DBF', 240, '[{"name": "tfcodigo", "source": "TFCODIGO", "type": "integer", "searchable": false}, {"name": "tfdescri", "source": "TFDESCRI", "type": "varchar(25)", "searchable": true}, {"name": "tfgrupo", "source": "TFGRUPO", "type": "integer", "searchable": false}, {"name": "tftipo", "source": "TFTIPO", "type": "varchar(2)", "searchable": true}, {"name": "tfemicmp", "source": "TFEMICMP", "type": "varchar(2)", "searchable": true}]'::jsonb),
('craadcli', 'dukamp_legacy_craadcli', 'CRAADCLI', 'Contas a receber', 'CRAADCLI.DBF', 0, '[{"name": "codcli", "source": "CODCLI", "type": "integer", "searchable": false}, {"name": "data", "source": "DATA", "type": "date", "searchable": false}, {"name": "valor", "source": "VALOR", "type": "numeric(12,2)", "searchable": false}, {"name": "debcre", "source": "DEBCRE", "type": "varchar(1)", "searchable": true}, {"name": "histo", "source": "HISTO", "type": "varchar(30)", "searchable": true}, {"name": "saldo", "source": "SALDO", "type": "numeric(12,2)", "searchable": false}]'::jsonb),
('cracabcp', 'dukamp_legacy_cracabcp', 'CRACABCP', 'Contas a receber', 'CRACABCP.DBF', 103, '[{"name": "codigo", "source": "CODIGO", "type": "integer", "searchable": false}, {"name": "nome", "source": "NOME", "type": "varchar(15)", "searchable": true}, {"name": "abvnome", "source": "ABVNOME", "type": "varchar(2)", "searchable": true}, {"name": "conceito", "source": "CONCEITO", "type": "integer", "searchable": false}, {"name": "diasatrz", "source": "DIASATRZ", "type": "integer", "searchable": false}]'::jsonb),
('cracorti', 'dukamp_legacy_cracorti', 'CRACORTI', 'Contas a receber', 'CRACORTI.DBF', 1, '[{"name": "vlmult", "source": "VLMULT", "type": "numeric(14,2)", "searchable": false}, {"name": "txmult", "source": "TXMULT", "type": "numeric(5,2)", "searchable": false}, {"name": "pricor", "source": "PRICOR", "type": "varchar(1)", "searchable": true}, {"name": "txjuro", "source": "TXJURO", "type": "numeric(9,6)", "searchable": false}, {"name": "mesdia", "source": "MESDIA", "type": "varchar(1)", "searchable": true}, {"name": "smpcmp", "source": "SMPCMP", "type": "varchar(1)", "searchable": true}]'::jsonb),
('cradspti', 'dukamp_legacy_cradspti', 'CRADSPTI', 'Contas a receber', 'CRADSPTI.DBF', 0, '[{"name": "nrtit", "source": "NRTIT", "type": "integer", "searchable": false}, {"name": "data", "source": "DATA", "type": "date", "searchable": false}, {"name": "histo", "source": "HISTO", "type": "varchar(30)", "searchable": true}, {"name": "valor", "source": "VALOR", "type": "numeric(12,2)", "searchable": false}]'::jsonb),
('cralogti', 'dukamp_legacy_cralogti', 'Log de títulos a receber', 'Contas a receber', 'CRALOGTI.DBF', 99318, '[{"name": "lnrtit", "source": "LNRTIT", "type": "integer", "searchable": false}, {"name": "lclien", "source": "LCLIEN", "type": "integer", "searchable": false}, {"name": "lvrtit", "source": "LVRTIT", "type": "numeric(15,2)", "searchable": false}, {"name": "lcarpa", "source": "LCARPA", "type": "integer", "searchable": false}, {"name": "ljuros", "source": "LJUROS", "type": "numeric(13,2)", "searchable": false}, {"name": "ldesco", "source": "LDESCO", "type": "numeric(15,2)", "searchable": false}, {"name": "lvecto", "source": "LVECTO", "type": "date", "searchable": false}, {"name": "lopera", "source": "LOPERA", "type": "varchar(1)", "searchable": true}, {"name": "ldata", "source": "LDATA", "type": "date", "searchable": false}, {"name": "lhora", "source": "LHORA", "type": "varchar(8)", "searchable": true}, {"name": "ljurct", "source": "LJURCT", "type": "numeric(12,2)", "searchable": false}]'::jsonb),
('crasdcar', 'dukamp_legacy_crasdcar', 'CRASDCAR', 'Contas a receber', 'CRASDCAR.DBF', 11, '[{"name": "snrcar", "source": "SNRCAR", "type": "integer", "searchable": false}, {"name": "santer", "source": "SANTER", "type": "numeric(16,2)", "searchable": false}, {"name": "sbaixa", "source": "SBAIXA", "type": "numeric(15,2)", "searchable": false}, {"name": "sdesco", "source": "SDESCO", "type": "numeric(15,2)", "searchable": false}, {"name": "sestor", "source": "SESTOR", "type": "numeric(15,2)", "searchable": false}, {"name": "scance", "source": "SCANCE", "type": "numeric(15,2)", "searchable": false}, {"name": "stranr", "source": "STRANR", "type": "numeric(15,2)", "searchable": false}, {"name": "strans", "source": "STRANS", "type": "numeric(15,2)", "searchable": false}, {"name": "sinser", "source": "SINSER", "type": "numeric(15,2)", "searchable": false}, {"name": "satual", "source": "SATUAL", "type": "numeric(16,2)", "searchable": false}, {"name": "sdtope", "source": "SDTOPE", "type": "date", "searchable": false}]'::jsonb),
('cratitul', 'dukamp_legacy_cratitul', 'Títulos a receber', 'Contas a receber', 'CRATITUL.DBF', 41908, '[{"name": "dnrtit", "source": "DNRTIT", "type": "integer", "searchable": false}, {"name": "dclien", "source": "DCLIEN", "type": "integer", "searchable": false}, {"name": "demiss", "source": "DEMISS", "type": "date", "searchable": false}, {"name": "dvrtit", "source": "DVRTIT", "type": "numeric(15,2)", "searchable": false}, {"name": "dvrabe", "source": "DVRABE", "type": "numeric(15,2)", "searchable": false}, {"name": "dvecto", "source": "DVECTO", "type": "date", "searchable": false}, {"name": "dcarpa", "source": "DCARPA", "type": "integer", "searchable": false}, {"name": "dcarco", "source": "DCARCO", "type": "integer", "searchable": false}, {"name": "dsubcar", "source": "DSUBCAR", "type": "integer", "searchable": false}, {"name": "dvesubc", "source": "DVESUBC", "type": "date", "searchable": false}, {"name": "dpagto", "source": "DPAGTO", "type": "date", "searchable": false}, {"name": "djuros", "source": "DJUROS", "type": "numeric(13,2)", "searchable": false}, {"name": "dvende", "source": "DVENDE", "type": "integer", "searchable": false}, {"name": "dtippg", "source": "DTIPPG", "type": "varchar(2)", "searchable": true}, {"name": "dpago", "source": "DPAGO", "type": "varchar(1)", "searchable": true}, {"name": "dnosnro", "source": "DNOSNRO", "type": "varchar(15)", "searchable": true}, {"name": "dflgurv", "source": "DFLGURV", "type": "varchar(1)", "searchable": true}, {"name": "dagecob", "source": "DAGECOB", "type": "varchar(6)", "searchable": true}, {"name": "ddscvct", "source": "DDSCVCT", "type": "numeric(5,2)", "searchable": false}, {"name": "dobserv", "source": "DOBSERV", "type": "varchar(15)", "searchable": true}, {"name": "dtarifa", "source": "DTARIFA", "type": "numeric(10,2)", "searchable": false}, {"name": "mobserv", "source": "MOBSERV", "type": "text", "searchable": true}, {"name": "datcred", "source": "DATCRED", "type": "date", "searchable": false}]'::jsonb),
('efaareap', 'dukamp_legacy_efaareap', 'EFAAREAP', 'Produtos e estoque', 'EFAAREAP.DBF', 31, '[{"name": "arcdarea", "source": "ARCDAREA", "type": "varchar(6)", "searchable": true}, {"name": "ardescri", "source": "ARDESCRI", "type": "varchar(15)", "searchable": true}, {"name": "arvenrsp", "source": "ARVENRSP", "type": "integer", "searchable": false}]'::jsonb),
('efabolet', 'dukamp_legacy_efabolet', 'EFABOLET', 'Produtos e estoque', 'EFABOLET.DBF', 0, '[{"name": "codigo", "source": "CODIGO", "type": "integer", "searchable": false}, {"name": "data", "source": "DATA", "type": "date", "searchable": false}, {"name": "vendedor", "source": "VENDEDOR", "type": "integer", "searchable": false}, {"name": "cliente", "source": "CLIENTE", "type": "integer", "searchable": false}, {"name": "motivo", "source": "MOTIVO", "type": "varchar(60)", "searchable": true}, {"name": "prodent01", "source": "PRODENT01", "type": "integer", "searchable": false}, {"name": "prodent02", "source": "PRODENT02", "type": "integer", "searchable": false}, {"name": "prodent03", "source": "PRODENT03", "type": "integer", "searchable": false}, {"name": "prodent04", "source": "PRODENT04", "type": "integer", "searchable": false}, {"name": "prodent05", "source": "PRODENT05", "type": "integer", "searchable": false}, {"name": "prodent06", "source": "PRODENT06", "type": "integer", "searchable": false}, {"name": "prodent07", "source": "PRODENT07", "type": "integer", "searchable": false}, {"name": "prodent08", "source": "PRODENT08", "type": "integer", "searchable": false}, {"name": "prodent09", "source": "PRODENT09", "type": "integer", "searchable": false}, {"name": "prodent10", "source": "PRODENT10", "type": "integer", "searchable": false}, {"name": "prodent11", "source": "PRODENT11", "type": "integer", "searchable": false}, {"name": "prodent12", "source": "PRODENT12", "type": "integer", "searchable": false}, {"name": "prodent13", "source": "PRODENT13", "type": "integer", "searchable": false}, {"name": "prodent14", "source": "PRODENT14", "type": "integer", "searchable": false}, {"name": "qtdent01", "source": "QTDENT01", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdent02", "source": "QTDENT02", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdent03", "source": "QTDENT03", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdent04", "source": "QTDENT04", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdent05", "source": "QTDENT05", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdent06", "source": "QTDENT06", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdent07", "source": "QTDENT07", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdent08", "source": "QTDENT08", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdent09", "source": "QTDENT09", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdent10", "source": "QTDENT10", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdent11", "source": "QTDENT11", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdent12", "source": "QTDENT12", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdent13", "source": "QTDENT13", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdent14", "source": "QTDENT14", "type": "numeric(7,2)", "searchable": false}, {"name": "precent01", "source": "PRECENT01", "type": "numeric(18,2)", "searchable": false}, {"name": "precent02", "source": "PRECENT02", "type": "numeric(18,2)", "searchable": false}, {"name": "precent03", "source": "PRECENT03", "type": "numeric(18,2)", "searchable": false}, {"name": "precent04", "source": "PRECENT04", "type": "numeric(18,2)", "searchable": false}, {"name": "precent05", "source": "PRECENT05", "type": "numeric(18,2)", "searchable": false}, {"name": "precent06", "source": "PRECENT06", "type": "numeric(18,2)", "searchable": false}, {"name": "precent07", "source": "PRECENT07", "type": "numeric(18,2)", "searchable": false}, {"name": "precent08", "source": "PRECENT08", "type": "numeric(18,2)", "searchable": false}, {"name": "precent09", "source": "PRECENT09", "type": "numeric(18,2)", "searchable": false}, {"name": "precent10", "source": "PRECENT10", "type": "numeric(18,2)", "searchable": false}, {"name": "precent11", "source": "PRECENT11", "type": "numeric(18,2)", "searchable": false}, {"name": "precent12", "source": "PRECENT12", "type": "numeric(18,2)", "searchable": false}, {"name": "precent13", "source": "PRECENT13", "type": "numeric(18,2)", "searchable": false}, {"name": "precent14", "source": "PRECENT14", "type": "numeric(18,2)", "searchable": false}, {"name": "prodsai01", "source": "PRODSAI01", "type": "integer", "searchable": false}, {"name": "prodsai02", "source": "PRODSAI02", "type": "integer", "searchable": false}, {"name": "prodsai03", "source": "PRODSAI03", "type": "integer", "searchable": false}, {"name": "prodsai04", "source": "PRODSAI04", "type": "integer", "searchable": false}, {"name": "prodsai05", "source": "PRODSAI05", "type": "integer", "searchable": false}, {"name": "prodsai06", "source": "PRODSAI06", "type": "integer", "searchable": false}, {"name": "prodsai07", "source": "PRODSAI07", "type": "integer", "searchable": false}, {"name": "prodsai08", "source": "PRODSAI08", "type": "integer", "searchable": false}, {"name": "prodsai09", "source": "PRODSAI09", "type": "integer", "searchable": false}, {"name": "prodsai10", "source": "PRODSAI10", "type": "integer", "searchable": false}, {"name": "prodsai11", "source": "PRODSAI11", "type": "integer", "searchable": false}, {"name": "prodsai12", "source": "PRODSAI12", "type": "integer", "searchable": false}, {"name": "prodsai13", "source": "PRODSAI13", "type": "integer", "searchable": false}, {"name": "prodsai14", "source": "PRODSAI14", "type": "integer", "searchable": false}, {"name": "qtdsai01", "source": "QTDSAI01", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdsai02", "source": "QTDSAI02", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdsai03", "source": "QTDSAI03", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdsai04", "source": "QTDSAI04", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdsai05", "source": "QTDSAI05", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdsai06", "source": "QTDSAI06", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdsai07", "source": "QTDSAI07", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdsai08", "source": "QTDSAI08", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdsai09", "source": "QTDSAI09", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdsai10", "source": "QTDSAI10", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdsai11", "source": "QTDSAI11", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdsai12", "source": "QTDSAI12", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdsai13", "source": "QTDSAI13", "type": "numeric(7,2)", "searchable": false}, {"name": "qtdsai14", "source": "QTDSAI14", "type": "numeric(7,2)", "searchable": false}, {"name": "precsai01", "source": "PRECSAI01", "type": "numeric(18,2)", "searchable": false}, {"name": "precsai02", "source": "PRECSAI02", "type": "numeric(18,2)", "searchable": false}, {"name": "precsai03", "source": "PRECSAI03", "type": "numeric(18,2)", "searchable": false}, {"name": "precsai04", "source": "PRECSAI04", "type": "numeric(18,2)", "searchable": false}, {"name": "precsai05", "source": "PRECSAI05", "type": "numeric(18,2)", "searchable": false}, {"name": "precsai06", "source": "PRECSAI06", "type": "numeric(18,2)", "searchable": false}, {"name": "precsai07", "source": "PRECSAI07", "type": "numeric(18,2)", "searchable": false}, {"name": "precsai08", "source": "PRECSAI08", "type": "numeric(18,2)", "searchable": false}, {"name": "precsai09", "source": "PRECSAI09", "type": "numeric(18,2)", "searchable": false}, {"name": "precsai10", "source": "PRECSAI10", "type": "numeric(18,2)", "searchable": false}, {"name": "precsai11", "source": "PRECSAI11", "type": "numeric(18,2)", "searchable": false}, {"name": "precsai12", "source": "PRECSAI12", "type": "numeric(18,2)", "searchable": false}, {"name": "precsai13", "source": "PRECSAI13", "type": "numeric(18,2)", "searchable": false}, {"name": "precsai14", "source": "PRECSAI14", "type": "numeric(18,2)", "searchable": false}, {"name": "nomcli", "source": "NOMCLI", "type": "varchar(40)", "searchable": true}, {"name": "ajuestq", "source": "AJUESTQ", "type": "varchar(1)", "searchable": true}, {"name": "docori", "source": "DOCORI", "type": "varchar(20)", "searchable": true}, {"name": "datori", "source": "DATORI", "type": "date", "searchable": false}, {"name": "hora", "source": "HORA", "type": "varchar(8)", "searchable": true}]'::jsonb),
('efacstri', 'dukamp_legacy_efacstri', 'EFACSTRI', 'Produtos e estoque', 'EFACSTRI.DBF', 138, '[{"name": "cst", "source": "CST", "type": "varchar(3)", "searchable": true}, {"name": "nomecst", "source": "NOMECST", "type": "varchar(30)", "searchable": true}, {"name": "clastrib", "source": "CLASTRIB", "type": "varchar(6)", "searchable": true}, {"name": "ativo", "source": "ATIVO", "type": "varchar(1)", "searchable": true}, {"name": "nomecla", "source": "NOMECLA", "type": "varchar(30)", "searchable": true}, {"name": "descrcla", "source": "DESCRCLA", "type": "varchar(50)", "searchable": true}, {"name": "predibs", "source": "PREDIBS", "type": "numeric(6,2)", "searchable": false}, {"name": "predcbs", "source": "PREDCBS", "type": "numeric(6,2)", "searchable": false}, {"name": "tipoaliq", "source": "TIPOALIQ", "type": "varchar(15)", "searchable": true}, {"name": "redutorbc", "source": "REDUTORBC", "type": "varchar(5)", "searchable": true}, {"name": "gibscbs", "source": "GIBSCBS", "type": "varchar(1)", "searchable": true}, {"name": "gibscbsmon", "source": "GIBSCBSMON", "type": "varchar(1)", "searchable": true}, {"name": "gred", "source": "GRED", "type": "varchar(1)", "searchable": true}, {"name": "gdif", "source": "GDIF", "type": "varchar(1)", "searchable": true}, {"name": "gtranscred", "source": "GTRANSCRED", "type": "varchar(1)", "searchable": true}, {"name": "gcredibszf", "source": "GCREDIBSZF", "type": "varchar(1)", "searchable": true}, {"name": "gajustecom", "source": "GAJUSTECOM", "type": "varchar(1)", "searchable": true}]'::jsonb),
('efactest', 'dukamp_legacy_efactest', 'EFACTEST', 'Produtos e estoque', 'EFACTEST.DBF', 0, '[{"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "codbar", "source": "CODBAR", "type": "bigint", "searchable": false}, {"name": "quacnt", "source": "QUACNT", "type": "numeric(9,2)", "searchable": false}, {"name": "datcnt", "source": "DATCNT", "type": "date", "searchable": false}, {"name": "horcnt", "source": "HORCNT", "type": "varchar(8)", "searchable": true}]'::jsonb),
('efactlog', 'dukamp_legacy_efactlog', 'EFACTLOG', 'Produtos e estoque', 'EFACTLOG.DBF', 0, '[{"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "codbar", "source": "CODBAR", "type": "bigint", "searchable": false}, {"name": "quacnt", "source": "QUACNT", "type": "numeric(9,2)", "searchable": false}, {"name": "quaest", "source": "QUAEST", "type": "numeric(9,2)", "searchable": false}, {"name": "quadif", "source": "QUADIF", "type": "numeric(10,2)", "searchable": false}, {"name": "dataju", "source": "DATAJU", "type": "date", "searchable": false}, {"name": "horaju", "source": "HORAJU", "type": "varchar(8)", "searchable": true}, {"name": "nomusu", "source": "NOMUSU", "type": "varchar(10)", "searchable": true}, {"name": "datbas", "source": "DATBAS", "type": "date", "searchable": false}, {"name": "segcnt", "source": "SEGCNT", "type": "varchar(1)", "searchable": true}]'::jsonb),
('efagrprd', 'dukamp_legacy_efagrprd', 'EFAGRPRD', 'Produtos e estoque', 'EFAGRPRD.DBF', 124, '[{"name": "lncodlin", "source": "LNCODLIN", "type": "integer", "searchable": false}, {"name": "lndeslin", "source": "LNDESLIN", "type": "varchar(35)", "searchable": true}, {"name": "lncabeca", "source": "LNCABECA", "type": "varchar(1)", "searchable": true}, {"name": "lngrauln", "source": "LNGRAULN", "type": "integer", "searchable": false}]'::jsonb),
('efaitorc', 'dukamp_legacy_efaitorc', 'EFAITORC', 'Produtos e estoque', 'EFAITORC.DBF', 0, '[{"name": "nroorc", "source": "NROORC", "type": "integer", "searchable": false}, {"name": "nroite", "source": "NROITE", "type": "integer", "searchable": false}, {"name": "quapro", "source": "QUAPRO", "type": "numeric(9,2)", "searchable": false}, {"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "preuni", "source": "PREUNI", "type": "numeric(13,2)", "searchable": false}, {"name": "perdsc", "source": "PERDSC", "type": "numeric(5,2)", "searchable": false}, {"name": "unidad", "source": "UNIDAD", "type": "varchar(2)", "searchable": true}, {"name": "comple", "source": "COMPLE", "type": "text", "searchable": true}, {"name": "classi", "source": "CLASSI", "type": "varchar(8)", "searchable": true}]'::jsonb),
('efaloga2', 'dukamp_legacy_efaloga2', 'EFALOGA2', 'Produtos e estoque', 'EFALOGA2.DBF', 107, '[{"name": "dathoj", "source": "DATHOJ", "type": "date", "searchable": false}, {"name": "horhoj", "source": "HORHOJ", "type": "varchar(8)", "searchable": true}, {"name": "documt", "source": "DOCUMT", "type": "varchar(10)", "searchable": true}, {"name": "qtdpro", "source": "QTDPRO", "type": "numeric(8,2)", "searchable": false}, {"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "tipope", "source": "TIPOPE", "type": "varchar(8)", "searchable": true}, {"name": "nomusu", "source": "NOMUSU", "type": "varchar(10)", "searchable": true}, {"name": "saldo", "source": "SALDO", "type": "numeric(9,2)", "searchable": false}]'::jsonb),
('efalogal', 'dukamp_legacy_efalogal', 'EFALOGAL', 'Produtos e estoque', 'EFALOGAL.DBF', 12194, '[{"name": "dathoj", "source": "DATHOJ", "type": "date", "searchable": false}, {"name": "horhoj", "source": "HORHOJ", "type": "varchar(8)", "searchable": true}, {"name": "documt", "source": "DOCUMT", "type": "varchar(10)", "searchable": true}, {"name": "qtdpro", "source": "QTDPRO", "type": "numeric(10,3)", "searchable": false}, {"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "tipope", "source": "TIPOPE", "type": "varchar(8)", "searchable": true}, {"name": "nomusu", "source": "NOMUSU", "type": "varchar(10)", "searchable": true}, {"name": "saldo", "source": "SALDO", "type": "numeric(10,3)", "searchable": false}]'::jsonb),
('efalogfb', 'dukamp_legacy_efalogfb', 'EFALOGFB', 'Produtos e estoque', 'efalogfb.DBF', 18, '[{"name": "dathoj", "source": "DATHOJ", "type": "date", "searchable": false}, {"name": "horhoj", "source": "HORHOJ", "type": "varchar(8)", "searchable": true}, {"name": "documt", "source": "DOCUMT", "type": "varchar(10)", "searchable": true}, {"name": "qtdpro", "source": "QTDPRO", "type": "numeric(10,3)", "searchable": false}, {"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "tipope", "source": "TIPOPE", "type": "varchar(8)", "searchable": true}, {"name": "nomusu", "source": "NOMUSU", "type": "varchar(10)", "searchable": true}, {"name": "saldo", "source": "SALDO", "type": "numeric(10,3)", "searchable": false}]'::jsonb),
('efalogp1', 'dukamp_legacy_efalogp1', 'EFALOGP1', 'Produtos e estoque', 'EFALOGP1.DBF', 81533, '[{"name": "dathoj", "source": "DATHOJ", "type": "date", "searchable": false}, {"name": "horhoj", "source": "HORHOJ", "type": "varchar(8)", "searchable": true}, {"name": "documt", "source": "DOCUMT", "type": "varchar(15)", "searchable": true}, {"name": "qtdpro", "source": "QTDPRO", "type": "numeric(13,3)", "searchable": false}, {"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "tipope", "source": "TIPOPE", "type": "varchar(8)", "searchable": true}, {"name": "nomusu", "source": "NOMUSU", "type": "varchar(10)", "searchable": true}, {"name": "saldo", "source": "SALDO", "type": "numeric(13,3)", "searchable": false}]'::jsonb),
('efalogpr', 'dukamp_legacy_efalogpr', 'Log de produtos', 'Produtos e estoque', 'EFALOGPR.DBF', 845098, '[{"name": "dathoj", "source": "DATHOJ", "type": "date", "searchable": false}, {"name": "horhoj", "source": "HORHOJ", "type": "varchar(8)", "searchable": true}, {"name": "documt", "source": "DOCUMT", "type": "varchar(15)", "searchable": true}, {"name": "qtdpro", "source": "QTDPRO", "type": "numeric(13,3)", "searchable": false}, {"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "tipope", "source": "TIPOPE", "type": "varchar(8)", "searchable": true}, {"name": "nomusu", "source": "NOMUSU", "type": "varchar(10)", "searchable": true}, {"name": "saldo", "source": "SALDO", "type": "numeric(13,3)", "searchable": false}]'::jsonb),
('efaorcam', 'dukamp_legacy_efaorcam', 'EFAORCAM', 'Produtos e estoque', 'EFAORCAM.DBF', 1, '[{"name": "nroorc", "source": "NROORC", "type": "integer", "searchable": false}, {"name": "codcli", "source": "CODCLI", "type": "integer", "searchable": false}, {"name": "datemi", "source": "DATEMI", "type": "date", "searchable": false}, {"name": "codven", "source": "CODVEN", "type": "integer", "searchable": false}, {"name": "compra", "source": "COMPRA", "type": "varchar(15)", "searchable": true}, {"name": "cndpgt", "source": "CNDPGT", "type": "varchar(50)", "searchable": true}, {"name": "valida", "source": "VALIDA", "type": "varchar(20)", "searchable": true}, {"name": "przent", "source": "PRZENT", "type": "varchar(20)", "searchable": true}, {"name": "perdsc", "source": "PERDSC", "type": "numeric(5,2)", "searchable": false}, {"name": "vlrdsc", "source": "VLRDSC", "type": "numeric(15,2)", "searchable": false}, {"name": "nomcli", "source": "NOMCLI", "type": "varchar(40)", "searchable": true}, {"name": "endcli", "source": "ENDCLI", "type": "varchar(40)", "searchable": true}, {"name": "cidcli", "source": "CIDCLI", "type": "varchar(20)", "searchable": true}, {"name": "ufecid", "source": "UFECID", "type": "varchar(2)", "searchable": true}, {"name": "foncli", "source": "FONCLI", "type": "varchar(15)", "searchable": true}, {"name": "faxcli", "source": "FAXCLI", "type": "varchar(15)", "searchable": true}, {"name": "obsini", "source": "OBSINI", "type": "text", "searchable": true}, {"name": "restec", "source": "RESTEC", "type": "integer", "searchable": false}]'::jsonb),
('efapriat', 'dukamp_legacy_efapriat', 'EFAPRIAT', 'Produtos e estoque', 'EFAPRIAT.DBF', 69, '[{"name": "prcodigo", "source": "PRCODIGO", "type": "integer", "searchable": false}, {"name": "prdescri", "source": "PRDESCRI", "type": "varchar(25)", "searchable": true}]'::jsonb),
('efaprmtb', 'dukamp_legacy_efaprmtb', 'EFAPRMTB', 'Produtos e estoque', 'EFAPRMTB.DBF', 29, '[{"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "lucro1", "source": "LUCRO1", "type": "numeric(6,2)", "searchable": false}, {"name": "lucro2", "source": "LUCRO2", "type": "numeric(6,2)", "searchable": false}, {"name": "lucro3", "source": "LUCRO3", "type": "numeric(6,2)", "searchable": false}, {"name": "lucro4", "source": "LUCRO4", "type": "numeric(6,2)", "searchable": false}, {"name": "lucro5", "source": "LUCRO5", "type": "numeric(6,2)", "searchable": false}, {"name": "lucro6", "source": "LUCRO6", "type": "numeric(6,2)", "searchable": false}, {"name": "comis1", "source": "COMIS1", "type": "numeric(6,2)", "searchable": false}, {"name": "comis2", "source": "COMIS2", "type": "numeric(6,2)", "searchable": false}, {"name": "comis3", "source": "COMIS3", "type": "numeric(6,2)", "searchable": false}, {"name": "comis4", "source": "COMIS4", "type": "numeric(6,2)", "searchable": false}, {"name": "comis5", "source": "COMIS5", "type": "numeric(6,2)", "searchable": false}, {"name": "comis6", "source": "COMIS6", "type": "numeric(6,2)", "searchable": false}, {"name": "marge1", "source": "MARGE1", "type": "numeric(8,2)", "searchable": false}, {"name": "marge2", "source": "MARGE2", "type": "numeric(8,2)", "searchable": false}, {"name": "marge3", "source": "MARGE3", "type": "numeric(8,2)", "searchable": false}, {"name": "marge4", "source": "MARGE4", "type": "numeric(8,2)", "searchable": false}, {"name": "marge5", "source": "MARGE5", "type": "numeric(8,2)", "searchable": false}, {"name": "marge6", "source": "MARGE6", "type": "numeric(8,2)", "searchable": false}, {"name": "extco1", "source": "EXTCO1", "type": "numeric(6,2)", "searchable": false}, {"name": "extco2", "source": "EXTCO2", "type": "numeric(6,2)", "searchable": false}, {"name": "extco3", "source": "EXTCO3", "type": "numeric(6,2)", "searchable": false}, {"name": "extco4", "source": "EXTCO4", "type": "numeric(6,2)", "searchable": false}, {"name": "extco5", "source": "EXTCO5", "type": "numeric(6,2)", "searchable": false}, {"name": "extco6", "source": "EXTCO6", "type": "numeric(6,2)", "searchable": false}, {"name": "extlu1", "source": "EXTLU1", "type": "numeric(6,2)", "searchable": false}, {"name": "extlu2", "source": "EXTLU2", "type": "numeric(6,2)", "searchable": false}, {"name": "extlu3", "source": "EXTLU3", "type": "numeric(6,2)", "searchable": false}, {"name": "extlu4", "source": "EXTLU4", "type": "numeric(6,2)", "searchable": false}, {"name": "extlu5", "source": "EXTLU5", "type": "numeric(6,2)", "searchable": false}, {"name": "extlu6", "source": "EXTLU6", "type": "numeric(6,2)", "searchable": false}, {"name": "extma1", "source": "EXTMA1", "type": "numeric(6,2)", "searchable": false}, {"name": "extma2", "source": "EXTMA2", "type": "numeric(6,2)", "searchable": false}, {"name": "extma3", "source": "EXTMA3", "type": "numeric(6,2)", "searchable": false}, {"name": "extma4", "source": "EXTMA4", "type": "numeric(6,2)", "searchable": false}, {"name": "extma5", "source": "EXTMA5", "type": "numeric(6,2)", "searchable": false}, {"name": "extma6", "source": "EXTMA6", "type": "numeric(6,2)", "searchable": false}]'::jsonb),
('efaprodu', 'dukamp_legacy_efaprodu', 'Produtos', 'Produtos e estoque', 'EFAPRODU.DBF', 4198, '[{"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "nompro", "source": "NOMPRO", "type": "varchar(45)", "searchable": true}, {"name": "codlin", "source": "CODLIN", "type": "integer", "searchable": false}, {"name": "codfor", "source": "CODFOR", "type": "integer", "searchable": false}, {"name": "unipro", "source": "UNIPRO", "type": "varchar(3)", "searchable": true}, {"name": "comple", "source": "COMPLE", "type": "varchar(35)", "searchable": true}, {"name": "pretab", "source": "PRETAB", "type": "numeric(15,3)", "searchable": false}, {"name": "alqicm", "source": "ALQICM", "type": "integer", "searchable": false}, {"name": "ultsai", "source": "ULTSAI", "type": "date", "searchable": false}, {"name": "dtcust", "source": "DTCUST", "type": "date", "searchable": false}, {"name": "cusrea", "source": "CUSREA", "type": "numeric(15,3)", "searchable": false}, {"name": "ultcus", "source": "ULTCUS", "type": "numeric(15,3)", "searchable": false}, {"name": "cuscor", "source": "CUSCOR", "type": "numeric(15,3)", "searchable": false}, {"name": "redicm", "source": "REDICM", "type": "numeric(5,2)", "searchable": false}, {"name": "classi", "source": "CLASSI", "type": "varchar(15)", "searchable": true}, {"name": "codtri", "source": "CODTRI", "type": "integer", "searchable": false}, {"name": "salest", "source": "SALEST", "type": "numeric(12,3)", "searchable": false}, {"name": "entr01", "source": "ENTR01", "type": "numeric(10,2)", "searchable": false}, {"name": "entr02", "source": "ENTR02", "type": "numeric(10,2)", "searchable": false}, {"name": "entr03", "source": "ENTR03", "type": "numeric(10,2)", "searchable": false}, {"name": "entr04", "source": "ENTR04", "type": "numeric(10,2)", "searchable": false}, {"name": "entr05", "source": "ENTR05", "type": "numeric(10,2)", "searchable": false}, {"name": "entr06", "source": "ENTR06", "type": "numeric(10,2)", "searchable": false}, {"name": "entr07", "source": "ENTR07", "type": "numeric(10,2)", "searchable": false}, {"name": "entr08", "source": "ENTR08", "type": "numeric(10,2)", "searchable": false}, {"name": "entr09", "source": "ENTR09", "type": "numeric(10,2)", "searchable": false}, {"name": "entr10", "source": "ENTR10", "type": "numeric(10,2)", "searchable": false}, {"name": "entr11", "source": "ENTR11", "type": "numeric(10,2)", "searchable": false}, {"name": "entr12", "source": "ENTR12", "type": "numeric(10,2)", "searchable": false}, {"name": "said01", "source": "SAID01", "type": "numeric(10,2)", "searchable": false}, {"name": "said02", "source": "SAID02", "type": "numeric(10,2)", "searchable": false}, {"name": "said03", "source": "SAID03", "type": "numeric(10,2)", "searchable": false}, {"name": "said04", "source": "SAID04", "type": "numeric(10,2)", "searchable": false}, {"name": "said05", "source": "SAID05", "type": "numeric(10,2)", "searchable": false}, {"name": "said06", "source": "SAID06", "type": "numeric(10,2)", "searchable": false}, {"name": "said07", "source": "SAID07", "type": "numeric(10,2)", "searchable": false}, {"name": "said08", "source": "SAID08", "type": "numeric(10,2)", "searchable": false}, {"name": "said09", "source": "SAID09", "type": "numeric(10,2)", "searchable": false}, {"name": "said10", "source": "SAID10", "type": "numeric(10,2)", "searchable": false}, {"name": "said11", "source": "SAID11", "type": "numeric(10,2)", "searchable": false}, {"name": "said12", "source": "SAID12", "type": "numeric(10,2)", "searchable": false}, {"name": "cndcmp", "source": "CNDCMP", "type": "varchar(10)", "searchable": true}, {"name": "prcsml", "source": "PRCSML", "type": "numeric(15,3)", "searchable": false}, {"name": "mrgvnd", "source": "MRGVND", "type": "numeric(5,2)", "searchable": false}, {"name": "acrsbt", "source": "ACRSBT", "type": "numeric(5,2)", "searchable": false}, {"name": "codfis", "source": "CODFIS", "type": "integer", "searchable": false}, {"name": "estmin", "source": "ESTMIN", "type": "numeric(12,3)", "searchable": false}, {"name": "valida", "source": "VALIDA", "type": "varchar(35)", "searchable": true}, {"name": "prcata", "source": "PRCATA", "type": "numeric(18,3)", "searchable": false}, {"name": "przcmp", "source": "PRZCMP", "type": "integer", "searchable": false}, {"name": "przvnd", "source": "PRZVND", "type": "integer", "searchable": false}, {"name": "cmsvnd", "source": "CMSVND", "type": "numeric(5,2)", "searchable": false}, {"name": "cmsatc", "source": "CMSATC", "type": "numeric(5,2)", "searchable": false}, {"name": "vlrfrt", "source": "VLRFRT", "type": "numeric(10,4)", "searchable": false}, {"name": "icmscm", "source": "ICMSCM", "type": "numeric(5,2)", "searchable": false}, {"name": "przcom", "source": "PRZCOM", "type": "integer", "searchable": false}, {"name": "deprec", "source": "DEPREC", "type": "numeric(5,2)", "searchable": false}, {"name": "lucro1", "source": "LUCRO1", "type": "numeric(6,2)", "searchable": false}, {"name": "lucro2", "source": "LUCRO2", "type": "numeric(6,2)", "searchable": false}, {"name": "lucro3", "source": "LUCRO3", "type": "numeric(6,2)", "searchable": false}, {"name": "lucro4", "source": "LUCRO4", "type": "numeric(6,2)", "searchable": false}, {"name": "lucro5", "source": "LUCRO5", "type": "numeric(6,2)", "searchable": false}, {"name": "lucro6", "source": "LUCRO6", "type": "numeric(6,2)", "searchable": false}, {"name": "comis1", "source": "COMIS1", "type": "numeric(6,2)", "searchable": false}, {"name": "comis2", "source": "COMIS2", "type": "numeric(6,2)", "searchable": false}, {"name": "comis3", "source": "COMIS3", "type": "numeric(6,2)", "searchable": false}, {"name": "comis4", "source": "COMIS4", "type": "numeric(6,2)", "searchable": false}, {"name": "comis5", "source": "COMIS5", "type": "numeric(6,2)", "searchable": false}, {"name": "comis6", "source": "COMIS6", "type": "numeric(6,2)", "searchable": false}, {"name": "cusfin", "source": "CUSFIN", "type": "numeric(10,3)", "searchable": false}, {"name": "marge1", "source": "MARGE1", "type": "numeric(8,2)", "searchable": false}, {"name": "marge2", "source": "MARGE2", "type": "numeric(8,2)", "searchable": false}, {"name": "marge3", "source": "MARGE3", "type": "numeric(8,2)", "searchable": false}, {"name": "marge4", "source": "MARGE4", "type": "numeric(8,2)", "searchable": false}, {"name": "marge5", "source": "MARGE5", "type": "numeric(8,2)", "searchable": false}, {"name": "marge6", "source": "MARGE6", "type": "numeric(8,2)", "searchable": false}, {"name": "doses", "source": "DOSES", "type": "integer", "searchable": false}, {"name": "tabrep", "source": "TABREP", "type": "varchar(1)", "searchable": true}, {"name": "sugcmp", "source": "SUGCMP", "type": "varchar(1)", "searchable": true}, {"name": "abcprd", "source": "ABCPRD", "type": "varchar(1)", "searchable": true}, {"name": "imptab", "source": "IMPTAB", "type": "varchar(1)", "searchable": true}, {"name": "crgdes", "source": "CRGDES", "type": "numeric(9,3)", "searchable": false}, {"name": "refere", "source": "REFERE", "type": "varchar(15)", "searchable": true}, {"name": "peraju", "source": "PERAJU", "type": "numeric(6,2)", "searchable": false}, {"name": "dsraju", "source": "DSRAJU", "type": "varchar(55)", "searchable": true}, {"name": "observ", "source": "OBSERV", "type": "text", "searchable": true}, {"name": "local", "source": "LOCAL", "type": "varchar(4)", "searchable": true}, {"name": "venrsp", "source": "VENRSP", "type": "integer", "searchable": false}, {"name": "saldep", "source": "SALDEP", "type": "numeric(10,3)", "searchable": false}, {"name": "permin", "source": "PERMIN", "type": "numeric(6,2)", "searchable": false}, {"name": "codfis2", "source": "CODFIS2", "type": "integer", "searchable": false}, {"name": "codtr2", "source": "CODTR2", "type": "integer", "searchable": false}, {"name": "alqipi", "source": "ALQIPI", "type": "integer", "searchable": false}, {"name": "estmax", "source": "ESTMAX", "type": "numeric(12,3)", "searchable": false}, {"name": "clafis", "source": "CLAFIS", "type": "integer", "searchable": false}, {"name": "piscof", "source": "PISCOF", "type": "varchar(1)", "searchable": true}, {"name": "cusmed", "source": "CUSMED", "type": "numeric(12,2)", "searchable": false}, {"name": "peripi", "source": "PERIPI", "type": "numeric(5,2)", "searchable": false}, {"name": "tabfix", "source": "TABFIX", "type": "varchar(1)", "searchable": true}, {"name": "ptsite", "source": "PTSITE", "type": "numeric(9,3)", "searchable": false}, {"name": "perfin", "source": "PERFIN", "type": "numeric(5,2)", "searchable": false}, {"name": "qcmprz", "source": "QCMPRZ", "type": "numeric(5,2)", "searchable": false}, {"name": "qcmprc", "source": "QCMPRC", "type": "numeric(5,2)", "searchable": false}, {"name": "dsmxpr", "source": "DSMXPR", "type": "numeric(5,2)", "searchable": false}, {"name": "perprm", "source": "PERPRM", "type": "numeric(5,2)", "searchable": false}, {"name": "datprm", "source": "DATPRM", "type": "date", "searchable": false}, {"name": "przvmi", "source": "PRZVMI", "type": "varchar(1)", "searchable": true}, {"name": "qtdprm", "source": "QTDPRM", "type": "numeric(9,2)", "searchable": false}, {"name": "cstpis", "source": "CSTPIS", "type": "integer", "searchable": false}, {"name": "cdprfo", "source": "CDPRFO", "type": "varchar(20)", "searchable": true}, {"name": "tipprd", "source": "TIPPRD", "type": "varchar(2)", "searchable": true}, {"name": "icms4", "source": "ICMS4", "type": "varchar(1)", "searchable": true}, {"name": "cuscot", "source": "CUSCOT", "type": "numeric(15,3)", "searchable": false}, {"name": "datcot", "source": "DATCOT", "type": "date", "searchable": false}, {"name": "obscot", "source": "OBSCOT", "type": "varchar(35)", "searchable": true}, {"name": "cest", "source": "CEST", "type": "integer", "searchable": false}, {"name": "setor", "source": "SETOR", "type": "varchar(1)", "searchable": true}, {"name": "dsmxrv", "source": "DSMXRV", "type": "numeric(5,2)", "searchable": false}, {"name": "cdtri_nfes", "source": "CDTRI_NFES", "type": "varchar(8)", "searchable": true}, {"name": "areloj", "source": "ARELOJ", "type": "varchar(6)", "searchable": true}, {"name": "arealm", "source": "AREALM", "type": "varchar(6)", "searchable": true}, {"name": "peso", "source": "PESO", "type": "numeric(7,3)", "searchable": false}, {"name": "priati", "source": "PRIATI", "type": "integer", "searchable": false}, {"name": "proweb", "source": "PROWEB", "type": "varchar(1)", "searchable": true}, {"name": "saldep2", "source": "SALDEP2", "type": "numeric(9,2)", "searchable": false}, {"name": "codanp", "source": "CODANP", "type": "integer", "searchable": false}, {"name": "pagfrt", "source": "PAGFRT", "type": "varchar(1)", "searchable": true}, {"name": "qtesrp", "source": "QTESRP", "type": "numeric(9,2)", "searchable": false}, {"name": "recvet", "source": "RECVET", "type": "varchar(1)", "searchable": true}, {"name": "receit", "source": "RECEIT", "type": "varchar(1)", "searchable": true}, {"name": "redagr", "source": "REDAGR", "type": "varchar(2)", "searchable": true}, {"name": "extlu1", "source": "EXTLU1", "type": "numeric(6,2)", "searchable": false}, {"name": "extlu2", "source": "EXTLU2", "type": "numeric(6,2)", "searchable": false}, {"name": "extco1", "source": "EXTCO1", "type": "numeric(5,2)", "searchable": false}, {"name": "extco2", "source": "EXTCO2", "type": "numeric(5,2)", "searchable": false}, {"name": "localm", "source": "LOCALM", "type": "varchar(12)", "searchable": true}, {"name": "extma1", "source": "EXTMA1", "type": "numeric(6,2)", "searchable": false}, {"name": "extma2", "source": "EXTMA2", "type": "numeric(6,2)", "searchable": false}, {"name": "salfil", "source": "SALFIL", "type": "numeric(9,2)", "searchable": false}, {"name": "almfil", "source": "ALMFIL", "type": "numeric(9,2)", "searchable": false}, {"name": "fabfil", "source": "FABFIL", "type": "numeric(9,2)", "searchable": false}, {"name": "aentr01", "source": "AENTR01", "type": "numeric(10,2)", "searchable": false}, {"name": "aentr02", "source": "AENTR02", "type": "numeric(10,2)", "searchable": false}, {"name": "aentr03", "source": "AENTR03", "type": "numeric(10,2)", "searchable": false}, {"name": "aentr04", "source": "AENTR04", "type": "numeric(10,2)", "searchable": false}, {"name": "aentr05", "source": "AENTR05", "type": "numeric(10,2)", "searchable": false}, {"name": "aentr06", "source": "AENTR06", "type": "numeric(10,2)", "searchable": false}, {"name": "aentr07", "source": "AENTR07", "type": "numeric(10,2)", "searchable": false}, {"name": "aentr08", "source": "AENTR08", "type": "numeric(10,2)", "searchable": false}, {"name": "aentr09", "source": "AENTR09", "type": "numeric(10,2)", "searchable": false}, {"name": "aentr10", "source": "AENTR10", "type": "numeric(10,2)", "searchable": false}, {"name": "aentr11", "source": "AENTR11", "type": "numeric(10,2)", "searchable": false}, {"name": "aentr12", "source": "AENTR12", "type": "numeric(10,2)", "searchable": false}, {"name": "asaid01", "source": "ASAID01", "type": "numeric(10,2)", "searchable": false}, {"name": "asaid02", "source": "ASAID02", "type": "numeric(10,2)", "searchable": false}, {"name": "asaid03", "source": "ASAID03", "type": "numeric(10,2)", "searchable": false}, {"name": "asaid04", "source": "ASAID04", "type": "numeric(10,2)", "searchable": false}, {"name": "asaid05", "source": "ASAID05", "type": "numeric(10,2)", "searchable": false}, {"name": "asaid06", "source": "ASAID06", "type": "numeric(10,2)", "searchable": false}, {"name": "asaid07", "source": "ASAID07", "type": "numeric(10,2)", "searchable": false}, {"name": "asaid08", "source": "ASAID08", "type": "numeric(10,2)", "searchable": false}, {"name": "asaid09", "source": "ASAID09", "type": "numeric(10,2)", "searchable": false}, {"name": "asaid10", "source": "ASAID10", "type": "numeric(10,2)", "searchable": false}, {"name": "asaid11", "source": "ASAID11", "type": "numeric(10,2)", "searchable": false}, {"name": "asaid12", "source": "ASAID12", "type": "numeric(10,2)", "searchable": false}, {"name": "salfab", "source": "SALFAB", "type": "numeric(9,2)", "searchable": false}, {"name": "autser", "source": "AUTSER", "type": "varchar(1)", "searchable": true}, {"name": "datprc", "source": "DATPRC", "type": "date", "searchable": false}, {"name": "flgeta", "source": "FLGETA", "type": "varchar(1)", "searchable": true}, {"name": "alterou", "source": "ALTEROU", "type": "varchar(1)", "searchable": true}, {"name": "extlu3", "source": "EXTLU3", "type": "numeric(6,2)", "searchable": false}, {"name": "extlu4", "source": "EXTLU4", "type": "numeric(6,2)", "searchable": false}, {"name": "extma3", "source": "EXTMA3", "type": "numeric(6,2)", "searchable": false}, {"name": "extma4", "source": "EXTMA4", "type": "numeric(6,2)", "searchable": false}, {"name": "extco3", "source": "EXTCO3", "type": "numeric(5,2)", "searchable": false}, {"name": "extco4", "source": "EXTCO4", "type": "numeric(5,2)", "searchable": false}, {"name": "temser", "source": "TEMSER", "type": "varchar(1)", "searchable": true}, {"name": "salfi3", "source": "SALFI3", "type": "numeric(9,2)", "searchable": false}, {"name": "almfi3", "source": "ALMFI3", "type": "numeric(9,2)", "searchable": false}, {"name": "fabfi3", "source": "FABFI3", "type": "numeric(9,2)", "searchable": false}, {"name": "clastrib", "source": "CLASTRIB", "type": "varchar(6)", "searchable": true}]'::jsonb),
('efatablg', 'dukamp_legacy_efatablg', 'EFATABLG', 'Produtos e estoque', 'EFATABLG.DBF', 503022, '[{"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "przvnd", "source": "PRZVND", "type": "integer", "searchable": false}, {"name": "preco1", "source": "PRECO1", "type": "numeric(9,2)", "searchable": false}, {"name": "preco2", "source": "PRECO2", "type": "numeric(9,2)", "searchable": false}, {"name": "preco3", "source": "PRECO3", "type": "numeric(9,2)", "searchable": false}, {"name": "preco4", "source": "PRECO4", "type": "numeric(9,2)", "searchable": false}, {"name": "preco5", "source": "PRECO5", "type": "numeric(9,2)", "searchable": false}, {"name": "preco6", "source": "PRECO6", "type": "numeric(9,2)", "searchable": false}, {"name": "nomusu", "source": "NOMUSU", "type": "varchar(10)", "searchable": true}, {"name": "data", "source": "DATA", "type": "date", "searchable": false}, {"name": "hora", "source": "HORA", "type": "varchar(8)", "searchable": true}, {"name": "lcusrea", "source": "LCUSREA", "type": "numeric(10,2)", "searchable": false}, {"name": "lvlrfrt", "source": "LVLRFRT", "type": "numeric(10,2)", "searchable": false}, {"name": "lcrgdes", "source": "LCRGDES", "type": "numeric(9,2)", "searchable": false}, {"name": "lpermin", "source": "LPERMIN", "type": "numeric(6,2)", "searchable": false}, {"name": "lprzvmi", "source": "LPRZVMI", "type": "varchar(1)", "searchable": true}, {"name": "lprzcom", "source": "LPRZCOM", "type": "integer", "searchable": false}, {"name": "ldeprec", "source": "LDEPREC", "type": "numeric(5,2)", "searchable": false}, {"name": "lcusfin", "source": "LCUSFIN", "type": "numeric(10,2)", "searchable": false}, {"name": "lperaju", "source": "LPERAJU", "type": "numeric(6,2)", "searchable": false}, {"name": "lcstaju", "source": "LCSTAJU", "type": "numeric(10,2)", "searchable": false}, {"name": "lprcmin", "source": "LPRCMIN", "type": "numeric(10,2)", "searchable": false}]'::jsonb),
('efatabpr', 'dukamp_legacy_efatabpr', 'EFATABPR', 'Produtos e estoque', 'EFATABPR.DBF', 47554, '[{"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "przvnd", "source": "PRZVND", "type": "integer", "searchable": false}, {"name": "preco1", "source": "PRECO1", "type": "numeric(9,2)", "searchable": false}, {"name": "preco2", "source": "PRECO2", "type": "numeric(9,2)", "searchable": false}, {"name": "preco3", "source": "PRECO3", "type": "numeric(9,2)", "searchable": false}, {"name": "preco4", "source": "PRECO4", "type": "numeric(9,2)", "searchable": false}, {"name": "preco5", "source": "PRECO5", "type": "numeric(9,2)", "searchable": false}, {"name": "preco6", "source": "PRECO6", "type": "numeric(9,2)", "searchable": false}, {"name": "nomusu", "source": "NOMUSU", "type": "varchar(10)", "searchable": true}, {"name": "data", "source": "DATA", "type": "date", "searchable": false}, {"name": "hora", "source": "HORA", "type": "varchar(8)", "searchable": true}, {"name": "lcusrea", "source": "LCUSREA", "type": "numeric(10,2)", "searchable": false}, {"name": "lvlrfrt", "source": "LVLRFRT", "type": "numeric(10,2)", "searchable": false}, {"name": "lcrgdes", "source": "LCRGDES", "type": "numeric(9,2)", "searchable": false}, {"name": "lpermin", "source": "LPERMIN", "type": "numeric(6,2)", "searchable": false}, {"name": "lprzvmi", "source": "LPRZVMI", "type": "varchar(1)", "searchable": true}, {"name": "lprzcom", "source": "LPRZCOM", "type": "integer", "searchable": false}, {"name": "ldeprec", "source": "LDEPREC", "type": "numeric(5,2)", "searchable": false}, {"name": "lcusfin", "source": "LCUSFIN", "type": "numeric(10,2)", "searchable": false}, {"name": "lperaju", "source": "LPERAJU", "type": "numeric(6,2)", "searchable": false}, {"name": "lcstaju", "source": "LCSTAJU", "type": "numeric(10,2)", "searchable": false}, {"name": "lprcmin", "source": "LPRCMIN", "type": "numeric(10,2)", "searchable": false}]'::jsonb),
('efatpprd', 'dukamp_legacy_efatpprd', 'EFATPPRD', 'Produtos e estoque', 'EFATPPRD.DBF', 12, '[{"name": "tipprd", "source": "TIPPRD", "type": "varchar(2)", "searchable": true}, {"name": "descri", "source": "DESCRI", "type": "varchar(25)", "searchable": true}, {"name": "blocok", "source": "BLOCOK", "type": "varchar(1)", "searchable": true}]'::jsonb),
('efaunida', 'dukamp_legacy_efaunida', 'EFAUNIDA', 'Produtos e estoque', 'EFAUNIDA.DBF', 12, '[{"name": "frunidad", "source": "FRUNIDAD", "type": "varchar(3)", "searchable": true}, {"name": "frcasdec", "source": "FRCASDEC", "type": "integer", "searchable": false}, {"name": "frdescri", "source": "FRDESCRI", "type": "varchar(15)", "searchable": true}]'::jsonb),
('efavalid', 'dukamp_legacy_efavalid', 'EFAVALID', 'Produtos e estoque', 'EFAVALID.DBF', 273, '[{"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "nronff", "source": "NRONFF", "type": "varchar(15)", "searchable": true}, {"name": "datemi", "source": "DATEMI", "type": "date", "searchable": false}, {"name": "datval", "source": "DATVAL", "type": "date", "searchable": false}, {"name": "quanti", "source": "QUANTI", "type": "numeric(12,2)", "searchable": false}, {"name": "codfor", "source": "CODFOR", "type": "integer", "searchable": false}]'::jsonb),
('faaalqcm', 'dukamp_legacy_faaalqcm', 'FAAALQCM', 'Faturamento e vendas', 'FAAALQCM.DBF', 295, '[{"name": "tabela", "source": "TABELA", "type": "varchar(5)", "searchable": true}, {"name": "letcom", "source": "LETCOM", "type": "varchar(2)", "searchable": true}, {"name": "perdsc", "source": "PERDSC", "type": "numeric(5,2)", "searchable": false}, {"name": "perven", "source": "PERVEN", "type": "numeric(6,2)", "searchable": false}, {"name": "persup", "source": "PERSUP", "type": "numeric(6,2)", "searchable": false}, {"name": "perger", "source": "PERGER", "type": "numeric(6,2)", "searchable": false}, {"name": "cmttnf", "source": "CMTTNF", "type": "varchar(1)", "searchable": true}]'::jsonb),
('faaanp', 'dukamp_legacy_faaanp', 'FAAANP', 'Faturamento e vendas', 'FAAANP.DBF', 1141, '[{"name": "codanp", "source": "CODANP", "type": "varchar(9)", "searchable": true}, {"name": "descri", "source": "DESCRI", "type": "varchar(90)", "searchable": true}]'::jsonb),
('faabarra', 'dukamp_legacy_faabarra', 'FAABARRA', 'Faturamento e vendas', 'FAABARRA.DBF', 1175, '[{"name": "brcodpro", "source": "BRCODPRO", "type": "integer", "searchable": false}, {"name": "brcodbar", "source": "BRCODBAR", "type": "bigint", "searchable": false}, {"name": "valido_nfe", "source": "VALIDO_NFE", "type": "varchar(1)", "searchable": true}, {"name": "status", "source": "STATUS", "type": "varchar(4)", "searchable": true}, {"name": "motivo", "source": "MOTIVO", "type": "varchar(40)", "searchable": true}, {"name": "produto", "source": "PRODUTO", "type": "varchar(60)", "searchable": true}, {"name": "ncm", "source": "NCM", "type": "varchar(8)", "searchable": true}, {"name": "cest", "source": "CEST", "type": "varchar(7)", "searchable": true}, {"name": "data", "source": "DATA", "type": "varchar(25)", "searchable": true}]'::jsonb),
('faabolet', 'dukamp_legacy_faabolet', 'FAABOLET', 'Faturamento e vendas', 'faabolet.dbf', 49687, '[{"name": "bnumdupl", "source": "BNUMDUPL", "type": "integer", "searchable": false}, {"name": "bnossonr", "source": "BNOSSONR", "type": "varchar(12)", "searchable": true}, {"name": "bcodclie", "source": "BCODCLIE", "type": "integer", "searchable": false}, {"name": "bdatvect", "source": "BDATVECT", "type": "date", "searchable": false}, {"name": "bvalparc", "source": "BVALPARC", "type": "numeric(10,2)", "searchable": false}, {"name": "bdathoj", "source": "BDATHOJ", "type": "date", "searchable": false}, {"name": "bhorhoj", "source": "BHORHOJ", "type": "varchar(8)", "searchable": true}]'::jsonb),
('faabsicm', 'dukamp_legacy_faabsicm', 'FAABSICM', 'Faturamento e vendas', 'FAABSICM.DBF', 15480, '[{"name": "nnronota", "source": "NNRONOTA", "type": "integer", "searchable": false}, {"name": "nbscicms", "source": "NBSCICMS", "type": "numeric(14,2)", "searchable": false}, {"name": "nalqicms", "source": "NALQICMS", "type": "integer", "searchable": false}, {"name": "nvlricms", "source": "NVLRICMS", "type": "numeric(12,2)", "searchable": false}, {"name": "nvlrcont", "source": "NVLRCONT", "type": "numeric(14,2)", "searchable": false}]'::jsonb),
('faabsipv', 'dukamp_legacy_faabsipv', 'FAABSIPV', 'Faturamento e vendas', 'faabsipv.DBF', 6388, '[{"name": "nnronota", "source": "NNRONOTA", "type": "integer", "searchable": false}, {"name": "nbscicms", "source": "NBSCICMS", "type": "numeric(14,2)", "searchable": false}, {"name": "nalqicms", "source": "NALQICMS", "type": "integer", "searchable": false}, {"name": "nvlricms", "source": "NVLRICMS", "type": "numeric(12,2)", "searchable": false}, {"name": "nvlrcont", "source": "NVLRCONT", "type": "numeric(14,2)", "searchable": false}]'::jsonb),
('faacep', 'dukamp_legacy_faacep', 'Cadastro nacional de CEPs', 'Faturamento e vendas', 'FAACEP.DBF', 1583788, '[{"name": "cep", "source": "CEP", "type": "varchar(8)", "searchable": true}, {"name": "end", "source": "END", "type": "varchar(50)", "searchable": true}, {"name": "lado", "source": "LADO", "type": "varchar(25)", "searchable": true}, {"name": "obs", "source": "OBS", "type": "varchar(25)", "searchable": true}, {"name": "bairro", "source": "BAIRRO", "type": "varchar(25)", "searchable": true}, {"name": "cidade", "source": "CIDADE", "type": "varchar(25)", "searchable": true}, {"name": "codibge", "source": "CODIBGE", "type": "varchar(7)", "searchable": true}, {"name": "uf", "source": "UF", "type": "varchar(2)", "searchable": true}]'::jsonb),
('faacfop', 'dukamp_legacy_faacfop', 'FAACFOP', 'Faturamento e vendas', 'FAACFOP.DBF', 512, '[{"name": "cfop", "source": "CFOP", "type": "integer", "searchable": false}, {"name": "descri", "source": "DESCRI", "type": "varchar(200)", "searchable": true}]'::jsonb),
('faacidad', 'dukamp_legacy_faacidad', 'Cidades', 'Faturamento e vendas', 'FAACIDAD.DBF', 5674, '[{"name": "cdcodi", "source": "CDCODI", "type": "integer", "searchable": false}, {"name": "cdnome", "source": "CDNOME", "type": "varchar(20)", "searchable": true}, {"name": "cduf", "source": "CDUF", "type": "varchar(2)", "searchable": true}, {"name": "cdcep", "source": "CDCEP", "type": "integer", "searchable": false}, {"name": "cdddd", "source": "CDDDD", "type": "integer", "searchable": false}, {"name": "cdbco1", "source": "CDBCO1", "type": "integer", "searchable": false}, {"name": "cdbco2", "source": "CDBCO2", "type": "integer", "searchable": false}, {"name": "cdbco3", "source": "CDBCO3", "type": "integer", "searchable": false}, {"name": "cdbco4", "source": "CDBCO4", "type": "integer", "searchable": false}, {"name": "cdbco5", "source": "CDBCO5", "type": "integer", "searchable": false}, {"name": "cdbco6", "source": "CDBCO6", "type": "integer", "searchable": false}, {"name": "cdbco7", "source": "CDBCO7", "type": "integer", "searchable": false}, {"name": "cdbco8", "source": "CDBCO8", "type": "integer", "searchable": false}, {"name": "cdbco9", "source": "CDBCO9", "type": "integer", "searchable": false}, {"name": "cdbco10", "source": "CDBCO10", "type": "integer", "searchable": false}, {"name": "cdrep", "source": "CDREP", "type": "integer", "searchable": false}, {"name": "cdmuncd", "source": "CDMUNCD", "type": "integer", "searchable": false}, {"name": "cdregia", "source": "CDREGIA", "type": "varchar(6)", "searchable": true}]'::jsonb),
('faaclien', 'dukamp_legacy_faaclien', 'Clientes', 'Faturamento e vendas', 'FAACLIEN.DBF', 11362, '[{"name": "ccod", "source": "CCOD", "type": "integer", "searchable": false}, {"name": "cnome", "source": "CNOME", "type": "varchar(40)", "searchable": true}, {"name": "cend", "source": "CEND", "type": "varchar(40)", "searchable": true}, {"name": "ccid", "source": "CCID", "type": "integer", "searchable": false}, {"name": "cbair", "source": "CBAIR", "type": "varchar(20)", "searchable": true}, {"name": "ccep", "source": "CCEP", "type": "integer", "searchable": false}, {"name": "cfone", "source": "CFONE", "type": "integer", "searchable": false}, {"name": "ctelex", "source": "CTELEX", "type": "bigint", "searchable": false}, {"name": "ccgc", "source": "CCGC", "type": "varchar(14)", "searchable": true}, {"name": "cinsc", "source": "CINSC", "type": "varchar(16)", "searchable": true}, {"name": "cendp", "source": "CENDP", "type": "varchar(40)", "searchable": true}, {"name": "ccidp", "source": "CCIDP", "type": "integer", "searchable": false}, {"name": "cbaip", "source": "CBAIP", "type": "varchar(20)", "searchable": true}, {"name": "ccepp", "source": "CCEPP", "type": "integer", "searchable": false}, {"name": "clicre", "source": "CLICRE", "type": "varchar(1)", "searchable": true}, {"name": "cconce", "source": "CCONCE", "type": "integer", "searchable": false}, {"name": "ccobra", "source": "CCOBRA", "type": "integer", "searchable": false}, {"name": "cdtcad", "source": "CDTCAD", "type": "date", "searchable": false}, {"name": "ccodrep", "source": "CCODREP", "type": "integer", "searchable": false}, {"name": "cttpago", "source": "CTTPAGO", "type": "bigint", "searchable": false}, {"name": "cttdias", "source": "CTTDIAS", "type": "bigint", "searchable": false}, {"name": "cmedatr", "source": "CMEDATR", "type": "numeric(7,2)", "searchable": false}, {"name": "cmaiatr", "source": "CMAIATR", "type": "integer", "searchable": false}, {"name": "cdtutcp", "source": "CDTUTCP", "type": "date", "searchable": false}, {"name": "cvrutcp", "source": "CVRUTCP", "type": "integer", "searchable": false}, {"name": "cdtmacp", "source": "CDTMACP", "type": "date", "searchable": false}, {"name": "cvrmacp", "source": "CVRMACP", "type": "integer", "searchable": false}, {"name": "ccpames", "source": "CCPAMES", "type": "integer", "searchable": false}, {"name": "ccpaatu", "source": "CCPAATU", "type": "integer", "searchable": false}, {"name": "ccpaant", "source": "CCPAANT", "type": "integer", "searchable": false}, {"name": "cendent", "source": "CENDENT", "type": "varchar(45)", "searchable": true}, {"name": "ccodsuf", "source": "CCODSUF", "type": "bigint", "searchable": false}, {"name": "cobserv", "source": "COBSERV", "type": "text", "searchable": true}, {"name": "cfisjur", "source": "CFISJUR", "type": "integer", "searchable": false}, {"name": "cfonp", "source": "CFONP", "type": "integer", "searchable": false}, {"name": "ctipcli", "source": "CTIPCLI", "type": "varchar(3)", "searchable": true}, {"name": "cabccli", "source": "CABCCLI", "type": "varchar(1)", "searchable": true}, {"name": "ccontat", "source": "CCONTAT", "type": "varchar(15)", "searchable": true}, {"name": "cgrucli", "source": "CGRUCLI", "type": "integer", "searchable": false}, {"name": "codant", "source": "CODANT", "type": "integer", "searchable": false}, {"name": "cetique", "source": "CETIQUE", "type": "varchar(1)", "searchable": true}, {"name": "obsrot", "source": "OBSROT", "type": "text", "searchable": true}, {"name": "obstel", "source": "OBSTEL", "type": "text", "searchable": true}, {"name": "telfon", "source": "TELFON", "type": "varchar(40)", "searchable": true}, {"name": "teldtc", "source": "TELDTC", "type": "date", "searchable": false}, {"name": "telcnt", "source": "TELCNT", "type": "varchar(30)", "searchable": true}, {"name": "cemail", "source": "CEMAIL", "type": "varchar(60)", "searchable": true}, {"name": "ccel", "source": "CCEL", "type": "integer", "searchable": false}, {"name": "emailnfe", "source": "EMAILNFE", "type": "varchar(60)", "searchable": true}, {"name": "dtulcon", "source": "DTULCON", "type": "date", "searchable": false}, {"name": "crg", "source": "CRG", "type": "varchar(15)", "searchable": true}, {"name": "socgrau", "source": "SOCGRAU", "type": "varchar(30)", "searchable": true}, {"name": "socnome", "source": "SOCNOME", "type": "varchar(60)", "searchable": true}, {"name": "socende", "source": "SOCENDE", "type": "varchar(60)", "searchable": true}, {"name": "socfone", "source": "SOCFONE", "type": "varchar(30)", "searchable": true}, {"name": "trablocal", "source": "TRABLOCAL", "type": "varchar(60)", "searchable": true}, {"name": "trabend", "source": "TRABEND", "type": "varchar(60)", "searchable": true}, {"name": "trabfone", "source": "TRABFONE", "type": "varchar(30)", "searchable": true}, {"name": "comemp", "source": "COMEMP", "type": "varchar(60)", "searchable": true}, {"name": "comfone", "source": "COMFONE", "type": "varchar(30)", "searchable": true}, {"name": "comdtcd", "source": "COMDTCD", "type": "date", "searchable": false}, {"name": "comdtul", "source": "COMDTUL", "type": "date", "searchable": false}, {"name": "comvlul", "source": "COMVLUL", "type": "numeric(12,2)", "searchable": false}, {"name": "comdtma", "source": "COMDTMA", "type": "date", "searchable": false}, {"name": "comvlma", "source": "COMVLMA", "type": "numeric(12,2)", "searchable": false}, {"name": "comconpg", "source": "COMCONPG", "type": "varchar(60)", "searchable": true}, {"name": "altvend", "source": "ALTVEND", "type": "varchar(1)", "searchable": true}, {"name": "cnum", "source": "CNUM", "type": "varchar(6)", "searchable": true}, {"name": "cnump", "source": "CNUMP", "type": "varchar(6)", "searchable": true}, {"name": "cnomfan", "source": "CNOMFAN", "type": "varchar(15)", "searchable": true}, {"name": "cdddte1", "source": "CDDDTE1", "type": "integer", "searchable": false}, {"name": "cdddte2", "source": "CDDDTE2", "type": "integer", "searchable": false}, {"name": "cdddtep", "source": "CDDDTEP", "type": "integer", "searchable": false}, {"name": "cdddcel", "source": "CDDDCEL", "type": "integer", "searchable": false}, {"name": "tabcli", "source": "TABCLI", "type": "varchar(3)", "searchable": true}, {"name": "cgruecon", "source": "CGRUECON", "type": "integer", "searchable": false}, {"name": "emailbol", "source": "EMAILBOL", "type": "varchar(60)", "searchable": true}, {"name": "gedave", "source": "GEDAVE", "type": "varchar(1)", "searchable": true}, {"name": "obsgedave", "source": "OBSGEDAVE", "type": "varchar(15)", "searchable": true}, {"name": "taxabol", "source": "TAXABOL", "type": "varchar(1)", "searchable": true}, {"name": "clissp", "source": "CLISSP", "type": "varchar(1)", "searchable": true}, {"name": "cins_muni", "source": "CINS_MUNI", "type": "integer", "searchable": false}, {"name": "protescli", "source": "PROTESCLI", "type": "varchar(1)", "searchable": true}, {"name": "alterou", "source": "ALTEROU", "type": "varchar(1)", "searchable": true}, {"name": "saldoad", "source": "SALDOAD", "type": "numeric(12,2)", "searchable": false}, {"name": "pedcomp", "source": "PEDCOMP", "type": "varchar(1)", "searchable": true}, {"name": "cpfprodu", "source": "CPFPRODU", "type": "bigint", "searchable": false}, {"name": "retirf", "source": "RETIRF", "type": "varchar(1)", "searchable": true}, {"name": "vccgc", "source": "VCCGC", "type": "varchar(14)", "searchable": true}, {"name": "danfesimpl", "source": "DANFESIMPL", "type": "varchar(1)", "searchable": true}]'::jsonb),
('faacodtr', 'dukamp_legacy_faacodtr', 'FAACODTR', 'Faturamento e vendas', 'FAACODTR.DBF', 14, '[{"name": "codtri", "source": "CODTRI", "type": "integer", "searchable": false}, {"name": "substi", "source": "SUBSTI", "type": "varchar(1)", "searchable": true}]'::jsonb),
('faacomis', 'dukamp_legacy_faacomis', 'Comissões', 'Faturamento e vendas', 'FAACOMIS.DBF', 73671, '[{"name": "covende", "source": "COVENDE", "type": "integer", "searchable": false}, {"name": "conrnot", "source": "CONRNOT", "type": "integer", "searchable": false}, {"name": "conrped", "source": "CONRPED", "type": "integer", "searchable": false}, {"name": "coclien", "source": "COCLIEN", "type": "integer", "searchable": false}, {"name": "codatan", "source": "CODATAN", "type": "date", "searchable": false}, {"name": "covlnot", "source": "COVLNOT", "type": "numeric(15,2)", "searchable": false}, {"name": "covlcom", "source": "COVLCOM", "type": "numeric(14,2)", "searchable": false}, {"name": "coobser", "source": "COOBSER", "type": "varchar(40)", "searchable": true}, {"name": "coperco", "source": "COPERCO", "type": "numeric(5,2)", "searchable": false}]'::jsonb),
('faacompv', 'dukamp_legacy_faacompv', 'Comissões de pré-venda', 'Faturamento e vendas', 'faacompv.DBF', 33046, '[{"name": "covende", "source": "COVENDE", "type": "integer", "searchable": false}, {"name": "conrnot", "source": "CONRNOT", "type": "integer", "searchable": false}, {"name": "conrped", "source": "CONRPED", "type": "integer", "searchable": false}, {"name": "coclien", "source": "COCLIEN", "type": "integer", "searchable": false}, {"name": "codatan", "source": "CODATAN", "type": "date", "searchable": false}, {"name": "covlnot", "source": "COVLNOT", "type": "numeric(15,2)", "searchable": false}, {"name": "covlcom", "source": "COVLCOM", "type": "numeric(14,2)", "searchable": false}, {"name": "coobser", "source": "COOBSER", "type": "varchar(40)", "searchable": true}, {"name": "coperco", "source": "COPERCO", "type": "numeric(5,2)", "searchable": false}]'::jsonb),
('faacomti', 'dukamp_legacy_faacomti', 'Comissões por título', 'Faturamento e vendas', 'FAACOMTI.DBF', 42573, '[{"name": "covende", "source": "COVENDE", "type": "integer", "searchable": false}, {"name": "conrtit", "source": "CONRTIT", "type": "integer", "searchable": false}, {"name": "coclien", "source": "COCLIEN", "type": "integer", "searchable": false}, {"name": "codatan", "source": "CODATAN", "type": "date", "searchable": false}, {"name": "covlnot", "source": "COVLNOT", "type": "numeric(15,2)", "searchable": false}, {"name": "covlcom", "source": "COVLCOM", "type": "numeric(14,2)", "searchable": false}, {"name": "coobser", "source": "COOBSER", "type": "varchar(40)", "searchable": true}, {"name": "coperco", "source": "COPERCO", "type": "numeric(5,2)", "searchable": false}, {"name": "codtvct", "source": "CODTVCT", "type": "date", "searchable": false}, {"name": "codtemi", "source": "CODTEMI", "type": "date", "searchable": false}, {"name": "cotipvd", "source": "COTIPVD", "type": "integer", "searchable": false}, {"name": "covltit", "source": "COVLTIT", "type": "numeric(12,2)", "searchable": false}]'::jsonb),
('faacomtp', 'dukamp_legacy_faacomtp', 'Comissões por pedido', 'Faturamento e vendas', 'FAACOMTP.DBF', 15773, '[{"name": "covende", "source": "COVENDE", "type": "integer", "searchable": false}, {"name": "conrtit", "source": "CONRTIT", "type": "integer", "searchable": false}, {"name": "coclien", "source": "COCLIEN", "type": "integer", "searchable": false}, {"name": "codatan", "source": "CODATAN", "type": "date", "searchable": false}, {"name": "covlnot", "source": "COVLNOT", "type": "numeric(15,2)", "searchable": false}, {"name": "covlcom", "source": "COVLCOM", "type": "numeric(14,2)", "searchable": false}, {"name": "coobser", "source": "COOBSER", "type": "varchar(40)", "searchable": true}, {"name": "coperco", "source": "COPERCO", "type": "numeric(5,2)", "searchable": false}, {"name": "codtvct", "source": "CODTVCT", "type": "date", "searchable": false}, {"name": "codtemi", "source": "CODTEMI", "type": "date", "searchable": false}, {"name": "cotipvd", "source": "COTIPVD", "type": "integer", "searchable": false}, {"name": "covltit", "source": "COVLTIT", "type": "numeric(15,2)", "searchable": false}]'::jsonb),
('faaconcl', 'dukamp_legacy_faaconcl', 'FAACONCL', 'Faturamento e vendas', 'FAACONCL.DBF', 5, '[{"name": "cccodigo", "source": "CCCODIGO", "type": "integer", "searchable": false}, {"name": "ccdescri", "source": "CCDESCRI", "type": "varchar(40)", "searchable": true}]'::jsonb),
('faadesco', 'dukamp_legacy_faadesco', 'FAADESCO', 'Faturamento e vendas', 'FAADESCO.DBF', 271, '[{"name": "devende", "source": "DEVENDE", "type": "integer", "searchable": false}, {"name": "dedescr", "source": "DEDESCR", "type": "varchar(40)", "searchable": true}, {"name": "devalor", "source": "DEVALOR", "type": "numeric(15,2)", "searchable": false}, {"name": "detipod", "source": "DETIPOD", "type": "integer", "searchable": false}, {"name": "dedtdes", "source": "DEDTDES", "type": "date", "searchable": false}, {"name": "dedevol", "source": "DEDEVOL", "type": "numeric(12,2)", "searchable": false}]'::jsonb),
('faadolar', 'dukamp_legacy_faadolar', 'FAADOLAR', 'Faturamento e vendas', 'FAADOLAR.DBF', 11042, '[{"name": "ddata", "source": "DDATA", "type": "date", "searchable": false}, {"name": "dvalor", "source": "DVALOR", "type": "numeric(12,2)", "searchable": false}, {"name": "dvalurv", "source": "DVALURV", "type": "numeric(12,2)", "searchable": false}]'::jsonb),
('faadscti', 'dukamp_legacy_faadscti', 'FAADSCTI', 'Faturamento e vendas', 'FAADSCTI.DBF', 0, '[{"name": "devende", "source": "DEVENDE", "type": "integer", "searchable": false}, {"name": "dedescr", "source": "DEDESCR", "type": "varchar(40)", "searchable": true}, {"name": "devalor", "source": "DEVALOR", "type": "numeric(15,2)", "searchable": false}, {"name": "detipod", "source": "DETIPOD", "type": "integer", "searchable": false}, {"name": "dedtdes", "source": "DEDTDES", "type": "date", "searchable": false}]'::jsonb),
('faadsctp', 'dukamp_legacy_faadsctp', 'FAADSCTP', 'Faturamento e vendas', 'FAADSCTP.DBF', 0, '[{"name": "devende", "source": "DEVENDE", "type": "integer", "searchable": false}, {"name": "dedescr", "source": "DEDESCR", "type": "varchar(40)", "searchable": true}, {"name": "devalor", "source": "DEVALOR", "type": "numeric(15,2)", "searchable": false}, {"name": "detipod", "source": "DETIPOD", "type": "integer", "searchable": false}, {"name": "dedtdes", "source": "DEDTDES", "type": "date", "searchable": false}]'::jsonb),
('faadsvlr', 'dukamp_legacy_faadsvlr', 'FAADSVLR', 'Faturamento e vendas', 'FAADSVLR.DBF', 0, '[{"name": "devende", "source": "DEVENDE", "type": "integer", "searchable": false}, {"name": "dedescr", "source": "DEDESCR", "type": "varchar(40)", "searchable": true}, {"name": "devalor", "source": "DEVALOR", "type": "numeric(15,2)", "searchable": false}, {"name": "detipod", "source": "DETIPOD", "type": "integer", "searchable": false}, {"name": "dedtdes", "source": "DEDTDES", "type": "date", "searchable": false}]'::jsonb),
('faaentfo', 'dukamp_legacy_faaentfo', 'FAAENTFO', 'Faturamento e vendas', 'FAAENTFO.DBF', 5, '[{"name": "ncodform", "source": "NCODFORM", "type": "integer", "searchable": false}, {"name": "ndescri", "source": "NDESCRI", "type": "varchar(15)", "searchable": true}, {"name": "nentregu", "source": "NENTREGU", "type": "varchar(1)", "searchable": true}]'::jsonb),
('faaentit', 'dukamp_legacy_faaentit', 'Movimentações de estoque', 'Faturamento e vendas', 'FAAENTIT.DBF', 58254, '[{"name": "nnumpedi", "source": "NNUMPEDI", "type": "integer", "searchable": false}, {"name": "nnrorcar", "source": "NNRORCAR", "type": "integer", "searchable": false}, {"name": "nseqentr", "source": "NSEQENTR", "type": "integer", "searchable": false}, {"name": "ndatconf", "source": "NDATCONF", "type": "date", "searchable": false}, {"name": "nhorconf", "source": "NHORCONF", "type": "varchar(17)", "searchable": true}, {"name": "ncodprod", "source": "NCODPROD", "type": "integer", "searchable": false}, {"name": "nqtdconf", "source": "NQTDCONF", "type": "numeric(10,3)", "searchable": false}, {"name": "ndesprod", "source": "NDESPROD", "type": "varchar(45)", "searchable": true}, {"name": "ncusfina", "source": "NCUSFINA", "type": "numeric(10,2)", "searchable": false}, {"name": "nunidade", "source": "NUNIDADE", "type": "varchar(3)", "searchable": true}, {"name": "nnropedi", "source": "NNROPEDI", "type": "integer", "searchable": false}, {"name": "nitepedi", "source": "NITEPEDI", "type": "integer", "searchable": false}]'::jsonb),
('faaentre', 'dukamp_legacy_faaentre', 'FAAENTRE', 'Faturamento e vendas', 'FAAENTRE.DBF', 0, '[{"name": "ecod", "source": "ECOD", "type": "integer", "searchable": false}, {"name": "eend", "source": "EEND", "type": "varchar(40)", "searchable": true}, {"name": "ecid", "source": "ECID", "type": "varchar(20)", "searchable": true}, {"name": "euf", "source": "EUF", "type": "varchar(2)", "searchable": true}, {"name": "ebair", "source": "EBAIR", "type": "varchar(20)", "searchable": true}, {"name": "eddd", "source": "EDDD", "type": "integer", "searchable": false}, {"name": "efone", "source": "EFONE", "type": "integer", "searchable": false}, {"name": "edatult", "source": "EDATULT", "type": "date", "searchable": false}, {"name": "eptoref", "source": "EPTOREF", "type": "varchar(55)", "searchable": true}, {"name": "eseq", "source": "ESEQ", "type": "integer", "searchable": false}]'::jsonb),
('faaentsq', 'dukamp_legacy_faaentsq', 'Saldos de estoque', 'Faturamento e vendas', 'FAAENTSQ.DBF', 31432, '[{"name": "nnumpedi", "source": "NNUMPEDI", "type": "integer", "searchable": false}, {"name": "nnrorcar", "source": "NNRORCAR", "type": "integer", "searchable": false}, {"name": "nseqentr", "source": "NSEQENTR", "type": "integer", "searchable": false}, {"name": "ncodform", "source": "NCODFORM", "type": "integer", "searchable": false}, {"name": "obstranp", "source": "OBSTRANP", "type": "varchar(30)", "searchable": true}, {"name": "ndatentr", "source": "NDATENTR", "type": "date", "searchable": false}, {"name": "nhorentr", "source": "NHORENTR", "type": "varchar(15)", "searchable": true}, {"name": "ndatretr", "source": "NDATRETR", "type": "date", "searchable": false}, {"name": "nhorretr", "source": "NHORRETR", "type": "varchar(15)", "searchable": true}, {"name": "ncodclie", "source": "NCODCLIE", "type": "integer", "searchable": false}, {"name": "nnomclie", "source": "NNOMCLIE", "type": "varchar(40)", "searchable": true}, {"name": "nendclie", "source": "NENDCLIE", "type": "varchar(40)", "searchable": true}, {"name": "ncidclie", "source": "NCIDCLIE", "type": "varchar(20)", "searchable": true}, {"name": "nufeclie", "source": "NUFECLIE", "type": "varchar(2)", "searchable": true}, {"name": "nobserv1", "source": "NOBSERV1", "type": "varchar(41)", "searchable": true}, {"name": "nobserv2", "source": "NOBSERV2", "type": "varchar(41)", "searchable": true}, {"name": "ncodvend", "source": "NCODVEND", "type": "integer", "searchable": false}, {"name": "ntotorca", "source": "NTOTORCA", "type": "numeric(12,2)", "searchable": false}, {"name": "nusuario", "source": "NUSUARIO", "type": "varchar(30)", "searchable": true}, {"name": "nnropedi", "source": "NNROPEDI", "type": "integer", "searchable": false}, {"name": "nfornece", "source": "NFORNECE", "type": "varchar(15)", "searchable": true}]'::jsonb),
('faafret2', 'dukamp_legacy_faafret2', 'FAAFRET2', 'Faturamento e vendas', 'FAAFRET2.DBF', 4, '[{"name": "ftmargem", "source": "FTMARGEM", "type": "numeric(6,2)", "searchable": false}, {"name": "ftpercen", "source": "FTPERCEN", "type": "numeric(5,2)", "searchable": false}]'::jsonb),
('faafrete', 'dukamp_legacy_faafrete', 'FAAFRETE', 'Faturamento e vendas', 'FAAFRETE.DBF', 27, '[{"name": "frestado", "source": "FRESTADO", "type": "varchar(2)", "searchable": true}, {"name": "fralqicm", "source": "FRALQICM", "type": "integer", "searchable": false}, {"name": "fralqdes", "source": "FRALQDES", "type": "numeric(5,2)", "searchable": false}, {"name": "fralqfdp", "source": "FRALQFDP", "type": "numeric(5,2)", "searchable": false}, {"name": "frinscst", "source": "FRINSCST", "type": "varchar(16)", "searchable": true}, {"name": "frdifalden", "source": "FRDIFALDEN", "type": "varchar(1)", "searchable": true}, {"name": "pibsuf", "source": "PIBSUF", "type": "numeric(8,4)", "searchable": false}]'::jsonb),
('faagrucl', 'dukamp_legacy_faagrucl', 'FAAGRUCL', 'Faturamento e vendas', 'FAAGRUCL.DBF', 36, '[{"name": "lncodlin", "source": "LNCODLIN", "type": "integer", "searchable": false}, {"name": "lndeslin", "source": "LNDESLIN", "type": "varchar(25)", "searchable": true}, {"name": "lncabeca", "source": "LNCABECA", "type": "varchar(1)", "searchable": true}, {"name": "lngrauln", "source": "LNGRAULN", "type": "integer", "searchable": false}]'::jsonb),
('faaibge', 'dukamp_legacy_faaibge', 'Códigos IBGE', 'Faturamento e vendas', 'FAAIBGE.DBF', 5565, '[{"name": "uf", "source": "UF", "type": "varchar(2)", "searchable": true}, {"name": "codigo", "source": "CODIGO", "type": "varchar(5)", "searchable": true}, {"name": "cidade", "source": "CIDADE", "type": "varchar(35)", "searchable": true}, {"name": "uf2", "source": "UF2", "type": "varchar(2)", "searchable": true}, {"name": "pibsmu", "source": "PIBSMU", "type": "numeric(8,4)", "searchable": false}]'::jsonb),
('faaitmao', 'dukamp_legacy_faaitmao', 'FAAITMAO', 'Faturamento e vendas', 'FAAITMAO.DBF', 0, '[{"name": "nnronota", "source": "NNRONOTA", "type": "integer", "searchable": false}, {"name": "nitenota", "source": "NITENOTA", "type": "integer", "searchable": false}, {"name": "codser", "source": "CODSER", "type": "integer", "searchable": false}, {"name": "preuni", "source": "PREUNI", "type": "numeric(13,2)", "searchable": false}]'::jsonb),
('faajunvc', 'dukamp_legacy_faajunvc', 'FAAJUNVC', 'Faturamento e vendas', 'FAAJUNVC.DBF', 0, '[{"name": "vdatemis", "source": "VDATEMIS", "type": "date", "searchable": false}, {"name": "vcodclie", "source": "VCODCLIE", "type": "integer", "searchable": false}, {"name": "vdatvect", "source": "VDATVECT", "type": "date", "searchable": false}, {"name": "vvalparc", "source": "VVALPARC", "type": "numeric(15,2)", "searchable": false}, {"name": "vcodcart", "source": "VCODCART", "type": "integer", "searchable": false}, {"name": "vnumdupl", "source": "VNUMDUPL", "type": "integer", "searchable": false}, {"name": "vnumnot1", "source": "VNUMNOT1", "type": "integer", "searchable": false}, {"name": "vnumnot2", "source": "VNUMNOT2", "type": "integer", "searchable": false}, {"name": "vnumnot3", "source": "VNUMNOT3", "type": "integer", "searchable": false}, {"name": "vnumnot4", "source": "VNUMNOT4", "type": "integer", "searchable": false}, {"name": "vnumnot5", "source": "VNUMNOT5", "type": "integer", "searchable": false}, {"name": "vnumnot6", "source": "VNUMNOT6", "type": "integer", "searchable": false}, {"name": "vnumnot7", "source": "VNUMNOT7", "type": "integer", "searchable": false}, {"name": "vnumnot8", "source": "VNUMNOT8", "type": "integer", "searchable": false}, {"name": "vnumnot9", "source": "VNUMNOT9", "type": "integer", "searchable": false}, {"name": "vvalnot1", "source": "VVALNOT1", "type": "numeric(12,2)", "searchable": false}, {"name": "vvalnot2", "source": "VVALNOT2", "type": "numeric(12,2)", "searchable": false}, {"name": "vvalnot3", "source": "VVALNOT3", "type": "numeric(12,2)", "searchable": false}, {"name": "vvalnot4", "source": "VVALNOT4", "type": "numeric(12,2)", "searchable": false}, {"name": "vvalnot5", "source": "VVALNOT5", "type": "numeric(12,2)", "searchable": false}, {"name": "vvalnot6", "source": "VVALNOT6", "type": "numeric(12,2)", "searchable": false}, {"name": "vvalnot7", "source": "VVALNOT7", "type": "numeric(12,2)", "searchable": false}, {"name": "vvalnot8", "source": "VVALNOT8", "type": "numeric(12,2)", "searchable": false}, {"name": "vvalnot9", "source": "VVALNOT9", "type": "numeric(12,2)", "searchable": false}, {"name": "vconpgt1", "source": "VCONPGT1", "type": "integer", "searchable": false}, {"name": "vconpgt2", "source": "VCONPGT2", "type": "integer", "searchable": false}, {"name": "vconpgt3", "source": "VCONPGT3", "type": "integer", "searchable": false}, {"name": "vconpgt4", "source": "VCONPGT4", "type": "integer", "searchable": false}, {"name": "vconpgt5", "source": "VCONPGT5", "type": "integer", "searchable": false}, {"name": "vconpgt6", "source": "VCONPGT6", "type": "integer", "searchable": false}, {"name": "vconpgt7", "source": "VCONPGT7", "type": "integer", "searchable": false}, {"name": "vconpgt8", "source": "VCONPGT8", "type": "integer", "searchable": false}, {"name": "vconpgt9", "source": "VCONPGT9", "type": "integer", "searchable": false}]'::jsonb),
('faalimit', 'dukamp_legacy_faalimit', 'FAALIMIT', 'Faturamento e vendas', 'FAALIMIT.DBF', 23, '[{"name": "lcodigo", "source": "LCODIGO", "type": "varchar(1)", "searchable": true}, {"name": "lvalor", "source": "LVALOR", "type": "integer", "searchable": false}]'::jsonb),
('faametas', 'dukamp_legacy_faametas', 'FAAMETAS', 'Faturamento e vendas', 'FAAMETAS.DBF', 17461, '[{"name": "codven", "source": "CODVEN", "type": "integer", "searchable": false}, {"name": "datval", "source": "DATVAL", "type": "date", "searchable": false}, {"name": "datfim", "source": "DATFIM", "type": "date", "searchable": false}, {"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "meta", "source": "META", "type": "integer", "searchable": false}, {"name": "premio", "source": "PREMIO", "type": "numeric(13,2)", "searchable": false}]'::jsonb),
('faametav', 'dukamp_legacy_faametav', 'FAAMETAV', 'Faturamento e vendas', 'FAAMETAV.DBF', 2, '[{"name": "codven", "source": "CODVEN", "type": "integer", "searchable": false}, {"name": "datval", "source": "DATVAL", "type": "date", "searchable": false}, {"name": "vlrmeta", "source": "VLRMETA", "type": "numeric(12,2)", "searchable": false}]'::jsonb),
('faamixit', 'dukamp_legacy_faamixit', 'FAAMIXIT', 'Faturamento e vendas', 'FAAMIXIT.DBF', 0, '[{"name": "codmix", "source": "CODMIX", "type": "integer", "searchable": false}, {"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "qtdpro", "source": "QTDPRO", "type": "numeric(9,3)", "searchable": false}, {"name": "valor", "source": "VALOR", "type": "numeric(10,3)", "searchable": false}, {"name": "nompro", "source": "NOMPRO", "type": "varchar(30)", "searchable": true}]'::jsonb),
('faamixpr', 'dukamp_legacy_faamixpr', 'FAAMIXPR', 'Faturamento e vendas', 'FAAMIXPR.DBF', 0, '[{"name": "codmix", "source": "CODMIX", "type": "integer", "searchable": false}, {"name": "datemi", "source": "DATEMI", "type": "date", "searchable": false}, {"name": "codven", "source": "CODVEN", "type": "integer", "searchable": false}, {"name": "codcli", "source": "CODCLI", "type": "integer", "searchable": false}, {"name": "cndpgt", "source": "CNDPGT", "type": "varchar(30)", "searchable": true}, {"name": "nomcom", "source": "NOMCOM", "type": "varchar(40)", "searchable": true}, {"name": "observ", "source": "OBSERV", "type": "varchar(60)", "searchable": true}, {"name": "nomcli", "source": "NOMCLI", "type": "varchar(40)", "searchable": true}, {"name": "endcli", "source": "ENDCLI", "type": "varchar(40)", "searchable": true}, {"name": "cidcli", "source": "CIDCLI", "type": "varchar(20)", "searchable": true}, {"name": "estcli", "source": "ESTCLI", "type": "varchar(2)", "searchable": true}, {"name": "cgccli", "source": "CGCCLI", "type": "varchar(14)", "searchable": true}, {"name": "insccli", "source": "INSCCLI", "type": "varchar(16)", "searchable": true}]'::jsonb),
('faamvfre', 'dukamp_legacy_faamvfre', 'FAAMVFRE', 'Faturamento e vendas', 'FAAMVFRE.DBF', 10258, '[{"name": "fnumnot", "source": "FNUMNOT", "type": "integer", "searchable": false}, {"name": "fcodtra", "source": "FCODTRA", "type": "integer", "searchable": false}, {"name": "fdatemi", "source": "FDATEMI", "type": "date", "searchable": false}, {"name": "fvlrnot", "source": "FVLRNOT", "type": "numeric(12,2)", "searchable": false}, {"name": "fvlfnot", "source": "FVLFNOT", "type": "numeric(12,2)", "searchable": false}, {"name": "fcodcli", "source": "FCODCLI", "type": "integer", "searchable": false}, {"name": "fvlrfre", "source": "FVLRFRE", "type": "numeric(12,2)", "searchable": false}, {"name": "fpesbru", "source": "FPESBRU", "type": "numeric(10,3)", "searchable": false}, {"name": "fqtdvol", "source": "FQTDVOL", "type": "integer", "searchable": false}, {"name": "fobserv", "source": "FOBSERV", "type": "varchar(50)", "searchable": true}, {"name": "fnrocnh", "source": "FNROCNH", "type": "varchar(15)", "searchable": true}, {"name": "fdatcnh", "source": "FDATCNH", "type": "date", "searchable": false}, {"name": "finfpgt", "source": "FINFPGT", "type": "varchar(50)", "searchable": true}]'::jsonb),
('faanaobl', 'dukamp_legacy_faanaobl', 'FAANAOBL', 'Faturamento e vendas', 'FAANAOBL.DBF', 0, '[{"name": "codcli", "source": "CODCLI", "type": "integer", "searchable": false}, {"name": "cpf_cnpj", "source": "CPF_CNPJ", "type": "varchar(14)", "searchable": true}]'::jsonb),
('faanatop', 'dukamp_legacy_faanatop', 'FAANATOP', 'Faturamento e vendas', 'FAANATOP.DBF', 140, '[{"name": "codoper", "source": "CODOPER", "type": "varchar(4)", "searchable": true}, {"name": "tipooper", "source": "TIPOOPER", "type": "varchar(1)", "searchable": true}, {"name": "nomeoper", "source": "NOMEOPER", "type": "varchar(26)", "searchable": true}, {"name": "fundope1", "source": "FUNDOPE1", "type": "varchar(80)", "searchable": true}, {"name": "fundope2", "source": "FUNDOPE2", "type": "varchar(80)", "searchable": true}, {"name": "aliqoper", "source": "ALIQOPER", "type": "integer", "searchable": false}, {"name": "flagoper", "source": "FLAGOPER", "type": "varchar(1)", "searchable": true}, {"name": "percredu", "source": "PERCREDU", "type": "numeric(5,2)", "searchable": false}, {"name": "codcontb", "source": "CODCONTB", "type": "integer", "searchable": false}, {"name": "entrsaid", "source": "ENTRSAID", "type": "varchar(1)", "searchable": true}, {"name": "saidestq", "source": "SAIDESTQ", "type": "varchar(1)", "searchable": true}, {"name": "entrestq", "source": "ENTRESTQ", "type": "varchar(1)", "searchable": true}, {"name": "cmploper", "source": "CMPLOPER", "type": "integer", "searchable": false}, {"name": "novocfop", "source": "NOVOCFOP", "type": "varchar(4)", "searchable": true}, {"name": "per_pis", "source": "PER_PIS", "type": "numeric(5,2)", "searchable": false}, {"name": "per_cof", "source": "PER_COF", "type": "numeric(5,2)", "searchable": false}, {"name": "cste_pis", "source": "CSTE_PIS", "type": "integer", "searchable": false}, {"name": "csts_pis", "source": "CSTS_PIS", "type": "integer", "searchable": false}, {"name": "cste_cof", "source": "CSTE_COF", "type": "integer", "searchable": false}, {"name": "csts_cof", "source": "CSTS_COF", "type": "integer", "searchable": false}, {"name": "clastrib", "source": "CLASTRIB", "type": "varchar(6)", "searchable": true}, {"name": "clasfixa", "source": "CLASFIXA", "type": "varchar(1)", "searchable": true}, {"name": "cbenef", "source": "CBENEF", "type": "varchar(8)", "searchable": true}, {"name": "tiponfe", "source": "TIPONFE", "type": "varchar(1)", "searchable": true}, {"name": "tpcredeb", "source": "TPCREDEB", "type": "varchar(2)", "searchable": true}]'::jsonb),
('faancm', 'dukamp_legacy_faancm', 'NCM', 'Faturamento e vendas', 'FAANCM.DBF', 15144, '[{"name": "ncm", "source": "NCM", "type": "integer", "searchable": false}, {"name": "descri", "source": "DESCRI", "type": "varchar(100)", "searchable": true}, {"name": "clastrib1", "source": "CLASTRIB1", "type": "varchar(6)", "searchable": true}, {"name": "clastrib2", "source": "CLASTRIB2", "type": "varchar(6)", "searchable": true}, {"name": "clastrib3", "source": "CLASTRIB3", "type": "varchar(6)", "searchable": true}, {"name": "clastrib4", "source": "CLASTRIB4", "type": "varchar(6)", "searchable": true}, {"name": "lei1", "source": "LEI1", "type": "varchar(80)", "searchable": true}, {"name": "lei2", "source": "LEI2", "type": "varchar(80)", "searchable": true}, {"name": "lei3", "source": "LEI3", "type": "varchar(80)", "searchable": true}, {"name": "lei4", "source": "LEI4", "type": "varchar(80)", "searchable": true}]'::jsonb),
('faanfe', 'dukamp_legacy_faanfe', 'FAANFE', 'Faturamento e vendas', 'FAANFE.DBF', 1, '[{"name": "cpj_emi", "source": "CPJ_EMI", "type": "varchar(14)", "searchable": true}, {"name": "ins_emi", "source": "INS_EMI", "type": "varchar(14)", "searchable": true}, {"name": "emp_emi", "source": "EMP_EMI", "type": "varchar(60)", "searchable": true}, {"name": "nom_fan", "source": "NOM_FAN", "type": "varchar(60)", "searchable": true}, {"name": "end_emi", "source": "END_EMI", "type": "varchar(60)", "searchable": true}, {"name": "nro_emi", "source": "NRO_EMI", "type": "varchar(60)", "searchable": true}, {"name": "cmp_emi", "source": "CMP_EMI", "type": "varchar(60)", "searchable": true}, {"name": "bai_emi", "source": "BAI_EMI", "type": "varchar(60)", "searchable": true}, {"name": "cid_emi", "source": "CID_EMI", "type": "varchar(60)", "searchable": true}, {"name": "ufe_emi", "source": "UFE_EMI", "type": "varchar(2)", "searchable": true}, {"name": "cep_emi", "source": "CEP_EMI", "type": "integer", "searchable": false}, {"name": "fon_emi", "source": "FON_EMI", "type": "varchar(10)", "searchable": true}, {"name": "ser_nfe", "source": "SER_NFE", "type": "varchar(3)", "searchable": true}, {"name": "mun_emi", "source": "MUN_EMI", "type": "varchar(7)", "searchable": true}, {"name": "mod_nfe", "source": "MOD_NFE", "type": "varchar(2)", "searchable": true}, {"name": "prd_hom", "source": "PRD_HOM", "type": "varchar(1)", "searchable": true}, {"name": "lay_txt", "source": "LAY_TXT", "type": "varchar(1)", "searchable": true}, {"name": "email", "source": "EMAIL", "type": "varchar(60)", "searchable": true}, {"name": "dir_nfe", "source": "DIR_NFE", "type": "varchar(11)", "searchable": true}, {"name": "versao", "source": "VERSAO", "type": "varchar(2)", "searchable": true}, {"name": "imu_emi", "source": "IMU_EMI", "type": "varchar(10)", "searchable": true}, {"name": "cnae_emi", "source": "CNAE_EMI", "type": "varchar(7)", "searchable": true}, {"name": "regtri_emi", "source": "REGTRI_EMI", "type": "varchar(1)", "searchable": true}, {"name": "form_env", "source": "FORM_ENV", "type": "varchar(1)", "searchable": true}, {"name": "hrverao", "source": "HRVERAO", "type": "varchar(1)", "searchable": true}, {"name": "dir_sat", "source": "DIR_SAT", "type": "varchar(21)", "searchable": true}, {"name": "sat_signac", "source": "SAT_SIGNAC", "type": "varchar(344)", "searchable": false}, {"name": "sat_cnpjac", "source": "SAT_CNPJAC", "type": "varchar(14)", "searchable": true}, {"name": "sat_prdhom", "source": "SAT_PRDHOM", "type": "varchar(1)", "searchable": true}, {"name": "sat_versao", "source": "SAT_VERSAO", "type": "varchar(4)", "searchable": true}, {"name": "nfce", "source": "NFCE", "type": "varchar(1)", "searchable": true}, {"name": "nfce_dir", "source": "NFCE_DIR", "type": "varchar(20)", "searchable": true}, {"name": "nfce_versa", "source": "NFCE_VERSA", "type": "varchar(2)", "searchable": true}, {"name": "nfce_prdho", "source": "NFCE_PRDHO", "type": "varchar(1)", "searchable": true}, {"name": "nfce_serie", "source": "NFCE_SERIE", "type": "varchar(3)", "searchable": true}, {"name": "nfce_mod", "source": "NFCE_MOD", "type": "varchar(2)", "searchable": true}, {"name": "nfce_foren", "source": "NFCE_FOREN", "type": "varchar(1)", "searchable": true}, {"name": "nfce_layou", "source": "NFCE_LAYOU", "type": "varchar(1)", "searchable": true}]'::jsonb),
('faanitpv', 'dukamp_legacy_faanitpv', 'Itens das pré-vendas', 'Faturamento e vendas', 'FAANITPV.DBF', 57665, '[{"name": "nnronota", "source": "NNRONOTA", "type": "integer", "searchable": false}, {"name": "nitenota", "source": "NITENOTA", "type": "integer", "searchable": false}, {"name": "ncodprod", "source": "NCODPROD", "type": "integer", "searchable": false}, {"name": "nqtdprod", "source": "NQTDPROD", "type": "numeric(10,3)", "searchable": false}, {"name": "nvrunliq", "source": "NVRUNLIQ", "type": "numeric(15,3)", "searchable": false}, {"name": "nnropedi", "source": "NNROPEDI", "type": "integer", "searchable": false}, {"name": "ndesprod", "source": "NDESPROD", "type": "varchar(45)", "searchable": true}, {"name": "nitepedi", "source": "NITEPEDI", "type": "integer", "searchable": false}, {"name": "nalqicms", "source": "NALQICMS", "type": "numeric(5,2)", "searchable": false}, {"name": "nvlrtabe", "source": "NVLRTABE", "type": "numeric(15,3)", "searchable": false}, {"name": "nvlricms", "source": "NVLRICMS", "type": "numeric(13,2)", "searchable": false}, {"name": "nbscicms", "source": "NBSCICMS", "type": "numeric(15,2)", "searchable": false}, {"name": "nbsccomi", "source": "NBSCCOMI", "type": "numeric(12,2)", "searchable": false}, {"name": "npercomi", "source": "NPERCOMI", "type": "numeric(5,2)", "searchable": false}, {"name": "nvlrcomi", "source": "NVLRCOMI", "type": "numeric(10,2)", "searchable": false}, {"name": "ncusfina", "source": "NCUSFINA", "type": "numeric(12,2)", "searchable": false}, {"name": "ncodtrib", "source": "NCODTRIB", "type": "varchar(3)", "searchable": true}, {"name": "nredicms", "source": "NREDICMS", "type": "numeric(5,2)", "searchable": false}, {"name": "ncfopite", "source": "NCFOPITE", "type": "varchar(4)", "searchable": true}, {"name": "nproxcom", "source": "NPROXCOM", "type": "date", "searchable": false}, {"name": "nalqiva", "source": "NALQIVA", "type": "numeric(5,2)", "searchable": false}, {"name": "nbscicst", "source": "NBSCICST", "type": "numeric(12,2)", "searchable": false}, {"name": "nvlricst", "source": "NVLRICST", "type": "numeric(12,2)", "searchable": false}, {"name": "nalqredu", "source": "NALQREDU", "type": "numeric(5,2)", "searchable": false}, {"name": "nalqipi", "source": "NALQIPI", "type": "numeric(5,2)", "searchable": false}, {"name": "nbscipi", "source": "NBSCIPI", "type": "numeric(12,2)", "searchable": false}, {"name": "nvlripi", "source": "NVLRIPI", "type": "numeric(10,2)", "searchable": false}, {"name": "nbscpis", "source": "NBSCPIS", "type": "numeric(12,2)", "searchable": false}, {"name": "nalqpis", "source": "NALQPIS", "type": "numeric(5,2)", "searchable": false}, {"name": "nvlrpis", "source": "NVLRPIS", "type": "numeric(10,2)", "searchable": false}, {"name": "nbsccof", "source": "NBSCCOF", "type": "numeric(12,2)", "searchable": false}, {"name": "nvlrcof", "source": "NVLRCOF", "type": "numeric(10,2)", "searchable": false}, {"name": "nalqcof", "source": "NALQCOF", "type": "numeric(5,2)", "searchable": false}, {"name": "ncstipi", "source": "NCSTIPI", "type": "varchar(2)", "searchable": true}, {"name": "nvlrfret", "source": "NVLRFRET", "type": "numeric(12,2)", "searchable": false}, {"name": "ndesaces", "source": "NDESACES", "type": "numeric(12,2)", "searchable": false}, {"name": "nvlrdesc", "source": "NVLRDESC", "type": "numeric(12,2)", "searchable": false}, {"name": "nclasfis", "source": "NCLASFIS", "type": "varchar(8)", "searchable": true}, {"name": "ndthrafe", "source": "NDTHRAFE", "type": "varchar(24)", "searchable": true}, {"name": "nqtdconf", "source": "NQTDCONF", "type": "numeric(9,3)", "searchable": false}, {"name": "npivasbt", "source": "NPIVASBT", "type": "numeric(5,2)", "searchable": false}, {"name": "npicmsbt", "source": "NPICMSBT", "type": "numeric(5,2)", "searchable": false}, {"name": "npdicsbt", "source": "NPDICSBT", "type": "numeric(5,2)", "searchable": false}, {"name": "ndicmsbt", "source": "NDICMSBT", "type": "numeric(10,2)", "searchable": false}, {"name": "npicmsmp", "source": "NPICMSMP", "type": "numeric(5,2)", "searchable": false}, {"name": "nvicmsmp", "source": "NVICMSMP", "type": "numeric(10,2)", "searchable": false}, {"name": "ncstpis", "source": "NCSTPIS", "type": "varchar(2)", "searchable": true}, {"name": "ncstcof", "source": "NCSTCOF", "type": "varchar(2)", "searchable": true}, {"name": "nvlribpt", "source": "NVLRIBPT", "type": "numeric(10,2)", "searchable": false}, {"name": "nunidade", "source": "NUNIDADE", "type": "varchar(3)", "searchable": true}, {"name": "ncest", "source": "NCEST", "type": "integer", "searchable": false}, {"name": "nvbscdes", "source": "NVBSCDES", "type": "numeric(12,2)", "searchable": false}, {"name": "npfdpdes", "source": "NPFDPDES", "type": "numeric(5,2)", "searchable": false}, {"name": "npicmdes", "source": "NPICMDES", "type": "numeric(5,2)", "searchable": false}, {"name": "npicmorg", "source": "NPICMORG", "type": "numeric(5,2)", "searchable": false}, {"name": "npprtdes", "source": "NPPRTDES", "type": "numeric(6,2)", "searchable": false}, {"name": "nvfdpdes", "source": "NVFDPDES", "type": "numeric(12,2)", "searchable": false}, {"name": "nvicmdes", "source": "NVICMDES", "type": "numeric(12,2)", "searchable": false}, {"name": "nvicmorg", "source": "NVICMORG", "type": "numeric(12,2)", "searchable": false}, {"name": "nnotboni", "source": "NNOTBONI", "type": "integer", "searchable": false}, {"name": "niteboni", "source": "NITEBONI", "type": "integer", "searchable": false}, {"name": "nbfcpst", "source": "NBFCPST", "type": "numeric(12,2)", "searchable": false}, {"name": "npfcpst", "source": "NPFCPST", "type": "numeric(5,2)", "searchable": false}, {"name": "nvfcpst", "source": "NVFCPST", "type": "numeric(10,2)", "searchable": false}, {"name": "npedcomp", "source": "NPEDCOMP", "type": "varchar(15)", "searchable": true}, {"name": "nitecomp", "source": "NITECOMP", "type": "varchar(6)", "searchable": true}, {"name": "ncodcul", "source": "NCODCUL", "type": "integer", "searchable": false}, {"name": "ntabela", "source": "NTABELA", "type": "integer", "searchable": false}, {"name": "cbenef", "source": "CBENEF", "type": "varchar(8)", "searchable": true}]'::jsonb),
('faanobpv', 'dukamp_legacy_faanobpv', 'Observações das pré-vendas', 'Faturamento e vendas', 'faanobpv.DBF', 143772, '[{"name": "nnumnota", "source": "NNUMNOTA", "type": "integer", "searchable": false}, {"name": "tipobs", "source": "TIPOBS", "type": "integer", "searchable": false}, {"name": "observ", "source": "OBSERV", "type": "varchar(150)", "searchable": true}]'::jsonb),
('faanotai', 'dukamp_legacy_faanotai', 'Itens das notas fiscais', 'Faturamento e vendas', 'FAANOTAI.DBF', 161166, '[{"name": "nnronota", "source": "NNRONOTA", "type": "integer", "searchable": false}, {"name": "nitenota", "source": "NITENOTA", "type": "integer", "searchable": false}, {"name": "ncodprod", "source": "NCODPROD", "type": "integer", "searchable": false}, {"name": "nqtdprod", "source": "NQTDPROD", "type": "numeric(10,3)", "searchable": false}, {"name": "nvrunliq", "source": "NVRUNLIQ", "type": "numeric(15,3)", "searchable": false}, {"name": "nnropedi", "source": "NNROPEDI", "type": "integer", "searchable": false}, {"name": "ndesprod", "source": "NDESPROD", "type": "varchar(45)", "searchable": true}, {"name": "nitepedi", "source": "NITEPEDI", "type": "integer", "searchable": false}, {"name": "nalqicms", "source": "NALQICMS", "type": "numeric(5,2)", "searchable": false}, {"name": "nvlrtabe", "source": "NVLRTABE", "type": "numeric(15,3)", "searchable": false}, {"name": "nvlricms", "source": "NVLRICMS", "type": "numeric(13,2)", "searchable": false}, {"name": "nbscicms", "source": "NBSCICMS", "type": "numeric(15,2)", "searchable": false}, {"name": "nbsccomi", "source": "NBSCCOMI", "type": "numeric(12,2)", "searchable": false}, {"name": "nperven", "source": "NPERVEN", "type": "numeric(5,2)", "searchable": false}, {"name": "ncmsven", "source": "NCMSVEN", "type": "numeric(10,2)", "searchable": false}, {"name": "ncusfina", "source": "NCUSFINA", "type": "numeric(12,3)", "searchable": false}, {"name": "nalqipi", "source": "NALQIPI", "type": "integer", "searchable": false}, {"name": "nvlripi", "source": "NVLRIPI", "type": "numeric(13,2)", "searchable": false}, {"name": "nperger", "source": "NPERGER", "type": "numeric(5,2)", "searchable": false}, {"name": "ncmsger", "source": "NCMSGER", "type": "numeric(10,2)", "searchable": false}, {"name": "npersup", "source": "NPERSUP", "type": "numeric(5,2)", "searchable": false}, {"name": "ncmssup", "source": "NCMSSUP", "type": "numeric(10,2)", "searchable": false}, {"name": "nfincom", "source": "NFINCOM", "type": "numeric(5,2)", "searchable": false}, {"name": "nfrtcom", "source": "NFRTCOM", "type": "numeric(8,2)", "searchable": false}, {"name": "nletite", "source": "NLETITE", "type": "varchar(2)", "searchable": true}, {"name": "ncodtrib", "source": "NCODTRIB", "type": "varchar(3)", "searchable": true}, {"name": "nalqiva", "source": "NALQIVA", "type": "numeric(5,2)", "searchable": false}, {"name": "nbscicst", "source": "NBSCICST", "type": "numeric(12,2)", "searchable": false}, {"name": "nvlricst", "source": "NVLRICST", "type": "numeric(12,2)", "searchable": false}, {"name": "npivasbt", "source": "NPIVASBT", "type": "numeric(5,2)", "searchable": false}, {"name": "npicmsbt", "source": "NPICMSBT", "type": "numeric(5,2)", "searchable": false}, {"name": "npdicsbt", "source": "NPDICSBT", "type": "numeric(5,2)", "searchable": false}, {"name": "ndicmsbt", "source": "NDICMSBT", "type": "numeric(10,2)", "searchable": false}, {"name": "nalqredu", "source": "NALQREDU", "type": "numeric(5,2)", "searchable": false}, {"name": "nbscipi", "source": "NBSCIPI", "type": "numeric(12,2)", "searchable": false}, {"name": "nbscpis", "source": "NBSCPIS", "type": "numeric(12,2)", "searchable": false}, {"name": "nalqpis", "source": "NALQPIS", "type": "numeric(5,2)", "searchable": false}, {"name": "nvlrpis", "source": "NVLRPIS", "type": "numeric(10,2)", "searchable": false}, {"name": "ncstpis", "source": "NCSTPIS", "type": "varchar(2)", "searchable": true}, {"name": "nbsccof", "source": "NBSCCOF", "type": "numeric(12,2)", "searchable": false}, {"name": "nalqcof", "source": "NALQCOF", "type": "numeric(5,2)", "searchable": false}, {"name": "nvlrcof", "source": "NVLRCOF", "type": "numeric(10,2)", "searchable": false}, {"name": "ncstcof", "source": "NCSTCOF", "type": "varchar(2)", "searchable": true}, {"name": "nclasfis", "source": "NCLASFIS", "type": "varchar(8)", "searchable": true}, {"name": "ncstipi", "source": "NCSTIPI", "type": "varchar(2)", "searchable": true}, {"name": "nvlrfret", "source": "NVLRFRET", "type": "numeric(12,2)", "searchable": false}, {"name": "ndesaces", "source": "NDESACES", "type": "numeric(12,2)", "searchable": false}, {"name": "nvlrdesc", "source": "NVLRDESC", "type": "numeric(12,2)", "searchable": false}, {"name": "ncfopite", "source": "NCFOPITE", "type": "varchar(4)", "searchable": true}, {"name": "nunidade", "source": "NUNIDADE", "type": "varchar(3)", "searchable": true}, {"name": "npicmsmp", "source": "NPICMSMP", "type": "numeric(5,2)", "searchable": false}, {"name": "nvicmsmp", "source": "NVICMSMP", "type": "numeric(10,2)", "searchable": false}, {"name": "nnotboni", "source": "NNOTBONI", "type": "integer", "searchable": false}, {"name": "niteboni", "source": "NITEBONI", "type": "integer", "searchable": false}, {"name": "nvlribpt", "source": "NVLRIBPT", "type": "numeric(10,2)", "searchable": false}, {"name": "nvbscdes", "source": "NVBSCDES", "type": "numeric(12,2)", "searchable": false}, {"name": "npfdpdes", "source": "NPFDPDES", "type": "numeric(5,2)", "searchable": false}, {"name": "npicmdes", "source": "NPICMDES", "type": "numeric(5,2)", "searchable": false}, {"name": "npicmorg", "source": "NPICMORG", "type": "numeric(5,2)", "searchable": false}, {"name": "npprtdes", "source": "NPPRTDES", "type": "numeric(6,2)", "searchable": false}, {"name": "nvfdpdes", "source": "NVFDPDES", "type": "numeric(12,2)", "searchable": false}, {"name": "nvicmdes", "source": "NVICMDES", "type": "numeric(12,2)", "searchable": false}, {"name": "nvicmorg", "source": "NVICMORG", "type": "numeric(12,2)", "searchable": false}, {"name": "ncest", "source": "NCEST", "type": "integer", "searchable": false}, {"name": "nvlrcomi", "source": "NVLRCOMI", "type": "numeric(10,2)", "searchable": false}, {"name": "npercomi", "source": "NPERCOMI", "type": "numeric(5,2)", "searchable": false}, {"name": "nredicms", "source": "NREDICMS", "type": "numeric(5,2)", "searchable": false}, {"name": "nproxcom", "source": "NPROXCOM", "type": "date", "searchable": false}, {"name": "ndthrafe", "source": "NDTHRAFE", "type": "varchar(24)", "searchable": true}, {"name": "nqtdconf", "source": "NQTDCONF", "type": "numeric(9,3)", "searchable": false}, {"name": "npedcomp", "source": "NPEDCOMP", "type": "varchar(15)", "searchable": true}, {"name": "nitecomp", "source": "NITECOMP", "type": "varchar(6)", "searchable": true}, {"name": "nbfcpst", "source": "NBFCPST", "type": "numeric(12,2)", "searchable": false}, {"name": "npfcpst", "source": "NPFCPST", "type": "numeric(5,2)", "searchable": false}, {"name": "nvfcpst", "source": "NVFCPST", "type": "numeric(10,2)", "searchable": false}, {"name": "ncodcul", "source": "NCODCUL", "type": "integer", "searchable": false}, {"name": "ntabela", "source": "NTABELA", "type": "integer", "searchable": false}, {"name": "nunitrib", "source": "NUNITRIB", "type": "varchar(6)", "searchable": true}, {"name": "nqtdtrib", "source": "NQTDTRIB", "type": "numeric(10,4)", "searchable": false}, {"name": "nvrutrib", "source": "NVRUTRIB", "type": "numeric(12,5)", "searchable": false}, {"name": "nvlrii", "source": "NVLRII", "type": "numeric(12,2)", "searchable": false}, {"name": "chave_ref", "source": "CHAVE_REF", "type": "varchar(44)", "searchable": true}, {"name": "item_ref", "source": "ITEM_REF", "type": "integer", "searchable": false}, {"name": "cstis", "source": "CSTIS", "type": "varchar(3)", "searchable": true}, {"name": "clastribis", "source": "CLASTRIBIS", "type": "varchar(6)", "searchable": true}, {"name": "bcis", "source": "BCIS", "type": "numeric(15,2)", "searchable": false}, {"name": "pis", "source": "PIS", "type": "numeric(8,4)", "searchable": false}, {"name": "pisespec", "source": "PISESPEC", "type": "numeric(8,4)", "searchable": false}, {"name": "untribis", "source": "UNTRIBIS", "type": "varchar(6)", "searchable": true}, {"name": "qttribis", "source": "QTTRIBIS", "type": "numeric(11,4)", "searchable": false}, {"name": "vis", "source": "VIS", "type": "numeric(15,2)", "searchable": false}, {"name": "cstibscbs", "source": "CSTIBSCBS", "type": "varchar(3)", "searchable": true}, {"name": "clastrib", "source": "CLASTRIB", "type": "varchar(6)", "searchable": true}, {"name": "bcibscbs", "source": "BCIBSCBS", "type": "numeric(15,2)", "searchable": false}, {"name": "pibsuf", "source": "PIBSUF", "type": "numeric(8,4)", "searchable": false}, {"name": "pdifuf", "source": "PDIFUF", "type": "numeric(8,4)", "searchable": false}, {"name": "vdifuf", "source": "VDIFUF", "type": "numeric(15,2)", "searchable": false}, {"name": "vdevtriuf", "source": "VDEVTRIUF", "type": "numeric(15,2)", "searchable": false}, {"name": "predalquf", "source": "PREDALQUF", "type": "numeric(8,4)", "searchable": false}, {"name": "palqefeuf", "source": "PALQEFEUF", "type": "numeric(8,4)", "searchable": false}, {"name": "vibsuf", "source": "VIBSUF", "type": "numeric(15,2)", "searchable": false}, {"name": "pibsmu", "source": "PIBSMU", "type": "numeric(8,4)", "searchable": false}, {"name": "pdifmu", "source": "PDIFMU", "type": "numeric(8,4)", "searchable": false}, {"name": "vdifmu", "source": "VDIFMU", "type": "numeric(15,2)", "searchable": false}, {"name": "vdevtrimu", "source": "VDEVTRIMU", "type": "numeric(15,2)", "searchable": false}, {"name": "predalqmu", "source": "PREDALQMU", "type": "numeric(8,4)", "searchable": false}, {"name": "palqefemu", "source": "PALQEFEMU", "type": "numeric(8,4)", "searchable": false}, {"name": "vibsmu", "source": "VIBSMU", "type": "numeric(15,2)", "searchable": false}, {"name": "pcbs", "source": "PCBS", "type": "numeric(8,4)", "searchable": false}, {"name": "pdifcbs", "source": "PDIFCBS", "type": "numeric(8,4)", "searchable": false}, {"name": "vdifcbs", "source": "VDIFCBS", "type": "numeric(15,2)", "searchable": false}, {"name": "vdevtricbs", "source": "VDEVTRICBS", "type": "numeric(15,2)", "searchable": false}, {"name": "predalqcbs", "source": "PREDALQCBS", "type": "numeric(8,4)", "searchable": false}, {"name": "palqefecbs", "source": "PALQEFECBS", "type": "numeric(8,4)", "searchable": false}, {"name": "vcbs", "source": "VCBS", "type": "numeric(15,2)", "searchable": false}, {"name": "vtotite", "source": "VTOTITE", "type": "numeric(15,2)", "searchable": false}, {"name": "cbenef", "source": "CBENEF", "type": "varchar(8)", "searchable": true}]'::jsonb),
('faanotas', 'dukamp_legacy_faanotas', 'Notas fiscais', 'Faturamento e vendas', 'FAANOTAS.DBF', 88589, '[{"name": "nnumnota", "source": "NNUMNOTA", "type": "integer", "searchable": false}, {"name": "ndatemis", "source": "NDATEMIS", "type": "date", "searchable": false}, {"name": "ncodvend", "source": "NCODVEND", "type": "integer", "searchable": false}, {"name": "nnatoper", "source": "NNATOPER", "type": "varchar(4)", "searchable": true}, {"name": "ncodclie", "source": "NCODCLIE", "type": "integer", "searchable": false}, {"name": "nufclien", "source": "NUFCLIEN", "type": "varchar(2)", "searchable": true}, {"name": "ntotnota", "source": "NTOTNOTA", "type": "numeric(15,2)", "searchable": false}, {"name": "nalqicms", "source": "NALQICMS", "type": "integer", "searchable": false}, {"name": "ntipbicm", "source": "NTIPBICM", "type": "varchar(1)", "searchable": true}, {"name": "nvlrbicm", "source": "NVLRBICM", "type": "numeric(15,2)", "searchable": false}, {"name": "nvlricms", "source": "NVLRICMS", "type": "numeric(12,2)", "searchable": false}, {"name": "nvlrmerc", "source": "NVLRMERC", "type": "numeric(15,2)", "searchable": false}, {"name": "nvlrfret", "source": "NVLRFRET", "type": "numeric(14,2)", "searchable": false}, {"name": "nttbscom", "source": "NTTBSCOM", "type": "numeric(15,2)", "searchable": false}, {"name": "nvlrcomi", "source": "NVLRCOMI", "type": "numeric(15,2)", "searchable": false}, {"name": "nnumpedi", "source": "NNUMPEDI", "type": "integer", "searchable": false}, {"name": "ntiponot", "source": "NTIPONOT", "type": "varchar(1)", "searchable": true}, {"name": "ncancela", "source": "NCANCELA", "type": "varchar(1)", "searchable": true}, {"name": "nlocentr", "source": "NLOCENTR", "type": "varchar(64)", "searchable": true}, {"name": "npesobru", "source": "NPESOBRU", "type": "numeric(9,3)", "searchable": false}, {"name": "npesoliq", "source": "NPESOLIQ", "type": "numeric(9,3)", "searchable": false}, {"name": "nconpgt1", "source": "NCONPGT1", "type": "integer", "searchable": false}, {"name": "nconpgt2", "source": "NCONPGT2", "type": "integer", "searchable": false}, {"name": "nconpgt3", "source": "NCONPGT3", "type": "integer", "searchable": false}, {"name": "nconpgt4", "source": "NCONPGT4", "type": "integer", "searchable": false}, {"name": "nconpgt5", "source": "NCONPGT5", "type": "integer", "searchable": false}, {"name": "nconpgt6", "source": "NCONPGT6", "type": "integer", "searchable": false}, {"name": "nconpgt7", "source": "NCONPGT7", "type": "integer", "searchable": false}, {"name": "nconpgt8", "source": "NCONPGT8", "type": "integer", "searchable": false}, {"name": "nconpgt9", "source": "NCONPGT9", "type": "integer", "searchable": false}, {"name": "nconpgt10", "source": "NCONPGT10", "type": "integer", "searchable": false}, {"name": "nconpgt11", "source": "NCONPGT11", "type": "integer", "searchable": false}, {"name": "nconpgt12", "source": "NCONPGT12", "type": "integer", "searchable": false}, {"name": "nconpgt13", "source": "NCONPGT13", "type": "integer", "searchable": false}, {"name": "nconpgt14", "source": "NCONPGT14", "type": "integer", "searchable": false}, {"name": "nconpgt15", "source": "NCONPGT15", "type": "integer", "searchable": false}, {"name": "nconpgt16", "source": "NCONPGT16", "type": "integer", "searchable": false}, {"name": "nconpgt17", "source": "NCONPGT17", "type": "integer", "searchable": false}, {"name": "nconpgt18", "source": "NCONPGT18", "type": "integer", "searchable": false}, {"name": "nconpgt19", "source": "NCONPGT19", "type": "integer", "searchable": false}, {"name": "nconpgt20", "source": "NCONPGT20", "type": "integer", "searchable": false}, {"name": "nvlrdesc", "source": "NVLRDESC", "type": "numeric(15,2)", "searchable": false}, {"name": "nemidupl", "source": "NEMIDUPL", "type": "varchar(1)", "searchable": true}, {"name": "ninsdupl", "source": "NINSDUPL", "type": "varchar(1)", "searchable": true}, {"name": "nmarca", "source": "NMARCA", "type": "varchar(10)", "searchable": true}, {"name": "ncodtran", "source": "NCODTRAN", "type": "integer", "searchable": false}, {"name": "nnomtran", "source": "NNOMTRAN", "type": "varchar(40)", "searchable": true}, {"name": "nqtdvolu", "source": "NQTDVOLU", "type": "integer", "searchable": false}, {"name": "nobserv1", "source": "NOBSERV1", "type": "varchar(64)", "searchable": true}, {"name": "nobserv2", "source": "NOBSERV2", "type": "varchar(64)", "searchable": true}, {"name": "nobserv3", "source": "NOBSERV3", "type": "varchar(64)", "searchable": true}, {"name": "nobserv4", "source": "NOBSERV4", "type": "varchar(64)", "searchable": true}, {"name": "nobserv5", "source": "NOBSERV5", "type": "varchar(64)", "searchable": true}, {"name": "nflgurv", "source": "NFLGURV", "type": "varchar(1)", "searchable": true}, {"name": "ntoturvs", "source": "NTOTURVS", "type": "numeric(10,2)", "searchable": false}, {"name": "ndescicm", "source": "NDESCICM", "type": "numeric(15,2)", "searchable": false}, {"name": "nnomclie", "source": "NNOMCLIE", "type": "varchar(35)", "searchable": true}, {"name": "ncodcomp", "source": "NCODCOMP", "type": "integer", "searchable": false}, {"name": "npercomp", "source": "NPERCOMP", "type": "numeric(5,2)", "searchable": false}, {"name": "ntip_ser", "source": "NTIP_SER", "type": "varchar(3)", "searchable": true}, {"name": "ndathoje", "source": "NDATHOJE", "type": "date", "searchable": false}, {"name": "ndesaces", "source": "NDESACES", "type": "numeric(12,2)", "searchable": false}, {"name": "nbxcaixa", "source": "NBXCAIXA", "type": "varchar(1)", "searchable": true}, {"name": "nrepsupe", "source": "NREPSUPE", "type": "integer", "searchable": false}, {"name": "nrepgere", "source": "NREPGERE", "type": "integer", "searchable": false}, {"name": "npervend", "source": "NPERVEND", "type": "numeric(8,5)", "searchable": false}, {"name": "npersupe", "source": "NPERSUPE", "type": "numeric(8,5)", "searchable": false}, {"name": "npergere", "source": "NPERGERE", "type": "numeric(8,5)", "searchable": false}, {"name": "nnatope2", "source": "NNATOPE2", "type": "varchar(4)", "searchable": true}, {"name": "ntcmsven", "source": "NTCMSVEN", "type": "numeric(10,2)", "searchable": false}, {"name": "ntcmssup", "source": "NTCMSSUP", "type": "numeric(10,2)", "searchable": false}, {"name": "ntcmsger", "source": "NTCMSGER", "type": "numeric(10,2)", "searchable": false}, {"name": "ntabecom", "source": "NTABECOM", "type": "varchar(5)", "searchable": true}, {"name": "nvlrdes1", "source": "NVLRDES1", "type": "numeric(12,2)", "searchable": false}, {"name": "nvlrdes2", "source": "NVLRDES2", "type": "numeric(12,2)", "searchable": false}, {"name": "nvendor", "source": "NVENDOR", "type": "varchar(1)", "searchable": true}, {"name": "nobsadic", "source": "NOBSADIC", "type": "text", "searchable": true}, {"name": "ntotcust", "source": "NTOTCUST", "type": "numeric(10,2)", "searchable": false}, {"name": "ntotserv", "source": "NTOTSERV", "type": "numeric(10,2)", "searchable": false}, {"name": "nflemicf", "source": "NFLEMICF", "type": "varchar(1)", "searchable": true}, {"name": "ndatsaid", "source": "NDATSAID", "type": "date", "searchable": false}, {"name": "ntiponfe", "source": "NTIPONFE", "type": "varchar(1)", "searchable": true}, {"name": "npgtfret", "source": "NPGTFRET", "type": "integer", "searchable": false}, {"name": "nseq_nfe", "source": "NSEQ_NFE", "type": "integer", "searchable": false}, {"name": "nesp_vol", "source": "NESP_VOL", "type": "varchar(10)", "searchable": true}, {"name": "nins_tra", "source": "NINS_TRA", "type": "varchar(17)", "searchable": true}, {"name": "nend_tra", "source": "NEND_TRA", "type": "varchar(40)", "searchable": true}, {"name": "ncid_tra", "source": "NCID_TRA", "type": "varchar(30)", "searchable": true}, {"name": "nufe_tra", "source": "NUFE_TRA", "type": "varchar(2)", "searchable": true}, {"name": "npla_vei", "source": "NPLA_VEI", "type": "varchar(8)", "searchable": true}, {"name": "nufe_pla", "source": "NUFE_PLA", "type": "varchar(2)", "searchable": true}, {"name": "chave_nfe", "source": "CHAVE_NFE", "type": "varchar(44)", "searchable": true}, {"name": "nobscanc", "source": "NOBSCANC", "type": "varchar(30)", "searchable": true}, {"name": "nvicmsbt", "source": "NVICMSBT", "type": "numeric(12,2)", "searchable": false}, {"name": "nbicmsbt", "source": "NBICMSBT", "type": "numeric(12,2)", "searchable": false}, {"name": "nvlrtipi", "source": "NVLRTIPI", "type": "numeric(12,2)", "searchable": false}, {"name": "protc_nfe", "source": "PROTC_NFE", "type": "varchar(15)", "searchable": true}, {"name": "ncodven2", "source": "NCODVEN2", "type": "integer", "searchable": false}, {"name": "ntotibpt", "source": "NTOTIBPT", "type": "numeric(12,2)", "searchable": false}, {"name": "ncons_rev", "source": "NCONS_REV", "type": "varchar(1)", "searchable": true}, {"name": "ncntr_icm", "source": "NCNTR_ICM", "type": "varchar(1)", "searchable": true}, {"name": "ncli_pres", "source": "NCLI_PRES", "type": "varchar(1)", "searchable": true}, {"name": "noper_int", "source": "NOPER_INT", "type": "varchar(1)", "searchable": true}, {"name": "chave_ref", "source": "CHAVE_REF", "type": "varchar(44)", "searchable": true}, {"name": "ntfdpdes", "source": "NTFDPDES", "type": "numeric(12,2)", "searchable": false}, {"name": "ntdifdes", "source": "NTDIFDES", "type": "numeric(12,2)", "searchable": false}, {"name": "ntdiforg", "source": "NTDIFORG", "type": "numeric(12,2)", "searchable": false}, {"name": "ninscrst", "source": "NINSCRST", "type": "varchar(16)", "searchable": true}, {"name": "ncodaten", "source": "NCODATEN", "type": "integer", "searchable": false}, {"name": "ntrpfret", "source": "NTRPFRET", "type": "numeric(10,2)", "searchable": false}, {"name": "ncodlibv", "source": "NCODLIBV", "type": "integer", "searchable": false}, {"name": "nemconfe", "source": "NEMCONFE", "type": "varchar(9)", "searchable": true}, {"name": "npedcomp", "source": "NPEDCOMP", "type": "varchar(11)", "searchable": true}, {"name": "nvissret", "source": "NVISSRET", "type": "numeric(12,2)", "searchable": false}, {"name": "npercomi", "source": "NPERCOMI", "type": "numeric(5,2)", "searchable": false}, {"name": "ntfcpst", "source": "NTFCPST", "type": "numeric(12,2)", "searchable": false}, {"name": "indinterm", "source": "INDINTERM", "type": "varchar(1)", "searchable": true}, {"name": "idcadinter", "source": "IDCADINTER", "type": "varchar(40)", "searchable": true}, {"name": "meiopagto", "source": "MEIOPAGTO", "type": "varchar(2)", "searchable": true}, {"name": "nsepsth", "source": "NSEPSTH", "type": "varchar(1)", "searchable": true}, {"name": "nnroprev", "source": "NNROPREV", "type": "integer", "searchable": false}, {"name": "naviprz", "source": "NAVIPRZ", "type": "integer", "searchable": false}, {"name": "ncarpag", "source": "NCARPAG", "type": "integer", "searchable": false}, {"name": "nfeestoq", "source": "NFEESTOQ", "type": "varchar(2)", "searchable": true}, {"name": "emailcet", "source": "EMAILCET", "type": "varchar(2)", "searchable": true}, {"name": "nmkt", "source": "NMKT", "type": "integer", "searchable": false}, {"name": "nmktped", "source": "NMKTPED", "type": "varchar(20)", "searchable": true}, {"name": "nnumnfce", "source": "NNUMNFCE", "type": "integer", "searchable": false}, {"name": "ser_nfce", "source": "SER_NFCE", "type": "varchar(3)", "searchable": true}, {"name": "tbcibscbs", "source": "TBCIBSCBS", "type": "numeric(15,2)", "searchable": false}, {"name": "tdifuf", "source": "TDIFUF", "type": "numeric(15,2)", "searchable": false}, {"name": "tdevtriuf", "source": "TDEVTRIUF", "type": "numeric(15,2)", "searchable": false}, {"name": "tvibsuf", "source": "TVIBSUF", "type": "numeric(15,2)", "searchable": false}, {"name": "tdifmu", "source": "TDIFMU", "type": "numeric(15,2)", "searchable": false}, {"name": "tdevtrimu", "source": "TDEVTRIMU", "type": "numeric(15,2)", "searchable": false}, {"name": "tvibsmu", "source": "TVIBSMU", "type": "numeric(15,2)", "searchable": false}, {"name": "tvibs", "source": "TVIBS", "type": "numeric(15,2)", "searchable": false}, {"name": "tcredpibs", "source": "TCREDPIBS", "type": "numeric(15,2)", "searchable": false}, {"name": "tcredpcibs", "source": "TCREDPCIBS", "type": "numeric(15,2)", "searchable": false}, {"name": "tdifcbs", "source": "TDIFCBS", "type": "numeric(15,2)", "searchable": false}, {"name": "tdevtricbs", "source": "TDEVTRICBS", "type": "numeric(15,2)", "searchable": false}, {"name": "tvcbs", "source": "TVCBS", "type": "numeric(15,2)", "searchable": false}, {"name": "tcredpcbs", "source": "TCREDPCBS", "type": "numeric(15,2)", "searchable": false}, {"name": "tcredpccbs", "source": "TCREDPCCBS", "type": "numeric(15,2)", "searchable": false}, {"name": "tibsmono", "source": "TIBSMONO", "type": "numeric(15,2)", "searchable": false}, {"name": "tcbsmono", "source": "TCBSMONO", "type": "numeric(15,2)", "searchable": false}, {"name": "tibsmonrte", "source": "TIBSMONRTE", "type": "numeric(15,2)", "searchable": false}, {"name": "tcbsmonrte", "source": "TCBSMONRTE", "type": "numeric(15,2)", "searchable": false}, {"name": "tibsmonret", "source": "TIBSMONRET", "type": "numeric(15,2)", "searchable": false}, {"name": "tcbsmonret", "source": "TCBSMONRET", "type": "numeric(15,2)", "searchable": false}, {"name": "tvis", "source": "TVIS", "type": "numeric(15,2)", "searchable": false}, {"name": "tvnftot", "source": "TVNFTOT", "type": "numeric(15,2)", "searchable": false}, {"name": "ctipcli", "source": "CTIPCLI", "type": "varchar(3)", "searchable": true}, {"name": "receituari", "source": "RECEITUARI", "type": "varchar(10)", "searchable": true}, {"name": "cpfresptec", "source": "CPFRESPTEC", "type": "bigint", "searchable": false}, {"name": "vcnpj_tra", "source": "VCNPJ_TRA", "type": "varchar(14)", "searchable": true}, {"name": "vncpfcnpj", "source": "VNCPFCNPJ", "type": "varchar(14)", "searchable": true}, {"name": "vcnpjinter", "source": "VCNPJINTER", "type": "varchar(14)", "searchable": true}, {"name": "vcnpjinstp", "source": "VCNPJINSTP", "type": "varchar(14)", "searchable": true}, {"name": "cnpj_tra", "source": "CNPJ_TRA", "type": "varchar(14)", "searchable": true}, {"name": "ncpfcnpj", "source": "NCPFCNPJ", "type": "varchar(14)", "searchable": true}, {"name": "cnpjinter", "source": "CNPJINTER", "type": "varchar(14)", "searchable": true}, {"name": "cnpjinstpg", "source": "CNPJINSTPG", "type": "varchar(14)", "searchable": true}, {"name": "moddanfe", "source": "MODDANFE", "type": "varchar(1)", "searchable": true}, {"name": "tocredeb", "source": "TOCREDEB", "type": "varchar(2)", "searchable": true}, {"name": "ncodpgt", "source": "NCODPGT", "type": "integer", "searchable": false}, {"name": "nroparc", "source": "NROPARC", "type": "integer", "searchable": false}, {"name": "fluxodias", "source": "FLUXODIAS", "type": "integer", "searchable": false}]'::jsonb),
('faanotob', 'dukamp_legacy_faanotob', 'Observações das notas fiscais', 'Faturamento e vendas', 'FAANOTOB.DBF', 359503, '[{"name": "nnumnota", "source": "NNUMNOTA", "type": "integer", "searchable": false}, {"name": "tipobs", "source": "TIPOBS", "type": "integer", "searchable": false}, {"name": "observ", "source": "OBSERV", "type": "varchar(200)", "searchable": true}]'::jsonb),
('faanotpv', 'dukamp_legacy_faanotpv', 'Pré-vendas', 'Faturamento e vendas', 'FAANOTPV.DBF', 33054, '[{"name": "nnumnota", "source": "NNUMNOTA", "type": "integer", "searchable": false}, {"name": "ndatemis", "source": "NDATEMIS", "type": "date", "searchable": false}, {"name": "ncodvend", "source": "NCODVEND", "type": "integer", "searchable": false}, {"name": "nnatoper", "source": "NNATOPER", "type": "varchar(4)", "searchable": true}, {"name": "ncodclie", "source": "NCODCLIE", "type": "integer", "searchable": false}, {"name": "nufclien", "source": "NUFCLIEN", "type": "varchar(2)", "searchable": true}, {"name": "ntotnota", "source": "NTOTNOTA", "type": "numeric(15,2)", "searchable": false}, {"name": "nalqicms", "source": "NALQICMS", "type": "integer", "searchable": false}, {"name": "ntipbicm", "source": "NTIPBICM", "type": "varchar(1)", "searchable": true}, {"name": "nvlrbicm", "source": "NVLRBICM", "type": "numeric(15,2)", "searchable": false}, {"name": "nvlricms", "source": "NVLRICMS", "type": "numeric(12,2)", "searchable": false}, {"name": "nvlrmerc", "source": "NVLRMERC", "type": "numeric(15,2)", "searchable": false}, {"name": "nvlrfret", "source": "NVLRFRET", "type": "numeric(14,2)", "searchable": false}, {"name": "nvlrcomi", "source": "NVLRCOMI", "type": "numeric(15,2)", "searchable": false}, {"name": "nnumpedi", "source": "NNUMPEDI", "type": "integer", "searchable": false}, {"name": "ntiponot", "source": "NTIPONOT", "type": "varchar(1)", "searchable": true}, {"name": "ncancela", "source": "NCANCELA", "type": "varchar(1)", "searchable": true}, {"name": "nlocentr", "source": "NLOCENTR", "type": "varchar(64)", "searchable": true}, {"name": "npesobru", "source": "NPESOBRU", "type": "numeric(9,3)", "searchable": false}, {"name": "nconpgt1", "source": "NCONPGT1", "type": "integer", "searchable": false}, {"name": "nconpgt2", "source": "NCONPGT2", "type": "integer", "searchable": false}, {"name": "nconpgt3", "source": "NCONPGT3", "type": "integer", "searchable": false}, {"name": "nconpgt4", "source": "NCONPGT4", "type": "integer", "searchable": false}, {"name": "nconpgt5", "source": "NCONPGT5", "type": "integer", "searchable": false}, {"name": "nconpgt6", "source": "NCONPGT6", "type": "integer", "searchable": false}, {"name": "nconpgt7", "source": "NCONPGT7", "type": "integer", "searchable": false}, {"name": "nconpgt8", "source": "NCONPGT8", "type": "integer", "searchable": false}, {"name": "nconpgt9", "source": "NCONPGT9", "type": "integer", "searchable": false}, {"name": "nconpgt10", "source": "NCONPGT10", "type": "integer", "searchable": false}, {"name": "nconpgt11", "source": "NCONPGT11", "type": "integer", "searchable": false}, {"name": "nconpgt12", "source": "NCONPGT12", "type": "integer", "searchable": false}, {"name": "nconpgt13", "source": "NCONPGT13", "type": "integer", "searchable": false}, {"name": "nconpgt14", "source": "NCONPGT14", "type": "integer", "searchable": false}, {"name": "nconpgt15", "source": "NCONPGT15", "type": "integer", "searchable": false}, {"name": "nconpgt16", "source": "NCONPGT16", "type": "integer", "searchable": false}, {"name": "nconpgt17", "source": "NCONPGT17", "type": "integer", "searchable": false}, {"name": "nconpgt18", "source": "NCONPGT18", "type": "integer", "searchable": false}, {"name": "nconpgt19", "source": "NCONPGT19", "type": "integer", "searchable": false}, {"name": "nconpgt20", "source": "NCONPGT20", "type": "integer", "searchable": false}, {"name": "nvlrdesc", "source": "NVLRDESC", "type": "numeric(15,2)", "searchable": false}, {"name": "nemidupl", "source": "NEMIDUPL", "type": "varchar(1)", "searchable": true}, {"name": "ninsdupl", "source": "NINSDUPL", "type": "varchar(1)", "searchable": true}, {"name": "nmarca", "source": "NMARCA", "type": "varchar(10)", "searchable": true}, {"name": "ncodtran", "source": "NCODTRAN", "type": "integer", "searchable": false}, {"name": "nnomtran", "source": "NNOMTRAN", "type": "varchar(40)", "searchable": true}, {"name": "nqtdvolu", "source": "NQTDVOLU", "type": "integer", "searchable": false}, {"name": "nobserv1", "source": "NOBSERV1", "type": "varchar(64)", "searchable": true}, {"name": "nobserv2", "source": "NOBSERV2", "type": "varchar(64)", "searchable": true}, {"name": "nobserv3", "source": "NOBSERV3", "type": "varchar(64)", "searchable": true}, {"name": "nobserv4", "source": "NOBSERV4", "type": "varchar(64)", "searchable": true}, {"name": "nobserv5", "source": "NOBSERV5", "type": "varchar(64)", "searchable": true}, {"name": "nflgurv", "source": "NFLGURV", "type": "varchar(1)", "searchable": true}, {"name": "ntoturvs", "source": "NTOTURVS", "type": "numeric(10,2)", "searchable": false}, {"name": "ndescicm", "source": "NDESCICM", "type": "numeric(15,2)", "searchable": false}, {"name": "nnomclie", "source": "NNOMCLIE", "type": "varchar(35)", "searchable": true}, {"name": "ncodcomp", "source": "NCODCOMP", "type": "integer", "searchable": false}, {"name": "npercomp", "source": "NPERCOMP", "type": "numeric(5,2)", "searchable": false}, {"name": "ntip_ser", "source": "NTIP_SER", "type": "varchar(3)", "searchable": true}, {"name": "ndathoje", "source": "NDATHOJE", "type": "date", "searchable": false}, {"name": "ndesaces", "source": "NDESACES", "type": "numeric(12,2)", "searchable": false}, {"name": "nbxcaixa", "source": "NBXCAIXA", "type": "varchar(1)", "searchable": true}, {"name": "ncodven2", "source": "NCODVEN2", "type": "integer", "searchable": false}, {"name": "nnatope2", "source": "NNATOPE2", "type": "varchar(4)", "searchable": true}, {"name": "ntotserv", "source": "NTOTSERV", "type": "numeric(12,2)", "searchable": false}, {"name": "nalqiss", "source": "NALQISS", "type": "numeric(5,2)", "searchable": false}, {"name": "nbasciss", "source": "NBASCISS", "type": "numeric(12,2)", "searchable": false}, {"name": "nvlrtipi", "source": "NVLRTIPI", "type": "numeric(12,2)", "searchable": false}, {"name": "nbascirf", "source": "NBASCIRF", "type": "numeric(10,2)", "searchable": false}, {"name": "nalqirf", "source": "NALQIRF", "type": "numeric(5,2)", "searchable": false}, {"name": "ntrpfret", "source": "NTRPFRET", "type": "numeric(10,2)", "searchable": false}, {"name": "ncodaten", "source": "NCODATEN", "type": "integer", "searchable": false}, {"name": "nflemicf", "source": "NFLEMICF", "type": "varchar(1)", "searchable": true}, {"name": "ncodlibv", "source": "NCODLIBV", "type": "integer", "searchable": false}, {"name": "ndatsaid", "source": "NDATSAID", "type": "date", "searchable": false}, {"name": "ntiponfe", "source": "NTIPONFE", "type": "varchar(1)", "searchable": true}, {"name": "npgtfret", "source": "NPGTFRET", "type": "integer", "searchable": false}, {"name": "nseq_nfe", "source": "NSEQ_NFE", "type": "integer", "searchable": false}, {"name": "nesp_vol", "source": "NESP_VOL", "type": "varchar(10)", "searchable": true}, {"name": "nins_tra", "source": "NINS_TRA", "type": "varchar(17)", "searchable": true}, {"name": "nend_tra", "source": "NEND_TRA", "type": "varchar(40)", "searchable": true}, {"name": "ncid_tra", "source": "NCID_TRA", "type": "varchar(30)", "searchable": true}, {"name": "nufe_tra", "source": "NUFE_TRA", "type": "varchar(2)", "searchable": true}, {"name": "npla_vei", "source": "NPLA_VEI", "type": "varchar(8)", "searchable": true}, {"name": "nufe_pla", "source": "NUFE_PLA", "type": "varchar(2)", "searchable": true}, {"name": "chave_nfe", "source": "CHAVE_NFE", "type": "varchar(44)", "searchable": true}, {"name": "nobscanc", "source": "NOBSCANC", "type": "varchar(30)", "searchable": true}, {"name": "nvicmsbt", "source": "NVICMSBT", "type": "numeric(12,2)", "searchable": false}, {"name": "nbicmsbt", "source": "NBICMSBT", "type": "numeric(12,2)", "searchable": false}, {"name": "npesoliq", "source": "NPESOLIQ", "type": "numeric(9,3)", "searchable": false}, {"name": "protc_nfe", "source": "PROTC_NFE", "type": "varchar(15)", "searchable": true}, {"name": "nendclie", "source": "NENDCLIE", "type": "varchar(40)", "searchable": true}, {"name": "ncidclie", "source": "NCIDCLIE", "type": "varchar(20)", "searchable": true}, {"name": "ninsclie", "source": "NINSCLIE", "type": "varchar(16)", "searchable": true}, {"name": "ntotibpt", "source": "NTOTIBPT", "type": "numeric(12,2)", "searchable": false}, {"name": "nemconfe", "source": "NEMCONFE", "type": "varchar(9)", "searchable": true}, {"name": "ncons_rev", "source": "NCONS_REV", "type": "varchar(1)", "searchable": true}, {"name": "ncntr_icm", "source": "NCNTR_ICM", "type": "varchar(1)", "searchable": true}, {"name": "ncli_pres", "source": "NCLI_PRES", "type": "varchar(1)", "searchable": true}, {"name": "noper_int", "source": "NOPER_INT", "type": "varchar(1)", "searchable": true}, {"name": "chave_ref", "source": "CHAVE_REF", "type": "varchar(44)", "searchable": true}, {"name": "ntfdpdes", "source": "NTFDPDES", "type": "numeric(12,2)", "searchable": false}, {"name": "ntdifdes", "source": "NTDIFDES", "type": "numeric(12,2)", "searchable": false}, {"name": "ntdiforg", "source": "NTDIFORG", "type": "numeric(12,2)", "searchable": false}, {"name": "ninscrst", "source": "NINSCRST", "type": "varchar(16)", "searchable": true}, {"name": "nvissret", "source": "NVISSRET", "type": "numeric(12,2)", "searchable": false}, {"name": "npedcomp", "source": "NPEDCOMP", "type": "varchar(11)", "searchable": true}, {"name": "nobsadic", "source": "NOBSADIC", "type": "text", "searchable": true}, {"name": "nvendor", "source": "NVENDOR", "type": "varchar(1)", "searchable": true}, {"name": "ntcmssup", "source": "NTCMSSUP", "type": "numeric(10,2)", "searchable": false}, {"name": "ntcmsger", "source": "NTCMSGER", "type": "numeric(10,2)", "searchable": false}, {"name": "ntcnsven", "source": "NTCNSVEN", "type": "numeric(10,2)", "searchable": false}, {"name": "npergere", "source": "NPERGERE", "type": "numeric(8,5)", "searchable": false}, {"name": "npersupe", "source": "NPERSUPE", "type": "numeric(8,5)", "searchable": false}, {"name": "npervend", "source": "NPERVEND", "type": "numeric(8,5)", "searchable": false}, {"name": "indinterm", "source": "INDINTERM", "type": "varchar(1)", "searchable": true}, {"name": "idcadinter", "source": "IDCADINTER", "type": "varchar(40)", "searchable": true}, {"name": "meiopagto", "source": "MEIOPAGTO", "type": "varchar(2)", "searchable": true}, {"name": "ntfcpst", "source": "NTFCPST", "type": "numeric(12,2)", "searchable": false}, {"name": "horaprev", "source": "HORAPREV", "type": "varchar(8)", "searchable": true}, {"name": "dataemi", "source": "DATAEMI", "type": "date", "searchable": false}, {"name": "horaemi", "source": "HORAEMI", "type": "varchar(8)", "searchable": true}, {"name": "nsepsth", "source": "NSEPSTH", "type": "varchar(1)", "searchable": true}, {"name": "naviprz", "source": "NAVIPRZ", "type": "integer", "searchable": false}, {"name": "ncarpag", "source": "NCARPAG", "type": "integer", "searchable": false}, {"name": "obs1prev", "source": "OBS1PREV", "type": "varchar(64)", "searchable": true}, {"name": "obs2prev", "source": "OBS2PREV", "type": "varchar(64)", "searchable": true}, {"name": "nfeestoq", "source": "NFEESTOQ", "type": "varchar(2)", "searchable": true}, {"name": "emailcet", "source": "EMAILCET", "type": "varchar(2)", "searchable": true}, {"name": "vncpfcnpj", "source": "VNCPFCNPJ", "type": "varchar(14)", "searchable": true}, {"name": "vcnpj_tra", "source": "VCNPJ_TRA", "type": "varchar(14)", "searchable": true}, {"name": "vcnpjinter", "source": "VCNPJINTER", "type": "varchar(14)", "searchable": true}, {"name": "vcnpjinstp", "source": "VCNPJINSTP", "type": "varchar(14)", "searchable": true}, {"name": "ncpfcnpj", "source": "NCPFCNPJ", "type": "varchar(14)", "searchable": true}, {"name": "cnpjinter", "source": "CNPJINTER", "type": "varchar(14)", "searchable": true}, {"name": "cnpj_tra", "source": "CNPJ_TRA", "type": "varchar(14)", "searchable": true}, {"name": "cnpjinstpg", "source": "CNPJINSTPG", "type": "varchar(14)", "searchable": true}, {"name": "moddanfe", "source": "MODDANFE", "type": "varchar(1)", "searchable": true}, {"name": "tpcredeb", "source": "TPCREDEB", "type": "varchar(2)", "searchable": true}, {"name": "ncodpgt", "source": "NCODPGT", "type": "integer", "searchable": false}, {"name": "nroparc", "source": "NROPARC", "type": "integer", "searchable": false}, {"name": "fluxodias", "source": "FLUXODIAS", "type": "integer", "searchable": false}]'::jsonb),
('faapedid', 'dukamp_legacy_faapedid', 'Pedidos de venda', 'Faturamento e vendas', 'FAAPEDID.DBF', 2738, '[{"name": "nnumpedi", "source": "NNUMPEDI", "type": "integer", "searchable": false}, {"name": "ndatemis", "source": "NDATEMIS", "type": "date", "searchable": false}, {"name": "ncodvend", "source": "NCODVEND", "type": "integer", "searchable": false}, {"name": "nnatoper", "source": "NNATOPER", "type": "varchar(4)", "searchable": true}, {"name": "ncodclie", "source": "NCODCLIE", "type": "integer", "searchable": false}, {"name": "nufclien", "source": "NUFCLIEN", "type": "varchar(2)", "searchable": true}, {"name": "ntotpedi", "source": "NTOTPEDI", "type": "numeric(15,2)", "searchable": false}, {"name": "nalqicms", "source": "NALQICMS", "type": "integer", "searchable": false}, {"name": "nvlrmerc", "source": "NVLRMERC", "type": "numeric(15,2)", "searchable": false}, {"name": "nvlrfret", "source": "NVLRFRET", "type": "numeric(14,2)", "searchable": false}, {"name": "nttbscom", "source": "NTTBSCOM", "type": "numeric(12,2)", "searchable": false}, {"name": "nvlrcomi", "source": "NVLRCOMI", "type": "numeric(18,2)", "searchable": false}, {"name": "ncancela", "source": "NCANCELA", "type": "varchar(1)", "searchable": true}, {"name": "nlocentr", "source": "NLOCENTR", "type": "varchar(64)", "searchable": true}, {"name": "nconpgt1", "source": "NCONPGT1", "type": "integer", "searchable": false}, {"name": "nconpgt2", "source": "NCONPGT2", "type": "integer", "searchable": false}, {"name": "nconpgt3", "source": "NCONPGT3", "type": "integer", "searchable": false}, {"name": "nconpgt4", "source": "NCONPGT4", "type": "integer", "searchable": false}, {"name": "nconpgt5", "source": "NCONPGT5", "type": "integer", "searchable": false}, {"name": "nconpgt6", "source": "NCONPGT6", "type": "integer", "searchable": false}, {"name": "nconpgt7", "source": "NCONPGT7", "type": "integer", "searchable": false}, {"name": "nconpgt8", "source": "NCONPGT8", "type": "integer", "searchable": false}, {"name": "nconpgt9", "source": "NCONPGT9", "type": "integer", "searchable": false}, {"name": "nconpgt10", "source": "NCONPGT10", "type": "integer", "searchable": false}, {"name": "nconpgt11", "source": "NCONPGT11", "type": "integer", "searchable": false}, {"name": "nconpgt12", "source": "NCONPGT12", "type": "integer", "searchable": false}, {"name": "nvlrdesc", "source": "NVLRDESC", "type": "numeric(15,2)", "searchable": false}, {"name": "nobserv1", "source": "NOBSERV1", "type": "varchar(64)", "searchable": true}, {"name": "nobserv2", "source": "NOBSERV2", "type": "varchar(64)", "searchable": true}, {"name": "nflgurv", "source": "NFLGURV", "type": "varchar(1)", "searchable": true}, {"name": "ntoturvs", "source": "NTOTURVS", "type": "numeric(10,2)", "searchable": false}, {"name": "ndescicm", "source": "NDESCICM", "type": "numeric(15,2)", "searchable": false}, {"name": "nnomclie", "source": "NNOMCLIE", "type": "varchar(35)", "searchable": true}, {"name": "ncodcomp", "source": "NCODCOMP", "type": "integer", "searchable": false}, {"name": "npercomp", "source": "NPERCOMP", "type": "numeric(5,2)", "searchable": false}, {"name": "ndathoje", "source": "NDATHOJE", "type": "date", "searchable": false}, {"name": "ncomprad", "source": "NCOMPRAD", "type": "varchar(40)", "searchable": true}, {"name": "npedfatu", "source": "NPEDFATU", "type": "varchar(1)", "searchable": true}, {"name": "nbxcaixa", "source": "NBXCAIXA", "type": "varchar(1)", "searchable": true}, {"name": "nrepsupe", "source": "NREPSUPE", "type": "integer", "searchable": false}, {"name": "nrepgere", "source": "NREPGERE", "type": "integer", "searchable": false}, {"name": "npervend", "source": "NPERVEND", "type": "numeric(8,5)", "searchable": false}, {"name": "npersupe", "source": "NPERSUPE", "type": "numeric(8,5)", "searchable": false}, {"name": "npergere", "source": "NPERGERE", "type": "numeric(8,5)", "searchable": false}, {"name": "ntcmsven", "source": "NTCMSVEN", "type": "numeric(10,2)", "searchable": false}, {"name": "ntcmssup", "source": "NTCMSSUP", "type": "numeric(10,2)", "searchable": false}, {"name": "ntcmsger", "source": "NTCMSGER", "type": "numeric(10,2)", "searchable": false}, {"name": "ntabecom", "source": "NTABECOM", "type": "varchar(5)", "searchable": true}, {"name": "ntippedi", "source": "NTIPPEDI", "type": "varchar(1)", "searchable": true}, {"name": "ninsdupl", "source": "NINSDUPL", "type": "varchar(1)", "searchable": true}, {"name": "nnrficha", "source": "NNRFICHA", "type": "integer", "searchable": false}, {"name": "ncodpgt", "source": "NCODPGT", "type": "integer", "searchable": false}, {"name": "ncodven2", "source": "NCODVEN2", "type": "integer", "searchable": false}]'::jsonb),
('faapedii', 'dukamp_legacy_faapedii', 'Itens dos pedidos de venda', 'Faturamento e vendas', 'FAAPEDII.DBF', 5668, '[{"name": "nnropedi", "source": "NNROPEDI", "type": "integer", "searchable": false}, {"name": "nitepedi", "source": "NITEPEDI", "type": "integer", "searchable": false}, {"name": "ncodprod", "source": "NCODPROD", "type": "integer", "searchable": false}, {"name": "nqtdprod", "source": "NQTDPROD", "type": "numeric(10,3)", "searchable": false}, {"name": "nvrunliq", "source": "NVRUNLIQ", "type": "numeric(15,3)", "searchable": false}, {"name": "ndesprod", "source": "NDESPROD", "type": "varchar(45)", "searchable": true}, {"name": "nvlrtabe", "source": "NVLRTABE", "type": "numeric(15,3)", "searchable": false}, {"name": "natendid", "source": "NATENDID", "type": "varchar(1)", "searchable": true}, {"name": "nftnronf", "source": "NFTNRONF", "type": "integer", "searchable": false}, {"name": "nalqicms", "source": "NALQICMS", "type": "integer", "searchable": false}, {"name": "nperven", "source": "NPERVEN", "type": "numeric(5,2)", "searchable": false}, {"name": "nbsccomi", "source": "NBSCCOMI", "type": "numeric(12,2)", "searchable": false}, {"name": "ncmsven", "source": "NCMSVEN", "type": "numeric(10,2)", "searchable": false}, {"name": "ncusfina", "source": "NCUSFINA", "type": "numeric(12,3)", "searchable": false}, {"name": "nperger", "source": "NPERGER", "type": "numeric(5,2)", "searchable": false}, {"name": "ncmsger", "source": "NCMSGER", "type": "numeric(10,2)", "searchable": false}, {"name": "npersup", "source": "NPERSUP", "type": "numeric(5,2)", "searchable": false}, {"name": "ncmssup", "source": "NCMSSUP", "type": "numeric(10,2)", "searchable": false}, {"name": "nfincom", "source": "NFINCOM", "type": "numeric(5,2)", "searchable": false}, {"name": "nfrtcom", "source": "NFRTCOM", "type": "numeric(8,2)", "searchable": false}, {"name": "nletite", "source": "NLETITE", "type": "varchar(2)", "searchable": true}, {"name": "npercomi", "source": "NPERCOMI", "type": "numeric(5,2)", "searchable": false}, {"name": "nvlrcomi", "source": "NVLRCOMI", "type": "numeric(12,2)", "searchable": false}, {"name": "ntabela", "source": "NTABELA", "type": "integer", "searchable": false}]'::jsonb),
('faapedvc', 'dukamp_legacy_faapedvc', 'FAAPEDVC', 'Faturamento e vendas', 'FAAPEDVC.DBF', 1567, '[{"name": "vnumpedi", "source": "VNUMPEDI", "type": "integer", "searchable": false}, {"name": "vnroparc", "source": "VNROPARC", "type": "integer", "searchable": false}, {"name": "vdatemis", "source": "VDATEMIS", "type": "date", "searchable": false}, {"name": "vcodclie", "source": "VCODCLIE", "type": "integer", "searchable": false}, {"name": "vdatvect", "source": "VDATVECT", "type": "date", "searchable": false}, {"name": "vvalparc", "source": "VVALPARC", "type": "numeric(15,2)", "searchable": false}, {"name": "vcodcart", "source": "VCODCART", "type": "integer", "searchable": false}]'::jsonb),
('faaregsa', 'dukamp_legacy_faaregsa', 'FAAREGSA', 'Faturamento e vendas', 'FAAREGSA.DBF', 13048, '[{"name": "cpf", "source": "CPF", "type": "bigint", "searchable": false}, {"name": "codcli", "source": "CODCLI", "type": "integer", "searchable": false}, {"name": "letra", "source": "LETRA", "type": "varchar(1)", "searchable": true}]'::jsonb),
('faarepre', 'dukamp_legacy_faarepre', 'Representantes e vendedores', 'Faturamento e vendas', 'FAAREPRE.DBF', 501, '[{"name": "repcodi", "source": "REPCODI", "type": "integer", "searchable": false}, {"name": "repnome", "source": "REPNOME", "type": "varchar(35)", "searchable": true}, {"name": "repende", "source": "REPENDE", "type": "varchar(35)", "searchable": true}, {"name": "repfon1", "source": "REPFON1", "type": "varchar(14)", "searchable": true}, {"name": "repfon2", "source": "REPFON2", "type": "varchar(14)", "searchable": true}, {"name": "repcomi", "source": "REPCOMI", "type": "numeric(5,2)", "searchable": false}, {"name": "reptimp", "source": "REPTIMP", "type": "varchar(1)", "searchable": true}, {"name": "repcida", "source": "REPCIDA", "type": "varchar(20)", "searchable": true}, {"name": "repufe", "source": "REPUFE", "type": "varchar(2)", "searchable": true}, {"name": "repccor", "source": "REPCCOR", "type": "varchar(10)", "searchable": true}, {"name": "repagen", "source": "REPAGEN", "type": "varchar(10)", "searchable": true}, {"name": "repban", "source": "REPBAN", "type": "varchar(30)", "searchable": true}, {"name": "repcep", "source": "REPCEP", "type": "integer", "searchable": false}, {"name": "repinsc", "source": "REPINSC", "type": "varchar(20)", "searchable": true}, {"name": "repsitu", "source": "REPSITU", "type": "varchar(10)", "searchable": true}, {"name": "repobs", "source": "REPOBS", "type": "varchar(40)", "searchable": true}, {"name": "repcgc", "source": "REPCGC", "type": "varchar(20)", "searchable": true}, {"name": "repadmi", "source": "REPADMI", "type": "date", "searchable": false}, {"name": "repafas", "source": "REPAFAS", "type": "date", "searchable": false}, {"name": "agenda", "source": "AGENDA", "type": "text", "searchable": true}, {"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}, {"name": "repbloq", "source": "REPBLOQ", "type": "varchar(1)", "searchable": true}, {"name": "repobsb", "source": "REPOBSB", "type": "varchar(50)", "searchable": true}, {"name": "repsupe", "source": "REPSUPE", "type": "integer", "searchable": false}, {"name": "repgere", "source": "REPGERE", "type": "integer", "searchable": false}, {"name": "repsetor", "source": "REPSETOR", "type": "varchar(10)", "searchable": true}, {"name": "observ", "source": "OBSERV", "type": "text", "searchable": true}, {"name": "reppix", "source": "REPPIX", "type": "varchar(60)", "searchable": true}, {"name": "repagenb", "source": "REPAGENB", "type": "varchar(10)", "searchable": true}]'::jsonb),
('faasatad', 'dukamp_legacy_faasatad', 'FAASATAD', 'Faturamento e vendas', 'FAASATAD.DBF', 35, '[{"name": "codadm", "source": "CODADM", "type": "varchar(3)", "searchable": true}, {"name": "descri", "source": "DESCRI", "type": "varchar(60)", "searchable": true}, {"name": "cnpj", "source": "CNPJ", "type": "varchar(18)", "searchable": true}, {"name": "ativo", "source": "ATIVO", "type": "varchar(1)", "searchable": true}]'::jsonb),
('faasenha', 'dukamp_legacy_faasenha', 'FAASENHA', 'Faturamento e vendas', 'FAASENHA.DBF', 4792, '[{"name": "senha", "source": "SENHA", "type": "varchar(7)", "searchable": true}, {"name": "nronot", "source": "NRONOT", "type": "integer", "searchable": false}, {"name": "codven", "source": "CODVEN", "type": "integer", "searchable": false}]'::jsonb),
('faasped', 'dukamp_legacy_faasped', 'FAASPED', 'Faturamento e vendas', 'FAASPED.DBF', 1, '[{"name": "tipreg", "source": "TIPREG", "type": "varchar(1)", "searchable": true}, {"name": "ecf", "source": "ECF", "type": "varchar(8)", "searchable": true}, {"name": "ecf_nro", "source": "ECF_NRO", "type": "varchar(20)", "searchable": true}, {"name": "dir_ecf", "source": "DIR_ECF", "type": "varchar(20)", "searchable": true}, {"name": "nome", "source": "NOME", "type": "varchar(60)", "searchable": true}, {"name": "cpf", "source": "CPF", "type": "varchar(11)", "searchable": true}, {"name": "crc", "source": "CRC", "type": "varchar(15)", "searchable": true}, {"name": "cnpj", "source": "CNPJ", "type": "varchar(14)", "searchable": true}, {"name": "cep", "source": "CEP", "type": "varchar(8)", "searchable": true}, {"name": "end", "source": "END", "type": "varchar(60)", "searchable": true}, {"name": "num", "source": "NUM", "type": "varchar(15)", "searchable": true}, {"name": "compl", "source": "COMPL", "type": "varchar(30)", "searchable": true}, {"name": "bairro", "source": "BAIRRO", "type": "varchar(30)", "searchable": true}, {"name": "fone", "source": "FONE", "type": "varchar(15)", "searchable": true}, {"name": "fax", "source": "FAX", "type": "varchar(15)", "searchable": true}, {"name": "email", "source": "EMAIL", "type": "varchar(60)", "searchable": true}, {"name": "cod_mun", "source": "COD_MUN", "type": "varchar(7)", "searchable": true}, {"name": "hcodcta", "source": "HCODCTA", "type": "varchar(15)", "searchable": true}, {"name": "temcupom", "source": "TEMCUPOM", "type": "varchar(1)", "searchable": true}, {"name": "c170tem", "source": "C170TEM", "type": "varchar(1)", "searchable": true}, {"name": "c200cst", "source": "C200CST", "type": "varchar(1)", "searchable": true}, {"name": "cmpl_sist", "source": "CMPL_SIST", "type": "varchar(1)", "searchable": true}]'::jsonb),
('faatabir', 'dukamp_legacy_faatabir', 'FAATABIR', 'Faturamento e vendas', 'FAATABIR.DBF', 6, '[{"name": "irmesref", "source": "IRMESREF", "type": "integer", "searchable": false}, {"name": "iraliqu1", "source": "IRALIQU1", "type": "numeric(5,2)", "searchable": false}, {"name": "irvlrbs1", "source": "IRVLRBS1", "type": "numeric(18,2)", "searchable": false}, {"name": "irvlrde1", "source": "IRVLRDE1", "type": "numeric(18,2)", "searchable": false}, {"name": "iraliqu2", "source": "IRALIQU2", "type": "numeric(5,2)", "searchable": false}, {"name": "irvlrbs2", "source": "IRVLRBS2", "type": "numeric(18,2)", "searchable": false}, {"name": "irvlrde2", "source": "IRVLRDE2", "type": "numeric(18,2)", "searchable": false}, {"name": "iraliqu3", "source": "IRALIQU3", "type": "numeric(5,2)", "searchable": false}, {"name": "irvlrbs3", "source": "IRVLRBS3", "type": "numeric(18,2)", "searchable": false}, {"name": "irvlrde3", "source": "IRVLRDE3", "type": "numeric(18,2)", "searchable": false}, {"name": "iraliqu4", "source": "IRALIQU4", "type": "numeric(5,2)", "searchable": false}, {"name": "irvlrbs4", "source": "IRVLRBS4", "type": "numeric(18,2)", "searchable": false}, {"name": "irvlrde4", "source": "IRVLRDE4", "type": "numeric(18,2)", "searchable": false}, {"name": "iraliqu5", "source": "IRALIQU5", "type": "numeric(5,2)", "searchable": false}, {"name": "irvlrbs5", "source": "IRVLRBS5", "type": "numeric(18,2)", "searchable": false}, {"name": "irvlrde5", "source": "IRVLRDE5", "type": "numeric(18,2)", "searchable": false}, {"name": "irvalmin", "source": "IRVALMIN", "type": "numeric(12,2)", "searchable": false}]'::jsonb),
('faatbicm', 'dukamp_legacy_faatbicm', 'FAATBICM', 'Faturamento e vendas', 'FAATBICM.DBF', 93, '[{"name": "tiptab", "source": "TIPTAB", "type": "varchar(1)", "searchable": true}, {"name": "diamed", "source": "DIAMED", "type": "numeric(4,1)", "searchable": false}, {"name": "perfin", "source": "PERFIN", "type": "numeric(7,3)", "searchable": false}]'::jsonb),
('faatpcli', 'dukamp_legacy_faatpcli', 'FAATPCLI', 'Faturamento e vendas', 'FAATPCLI.DBF', 6, '[{"name": "tipcli", "source": "TIPCLI", "type": "varchar(3)", "searchable": true}, {"name": "descri", "source": "DESCRI", "type": "varchar(30)", "searchable": true}, {"name": "codnfe", "source": "CODNFE", "type": "integer", "searchable": false}, {"name": "cbenef", "source": "CBENEF", "type": "varchar(8)", "searchable": true}]'::jsonb),
('faatppgt', 'dukamp_legacy_faatppgt', 'FAATPPGT', 'Faturamento e vendas', 'FAATPPGT.DBF', 9, '[{"name": "ncodpgt", "source": "NCODPGT", "type": "integer", "searchable": false}, {"name": "ndescri", "source": "NDESCRI", "type": "varchar(20)", "searchable": true}, {"name": "ncodcxa", "source": "NCODCXA", "type": "integer", "searchable": false}, {"name": "ntipped", "source": "NTIPPED", "type": "varchar(1)", "searchable": true}, {"name": "sat", "source": "SAT", "type": "varchar(1)", "searchable": true}, {"name": "satcodmoe", "source": "SATCODMOE", "type": "varchar(2)", "searchable": true}, {"name": "satadm", "source": "SATADM", "type": "varchar(1)", "searchable": true}]'::jsonb),
('faatrans', 'dukamp_legacy_faatrans', 'Transportadoras', 'Faturamento e vendas', 'FAATRANS.DBF', 1341, '[{"name": "tcodi", "source": "TCODI", "type": "integer", "searchable": false}, {"name": "tnome", "source": "TNOME", "type": "varchar(40)", "searchable": true}, {"name": "tende", "source": "TENDE", "type": "varchar(40)", "searchable": true}, {"name": "tmuni", "source": "TMUNI", "type": "varchar(30)", "searchable": true}, {"name": "testa", "source": "TESTA", "type": "varchar(2)", "searchable": true}, {"name": "tplac", "source": "TPLAC", "type": "varchar(8)", "searchable": true}, {"name": "tmarc", "source": "TMARC", "type": "varchar(11)", "searchable": true}, {"name": "tufpl", "source": "TUFPL", "type": "varchar(2)", "searchable": true}, {"name": "tcgc", "source": "TCGC", "type": "varchar(14)", "searchable": true}, {"name": "tins", "source": "TINS", "type": "varchar(17)", "searchable": true}, {"name": "tfone", "source": "TFONE", "type": "varchar(20)", "searchable": true}, {"name": "tobs", "source": "TOBS", "type": "text", "searchable": true}, {"name": "tcep", "source": "TCEP", "type": "integer", "searchable": false}, {"name": "tbai", "source": "TBAI", "type": "varchar(12)", "searchable": true}, {"name": "tnomfan", "source": "TNOMFAN", "type": "varchar(20)", "searchable": true}, {"name": "tibge", "source": "TIBGE", "type": "integer", "searchable": false}, {"name": "tcel", "source": "TCEL", "type": "varchar(12)", "searchable": true}, {"name": "tnomesp", "source": "TNOMESP", "type": "varchar(35)", "searchable": true}, {"name": "ttelesp", "source": "TTELESP", "type": "varchar(12)", "searchable": true}, {"name": "trenavan", "source": "TRENAVAN", "type": "varchar(12)", "searchable": true}, {"name": "tcrnt", "source": "TCRNT", "type": "varchar(10)", "searchable": true}, {"name": "ttara", "source": "TTARA", "type": "varchar(10)", "searchable": true}, {"name": "tplacacav", "source": "TPLACACAV", "type": "varchar(8)", "searchable": true}, {"name": "tpesobru", "source": "TPESOBRU", "type": "numeric(10,3)", "searchable": false}, {"name": "tpesoliq", "source": "TPESOLIQ", "type": "numeric(10,3)", "searchable": false}, {"name": "trg", "source": "TRG", "type": "varchar(15)", "searchable": true}, {"name": "trgdt", "source": "TRGDT", "type": "date", "searchable": false}, {"name": "tpis", "source": "TPIS", "type": "varchar(15)", "searchable": true}, {"name": "tnommae", "source": "TNOMMAE", "type": "varchar(35)", "searchable": true}, {"name": "testcivil", "source": "TESTCIVIL", "type": "varchar(10)", "searchable": true}, {"name": "tcidnasc", "source": "TCIDNASC", "type": "varchar(20)", "searchable": true}, {"name": "tbanco", "source": "TBANCO", "type": "varchar(10)", "searchable": true}, {"name": "tagencia", "source": "TAGENCIA", "type": "varchar(10)", "searchable": true}, {"name": "tconta", "source": "TCONTA", "type": "varchar(20)", "searchable": true}, {"name": "tregiao", "source": "TREGIAO", "type": "varchar(10)", "searchable": true}, {"name": "tdatnas", "source": "TDATNAS", "type": "date", "searchable": false}, {"name": "vtcgc", "source": "VTCGC", "type": "varchar(14)", "searchable": true}]'::jsonb),
('faatrfre', 'dukamp_legacy_faatrfre', 'FAATRFRE', 'Faturamento e vendas', 'FAATRFRE.DBF', 5, '[{"name": "ftcodtra", "source": "FTCODTRA", "type": "integer", "searchable": false}, {"name": "ftestado", "source": "FTESTADO", "type": "varchar(2)", "searchable": true}, {"name": "ftpesmin", "source": "FTPESMIN", "type": "numeric(8,3)", "searchable": false}, {"name": "ftvlrmin", "source": "FTVLRMIN", "type": "numeric(12,2)", "searchable": false}, {"name": "ftperacr", "source": "FTPERACR", "type": "numeric(5,2)", "searchable": false}, {"name": "ftvlracr", "source": "FTVLRACR", "type": "numeric(12,2)", "searchable": false}]'::jsonb),
('faavenct', 'dukamp_legacy_faavenct', 'Vencimentos', 'Faturamento e vendas', 'FAAVENCT.DBF', 50420, '[{"name": "vnumnota", "source": "VNUMNOTA", "type": "integer", "searchable": false}, {"name": "vnroparc", "source": "VNROPARC", "type": "integer", "searchable": false}, {"name": "vdatemis", "source": "VDATEMIS", "type": "date", "searchable": false}, {"name": "vcodclie", "source": "VCODCLIE", "type": "integer", "searchable": false}, {"name": "vdatvect", "source": "VDATVECT", "type": "date", "searchable": false}, {"name": "vvalparc", "source": "VVALPARC", "type": "numeric(15,2)", "searchable": false}, {"name": "vcodcart", "source": "VCODCART", "type": "integer", "searchable": false}, {"name": "vnumdupl", "source": "VNUMDUPL", "type": "integer", "searchable": false}, {"name": "vtaxvend", "source": "VTAXVEND", "type": "numeric(6,3)", "searchable": false}, {"name": "vtaxcomp", "source": "VTAXCOMP", "type": "numeric(6,3)", "searchable": false}, {"name": "vnossonr", "source": "VNOSSONR", "type": "varchar(15)", "searchable": true}]'::jsonb),
('faavenpv', 'dukamp_legacy_faavenpv', 'Vencimentos de pré-venda', 'Faturamento e vendas', 'FAAVENPV.DBF', 16699, '[{"name": "vnumnota", "source": "VNUMNOTA", "type": "integer", "searchable": false}, {"name": "vnroparc", "source": "VNROPARC", "type": "integer", "searchable": false}, {"name": "vdatemis", "source": "VDATEMIS", "type": "date", "searchable": false}, {"name": "vcodclie", "source": "VCODCLIE", "type": "integer", "searchable": false}, {"name": "vdatvect", "source": "VDATVECT", "type": "date", "searchable": false}, {"name": "vvalparc", "source": "VVALPARC", "type": "numeric(15,2)", "searchable": false}, {"name": "vcodcart", "source": "VCODCART", "type": "integer", "searchable": false}, {"name": "vnumdupl", "source": "VNUMDUPL", "type": "integer", "searchable": false}, {"name": "vnossonr", "source": "VNOSSONR", "type": "varchar(15)", "searchable": true}, {"name": "vtaxvend", "source": "VTAXVEND", "type": "numeric(6,3)", "searchable": false}, {"name": "vtaxcomp", "source": "VTAXCOMP", "type": "numeric(6,3)", "searchable": false}]'::jsonb),
('faavlrec', 'dukamp_legacy_faavlrec', 'FAAVLREC', 'Faturamento e vendas', 'FAAVLREC.DBF', 2568, '[{"name": "covende", "source": "COVENDE", "type": "integer", "searchable": false}, {"name": "conrnot", "source": "CONRNOT", "type": "integer", "searchable": false}, {"name": "conrped", "source": "CONRPED", "type": "integer", "searchable": false}, {"name": "coclien", "source": "COCLIEN", "type": "integer", "searchable": false}, {"name": "codatan", "source": "CODATAN", "type": "date", "searchable": false}, {"name": "covlnot", "source": "COVLNOT", "type": "numeric(15,2)", "searchable": false}, {"name": "covlcom", "source": "COVLCOM", "type": "numeric(14,2)", "searchable": false}, {"name": "coobser", "source": "COOBSER", "type": "varchar(40)", "searchable": true}, {"name": "coperco", "source": "COPERCO", "type": "numeric(5,2)", "searchable": false}]'::jsonb),
('faavndsg', 'dukamp_legacy_faavndsg', 'FAAVNDSG', 'Faturamento e vendas', 'FAAVNDSG.DBF', 0, '[{"name": "codven", "source": "CODVEN", "type": "integer", "searchable": false}, {"name": "datemi", "source": "DATEMI", "type": "date", "searchable": false}, {"name": "valsg1", "source": "VALSG1", "type": "numeric(10,2)", "searchable": false}, {"name": "valsg2", "source": "VALSG2", "type": "numeric(10,2)", "searchable": false}, {"name": "valsg3", "source": "VALSG3", "type": "numeric(10,2)", "searchable": false}, {"name": "valsg4", "source": "VALSG4", "type": "numeric(10,2)", "searchable": false}, {"name": "valsg5", "source": "VALSG5", "type": "numeric(10,2)", "searchable": false}, {"name": "valsg6", "source": "VALSG6", "type": "numeric(10,2)", "searchable": false}]'::jsonb),
('fechames', 'dukamp_legacy_fechames', 'FECHAMES', 'Tabelas técnicas', 'FECHAMES.DBF', 1, '[{"name": "firestat", "source": "FIRESTAT", "type": "integer", "searchable": false}, {"name": "firabccl", "source": "FIRABCCL", "type": "integer", "searchable": false}, {"name": "nrodupl", "source": "NRODUPL", "type": "integer", "searchable": false}, {"name": "nronotsu", "source": "NRONOTSU", "type": "integer", "searchable": false}, {"name": "nropedid", "source": "NROPEDID", "type": "integer", "searchable": false}, {"name": "nronotcm", "source": "NRONOTCM", "type": "integer", "searchable": false}, {"name": "dircheq", "source": "DIRCHEQ", "type": "varchar(15)", "searchable": true}, {"name": "marcon", "source": "MARCON", "type": "numeric(5,3)", "searchable": false}, {"name": "impost", "source": "IMPOST", "type": "numeric(5,3)", "searchable": false}, {"name": "perdas", "source": "PERDAS", "type": "numeric(5,3)", "searchable": false}, {"name": "perfin", "source": "PERFIN", "type": "numeric(5,2)", "searchable": false}, {"name": "diasute", "source": "DIASUTE", "type": "integer", "searchable": false}, {"name": "vlrvet", "source": "VLRVET", "type": "numeric(15,2)", "searchable": false}, {"name": "vlrfer", "source": "VLRFER", "type": "numeric(15,2)", "searchable": false}, {"name": "vlrdef", "source": "VLRDEF", "type": "numeric(15,2)", "searchable": false}, {"name": "vlrali", "source": "VLRALI", "type": "numeric(15,2)", "searchable": false}, {"name": "dirprev", "source": "DIRPREV", "type": "varchar(14)", "searchable": true}, {"name": "cartcob1", "source": "CARTCOB1", "type": "text", "searchable": true}, {"name": "cartcob2", "source": "CARTCOB2", "type": "text", "searchable": true}, {"name": "nfe", "source": "NFE", "type": "varchar(1)", "searchable": true}, {"name": "seqcli", "source": "SEQCLI", "type": "integer", "searchable": false}, {"name": "nseq_nfe", "source": "NSEQ_NFE", "type": "integer", "searchable": false}, {"name": "nrontnfe", "source": "NRONTNFE", "type": "integer", "searchable": false}, {"name": "per_pis", "source": "PER_PIS", "type": "numeric(5,2)", "searchable": false}, {"name": "per_cof", "source": "PER_COF", "type": "numeric(5,2)", "searchable": false}, {"name": "per_smpnac", "source": "PER_SMPNAC", "type": "numeric(5,2)", "searchable": false}, {"name": "nrobarra", "source": "NROBARRA", "type": "bigint", "searchable": false}, {"name": "grupo_emp", "source": "GRUPO_EMP", "type": "varchar(6)", "searchable": true}, {"name": "dirsped", "source": "DIRSPED", "type": "varchar(12)", "searchable": true}, {"name": "seqrec", "source": "SEQREC", "type": "integer", "searchable": false}, {"name": "ibpt_med", "source": "IBPT_MED", "type": "numeric(5,2)", "searchable": false}, {"name": "cobr_bol", "source": "COBR_BOL", "type": "integer", "searchable": false}, {"name": "prz2_bol", "source": "PRZ2_BOL", "type": "integer", "searchable": false}, {"name": "bco2_bol", "source": "BCO2_BOL", "type": "integer", "searchable": false}, {"name": "prz3_bol", "source": "PRZ3_BOL", "type": "integer", "searchable": false}, {"name": "bco3_bol", "source": "BCO3_BOL", "type": "integer", "searchable": false}, {"name": "usunota", "source": "USUNOTA", "type": "varchar(10)", "searchable": true}, {"name": "markplace", "source": "MARKPLACE", "type": "varchar(1)", "searchable": true}, {"name": "nronotpv", "source": "NRONOTPV", "type": "integer", "searchable": false}, {"name": "seqnfce", "source": "SEQNFCE", "type": "integer", "searchable": false}, {"name": "pibsger", "source": "PIBSGER", "type": "numeric(8,4)", "searchable": false}, {"name": "pcbsger", "source": "PCBSGER", "type": "numeric(8,4)", "searchable": false}, {"name": "pisger", "source": "PISGER", "type": "numeric(8,4)", "searchable": false}]'::jsonb),
('fiaabctp', 'dukamp_legacy_fiaabctp', 'FIAABCTP', 'Faturamento e vendas', 'FIAABCTP.dbf', 0, '[{"name": "tcodcli", "source": "TCODCLI", "type": "integer", "searchable": false}, {"name": "tcidcli", "source": "TCIDCLI", "type": "varchar(20)", "searchable": true}, {"name": "testcli", "source": "TESTCLI", "type": "varchar(2)", "searchable": true}, {"name": "tvalano", "source": "TVALANO", "type": "integer", "searchable": false}, {"name": "trepcli", "source": "TREPCLI", "type": "integer", "searchable": false}, {"name": "tultcmp", "source": "TULTCMP", "type": "date", "searchable": false}, {"name": "tconcei", "source": "TCONCEI", "type": "integer", "searchable": false}]'::jsonb),
('liberado', 'dukamp_legacy_liberado', 'LIBERADO', 'Tabelas técnicas', 'LIBERADO.DBF', 1, '[{"name": "libfat", "source": "LIBFAT", "type": "varchar(3)", "searchable": true}, {"name": "libfin", "source": "LIBFIN", "type": "varchar(3)", "searchable": true}, {"name": "libcom", "source": "LIBCOM", "type": "varchar(3)", "searchable": true}, {"name": "libest", "source": "LIBEST", "type": "varchar(3)", "searchable": true}, {"name": "libcont", "source": "LIBCONT", "type": "varchar(3)", "searchable": true}, {"name": "libfolh", "source": "LIBFOLH", "type": "varchar(3)", "searchable": true}, {"name": "libescr", "source": "LIBESCR", "type": "varchar(3)", "searchable": true}]'::jsonb),
('osaitorc', 'dukamp_legacy_osaitorc', 'OSAITORC', 'Orçamentos e serviços', 'OSAITORC.DBF', 0, '[{"name": "nroorc", "source": "NROORC", "type": "integer", "searchable": false}, {"name": "nroite", "source": "NROITE", "type": "integer", "searchable": false}, {"name": "quapro", "source": "QUAPRO", "type": "numeric(9,2)", "searchable": false}, {"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "preuni", "source": "PREUNI", "type": "numeric(13,2)", "searchable": false}, {"name": "perdsc", "source": "PERDSC", "type": "numeric(5,2)", "searchable": false}, {"name": "unidad", "source": "UNIDAD", "type": "varchar(2)", "searchable": true}, {"name": "comple", "source": "COMPLE", "type": "text", "searchable": true}, {"name": "classi", "source": "CLASSI", "type": "varchar(8)", "searchable": true}, {"name": "reserv", "source": "RESERV", "type": "varchar(1)", "searchable": true}]'::jsonb),
('osaorcam', 'dukamp_legacy_osaorcam', 'OSAORCAM', 'Orçamentos e serviços', 'OSAORCAM.DBF', 1, '[{"name": "nroorc", "source": "NROORC", "type": "integer", "searchable": false}, {"name": "codcli", "source": "CODCLI", "type": "integer", "searchable": false}, {"name": "datemi", "source": "DATEMI", "type": "date", "searchable": false}, {"name": "codven", "source": "CODVEN", "type": "integer", "searchable": false}, {"name": "compra", "source": "COMPRA", "type": "varchar(15)", "searchable": true}, {"name": "cndpgt", "source": "CNDPGT", "type": "varchar(50)", "searchable": true}, {"name": "valida", "source": "VALIDA", "type": "varchar(20)", "searchable": true}, {"name": "przent", "source": "PRZENT", "type": "varchar(20)", "searchable": true}, {"name": "perdsc", "source": "PERDSC", "type": "numeric(5,2)", "searchable": false}, {"name": "vlrdsc", "source": "VLRDSC", "type": "numeric(15,2)", "searchable": false}, {"name": "nomcli", "source": "NOMCLI", "type": "varchar(40)", "searchable": true}, {"name": "endcli", "source": "ENDCLI", "type": "varchar(40)", "searchable": true}, {"name": "cidcli", "source": "CIDCLI", "type": "varchar(20)", "searchable": true}, {"name": "ufecid", "source": "UFECID", "type": "varchar(2)", "searchable": true}, {"name": "foncli", "source": "FONCLI", "type": "varchar(15)", "searchable": true}, {"name": "faxcli", "source": "FAXCLI", "type": "varchar(15)", "searchable": true}, {"name": "obsini", "source": "OBSINI", "type": "text", "searchable": true}, {"name": "equipa", "source": "EQUIPA", "type": "varchar(25)", "searchable": true}, {"name": "nroser", "source": "NROSER", "type": "varchar(25)", "searchable": true}, {"name": "servic", "source": "SERVIC", "type": "varchar(50)", "searchable": true}, {"name": "orcos", "source": "ORCOS", "type": "varchar(1)", "searchable": true}, {"name": "staorc", "source": "STAORC", "type": "integer", "searchable": false}, {"name": "datsta", "source": "DATSTA", "type": "date", "searchable": false}, {"name": "horsta", "source": "HORSTA", "type": "varchar(8)", "searchable": true}]'::jsonb),
('osasolic', 'dukamp_legacy_osasolic', 'OSASOLIC', 'Orçamentos e serviços', 'OSASOLIC.DBF', 0, '[{"name": "nrosol", "source": "NROSOL", "type": "integer", "searchable": false}, {"name": "vensol", "source": "VENSOL", "type": "integer", "searchable": false}, {"name": "clisol", "source": "CLISOL", "type": "varchar(50)", "searchable": true}, {"name": "obssol", "source": "OBSSOL", "type": "varchar(50)", "searchable": true}, {"name": "flgemi", "source": "FLGEMI", "type": "varchar(1)", "searchable": true}, {"name": "datsol", "source": "DATSOL", "type": "date", "searchable": false}, {"name": "horsol", "source": "HORSOL", "type": "varchar(8)", "searchable": true}, {"name": "datimp", "source": "DATIMP", "type": "date", "searchable": false}, {"name": "horimp", "source": "HORIMP", "type": "varchar(8)", "searchable": true}]'::jsonb),
('osasolit', 'dukamp_legacy_osasolit', 'OSASOLIT', 'Orçamentos e serviços', 'OSASOLIT.DBF', 0, '[{"name": "nrosol", "source": "NROSOL", "type": "integer", "searchable": false}, {"name": "prosol", "source": "PROSOL", "type": "integer", "searchable": false}, {"name": "qtdsol", "source": "QTDSOL", "type": "numeric(9,2)", "searchable": false}, {"name": "observ", "source": "OBSERV", "type": "text", "searchable": true}, {"name": "seqret", "source": "SEQRET", "type": "integer", "searchable": false}]'::jsonb),
('osastaor', 'dukamp_legacy_osastaor', 'OSASTAOR', 'Orçamentos e serviços', 'OSASTAOR.DBF', 26, '[{"name": "stcodigo", "source": "STCODIGO", "type": "integer", "searchable": false}, {"name": "stdescri", "source": "STDESCRI", "type": "varchar(25)", "searchable": true}, {"name": "streserv", "source": "STRESERV", "type": "varchar(1)", "searchable": true}]'::jsonb),
('pal_aln', 'dukamp_legacy_pal_aln', 'PAL_ALN', 'Tabelas técnicas', 'pal_aln.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_alp', 'dukamp_legacy_pal_alp', 'PAL_ALP', 'Tabelas técnicas', 'PAL_ALP.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_cad', 'dukamp_legacy_pal_cad', 'PAL_CAD', 'Tabelas técnicas', 'PAL_CAD.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_cmp', 'dukamp_legacy_pal_cmp', 'PAL_CMP', 'Tabelas técnicas', 'PAL_CMP.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_cot', 'dukamp_legacy_pal_cot', 'PAL_COT', 'Tabelas técnicas', 'PAL_COT.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_cpp', 'dukamp_legacy_pal_cpp', 'PAL_CPP', 'Tabelas técnicas', 'PAL_CPP.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_cus', 'dukamp_legacy_pal_cus', 'PAL_CUS', 'Tabelas técnicas', 'pal_cus.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_dif', 'dukamp_legacy_pal_dif', 'PAL_DIF', 'Tabelas técnicas', 'PAL_DIF.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_dir', 'dukamp_legacy_pal_dir', 'PAL_DIR', 'Tabelas técnicas', 'pal_dir.dbf', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_dsc', 'dukamp_legacy_pal_dsc', 'PAL_DSC', 'Tabelas técnicas', 'PAL_DSC.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_eal', 'dukamp_legacy_pal_eal', 'PAL_EAL', 'Tabelas técnicas', 'PAL_EAL.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_est', 'dukamp_legacy_pal_est', 'PAL_EST', 'Tabelas técnicas', 'PAL_EST.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_fat', 'dukamp_legacy_pal_fat', 'PAL_FAT', 'Tabelas técnicas', 'PAL_FAT.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_fes', 'dukamp_legacy_pal_fes', 'PAL_FES', 'Tabelas técnicas', 'PAL_FES.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_ger', 'dukamp_legacy_pal_ger', 'PAL_GER', 'Tabelas técnicas', 'pal_ger.dbf', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_nfu', 'dukamp_legacy_pal_nfu', 'PAL_NFU', 'Tabelas técnicas', 'PAL_NFU.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_pen', 'dukamp_legacy_pal_pen', 'PAL_PEN', 'Tabelas técnicas', 'PAL_PEN.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_rrr', 'dukamp_legacy_pal_rrr', 'PAL_RRR', 'Tabelas técnicas', 'PAL_RRR.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_tbf', 'dukamp_legacy_pal_tbf', 'PAL_TBF', 'Tabelas técnicas', 'PAL_TBF.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_tch', 'dukamp_legacy_pal_tch', 'PAL_TCH', 'Tabelas técnicas', 'PAL_TCH.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('pal_vmc', 'dukamp_legacy_pal_vmc', 'PAL_VMC', 'Tabelas técnicas', 'PAL_VMC.DBF', 1, '[{"name": "senha", "source": "SENHA", "type": "varchar(10)", "searchable": true}]'::jsonb),
('reacdart', 'dukamp_legacy_reacdart', 'REACDART', 'Receitas e produção', 'REACDART.DBF', 0, '[{"name": "art", "source": "ART", "type": "varchar(20)", "searchable": true}, {"name": "seqemi", "source": "SEQEMI", "type": "integer", "searchable": false}, {"name": "libera", "source": "LIBERA", "type": "varchar(1)", "searchable": true}, {"name": "codres", "source": "CODRES", "type": "integer", "searchable": false}, {"name": "artmes", "source": "ARTMES", "type": "varchar(6)", "searchable": true}]'::jsonb),
('reacultu', 'dukamp_legacy_reacultu', 'REACULTU', 'Receitas e produção', 'REACULTU.DBF', 49, '[{"name": "codcul", "source": "CODCUL", "type": "integer", "searchable": false}, {"name": "descul", "source": "DESCUL", "type": "varchar(30)", "searchable": true}, {"name": "diagno", "source": "DIAGNO", "type": "varchar(40)", "searchable": true}]'::jsonb),
('reaprofi', 'dukamp_legacy_reaprofi', 'REAPROFI', 'Receitas e produção', 'REAPROFI.DBF', 2, '[{"name": "codres", "source": "CODRES", "type": "integer", "searchable": false}, {"name": "prores", "source": "PRORES", "type": "varchar(40)", "searchable": true}, {"name": "cpfres", "source": "CPFRES", "type": "varchar(14)", "searchable": true}, {"name": "creres", "source": "CRERES", "type": "varchar(20)", "searchable": true}, {"name": "endres", "source": "ENDRES", "type": "varchar(40)", "searchable": true}, {"name": "cidres", "source": "CIDRES", "type": "varchar(30)", "searchable": true}, {"name": "uferes", "source": "UFERES", "type": "varchar(2)", "searchable": true}]'::jsonb),
('rearecei', 'dukamp_legacy_rearecei', 'REARECEI', 'Receitas e produção', 'REARECEI.DBF', 0, '[{"name": "nronff", "source": "NRONFF", "type": "integer", "searchable": false}, {"name": "itenff", "source": "ITENFF", "type": "integer", "searchable": false}, {"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "qtdpro", "source": "QTDPRO", "type": "numeric(9,2)", "searchable": false}, {"name": "unipro", "source": "UNIPRO", "type": "varchar(3)", "searchable": true}, {"name": "qtdemb", "source": "QTDEMB", "type": "integer", "searchable": false}, {"name": "uniare", "source": "UNIARE", "type": "varchar(3)", "searchable": true}, {"name": "codcul", "source": "CODCUL", "type": "integer", "searchable": false}, {"name": "art", "source": "ART", "type": "varchar(20)", "searchable": true}, {"name": "seqart", "source": "SEQART", "type": "integer", "searchable": false}, {"name": "emirec", "source": "EMIREC", "type": "varchar(1)", "searchable": true}, {"name": "datemi", "source": "DATEMI", "type": "date", "searchable": false}, {"name": "codres", "source": "CODRES", "type": "integer", "searchable": false}]'::jsonb),
('rearecte', 'dukamp_legacy_rearecte', 'REARECTE', 'Receitas e produção', 'REARECTE.DBF', 269, '[{"name": "codpro", "source": "CODPRO", "type": "integer", "searchable": false}, {"name": "codcul", "source": "CODCUL", "type": "integer", "searchable": false}, {"name": "nomcom", "source": "NOMCOM", "type": "varchar(28)", "searchable": true}, {"name": "gruqui", "source": "GRUQUI", "type": "varchar(28)", "searchable": true}, {"name": "dosapl", "source": "DOSAPL", "type": "varchar(28)", "searchable": true}, {"name": "intcar", "source": "INTCAR", "type": "varchar(28)", "searchable": true}, {"name": "clatox", "source": "CLATOX", "type": "varchar(30)", "searchable": true}, {"name": "concen", "source": "CONCEN", "type": "varchar(30)", "searchable": true}, {"name": "formul", "source": "FORMUL", "type": "varchar(30)", "searchable": true}, {"name": "nroapl", "source": "NROAPL", "type": "varchar(22)", "searchable": true}, {"name": "modapl", "source": "MODAPL", "type": "varchar(55)", "searchable": true}, {"name": "epoapl", "source": "EPOAPL", "type": "varchar(55)", "searchable": true}, {"name": "manint", "source": "MANINT", "type": "varchar(60)", "searchable": true}, {"name": "preuso", "source": "PREUSO", "type": "varchar(60)", "searchable": true}, {"name": "prisoc", "source": "PRISOC", "type": "varchar(60)", "searchable": true}, {"name": "advrel", "source": "ADVREL", "type": "varchar(60)", "searchable": true}, {"name": "insemb", "source": "INSEMB", "type": "varchar(55)", "searchable": true}, {"name": "eqppro", "source": "EQPPRO", "type": "varchar(55)", "searchable": true}, {"name": "infad1", "source": "INFAD1", "type": "varchar(60)", "searchable": true}, {"name": "infad2", "source": "INFAD2", "type": "varchar(60)", "searchable": true}, {"name": "infant", "source": "INFANT", "type": "text", "searchable": true}, {"name": "qtdagu", "source": "QTDAGU", "type": "numeric(7,1)", "searchable": false}, {"name": "unipro", "source": "UNIPRO", "type": "varchar(3)", "searchable": true}, {"name": "qtdemb", "source": "QTDEMB", "type": "integer", "searchable": false}, {"name": "uniare", "source": "UNIARE", "type": "varchar(3)", "searchable": true}]'::jsonb),
('ret_gtin', 'dukamp_legacy_ret_gtin', 'RET_GTIN', 'Tabelas técnicas', 'RET_GTIN.DBF', 1, '[{"name": "dadosxml", "source": "DADOSXML", "type": "text", "searchable": false}]'::jsonb),
('rracorti', 'dukamp_legacy_rracorti', 'RRACORTI', 'Contas a receber', 'RRACORTI.DBF', 1, '[{"name": "vlmult", "source": "VLMULT", "type": "numeric(14,2)", "searchable": false}, {"name": "txmult", "source": "TXMULT", "type": "numeric(5,2)", "searchable": false}, {"name": "pricor", "source": "PRICOR", "type": "varchar(1)", "searchable": true}, {"name": "txjuro", "source": "TXJURO", "type": "numeric(9,6)", "searchable": false}, {"name": "mesdia", "source": "MESDIA", "type": "varchar(1)", "searchable": true}, {"name": "smpcmp", "source": "SMPCMP", "type": "varchar(1)", "searchable": true}]'::jsonb),
('rradspti', 'dukamp_legacy_rradspti', 'RRADSPTI', 'Contas a receber', 'RRADSPTI.DBF', 0, '[{"name": "nrtit", "source": "NRTIT", "type": "integer", "searchable": false}, {"name": "data", "source": "DATA", "type": "date", "searchable": false}, {"name": "histo", "source": "HISTO", "type": "varchar(30)", "searchable": true}, {"name": "valor", "source": "VALOR", "type": "numeric(12,2)", "searchable": false}]'::jsonb),
('rralogti', 'dukamp_legacy_rralogti', 'RRALOGTI', 'Contas a receber', 'RRALOGTI.DBF', 2601, '[{"name": "lnrtit", "source": "LNRTIT", "type": "integer", "searchable": false}, {"name": "lclien", "source": "LCLIEN", "type": "integer", "searchable": false}, {"name": "lvrtit", "source": "LVRTIT", "type": "numeric(15,2)", "searchable": false}, {"name": "lcarpa", "source": "LCARPA", "type": "integer", "searchable": false}, {"name": "ljuros", "source": "LJUROS", "type": "numeric(13,2)", "searchable": false}, {"name": "ldesco", "source": "LDESCO", "type": "numeric(15,2)", "searchable": false}, {"name": "lvecto", "source": "LVECTO", "type": "date", "searchable": false}, {"name": "lopera", "source": "LOPERA", "type": "varchar(1)", "searchable": true}, {"name": "ldata", "source": "LDATA", "type": "date", "searchable": false}, {"name": "lhora", "source": "LHORA", "type": "varchar(8)", "searchable": true}, {"name": "ljurct", "source": "LJURCT", "type": "numeric(12,2)", "searchable": false}]'::jsonb),
('rrasdcar', 'dukamp_legacy_rrasdcar', 'RRASDCAR', 'Contas a receber', 'RRASDCAR.DBF', 2, '[{"name": "snrcar", "source": "SNRCAR", "type": "integer", "searchable": false}, {"name": "santer", "source": "SANTER", "type": "numeric(16,2)", "searchable": false}, {"name": "sbaixa", "source": "SBAIXA", "type": "numeric(15,2)", "searchable": false}, {"name": "sdesco", "source": "SDESCO", "type": "numeric(15,2)", "searchable": false}, {"name": "sestor", "source": "SESTOR", "type": "numeric(15,2)", "searchable": false}, {"name": "scance", "source": "SCANCE", "type": "numeric(15,2)", "searchable": false}, {"name": "stranr", "source": "STRANR", "type": "numeric(15,2)", "searchable": false}, {"name": "strans", "source": "STRANS", "type": "numeric(15,2)", "searchable": false}, {"name": "sinser", "source": "SINSER", "type": "numeric(15,2)", "searchable": false}, {"name": "satual", "source": "SATUAL", "type": "numeric(16,2)", "searchable": false}, {"name": "sdtope", "source": "SDTOPE", "type": "date", "searchable": false}]'::jsonb),
('rratitul', 'dukamp_legacy_rratitul', 'Histórico de títulos a receber', 'Contas a receber', 'RRATITUL.DBF', 1282, '[{"name": "dnrtit", "source": "DNRTIT", "type": "integer", "searchable": false}, {"name": "dclien", "source": "DCLIEN", "type": "integer", "searchable": false}, {"name": "demiss", "source": "DEMISS", "type": "date", "searchable": false}, {"name": "dvrtit", "source": "DVRTIT", "type": "numeric(15,2)", "searchable": false}, {"name": "dvrabe", "source": "DVRABE", "type": "numeric(15,2)", "searchable": false}, {"name": "dvecto", "source": "DVECTO", "type": "date", "searchable": false}, {"name": "dcarpa", "source": "DCARPA", "type": "integer", "searchable": false}, {"name": "dcarco", "source": "DCARCO", "type": "integer", "searchable": false}, {"name": "dsubcar", "source": "DSUBCAR", "type": "integer", "searchable": false}, {"name": "dvesubc", "source": "DVESUBC", "type": "date", "searchable": false}, {"name": "dpagto", "source": "DPAGTO", "type": "date", "searchable": false}, {"name": "djuros", "source": "DJUROS", "type": "numeric(13,2)", "searchable": false}, {"name": "dvende", "source": "DVENDE", "type": "integer", "searchable": false}, {"name": "dtippg", "source": "DTIPPG", "type": "varchar(2)", "searchable": true}, {"name": "dpago", "source": "DPAGO", "type": "varchar(1)", "searchable": true}, {"name": "dnosnro", "source": "DNOSNRO", "type": "varchar(15)", "searchable": true}, {"name": "dflgurv", "source": "DFLGURV", "type": "varchar(1)", "searchable": true}, {"name": "dagecob", "source": "DAGECOB", "type": "varchar(6)", "searchable": true}, {"name": "ddscvct", "source": "DDSCVCT", "type": "numeric(5,2)", "searchable": false}, {"name": "dobserv", "source": "DOBSERV", "type": "varchar(15)", "searchable": true}, {"name": "dtarifa", "source": "DTARIFA", "type": "numeric(12,2)", "searchable": false}, {"name": "mobserv", "source": "MOBSERV", "type": "text", "searchable": true}]'::jsonb),
('sialogus', 'dukamp_legacy_sialogus', 'Log de usuários', 'Sistema e auditoria', 'SIALOGUS.DBF', 2966, '[{"name": "programa", "source": "PROGRAMA", "type": "varchar(10)", "searchable": true}, {"name": "codigo", "source": "CODIGO", "type": "varchar(15)", "searchable": true}, {"name": "data", "source": "DATA", "type": "date", "searchable": false}, {"name": "hora", "source": "HORA", "type": "varchar(8)", "searchable": true}, {"name": "descri", "source": "DESCRI", "type": "text", "searchable": true}, {"name": "usuario", "source": "USUARIO", "type": "integer", "searchable": false}, {"name": "nome", "source": "NOME", "type": "varchar(15)", "searchable": true}]'::jsonb),
('sianatex', 'dukamp_legacy_sianatex', 'SIANATEX', 'Sistema e auditoria', 'SIANATEX.DBF', 44, '[{"name": "nnatope2", "source": "NNATOPE2", "type": "varchar(4)", "searchable": true}]'::jsonb),
('t0040085', 'dukamp_legacy_t0040085', 'T0040085', 'Tabelas técnicas', 'T0040085.dbf', 0, '[{"name": "nropdi", "source": "NROPDI", "type": "integer", "searchable": false}, {"name": "iteped", "source": "ITEPED", "type": "integer", "searchable": false}, {"name": "qtdabe", "source": "QTDABE", "type": "numeric(10,3)", "searchable": false}, {"name": "nomfor", "source": "NOMFOR", "type": "varchar(20)", "searchable": true}, {"name": "prvent", "source": "PRVENT", "type": "date", "searchable": false}, {"name": "nomcom", "source": "NOMCOM", "type": "varchar(15)", "searchable": true}]'::jsonb),
('t0043395', 'dukamp_legacy_t0043395', 'T0043395', 'Tabelas técnicas', 'T0043395.dbf', 0, '[{"name": "nropdi", "source": "NROPDI", "type": "integer", "searchable": false}, {"name": "iteped", "source": "ITEPED", "type": "integer", "searchable": false}, {"name": "qtdabe", "source": "QTDABE", "type": "numeric(10,3)", "searchable": false}, {"name": "nomfor", "source": "NOMFOR", "type": "varchar(20)", "searchable": true}, {"name": "prvent", "source": "PRVENT", "type": "date", "searchable": false}, {"name": "nomcom", "source": "NOMCOM", "type": "varchar(15)", "searchable": true}]'::jsonb),
('t0043551', 'dukamp_legacy_t0043551', 'T0043551', 'Tabelas técnicas', 'T0043551.dbf', 0, '[{"name": "nropdi", "source": "NROPDI", "type": "integer", "searchable": false}, {"name": "iteped", "source": "ITEPED", "type": "integer", "searchable": false}, {"name": "qtdabe", "source": "QTDABE", "type": "numeric(10,3)", "searchable": false}, {"name": "nomfor", "source": "NOMFOR", "type": "varchar(20)", "searchable": true}, {"name": "prvent", "source": "PRVENT", "type": "date", "searchable": false}, {"name": "nomcom", "source": "NOMCOM", "type": "varchar(15)", "searchable": true}]'::jsonb),
('t2881190', 'dukamp_legacy_t2881190', 'T2881190', 'Tabelas técnicas', 'T2881190.dbf', 0, '[{"name": "tcodrep", "source": "TCODREP", "type": "integer", "searchable": false}, {"name": "trepvnd", "source": "TREPVND", "type": "numeric(18,2)", "searchable": false}, {"name": "trepdev", "source": "TREPDEV", "type": "numeric(18,2)", "searchable": false}, {"name": "trepcus", "source": "TREPCUS", "type": "numeric(18,2)", "searchable": false}, {"name": "trepcad", "source": "TREPCAD", "type": "numeric(18,2)", "searchable": false}, {"name": "trepcsa", "source": "TREPCSA", "type": "numeric(18,2)", "searchable": false}, {"name": "trepcma", "source": "TREPCMA", "type": "numeric(18,2)", "searchable": false}, {"name": "tcomven", "source": "TCOMVEN", "type": "numeric(18,2)", "searchable": false}, {"name": "tcomsac", "source": "TCOMSAC", "type": "numeric(18,2)", "searchable": false}, {"name": "tcomadi", "source": "TCOMADI", "type": "numeric(18,2)", "searchable": false}, {"name": "tcommat", "source": "TCOMMAT", "type": "numeric(18,2)", "searchable": false}, {"name": "tcomsup", "source": "TCOMSUP", "type": "numeric(18,2)", "searchable": false}, {"name": "tcomger", "source": "TCOMGER", "type": "numeric(18,2)", "searchable": false}, {"name": "ttotton", "source": "TTOTTON", "type": "numeric(10,3)", "searchable": false}, {"name": "tvltotd", "source": "TVLTOTD", "type": "numeric(18,2)", "searchable": false}, {"name": "tprzmed", "source": "TPRZMED", "type": "numeric(18,2)", "searchable": false}, {"name": "tvndnot", "source": "TVNDNOT", "type": "integer", "searchable": false}, {"name": "tvndped", "source": "TVNDPED", "type": "integer", "searchable": false}, {"name": "ttotavi", "source": "TTOTAVI", "type": "numeric(18,2)", "searchable": false}, {"name": "ttot30d", "source": "TTOT30D", "type": "numeric(18,2)", "searchable": false}, {"name": "ttot60d", "source": "TTOT60D", "type": "numeric(18,2)", "searchable": false}, {"name": "ttot90d", "source": "TTOT90D", "type": "numeric(18,2)", "searchable": false}, {"name": "ttot120", "source": "TTOT120", "type": "numeric(18,2)", "searchable": false}, {"name": "ttot150", "source": "TTOT150", "type": "numeric(18,2)", "searchable": false}, {"name": "ttot180", "source": "TTOT180", "type": "numeric(18,2)", "searchable": false}, {"name": "ttot210", "source": "TTOT210", "type": "numeric(18,2)", "searchable": false}, {"name": "ttotaci", "source": "TTOTACI", "type": "numeric(18,2)", "searchable": false}, {"name": "tcodsup", "source": "TCODSUP", "type": "integer", "searchable": false}, {"name": "ttotadi", "source": "TTOTADI", "type": "numeric(18,2)", "searchable": false}, {"name": "ttotsac", "source": "TTOTSAC", "type": "numeric(18,2)", "searchable": false}, {"name": "ttotmat", "source": "TTOTMAT", "type": "numeric(18,2)", "searchable": false}, {"name": "tcomi01", "source": "TCOMI01", "type": "numeric(10,2)", "searchable": false}, {"name": "tcomi02", "source": "TCOMI02", "type": "numeric(10,2)", "searchable": false}, {"name": "tcomi03", "source": "TCOMI03", "type": "numeric(10,2)", "searchable": false}, {"name": "tcomi04", "source": "TCOMI04", "type": "numeric(10,2)", "searchable": false}, {"name": "tcomi05", "source": "TCOMI05", "type": "numeric(10,2)", "searchable": false}, {"name": "tcomi06", "source": "TCOMI06", "type": "numeric(10,2)", "searchable": false}, {"name": "tcomi07", "source": "TCOMI07", "type": "numeric(10,2)", "searchable": false}, {"name": "tcomi08", "source": "TCOMI08", "type": "numeric(10,2)", "searchable": false}, {"name": "tcomi09", "source": "TCOMI09", "type": "numeric(10,2)", "searchable": false}, {"name": "tcomi10", "source": "TCOMI10", "type": "numeric(10,2)", "searchable": false}, {"name": "tcomi11", "source": "TCOMI11", "type": "numeric(10,2)", "searchable": false}, {"name": "tcomi12", "source": "TCOMI12", "type": "numeric(10,2)", "searchable": false}, {"name": "ttotbon", "source": "TTOTBON", "type": "numeric(12,2)", "searchable": false}]'::jsonb),
('t3071359', 'dukamp_legacy_t3071359', 'T3071359', 'Tabelas técnicas', 'T3071359.dbf', 0, '[{"name": "tnroite", "source": "TNROITE", "type": "integer", "searchable": false}, {"name": "tcodpro", "source": "TCODPRO", "type": "integer", "searchable": false}, {"name": "tnompro", "source": "TNOMPRO", "type": "varchar(45)", "searchable": true}, {"name": "tquapro", "source": "TQUAPRO", "type": "numeric(11,4)", "searchable": false}, {"name": "tpreuni", "source": "TPREUNI", "type": "numeric(18,5)", "searchable": false}, {"name": "tpretab", "source": "TPRETAB", "type": "numeric(15,2)", "searchable": false}, {"name": "tunidad", "source": "TUNIDAD", "type": "varchar(3)", "searchable": true}, {"name": "talqicm", "source": "TALQICM", "type": "numeric(5,2)", "searchable": false}, {"name": "ttotite", "source": "TTOTITE", "type": "numeric(12,2)", "searchable": false}, {"name": "tvlricm", "source": "TVLRICM", "type": "numeric(10,2)", "searchable": false}, {"name": "tbscicm", "source": "TBSCICM", "type": "numeric(12,2)", "searchable": false}, {"name": "tcodtri", "source": "TCODTRI", "type": "varchar(3)", "searchable": true}, {"name": "tbcicst", "source": "TBCICST", "type": "numeric(12,2)", "searchable": false}, {"name": "tvricst", "source": "TVRICST", "type": "numeric(10,2)", "searchable": false}, {"name": "talqred", "source": "TALQRED", "type": "numeric(5,2)", "searchable": false}, {"name": "tcbenef", "source": "TCBENEF", "type": "varchar(8)", "searchable": true}, {"name": "talqipi", "source": "TALQIPI", "type": "numeric(5,2)", "searchable": false}, {"name": "tbscipi", "source": "TBSCIPI", "type": "numeric(12,2)", "searchable": false}, {"name": "tvlripi", "source": "TVLRIPI", "type": "numeric(10,2)", "searchable": false}, {"name": "talqpis", "source": "TALQPIS", "type": "numeric(5,3)", "searchable": false}, {"name": "tbscpis", "source": "TBSCPIS", "type": "numeric(12,2)", "searchable": false}, {"name": "tvlrpis", "source": "TVLRPIS", "type": "numeric(10,2)", "searchable": false}, {"name": "tcstpis", "source": "TCSTPIS", "type": "varchar(2)", "searchable": true}, {"name": "talqcof", "source": "TALQCOF", "type": "numeric(5,3)", "searchable": false}, {"name": "tbsccof", "source": "TBSCCOF", "type": "numeric(12,2)", "searchable": false}, {"name": "tvlrcof", "source": "TVLRCOF", "type": "numeric(10,2)", "searchable": false}, {"name": "tcstcof", "source": "TCSTCOF", "type": "varchar(2)", "searchable": true}, {"name": "tcodncm", "source": "TCODNCM", "type": "varchar(8)", "searchable": true}, {"name": "tvlrfre", "source": "TVLRFRE", "type": "numeric(10,2)", "searchable": false}, {"name": "tdesace", "source": "TDESACE", "type": "numeric(10,2)", "searchable": false}, {"name": "tvlrdes", "source": "TVLRDES", "type": "numeric(10,2)", "searchable": false}, {"name": "tunidad_2", "source": "TUNIDAD", "type": "varchar(3)", "searchable": true}, {"name": "tcfopit", "source": "TCFOPIT", "type": "varchar(4)", "searchable": true}, {"name": "tcest", "source": "TCEST", "type": "integer", "searchable": false}, {"name": "tpedcmp", "source": "TPEDCMP", "type": "integer", "searchable": false}, {"name": "titecmp", "source": "TITECMP", "type": "integer", "searchable": false}, {"name": "chave_ref", "source": "CHAVE_REF", "type": "varchar(44)", "searchable": true}, {"name": "item_ref", "source": "ITEM_REF", "type": "integer", "searchable": false}, {"name": "tpedforn", "source": "TPEDFORN", "type": "varchar(15)", "searchable": true}, {"name": "tcstcmp", "source": "TCSTCMP", "type": "numeric(12,2)", "searchable": false}, {"name": "tcstbrut", "source": "TCSTBRUT", "type": "numeric(12,2)", "searchable": false}, {"name": "tcusfina", "source": "TCUSFINA", "type": "numeric(12,2)", "searchable": false}, {"name": "tcstcarg", "source": "TCSTCARG", "type": "numeric(9,2)", "searchable": false}, {"name": "tperfina", "source": "TPERFINA", "type": "numeric(6,2)", "searchable": false}, {"name": "tvlrfrt1", "source": "TVLRFRT1", "type": "numeric(9,2)", "searchable": false}, {"name": "tvlrfrt2", "source": "TVLRFRT2", "type": "numeric(9,2)", "searchable": false}, {"name": "tprzvnd", "source": "TPRZVND", "type": "date", "searchable": false}, {"name": "tprzcmp", "source": "TPRZCMP", "type": "date", "searchable": false}, {"name": "tfincust", "source": "TFINCUST", "type": "numeric(7,3)", "searchable": false}, {"name": "cstis", "source": "CSTIS", "type": "varchar(3)", "searchable": true}, {"name": "clastribis", "source": "CLASTRIBIS", "type": "varchar(6)", "searchable": true}, {"name": "bcis", "source": "BCIS", "type": "numeric(15,2)", "searchable": false}, {"name": "pis", "source": "PIS", "type": "numeric(8,4)", "searchable": false}, {"name": "pisespec", "source": "PISESPEC", "type": "numeric(8,4)", "searchable": false}, {"name": "untribis", "source": "UNTRIBIS", "type": "varchar(6)", "searchable": true}, {"name": "qttribis", "source": "QTTRIBIS", "type": "numeric(11,4)", "searchable": false}, {"name": "vis", "source": "VIS", "type": "numeric(15,2)", "searchable": false}, {"name": "cstibscbs", "source": "CSTIBSCBS", "type": "varchar(3)", "searchable": true}, {"name": "clastrib", "source": "CLASTRIB", "type": "varchar(6)", "searchable": true}, {"name": "bcibscbs", "source": "BCIBSCBS", "type": "numeric(15,2)", "searchable": false}, {"name": "pibsuf", "source": "PIBSUF", "type": "numeric(8,4)", "searchable": false}, {"name": "pdifuf", "source": "PDIFUF", "type": "numeric(8,4)", "searchable": false}, {"name": "vdifuf", "source": "VDIFUF", "type": "numeric(15,2)", "searchable": false}, {"name": "vdevtriuf", "source": "VDEVTRIUF", "type": "numeric(15,2)", "searchable": false}, {"name": "predalquf", "source": "PREDALQUF", "type": "numeric(8,4)", "searchable": false}, {"name": "palqefeuf", "source": "PALQEFEUF", "type": "numeric(8,4)", "searchable": false}, {"name": "vibsuf", "source": "VIBSUF", "type": "numeric(15,2)", "searchable": false}, {"name": "pibsmu", "source": "PIBSMU", "type": "numeric(8,4)", "searchable": false}, {"name": "pdifmu", "source": "PDIFMU", "type": "numeric(8,4)", "searchable": false}, {"name": "vdifmu", "source": "VDIFMU", "type": "numeric(15,2)", "searchable": false}, {"name": "vdevtrimu", "source": "VDEVTRIMU", "type": "numeric(15,2)", "searchable": false}, {"name": "predalqmu", "source": "PREDALQMU", "type": "numeric(8,4)", "searchable": false}, {"name": "palqefemu", "source": "PALQEFEMU", "type": "numeric(8,4)", "searchable": false}, {"name": "vibsmu", "source": "VIBSMU", "type": "numeric(15,2)", "searchable": false}, {"name": "pcbs", "source": "PCBS", "type": "numeric(8,4)", "searchable": false}, {"name": "pdifcbs", "source": "PDIFCBS", "type": "numeric(8,4)", "searchable": false}, {"name": "vdifcbs", "source": "VDIFCBS", "type": "numeric(15,2)", "searchable": false}, {"name": "vdevtricbs", "source": "VDEVTRICBS", "type": "numeric(15,2)", "searchable": false}, {"name": "predalqcbs", "source": "PREDALQCBS", "type": "numeric(8,4)", "searchable": false}, {"name": "palqefecbs", "source": "PALQEFECBS", "type": "numeric(8,4)", "searchable": false}, {"name": "vcbs", "source": "VCBS", "type": "numeric(15,2)", "searchable": false}, {"name": "vtotite", "source": "VTOTITE", "type": "numeric(15,2)", "searchable": false}]'::jsonb),
('t3071415', 'dukamp_legacy_t3071415', 'T3071415', 'Tabelas técnicas', 'T3071415.dbf', 0, '[{"name": "trecno", "source": "TRECNO", "type": "integer", "searchable": false}, {"name": "ttipobs", "source": "TTIPOBS", "type": "integer", "searchable": false}, {"name": "tobserv", "source": "TOBSERV", "type": "varchar(200)", "searchable": true}]'::jsonb),
('t3329334', 'dukamp_legacy_t3329334', 'T3329334', 'Tabelas técnicas', 'T3329334.dbf', 7, '[{"name": "tnumnota", "source": "TNUMNOTA", "type": "integer", "searchable": false}, {"name": "ttotnota", "source": "TTOTNOTA", "type": "numeric(18,2)", "searchable": false}, {"name": "tdatemis", "source": "TDATEMIS", "type": "date", "searchable": false}, {"name": "tcodvend", "source": "TCODVEND", "type": "integer", "searchable": false}, {"name": "tstatus", "source": "TSTATUS", "type": "varchar(15)", "searchable": true}]'::jsonb),
('t3329350', 'dukamp_legacy_t3329350', 'T3329350', 'Tabelas técnicas', 'T3329350.dbf', 0, '[{"name": "tnroite", "source": "TNROITE", "type": "integer", "searchable": false}, {"name": "tcodpro", "source": "TCODPRO", "type": "integer", "searchable": false}, {"name": "tnompro", "source": "TNOMPRO", "type": "varchar(45)", "searchable": true}, {"name": "tquapro", "source": "TQUAPRO", "type": "numeric(9,3)", "searchable": false}, {"name": "tpreuni", "source": "TPREUNI", "type": "numeric(15,3)", "searchable": false}, {"name": "tpretab", "source": "TPRETAB", "type": "numeric(15,2)", "searchable": false}, {"name": "tunidad", "source": "TUNIDAD", "type": "varchar(3)", "searchable": true}, {"name": "talqicm", "source": "TALQICM", "type": "numeric(5,2)", "searchable": false}, {"name": "ttotite", "source": "TTOTITE", "type": "numeric(12,2)", "searchable": false}]'::jsonb),
('t3329364', 'dukamp_legacy_t3329364', 'T3329364', 'Tabelas técnicas', 'T3329364.dbf', 0, '[{"name": "ttipobs", "source": "TTIPOBS", "type": "integer", "searchable": false}, {"name": "tobserv", "source": "TOBSERV", "type": "varchar(200)", "searchable": true}]'::jsonb),
('t3615863', 'dukamp_legacy_t3615863', 'T3615863', 'Tabelas técnicas', 'T3615863.dbf', 13, '[{"name": "tcodfor", "source": "TCODFOR", "type": "integer", "searchable": false}, {"name": "tcodpro", "source": "TCODPRO", "type": "integer", "searchable": false}, {"name": "tnompro", "source": "TNOMPRO", "type": "varchar(45)", "searchable": true}, {"name": "ttotcom", "source": "TTOTCOM", "type": "numeric(18,2)", "searchable": false}, {"name": "tqtdcom", "source": "TQTDCOM", "type": "numeric(10,2)", "searchable": false}, {"name": "tvltotd", "source": "TVLTOTD", "type": "numeric(18,2)", "searchable": false}, {"name": "tprzmed", "source": "TPRZMED", "type": "numeric(18,2)", "searchable": false}]'::jsonb),
('t3968533', 'dukamp_legacy_t3968533', 'T3968533', 'Tabelas técnicas', 'T3968533.dbf', 0, '[{"name": "tbnomusu", "source": "TBNOMUSU", "type": "varchar(10)", "searchable": true}, {"name": "tbdata", "source": "TBDATA", "type": "date", "searchable": false}, {"name": "tbhora", "source": "TBHORA", "type": "varchar(8)", "searchable": true}, {"name": "tbprzvnd", "source": "TBPRZVND", "type": "integer", "searchable": false}, {"name": "tbpreco1", "source": "TBPRECO1", "type": "numeric(9,2)", "searchable": false}, {"name": "tbpreco2", "source": "TBPRECO2", "type": "numeric(9,2)", "searchable": false}, {"name": "tbcusrea", "source": "TBCUSREA", "type": "numeric(10,2)", "searchable": false}, {"name": "tbvlrfrt", "source": "TBVLRFRT", "type": "numeric(10,2)", "searchable": false}, {"name": "tbcrgdes", "source": "TBCRGDES", "type": "numeric(10,2)", "searchable": false}, {"name": "tbpermin", "source": "TBPERMIN", "type": "numeric(6,2)", "searchable": false}, {"name": "tbprzvmi", "source": "TBPRZVMI", "type": "varchar(1)", "searchable": true}, {"name": "tbprzcom", "source": "TBPRZCOM", "type": "integer", "searchable": false}, {"name": "tbdeprec", "source": "TBDEPREC", "type": "numeric(5,2)", "searchable": false}, {"name": "tbcusfin", "source": "TBCUSFIN", "type": "numeric(10,2)", "searchable": false}, {"name": "tbperaju", "source": "TBPERAJU", "type": "numeric(6,2)", "searchable": false}, {"name": "tbcstaju", "source": "TBCSTAJU", "type": "numeric(10,2)", "searchable": false}, {"name": "tbprcmin", "source": "TBPRCMIN", "type": "numeric(10,2)", "searchable": false}]'::jsonb),
('t4299500', 'dukamp_legacy_t4299500', 'T4299500', 'Tabelas técnicas', 'T4299500.dbf', 0, '[{"name": "tbnomusu", "source": "TBNOMUSU", "type": "varchar(10)", "searchable": true}, {"name": "tbdata", "source": "TBDATA", "type": "date", "searchable": false}, {"name": "tbhora", "source": "TBHORA", "type": "varchar(8)", "searchable": true}, {"name": "tbprzvnd", "source": "TBPRZVND", "type": "integer", "searchable": false}, {"name": "tbpreco1", "source": "TBPRECO1", "type": "numeric(9,2)", "searchable": false}, {"name": "tbpreco2", "source": "TBPRECO2", "type": "numeric(9,2)", "searchable": false}, {"name": "tbcusrea", "source": "TBCUSREA", "type": "numeric(10,2)", "searchable": false}, {"name": "tbvlrfrt", "source": "TBVLRFRT", "type": "numeric(10,2)", "searchable": false}, {"name": "tbcrgdes", "source": "TBCRGDES", "type": "numeric(10,2)", "searchable": false}, {"name": "tbpermin", "source": "TBPERMIN", "type": "numeric(6,2)", "searchable": false}, {"name": "tbprzvmi", "source": "TBPRZVMI", "type": "varchar(1)", "searchable": true}, {"name": "tbprzcom", "source": "TBPRZCOM", "type": "integer", "searchable": false}, {"name": "tbdeprec", "source": "TBDEPREC", "type": "numeric(5,2)", "searchable": false}, {"name": "tbcusfin", "source": "TBCUSFIN", "type": "numeric(10,2)", "searchable": false}, {"name": "tbperaju", "source": "TBPERAJU", "type": "numeric(6,2)", "searchable": false}, {"name": "tbcstaju", "source": "TBCSTAJU", "type": "numeric(10,2)", "searchable": false}, {"name": "tbprcmin", "source": "TBPRCMIN", "type": "numeric(10,2)", "searchable": false}]'::jsonb),
('t4315071', 'dukamp_legacy_t4315071', 'T4315071', 'Tabelas técnicas', 'T4315071.dbf', 0, '[{"name": "tbnomusu", "source": "TBNOMUSU", "type": "varchar(10)", "searchable": true}, {"name": "tbdata", "source": "TBDATA", "type": "date", "searchable": false}, {"name": "tbhora", "source": "TBHORA", "type": "varchar(8)", "searchable": true}, {"name": "tbprzvnd", "source": "TBPRZVND", "type": "integer", "searchable": false}, {"name": "tbpreco1", "source": "TBPRECO1", "type": "numeric(9,2)", "searchable": false}, {"name": "tbpreco2", "source": "TBPRECO2", "type": "numeric(9,2)", "searchable": false}, {"name": "tbcusrea", "source": "TBCUSREA", "type": "numeric(10,2)", "searchable": false}, {"name": "tbvlrfrt", "source": "TBVLRFRT", "type": "numeric(10,2)", "searchable": false}, {"name": "tbcrgdes", "source": "TBCRGDES", "type": "numeric(10,2)", "searchable": false}, {"name": "tbpermin", "source": "TBPERMIN", "type": "numeric(6,2)", "searchable": false}, {"name": "tbprzvmi", "source": "TBPRZVMI", "type": "varchar(1)", "searchable": true}, {"name": "tbprzcom", "source": "TBPRZCOM", "type": "integer", "searchable": false}, {"name": "tbdeprec", "source": "TBDEPREC", "type": "numeric(5,2)", "searchable": false}, {"name": "tbcusfin", "source": "TBCUSFIN", "type": "numeric(10,2)", "searchable": false}, {"name": "tbperaju", "source": "TBPERAJU", "type": "numeric(6,2)", "searchable": false}, {"name": "tbcstaju", "source": "TBCSTAJU", "type": "numeric(10,2)", "searchable": false}, {"name": "tbprcmin", "source": "TBPRCMIN", "type": "numeric(10,2)", "searchable": false}]'::jsonb)
on conflict (source_name) do update set
  target_name = excluded.target_name, label = excluded.label, module = excluded.module,
  source_file = excluded.source_file, source_record_count = excluded.source_record_count,
  columns = excluded.columns;

comment on table public.dukamp_legacy_tables is 'Catálogo das tabelas históricas migradas do ERP Clipper da Dukamp.';

-- Arquivos ignorados por não serem DBFs válidos:
-- COB_SRG.DBF: ValueError: Unknown field type: '>'
-- CPPSENHA.DBF: error: unpack requires a buffer of 32 bytes
-- FAAFECHA.DBF: ValueError: Unknown field type: 'R'
-- SEM_BAR.DBF: error: unpack requires a buffer of 32 bytes
-- SEM_BOLE.DBF: error: unpack requires a buffer of 32 bytes
-- SEM_CIDA.DBF: ValueError: Unknown field type: ' '
-- sem_clie.dbf: ValueError: Unknown field type: '>'
-- SEM_CTAP.DBF: ValueError: Unknown field type: '\x1a'
-- SEM_FORN.DBF: ValueError: Unknown field type: 'g'
-- SEM_NFE.DBF: ValueError: Unknown field type: '\x1a'
-- SEM_NOTA.DBF: ValueError: Unknown field type: '\x1a'
-- SEM_ORCA.DBF: error: unpack requires a buffer of 32 bytes
-- SEM_PEDI.DBF: ValueError: Unknown field type: '\x1a'
-- SEM_PROD.DBF: error: unpack requires a buffer of 32 bytes
-- SEM_SLPR.DBF: error: unpack requires a buffer of 32 bytes
