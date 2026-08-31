"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { formatLongDate } from "@/lib/dates";

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
  hint: { fontSize: 9, color: colors.muted, marginBottom: 10 },
  sectionTitle: {
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: 10,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.6,
    borderBottomColor: colors.line,
    paddingVertical: 7,
    alignItems: "center",
  },
  check: { width: 16, fontSize: 11, color: colors.muted },
  name: { flex: 3, fontSize: 10 },
  meta: { flex: 2, fontSize: 8, color: colors.muted },
  qtyBox: {
    width: 56,
    height: 16,
    borderWidth: 0.8,
    borderColor: colors.line,
    marginLeft: 8,
  },
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
  sign: { fontSize: 9, marginTop: 18, color: colors.muted },
});

export interface CountSheetRow {
  name: string;
  category: string;
  location: string;
  unit: string;
}

function CountSheetDocument({
  date,
  rows,
  filters,
}: {
  date: string;
  rows: CountSheetRow[];
  filters: string;
}) {
  const categories = Array.from(new Set(rows.map((row) => row.category))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Casa Braga · Inventário</Text>
          <Text style={styles.title}>Folha de contagem</Text>
          <Text style={styles.subtitle}>
            {date ? formatLongDate(date) : "Data a preencher"} · uma linha por variação · anote a quantidade e lance depois no sistema
          </Text>
        </View>
        <Text style={styles.hint}>{filters}</Text>
        <View style={styles.row}>
          <Text style={[styles.check, { fontFamily: "Helvetica-Bold", fontSize: 8 }]} />
          <Text style={[styles.name, { fontFamily: "Helvetica-Bold", fontSize: 8 }]}>MATERIAL</Text>
          <Text style={[styles.meta, { fontFamily: "Helvetica-Bold" }]}>LOCAL</Text>
          <Text style={{ width: 56, fontSize: 8, textAlign: "center", fontFamily: "Helvetica-Bold" }}>
            QTD
          </Text>
        </View>
        {categories.map((category) => (
          <View key={category}>
            <Text style={styles.sectionTitle}>{category}</Text>
            {rows
              .filter((row) => row.category === category)
              .map((row, index) => (
                <View key={`${row.name}-${index}`} style={styles.row}>
                  <Text style={styles.check}>{"\u2610"}</Text>
                  <Text style={styles.name}>
                    {row.name}
                    {row.unit ? ` (${row.unit})` : ""}
                  </Text>
                  <Text style={styles.meta}>{row.location || "—"}</Text>
                  <View style={styles.qtyBox} />
                </View>
              ))}
          </View>
        ))}
        <Text style={styles.sign}>Responsável: ________________________    Participantes: ________________________</Text>
        <View style={styles.footer}>
          <Text>Uso interno — sem valores financeiros</Text>
          <Text>
            Impresso em{" "}
            {new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadCountSheetPdf(opts: {
  date: string;
  rows: CountSheetRow[];
  filters: string;
}) {
  const blob = await pdf(
    <CountSheetDocument date={opts.date} rows={opts.rows} filters={opts.filters} />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const day = opts.date || new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `contagem-inventario-${day}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
