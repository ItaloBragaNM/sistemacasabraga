"use client";

import { Document, Page, Text, View, pdf } from "@react-pdf/renderer";
import { formatInt } from "@/lib/crm/format";
import { formatLongDate } from "@/lib/dates";
import { downloadBlob } from "@/lib/download";
import {
  PDF,
  PdfFooter,
  PdfGroupRow,
  PdfHeader,
  PdfTableHead,
  columnStyle,
  pdfStyles,
  type PdfColumn,
} from "@/lib/pdf/header";

export interface CountSheetRow {
  name: string;
  category: string;
  location: string;
  unit: string;
}

export interface InventoryPrintRow {
  name: string;
  category: string;
  previous: number;
  counted: number;
}

const COUNT_COLUMNS: PdfColumn[] = [
  { label: "Material", flex: 3 },
  { label: "Local", flex: 1.6 },
  { label: "Contagem", width: 60, align: "center" },
];

const SESSION_COLUMNS: PdfColumn[] = [
  { label: "Material", flex: 3 },
  { label: "Anterior", width: 52, align: "right" },
  { label: "Contado", width: 52, align: "right" },
  { label: "Diferença", width: 56, align: "right" },
];

function byCategory<T extends { category: string }>(rows: T[]) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const list = groups.get(row.category) ?? [];
    list.push(row);
    groups.set(row.category, list);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
}

export function CountSheetDocument({
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
  return (
    <Document title="Folha de contagem de materiais">
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader
          title="Folha de contagem · Materiais"
          meta={[date ? formatLongDate(date) : "Data a preencher", `Responsável: ${responsible.trim() || "________________"}`].join(
            " · ",
          )}
          right={`${rows.length} linha(s)`}
        />
        {filters ? <Text style={pdfStyles.hint}>{filters} · uma linha por variação</Text> : null}
        <PdfTableHead columns={COUNT_COLUMNS} />
        {byCategory(rows).map(([category, items]) => (
          <View key={category}>
            <PdfGroupRow label={category} />
            {items.map((row, index) => (
              <View key={`${row.name}-${index}`} style={pdfStyles.row} wrap={false}>
                <Text style={[pdfStyles.cell, columnStyle(COUNT_COLUMNS[0])]}>
                  {row.name}
                  {row.unit ? <Text style={pdfStyles.cellMuted}> ({row.unit})</Text> : null}
                </Text>
                <Text style={[pdfStyles.cellMuted, columnStyle(COUNT_COLUMNS[1])]}>{row.location || "—"}</Text>
                <View style={{ width: 60, alignItems: "center" }}>
                  <View style={[pdfStyles.box, { width: 44 }]} />
                </View>
              </View>
            ))}
          </View>
        ))}
        <Text style={[pdfStyles.hint, { marginTop: 10 }]} wrap={false}>
          Participantes: ______________________________________________
        </Text>
        <PdfFooter label="Inventário de materiais · sem valores financeiros" />
      </Page>
    </Document>
  );
}

export function InventorySessionDocument({
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
  const changed = rows.filter((row) => row.counted !== row.previous).length;
  const people = [responsible, ...participants].filter(Boolean).join(" · ");

  return (
    <Document title="Inventário de materiais">
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader
          title="Inventário realizado · Materiais"
          meta={[date ? formatLongDate(date) : "", people].filter(Boolean).join(" · ")}
          right={[
            `${rows.length} item(ns)`,
            changed > 0 ? `${changed} com diferença` : "sem diferenças",
            skipped > 0 ? `${skipped} oculto(s)` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        {note ? <Text style={pdfStyles.hint}>{note}</Text> : null}
        <PdfTableHead columns={SESSION_COLUMNS} />
        {byCategory(rows).map(([category, items]) => (
          <View key={category}>
            <PdfGroupRow label={category} />
            {items.map((row, index) => {
              const diff = row.counted - row.previous;
              return (
                <View key={`${row.name}-${index}`} style={pdfStyles.row} wrap={false}>
                  <Text style={[pdfStyles.cell, columnStyle(SESSION_COLUMNS[0])]}>{row.name}</Text>
                  <Text style={[pdfStyles.num, columnStyle(SESSION_COLUMNS[1]), { color: PDF.muted }]}>
                    {formatInt(row.previous)}
                  </Text>
                  <Text style={[pdfStyles.num, columnStyle(SESSION_COLUMNS[2])]}>{formatInt(row.counted)}</Text>
                  <Text
                    style={[
                      pdfStyles.num,
                      columnStyle(SESSION_COLUMNS[3]),
                      diff < 0 ? { color: PDF.danger, fontWeight: 700 } : diff > 0 ? pdfStyles.strong : { color: PDF.muted },
                    ]}
                  >
                    {diff > 0 ? "+" : ""}
                    {formatInt(diff)}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
        <PdfFooter label="Inventário de materiais · sem valores financeiros" />
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
    <CountSheetDocument date={opts.date} responsible={opts.responsible} rows={opts.rows} filters={opts.filters} />,
  ).toBlob();
  downloadBlob(blob, `contagem-inventario-${opts.date || new Date().toISOString().slice(0, 10)}.pdf`);
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
  downloadBlob(blob, `inventario-${opts.date || new Date().toISOString().slice(0, 10)}.pdf`);
}
