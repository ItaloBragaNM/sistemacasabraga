"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { formatShortDate, formatWeekday } from "@/lib/dates";
import { EVENT_TYPE_LABELS, UNIFORM_SIZE_LABELS } from "@/lib/labels";
import {
  alcoholSummary,
  DRINK_ITEMS,
  eventMenuSections,
  eventStaffLines,
  formatUniformSizeLine,
  guestTotal,
  uniformPiecesForReport,
  type EventRecord,
} from "@/lib/types";

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
  meta: { fontSize: 8, color: colors.muted, marginBottom: 8 },
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

function compactMeta(event: EventRecord) {
  const parts = [
    event.date ? `${formatWeekday(event.date).slice(0, 3)} ${formatShortDate(event.date)}` : "",
    `${guestTotal(event.guests)} a servir`,
    event.serviceTime ? `serviço ${event.serviceTime}` : "",
    event.invitationTime ? `convite ${event.invitationTime}` : "",
  ].filter(Boolean);
  return parts.join("  ·  ");
}

export function KitchenDocument({ event }: { event: EventRecord }) {
  const drinks = DRINK_ITEMS.filter((item) => event.drinks[item.key].trim());
  const staff = eventStaffLines(event);
  const uniforms = uniformPiecesForReport(event.uniforms);

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

        <Text style={styles.meta}>{compactMeta(event)}</Text>

        {event.dietaryNotes ? (
          <View style={styles.alert}>
            <Text style={styles.alertTitle}>Restrições alimentares</Text>
            <Text style={styles.note}>{event.dietaryNotes}</Text>
          </View>
        ) : null}

        {eventMenuSections(event).map((section) => {
          const items = section.items.filter((item) => item.name.trim());
          if (!items.length) return null;
          const title = section.time ? `${section.title} · ${section.time}` : section.title;
          return (
            <View key={section.id}>
              <Text style={styles.sectionTitle}>{title}</Text>
              <View style={styles.item}>
                <Text style={[styles.itemQty, { fontSize: 6.5, letterSpacing: 0.5, textTransform: "uppercase", color: colors.muted }]}>
                  Per capita
                </Text>
                <Text style={[styles.itemName, { fontSize: 6.5, letterSpacing: 0.5, textTransform: "uppercase", color: colors.muted }]}>
                  Prato
                </Text>
                <Text style={[styles.itemNotes, { fontSize: 6.5, letterSpacing: 0.5, textTransform: "uppercase" }]}>
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
        })}

        {drinks.length > 0 || event.drinksNotes ? (
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

        {staff.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Equipe</Text>
            {staff.map((item) => (
              <View key={item.key} style={styles.item}>
                <Text style={styles.itemName}>{item.label}</Text>
                <Text style={styles.itemNotes}>{String(item.quantity)}</Text>
              </View>
            ))}
          </View>
        )}

        {uniforms.length > 0 ? (
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

        {alcoholSummary(event.logistics) ? (
          <View>
            <Text style={styles.sectionTitle}>Bebidas alcoólicas</Text>
            <Text style={styles.note}>{alcoholSummary(event.logistics)}</Text>
          </View>
        ) : null}

        {event.menuSetupNotes ? (
          <View>
            <Text style={styles.sectionTitle}>Observações — cozinha</Text>
            <Text style={styles.note}>{event.menuSetupNotes}</Text>
          </View>
        ) : null}

        {event.managementNotes ? (
          <View>
            <Text style={styles.sectionTitle}>Gerenciais e Evento</Text>
            <Text style={styles.note}>{event.managementNotes}</Text>
          </View>
        ) : null}

        {event.logisticsNotes ? (
          <View>
            <Text style={styles.sectionTitle}>Observações — logística</Text>
            <Text style={styles.note}>{event.logisticsNotes}</Text>
          </View>
        ) : null}

        <View style={styles.footer} fixed wrap={false}>
          <Text>
            Material dia anterior: {flag(event.logistics.materialPreviousDay)} · Cavalete:{" "}
            {flag(event.logistics.trestleTable)}
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

function flag(value: string) {
  if (value === "sim") return "Sim";
  if (value === "nao") return "Não";
  return "—";
}

export async function downloadKitchenPdf(event: EventRecord) {
  const blob = await pdf(<KitchenDocument event={event} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const slug = event.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  link.href = url;
  link.download = `ficha-cozinha-${event.code.toLowerCase()}-${slug || "evento"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
