import ExcelJS from "exceljs";
import {
  CRM_EVENT_TYPES,
  EVENT_LOCATIONS,
  type CrmEventType,
  type EventLocation,
  type LeadOutcome,
  type LeadRecord,
  type LossReason,
} from "./types";

const HEADER_ALIASES: Record<string, string[]> = {
  id: ["ID"],
  title: ["Lead título", "Lead titulo"],
  stage: ["Etapa do lead"],
  value: ["Venda"],
  createdAt: ["Data Criada"],
  closedAt: ["Fechada em"],
  seller: ["Vendedor Responsável", "Vendedor Responsavel"],
  location: ["Local do Evento"],
  eventType: ["Tipo de Evento"],
  guests: ["Qnde Convidados", "Qtde Convidados"],
  origin: ["Origem"],
  eventDate: ["Data do Evento"],
};

type FieldKey = keyof typeof HEADER_ALIASES;

function normalizeHeader(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function buildHeaderIndex(headerRow: unknown[]): Record<FieldKey, number> {
  const lookup = new Map<string, number>();
  headerRow.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    if (key && !lookup.has(key)) lookup.set(key, index);
  });

  const result = {} as Record<FieldKey, number>;
  (Object.keys(HEADER_ALIASES) as FieldKey[]).forEach((field) => {
    let found = -1;
    for (const alias of HEADER_ALIASES[field]) {
      const index = lookup.get(alias.toLowerCase());
      if (index !== undefined) {
        found = index;
        break;
      }
    }
    result[field] = found;
  });
  return result;
}

function cellText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    const rich = value as { text?: string; result?: unknown };
    if (typeof rich.text === "string") return rich.text.trim() || null;
    if (rich.result !== undefined) return cellText(rich.result);
    return null;
  }
  const text = String(value).trim();
  return text.length ? text : null;
}

/** Parses "6050", 6050, "R$ 6.050,00" or "6.050" (BRL) into a number of reais. */
export function parseValue(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = cellText(value);
  if (!text) return 0;
  const cleaned = text.replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;
  // Brazilian format: "." is thousands separator, "," is decimal.
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pad(value: number, size = 2): string {
  return String(value).padStart(size, "0");
}

/**
 * Builds a timezone-naive wall-clock string ("YYYY-MM-DDTHH:mm:ss") so that
 * calendar bucketing (month/week) is stable regardless of the deploy timezone.
 */
function naiveIso(year: number, month: number, day: number, hh = 0, min = 0, ss = 0): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hh)}:${pad(min)}:${pad(ss)}`;
}

/** Parses "DD.MM.YYYY", "DD.MM.YYYY HH:MM" or "DD.MM.YYYY HH:MM:SS" into a naive ISO string. */
export function parseCrmDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return naiveIso(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
    );
  }
  const text = cellText(value);
  if (!text || text.toLowerCase() === "não fechado" || text.toLowerCase() === "nao fechado") {
    return null;
  }
  const match = text.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (!match) return null;
  const [, dd, mm, yyyyRaw, hh, min, ss] = match;
  const year = yyyyRaw.length === 2 ? 2000 + Number(yyyyRaw) : Number(yyyyRaw);
  const month = Number(mm);
  const day = Number(dd);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return naiveIso(year, month, day, hh ? Number(hh) : 0, min ? Number(min) : 0, ss ? Number(ss) : 0);
}

function classifyStage(stageRaw: string | null): {
  outcome: LeadOutcome;
  stage: string;
  lossReason: LossReason | null;
} {
  const stage = (stageRaw ?? "").trim();
  const lower = stage.toLowerCase();

  if (lower.startsWith("venda ganha")) {
    return { outcome: "won", stage: "Venda Ganha", lossReason: null };
  }
  if (lower.startsWith("venda perdida")) {
    return {
      outcome: "lost",
      stage: "Venda Perdida",
      lossReason: classifyLossReason(stage),
    };
  }
  return { outcome: "open", stage: stage || "Sem etapa", lossReason: null };
}

function classifyLossReason(stage: string): LossReason {
  const match = stage.match(/\(([^)]*)\)/);
  const reason = (match?.[1] ?? "").trim().toLowerCase();
  if (!reason) return "Sem Motivo";
  if (reason.includes("concorrente")) return "Comprado do concorrente";
  if (reason.includes("data indispon")) return "Data indisponível";
  if (reason.includes("desist")) return "Desistência de evento";
  if (reason.includes("não se enquadra") || reason.includes("nao se enquadra")) {
    return "Evento não se enquadra com buffet";
  }
  if (reason.includes("produto")) return "Produto não se encaixa";
  if (reason.includes("orçamento") || reason.includes("orcamento") || reason.includes("verba")) {
    return "Orçamento insuficiente";
  }
  if (reason.includes("sem retorno")) return "Sem retorno do cliente";
  if (reason.includes("motivo foi exclu")) return "Sem Motivo";
  if (reason.includes("outro")) return "Outros";
  return "Outros";
}

function normalizeEventType(value: string | null): CrmEventType | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  return (
    CRM_EVENT_TYPES.find((type) => type.toLowerCase() === lower) ??
    (lower.startsWith("anivers")
      ? "Aniversário"
      : lower.startsWith("casamento")
        ? "Casamento"
        : lower.startsWith("corporativo")
          ? "Corporativo"
          : lower.startsWith("social")
            ? "Social"
            : null)
  );
}

function normalizeLocation(value: string | null): EventLocation | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  return EVENT_LOCATIONS.find((loc) => loc.toLowerCase() === lower) ?? null;
}

function parseGuests(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = cellText(value);
  if (!text) return null;
  const parsed = Number(text.replace(/[^\d]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function rowToValues(row: ExcelJS.Row, width: number): unknown[] {
  const values: unknown[] = [];
  for (let col = 1; col <= width; col += 1) {
    values.push(row.getCell(col).value);
  }
  return values;
}

export async function parseCrmWorkbook(buffer: ArrayBuffer): Promise<LeadRecord[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("A planilha não contém nenhuma aba.");

  const width = worksheet.columnCount;
  const headerRow = rowToValues(worksheet.getRow(1), width).map(cellText);
  const columns = buildHeaderIndex(headerRow);

  if (columns.stage === -1) {
    throw new Error(
      'Coluna "Etapa do lead" não encontrada. Confira se o arquivo é a exportação do CRM.',
    );
  }

  const leads: LeadRecord[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = rowToValues(row, width);
    const pick = (field: FieldKey) =>
      columns[field] >= 0 ? values[columns[field]] : null;

    const stageRaw = cellText(pick("stage"));
    const idText = cellText(pick("id"));
    if (!stageRaw && !idText) return; // skip empty rows

    const { outcome, stage, lossReason } = classifyStage(stageRaw);

    leads.push({
      id: idText ?? `row-${rowNumber}`,
      title: cellText(pick("title")) ?? `Lead ${idText ?? rowNumber}`,
      stageRaw: stageRaw ?? "",
      stage,
      outcome,
      lossReason,
      value: parseValue(pick("value")),
      createdAt: parseCrmDate(pick("createdAt")),
      closedAt: parseCrmDate(pick("closedAt")),
      seller: cellText(pick("seller")),
      location: normalizeLocation(cellText(pick("location"))),
      eventType: normalizeEventType(cellText(pick("eventType"))),
      guests: parseGuests(pick("guests")),
      origin: cellText(pick("origin")),
      eventDate: parseCrmDate(pick("eventDate")),
    });
  });

  return leads;
}
