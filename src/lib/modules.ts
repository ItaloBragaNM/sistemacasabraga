import { canAccessModule } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/auth/types";

export type AppModule = {
  id: string;
  label: string;
  ready: boolean;
  pages: { href: string; label: string }[];
};

export const APP_MODULES: AppModule[] = [
  {
    id: "eventos",
    label: "Eventos",
    ready: true,
    pages: [
      { href: "/eventos", label: "Calendário de Eventos" },
      { href: "/eventos/fichas", label: "Ficha do Evento" },
    ],
  },
  {
    id: "comercial",
    label: "Comercial",
    ready: true,
    pages: [
      { href: "/comercial/dashboard", label: "Dashboard Comercial" },
      { href: "/comercial/orcamentos", label: "Orçamentos" },
    ],
  },
  {
    id: "cozinha",
    label: "Cozinha",
    ready: false,
    pages: [
      { href: "/cozinha/separacao-insumos", label: "Separação de Insumos" },
      { href: "/cozinha/fichas-tecnicas", label: "Fichas Técnicas" },
      { href: "/cozinha/estoque-insumos", label: "Estoque de Insumos" },
      { href: "/cozinha/controle-perdas", label: "Controle de Perdas" },
    ],
  },
  {
    id: "logistica",
    label: "Logística",
    ready: false,
    pages: [
      { href: "/logistica/separacao-materiais", label: "Separação de Materiais" },
      { href: "/logistica/estoque-materiais", label: "Estoque de Materiais" },
      {
        href: "/logistica/alocacao-materiais",
        label: "Controle de Alocação de Materiais",
      },
      { href: "/logistica/inventario-materiais", label: "Inventário de Materiais" },
      { href: "/logistica/planejamento-compras", label: "Planejamento de Compras" },
    ],
  },
  {
    id: "veiculos",
    label: "Veículos",
    ready: false,
    pages: [
      { href: "/veiculos/uso", label: "Controle de Uso dos Veículos" },
      { href: "/veiculos/multas", label: "Controle de Multas" },
    ],
  },
  {
    id: "administrativo",
    label: "Administrativo",
    ready: false,
    pages: [
      {
        href: "/administrativo/mao-de-obra-externa",
        label: "Controle de Mão de Obra Externa",
      },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    ready: false,
    pages: [
      { href: "/financeiro/contas-a-receber", label: "Contas a Receber" },
      {
        href: "/financeiro/pagamento-mao-de-obra",
        label: "Pagamento de Mão de Obra Externa",
      },
    ],
  },
  {
    id: "cadastros",
    label: "Cadastros",
    ready: true,
    pages: [
      { href: "/cadastros/cardapio", label: "Cardápio" },
      { href: "/cadastros/materiais", label: "Materiais" },
      { href: "/cadastros/kits", label: "Kits de Materiais" },
      { href: "/cadastros/insumos", label: "Insumos" },
      { href: "/cadastros/clientes", label: "Clientes" },
      { href: "/cadastros/veiculos", label: "Veículos" },
    ],
  },
  {
    id: "configuracoes",
    label: "Configurações do Sistema",
    ready: true,
    pages: [
      {
        href: "/configuracoes/cadastros",
        label: "Configurações do Módulo de Cadastros",
      },
      {
        href: "/configuracoes/usuarios",
        label: "Cadastro de Usuários",
      },
    ],
  },
];

export function findPageLabel(pathname: string) {
  let best: { module: AppModule; page: AppModule["pages"][number]; length: number } | null = null;
  for (const group of APP_MODULES) {
    for (const page of group.pages) {
      const match = pathname === page.href || pathname.startsWith(`${page.href}/`);
      if (match && (!best || page.href.length > best.length)) {
        best = { module: group, page, length: page.href.length };
      }
    }
  }
  if (best) return { module: best.module, page: best.page };
  const segment = pathname.split("/").filter(Boolean)[0];
  const group = APP_MODULES.find((item) => item.id === segment);
  if (group) return { module: group, page: group.pages[0] };
  return null;
}

export function modulesVisibleTo(role: UserRole) {
  return APP_MODULES.filter((group) => canAccessModule(role, group.id));
}
