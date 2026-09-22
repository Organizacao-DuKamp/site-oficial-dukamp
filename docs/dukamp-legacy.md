# Arquivo histórico Dukamp

A rota `/admin/dukamp` disponibiliza aos administradores uma consulta somente
leitura dos dados preservados do ERP Clipper/DBF.

## Escopo

- 172 DBFs estruturalmente válidos, agrupados por módulo;
- aproximadamente 4,17 milhões de registros ativos;
- catálogo pesquisável, paginação e visualização completa do registro;
- acesso restrito por RLS a usuários com papel `admin`;
- nomes originais de tabelas e campos preservados nos metadados.

Os 15 arquivos corrompidos ou temporários detectados na pasta de origem não são
importados. Registros marcados como apagados no DBF também não são tratados como
dados ativos.

## Estrutura

- `src/routes/admin.dukamp.tsx`: interface administrativa;
- `supabase/migrations/20260922150000_dukamp_legacy_archive.sql`: tabelas,
  catálogo, permissões e políticas RLS;
- `scripts/legacy_dbf_to_supabase.py`: inspeção, geração da migration e carga
  direta por PostgreSQL `COPY`.

Cada tabela física usa o prefixo `dukamp_legacy_`. O catálogo
`dukamp_legacy_tables` contém rótulos, módulos, campos e contagens de importação.

## Reexecutar ou retomar a carga

Instale as dependências fora do projeto e defina uma connection string do banco:

```powershell
python -m pip install dbfread "psycopg[binary]"
$env:SUPABASE_DB_URL = "postgresql://..."
python scripts/legacy_dbf_to_supabase.py import --dbf-dir "C:\caminho\WORK"
```

Tabelas que já possuam registros são ignoradas, permitindo retomar uma carga
interrompida. Use `--replace` somente quando a intenção for apagar e recarregar
todo o conteúdo histórico. Nunca grave a connection string ou chaves secretas
no repositório.
