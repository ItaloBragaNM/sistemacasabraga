# Casa Braga — Gestão de Eventos

Sistema operacional da Casa Braga (Fortaleza) para a casa inteira: comercial, eventos, cozinha, logística, financeiro, administrativo e veículos.

Esta primeira fase entrega o **módulo de Eventos**. Os demais módulos já estão no menu, com o aviso de que serão desenvolvidos em breve.

## O que está pronto

- **Calendário de Eventos** — visão mensal, semanal e lista agrupada por dia
- **Ficha do Evento** — a mesma lógica da planilha da casa: dados do evento, convidados e horários, equipe por função, cardápio por categoria (Para Começar, Amuse Bouche, Ramequim, Menu, Mesa e Buffet, Saladas, Altas Horas, Sobremesas, Menu Kids, Acompanhamentos), bebidas, fardamentos, extras/logística e observações
- **PDF da cozinha** — layout A4 para a produção trabalhar, sem valores financeiros
- Dados de exemplo da operação da casa, salvos neste aparelho (localStorage)

A ficha foi modelada como a ordem de serviço que a casa já usa no dia a dia e como base dos próximos módulos:

| Bloco da ficha | Módulo futuro |
| --- | --- |
| Cardápio, restrições e observações | Separação de Insumos, Fichas Técnicas, Estoque, Perdas |
| Equipe por função | Administrativo e Pagamento de Mão de Obra |
| Entrega de material, cavalete, estrutura do local | Logística |
| Per capita | Comercial e Contas a Receber |
| Fardamentos | Administrativo |

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
