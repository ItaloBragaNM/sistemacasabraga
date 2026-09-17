"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { formatLongDate } from "@/lib/dates";
import { downloadBlob } from "@/lib/download";
import { LOSS_REASONS } from "@/lib/cozinha/types";

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
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 28,
    fontFamily: "Helvetica",
    color: colors.forest,
  },
  header: { backgroundColor: colors.petrol, color: colors.cream, padding: 14, marginBottom: 12 },
  brand: { fontSize: 8, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 },
  title: { fontSize: 18, fontFamily: "Times-Bold" },
  subtitle: { fontSize: 9, marginTop: 3, color: colors.cream },
  meta: { flexDirection: "row", gap: 10, marginBottom: 10 },
  metaBox: {
    flex: 1,
    borderWidth: 0.7,
    borderColor: colors.line,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  metaLabel: { fontSize: 7, letterSpacing: 0.8, textTransform: "uppercase", color: colors.muted, marginBottom: 10 },
  hint: { fontSize: 8, color: colors.muted, marginBottom: 8 },
  legend: { fontSize: 8, color: colors.muted, marginBottom: 8 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.forest,
    color: colors.cream,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  th: { fontSize: 7, letterSpacing: 0.5, textTransform: "uppercase" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.6,
    borderBottomColor: colors.line,
    paddingVertical: 9,
    paddingHorizontal: 6,
  },
  cellLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.line,
    height: 10,
  },
  signRow: { flexDirection: "row", gap: 16, marginTop: 16 },
  signBox: { flex: 1, borderTopWidth: 0.7, borderTopColor: colors.line, paddingTop: 6 },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 28,
    right: 28,
    fontSize: 7,
    color: colors.muted,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

const BLANK_ROWS = 12;

function LossFormDocument({ dateLabel }: { dateLabel: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.header}>
          <Text style={styles.brand}>Casa Braga · Cozinha</Text>
          <Text style={styles.title}>Registro de perdas</Text>
          <Text style={styles.subtitle}>Ficha de 1 página para preenchimento à mão</Text>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Data</Text>
            <View style={styles.cellLine} />
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Evento / local</Text>
            <View style={styles.cellLine} />
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Responsável</Text>
            <View style={styles.cellLine} />
          </View>
        </View>

        <Text style={styles.hint}>
          Preencha os itens perdidos na cozinha e lance depois em Cozinha → Controle de Perdas.
        </Text>
        <Text style={styles.legend}>
          Motivos: {LOSS_REASONS.map((item) => item.label).join(" · ")}
        </Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 2.6 }]}>Insumo</Text>
          <Text style={[styles.th, { width: 36 }]}>Un.</Text>
          <Text style={[styles.th, { width: 48, textAlign: "right" }]}>Qtd</Text>
          <Text style={[styles.th, { flex: 1.6 }]}>Motivo</Text>
          <Text style={[styles.th, { flex: 1.8 }]}>Observação</Text>
        </View>
        {Array.from({ length: BLANK_ROWS }).map((_, index) => (
          <View key={index} style={styles.row}>
            <View style={{ flex: 2.6, paddingRight: 6 }}>
              <View style={styles.cellLine} />
            </View>
            <View style={{ width: 36, paddingRight: 6 }}>
              <View style={styles.cellLine} />
            </View>
            <View style={{ width: 48, paddingRight: 6 }}>
              <View style={styles.cellLine} />
            </View>
            <View style={{ flex: 1.6, paddingRight: 6 }}>
              <View style={styles.cellLine} />
            </View>
            <View style={{ flex: 1.8 }}>
              <View style={styles.cellLine} />
            </View>
          </View>
        ))}

        <View style={styles.signRow}>
          <View style={styles.signBox}>
            <Text style={{ fontSize: 8, color: colors.muted }}>Assinatura da cozinha</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={{ fontSize: 8, color: colors.muted }}>Conferido por</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Casa Braga · Controle de perdas</Text>
          <Text>Impresso em {dateLabel}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadLossRegisterPdf() {
  const dateLabel = formatLongDate(new Date().toISOString().slice(0, 10));
  const blob = await pdf(<LossFormDocument dateLabel={dateLabel} />).toBlob();
  downloadBlob(blob, "registro-perdas.pdf");
}
