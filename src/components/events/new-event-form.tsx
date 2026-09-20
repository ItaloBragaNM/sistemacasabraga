"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ClienteForm } from "@/components/cadastros/cliente-form";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { Modal } from "@/components/cadastros/ui";
import { useEvents } from "@/components/events/events-provider";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button, buttonVariants } from "@/components/ui/button";
import { casaBragaVenue } from "@/lib/event-factory";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { DEFAULT_DRINK_PREMISES, EVENT_TYPES, guestTotal, suggestedDrinkQuantities, type EventType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NewEventForm() {
  const router = useRouter();
  const { create } = useEvents();
  const { data: cadastros, upsertCliente } = useCadastros();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<EventType>("casamento");
  const [clientId, setClientId] = useState("");
  const [adults, setAdults] = useState(80);
  const [address, setAddress] = useState("Casa Braga — Fortaleza, CE");
  const [saving, setSaving] = useState(false);
  const [clientModal, setClientModal] = useState(false);
  const clientes = [...(cadastros?.clientes ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );

  return (
    <form
      className="mx-auto max-w-2xl space-y-6"
      action="#"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (saving) return;
        if (!title.trim()) {
          toast.error("Informe o nome do evento.");
          return;
        }
        if (!date) {
          toast.error("Informe a data do evento.");
          return;
        }
        try {
          setSaving(true);
          const guests = { adults, children: 0, children0to5: 0, children5to10: 0, professionals: 0 };
          const created = create({
            title: title.trim(),
            date,
            type,
            clientId,
            status: "rascunho",
            guests,
            drinksAuto: true,
            drinks: suggestedDrinkQuantities(guestTotal(guests), cadastros?.drinkPremises ?? DEFAULT_DRINK_PREMISES),
            venue: { ...casaBragaVenue(), address },
          });
          toast.success("Ficha criada. Complete os demais campos.");
          router.push(`/eventos/${created.id}`);
        } catch (error) {
          console.error(error);
          setSaving(false);
          toast.error("Não foi possível criar a ficha. Tente de novo.");
        }
      }}
    >
      <div>
        <p className="text-[13px] font-medium text-forest/50">Eventos</p>
        <h1 className="page-title mt-1">
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
          <Field label="Cliente">
            <div className="flex gap-2">
              <select
                className={cn(fieldControlClass, "min-w-0 flex-1")}
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
              >
                <option value="">Sem cliente vinculado</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0 px-3"
                onClick={() => setClientModal(true)}
                aria-label="Cadastrar cliente"
              >
                <Plus className="size-4" />
              </Button>
            </div>
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
        <button
          type="submit"
          disabled={saving}
          className={cn(buttonVariants(), "h-10 bg-forest px-5 text-cream hover:bg-petrol")}
        >
          {saving ? "Criando…" : "Criar ficha"}
        </button>
        <Link
          href="/eventos"
          className={cn(buttonVariants({ variant: "outline" }), "h-10 px-5")}
        >
          Cancelar
        </Link>
      </div>

      <Modal open={clientModal} onClose={() => setClientModal(false)} title="Novo cliente" wide>
        <ClienteForm
          initial={null}
          onCancel={() => setClientModal(false)}
          onSubmit={(cliente) => {
            upsertCliente(cliente);
            setClientId(cliente.id);
            setClientModal(false);
            toast.success("Cliente cadastrado e vinculado.");
          }}
        />
      </Modal>
    </form>
  );
}
