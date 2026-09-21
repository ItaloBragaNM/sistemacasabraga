import { uid } from "@/lib/event-factory";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  UNIFORM_SIZE_LABELS,
  VENUE_KIND_LABELS,
  YES_NO_LABELS,
} from "@/lib/labels";
import {
  ALCOHOL_TYPES,
  DRINK_ITEMS,
  extraStaffLabel,
  eventMenuSections,
  normalizeExtraStaff,
  STAFF_ROLES,
  UNIFORM_PIECES,
  UNIFORM_SIZES,
  type EventAttachment,
  type EventChangeLogEntry,
  type EventFieldChange,
  type EventRecord,
  type EventSaveMeta,
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
  for (const section of eventMenuSections(event)) {
    const heading = section.time ? `${section.title} ${section.time}` : section.title;
    for (const item of section.items) {
      const name = item.name.trim();
      if (!name) continue;
      const qty = item.quantity.trim();
      names.push(`${heading}: ${qty ? `${name} (${qty})` : name}`);
    }
  }
  return names.join(", ");
}

function attachmentLine(files: EventAttachment[] | undefined) {
  return (files ?? []).map((file) => file.name).join(", ");
}

function alcoholTypesLine(keys: string[] | undefined) {
  const selected = new Set(keys ?? []);
  return ALCOHOL_TYPES.filter((item) => selected.has(item.key))
    .map((item) => item.label)
    .join(", ");
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
  push(changes, "Ilhas", String(previous.islands || 0), String(next.islands || 0));
  push(changes, "Chegada da equipe", previous.teamArrival, next.teamArrival);
  push(changes, "Horário do convite", previous.invitationTime, next.invitationTime);
  push(changes, "Horário da cerimônia", previous.ceremonyTime ?? "", next.ceremonyTime ?? "");
  push(changes, "Horário do serviço", previous.serviceTime, next.serviceTime);
  push(changes, "Duração do serviço", previous.serviceDuration ?? "", next.serviceDuration ?? "");
  push(changes, "Restrições alimentares", previous.dietaryNotes, next.dietaryNotes);
  push(changes, "Observações — cardápio e montagem", previous.menuSetupNotes, next.menuSetupNotes);
  push(changes, "Gerenciais e Evento", previous.managementNotes ?? "", next.managementNotes ?? "");
  push(changes, "Anexos", attachmentLine(previous.attachments), attachmentLine(next.attachments));
  push(changes, "Observações — bebidas", previous.drinksNotes ?? "", next.drinksNotes ?? "");
  push(changes, "Observações — logística", previous.logisticsNotes ?? "", next.logisticsNotes ?? "");
  push(changes, "Fora da cidade", previous.outOfTown ? "Sim" : "Não", next.outOfTown ? "Sim" : "Não");
  push(
    changes,
    "Veículos",
    String((previous.vehicleIds ?? []).length),
    String((next.vehicleIds ?? []).length),
  );
  push(
    changes,
    "Equipe externa",
    String((previous.laborAllocations ?? []).length),
    String((next.laborAllocations ?? []).length),
  );

  push(changes, "Adultos", String(previous.guests?.adults || 0), String(next.guests?.adults || 0));
  push(
    changes,
    "Crianças 0–5",
    String(previous.guests?.children0to5 || 0),
    String(next.guests?.children0to5 || 0),
  );
  push(
    changes,
    "Crianças 5–10",
    String(previous.guests?.children5to10 || previous.guests?.children || 0),
    String(next.guests?.children5to10 || next.guests?.children || 0),
  );
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

  const prevExtra = new Map(
    normalizeExtraStaff(previous.extraStaff).map((line) => [line.key, line.quantity]),
  );
  const nextExtra = new Map(
    normalizeExtraStaff(next.extraStaff).map((line) => [line.key, line.quantity]),
  );
  for (const key of new Set([...prevExtra.keys(), ...nextExtra.keys()])) {
    push(
      changes,
      extraStaffLabel(key),
      String(prevExtra.get(key) || 0),
      String(nextExtra.get(key) || 0),
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
  push(changes, "Bebidas alcoólicas", yesNo(prevLog?.alcoholServed), yesNo(nextLog?.alcoholServed));
  push(changes, "Tipos de bebidas alcoólicas", alcoholTypesLine(prevLog?.alcoholTypes), alcoholTypesLine(nextLog?.alcoholTypes));
  push(changes, "Álcool (detalhe)", prevLog?.alcohol ?? "", nextLog?.alcohol ?? "");
  push(changes, "Material dia anterior", yesNo(prevLog?.materialPreviousDay), yesNo(nextLog?.materialPreviousDay));
  push(changes, "Mesa cavalete", yesNo(prevLog?.trestleTable), yesNo(nextLog?.trestleTable));
  push(changes, "Recolher material ao final", yesNo(prevLog?.mustCollectMaterial), yesNo(nextLog?.mustCollectMaterial));
  push(changes, "Conservação extra", yesNo(prevLog?.extraConservation), yesNo(nextLog?.extraConservation));
  push(changes, "Conservação extra (quantidade)", prevLog?.extraConservationQty ?? "", nextLog?.extraConservationQty ?? "");
  push(changes, "Gelo cubo", yesNo(prevLog?.iceCubes), yesNo(nextLog?.iceCubes));
  push(changes, "Gelo cubo (quantidade)", prevLog?.iceCubesQty ?? "", nextLog?.iceCubesQty ?? "");
  push(changes, "Local com cozinha", yesNo(prevLog?.hasKitchen), yesNo(nextLog?.hasKitchen));
  push(changes, "Local com pia", yesNo(prevLog?.hasSink), yesNo(nextLog?.hasSink));
  push(changes, "Local com geladeira", yesNo(prevLog?.hasFridge), yesNo(nextLog?.hasFridge));
  push(changes, "Local com fogão", yesNo(prevLog?.hasStove), yesNo(nextLog?.hasStove));
  push(changes, "Local com freezer", yesNo(prevLog?.hasFreezer), yesNo(nextLog?.hasFreezer));
  push(changes, "Local com forno", yesNo(prevLog?.hasOven), yesNo(nextLog?.hasOven));
  push(changes, "Local com micro-ondas", yesNo(prevLog?.hasMicrowave), yesNo(nextLog?.hasMicrowave));

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
  meta?: EventSaveMeta,
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
  const reason = meta?.reason?.trim() || undefined;
  const clientLabel = meta?.clientLabel?.trim() || undefined;
  const canCoalesce =
    last &&
    sameUser &&
    recent &&
    last.changes[0]?.label !== "Ficha" &&
    !last.reason &&
    !reason;

  if (canCoalesce) {
    const merged = mergeChanges(last.changes, changes);
    if (merged.length === 0) return { ...next, changeLog: log.slice(0, -1) };
    log[log.length - 1] = { ...last, at, changes: merged };
  } else {
    log.push({ id: uid(), at, userId, userName, changes, reason, clientLabel });
  }

  return { ...next, changeLog: log.slice(-MAX_ENTRIES) };
}
