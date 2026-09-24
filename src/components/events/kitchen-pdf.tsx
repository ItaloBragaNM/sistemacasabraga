"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { formatShortDate, formatWeekday } from "@/lib/dates";
import { downloadBlob, slugify } from "@/lib/download";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  UNIFORM_SIZE_LABELS,
  VENUE_KIND_LABELS,
  YES_NO_LABELS,
} from "@/lib/labels";
import {
  alcoholSummary,
  DRINK_ITEMS,
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
  { key: "bebidas", label: "Bebidas" },
  { key: "equipe", label: "Equipe" },
  { key: "logistica", label: "Extras e logística" },
  { key: "logisticaNotes", label: "Observações da logística" },
  { key: "cozinha", label: "Observações da cozinha" },
  { key: "veiculos", label: "Veículos" },
] as const;

export type KitchenPdfSectionKey = (typeof KITCHEN_PDF_SECTIONS)[number]["key"];

export const ALL_KITCHEN_PDF_SECTIONS = KITCHEN_PDF_SECTIONS.map((item) => item.key);

const colors = {
  forest: "#1E443E",
  petrol: "#003F3C",
  cream: "#FFFBFA",
  terracotta: "#E13F3A",
  muted: "#5D6F6C",
  line: "#C9D5D1",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.cream,
    paddingTop: 52,
    paddingBottom: 32,
    paddingHorizontal: 24,
    fontFamily: "Helvetica",
    color: colors.forest,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.petrol,
    color: colors.cream,
    paddingVertical: 8,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    opacity: 0.75,
    marginBottom: 2,
  },
  title: { fontSize: 11, fontFamily: "Times-Bold" },
  headerRight: { fontSize: 8, textAlign: "right", color: colors.cream, opacity: 0.92 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  meta: { width: "31%", borderWidth: 0.6, borderColor: colors.line, padding: 5 },
  metaWide: { width: "64.5%", borderWidth: 0.6, borderColor: colors.line, padding: 5 },
  metaLabel: {
    fontSize: 6.5,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 2,
  },
  metaValue: { fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  alert: {
    backgroundColor: "#F8D9D7",
    borderWidth: 1,
    borderColor: colors.terracotta,
    padding: 6,
    marginBottom: 8,
  },
  alertTitle: {
    color: colors.terracotta,
    fontSize: 7,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
    fontFamily: "Helvetica-Bold",
  },
  sectionTitle: {
    fontSize: 8,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginTop: 6,
    marginBottom: 4,
    color: colors.forest,
    fontFamily: "Helvetica-Bold",
  },
  item: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.line,
    paddingVertical: 2.5,
  },
  itemName: { flex: 3, fontSize: 9 },
  itemQty: { width: 64, fontSize: 9 },
  itemNotes: { flex: 2, fontSize: 8, color: colors.muted, textAlign: "right" },
  note: { fontSize: 9, lineHeight: 1.35 },
  footer: {
    position: "absolute",
    bottom: 12,
    left: 24,
    right: 24,
    fontSize: 7,
    color: colors.muted,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function eventPlaceLabel(event: EventRecord) {
  return event.venue.address?.trim() || event.venue.name || "Local a definir";
}

function hasSection(sections: Set<KitchenPdfSectionKey>, key: KitchenPdfSectionKey) {
  return sections.has(key);
}

function yn(value: YesNo | string | undefined) {
  if (value === "sim" || value === "nao") return YES_NO_LABELS[value];
  return "—";
}

function Meta({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={wide ? styles.metaWide : styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value || "—"}</Text>
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
  const drinks = DRINK_ITEMS.filter((item) => event.drinks[item.key].trim());
  const staff = eventStaffLines(event);
  const uniforms = uniformPiecesForReport(event.uniforms);
  const showEvento = hasSection(selected, "evento");
  const showCardapio = hasSection(selected, "cardapio");
  const showBebidas = hasSection(selected, "bebidas");
  const showEquipe = hasSection(selected, "equipe");
  const showLogistica = hasSection(selected, "logistica");
  const showLogisticaNotes = hasSection(selected, "logisticaNotes");
  const showCozinha = hasSection(selected, "cozinha");
  const showVeiculos = hasSection(selected, "veiculos");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed wrap={false}>
          <View>
            <Text style={styles.brand}>Casa Braga</Text>
            <Text style={styles.title}>{event.title || "Evento sem nome"}</Text>
          </View>
          <Text style={styles.headerRight}>
            {event.code} · {EVENT_TYPE_LABELS[event.type]}
            {"\n"}
            {eventPlaceLabel(event)}
          </Text>
        </View>

        {showEvento ? (
          <View style={styles.metaGrid}>
            <Meta
              label="Data"
              value={event.date ? `${formatWeekday(event.date)}, ${formatShortDate(event.date)}` : ""}
            />
            <Meta label="Status" value={EVENT_STATUS_LABELS[event.status]} />
            <Meta label="Tipo de local" value={VENUE_KIND_LABELS[event.venue.kind]} />
            <Meta label="Local" value={eventPlaceLabel(event)} wide />
            <Meta label="A servir" value={String(guestTotal(event.guests))} />
            <Meta label="Público" value={guestsSummary(event.guests)} wide />
            <Meta label="Chegada da equipe" value={event.teamArrival} />
            <Meta label="Cerimônia" value={event.ceremonyTime} />
            <Meta label="Convite" value={event.invitationTime} />
            <Meta label="Serviço" value={event.serviceTime} />
            <Meta label="Duração" value={event.serviceDuration} />
          </View>
        ) : null}

        {showCozinha && event.dietaryNotes ? (
          <View style={styles.alert}>
            <Text style={styles.alertTitle}>Restrições alimentares</Text>
            <Text style={styles.note}>{event.dietaryNotes}</Text>
          </View>
        ) : null}

        {showCardapio
          ? eventMenuSections(event).map((section) => {
              const items = section.items.filter((item) => item.name.trim());
              if (!items.length) return null;
              const title = section.time ? `${section.title} · ${section.time}` : section.title;
              return (
                <View key={section.id}>
                  <Text style={styles.sectionTitle}>{title}</Text>
                  <View style={styles.item}>
                    <Text
                      style={[
                        styles.itemQty,
                        { fontSize: 6.5, letterSpacing: 0.5, textTransform: "uppercase", color: colors.muted },
                      ]}
                    >
                      Per capita
                    </Text>
                    <Text
                      style={[
                        styles.itemName,
                        { fontSize: 6.5, letterSpacing: 0.5, textTransform: "uppercase", color: colors.muted },
                      ]}
                    >
                      Prato
                    </Text>
                    <Text
                      style={[
                        styles.itemNotes,
                        { fontSize: 6.5, letterSpacing: 0.5, textTransform: "uppercase" },
                      ]}
                    >
                      Obs
                    </Text>
                  </View>
                  {items.map((item) => (
                    <View key={item.id} style={styles.item}>
                      <Text style={styles.itemQty}>{item.quantity}</Text>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemNotes}>{item.notes}</Text>
                    </View>
                  ))}
                </View>
              );
            })
          : null}

        {showBebidas && (drinks.length > 0 || event.drinksNotes) ? (
          <View>
            <Text style={styles.sectionTitle}>Bebidas</Text>
            {drinks.map((item) => (
              <View key={item.key} style={styles.item}>
                <Text style={styles.itemName}>{item.label}</Text>
                <Text style={styles.itemNotes}>{event.drinks[item.key]}</Text>
              </View>
            ))}
            {event.drinksNotes ? <Text style={styles.note}>{event.drinksNotes}</Text> : null}
          </View>
        ) : null}

        {showEquipe && (staff.length > 0 || (event.laborAllocations ?? []).length > 0) ? (
          <View>
            <Text style={styles.sectionTitle}>Equipe</Text>
            {staff.map((item) => (
              <View key={item.key} style={styles.item}>
                <Text style={styles.itemName}>{item.label}</Text>
                <Text style={styles.itemNotes}>{String(item.quantity)}</Text>
              </View>
            ))}
            {(event.laborAllocations ?? []).length > 0 ? (
              <View style={styles.item}>
                <Text style={styles.itemName}>Equipe externa</Text>
                <Text style={styles.itemNotes}>{String(event.laborAllocations.length)} prestadores</Text>
              </View>
            ) : null}
            {event.laborOvertime ? (
              <View style={styles.item}>
                <Text style={styles.itemName}>Hora extra</Text>
                <Text style={styles.itemNotes}>
                  {event.laborOvertimeHours ? `${event.laborOvertimeHours} h` : "Sim"}
                </Text>
              </View>
            ) : null}
            {event.laborApplyAllowance ? (
              <View style={styles.item}>
                <Text style={styles.itemName}>Ajuda de custo</Text>
                <Text style={styles.itemNotes}>Sim</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {showEquipe && uniforms.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Fardamentos</Text>
            {uniforms.map((piece) => (
              <View key={piece.key} style={styles.item}>
                <Text style={styles.itemName}>{piece.label}</Text>
                <Text style={styles.itemNotes}>
                  {formatUniformSizeLine(piece.sizes, UNIFORM_SIZE_LABELS, "   ")}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {showLogistica ? (
          <View>
            <Text style={styles.sectionTitle}>Extras e logística</Text>
            <View style={styles.item}>
              <Text style={styles.itemName}>Ilhas</Text>
              <Text style={styles.itemNotes}>{String(event.islands ?? 0)}</Text>
            </View>
            {alcoholSummary(event.logistics) ? (
              <Text style={styles.note}>{alcoholSummary(event.logistics)}</Text>
            ) : (
              <View style={styles.item}>
                <Text style={styles.itemName}>Bebidas alcoólicas</Text>
                <Text style={styles.itemNotes}>{yn(event.logistics.alcoholServed)}</Text>
              </View>
            )}
            <View style={styles.item}>
              <Text style={styles.itemName}>Material no dia anterior</Text>
              <Text style={styles.itemNotes}>{yn(event.logistics.materialPreviousDay)}</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemName}>Mesa cavalete</Text>
              <Text style={styles.itemNotes}>{yn(event.logistics.trestleTable)}</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemName}>Recolher material ao final</Text>
              <Text style={styles.itemNotes}>{yn(event.logistics.mustCollectMaterial)}</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemName}>Cozinha / forno / freezer / micro-ondas</Text>
              <Text style={styles.itemNotes}>
                {yn(event.logistics.hasKitchen)} / {yn(event.logistics.hasOven)} / {yn(event.logistics.hasFreezer)} /{" "}
                {yn(event.logistics.hasMicrowave)}
              </Text>
            </View>
          </View>
        ) : null}

        {showVeiculos ? (
          <View>
            <Text style={styles.sectionTitle}>Veículos</Text>
            <View style={styles.item}>
              <Text style={styles.itemName}>Fora da cidade</Text>
              <Text style={styles.itemNotes}>{event.outOfTown ? "Sim" : "Não"}</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemName}>Veículos alocados</Text>
              <Text style={styles.itemNotes}>{String((event.vehicleIds ?? []).length)}</Text>
            </View>
          </View>
        ) : null}

        {showCozinha && event.menuSetupNotes ? (
          <View>
            <Text style={styles.sectionTitle}>Observações — cozinha</Text>
            <Text style={styles.note}>{event.menuSetupNotes}</Text>
          </View>
        ) : null}

        {showCozinha && event.managementNotes ? (
          <View>
            <Text style={styles.sectionTitle}>Gerenciais e Evento</Text>
            <Text style={styles.note}>{event.managementNotes}</Text>
          </View>
        ) : null}

        {showLogisticaNotes && event.logisticsNotes ? (
          <View>
            <Text style={styles.sectionTitle}>Observações — logística</Text>
            <Text style={styles.note}>{event.logisticsNotes}</Text>
          </View>
        ) : null}

        <View style={styles.footer} fixed wrap={false}>
          <Text>
            {showLogistica
              ? `Material dia anterior: ${yn(event.logistics.materialPreviousDay)} · Cavalete: ${yn(event.logistics.trestleTable)}`
              : event.code}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Pág. ${pageNumber} de ${totalPages} · ${new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
            }
          />
        </View>
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
