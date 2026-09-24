import {
  isUniformPieceKey,
  isUniformSize,
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
  const piece = row.uniformPiece;
  if (!piece || !isUniformPieceKey(piece)) return uniforms;
  const worker = workers.find((item) => item.id === row.workerId);
  const size = worker?.uniformSizes?.[piece];
  if (!size || !isUniformSize(size)) return uniforms;
  return bumpUniform(uniforms, piece, size, delta);
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
