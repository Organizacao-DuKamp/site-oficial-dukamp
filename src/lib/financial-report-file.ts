import { extractPdfText } from "@/lib/seller-margin-report";
const cp850 =
  "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´­±‗¾¶§÷¸°¨·¹³²■ ";
export async function readFinancialReportFile(file: File) {
  if (file.size > 32 * 1024 * 1024) throw new Error("Arquivo acima de 32 MB.");
  const buffer = await file.arrayBuffer();
  if (/\.pdf$/i.test(file.name)) return extractPdfText(file);
  if (!/\.txt$/i.test(file.name)) throw new Error("Envie PDF ou TXT.");
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return Array.from(new Uint8Array(buffer), (b) =>
      b < 128 ? String.fromCharCode(b) : cp850[b - 128],
    ).join("");
  }
}
