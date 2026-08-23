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
    ready: false,
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
    id: "veiculos",
    label: "Veículos",
    ready: false,
    pages: [
      { href: "/veiculos/uso", label: "Controle de Uso dos Veículos" },
      { href: "/veiculos/multas", label: "Controle de Multas" },
    ],
  },
];

export function findPageLabel(pathname: string) {
  for (const group of APP_MODULES) {
    const page = group.pages.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    if (page) return { module: group, page };
  }
  return null;
}
