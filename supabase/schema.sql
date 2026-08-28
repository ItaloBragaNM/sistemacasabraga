-- Casa Braga — esquema base do Supabase (versão de desenvolvimento)
--
-- Aplicar SOMENTE no projeto Supabase deste app (o mesmo da Vercel /
-- sistemacasabraga.vercel.app). NÃO rodar no ERP da Firma
-- (eaemkujpydxckwsdqltz): aquele banco é outro produto.
--
-- Como aplicar:
--   Supabase Dashboard → SQL Editor → cole este conteúdo → Run.
--
-- Guarda os dados compartilhados da casa (dashboard comercial e cadastros) em
-- uma tabela chave/valor. O acesso acontece somente pelo backend (Route
-- Handlers) usando a service role key, então mantemos RLS habilitado e sem
-- policies públicas: nenhum cliente anônimo lê/escreve direto.

create table if not exists public.app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Nenhuma policy pública é criada de propósito: a service role key (usada no
-- servidor) ignora o RLS. Quando adicionarmos autenticação, criamos policies
-- específicas aqui.
