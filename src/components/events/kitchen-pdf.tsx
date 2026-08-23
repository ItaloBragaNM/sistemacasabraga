"use client";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { formatLongDate, formatWeekday } from "@/lib/dates";
import { EVENT_TYPE_LABELS, SERVICE_STYLE_LABELS } from "@/lib/labels";
import { guestTotal, MENU_SECTIONS, type EventRecord } from "@/lib/types";

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
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 32,
    fontFamily: "Helvetica",
    color: colors.forest,
  },
  header: {
    backgroundColor: colors.petrol,
    color: colors.cream,
    padding: 16,
    marginBottom: 14,
  },
  brand: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontFamily: "Times-Bold",
  },
  subtitle: {
    fontSize: 10,
    marginTop: 4,
    color: colors.cream,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  meta: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 8,
  },
  metaLabel: {
    fontSize: 7,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  alert: {
    backgroundColor: "#F8D9D7",
    borderWidth: 1,
    borderColor: colors.terracotta,
    padding: 10,
    marginBottom: 12,
  },
  alertTitle: {
    color: colors.terracotta,
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  sectionTitle: {
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 6,
    color: colors.forest,
    fontFamily: "Helvetica-Bold",
  },
  item: {
    flexDirection: "row",
    borderBottomWidth: 0.6,
    borderBottomColor: colors.line,
    paddingVertical: 4,
  },
  itemName: { flex: 3, fontSize: 10 },
  itemQty: { flex: 1, fontSize: 10, textAlign: "right" },
  itemNotes: { flex: 2, fontSize: 9, color: colors.muted, textAlign: "right" },
  note: { fontSize: 10, lineHeight: 1.4 },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    fontSize: 8,
    color: colors.muted,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

export function KitchenDocument({ event }: { event: EventRecord }) {
  const kitchenStaff = event.staff.filter((member) =>
    /chef|cozin|confeit|aux/i.test(`${member.role} ${member.name}`),
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Casa Braga · Ficha de Cozinha</Text>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.subtitle}>
            {event.code} · {EVENT_TYPE_LABELS[event.type]} ·{" "}
            {SERVICE_STYLE_LABELS[event.serviceStyle]}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Meta
            label="Data"
            value={`${formatWeekday(event.date)}, ${formatLongDate(event.date)}`}
          />
          <Meta label="Serviço" value={`${event.startTime} – ${event.endTime}`} />
          <Meta label="Pax" value={String(guestTotal(event.guests))} />
        </View>
        <View style={styles.metaRow}>
          <Meta label="Local" value={event.venue.name} />
          <Meta
            label="Montagem / desmontagem"
            value={`${event.assemblyTime} / ${event.teardownTime}`}
          />
          <Meta
            label="Público"
            value={`${event.guests.adults} adultos · ${event.guests.children} crianças`}
          />
        </View>

        {event.menu.dietaryNotes ? (
          <View style={styles.alert}>
            <Text style={styles.alertTitle}>Restrições e alergias</Text>
            <Text style={styles.note}>{event.menu.dietaryNotes}</Text>
          </View>
        ) : null}

        {MENU_SECTIONS.map((section) => {
          const items = event.menu[section.key].filter((item) => item.name.trim());
          if (!items.length) return null;
          return (
            <View key={section.key} wrap={false}>
              <Text style={styles.sectionTitle}>{section.label}</Text>
              {items.map((item) => (
                <View key={item.id} style={styles.item}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>{item.quantity}</Text>
                  <Text style={styles.itemNotes}>{item.notes}</Text>
                </View>
              ))}
            </View>
          );
        })}

        {event.timeline.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Cronograma de serviço</Text>
            {event.timeline.map((item) => (
              <View key={item.id} style={styles.item}>
                <Text style={[styles.itemName, { flex: 1 }]}>{item.time}</Text>
                <Text style={[styles.itemName, { flex: 4 }]}>{item.activity}</Text>
                <Text style={styles.itemNotes}>{item.owner}</Text>
              </View>
            ))}
          </View>
        )}

        {kitchenStaff.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Equipe de cozinha</Text>
            {kitchenStaff.map((item) => (
              <View key={item.id} style={styles.item}>
                <Text style={styles.itemName}>
                  {item.quantity}× {item.role}
                  {item.name ? ` — ${item.name}` : ""}
                </Text>
                <Text style={styles.itemNotes}>{item.shift}</Text>
              </View>
            ))}
          </View>
        )}

        {event.menu.kitchenNotes ? (
          <View>
            <Text style={styles.sectionTitle}>Observações da cozinha</Text>
            <Text style={styles.note}>{event.menu.kitchenNotes}</Text>
          </View>
        ) : null}

        {event.attentionPoints ? (
          <View>
            <Text style={styles.sectionTitle}>Pontos de atenção</Text>
            <Text style={styles.note}>{event.attentionPoints}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text>
            Operação: {event.operationalOwner || "—"} · Comercial:{" "}
            {event.commercialOwner || "—"}
          </Text>
          <Text>
            Impresso em{" "}
            {new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </Text>
        </View>
      </Page>
    </Document>
  );
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
  link.click();
  URL.revokeObjectURL(url);
}
