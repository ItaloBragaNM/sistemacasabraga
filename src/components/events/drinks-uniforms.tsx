"use client";

import { fieldControlClass, Field, SectionTitle } from "@/components/events/field";
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
  onChange,
  onRecalculate,
}: {
  drinks: DrinkQuantities;
  onChange: (key: DrinkKey, value: string) => void;
  onRecalculate: () => void;
}) {
  return (
    <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
      <SectionTitle
        title="Bebidas"
        hint="Logística: água, refrigerante e suco. O cálculo usa o total a servir e pode ser ajustado."
      />
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
      <p className="mt-3 text-xs font-light text-forest/50">
        Água: 1 garrafão de 20 L a cada 50 convidados · Refrigerante: 450 ml por pessoa, em
        garrafas de 2 L · Suco: 200 ml por pessoa, em litros.
      </p>
      <button
        type="button"
        className="mt-2 text-xs font-light text-forest/55 underline-offset-2 hover:text-forest hover:underline"
        onClick={onRecalculate}
      >
        Recalcular pelo nº de convidados
      </button>
    </section>
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
    <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
      <SectionTitle title="Fardamentos" hint="Dólmã, bata e avental por tamanho." />
      <div className="grid gap-6 md:grid-cols-3">
        {UNIFORM_PIECES.map((piece) => (
          <div key={piece.key} className="rounded-xl border border-forest/10 p-4">
            <p className="font-section mb-3 text-[0.7rem] text-forest">{piece.label}</p>
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
    </section>
  );
}
