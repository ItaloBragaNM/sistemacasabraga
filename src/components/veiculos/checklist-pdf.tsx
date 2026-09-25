"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { downloadBlob, slugify } from "@/lib/download";
import { formatLongDate } from "@/lib/dates";
import { VEHICLE_KIND_LABELS, VEHICLE_USAGE_CATEGORY_LABELS, type VeiculoRecord } from "@/lib/cadastros/types";
import { PDF_FONT, registerPdfFonts } from "@/lib/pdf/fonts";
import type { EventRecord } from "@/lib/types";

registerPdfFonts();

const colors = {
  forest: "#1E443E",
  petrol: "#003F3C",
  cream: "#FFFBFA",
  muted: "#5D6F6C",
  line: "#C9D5D1",
  terracotta: "#C45C4A",
};

const CHECK_ITEMS = [
  "Quilometragem",
  "Combustível",
  "Óleo / fluidos",
  "Pneus e estepe",
  "Luzes e setas",
  "Lataria e vidros",
  "Interior / limpeza",
  "Documentos (CRLV)",
  "Ferramentas / triângulo",
];

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.cream,
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: 32,
    fontFamily: PDF_FONT,
    color: colors.forest,
  },
  header: { backgroundColor: colors.petrol, color: colors.cream, padding: 16, marginBottom: 14 },
  brand: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  title: { fontSize: 18, fontFamily: PDF_FONT, fontWeight: 700 },
  subtitle: { fontSize: 10, marginTop: 4, color: colors.cream },
  hint: { fontSize: 9, color: colors.muted, marginBottom: 12 },
  grid: { flexDirection: "row", gap: 10, marginBottom: 12 },
  card: {
    flex: 1,
    borderWidth: 0.8,
    borderColor: colors.line,
    padding: 8,
  },
  label: { fontSize: 7, letterSpacing: 1, textTransform: "uppercase", color: colors.muted, marginBottom: 3 },
  value: { fontSize: 10 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.forest,
    color: colors.cream,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  th: { fontSize: 8, letterSpacing: 0.6, textTransform: "uppercase" },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.6,
    borderBottomColor: colors.line,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  item: { flex: 3, fontSize: 9 },
  col: { flex: 2, fontSize: 8, color: colors.muted },
  box: { width: 12, height: 12, borderWidth: 0.8, borderColor: colors.line, marginRight: 6 },
  checkLine: { flexDirection: "row", alignItems: "center" },
  notes: {
    marginTop: 14,
    borderWidth: 0.8,
    borderColor: colors.line,
    minHeight: 72,
    padding: 8,
  },
  notesTitle: { fontSize: 8, letterSpacing: 1, textTransform: "uppercase", color: colors.muted, marginBottom: 6 },
  signs: { flexDirection: "row", gap: 16, marginTop: 28 },
  signBox: { flex: 1 },
  signLine: { borderTopWidth: 0.8, borderTopColor: colors.forest, marginTop: 36, paddingTop: 6, fontSize: 8, color: colors.muted },
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

function ChecklistDocument({ event, vehicle }: { event: EventRecord; vehicle: VeiculoRecord }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Casa Braga · Controle de frota</Text>
          <Text style={styles.title}>Checklist de entrada e saída</Text>
          <Text style={styles.subtitle}>
            {event.code} · {event.title || "Evento"} · {event.date ? formatLongDate(event.date) : "Data a definir"}
          </Text>
        </View>
        <Text style={styles.hint}>
          Preencha à mão no momento da saída e da volta. Assine ao final. Este documento comprova o estado do veículo
          no uso do evento.
        </Text>

        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.label}>Veículo</Text>
            <Text style={styles.value}>{vehicle.name}</Text>
            <Text style={{ fontSize: 8, color: colors.muted, marginTop: 2 }}>
              {[vehicle.model, vehicle.year].filter(Boolean).join(" · ") || "Modelo não informado"}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Placa / chassi</Text>
            <Text style={styles.value}>{vehicle.plate || "—"}</Text>
            <Text style={{ fontSize: 8, color: colors.muted, marginTop: 2 }}>{vehicle.chassis || "Chassi não informado"}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Categoria de uso</Text>
            <Text style={styles.value}>{VEHICLE_USAGE_CATEGORY_LABELS[vehicle.usageCategory]}</Text>
            <Text style={{ fontSize: 8, color: colors.muted, marginTop: 2 }}>{VEHICLE_KIND_LABELS[vehicle.kind]}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 3 }]}>Item</Text>
          <Text style={[styles.th, { flex: 2 }]}>Saída</Text>
          <Text style={[styles.th, { flex: 2 }]}>Entrada / retorno</Text>
        </View>
        {CHECK_ITEMS.map((item) => (
          <View key={item} style={styles.row} wrap={false}>
            <Text style={styles.item}>{item}</Text>
            <View style={styles.col}>
              <View style={styles.checkLine}>
                <View style={styles.box} />
                <Text>OK</Text>
                <View style={[styles.box, { marginLeft: 8 }]} />
                <Text>Não</Text>
              </View>
            </View>
            <View style={styles.col}>
              <View style={styles.checkLine}>
                <View style={styles.box} />
                <Text>OK</Text>
                <View style={[styles.box, { marginLeft: 8 }]} />
                <Text>Não</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <View style={[styles.card, { minHeight: 40 }]}>
            <Text style={styles.label}>Km saída</Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>________________</Text>
          </View>
          <View style={[styles.card, { minHeight: 40 }]}>
            <Text style={styles.label}>Km retorno</Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>________________</Text>
          </View>
          <View style={[styles.card, { minHeight: 40 }]}>
            <Text style={styles.label}>Fora da cidade</Text>
            <Text style={styles.value}>{event.outOfTown ? "Sim" : "Não"}</Text>
          </View>
        </View>

        <View style={styles.notes}>
          <Text style={styles.notesTitle}>Ocorrências / observações</Text>
          <Text style={{ fontSize: 8, color: colors.muted }}>
            ______________________________________________________________________
          </Text>
          <Text style={{ fontSize: 8, color: colors.muted, marginTop: 10 }}>
            ______________________________________________________________________
          </Text>
          <Text style={{ fontSize: 8, color: colors.muted, marginTop: 10 }}>
            ______________________________________________________________________
          </Text>
        </View>

        <View style={styles.signs}>
          <View style={styles.signBox}>
            <View style={styles.signLine}>
              <Text>Motorista — nome e assinatura</Text>
            </View>
          </View>
          <View style={styles.signBox}>
            <View style={styles.signLine}>
              <Text>Responsável Casa Braga — nome e assinatura</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>Checklist de uso · {vehicle.plate || vehicle.name}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function downloadVehicleChecklistPdf(event: EventRecord, vehicle: VeiculoRecord) {
  const blob = await pdf(<ChecklistDocument event={event} vehicle={vehicle} />).toBlob();
  downloadBlob(
    blob,
    `checklist-${event.code.toLowerCase()}-${slugify(vehicle.plate || vehicle.name) || "veiculo"}.pdf`,
  );
}
