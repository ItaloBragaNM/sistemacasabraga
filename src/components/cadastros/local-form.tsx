"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DateSortSelect, compareDateSort, type DateSort } from "@/components/date-sort";
import { fieldControlClass, Field } from "@/components/events/field";
import { StatusBadge } from "@/components/events/status-badge";
import { Button } from "@/components/ui/button";
import { useEvents } from "@/components/events/events-provider";
import { emptyLocal } from "@/lib/cadastros/locais";
import { LOCAL_SPACE_FLAGS, type LocalRecord, type LocalSpaceLogistics } from "@/lib/cadastros/types";
import { formatLongDate } from "@/lib/dates";
import { uid } from "@/lib/event-factory";
import { EVENT_TYPE_LABELS, VENUE_KIND_LABELS } from "@/lib/labels";
import type { VenueKind, YesNo } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LocalForm({
  initial,
  onSubmit,
  onCancel,
  showHistory = false,
}: {
  initial: LocalRecord | null;
  onSubmit: (local: LocalRecord) => void;
  onCancel: () => void;
  showHistory?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<VenueKind>(initial?.kind ?? "externo");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [outOfTown, setOutOfTown] = useState(Boolean(initial?.outOfTown));
  const [parkingNotes, setParkingNotes] = useState(initial?.parkingNotes ?? "");
  const [accessNotes, setAccessNotes] = useState(initial?.accessNotes ?? "");
  const [loadingNotes, setLoadingNotes] = useState(initial?.loadingNotes ?? "");
  const [logistics, setLogistics] = useState<LocalSpaceLogistics>(
    initial?.logistics ?? emptyLocal().logistics,
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const submit = () => {
    if (!name.trim()) {
      toast.error("Informe o nome do local.");
      return;
    }
    const stamp = new Date().toISOString();
    onSubmit(
      emptyLocal({
        id: initial?.id ?? uid(),
        name: name.trim(),
        kind,
        address: address.trim(),
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        outOfTown,
        parkingNotes: parkingNotes.trim(),
        accessNotes: accessNotes.trim(),
        loadingNotes: loadingNotes.trim(),
        logistics,
        notes: notes.trim(),
        createdAt: initial?.createdAt ?? stamp,
        updatedAt: stamp,
      }),
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="★ Nome do local" className="sm:col-span-2">
          <input
            className={fieldControlClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome do espaço"
          />
        </Field>
        <Field label="Tipo">
          <select
            className={fieldControlClass}
            value={kind}
            onChange={(event) => {
              const next = event.target.value as VenueKind;
              setKind(next);
              if (next === "casa_braga" && !name.trim()) setName("Casa Braga");
            }}
          >
            {Object.entries(VENUE_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fora da cidade">
          <label className="flex h-10 cursor-pointer items-center gap-2 text-sm text-forest">
            <input
              type="checkbox"
              className="size-4 accent-forest"
              checked={outOfTown}
              onChange={(event) => setOutOfTown(event.target.checked)}
            />
            Dispara ajuda de custo da equipe
          </label>
        </Field>
        <Field label="Endereço" className="sm:col-span-2">
          <input
            className={fieldControlClass}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Rua, número, bairro, cidade"
          />
        </Field>
        <Field label="Contato no local">
          <input
            className={fieldControlClass}
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
          />
        </Field>
        <Field label="Telefone">
          <input className={fieldControlClass} value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>
        <Field label="E-mail" className="sm:col-span-2">
          <input className={fieldControlClass} value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
      </div>

      <div>
        <h3 className="section-title mb-3">Logística do espaço</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {LOCAL_SPACE_FLAGS.map((flag) => (
            <label key={flag.key} className="flex cursor-pointer items-center gap-2 text-sm text-forest">
              <input
                type="checkbox"
                className="size-4 accent-forest"
                checked={logistics[flag.key] === "sim"}
                onChange={(event) =>
                  setLogistics((current) => ({
                    ...current,
                    [flag.key]: (event.target.checked ? "sim" : "nao") as YesNo,
                  }))
                }
              />
              {flag.label}
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Estacionamento" className="sm:col-span-2">
            <textarea
              className={cn(fieldControlClass, "min-h-16 py-2")}
              value={parkingNotes}
              onChange={(event) => setParkingNotes(event.target.value)}
              placeholder="Vagas, restrições, manobrista…"
            />
          </Field>
          <Field label="Acesso">
            <textarea
              className={cn(fieldControlClass, "min-h-16 py-2")}
              value={accessNotes}
              onChange={(event) => setAccessNotes(event.target.value)}
              placeholder="Elevador, escada, horário de entrada…"
            />
          </Field>
          <Field label="Carga e descarga">
            <textarea
              className={cn(fieldControlClass, "min-h-16 py-2")}
              value={loadingNotes}
              onChange={(event) => setLoadingNotes(event.target.value)}
              placeholder="Doca, rua, restrição de caminhão…"
            />
          </Field>
        </div>
      </div>

      <Field label="Observações">
        <textarea
          className={cn(fieldControlClass, "min-h-20 py-2")}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </Field>
      {showHistory && initial ? <LocalEventHistory venueId={initial.id} /> : null}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" className="h-10 px-4" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="h-10 px-5" onClick={submit}>
          {initial ? "Salvar alterações" : "Cadastrar local"}
        </Button>
      </div>
    </div>
  );
}

function LocalEventHistory({ venueId }: { venueId: string }) {
  const { events } = useEvents();
  const [dateSort, setDateSort] = useState<DateSort>("desc");
  const history = useMemo(
    () =>
      events
        .filter((event) => event.venueId === venueId)
        .sort((a, b) =>
          compareDateSort(`${a.date}${a.invitationTime}`, `${b.date}${b.invitationTime}`, dateSort),
        ),
    [events, venueId, dateSort],
  );

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="section-title">Histórico de eventos</h3>
        {history.length > 0 ? <DateSortSelect value={dateSort} onChange={setDateSort} className="h-8" /> : null}
      </div>
      {history.length === 0 ? (
        <p className="meta-text">Nenhum evento vinculado a este local.</p>
      ) : (
        <ul className="space-y-2">
          {history.map((event) => (
            <li key={event.id}>
              <Link
                href={`/eventos/${event.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-forest/[0.03]"
              >
                <span className="min-w-0">
                  <span className="font-medium text-forest">{event.title || "Evento sem nome"}</span>
                  <span className="text-forest/55">
                    {" "}
                    · {event.date ? formatLongDate(event.date) : "sem data"} · {EVENT_TYPE_LABELS[event.type]}
                  </span>
                </span>
                <StatusBadge status={event.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
