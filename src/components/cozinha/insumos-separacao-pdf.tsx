"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { formatShortDate } from "@/lib/dates";
import { downloadBlob, slugify } from "@/lib/download";
import type { CatalogDishGroup } from "@/lib/cozinha/calc";
import {
  PDF,
  PdfFooter,
  PdfGroupRow,
  PdfHeader,
  PdfTableHead,
  pdfStyles,
  type PdfColumn,
} from "@/lib/pdf/header";
import type { EventRecord } from "@/lib/types";

const COLUMNS: PdfColumn[] = [
  { label: " ", width: 13 },
  { label: "Insumo", flex: 1 },
  { label: "Un.", width: 28, align: "right" },
  { label: "Qtd", width: 40, align: "right" },
];

const styles = StyleSheet.create({
  columns: { flexDirection: "row", gap: 12 },
  column: { flex: 1 },
  row: { ...pdfStyles.row, paddingVertical: 2.5 },
  check: { width: 8, height: 8, borderWidth: 0.7, borderColor: PDF.ink, marginRight: 5 },
  name: { flex: 1, fontSize: PDF.body },
  unit: { width: 28, fontSize: PDF.small, color: PDF.muted, textAlign: "right" },
  qty: { width: 34, height: 10, borderWidth: 0.6, borderColor: PDF.line, marginLeft: 6 },
  notes: { marginTop: 6, borderWidth: 0.5, borderColor: PDF.line, paddingVertical: 3, paddingHorizontal: 5 },
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

function Column({ groups }: { groups: CatalogDishGroup[] }) {
  if (groups.length === 0) return <View style={styles.column} />;
  return (
    <View style={styles.column}>
      <PdfTableHead columns={COLUMNS} fixed={false} />
      {groups.map((group) => (
        <View key={group.dishId}>
          <PdfGroupRow label={group.dishName} />
          {group.items.map((line) => (
            <View key={line.insumoId} style={styles.row} wrap={false}>
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

export function CatalogDocument({
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
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader
          title="Separação de insumos"
          meta={`${event.code} · ${event.title || "Evento"} · ${event.date ? formatShortDate(event.date) : "Data a definir"}`}
        />
        <View style={styles.columns}>
          <Column groups={left} />
          <Column groups={right} />
        </View>
        {notes.trim() ? (
          <View style={styles.notes} wrap={false}>
            <Text style={pdfStyles.groupText}>Observações</Text>
            <Text style={pdfStyles.cell}>{notes.trim()}</Text>
          </View>
        ) : null}
        <PdfFooter label={`${event.code} · Marque o separado e anote a quantidade.`} />
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
