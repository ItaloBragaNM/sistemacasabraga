# Casa Braga — Gestão de Eventos

Sistema operacional da Casa Braga (Fortaleza) para a casa inteira: comercial, eventos, cozinha, logística, financeiro, administrativo e veículos.

Esta primeira fase entrega o **módulo de Eventos**. Os demais módulos já estão no menu, com o aviso de que serão desenvolvidos em breve.

## O que está pronto

- **Calendário de Eventos** — visão mensal, semanal e lista agrupada por dia
- **Ficha do Evento** — documento operacional editável (identificação, cliente, local, público, serviço, cronograma, cardápio, restrições, equipe, materiais, veículos, financeiro resumido e briefing)
- **PDF da cozinha** — layout A4 para a produção trabalhar, sem valores financeiros
- Dados de exemplo da operação da casa, salvos neste aparelho (localStorage)

A ficha foi modelada como a ordem de serviço que a casa já usa no dia a dia e como base dos próximos módulos:

| Bloco da ficha | Módulo futuro |
| --- | --- |
| Cardápio, restrições, observações de cozinha | Separação de Insumos, Fichas Técnicas, Estoque, Perdas |
| Equipe interna e externa | Administrativo e Pagamento de Mão de Obra |
| Materiais | Separação, Estoque, Alocação, Inventário e Compras |
| Veículos | Controle de Uso e Multas |
| Financeiro resumido | Contas a Receber |
| Cliente e valores | Dashboard Comercial e Orçamentos |

Supabase e deploy na Vercel ficam para depois da validação.

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:43127](http://localhost:43127).

## Tipografia

A casa pediu Hatton Semi-Bold, TT Barrels Bold, Open Sauce e Montserrat. Hatton e TT Barrels são fontes comerciais; nesta fase usamos equivalentes abertos:

- Títulos e nomes: Cormorant Garamond ( Semi-Bold ), no lugar de Hatton
- Subtítulos de seção em caixa alta: Oswald Bold, no lugar de TT Barrels
- Textos e labels: Open Sauce One (Light/Bold)
- Listas: Montserrat

Quando as fontes originais estiverem licenciadas, basta trocar os arquivos em `src/fonts` e o `layout`.

## Próximo passo

Validar o calendário e a ficha. Depois conectamos a base no Supabase e seguimos pelos módulos restantes.
