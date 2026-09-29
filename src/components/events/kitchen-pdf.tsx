"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { formatShortDate, formatWeekday } from "@/lib/dates";
import { downloadBlob, slugify } from "@/lib/download";
import { PDF_FONT } from "@/lib/pdf/fonts";
import {
  PDF,
  PdfFooter,
  PdfHeader,
  PdfTableHead,
  columnStyle,
  pdfStyles,
  type PdfColumn,
} from "@/lib/pdf/header";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  UNIFORM_SIZE_LABELS,
  VENUE_KIND_LABELS,
  YES_NO_LABELS,
} from "@/lib/labels";
import {
  alcoholSummary,
  eventMenuSections,
  eventStaffLines,
  formatUniformSizeLine,
  guestTotal,
  guestsSummary,
  uniformPiecesForReport,
  type EventRecord,
  type YesNo,
} from "@/lib/types";

export const KITCHEN_PDF_SECTIONS = [
  { key: "evento", label: "Informações do evento" },
  { key: "cardapio", label: "Cardápio" },
  { key: "equipe", label: "Equipe" },
  { key: "logistica", label: "Extras e logística" },
  { key: "logisticaNotes", label: "Observações da logística" },
  { key: "cozinha", label: "Observações da cozinha" },
] as const;

export type KitchenPdfSectionKey = (typeof KITCHEN_PDF_SECTIONS)[number]["key"];

export const ALL_KITCHEN_PDF_SECTIONS = KITCHEN_PDF_SECTIONS.map((item) => item.key);

const MENU_COLUMNS: PdfColumn[] = [
  { label: "Per capita", width: 64 },
  { label: "Prato", flex: 3 },
  { label: "Obs", flex: 2, align: "right" },
];

const styles = StyleSheet.create({
  eventLine: { fontSize: PDF.body, marginBottom: 1 },
  alert: {
    borderWidth: 0.8,
    borderColor: PDF.danger,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 6,
  },
  alertTitle: {
    color: PDF.danger,
    fontSize: PDF.small,
    fontFamily: PDF_FONT,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  note: { fontSize: PDF.body, lineHeight: 1.35 },
  columns: { flexDirection: "row", gap: 14 },
  column: { flex: 1 },
  label: { flex: 1, fontSize: PDF.body },
  value: { fontSize: PDF.body, textAlign: "right", paddingLeft: 6 },
});

function eventPlaceLabel(event: EventRecord) {
  return event.venue.address?.trim() || event.venue.name || "Local a definir";
}

function yn(value: YesNo | string | undefined) {
  if (value === "sim" || value === "nao") return YES_NO_LABELS[value];
  return "—";
}

function joinParts(parts: Array<string | false | undefined>) {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(" · ");
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={pdfStyles.sectionTitle} minPresenceAhead={30}>
      {children}
    </Text>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={pdfStyles.row} wrap={false}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function EventLines({ event }: { event: EventRecord }) {
  const date = event.date ? `${formatWeekday(event.date)}, ${formatShortDate(event.date)}` : "";
  const kindLabel = event.venue.kind ? VENUE_KIND_LABELS[event.venue.kind] : "";
  const placeLabel = eventPlaceLabel(event);
  const place = joinParts([kindLabel !== placeLabel ? kindLabel : "", placeLabel]);
  const times = joinParts([
    event.ceremonyTime ? `Cerimônia ${event.ceremonyTime}` : "",
    event.invitationTime ? `Convite ${event.invitationTime}` : "",
    event.serviceTime ? `Serviço ${event.serviceTime}` : "",
    event.serviceDuration ? `Duração ${event.serviceDuration}` : "",
    event.teamArrival ? `Chegada da equipe ${event.teamArrival}` : "",
  ]);
  const people = joinParts([`${guestTotal(event.guests)} a servir`, guestsSummary(event.guests)]);

  return (
    <View>
      {date || place ? <Text style={styles.eventLine}>{joinParts([date, place])}</Text> : null}
      <Text style={styles.eventLine}>{people}</Text>
      {times ? <Text style={styles.eventLine}>{times}</Text> : null}
    </View>
  );
}

export function KitchenDocument({
  event,
  sections = ALL_KITCHEN_PDF_SECTIONS,
}: {
  event: EventRecord;
  sections?: KitchenPdfSectionKey[];
}) {
  const selected = new Set(sections);
  const staff = eventStaffLines(event);
  const uniforms = uniformPiecesForReport(event.uniforms);
  const labor = event.laborAllocations ?? [];
  const showEvento = selected.has("evento");
  const showCardapio = selected.has("cardapio");
  const showEquipe = selected.has("equipe");
  const showLogistica = selected.has("logistica");
  const showLogisticaNotes = selected.has("logisticaNotes");
  const showCozinha = selected.has("cozinha");
  const showStaff = showEquipe && (staff.length > 0 || labor.length > 0);
  const showUniforms = showEquipe && uniforms.length > 0;
  const alcohol = alcoholSummary(event.logistics);

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader
          title={event.title || "Evento sem nome"}
          meta={joinParts([event.code, EVENT_TYPE_LABELS[event.type], EVENT_STATUS_LABELS[event.status]])}
        />

        {showEvento ? <EventLines event={event} /> : null}

        {showCozinha && event.dietaryNotes ? (
          <View style={styles.alert} wrap={false}>
            <Text style={styles.alertTitle}>Restrições alimentares</Text>
            <Text style={styles.note}>{event.dietaryNotes}</Text>
          </View>
        ) : null}

        {showCardapio
          ? eventMenuSections(event).map((section) => {
              const items = section.items.filter((item) => item.name.trim());
              if (!items.length) return null;
              return (
                <View key={section.id}>
                  <SectionTitle>{section.time ? `${section.title} · ${section.time}` : section.title}</SectionTitle>
                  <PdfTableHead columns={MENU_COLUMNS} fixed={false} />
                  {items.map((item) => (
                    <View key={item.id} style={pdfStyles.row} wrap={false}>
                      <Text style={[pdfStyles.cell, columnStyle(MENU_COLUMNS[0])]}>{item.quantity}</Text>
                      <Text style={[pdfStyles.cell, columnStyle(MENU_COLUMNS[1])]}>{item.name}</Text>
                      <Text style={[pdfStyles.cellMuted, columnStyle(MENU_COLUMNS[2])]}>{item.notes}</Text>
                    </View>
                  ))}
                </View>
              );
            })
          : null}

        {showStaff || showUniforms || showLogistica ? (
          <View style={styles.columns}>
            {showStaff || showUniforms ? (
              <View style={styles.column}>
                {showStaff ? (
                  <View>
                    <SectionTitle>Equipe</SectionTitle>
                    {staff.map((item) => (
                      <Line key={item.key} label={item.label} value={String(item.quantity)} />
                    ))}
                    {labor.length > 0 ? (
                      <Line label="Equipe externa" value={`${labor.length} prestadores`} />
                    ) : null}
                    {event.laborOvertime ? (
                      <Line
                        label="Hora extra"
                        value={event.laborOvertimeHours ? `${event.laborOvertimeHours} h` : "Sim"}
                      />
                    ) : null}
                    {event.laborApplyAllowance ? <Line label="Ajuda de custo" value="Sim" /> : null}
                  </View>
                ) : null}
                {showUniforms ? (
                  <View>
                    <SectionTitle>Fardamentos</SectionTitle>
                    {uniforms.map((piece) => (
                      <Line
                        key={piece.key}
                        label={piece.label}
                        value={formatUniformSizeLine(piece.sizes, UNIFORM_SIZE_LABELS, "   ")}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
            {showLogistica ? (
              <View style={styles.column}>
                <SectionTitle>Extras e logística</SectionTitle>
                <Line label="Ilhas" value={String(event.islands ?? 0)} />
                {alcohol ? (
                  <View style={pdfStyles.row} wrap={false}>
                    <Text style={styles.label}>{alcohol}</Text>
                  </View>
                ) : (
                  <Line label="Bebidas alcoólicas" value={yn(event.logistics.alcoholServed)} />
                )}
                <Line label="Material no dia anterior" value={yn(event.logistics.materialPreviousDay)} />
                <Line label="Mesa cavalete" value={yn(event.logistics.trestleTable)} />
                <Line label="Recolher material ao final" value={yn(event.logistics.mustCollectMaterial)} />
                <Line
                  label="Cozinha / forno / freezer / micro-ondas"
                  value={[
                    event.logistics.hasKitchen,
                    event.logistics.hasOven,
                    event.logistics.hasFreezer,
                    event.logistics.hasMicrowave,
                  ]
                    .map(yn)
                    .join(" / ")}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {showCozinha && event.menuSetupNotes ? (
          <View>
            <SectionTitle>Observações — cozinha</SectionTitle>
            <Text style={styles.note}>{event.menuSetupNotes}</Text>
          </View>
        ) : null}

        {showCozinha && event.managementNotes ? (
          <View>
            <SectionTitle>Gerenciais e Evento</SectionTitle>
            <Text style={styles.note}>{event.managementNotes}</Text>
          </View>
        ) : null}

        {showLogisticaNotes && event.logisticsNotes ? (
          <View>
            <SectionTitle>Observações — logística</SectionTitle>
            <Text style={styles.note}>{event.logisticsNotes}</Text>
          </View>
        ) : null}

        <PdfFooter
          label={joinParts([
            event.code,
            showLogistica ? `Material dia anterior: ${yn(event.logistics.materialPreviousDay)}` : "",
            showLogistica ? `Cavalete: ${yn(event.logistics.trestleTable)}` : "",
          ])}
        />
      </Page>
    </Document>
  );
}

export async function downloadKitchenPdf(event: EventRecord, sections?: KitchenPdfSectionKey[]) {
  const chosen = sections?.length ? sections : ALL_KITCHEN_PDF_SECTIONS;
  const blob = await pdf(<KitchenDocument event={event} sections={chosen} />).toBlob();
  const suffix = chosen.length === ALL_KITCHEN_PDF_SECTIONS.length ? "completa" : chosen.join("-");
  downloadBlob(
    blob,
    `ficha-${event.code.toLowerCase()}-${slugify(event.title) || "evento"}-${suffix}.pdf`,
  );
}
