"use client";

import { fieldControlClass, Field, FichaSection } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { QtyInput } from "@/components/ui/qty-input";
import { UNIFORM_SIZE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import {
  DRINK_ITEMS,
  UNIFORM_PIECES,
  UNIFORM_SIZES,
  type DrinkKey,
  type DrinkQuantities,
  type UniformPieceKey,
  type UniformSize,
  type Uniforms,
} from "@/lib/types";

export function EventDrinksFields({
  drinks,
  notes,
  onNotesChange,
  onChange,
  onRecalculate,
}: {
  drinks: DrinkQuantities;
  notes: string;
  onNotesChange: (value: string) => void;
  onChange: (key: DrinkKey, value: string) => void;
  onRecalculate: () => void;
}) {
  return (
    <FichaSection
      title="Bebidas"
      actions={
        <Button type="button" size="sm" className="h-auto min-h-8 py-1.5 whitespace-normal" onClick={onRecalculate}>
          Recalcular pelo número de convidados
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {DRINK_ITEMS.map((drink) => (
          <Field key={drink.key} label={drink.label}>
            <input
              className={cn(fieldControlClass, "tabular")}
              value={drinks[drink.key]}
              onChange={(event) => onChange(drink.key, event.target.value)}
            />
          </Field>
        ))}
      </div>
      <Field label="Observações — bebidas" className="mt-4">
        <textarea
          className={`${fieldControlClass} min-h-24 py-2`}
          value={notes ?? ""}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Marcas, geladeira, serviço de bar, restrições…"
        />
      </Field>
    </FichaSection>
  );
}

export function EventUniformsFields({
  uniforms,
  onChange,
  embedded = false,
}: {
  uniforms: Uniforms;
  onChange: (piece: UniformPieceKey, size: UniformSize, value: number) => void;
  embedded?: boolean;
}) {
  const body = (
    <div className={cn("grid gap-3 md:grid-cols-3", !embedded && "gap-4")}>
      {UNIFORM_PIECES.map((piece) => (
        <div key={piece.key} className={cn("rounded-lg border border-line", embedded ? "p-3" : "p-4")}>
          <p className={cn("group-title", embedded ? "mb-2" : "mb-3")}>{piece.label}</p>
          <div className="grid grid-cols-4 gap-2">
            {UNIFORM_SIZES.map((size) => (
              <Field key={size} label={UNIFORM_SIZE_LABELS[size]}>
                <QtyInput
                  className="w-full"
                  ariaLabel={`${piece.label} ${UNIFORM_SIZE_LABELS[size]}`}
                  value={uniforms[piece.key][size]}
                  onChange={(value) => onChange(piece.key, size, value)}
                />
              </Field>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
  if (embedded) return body;
  return <FichaSection title="Fardamentos">{body}</FichaSection>;
}
