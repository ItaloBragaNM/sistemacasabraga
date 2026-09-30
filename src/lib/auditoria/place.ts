import { APP_MODULES } from "@/lib/modules";

/** Página em que a alteração aconteceu. Usado nos registros novos e como rótulo dos antigos. */
export const AUDIT_PLACE_BY_ENTITY: Record<string, string> = {
  prato: "Cadastros · Cardápio",
  material: "Cadastros · Materiais",
  insumo: "Cadastros · Insumos",
  cliente: "Cadastros · Clientes",
  local: "Cadastros · Locais",
  veículo: "Cadastros · Veículos",
  kit: "Cadastros · Kits de Materiais",
  extra: "Cadastros · Kits de Materiais",
  prestador: "Cadastros · Equipe Externa",
  "tabela de valores": "Cadastros · Equipe Externa",
  "local de estoque": "Configurações · Módulo de Cadastros",
  "base de cálculo": "Configurações · Módulo de Cadastros",
  "categorias do cardápio": "Configurações · Módulo de Cadastros",
  "categorias de materiais": "Configurações · Módulo de Cadastros",
  "categorias de insumos": "Configurações · Módulo de Cadastros",
  "premissas de bebidas": "Configurações · Módulo de Cadastros",
  evento: "Eventos · Relatório do Evento",
  compromisso: "Eventos · Calendário Geral de Compromissos",
  "movimento de estoque": "Logística · Estoque de Materiais",
  inventário: "Logística · Inventário de Materiais",
  "controle de materiais": "Logística · Controle de Materiais em Eventos",
  "movimento de insumo": "Cozinha · Movimentações no Estoque",
  "inventário de insumo": "Cozinha · Inventário de Insumos",
  perda: "Cozinha · Registro de Desperdícios",
  "ficha técnica": "Cozinha · Fichas Técnicas",
  usuário: "Configurações · Cadastro de Usuários",
  CRM: "Comercial · Dashboard Comercial",
  pagamento: "Financeiro · Pagamento de Mão de Obra",
  "uso de veículo": "Veículos · Agenda de Uso dos Veículos",
};

export function auditPlace(entry: { page?: string; entity: string; module: string }) {
  if (entry.page?.trim()) return entry.page.trim();
  const known = AUDIT_PLACE_BY_ENTITY[entry.entity];
  if (known) return known;
  const moduleLabel = APP_MODULES.find((item) => item.id === entry.module)?.label;
  if (moduleLabel && entry.entity) return `${moduleLabel} · ${entry.entity}`;
  return moduleLabel || entry.entity || "Sistema";
}

export function auditRecordTitle(entry: { entity: string; summary: string }) {
  const prefixes = [`Criou ${entry.entity} `, `Editou ${entry.entity} `, `Excluiu ${entry.entity} `];
  for (const prefix of prefixes) {
    if (entry.summary.startsWith(prefix)) return entry.summary.slice(prefix.length).trim();
  }
  return entry.summary;
}
