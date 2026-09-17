"use client";

import { FileDown } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, Chip, EmptyBlock, LoadingBlock, SearchInput } from "@/components/cadastros/ui";
import { useEvents } from "@/components/events/events-provider";
import { Button } from "@/components/ui/button";
import { downloadVehicleChecklistPdf } from "@/components/veiculos/checklist-pdf";
import { useVeiculosUso } from "@/components/veiculos/veiculos-uso-provider";
import { VEHICLE_USAGE_CATEGORY_LABELS } from "@/lib/cadastros/types";
import { formatLongDate } from "@/lib/dates";

export function VeiculosUsoPage() {
  const { events, ready: eventsReady } = useEvents();
  const { data: cadastros, ready: cadastrosReady } = useCadastros();
  const { data, ready, markGenerated, markSigned } = useVeiculosUso();
  const [search, setSearch] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);

  const vehicles = cadastros?.veiculos;
  const usages = data?.usages;
  const vehicleById = useMemo(
    () => new Map((vehicles ?? []).map((item) => [item.id, item])),
    [vehicles],
  );
  const usageByKey = useMemo(
    () => new Map((usages ?? []).map((item) => [`${item.eventId}:${item.vehicleId}`, item])),
    [usages],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = events
      .filter((event) => (event.vehicleIds ?? []).length > 0)
      .flatMap((event) =>
        (event.vehicleIds ?? []).map((vehicleId) => ({
          event,
          vehicleId,
          vehicle: vehicleById.get(vehicleId),
          usage: usageByKey.get(`${event.id}:${vehicleId}`),
        })),
      )
      .sort((a, b) => (b.event.date || "").localeCompare(a.event.date || ""));
    if (!term) return list;
    return list.filter((row) => {
      const hay = [
        row.event.code,
        row.event.title,
        row.vehicle?.name,
        row.vehicle?.plate,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [events, search, usageByKey, vehicleById]);

  const loading = !eventsReady || !cadastrosReady || !ready;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        eyebrow="Veículos"
        title="Controle de uso"
        description="Gere o checklist de entrada e saída em PDF para preenchimento e assinatura em cada evento."
      />

      {loading ? (
        <LoadingBlock />
      ) : (vehicles ?? []).length === 0 ? (
        <EmptyBlock
          title="Cadastre a frota"
          description="O cadastro dos veículos fica em Cadastros → Veículos. Depois, vincule-os na ficha do evento."
        />
      ) : (
        <>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por evento, placa ou veículo…" />
          {rows.length === 0 ? (
            <EmptyBlock
              title="Nenhum veículo alocado"
              description="Na ficha do evento, selecione o veículo como recurso. O checklist fica disponível aqui."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-forest/10">
                    <th className="field-label py-3 pl-5 font-normal">Evento</th>
                    <th className="field-label py-3 font-normal">Veículo</th>
                    <th className="field-label py-3 font-normal">Checklist</th>
                    <th className="field-label py-3 pr-5 text-right font-normal">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const key = `${row.event.id}:${row.vehicleId}`;
                    return (
                      <tr key={key} className="border-b border-forest/5 last:border-0">
                        <td className="py-3 pl-5">
                          <p className="font-list font-medium text-forest">{row.event.title || "Evento sem nome"}</p>
                          <p className="text-xs font-light text-forest/45">
                            {row.event.code} · {row.event.date ? formatLongDate(row.event.date) : "sem data"}
                            {row.event.outOfTown ? " · fora da cidade" : ""}
                          </p>
                        </td>
                        <td className="py-3">
                          <p className="text-forest">{row.vehicle?.name || "Veículo removido"}</p>
                          <p className="text-xs font-light text-forest/45">
                            {row.vehicle
                              ? `${row.vehicle.plate || "s/ placa"} · ${VEHICLE_USAGE_CATEGORY_LABELS[row.vehicle.usageCategory]}`
                              : row.vehicleId}
                          </p>
                        </td>
                        <td className="py-3">
                          {row.usage ? (
                            <Chip
                              className={
                                row.usage.status === "assinado"
                                  ? "bg-forest/10 text-forest"
                                  : "bg-terracotta/10 text-terracotta"
                              }
                            >
                              {row.usage.status === "assinado" ? "Assinado" : "PDF gerado"}
                            </Chip>
                          ) : (
                            <span className="text-forest/40">Pendente</span>
                          )}
                        </td>
                        <td className="py-3 pr-5">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              className="h-9 px-3"
                              disabled={!row.vehicle || workingId === key}
                              onClick={async () => {
                                if (!row.vehicle) return;
                                try {
                                  setWorkingId(key);
                                  await downloadVehicleChecklistPdf(row.event, row.vehicle);
                                  markGenerated(row.event.id, row.vehicle.id);
                                  toast.success("Checklist baixado para preenchimento e assinatura.");
                                } catch (error) {
                                  console.error(error);
                                  toast.error("Não foi possível gerar o PDF.");
                                } finally {
                                  setWorkingId(null);
                                }
                              }}
                            >
                              <FileDown data-icon="inline-start" />
                              PDF
                            </Button>
                            {row.usage && row.usage.status !== "assinado" ? (
                              <Button
                                className="h-9 bg-forest px-3 text-cream hover:bg-petrol"
                                onClick={() => {
                                  markSigned(row.usage!.id);
                                  toast.success("Checklist marcado como assinado.");
                                }}
                              >
                                Assinado
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
