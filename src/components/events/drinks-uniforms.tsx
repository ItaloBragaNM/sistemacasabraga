"use client";

import { fieldControlClass, Field, FichaSection } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { UNIFORM_SIZE_LABELS } from "@/lib/labels";
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
    <FichaSection title="Bebidas">
      <div className="grid gap-3 sm:grid-cols-3">
        {DRINK_ITEMS.map((drink) => (
          <Field key={drink.key} label={drink.label}>
            <input
              className={fieldControlClass}
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
      <Button
        type="button"
        className="mt-4 h-9 bg-forest px-4 text-cream hover:bg-petrol"
        onClick={onRecalculate}
      >
        Recalcular pelo número de convidados
      </Button>
    </FichaSection>
  );
}

export function EventUniformsFields({
  uniforms,
  onChange,
}: {
  uniforms: Uniforms;
  onChange: (piece: UniformPieceKey, size: UniformSize, value: number) => void;
}) {
  return (
    <FichaSection title="Fardamentos">
      <div className="grid gap-6 md:grid-cols-3">
        {UNIFORM_PIECES.map((piece) => (
          <div key={piece.key} className="rounded-xl border border-forest/10 p-4">
            <p className="mb-3 text-[13px] font-semibold text-forest">{piece.label}</p>
            <div className="grid grid-cols-4 gap-2">
              {UNIFORM_SIZES.map((size) => (
                <Field key={size} label={UNIFORM_SIZE_LABELS[size]}>
                  <input
                    type="number"
                    min={0}
                    className={fieldControlClass}
                    value={uniforms[piece.key][size]}
                    onChange={(event) =>
                      onChange(piece.key, size, Number(event.target.value))
                    }
                  />
                </Field>
              ))}
            </div>
          </div>
        ))}
      </div>
    </FichaSection>
  );
}
