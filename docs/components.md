# Componentes

## Organização

```
src/components/
├── ui/       → shadcn/ui (Radix + Tailwind). Base do design system.
├── site/     → componentes da loja pública.
├── admin/    → utilitários do painel administrativo.
├── sellers/  → cartões e banner da equipe de vendas.
└── support/  → chat de atendimento.
```

## `src/components/ui/`

Biblioteca shadcn/ui completa: `button`, `input`, `dialog`, `sheet`, `dropdown-menu`, `card`, `table`, `form` (integrado com react-hook-form), `sidebar`, `carousel` (Embla), `chart` (Recharts), `sonner` (toasts), etc. Estilos vêm de `src/styles.css` (tokens semânticos) — **não use classes de cor hardcoded** (`bg-white`, `text-black`, `#hex`). Prefira `bg-background`, `text-foreground`, `bg-primary`, etc.

## `src/components/site/`

| Componente | Papel |
| --- | --- |
| `SiteLayout` | Wrapper padrão: `Header + MainNav + main + InstitutionalSidebar + Footer + ApprovalNoticeModal`. |
| `Header` | Cabeçalho superior (logo, busca, atalhos, conta). |
| `MainNav` | Menu principal (mobile e desktop). |
| `Footer` | Rodapé com grupos institucional/segurança e páginas de `FOOTER_PAGES`. |
| `InstitutionalSidebar` | Coluna lateral no desktop com atalhos institucionais. |
| `ProductCard` | Card padrão de produto (usa `optimized-image`). |
| `QuotesWidget` / `QuotesPanel` / `NavbarQuoteTicker` | Cotações no header e painel expandido. |
| `MapCepPicker` | Seletor de CEP com Leaflet. |
| `RichContent` | Renderização segura de HTML (páginas institucionais). |
| `ApprovalNoticeModal` | Aviso único de aprovação para conta `produtor`. |
| `DeliveryNoticeWatcher` | Toast de entrega concluída. |
| `LazyMount` | Monta filho só quando visível/idle. |
| `BrandIcons` | Ícones de marcas/serviços. |

## `src/components/admin/`

| Componente | Papel |
| --- | --- |
| `ResourceCrud` | CRUD genérico com tabela, filtros e formulário (usado em várias telas admin). |
| `ImageUpload` | Upload para o bucket `media` do Storage. |
| `RichTextEditor` | Editor rich text para páginas e produtos. |

## `src/components/sellers/`

| Componente | Papel |
| --- | --- |
| `SellerCard` | Card do grid `/equipe-de-vendas`. |
| `SellerProfileBanner` | Banner de perfil (curvas SVG vermelho/amarelo, foto circular, CTA WhatsApp). |

## `src/components/support/`

| Componente | Papel |
| --- | --- |
| `ChatLauncher` | Botão flutuante de chat. |
| `ChatWindow` / `MessageList` | Interface de conversa. |
| `AdminChatPanel` | Painel do admin em `/admin/atendimentos`. |

## Guia rápido de estilo

- Use tokens em vez de cores literais.
- Reaproveite variações do shadcn (`variant`, `size`) antes de criar componente novo.
- Componentes de rota que precisam de SEO devem definir `head()` na rota, não em componentes filhos.
