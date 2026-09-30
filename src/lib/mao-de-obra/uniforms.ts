import {
  isUniformPieceKey,
  isUniformSize,
  laborUniformPieces,
  type EventLaborAllocation,
  type UniformPieceKey,
  type UniformSize,
  type Uniforms,
} from "@/lib/types";
import type { ExternalWorker } from "./types";

function bumpUniform(uniforms: Uniforms, piece: UniformPieceKey, size: UniformSize, delta: number): Uniforms {
  return {
    ...uniforms,
    [piece]: {
      ...uniforms[piece],
      [size]: Math.max(0, (uniforms[piece][size] || 0) + delta),
    },
  };
}

function applyRow(uniforms: Uniforms, row: EventLaborAllocation, workers: ExternalWorker[], delta: number) {
  const worker = workers.find((item) => item.id === row.workerId);
  let current = uniforms;
  for (const piece of laborUniformPieces(row)) {
    if (!isUniformPieceKey(piece)) continue;
    const size = worker?.uniformSizes?.[piece];
    if (!size || !isUniformSize(size)) continue;
    current = bumpUniform(current, piece, size, delta);
  }
  return current;
}

/** Ajusta as quantidades de farda da ficha quando a alocação ou o tipo muda. */
export function applyLaborUniformDelta(
  uniforms: Uniforms,
  previous: EventLaborAllocation[],
  next: EventLaborAllocation[],
  workers: ExternalWorker[],
): Uniforms {
  let current = uniforms;
  for (const row of previous) current = applyRow(current, row, workers, -1);
  for (const row of next) current = applyRow(current, row, workers, 1);
  return current;
}
