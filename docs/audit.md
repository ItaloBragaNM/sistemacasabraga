# Auditoria — Casa Braga

## Dados fixos (permanecem de propósito)

- `src/lib/seed.ts` + `src/lib/store.ts`: catálogo de demonstração e migração de `localStorage` (eventos antigos deste aparelho). Não entra em produção se o servidor já tiver `app_state`.
- `src/lib/cadastros/defaults.ts`: categorias, bases de cálculo e catálogo inicial de materiais/pratos/insumos quando o cadastro ainda está vazio.
- `src/lib/store/kv.server.ts`: fallback em `.data/` só no desenvolvimento. Na Vercel exige `SUPABASE_URL` + chave de serviço do projeto Casa Braga (`app_state`). Nunca apontar para o ERP da Firma (`eaemkujpydxckwsdqltz`).

## Sem PDF financeiro

Contas a receber e pagamento de mão de obra não têm documento impresso. Relatórios saem na tela.

## Validações

- `QtyInput` bloqueia valor abaixo do mínimo (0).
- Providers mostram toast em falha de rede e não apagam o rascunho.
- Telas usam `LoadingBlock` / `EmptyBlock`.
- Sem navegador interno nesta sessão: a grade 390/768/1280 ficou no CSS (`PageShell`, colunas empilhadas, tabelas com `overflow-x-auto`). Confira no celular após o deploy.

## Conferência de ambiente

- Local e MCP Casa Braga: `https://vmfspbydxvjpwemuoqpw.supabase.co`, tabela `app_state` (11 linhas).
- Vercel (`sistemacasabraga`) tem `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` em Production/Preview/Development. O valor da URL não é visível no CLI; o projeto local já aponta para Casa Braga, não para `eaemkujpydxckwsdqltz`.
