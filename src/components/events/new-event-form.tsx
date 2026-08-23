"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useEvents } from "@/components/events/events-provider";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button, buttonVariants } from "@/components/ui/button";
import { casaBragaVenue } from "@/lib/event-factory";
import { EVENT_TYPE_LABELS, SERVICE_STYLE_LABELS } from "@/lib/labels";
import { EVENT_TYPES, SERVICE_STYLES, type EventType, type ServiceStyle } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NewEventForm() {
  const router = useRouter();
  const { create } = useEvents();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("2026-08-23");
  const [type, setType] = useState<EventType>("casamento");
  const [serviceStyle, setServiceStyle] = useState<ServiceStyle>("buffet");
  const [adults, setAdults] = useState(80);
  const [clientName, setClientName] = useState("");

  return (
    <form
      className="mx-auto max-w-2xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) {
          toast.error("Dê um nome ao evento.");
          return;
        }
        const created = create({
          title: title.trim(),
          date,
          type,
          serviceStyle,
          status: "rascunho",
          guests: { adults, children: 0 },
          client: {
            name: clientName,
            company: "",
            phone: "",
            email: "",
            dayContactName: "",
            dayContactPhone: "",
          },
          venue: casaBragaVenue(),
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
          Abra a ficha com o essencial. O restante — cardápio, equipe, materiais —
          se completa na própria página do evento.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <Field label="Nome do evento">
          <input
            className={fieldControlClass}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Casamento Ana & Pedro"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data">
            <input
              type="date"
              className={fieldControlClass}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field label="Adultos previstos">
            <input
              type="number"
              min={0}
              className={fieldControlClass}
              value={adults}
              onChange={(event) => setAdults(Number(event.target.value))}
            />
          </Field>
          <Field label="Tipo">
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
          <Field label="Serviço">
            <select
              className={fieldControlClass}
              value={serviceStyle}
              onChange={(event) => setServiceStyle(event.target.value as ServiceStyle)}
            >
              {SERVICE_STYLES.map((item) => (
                <option key={item} value={item}>
                  {SERVICE_STYLE_LABELS[item]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Cliente">
          <input
            className={fieldControlClass}
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            placeholder="Nome de quem contratou"
          />
        </Field>
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
