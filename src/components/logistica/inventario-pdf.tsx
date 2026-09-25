"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { formatInt } from "@/lib/crm/format";
import { formatLongDate } from "@/lib/dates";
import { PDF_FONT, registerPdfFonts } from "@/lib/pdf/fonts";

registerPdfFonts();

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
    fontFamily: PDF_FONT,
    color: colors.forest,
  },
  header: { backgroundColor: colors.petrol, color: colors.cream, padding: 16, marginBottom: 14 },
  brand: { fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  title: { fontSize: 20, fontFamily: PDF_FONT, fontWeight: 700 },
  subtitle: { fontSize: 10, marginTop: 4, color: colors.cream },
  hint: { fontSize: 9, color: colors.muted, marginBottom: 10 },
  sectionTitle: {
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: 10,
    marginBottom: 4,
    fontFamily: PDF_FONT, fontWeight: 700,
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
  responsible,
  rows,
  filters,
}: {
  date: string;
  responsible: string;
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
            {date ? formatLongDate(date) : "Data a preencher"}
            {responsible.trim() ? ` · Responsável: ${responsible.trim()}` : ""}
            {" · uma linha por variação · anote a quantidade e lance depois no sistema"}
          </Text>
        </View>
        <Text style={styles.hint}>{filters}</Text>
        <View style={styles.row}>
          <Text style={[styles.check, { fontFamily: PDF_FONT, fontWeight: 700, fontSize: 8 }]} />
          <Text style={[styles.name, { fontFamily: PDF_FONT, fontWeight: 700, fontSize: 8 }]}>MATERIAL</Text>
          <Text style={[styles.meta, { fontFamily: PDF_FONT, fontWeight: 700 }]}>LOCAL</Text>
          <Text style={{ width: 56, fontSize: 8, textAlign: "center", fontFamily: PDF_FONT, fontWeight: 700 }}>
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
        <Text style={styles.sign}>
          Responsável: {responsible.trim() || "________________________"}    Participantes: ________________________
        </Text>
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
  responsible: string;
  rows: CountSheetRow[];
  filters: string;
}) {
  const blob = await pdf(
    <CountSheetDocument
      date={opts.date}
      responsible={opts.responsible}
      rows={opts.rows}
      filters={opts.filters}
    />,
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

export interface InventoryPrintRow {
  name: string;
  category: string;
  previous: number;
  counted: number;
}

function InventorySessionDocument({
  date,
  responsible,
  participants,
  note,
  rows,
  skipped,
}: {
  date: string;
  responsible: string;
  participants: string[];
  note: string;
  rows: InventoryPrintRow[];
  skipped: number;
}) {
  const categories = Array.from(new Set(rows.map((row) => row.category))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  const changed = rows.filter((row) => row.counted !== row.previous).length;
  const people = [responsible, ...participants].filter(Boolean).join(" · ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Casa Braga · Inventário</Text>
          <Text style={styles.title}>Inventário realizado</Text>
          <Text style={styles.subtitle}>
            {date ? formatLongDate(date) : "—"}
            {people ? ` · ${people}` : ""}
          </Text>
        </View>
        {note ? <Text style={styles.hint}>{note}</Text> : null}
        <Text style={styles.hint}>
          {rows.length} item(ns) contado(s)
          {changed > 0 ? ` · ${changed} com diferença` : " · sem diferenças"}
          {skipped > 0 ? ` · ${skipped} oculto(s)` : ""}
        </Text>
        <View style={styles.row}>
          <Text style={[styles.name, { fontFamily: PDF_FONT, fontWeight: 700, fontSize: 8 }]}>MATERIAL</Text>
          <Text style={{ width: 54, fontSize: 8, textAlign: "right", fontFamily: PDF_FONT, fontWeight: 700 }}>
            ANT.
          </Text>
          <Text style={{ width: 54, fontSize: 8, textAlign: "right", fontFamily: PDF_FONT, fontWeight: 700 }}>
            CONTADO
          </Text>
          <Text style={{ width: 54, fontSize: 8, textAlign: "right", fontFamily: PDF_FONT, fontWeight: 700 }}>
            DIFF.
          </Text>
        </View>
        {categories.map((category) => (
          <View key={category}>
            <Text style={styles.sectionTitle}>{category}</Text>
            {rows
              .filter((row) => row.category === category)
              .map((row, index) => {
                const diff = row.counted - row.previous;
                return (
                  <View key={`${row.name}-${index}`} style={styles.row} wrap={false}>
                    <Text style={styles.name}>{row.name}</Text>
                    <Text style={{ width: 54, fontSize: 10, textAlign: "right", color: colors.muted }}>
                      {formatInt(row.previous)}
                    </Text>
                    <Text style={{ width: 54, fontSize: 10, textAlign: "right" }}>
                      {formatInt(row.counted)}
                    </Text>
                    <Text
                      style={{
                        width: 54,
                        fontSize: 10,
                        textAlign: "right",
                        color: diff === 0 ? colors.muted : diff > 0 ? colors.forest : "#C45C4A",
                      }}
                    >
                      {diff > 0 ? "+" : ""}
                      {formatInt(diff)}
                    </Text>
                  </View>
                );
              })}
          </View>
        ))}
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

export async function downloadInventorySessionPdf(opts: {
  date: string;
  responsible: string;
  participants: string[];
  note: string;
  rows: InventoryPrintRow[];
  skipped: number;
}) {
  const blob = await pdf(
    <InventorySessionDocument
      date={opts.date}
      responsible={opts.responsible}
      participants={opts.participants}
      note={opts.note}
      rows={opts.rows}
      skipped={opts.skipped}
    />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const day = opts.date || new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `inventario-${day}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
