/** Relógio `HH:mm`. Devolve string vazia se o valor não for um horário válido. */
export function normalizeClockTime(value: unknown): string {
  if (typeof value !== "string") return "";
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) {
    return "";
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function subtractHoursFromClock(time: string, hours: number): string {
  const clock = normalizeClockTime(time);
  if (!clock) return "";
  const [hour, minute] = clock.split(":").map(Number);
  const total = ((hour * 60 + minute - hours * 60) % (24 * 60) + 24 * 60) % (24 * 60);
  const nextHour = Math.floor(total / 60);
  const nextMinute = total % 60;
  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
}

/** Padrão do horário de saída da comida: duas horas antes do serviço. */
export function defaultFoodDepartureTime(serviceTime: string): string {
  return subtractHoursFromClock(serviceTime, 2);
}

/** Recalcula o padrão só se o campo ainda estiver vazio ou no valor automático anterior. */
export function syncedFoodDepartureTime(
  previousServiceTime: string,
  nextServiceTime: string,
  currentFoodDeparture: string,
): string {
  const previousDefault = defaultFoodDepartureTime(previousServiceTime);
  const nextDefault = defaultFoodDepartureTime(nextServiceTime);
  const current = normalizeClockTime(currentFoodDeparture);
  if (!current || current === previousDefault) return nextDefault;
  return current;
}
