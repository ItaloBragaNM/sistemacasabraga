"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { formatInt } from "@/lib/crm/format";
import { formatShortDate } from "@/lib/dates";
import type { MaterialWeekRow, OccupyingEvent } from "@/lib/logistica/alocacao";

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
  header: { backgroundColor: colors.petrol, color: colors.cream, padding: 16, marginBottom: 14 },
  brand: { fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  title: { fontSize: 20, fontFamily: "Times-Bold" },
  subtitle: { fontSize: 10, marginTop: 4, color: colors.cream },
  summary: { fontSize: 10, marginBottom: 12, color: colors.muted },
  empty: { fontSize: 11, color: colors.muted, marginTop: 8 },
  sectionTitle: {
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.6,
    borderBottomColor: colors.line,
    paddingVertical: 7,
    alignItems: "flex-start",
  },
  name: { flex: 3, fontSize: 10 },
  num: { width: 52, fontSize: 10, textAlign: "right" },
  meta: { flex: 2.4, fontSize: 8, color: colors.muted, paddingLeft: 8 },
  shortage: { width: 52, fontSize: 10, textAlign: "right", color: colors.terracotta, fontFamily: "Helvetica-Bold" },
  eventTitle: { flex: 3, fontSize: 10 },
  eventMeta: { flex: 2, fontSize: 8, color: colors.muted },
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

function RuptureDocument({
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
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Casa Braga · Logística</Text>
          <Text style={styles.title}>Rupturas da semana</Text>
          <Text style={styles.subtitle}>
            {weekLabel} · material locado da entrega ao recolhimento
          </Text>
        </View>
        <Text style={styles.summary}>
          {ruptures.length === 0
            ? "Nenhuma ruptura nesta semana: o estoque cobre o pico de eventos simultâneos."
            : `${ruptures.length} material(is) com demanda maior que o estoque em pelo menos um dia.`}
        </Text>

        {ruptures.length === 0 ? (
          <Text style={styles.empty}>Estoque suficiente para os eventos alocados nesta semana.</Text>
        ) : (
          <>
            <View style={styles.row}>
              <Text style={[styles.name, { fontFamily: "Helvetica-Bold", fontSize: 8 }]}>MATERIAL</Text>
              <Text style={[styles.num, { fontFamily: "Helvetica-Bold", fontSize: 8 }]}>ESTOQUE</Text>
              <Text style={[styles.num, { fontFamily: "Helvetica-Bold", fontSize: 8 }]}>PICO</Text>
              <Text style={[styles.shortage, { fontSize: 8 }]}>FALTA</Text>
              <Text style={[styles.meta, { fontFamily: "Helvetica-Bold" }]}>DIAS EM RUPTURA</Text>
            </View>
            {ruptures.map((row) => {
              const ruptureDays = row.days
                .map((cell, index) =>
                  cell.shortage > 0
                    ? `${formatShortDate(days[index])}: ${formatInt(cell.demand)} / ${formatInt(cell.stock)}`
                    : "",
                )
                .filter(Boolean)
                .join(" · ");
              return (
                <View key={row.materialId} style={styles.row} wrap={false}>
                  <Text style={styles.name}>
                    {row.name}
                    {row.unit ? ` (${row.unit})` : ""}
                    {"\n"}
                    <Text style={{ fontSize: 8, color: colors.muted }}>{row.category}</Text>
                  </Text>
                  <Text style={styles.num}>{formatInt(row.stock)}</Text>
                  <Text style={styles.num}>{formatInt(row.peak)}</Text>
                  <Text style={styles.shortage}>{formatInt(row.shortage)}</Text>
                  <Text style={styles.meta}>{ruptureDays}</Text>
                </View>
              );
            })}
          </>
        )}

        <Text style={styles.sectionTitle}>Eventos na janela</Text>
        {events.length === 0 ? (
          <Text style={styles.empty}>Nenhum evento com material alocado nesta semana.</Text>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.row} wrap={false}>
              <Text style={styles.eventTitle}>
                {event.title}
                {event.code ? ` · ${event.code}` : ""}
              </Text>
              <Text style={styles.eventMeta}>
                {formatShortDate(event.start)} → {formatShortDate(event.end)}
                {event.assumedDelivery || event.assumedPickup ? " · data assumida" : ""}
              </Text>
            </View>
          ))
        )}

        <View style={styles.footer}>
          <Text>Uso interno — confronto estoque × eventos simultâneos</Text>
          <Text>
            Impresso em{" "}
            {new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </Text>
        </View>
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
    <RuptureDocument
      weekLabel={opts.weekLabel}
      days={opts.days}
      ruptures={opts.ruptures}
      events={opts.events}
    />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rupturas-alocacao-${opts.fileStamp}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
