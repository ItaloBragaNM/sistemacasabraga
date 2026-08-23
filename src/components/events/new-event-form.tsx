"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useEvents } from "@/components/events/events-provider";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button, buttonVariants } from "@/components/ui/button";
import { casaBragaVenue } from "@/lib/event-factory";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { EVENT_TYPES, type EventType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NewEventForm() {
  const router = useRouter();
  const { create } = useEvents();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<EventType>("casamento");
  const [adults, setAdults] = useState(80);
  const [address, setAddress] = useState("Casa Braga — Fortaleza, CE");

  return (
    <form
      className="mx-auto max-w-2xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) {
          toast.error("Informe o nome do evento.");
          return;
        }
        if (!date) {
          toast.error("Informe a data do evento.");
          return;
        }
        const created = create({
          title: title.trim(),
          date,
          type,
          status: "rascunho",
          guests: { adults, children: 0, professionals: 0 },
          venue: { ...casaBragaVenue(), address },
        });
        toast.success("Ficha criada. Complete os demais campos.");
        router.push(`/eventos/${created.id}`);
      }}
    >
      <div>
        <p className="font-section text-[0.68rem] text-terracotta">Eventos</p>
        <h1 className="font-display mt-1 text-4xl text-forest sm:text-5xl">
          Nova ficha
        </h1>
        <p className="mt-2 text-sm font-light text-forest/60">
          Os campos com estrela são os obrigatórios da ficha da casa. O cardápio
          e o restante se completam na própria página do evento.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <Field label="★ Nome do evento">
          <input
            className={fieldControlClass}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Casamento Ana & Pedro"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="★ Data do evento">
            <input
              type="date"
              className={fieldControlClass}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field label="★ Tipo do evento">
            <select
              className={fieldControlClass}
              value={type}
              onChange={(event) => setType(event.target.value as EventType)}
            >
              {EVENT_TYPES.map((item) => (
                <option key={item} value={item}>
                  {EVENT_TYPE_LABELS[item]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="★ Adultos">
            <input
              type="number"
              min={0}
              className={fieldControlClass}
              value={adults}
              onChange={(event) => setAdults(Number(event.target.value))}
            />
          </Field>
          <Field label="Local / endereço">
            <input
              className={fieldControlClass}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="h-10 bg-forest px-5 text-cream hover:bg-petrol">
          Criar ficha
        </Button>
        <Link
          href="/eventos"
          className={cn(buttonVariants({ variant: "outline" }), "h-10 px-5")}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
