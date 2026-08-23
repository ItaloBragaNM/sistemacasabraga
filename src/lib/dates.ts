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

export { isSameDay, isSameMonth };
