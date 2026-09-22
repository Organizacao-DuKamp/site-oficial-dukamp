"""Gera o schema e importa os DBFs do ERP legado para o Supabase.

Uso:
  python scripts/legacy_dbf_to_supabase.py generate --dbf-dir C:\\...\\WORK
  set SUPABASE_DB_URL=postgresql://...
  python scripts/legacy_dbf_to_supabase.py import --dbf-dir C:\\...\\WORK

Os dados nunca são gravados no repositório. O import cria/atualiza a estrutura,
usa COPY direto no Postgres e requer `pip install dbfread psycopg[binary]`.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import struct
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable

from dbfread import DBF


ENCODING = "cp850"
TABLE_PREFIX = "dukamp_legacy_"
DEFAULT_DBF_DIR = Path(r"C:\Users\Dukamp\Downloads\WORK")
DEFAULT_MIGRATION = Path(__file__).resolve().parents[1] / "supabase" / "migrations" / "20260922150000_dukamp_legacy_archive.sql"


def open_dbf(path: Path) -> DBF:
    return DBF(
        str(path),
        encoding=ENCODING,
        char_decode_errors="replace",
        ignore_missing_memofile=True,
        load=False,
    )

LABELS = {
    "faaclien": "Clientes",
    "efaprodu": "Produtos",
    "faapedid": "Pedidos de venda",
    "faapedii": "Itens dos pedidos de venda",
    "faanotas": "Notas fiscais",
    "faanotai": "Itens das notas fiscais",
    "faanotpv": "Pré-vendas",
    "faanitpv": "Itens das pré-vendas",
    "faanobpv": "Observações das pré-vendas",
    "faanotob": "Observações das notas fiscais",
    "cpaforne": "Fornecedores",
    "cpatitup": "Títulos a pagar",
    "cpatiapg": "Baixas de contas a pagar",
    "cpaautpg": "Autorizações de pagamento",
    "cratitul": "Títulos a receber",
    "rratitul": "Histórico de títulos a receber",
    "faarepre": "Representantes e vendedores",
    "faatrans": "Transportadoras",
    "faacidad": "Cidades",
    "faaibge": "Códigos IBGE",
    "faacep": "Cadastro nacional de CEPs",
    "cmanoten": "Notas de entrada",
    "cmaitent": "Itens das notas de entrada",
    "cmapedid": "Pedidos de compra",
    "cmaitped": "Itens dos pedidos de compra",
    "faacomis": "Comissões",
    "faacomti": "Comissões por título",
    "faacompv": "Comissões de pré-venda",
    "faacomtp": "Comissões por pedido",
    "faavenct": "Vencimentos",
    "faavenpv": "Vencimentos de pré-venda",
    "faaentsq": "Saldos de estoque",
    "faaentit": "Movimentações de estoque",
    "faancm": "NCM",
    "sialogus": "Log de usuários",
    "efalogpr": "Log de produtos",
    "cralogti": "Log de títulos a receber",
}


def module_for(name: str) -> str:
    if name.startswith(("cpa",)):
        return "Contas a pagar"
    if name.startswith(("cra", "rra")):
        return "Contas a receber"
    if name.startswith(("cma",)):
        return "Compras e almoxarifado"
    if name.startswith(("faa", "fia")):
        return "Faturamento e vendas"
    if name.startswith(("efa",)):
        return "Produtos e estoque"
    if name.startswith(("osa",)):
        return "Orçamentos e serviços"
    if name.startswith(("rea",)):
        return "Receitas e produção"
    if name.startswith(("sia",)):
        return "Sistema e auditoria"
    return "Tabelas técnicas"


def clean_name(value: str) -> str:
    value = re.sub(r"[^a-z0-9_]", "_", value.strip().lower())
    if value and value[0].isdigit():
        value = "c_" + value
    return value or "coluna"


def unique_files(directory: Path) -> list[Path]:
    files: dict[str, Path] = {}
    for path in directory.iterdir():
        if path.is_file() and path.suffix.lower() == ".dbf":
            files[path.name.lower()] = path
    return sorted(files.values(), key=lambda item: item.name.lower())


def header_record_count(path: Path) -> int:
    with path.open("rb") as handle:
        header = handle.read(8)
    return struct.unpack("<I", header[4:8])[0] if len(header) == 8 else 0


def postgres_type(field: Any) -> str:
    if field.type == "C":
        return f"varchar({field.length})" if field.length <= 500 else "text"
    if field.type == "N":
        if field.decimal_count:
            return f"numeric({field.length},{field.decimal_count})"
        return "integer" if field.length <= 9 else "bigint"
    if field.type == "F":
        return "double precision"
    if field.type == "D":
        return "date"
    if field.type == "L":
        return "boolean"
    return "text"


@dataclass
class LegacyTable:
    source: Path
    source_name: str
    target_name: str
    label: str
    module: str
    fields: list[Any]
    columns: list[str]
    record_count: int

    @property
    def metadata_columns(self) -> list[dict[str, Any]]:
        return [
            {
                "name": column,
                "source": field.name,
                "type": postgres_type(field),
                "searchable": field.type in {"C", "M"} and field.length <= 255,
            }
            for field, column in zip(self.fields, self.columns)
        ]


def inspect_tables(directory: Path) -> tuple[list[LegacyTable], list[tuple[str, str]]]:
    tables: list[LegacyTable] = []
    invalid: list[tuple[str, str]] = []
    for path in unique_files(directory):
        try:
            table = open_dbf(path)
            fields = list(table.fields)
            if not fields:
                raise ValueError("arquivo sem campos")
            seen: dict[str, int] = {}
            columns: list[str] = []
            for field in fields:
                base = clean_name(field.name)
                seen[base] = seen.get(base, 0) + 1
                columns.append(base if seen[base] == 1 else f"{base}_{seen[base]}")
            source_name = clean_name(path.stem)
            tables.append(
                LegacyTable(
                    source=path,
                    source_name=source_name,
                    target_name=TABLE_PREFIX + source_name,
                    label=LABELS.get(source_name, path.stem.upper()),
                    module=module_for(source_name),
                    fields=fields,
                    columns=columns,
                    record_count=header_record_count(path),
                )
            )
        except Exception as error:
            invalid.append((path.name, f"{type(error).__name__}: {error}"))
    return tables, invalid


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def generate_sql(tables: list[LegacyTable], invalid: list[tuple[str, str]]) -> str:
    parts = [
        "-- Arquivo gerado por scripts/legacy_dbf_to_supabase.py.",
        "-- Estrutura somente leitura do ERP Clipper da Dukamp; os dados são importados fora do Git.",
        "create table if not exists public.dukamp_legacy_tables (",
        "  source_name text primary key,",
        "  target_name text not null unique,",
        "  label text not null,",
        "  module text not null,",
        "  source_file text not null,",
        "  source_record_count bigint not null default 0,",
        "  imported_record_count bigint not null default 0,",
        "  columns jsonb not null default '[]'::jsonb,",
        "  imported_at timestamptz,",
        "  created_at timestamptz not null default now()",
        ");",
        "alter table public.dukamp_legacy_tables enable row level security;",
        "revoke all on public.dukamp_legacy_tables from public, anon;",
        "grant select on public.dukamp_legacy_tables to authenticated;",
        "grant all on public.dukamp_legacy_tables to service_role;",
        "drop policy if exists \"Admins read legacy table catalog\" on public.dukamp_legacy_tables;",
        "create policy \"Admins read legacy table catalog\" on public.dukamp_legacy_tables",
        "  for select to authenticated using (public.has_role(auth.uid(), 'admin'));",
        "",
    ]
    for table in tables:
        definitions = ["  _row_id bigint generated always as identity primary key"]
        definitions.extend(
            f'  "{column}" {postgres_type(field)}'
            for field, column in zip(table.fields, table.columns)
        )
        definitions.append("  _imported_at timestamptz not null default now()")
        parts.extend(
            [
                f"-- {table.source.name}: {table.label}",
                f'create table if not exists public."{table.target_name}" (',
                ",\n".join(definitions),
                ");",
                f'alter table public."{table.target_name}" enable row level security;',
                f'revoke all on public."{table.target_name}" from public, anon;',
                f'grant select on public."{table.target_name}" to authenticated;',
                f'grant all on public."{table.target_name}" to service_role;',
                f'drop policy if exists "Admins read {table.source_name}" on public."{table.target_name}";',
                f'create policy "Admins read {table.source_name}" on public."{table.target_name}"',
                "  for select to authenticated using (public.has_role(auth.uid(), 'admin'));",
                "",
            ]
        )
    values = []
    for table in tables:
        values.append(
            "(" + ", ".join(
                [
                    sql_literal(table.source_name),
                    sql_literal(table.target_name),
                    sql_literal(table.label),
                    sql_literal(table.module),
                    sql_literal(table.source.name),
                    str(table.record_count),
                    sql_literal(json.dumps(table.metadata_columns, ensure_ascii=False)) + "::jsonb",
                ]
            ) + ")"
        )
    parts.extend(
        [
            "insert into public.dukamp_legacy_tables",
            "  (source_name, target_name, label, module, source_file, source_record_count, columns)",
            "values",
            ",\n".join(values),
            "on conflict (source_name) do update set",
            "  target_name = excluded.target_name, label = excluded.label, module = excluded.module,",
            "  source_file = excluded.source_file, source_record_count = excluded.source_record_count,",
            "  columns = excluded.columns;",
            "",
            "comment on table public.dukamp_legacy_tables is 'Catálogo das tabelas históricas migradas do ERP Clipper da Dukamp.';",
            "",
        ]
    )
    if invalid:
        parts.append("-- Arquivos ignorados por não serem DBFs válidos:")
        parts.extend(f"-- {name}: {reason}" for name, reason in invalid)
    return "\n".join(parts) + "\n"


def normalize_value(value: Any) -> Any:
    if isinstance(value, (date, datetime)):
        return value
    if isinstance(value, str):
        return value.replace("\x00", "")
    return value


def row_values(table: LegacyTable) -> Iterable[tuple[Any, ...]]:
    dbf = open_dbf(table.source)
    for record in dbf:
        yield tuple(normalize_value(record.get(field.name)) for field in table.fields)


def import_tables(
    tables: list[LegacyTable],
    invalid: list[tuple[str, str]],
    database_url: str,
    replace: bool,
    apply_schema: bool,
) -> None:
    try:
        import psycopg
        from psycopg import sql
    except ImportError as error:
        raise SystemExit("Instale o driver: pip install 'psycopg[binary]'") from error

    with psycopg.connect(database_url, autocommit=False) as connection:
        if apply_schema:
            print("Criando/atualizando a estrutura histórica no Supabase...")
            with connection.cursor() as cursor:
                cursor.execute(generate_sql(tables, invalid))
            connection.commit()
            print("Estrutura pronta.")
        for index, table in enumerate(tables, start=1):
            with connection.cursor() as cursor:
                cursor.execute(
                    sql.SQL("select count(*) from public.{}")
                    .format(sql.Identifier(table.target_name))
                )
                existing = cursor.fetchone()[0]
                if existing and not replace:
                    print(f"[{index}/{len(tables)}] {table.source.name}: ignorada ({existing} linhas já importadas)")
                    connection.rollback()
                    continue
                if replace:
                    cursor.execute(
                        sql.SQL("truncate table public.{} restart identity")
                        .format(sql.Identifier(table.target_name))
                    )
                column_sql = sql.SQL(", ").join(map(sql.Identifier, table.columns))
                copy_sql = sql.SQL("copy public.{} ({}) from stdin").format(
                    sql.Identifier(table.target_name), column_sql
                )
                count = 0
                with cursor.copy(copy_sql) as copy:
                    for values in row_values(table):
                        copy.write_row(values)
                        count += 1
                        if count % 50_000 == 0:
                            print(f"  {table.source.name}: {count:,}")
                cursor.execute(
                    "update public.dukamp_legacy_tables set imported_record_count=%s, imported_at=now() where source_name=%s",
                    (count, table.source_name),
                )
            connection.commit()
            print(f"[{index}/{len(tables)}] {table.source.name}: {count:,} linhas")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["generate", "import", "inspect"])
    parser.add_argument("--dbf-dir", type=Path, default=DEFAULT_DBF_DIR)
    parser.add_argument("--migration", type=Path, default=DEFAULT_MIGRATION)
    parser.add_argument("--database-url", default=os.getenv("SUPABASE_DB_URL"))
    parser.add_argument("--replace", action="store_true")
    parser.add_argument(
        "--skip-schema",
        action="store_true",
        help="Não executar a migration antes do envio (a estrutura deve existir).",
    )
    args = parser.parse_args()

    tables, invalid = inspect_tables(args.dbf_dir)
    print(f"{len(tables)} tabelas válidas; {len(invalid)} arquivos inválidos")
    for name, reason in invalid:
        print(f"  ignorado: {name}: {reason}")

    if args.action == "inspect":
        for table in tables:
            print(f"{table.source.name:20} {table.record_count:>10,}  {table.module} / {table.label}")
        return
    if args.action == "generate":
        args.migration.parent.mkdir(parents=True, exist_ok=True)
        args.migration.write_text(generate_sql(tables, invalid), encoding="utf-8")
        print(f"Migration gerada: {args.migration}")
        return
    if not args.database_url:
        raise SystemExit("Defina SUPABASE_DB_URL com a connection string direta/pooler do Supabase.")
    import_tables(tables, invalid, args.database_url, args.replace, not args.skip_schema)


if __name__ == "__main__":
    main()
