"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { LOSS_REASONS } from "@/lib/cozinha/types";
import { formatShortDate } from "@/lib/dates";
import { downloadBlob } from "@/lib/download";
import { PDF_FONT } from "@/lib/pdf/fonts";
import { PDF, PdfFooter, PdfHeader, pdfStyles } from "@/lib/pdf/header";

const ink = PDF.ink;
/** Preenche a folha A4 inteira sem passar para uma segunda página. */
const BLANK_ROWS = 22;

const styles = StyleSheet.create({
  grid: {
    borderTopWidth: 0.9,
    borderLeftWidth: 0.9,
    borderColor: ink,
  },
  row: { flexDirection: "row" },
  metaCell: {
    flex: 1,
    borderRightWidth: 0.9,
    borderBottomWidth: 0.9,
    borderColor: ink,
    minHeight: 36,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  label: { fontSize: 7, fontFamily: PDF_FONT, fontWeight: 700, marginBottom: 8 },
  headCell: {
    borderRightWidth: 0.9,
    borderBottomWidth: 0.9,
    borderColor: ink,
    minHeight: 22,
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  headText: { fontSize: 7, fontFamily: PDF_FONT, fontWeight: 700 },
  dataCell: {
    borderRightWidth: 0.9,
    borderBottomWidth: 0.9,
    borderColor: ink,
    minHeight: 24,
  },
  legend: { fontSize: 8, marginTop: 8, marginBottom: 8, lineHeight: 1.35 },
  notes: {
    marginTop: 10,
    borderWidth: 0.9,
    borderColor: ink,
    minHeight: 48,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  notesLabel: { fontSize: 8, fontFamily: PDF_FONT, fontWeight: 700 },
  signRow: { flexDirection: "row", marginTop: 10 },
  signCell: {
    flex: 1,
    borderWidth: 0.9,
    borderColor: ink,
    minHeight: 42,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginRight: 8,
  },
  signCellLast: { marginRight: 0 },
});

const COLUMNS = [
  { label: "Insumo", width: "32%" },
  { label: "Un.", width: "8%" },
  { label: "Quantidade", width: "14%" },
  { label: "Motivo", width: "22%" },
  { label: "Observação", width: "24%" },
];

export function LossFormDocument({ dateLabel }: { dateLabel: string }) {
  return (
    <Document title="Registro de Desperdícios">
      <Page size="A4" style={pdfStyles.page} wrap={false}>
        <PdfHeader title="Registro de Desperdícios" meta="Cozinha · preencha à mão e lance no sistema" right={`Impresso em ${dateLabel}`} />

        <View style={styles.grid}>
          <View style={styles.row}>
            {["Data", "Evento / local", "Responsável"].map((label) => (
              <View key={label} style={styles.metaCell}>
                <Text style={styles.label}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.legend}>
          Motivos: {LOSS_REASONS.map((item) => item.label).join("  ·  ")}
        </Text>

        <View style={styles.grid}>
          <View style={styles.row}>
            {COLUMNS.map((column) => (
              <View key={column.label} style={[styles.headCell, { width: column.width }]}>
                <Text style={styles.headText}>{column.label}</Text>
              </View>
            ))}
          </View>
          {Array.from({ length: BLANK_ROWS }).map((_, index) => (
            <View key={index} style={styles.row} wrap={false}>
              {COLUMNS.map((column) => (
                <View key={column.label} style={[styles.dataCell, { width: column.width }]} />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.notes}>
          <Text style={styles.notesLabel}>Observações</Text>
        </View>

        <View style={styles.signRow}>
          <View style={styles.signCell}>
            <Text style={styles.notesLabel}>Assinatura da cozinha</Text>
          </View>
          <View style={[styles.signCell, styles.signCellLast]}>
            <Text style={styles.notesLabel}>Conferido por</Text>
          </View>
        </View>

        <PdfFooter label="Cozinha · Registro de Desperdícios" />
      </Page>
    </Document>
  );
}

export async function downloadLossRegisterPdf() {
  const dateLabel = formatShortDate(new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }));
  const blob = await pdf(<LossFormDocument dateLabel={dateLabel} />).toBlob();
  downloadBlob(blob, "registro-desperdicios.pdf");
}
