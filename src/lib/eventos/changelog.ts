import { uid } from "@/lib/event-factory";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  UNIFORM_SIZE_LABELS,
  VENUE_KIND_LABELS,
  YES_NO_LABELS,
} from "@/lib/labels";
import {
  DRINK_ITEMS,
  MENU_SECTIONS,
  STAFF_ROLES,
  UNIFORM_PIECES,
  UNIFORM_SIZES,
  type EventChangeLogEntry,
  type EventFieldChange,
  type EventRecord,
  type YesNo,
} from "@/lib/types";

const EMPTY = "(vazio)";
const MAX_ENTRIES = 200;
const COALESCE_MS = 90_000;

export type ChangeActor = {
  id: string;
  name: string;
  username: string;
};

function display(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : EMPTY;
}

function clip(value: string, max = 90) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function push(changes: EventFieldChange[], label: string, from: string, to: string) {
  if (from === to) return;
  changes.push({ label, from: clip(display(from)), to: clip(display(to)) });
}

function formatDate(value: string) {
  const day = (value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return value;
  const [year, month, date] = day.split("-");
  return `${date}/${month}/${year}`;
}

function yesNo(value: YesNo | string | undefined) {
  if (value === "sim" || value === "nao") return YES_NO_LABELS[value];
  return value ?? "";
}

function menuLine(event: EventRecord) {
  const names: string[] = [];
  for (const section of MENU_SECTIONS) {
    for (const item of event.menu[section.key] ?? []) {
      const name = item.name.trim();
      if (!name) continue;
      const qty = item.quantity.trim();
      names.push(qty ? `${name} (${qty})` : name);
    }
  }
  return names.join(", ");
}

export function diffEvent(previous: EventRecord, next: EventRecord): EventFieldChange[] {
  const changes: EventFieldChange[] = [];
  push(changes, "Nome", previous.title, next.title);
  push(changes, "Código", previous.code, next.code);
  push(
    changes,
    "Tipo",
    EVENT_TYPE_LABELS[previous.type] ?? previous.type,
    EVENT_TYPE_LABELS[next.type] ?? next.type,
  );
  push(
    changes,
    "Status",
    EVENT_STATUS_LABELS[previous.status] ?? previous.status,
    EVENT_STATUS_LABELS[next.status] ?? next.status,
  );
  push(changes, "Cliente", previous.clientId ?? "", next.clientId ?? "");
  push(changes, "Data do evento", formatDate(previous.date), formatDate(next.date));
  push(
    changes,
    "Entrega de material",
    formatDate(previous.materialDeliveryDate),
    formatDate(next.materialDeliveryDate),
  );
  push(
    changes,
    "Recolhimento de material",
    formatDate(previous.materialPickupDate),
    formatDate(next.materialPickupDate),
  );
  push(
    changes,
    "Entrega de comida",
    formatDate(previous.foodDeliveryDate),
    formatDate(next.foodDeliveryDate),
  );
  push(changes, "Per capita", String(previous.perCapita || 0), String(next.perCapita || 0));
  push(changes, "Ilhas", String(previous.islands || 0), String(next.islands || 0));
  push(changes, "Chegada da equipe", previous.teamArrival, next.teamArrival);
  push(changes, "Horário do convite", previous.invitationTime, next.invitationTime);
  push(changes, "Horário do serviço", previous.serviceTime, next.serviceTime);
  push(changes, "Restrições alimentares", previous.dietaryNotes, next.dietaryNotes);
  push(changes, "Obs. cardápio e montagem", previous.menuSetupNotes, next.menuSetupNotes);

  push(changes, "Adultos", String(previous.guests?.adults || 0), String(next.guests?.adults || 0));
  push(changes, "Crianças", String(previous.guests?.children || 0), String(next.guests?.children || 0));
  push(
    changes,
    "Profissionais",
    String(previous.guests?.professionals || 0),
    String(next.guests?.professionals || 0),
  );

  const prevKind = previous.venue?.kind;
  const nextKind = next.venue?.kind;
  push(
    changes,
    "Tipo de local",
    prevKind ? VENUE_KIND_LABELS[prevKind] ?? prevKind : "",
    nextKind ? VENUE_KIND_LABELS[nextKind] ?? nextKind : "",
  );
  push(changes, "Nome do local", previous.venue?.name ?? "", next.venue?.name ?? "");
  push(changes, "Endereço", previous.venue?.address ?? "", next.venue?.address ?? "");

  for (const role of STAFF_ROLES) {
    push(
      changes,
      role.label,
      String(previous.staff?.[role.key] || 0),
      String(next.staff?.[role.key] || 0),
    );
  }

  push(changes, "Cardápio", menuLine(previous), menuLine(next));
  push(
    changes,
    "Pratos do catálogo",
    String((previous.selectedDishIds ?? []).length),
    String((next.selectedDishIds ?? []).length),
  );

  for (const drink of DRINK_ITEMS) {
    push(changes, drink.label, previous.drinks?.[drink.key] ?? "", next.drinks?.[drink.key] ?? "");
  }

  for (const piece of UNIFORM_PIECES) {
    for (const size of UNIFORM_SIZES) {
      push(
        changes,
        `${piece.label} ${UNIFORM_SIZE_LABELS[size]}`,
        String(previous.uniforms?.[piece.key]?.[size] || 0),
        String(next.uniforms?.[piece.key]?.[size] || 0),
      );
    }
  }

  const prevLog = previous.logistics;
  const nextLog = next.logistics;
  push(changes, "Álcool", prevLog?.alcohol ?? "", nextLog?.alcohol ?? "");
  push(changes, "Material dia anterior", yesNo(prevLog?.materialPreviousDay), yesNo(nextLog?.materialPreviousDay));
  push(changes, "Mesa cavalete", yesNo(prevLog?.trestleTable), yesNo(nextLog?.trestleTable));
  push(changes, "Menu volante", yesNo(prevLog?.flyingMenu), yesNo(nextLog?.flyingMenu));
  push(changes, "Local com cozinha", yesNo(prevLog?.hasKitchen), yesNo(nextLog?.hasKitchen));
  push(changes, "Local com freezer", yesNo(prevLog?.hasFreezer), yesNo(nextLog?.hasFreezer));
  push(changes, "Local com forno", yesNo(prevLog?.hasOven), yesNo(nextLog?.hasOven));
  push(changes, "Local com microondas", yesNo(prevLog?.hasMicrowave), yesNo(nextLog?.hasMicrowave));

  const prevSep = JSON.stringify(previous.materialSeparation ?? {});
  const nextSep = JSON.stringify(next.materialSeparation ?? {});
  if (prevSep !== nextSep) {
    changes.push({
      label: "Separação de materiais",
      from: EMPTY,
      to: "lista atualizada",
    });
  }

  return changes;
}

function mergeChanges(current: EventFieldChange[], incoming: EventFieldChange[]): EventFieldChange[] {
  const next = [...current];
  for (const change of incoming) {
    const index = next.findIndex((item) => item.label === change.label);
    if (index >= 0) next[index] = { ...next[index], to: change.to };
    else next.push(change);
  }
  return next.filter((item) => item.from !== item.to);
}

function actorName(actor: ChangeActor | null | undefined) {
  const name = actor?.name?.trim() || actor?.username?.trim();
  return name || "Alguém";
}

export function withChangeLog(
  previous: EventRecord | null,
  next: EventRecord,
  actor: ChangeActor | null | undefined,
): EventRecord {
  if (!previous) {
    const createdAt = next.createdAt || new Date().toISOString();
    const created: EventChangeLogEntry = {
      id: uid(),
      at: createdAt,
      userId: actor?.id ?? "",
      userName: actorName(actor),
      changes: [{ label: "Ficha", from: EMPTY, to: "criada" }],
    };
    return { ...next, changeLog: [created] };
  }

  const changes = diffEvent(previous, next);
  if (changes.length === 0) {
    return { ...next, changeLog: previous.changeLog ?? [] };
  }

  const at = new Date().toISOString();
  const userId = actor?.id ?? "";
  const userName = actorName(actor);
  const log = [...(previous.changeLog ?? [])];
  const last = log[log.length - 1];
  const sameUser = last && (userId ? last.userId === userId : last.userName === userName);
  const recent = last && Math.abs(Date.parse(at) - Date.parse(last.at)) <= COALESCE_MS;

  if (last && sameUser && recent && last.changes[0]?.label !== "Ficha") {
    const merged = mergeChanges(last.changes, changes);
    if (merged.length === 0) return { ...next, changeLog: log.slice(0, -1) };
    log[log.length - 1] = { ...last, at, changes: merged };
  } else {
    log.push({ id: uid(), at, userId, userName, changes });
  }

  return { ...next, changeLog: log.slice(-MAX_ENTRIES) };
}
