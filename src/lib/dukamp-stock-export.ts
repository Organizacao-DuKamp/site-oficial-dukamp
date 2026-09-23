export type StockItem = {
  code: string;
  name: string;
  unit: string;
  stock: number;
  cost: number | null;
  total_cost: number | null;
  sale_price: number | null;
  total_sale: number | null;
  avg_sales: number | null;
  avg_total: number | null;
  minimum: number | null;
  brand: string | null;
  supplier_code: string | null;
  updated_at?: string;
};

export const STOCK_HEADERS = [
  "codigo", "descricao", "unidade", "saldo_estoque", "custo",
  "total_custo", "preco_venda", "total_venda", "media_vendas",
  "total_media", "minimo", "marca", "fornecedor",
] as const;

export function allowedStockName(name: string): boolean {
  return !/(XX|ZZ)/i.test(name);
}

function csvCell(value: string, escapeFormula = false): string {
  // A leading apostrophe keeps Excel from evaluating names as formulas.
  const safe = escapeFormula && /^[=+@-]/.test(value) ? "'" + value : value;
  return '"' + safe.replace(/"/g, '""') + '"';
}

function decimalPt(value: number | null): string {
  return value == null ? "" : value.toFixed(2).replace(".", ",");
}

export function stockToCsv(rows: StockItem[]): string {
  const lines = rows.map((row) => [
    row.code, row.name, row.unit, decimalPt(row.stock),
    decimalPt(row.cost), decimalPt(row.total_cost), decimalPt(row.sale_price),
    decimalPt(row.total_sale), decimalPt(row.avg_sales), decimalPt(row.avg_total),
    decimalPt(row.minimum), row.brand ?? "", row.supplier_code ?? "",
  ].map((value, index) => csvCell(value, [1, 2, 11, 12].includes(index))).join(";"));
  return "\uFEFFsep=;\r\n" + STOCK_HEADERS.join(";") + "\r\n" + lines.join("\r\n") + "\r\n";
}

function parseCsv(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "").replace(/^sep=;\r?\n/i, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ";" && !quoted) {
      row.push(cell); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((part) => part.trim())) result.push(row);
      row = []; cell = "";
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error("O CSV tem uma célula com aspas não fechadas.");
  if (row.length || cell) {
    row.push(cell);
    if (row.some((part) => part.trim())) result.push(row);
  }
  return result;
}

function numeric(value: string, line: number, field: string, required = false): number | null {
  const clean = value.trim().replace(/\s/g, "");
  if (!clean && !required) return null;
  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : clean;
  const parsed = Number(normalized);
  if (!clean || !Number.isFinite(parsed)) {
    throw new Error(`Linha ${line}: ${field} deve conter um número válido.`);
  }
  return parsed;
}

export function parseStockCsv(text: string): StockItem[] {
  const lines = parseCsv(text);
  if (lines.length < 2 || STOCK_HEADERS.join(";") !== lines[0].map((v) => v.trim().toLowerCase()).join(";")) {
    throw new Error("Cabeçalho inválido. Importe um CSV baixado desta página.");
  }
  const seen = new Set<string>();
  return lines.slice(1).map((values, index) => {
    const line = index + 2;
    if (values.length !== STOCK_HEADERS.length) throw new Error(`Linha ${line}: quantidade de colunas incorreta.`);
    const [rawCode, rawName, rawUnit, stock, cost, totalCost, salePrice, totalSale, avgSales, avgTotal, minimum, brand, supplier] = values;
    const unescape = (v: string) => v.replace(/^'(?=[=+@-])/, "").trim();
    const code = rawCode.trim().replace(/^'/, "").padStart(6, "0");
    const name = unescape(rawName);
    if (!/^\d{6}$/.test(code)) throw new Error(`Linha ${line}: código inválido.`);
    if (seen.has(code)) throw new Error(`Linha ${line}: código ${code} repetido no arquivo.`);
    if (!name || !allowedStockName(name)) throw new Error(`Linha ${line}: nome vazio ou com XX/ZZ.`);
    if (!rawUnit.trim()) throw new Error(`Linha ${line}: unidade vazia.`);
    seen.add(code);
    return {
      code, name, unit: unescape(rawUnit),
      stock: numeric(stock, line, "saldo_estoque", true)!,
      cost: numeric(cost, line, "custo"),
      total_cost: numeric(totalCost, line, "total_custo"),
      sale_price: numeric(salePrice, line, "preco_venda"),
      total_sale: numeric(totalSale, line, "total_venda"),
      avg_sales: numeric(avgSales, line, "media_vendas"),
      avg_total: numeric(avgTotal, line, "total_media"),
      minimum: numeric(minimum, line, "minimo"),
      brand: unescape(brand) || null,
      supplier_code: supplier.trim() ? supplier.trim().replace(/^'/, "").padStart(6, "0") : null,
    };
  });
}

function pdfText(value: string): string {
  return [...value].map((char) => {
    const code = char.charCodeAt(0);
    if (char === "\\" || char === "(" || char === ")") return "\\" + char;
    if (code < 32) return " ";
    if (code < 127) return char;
    if (code <= 255) return "\\" + code.toString(8).padStart(3, "0");
    return char.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "?");
  }).join("");
}

function drawText(x: number, y: number, value: string, size = 7): string {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${pdfText(value)}) Tj ET\n`;
}

export function stockToPdf(rows: StockItem[]): Blob {
  const perPage = 36;
  const pageCount = Math.max(1, Math.ceil(rows.length / perPage));
  const objects: string[] = ["", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"];
  const pageRefs: string[] = [];
  const widths = [44, 190, 24, 55, 55, 58, 54, 63, 48, 49, 48, 65];
  const headers = ["COD", "DESCRICAO", "UN", "SALDO", "CUSTO", "TT CUSTO", "VENDA", "TT VENDA", "MEDIA", "TT MEDIA", "MIN", "MARCA"];
  for (let p = 0; p < pageCount; p++) {
    const pageRows = rows.slice(p * perPage, (p + 1) * perPage);
    let stream = drawText(32, 556, "DUKAMP SAUDE ANIMAL  |  ESTOQUE DUKAMP", 12);
    stream += drawText(32, 539, `Produtos selecionados: ${rows.length}  |  Gerado em ${new Date().toLocaleDateString("pt-BR")}`, 8);
    stream += drawText(743, 539, `Pag. ${p + 1}/${pageCount}`, 8);
    let x = 32;
    headers.forEach((header, i) => {
      stream += drawText(x + 2, 514, header, 6.7);
      x += widths[i];
    });
    stream += "0.2 w 32 508 m 810 508 l S\n";
    pageRows.forEach((row, i) => {
      const y = 494 - i * 12.3;
      const values = [
        row.code, row.name.slice(0, 31), row.unit, decimalPt(row.stock), decimalPt(row.cost),
        decimalPt(row.total_cost), decimalPt(row.sale_price), decimalPt(row.total_sale),
        decimalPt(row.avg_sales), decimalPt(row.avg_total), decimalPt(row.minimum),
        (row.brand ?? "").slice(0, 10),
      ];
      let cellX = 32;
      values.forEach((value, col) => {
        stream += drawText(cellX + 2, y, value, 6.5);
        cellX += widths[col];
      });
      if (i % 2 === 1) stream += `0.85 G 32 ${y - 3} m 810 ${y - 3} l S 0 G\n`;
    });
    const contentId = objects.length + 1;
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    const pageId = objects.length + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageRefs.push(`${pageId} 0 R`);
  }
  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pageCount} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadStockFile(content: Blob | string, name: string, type?: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
