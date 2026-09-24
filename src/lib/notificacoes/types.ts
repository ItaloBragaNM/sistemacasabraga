export type NotificationAction = "criar" | "editar" | "excluir";

export interface AppNotification {
  id: string;
  createdAt: string;
  eventId: string;
  eventCode: string;
  eventTitle: string;
  eventDate: string;
  summary: string;
  actorId: string;
  actorName: string;
  action: NotificationAction;
  readBy: string[];
}

export interface NotificacoesData {
  items: AppNotification[];
}

export function emptyNotificacoes(): NotificacoesData {
  return { items: [] };
}
