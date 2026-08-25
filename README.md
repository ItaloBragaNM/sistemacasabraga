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
- **Dados compartilhados** (dashboard comercial e cadastros de cardápio/materiais):
  gravados pelo backend (Route Handlers). Em desenvolvimento local, sem Supabase
  configurado, ficam em arquivos JSON dentro de `.data/` (ignorado pelo git).
  Com o Supabase configurado, ficam na tabela `app_state` e valem para todos.

## Supabase (dev)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **SQL Editor**, rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. Em **Project Settings → API**, copie a **Project URL** e a **service_role key**.
4. Crie um `.env.local` (veja `.env.example`) com:

   ```bash
   SUPABASE_URL=https://SEU-PROJETO.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
   ```

5. Reinicie `npm run dev`. A partir daí, dashboard e cadastros passam a ler/gravar
   no Supabase. A `service_role key` é usada **somente no servidor** — nunca no cliente.

## Deploy no Vercel (versão de desenvolvimento)

1. Importe o repositório no [Vercel](https://vercel.com) (framework detectado: Next.js).
2. Em **Settings → Environment Variables**, adicione `SUPABASE_URL` e
   `SUPABASE_SERVICE_ROLE_KEY` (mesmos valores do Supabase).
3. A cada push, o Vercel gera um **Preview Deployment** (a URL de desenvolvimento).

> No Vercel o sistema de arquivos é efêmero: o Supabase é **obrigatório** para os
> dados compartilhados persistirem. Sem ele, dashboard e cadastros não salvam.

## Tipografia

A casa pediu Hatton Semi-Bold, TT Barrels Bold, Open Sauce e Montserrat. Hatton e TT Barrels são fontes comerciais; nesta fase usamos equivalentes abertos:

- Títulos e nomes: Cormorant Garamond ( Semi-Bold ), no lugar de Hatton
- Subtítulos de seção em caixa alta: Oswald Bold, no lugar de TT Barrels
- Textos e labels: Open Sauce One (Light/Bold)
- Listas: Montserrat

Quando as fontes originais estiverem licenciadas, basta trocar os arquivos em `src/fonts` e o `layout`.

## Próximo passo

Com o Supabase e o deploy de desenvolvimento no ar, seguimos pelos módulos
restantes (Insumos, Clientes, Veículos e os kits de transporte da logística).
