export const AUDIT_ACTIONS = ["criar", "editar", "excluir"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  criar: "Criado",
  editar: "Editado",
  excluir: "Excluído",
};

export interface AuditEntry {
  id: string;
  at: string;
  userId: string;
  userName: string;
  module: string;
  entity: string;
  action: AuditAction;
  summary: string;
}

export interface AuditoriaData {
  entries: AuditEntry[];
}

export function emptyAuditoria(): AuditoriaData {
  return { entries: [] };
}
