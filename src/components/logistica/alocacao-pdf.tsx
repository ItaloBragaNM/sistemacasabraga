"use client";

import { Document, Page, Text, View, pdf } from "@react-pdf/renderer";
import { formatInt } from "@/lib/crm/format";
import { formatShortDate } from "@/lib/dates";
import { downloadBlob } from "@/lib/download";
import type { MaterialWeekRow, OccupyingEvent } from "@/lib/logistica/alocacao";
import {
  PDF,
  PdfFooter,
  PdfHeader,
  PdfTableHead,
  columnStyle,
  pdfStyles,
  type PdfColumn,
} from "@/lib/pdf/header";

const RUPTURE_COLUMNS: PdfColumn[] = [
  { label: "Material", flex: 2.6 },
  { label: "Estoque", width: 42, align: "right" },
  { label: "Pico", width: 36, align: "right" },
  { label: "Falta", width: 36, align: "right" },
  { label: "Dias em ruptura (demanda / estoque)", flex: 3 },
];

const EVENT_COLUMNS: PdfColumn[] = [
  { label: "Evento", flex: 3 },
  { label: "Entrega → recolhimento", flex: 2 },
];

export function RuptureDocument({
  weekLabel,
  days,
  ruptures,
  events,
}: {
  weekLabel: string;
  days: string[];
  ruptures: MaterialWeekRow[];
  events: OccupyingEvent[];
}) {
  return (
    <Document title={`Rupturas · ${weekLabel}`}>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader
          title="Rupturas da semana"
          meta={`${weekLabel} · material locado da entrega ao recolhimento`}
          right={`${ruptures.length} ruptura(s) · ${events.length} evento(s)`}
        />

        <Text style={pdfStyles.sectionTitle}>Eventos na janela</Text>
        {events.length === 0 ? (
          <Text style={pdfStyles.hint}>Nenhum evento com material alocado nesta semana.</Text>
        ) : (
          <View>
            <PdfTableHead columns={EVENT_COLUMNS} fixed={false} />
            {events.map((event) => (
              <View key={event.id} style={pdfStyles.row} wrap={false}>
                <Text style={[pdfStyles.cell, columnStyle(EVENT_COLUMNS[0])]}>
                  {event.title}
                  {event.code ? <Text style={pdfStyles.cellMuted}> · {event.code}</Text> : null}
                </Text>
                <Text style={[pdfStyles.cellMuted, columnStyle(EVENT_COLUMNS[1])]}>
                  {formatShortDate(event.start)} → {formatShortDate(event.end)}
                  {event.assumedDelivery || event.assumedPickup ? " · data assumida" : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={pdfStyles.sectionTitle} minPresenceAhead={30}>
          Materiais em ruptura
        </Text>
        {ruptures.length === 0 ? (
          <Text style={pdfStyles.hint}>O estoque cobre o pico de eventos simultâneos desta semana.</Text>
        ) : (
          <>
            <PdfTableHead columns={RUPTURE_COLUMNS} />
            {ruptures.map((row) => {
              const ruptureDays = row.days
                .map((cell, index) =>
                  cell.shortage > 0
                    ? `${formatShortDate(days[index])}: ${formatInt(cell.demand)}/${formatInt(cell.stock)}`
                    : "",
                )
                .filter(Boolean)
                .join(" · ");
              return (
                <View key={row.materialId} style={pdfStyles.row} wrap={false}>
                  <Text style={[pdfStyles.cell, columnStyle(RUPTURE_COLUMNS[0])]}>
                    {row.name}
                    {row.unit ? ` (${row.unit})` : ""}
                    <Text style={pdfStyles.cellMuted}> · {row.category}</Text>
                  </Text>
                  <Text style={[pdfStyles.num, columnStyle(RUPTURE_COLUMNS[1])]}>{formatInt(row.stock)}</Text>
                  <Text style={[pdfStyles.num, columnStyle(RUPTURE_COLUMNS[2])]}>{formatInt(row.peak)}</Text>
                  <Text style={[pdfStyles.num, pdfStyles.strong, columnStyle(RUPTURE_COLUMNS[3]), { color: PDF.danger }]}>
                    {formatInt(row.shortage)}
                  </Text>
                  <Text style={[pdfStyles.cellMuted, columnStyle(RUPTURE_COLUMNS[4]), { paddingLeft: 6 }]}>
                    {ruptureDays}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        <PdfFooter label="Alocação de materiais · estoque × eventos simultâneos" />
      </Page>
    </Document>
  );
}

export async function downloadRuptureWeekPdf(opts: {
  weekLabel: string;
  days: string[];
  ruptures: MaterialWeekRow[];
  events: OccupyingEvent[];
  fileStamp: string;
}) {
  const blob = await pdf(
    <RuptureDocument weekLabel={opts.weekLabel} days={opts.days} ruptures={opts.ruptures} events={opts.events} />,
  ).toBlob();
  downloadBlob(blob, `rupturas-alocacao-${opts.fileStamp}.pdf`);
}
