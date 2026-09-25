"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { formatShortDate } from "@/lib/dates";
import { downloadBlob, slugify } from "@/lib/download";
import type { CatalogDishGroup } from "@/lib/cozinha/calc";
import { PDF_FONT, registerPdfFonts } from "@/lib/pdf/fonts";
import type { EventRecord } from "@/lib/types";

registerPdfFonts();

const colors = {
  forest: "#1E443E",
  petrol: "#003F3C",
  cream: "#FFFBFA",
  muted: "#5D6F6C",
  line: "#C9D5D1",
  headerBg: "#E8EEEC",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.cream,
    paddingTop: 36,
    paddingBottom: 22,
    paddingHorizontal: 16,
    fontFamily: PDF_FONT,
    color: colors.forest,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.petrol,
    color: colors.cream,
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { fontSize: 7, letterSpacing: 1, textTransform: "uppercase", opacity: 0.75 },
  title: { fontSize: 10, fontFamily: PDF_FONT, fontWeight: 700 },
  headerRight: { fontSize: 7, textAlign: "right", color: colors.cream, opacity: 0.92 },
  columns: { flexDirection: "row", gap: 10 },
  column: { flex: 1 },
  dish: {
    backgroundColor: colors.headerBg,
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: 1,
  },
  dishText: { fontSize: 7, fontFamily: PDF_FONT, fontWeight: 700 },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 0.6,
    borderBottomColor: colors.forest,
    paddingBottom: 2,
    paddingHorizontal: 3,
    marginBottom: 1,
  },
  th: { fontSize: 6, letterSpacing: 0.4, textTransform: "uppercase", color: colors.muted },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.4,
    borderBottomColor: colors.line,
    paddingVertical: 1.5,
    paddingHorizontal: 3,
  },
  check: {
    width: 8,
    height: 8,
    borderWidth: 0.7,
    borderColor: colors.forest,
    marginRight: 4,
  },
  name: { flex: 1, fontSize: 7 },
  unit: { width: 28, fontSize: 6.5, color: colors.muted, textAlign: "right" },
  qty: {
    width: 28,
    height: 9,
    borderWidth: 0.6,
    borderColor: colors.line,
    marginLeft: 6,
  },
  notes: {
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: colors.line,
    padding: 4,
  },
  notesLabel: {
    fontSize: 6,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 2,
  },
  notesText: { fontSize: 7.5 },
  footer: {
    position: "absolute",
    bottom: 8,
    left: 16,
    right: 16,
    fontSize: 6.5,
    color: colors.muted,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function splitColumns(groups: CatalogDishGroup[]) {
  const total = groups.reduce((sum, group) => sum + 1 + group.items.length, 0);
  const target = Math.ceil(total / 2);
  const left: CatalogDishGroup[] = [];
  const right: CatalogDishGroup[] = [];
  let acc = 0;
  for (const group of groups) {
    if (acc < target) {
      left.push(group);
      acc += 1 + group.items.length;
    } else {
      right.push(group);
    }
  }
  return { left, right };
}

function Column({ groups, showHead }: { groups: CatalogDishGroup[]; showHead: boolean }) {
  if (groups.length === 0) return <View style={styles.column} />;
  return (
    <View style={styles.column}>
      {showHead ? (
        <View style={styles.tableHead}>
          <Text style={[styles.th, { width: 12 }]} />
          <Text style={[styles.th, { flex: 1 }]}>Insumo</Text>
          <Text style={[styles.th, { width: 28, textAlign: "right" }]}>Un.</Text>
          <Text style={[styles.th, { width: 34, textAlign: "right" }]}>Qtd</Text>
        </View>
      ) : null}
      {groups.map((group) => (
        <View key={group.dishId}>
          <View style={styles.dish}>
            <Text style={styles.dishText}>{group.dishName}</Text>
          </View>
          {group.items.map((line) => (
            <View key={line.insumoId} style={styles.row}>
              <View style={styles.check} />
              <Text style={styles.name}>{line.name}</Text>
              <Text style={styles.unit}>{line.unit || "—"}</Text>
              <View style={styles.qty} />
            </View>
          ))}
        </View>
      ))}
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
  const { left, right } = splitColumns(groups);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.brand}>Casa Braga · Cozinha</Text>
            <Text style={styles.title}>Separação de insumos</Text>
          </View>
          <Text style={styles.headerRight}>
            {event.code} · {event.title || "Evento"}
            {"\n"}
            {event.date ? formatShortDate(event.date) : "Data a definir"}
          </Text>
        </View>
        <View style={styles.columns}>
          <Column groups={left} showHead />
          <Column groups={right} showHead={right.length > 0} />
        </View>
        {notes.trim() ? (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Observações</Text>
            <Text style={styles.notesText}>{notes.trim()}</Text>
          </View>
        ) : null}
        <View style={styles.footer} fixed>
          <Text>Marque o separado e anote a quantidade.</Text>
          <Text render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} de ${totalPages}`} />
        </View>
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
  downloadBlob(
    blob,
    `separacao-insumos-pratos-${event.code.toLowerCase()}-${slugify(event.title) || "evento"}.pdf`,
  );
}
