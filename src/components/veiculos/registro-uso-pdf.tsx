"use client";

import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { VeiculoRecord } from "@/lib/cadastros/types";
import { downloadBlob, slugify } from "@/lib/download";
import { pdfAsset } from "@/lib/pdf/assets";
import { PDF_FONT } from "@/lib/pdf/fonts";
import { PDF, PdfFooter, pdfStyles } from "@/lib/pdf/header";

export type VehicleWeekTrip = {
  date: string;
  timeOut: string;
  route: string;
  purpose: string;
  user: string;
};

const COLUMNS: { key: string; label: string; width: string }[] = [
  { key: "date", label: "DATA", width: "8%" },
  { key: "kmOut", label: "KM\nSAÍDA", width: "8%" },
  { key: "kmIn", label: "KM\nCHEGADA", width: "8%" },
  { key: "timeOut", label: "HORA\nSAÍDA", width: "8%" },
  { key: "timeIn", label: "HORA\nCHEGADA", width: "8%" },
  { key: "route", label: "ORIGEM / DESTINO", width: "18%" },
  { key: "driver", label: "NOME MOTORISTA\n(legível)", width: "14%" },
  { key: "visto", label: "VISTO\nMOTORISTA", width: "8%" },
  { key: "purpose", label: "FINALIDADE", width: "12%" },
  { key: "user", label: "USUÁRIO", width: "8%" },
];

const MIN_ROWS = 16;
const ROW_HEIGHT = 18;
const MIN_ROW_HEIGHT = 12;
/** Altura útil da página A4 paisagem (595 pt) menos margens, cabeçalhos da grade e observações. */
const ROWS_AREA = 595 - PDF.marginTop - PDF.marginBottom - 32 - 26 - 28 - 42 - 6;

const border = { borderRightWidth: 0.8, borderBottomWidth: 0.8, borderColor: PDF.strongLine } as const;

const styles = StyleSheet.create({
  grid: { borderTopWidth: 0.8, borderLeftWidth: 0.8, borderColor: PDF.strongLine },
  row: { flexDirection: "row" },
  titleCell: {
    ...border,
    width: "78%",
    height: 32,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    gap: 6,
  },
  logo: { width: 24, height: 24 },
  title: { fontSize: 12, fontFamily: PDF_FONT, fontWeight: 700 },
  sideCell: { ...border, width: "22%", height: 32, justifyContent: "center", paddingHorizontal: 6 },
  metaCell: { ...border, height: 26, justifyContent: "center", paddingHorizontal: 4 },
  metaLabel: { fontSize: PDF.small, fontFamily: PDF_FONT, fontWeight: 700 },
  metaValue: { fontSize: PDF.body },
  headCell: {
    ...border,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  headText: { ...pdfStyles.th, textTransform: "none", textAlign: "center" },
  dataCell: { ...border, justifyContent: "center", paddingHorizontal: 3 },
  dataText: { fontSize: PDF.small },
  notes: { ...border, height: 42, paddingHorizontal: 4, paddingVertical: 3 },
});

function blankTrips(count: number): VehicleWeekTrip[] {
  return Array.from({ length: count }, () => ({
    date: "",
    timeOut: "",
    route: "",
    purpose: "",
    user: "",
  }));
}

function cellText(trip: VehicleWeekTrip, key: string) {
  if (key === "date") return trip.date;
  if (key === "timeOut") return trip.timeOut;
  if (key === "route") return trip.route;
  if (key === "purpose") return trip.purpose;
  if (key === "user") return trip.user;
  return "";
}

function LogSheet({
  vehicle,
  startLabel,
  endLabel,
  trips,
}: {
  vehicle: VeiculoRecord;
  startLabel: string;
  endLabel: string;
  trips: VehicleWeekTrip[];
}) {
  const rows = [...trips, ...blankTrips(Math.max(0, MIN_ROWS - trips.length))];
  const rowHeight = Math.max(MIN_ROW_HEIGHT, Math.min(ROW_HEIGHT, Math.floor(ROWS_AREA / rows.length)));
  const fields = [
    { label: "Veículo", value: vehicle.name || "—", width: "18%" },
    { label: "Placa", value: vehicle.plate || "—", width: "12%" },
    { label: "Km Início", value: "", width: "12%" },
    { label: "Km Final", value: "", width: "12%" },
    { label: "Data Início", value: startLabel, width: "15%" },
    { label: "Data Final", value: endLabel, width: "15%" },
    { label: "Data Troca Óleo", value: "", width: "16%" },
  ];

  return (
    <Page size="A4" orientation="landscape" style={[pdfStyles.page, pdfStyles.landscape]}>
      <View style={styles.grid}>
        <View style={styles.row}>
          <View style={styles.titleCell}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf não aceita alt */}
            <Image src={pdfAsset("/brand/zoraide-seal.png")} style={styles.logo} />
            <Text style={styles.title}>Controle de Utilização Veículo</Text>
          </View>
          <View style={styles.sideCell}>
            <Text style={styles.metaLabel}>KM Troca Óleo:</Text>
          </View>
        </View>
        <View style={styles.row}>
          {fields.map((field) => (
            <View key={field.label} style={[styles.metaCell, { width: field.width }]}>
              <Text style={styles.metaLabel}>{field.label}:</Text>
              {field.value ? <Text style={styles.metaValue}>{field.value}</Text> : null}
            </View>
          ))}
        </View>
        <View style={styles.row}>
          {COLUMNS.map((column) => (
            <View key={column.key} style={[styles.headCell, { width: column.width }]}>
              <Text style={styles.headText}>{column.label}</Text>
            </View>
          ))}
        </View>
        {rows.map((trip, index) => (
          <View key={`${vehicle.id}-${index}`} style={styles.row} wrap={false}>
            {COLUMNS.map((column) => (
              <View key={column.key} style={[styles.dataCell, { width: column.width, minHeight: rowHeight }]}>
                <Text style={styles.dataText}>{cellText(trip, column.key)}</Text>
              </View>
            ))}
          </View>
        ))}
        <View style={styles.notes}>
          <Text style={styles.metaLabel}>Observações:</Text>
        </View>
      </View>
      <PdfFooter label={`Controle de utilização · ${vehicle.plate || vehicle.name || "veículo"} · ${startLabel} a ${endLabel}`} />
    </Page>
  );
}

export function VehicleLogDocument({
  sheets,
  startLabel,
  endLabel,
}: {
  sheets: { vehicle: VeiculoRecord; trips: VehicleWeekTrip[] }[];
  startLabel: string;
  endLabel: string;
}) {
  return (
    <Document>
      {sheets.map((sheet) => (
        <LogSheet
          key={sheet.vehicle.id}
          vehicle={sheet.vehicle}
          startLabel={startLabel}
          endLabel={endLabel}
          trips={sheet.trips}
        />
      ))}
    </Document>
  );
}

function fileName(vehicle: VeiculoRecord, weekStart: string) {
  const plate = slugify(vehicle.plate || vehicle.name) || "veiculo";
  return `registro-uso-${plate}-${weekStart}.pdf`;
}

export async function downloadVehicleWeekPdf(
  vehicle: VeiculoRecord,
  weekStart: string,
  startLabel: string,
  endLabel: string,
  trips: VehicleWeekTrip[],
) {
  const blob = await pdf(
    <VehicleLogDocument sheets={[{ vehicle, trips }]} startLabel={startLabel} endLabel={endLabel} />,
  ).toBlob();
  downloadBlob(blob, fileName(vehicle, weekStart));
}

export async function downloadFleetWeekPdf(
  sheets: { vehicle: VeiculoRecord; trips: VehicleWeekTrip[] }[],
  weekStart: string,
  startLabel: string,
  endLabel: string,
) {
  const blob = await pdf(
    <VehicleLogDocument sheets={sheets} startLabel={startLabel} endLabel={endLabel} />,
  ).toBlob();
  downloadBlob(blob, `registro-uso-semana-${weekStart}.pdf`);
}
