"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { fieldControlClass, Field } from "@/components/events/field";
import { StatusBadge } from "@/components/events/status-badge";
import { Button } from "@/components/ui/button";
import { useEvents } from "@/components/events/events-provider";
import { clientNameError } from "@/lib/cadastros/client-name";
import { CLIENT_KIND_LABELS, type ClienteRecord, type ClientKind } from "@/lib/cadastros/types";
import { formatLongDate } from "@/lib/dates";
import { uid } from "@/lib/event-factory";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function ClienteForm({
  initial,
  onSubmit,
  onCancel,
  showHistory = false,
}: {
  initial: ClienteRecord | null;
  onSubmit: (cliente: ClienteRecord) => void;
  onCancel: () => void;
  showHistory?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<ClientKind>(initial?.kind ?? "pf");
  const [document, setDocument] = useState(initial?.document ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const submit = () => {
    const error = clientNameError(name, kind);
    if (error) {
      toast.error(error);
      return;
    }
    const stamp = new Date().toISOString();
    onSubmit({
      id: initial?.id ?? uid(),
      name: name.trim(),
      kind,
      document: document.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      notes: notes.trim(),
      createdAt: initial?.createdAt ?? stamp,
      updatedAt: stamp,
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={kind === "pj" ? "★ Razão social" : "★ Nome e sobrenome"}
          className="sm:col-span-2"
        >
          <input
            className={fieldControlClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === "pj" ? "Razão social" : "Nome e sobrenome completos"}
          />
        </Field>
        <Field label="Tipo">
          <select
            className={fieldControlClass}
            value={kind}
            onChange={(e) => setKind(e.target.value as ClientKind)}
          >
            {Object.entries(CLIENT_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={kind === "pj" ? "CNPJ" : "CPF"}>
          <input className={fieldControlClass} value={document} onChange={(e) => setDocument(e.target.value)} />
        </Field>
        <Field label="Telefone">
          <input className={fieldControlClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="E-mail">
          <input className={fieldControlClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Endereço" className="sm:col-span-2">
          <input className={fieldControlClass} value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
      </div>
      <Field label="Observações">
        <textarea
          className={cn(fieldControlClass, "min-h-20 py-2")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      {showHistory && initial ? <ClienteEventHistory clientId={initial.id} /> : null}
      <div className="flex justify-end gap-2 border-t border-forest/10 pt-4">
        <Button variant="outline" className="h-10 px-4" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={submit}>
          {initial ? "Salvar alterações" : "Cadastrar cliente"}
        </Button>
      </div>
    </div>
  );
}

function ClienteEventHistory({ clientId }: { clientId: string }) {
  const { events } = useEvents();
  const history = useMemo(
    () =>
      events
        .filter((event) => event.clientId === clientId)
        .sort((a, b) => `${b.date}${b.invitationTime}`.localeCompare(`${a.date}${a.invitationTime}`)),
    [events, clientId],
  );

  return (
    <div className="rounded-xl border border-forest/10 bg-forest/[0.02] p-4">
      <p className="field-label mb-3">Histórico de eventos</p>
      {history.length === 0 ? (
        <p className="text-sm font-light text-forest/50">Nenhum evento vinculado a este cliente.</p>
      ) : (
        <ul className="space-y-2">
          {history.map((event) => (
            <li key={event.id}>
              <Link
                href={`/eventos/${event.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white"
              >
                <span className="min-w-0">
                  <span className="font-medium text-forest">{event.title || "Evento sem nome"}</span>
                  <span className="font-light text-forest/50">
                    {" "}
                    · {event.date ? formatLongDate(event.date) : "sem data"} ·{" "}
                    {EVENT_TYPE_LABELS[event.type]}
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
