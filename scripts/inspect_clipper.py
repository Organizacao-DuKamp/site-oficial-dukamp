"""Inspeciona EXEs Harbour e lançadores WMENUS, sem executar nem alterar DBFs.

Requer pefile. O relatório completo fica fora de public/ e não contém registros DBF.
As instruções são desassembladas, não interpretadas como código de negócio novo.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
from pathlib import Path
from urllib.request import urlopen

import pefile


def opcode_definitions(cache: Path):
    cache.mkdir(parents=True, exist_ok=True)
    path = cache / "harbour-hbpcode.c"
    if not path.exists():
        # Harbour's published instruction-size table; retain upstream license in cache.
        url = "https://raw.githubusercontent.com/harbour/core/master/src/compiler/hbpcode.c"
        path.write_bytes(urlopen(url, timeout=30).read())
    text = path.read_text(encoding="utf-8")
    table = text.split("const HB_BYTE hb_comp_pcode_len[] = {", 1)[1].split("};", 1)[0]
    values = re.findall(r"([^\n]+?),?\s*/\* HB_P_(\w+)\s*\*/", table)
    return [(name, 11 if "sizeof" in size else int(size.strip().rstrip(","))) for size, name in values]


def coff_symbols(data: bytes, pe):
    offset, count = pe.FILE_HEADER.PointerToSymbolTable, pe.FILE_HEADER.NumberOfSymbols
    strings = offset + count * 18
    result = []
    i = 0
    source = ""
    while i < count:
        pos = offset + i * 18
        raw, value, section, kind, storage, aux = struct.unpack_from("<8sIhHBB", data, pos)
        name = data[strings + struct.unpack("<I", raw[4:])[0]:].split(b"\0", 1)[0] if raw[:4] == b"\0" * 4 else raw.rstrip(b"\0")
        name = name.decode("ascii", "replace")
        if name == ".file":
            source = data[pos + 18:pos + 18 * (aux + 1)].split(b"\0", 1)[0].decode("ascii", "replace")
        result.append({"name": name, "value": value, "section": section, "source": source, "kind": kind})
        i += aux + 1
    return result


def decode(code: bytes, symbols: list[str], definitions):
    pos, line = 0, None
    while pos < len(code):
        start = pos
        op = code[pos]
        if op >= len(definitions):
            raise ValueError(f"unknown opcode {op} at {pos}")
        name, length = definitions[op]
        value = None
        if name in ("MODULENAME", "LOCALNAME", "STATICNAME"):
            prefix = {"MODULENAME": 1, "LOCALNAME": 3, "STATICNAME": 4}[name]
            end = code.index(0, pos + prefix)
            length = end - pos + 1
            value = code[pos + prefix:end].decode("cp850", "replace")
        elif name in ("PUSHSTRSHORT", "PUSHSTR", "PUSHSTRLARGE"):
            size = {"PUSHSTRSHORT": 1, "PUSHSTR": 2, "PUSHSTRLARGE": 3}[name]
            chars = int.from_bytes(code[pos + 1:pos + 1 + size], "little")
            length = 1 + size + chars
            value = code[pos + 1 + size:pos + length].rstrip(b"\0").decode("cp850", "replace")
        elif name in ("PUSHBLOCK", "PUSHBLOCKSHORT", "PUSHBLOCKLARGE"):
            size = {"PUSHBLOCKSHORT": 1, "PUSHBLOCK": 2, "PUSHBLOCKLARGE": 3}[name]
            length = int.from_bytes(code[pos + 1:pos + 1 + size], "little")
        elif name == "PUSHSTRHIDDEN":
            length = 4 + int.from_bytes(code[pos + 2:pos + 4], "little")
        elif name == "THREADSTATICS":
            length = 3 + 2 * int.from_bytes(code[pos + 1:pos + 3], "little")
        elif name in ("PUSHBYTE", "PUSHINT", "PUSHLONG", "PUSHLONGLONG"):
            value = int.from_bytes(code[pos + 1:pos + length], "little", signed=True)
        elif name == "PUSHDOUBLE":
            value = struct.unpack_from("<d", code, pos + 1)[0]
        elif name == "LINE":
            line = value = int.from_bytes(code[pos + 1:pos + 3], "little")
        elif name.startswith("JUMP"):
            value = pos + int.from_bytes(code[pos + 1:pos + length], "little", signed=True)
        elif name in ("PUSHSYM", "PUSHSYMNEAR", "PUSHFUNCSYM", "PUSHMEMVAR", "PUSHVARIABLE", "PUSHFIELD", "POPMEMVAR", "POPVARIABLE", "POPFIELD", "MESSAGE", "PUSHMEMVARREF", "PUSHALIASEDFIELD", "PUSHALIASEDVAR"):
            index = int.from_bytes(code[pos + 1:pos + length], "little")
            value = symbols[index] if index < len(symbols) else f"symbol#{index}"
        elif length > 1:
            value = int.from_bytes(code[pos + 1:pos + length], "little")
        if length < 1 or pos + length > len(code):
            raise ValueError(f"invalid length {length} for {name} at {pos}")
        yield {"offset": start, "op": name, "value": value, "line": line}
        pos += length
        if name == "ENDPROC":
            break


def inspect_exe(path: Path, definitions):
    data = path.read_bytes()
    result = {"file": path.name, "sha256": hashlib.sha256(data).hexdigest(), "functions": [], "errors": []}
    try:
        pe = pefile.PE(data=data)
    except pefile.PEFormatError:
        result["format"] = "DOS/other"
        return result
    result["format"] = f"PE{pe.FILE_HEADER.Machine:x}"
    if not pe.FILE_HEADER.PointerToSymbolTable:
        return result
    all_symbols = coff_symbols(data, pe)

    def file_pos(sym):
        return pe.sections[sym["section"] - 1].PointerToRawData + sym["value"]

    def read_va(addr):
        return pe.get_offset_from_rva(addr - pe.OPTIONAL_HEADER.ImageBase)

    # Each generated C translation unit has its own symbol table and static pcodes.
    modules = {}
    for sym in all_symbols:
        modules.setdefault(sym["source"], []).append(sym)
    pcode_offsets = sorted({file_pos(s) for s in all_symbols if s["name"].startswith("_pcode.")})
    for module, members in modules.items():
        table = next((s for s in members if s["name"] == "_symbols_table"), None)
        if not table:
            continue
        names = []
        start = file_pos(table)
        for pos in range(start, min(start + 16000, len(data) - 16), 16):
            try:
                ptr, flags, func, _ = struct.unpack_from("<IIII", data, pos)
                name_pos = read_va(ptr)
                name = data[name_pos:name_pos + 180].split(b"\0", 1)[0].decode("ascii")
                if not name or not re.fullmatch(r"[A-Za-z0-9_$():]+", name):
                    break
                names.append(name)
            except (ValueError, UnicodeDecodeError, pefile.PEFormatError):
                break
        current_func = None
        for sym in members:
            if sym["section"] == 1 and sym["kind"] == 0x20:
                current_func = sym["name"].removeprefix("_HB_FUN_")
            if not sym["name"].startswith("_pcode."):
                continue
            begin = file_pos(sym)
            end = next((offset for offset in pcode_offsets if offset > begin), begin + 65536)
            try:
                instructions = list(decode(data[begin:end], names, definitions))
                source = next((x["value"] for x in instructions if x["op"] == "MODULENAME"), module)
                result["functions"].append({"name": current_func, "source": source, "offset": begin, "instructions": instructions})
            except (ValueError, IndexError, struct.error) as exc:
                result["errors"].append({"function": current_func, "module": module, "error": str(exc)})
    return result


def inspect_launchers(root: Path):
    launchers = []
    for path in sorted(root.glob("*.mnu")):
        lines = path.read_text(encoding="cp1252").splitlines()
        title = re.split(r"\s{2,}", lines[0].strip())[0]
        entries = []
        for line in lines[1:]:
            match = re.match(r"\s*(.*?)\s+(\d+)\s+([a-zA-Z]:\\.*)\s*$", line)
            if not match:
                continue
            label, shortcut, command = match.groups()
            entries.append({"label": label, "shortcut": shortcut, "command": command.strip()})
        launchers.append({"id": path.stem.lower(), "title": title, "source": path.name, "entries": entries})
    return launchers


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--work", type=Path, required=True)
    parser.add_argument("--wmenus", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    definitions = opcode_definitions(args.output)
    report = {"launchers": inspect_launchers(args.wmenus), "executables": []}
    for path in sorted(args.work.glob("*.exe")):
        result = inspect_exe(path, definitions)
        (args.output / f"{path.stem.lower()}.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        report["executables"].append({key: value for key, value in result.items() if key != "functions"} | {"functions": len(result["functions"])})
        print(f"{path.name}: {len(result['functions'])} functions, {len(result['errors'])} decode errors")
    (args.output / "inventory.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
