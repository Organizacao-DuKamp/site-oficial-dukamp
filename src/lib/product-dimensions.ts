// Helper determinístico para preencher peso/dimensões a partir do nome do produto.
// Regras fixas para 20kg, 25kg e 30kg. Fora disso, retorna null em todos os campos.

export type ProductDimensions = {
  peso: number | null;
  altura: number | null;
  largura: number | null;
  comprimento: number | null;
};

const RULES: Array<{ re: RegExp; dims: ProductDimensions }> = [
  { re: /30\s?kg/i, dims: { peso: 30, altura: 20, largura: 65, comprimento: 90 } },
  { re: /25\s?kg/i, dims: { peso: 25, altura: 20, largura: 60, comprimento: 80 } },
  { re: /20\s?kg/i, dims: { peso: 20, altura: 15, largura: 55, comprimento: 70 } },
];

export function getDimensionsFromName(name: string | null | undefined): ProductDimensions {
  if (!name) return { peso: null, altura: null, largura: null, comprimento: null };
  for (const { re, dims } of RULES) {
    if (re.test(name)) return { ...dims };
  }
  return { peso: null, altura: null, largura: null, comprimento: null };
}
