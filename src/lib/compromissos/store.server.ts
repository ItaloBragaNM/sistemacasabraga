import { readState, writeState } from "@/lib/store/kv.server";
import { emptyCompromissos, normalizeMeeting, type CompromissosData, type MeetingRecord } from "./types";

const KEY = "compromissos";
const FILE = "compromissos.json";

function normalize(input: Partial<CompromissosData> | null): CompromissosData {
  if (!input) return emptyCompromissos();
  return {
    meetings: Array.isArray(input.meetings)
      ? input.meetings.map((item) => normalizeMeeting(item)).filter((item): item is MeetingRecord => Boolean(item))
      : [],
  };
}

export async function readCompromissos(): Promise<CompromissosData> {
  return normalize(await readState<Partial<CompromissosData>>(KEY, FILE));
}

export async function writeCompromissos(data: CompromissosData): Promise<CompromissosData> {
  const normalized = normalize(data);
  await writeState(KEY, FILE, normalized);
  return normalized;
}
