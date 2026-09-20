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
| Per capita | Comercial |
| Fardamentos | Administrativo |

A ficha alimenta os módulos de Comercial (dashboard) e Cadastros/Logística
(separação de materiais). Persistência compartilhada via Supabase e deploy de
desenvolvimento na Vercel — veja as seções abaixo.

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:43127](http://localhost:43127).

## Dados e persistência

- **Eventos**: salvos no navegador (localStorage), por aparelho.
- **Dados compartilhados** (dashboard comercial, cadastros e logística): gravados
  pelo backend (Route Handlers) na tabela `app_state` do **único** projeto
  Supabase deste app — o mesmo da Vercel ([sistemacasabraga.vercel.app](https://sistemacasabraga.vercel.app)).
- Sem `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`, o dev local
  cai para arquivos JSON em `.data/` (ignorado pelo git). Esse fallback **não**
  é o banco da casa.

Este repositório **não** usa o ERP da Firma (projeto Supabase `eaemkujpydxckwsdqltz`,
repo `sistemagfirma`). São produtos diferentes. Cursor neste workspace deve usar
o MCP `supabase-casabraga` em [`.cursor/mcp.json`](.cursor/mcp.json), não o MCP
global apontado para o ERP.

## Supabase (este app)

O banco canônico já está no ar (Vercel → Settings → Environment Variables).
Local e Cursor precisam das **mesmas** duas variáveis — não crie outro projeto.

1. Em [Vercel / casa-braga / sistemacasabraga](https://vercel.com/casa-braga/sistemacasabraga)
   copie `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
2. Cole no `.env.local` (veja [`.env.example`](.env.example)). O arquivo é
   gitignored; a `service_role` vale **somente no servidor**.
3. Schema: [`supabase/schema.sql`](supabase/schema.sql) (`public.app_state` + RLS,
   sem policies públicas). Só rode esse SQL nesse projeto, nunca no ERP da Firma.
4. Reinicie `npm run dev`. Dashboard e cadastros passam a ler/gravar o mesmo
   banco da produção. Confira: o CRM local deve ter os mesmos `rowCount` /
   `uploadedAt` que `https://sistemacasabraga.vercel.app/api/comercial/dashboard`.

O `project_ref` do MCP é o subdomínio de `SUPABASE_URL`
(`https://xxxxx.supabase.co` → `xxxxx`). Depois do primeiro login no MCP, fixe
`?project_ref=xxxxx` na URL em `.cursor/mcp.json`.

## Deploy no Vercel

O repositório [ItaloBragaNM/sistemacasabraga](https://github.com/ItaloBragaNM/sistemacasabraga)
já está ligado ao projeto Vercel `casa-braga/sistemacasabraga`. Push em `main`
publica em [sistemacasabraga.vercel.app](https://sistemacasabraga.vercel.app).

Production e Preview devem ter o mesmo par `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY`. Sem essas variáveis o filesystem da Vercel é
efêmero e os dados compartilhados não persistem.

## Tipografia

A interface usa **Inter** (sans-serif neutra), com escala de 13–18px e o título da página a 22px. A hierarquia vem de peso e contraste, não de fontes display.

## Próximo passo

Com o Supabase e o deploy de desenvolvimento no ar, seguimos pelos módulos
restantes (Insumos, Clientes, Veículos e os kits de transporte da logística).
