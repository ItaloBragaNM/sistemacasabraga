import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { WEEKDAY_LABELS } from "./labels";

export function parseDate(value: string) {
  return parseISO(value);
}

export function formatLongDate(value: string) {
  return format(parseISO(value), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatShortDate(value: string) {
  return format(parseISO(value), "dd/MM/yyyy");
}

export function formatDateTime(value: string) {
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatWeekday(value: string) {
  return WEEKDAY_LABELS[parseISO(value).getDay()];
}

export function formatMonthTitle(date: Date) {
  return format(date, "MMMM yyyy", { locale: ptBR });
}

export function formatDayHeading(date: Date) {
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

export function monthGrid(date: Date) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

export function weekDays(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** Semana começando na segunda (visão operacional). */
export function weekDaysMonday(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function toIsoDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function formatWeekRange(start: Date, end: Date) {
  return `${format(start, "d MMM", { locale: ptBR })} – ${format(end, "d MMM yyyy", { locale: ptBR })}`;
}

/** Dias YYYY-MM-DD inclusive, sem deslocar fuso. */
export function isoDaysInRange(start: string, end: string): string[] {
  const from = start.slice(0, 10);
  let to = (end || start).slice(0, 10);
  if (!from) return [];
  if (to < from) to = from;
  const days: string[] = [];
  let current = from;
  while (current <= to) {
    days.push(current);
    const [year, month, day] = current.split("-").map(Number);
    current = toIsoDate(new Date(year, month - 1, day + 1));
  }
  return days;
}

export { isSameDay, isSameMonth };
