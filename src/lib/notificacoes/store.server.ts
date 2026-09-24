import { addDays, format, parseISO } from "date-fns";
import { uid } from "@/lib/event-factory";
import { readState, writeState } from "@/lib/store/kv.server";
import type { EventRecord } from "@/lib/types";
import {
  emptyNotificacoes,
  type AppNotification,
  type NotificationAction,
  type NotificacoesData,
} from "./types";

const KEY = "notificacoes";
const FILE = "notificacoes.json";
const MAX_ITEMS = 200;
const WINDOW_DAYS = 7;

type Actor = { id: string; name: string; username: string } | null;

function todayInFortaleza() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function isEventInNextDays(date: string, days = WINDOW_DAYS) {
  const day = (date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const today = todayInFortaleza();
  const end = format(addDays(parseISO(today), days - 1), "yyyy-MM-dd");
  return day >= today && day <= end;
}

function normalizeItem(input: Partial<AppNotification> | null | undefined): AppNotification | null {
  if (!input?.id || !input.createdAt || !input.eventId) return null;
  const action: NotificationAction =
    input.action === "criar" || input.action === "excluir" || input.action === "editar"
      ? input.action
      : "editar";
  return {
    id: input.id,
    createdAt: input.createdAt,
    eventId: input.eventId,
    eventCode: typeof input.eventCode === "string" ? input.eventCode : "",
    eventTitle: typeof input.eventTitle === "string" ? input.eventTitle : "",
    eventDate: typeof input.eventDate === "string" ? input.eventDate : "",
    summary: typeof input.summary === "string" ? input.summary : "",
    actorId: typeof input.actorId === "string" ? input.actorId : "",
    actorName: typeof input.actorName === "string" ? input.actorName : "Sistema",
    action,
    readBy: Array.isArray(input.readBy)
      ? [...new Set(input.readBy.filter((id): id is string => typeof id === "string" && Boolean(id)))]
      : [],
  };
}

function normalize(input: Partial<NotificacoesData> | null): NotificacoesData {
  if (!input || !Array.isArray(input.items)) return emptyNotificacoes();
  return {
    items: input.items.map(normalizeItem).filter((item): item is AppNotification => Boolean(item)),
  };
}

export async function readNotificacoes(): Promise<NotificacoesData> {
  return normalize(await readState<Partial<NotificacoesData>>(KEY, FILE));
}

async function writeNotificacoes(data: NotificacoesData) {
  const normalized = normalize(data);
  await writeState(KEY, FILE, normalized);
  return normalized;
}

function snapshot(event: EventRecord) {
  const { changeLog: _changeLog, updatedAt: _updatedAt, ...rest } = event;
  return JSON.stringify(rest);
}

function inWindow(event: Pick<EventRecord, "date">) {
  return isEventInNextDays(event.date);
}

function draft(
  action: NotificationAction,
  event: EventRecord,
  actor: Actor,
): AppNotification {
  const actorName = actor?.name?.trim() || actor?.username?.trim() || "Sistema";
  const title = event.title?.trim() || "Evento sem nome";
  const verb = action === "criar" ? "criou" : action === "excluir" ? "excluiu" : "atualizou";
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    eventId: event.id,
    eventCode: event.code,
    eventTitle: title,
    eventDate: event.date,
    summary: `${actorName} ${verb} a ficha ${event.code} · ${title}`,
    actorId: actor?.id ?? "",
    actorName,
    action,
    readBy: [],
  };
}

export async function notifyFichaUpdates(
  previous: EventRecord[],
  next: EventRecord[],
  actor: Actor,
): Promise<void> {
  const prevMap = new Map(previous.map((event) => [event.id, event]));
  const nextMap = new Map(next.map((event) => [event.id, event]));
  const incoming: AppNotification[] = [];

  for (const event of next) {
    const before = prevMap.get(event.id);
    if (!before) {
      if (inWindow(event)) incoming.push(draft("criar", event, actor));
      continue;
    }
    if (snapshot(before) === snapshot(event)) continue;
    if (inWindow(before) || inWindow(event)) incoming.push(draft("editar", event, actor));
  }

  for (const event of previous) {
    if (nextMap.has(event.id)) continue;
    if (inWindow(event)) incoming.push(draft("excluir", event, actor));
  }

  if (incoming.length === 0) return;
  const current = await readNotificacoes();
  await writeNotificacoes({ items: [...incoming, ...current.items].slice(0, MAX_ITEMS) });
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  if (!userId) return readNotificacoes();
  const current = await readNotificacoes();
  const wanted = ids?.length ? new Set(ids) : null;
  return writeNotificacoes({
    items: current.items.map((item) => {
      if (wanted && !wanted.has(item.id)) return item;
      if (item.readBy.includes(userId)) return item;
      return { ...item, readBy: [...item.readBy, userId] };
    }),
  });
}
