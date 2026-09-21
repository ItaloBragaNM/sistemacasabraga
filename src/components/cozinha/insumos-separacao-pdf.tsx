"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { formatLongDate } from "@/lib/dates";
import { downloadBlob, slugify } from "@/lib/download";
import type { CatalogDishGroup } from "@/lib/cozinha/calc";
import type { EventRecord } from "@/lib/types";

const colors = {
  forest: "#1E443E",
  petrol: "#003F3C",
  cream: "#FFFBFA",
  muted: "#5D6F6C",
  line: "#C9D5D1",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.cream,
    paddingTop: 26,
    paddingBottom: 36,
    paddingHorizontal: 30,
    fontFamily: "Helvetica",
    color: colors.forest,
  },
  header: { backgroundColor: colors.petrol, color: colors.cream, padding: 14, marginBottom: 12 },
  brand: { fontSize: 8, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 },
  title: { fontSize: 17, fontFamily: "Times-Bold" },
  subtitle: { fontSize: 9, marginTop: 3, color: colors.cream },
  dishTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.forest,
    color: colors.cream,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  th: { fontSize: 7.5, letterSpacing: 0.5, textTransform: "uppercase" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.6,
    borderBottomColor: colors.line,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  box: { width: 12, height: 12, borderWidth: 0.8, borderColor: colors.line, marginRight: 8 },
  name: { flex: 3, fontSize: 9 },
  qtyBox: {
    width: 52,
    height: 14,
    borderWidth: 0.8,
    borderColor: colors.line,
    marginLeft: 6,
  },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 30,
    right: 30,
    fontSize: 7,
    color: colors.muted,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function Header({ event }: { event: EventRecord }) {
  return (
    <View style={styles.header}>
      <Text style={styles.brand}>Casa Braga · Cozinha</Text>
      <Text style={styles.title}>Separação de insumos</Text>
      <Text style={styles.subtitle}>
        {event.code} · {event.title || "Evento"} · {event.date ? formatLongDate(event.date) : "Data a definir"}
      </Text>
    </View>
  );
}

function Notes({ notes }: { notes: string }) {
  if (!notes.trim()) return null;
  return (
    <View style={{ marginTop: 14, borderWidth: 0.6, borderColor: colors.line, padding: 8 }}>
      <Text style={{ fontSize: 7, letterSpacing: 1, textTransform: "uppercase", color: colors.muted, marginBottom: 4 }}>
        Observações
      </Text>
      <Text style={{ fontSize: 9 }}>{notes}</Text>
    </View>
  );
}

function Footer({ event }: { event: EventRecord }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Separação de insumos · {event.code}</Text>
      <Text render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

function CatalogDocument({
  event,
  groups,
  notes,
}: {
  event: EventRecord;
  groups: CatalogDishGroup[];
  notes: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header event={event} />
        <Text style={{ fontSize: 8, color: colors.muted, marginBottom: 8 }}>
          Lista sem quantidade calculada. Marque o que foi separado e anote a quantidade à mão.
        </Text>
        {groups.map((group) => (
          <View key={group.dishId} wrap={false}>
            <Text style={styles.dishTitle}>{group.dishName}</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 20 }]}> </Text>
              <Text style={[styles.th, { flex: 3 }]}>Insumo</Text>
              <Text style={[styles.th, { width: 70, textAlign: "right" }]}>Quantidade</Text>
            </View>
            {group.items.map((line) => (
              <View key={line.insumoId} style={styles.row}>
                <View style={styles.box} />
                <Text style={styles.name}>
                  {line.name}
                  {line.unit ? ` (${line.unit})` : ""}
                </Text>
                <View style={styles.qtyBox} />
              </View>
            ))}
          </View>
        ))}
        <Notes notes={notes} />
        <Footer event={event} />
      </Page>
    </Document>
  );
}

export async function downloadCatalogSeparationPdf(
  event: EventRecord,
  groups: CatalogDishGroup[],
  notes: string,
) {
  const blob = await pdf(<CatalogDocument event={event} groups={groups} notes={notes} />).toBlob();
  downloadBlob(blob, `separacao-insumos-pratos-${event.code.toLowerCase()}-${slugify(event.title) || "evento"}.pdf`);
}
