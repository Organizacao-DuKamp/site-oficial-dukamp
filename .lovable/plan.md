Objetivo: inserir o ícone enviado (logo Taurus) ao lado da logo Dukamp no canto superior esquerdo, sem fundo.

Tarefas:
1. Processar a imagem enviada (`IMG-20260730-WA0159.jpg`):
   - O arquivo está em JPEG, ou seja, não possui transparência real.
   - Remover o fundo branco/cinza do checkerboard e gerar um PNG com fundo transparente.
   - Salvar o resultado em `src/assets/taurus-icon.png`.

2. Adicionar o ícone como asset do projeto:
   - Como é uma imagem pequena e parte da identidade visual, manter o arquivo em `src/assets/`.
   - Importar no `Header.tsx`.

3. Alterar `src/components/site/Header.tsx`:
   - Dentro do `<Link to="/">` que envolve a logo, renderizar o novo ícone ao lado (antes ou depois) da logo Dukamp.
   - Ajustar tamanho para ~h-10 sm:h-12, mantendo proporção.
   - Garantir alinhamento vertical e espaçamento pequeno entre os dois elementos.

4. Verificar visualmente no preview:
   - Confirmar que o ícone aparece sem fundo branco.
   - Confirmar que não quebra o layout mobile nem desktop.

Nota: não serão alteradas tabelas, políticas RLS, dados do Supabase ou outras funcionalidades.