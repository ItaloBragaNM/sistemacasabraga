# Guia de estilo — Casa Braga

Uma única família visual para todas as telas e PDFs. Tokens em `src/app/globals.css`. Componentes em `src/components/ui/`.

## Paleta

| Token | Hex | Uso |
| --- | --- | --- |
| forest | `#1E443E` | Texto, ação principal, sidebar ativa |
| petrol | `#003F3C` | Menu lateral |
| cream | `#F7F6F4` | Fundo da página |
| line | `#E4E8E6` | Bordas de card e tabela |
| muted | `#5D6F6C` | Metadado, labels |
| ok | `#2F7D5B` | Estado em dia / conferido |
| warn | `#8A6D0B` + fundo `#FDF6DC` | Ajuste manual, alerta |
| danger / terracotta | `#C4453C` | Perda, ruptura, exclusão — nunca botão principal |

## Tipografia

Poppins em toda a interface. Escala:

- Página: 22 / semibold
- Seção: 15 / semibold
- Corpo: 14 / regular
- Label e metadado: 13 / medium ou regular
- Grupo (categoria): 12 / semibold, uppercase, tracking 0.08em

## Espaço e forma

Grade de 4/8 px. Card: padding 20 px (`p-5`), raio 8 px, sombra `0 1px 2px rgb(30 68 62 / 0.04)`. Inputs: altura 40 px (`h-10`); quantidade: 36 × 80 px, alinhada à direita. Página: `max-w-5xl`; telas densas (ficha, alocação, comercial): `max-w-6xl`.

## Componentes

- `PageShell` / `PageHeader` — cabeçalho único
- `Card` / `CardHeader` — superfície
- `SegmentedControl` — abas
- `FilterChip` — tags e filtros (`tone="danger"` só para perda)
- `QtyInput` — número, nunca negativo
- `StatusPill` / `KpiCard` — estados e totais
- `CadastrosHeader` delega para `PageHeader`
- `fieldControlClass` — input/select/textarea

## Utilitários CSS

`page-title`, `section-title`, `group-title`, `field-label`, `meta-text`, `surface-card`, `row-edited`, `tabular`.

## PDF

Kit em `src/lib/pdf/header.tsx`: selo 30 pt, margens 18/22, corpo 8,5 pt, tinta `#1C1C1C`, cabeçalho e rodapé fixos, cabeçalho de tabela repetido.
