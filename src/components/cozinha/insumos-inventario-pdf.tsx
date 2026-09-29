"use client";

import { Document, Page, Text, View, pdf } from "@react-pdf/renderer";
import { formatDecimal } from "@/lib/crm/format";
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

export interface InsumoCountRow {
  name: string;
  category: string;
  unit: string;
  system: number;
  counted?: number;
}

export function InsumoCountDocument({
  title,
  meta,
  rows,
  blank,
}: {
  title: string;
  meta: string;
  rows: InsumoCountRow[];
  blank: boolean;
}) {
  const columns: PdfColumn[] = blank
    ? [
        { label: "Insumo", flex: 3 },
        { label: "Sistema", width: 60, align: "right" },
        { label: "Contagem", width: 70, align: "center" },
      ]
    : [
        { label: "Insumo", flex: 3 },
        { label: "Sistema", width: 60, align: "right" },
        { label: "Contado", width: 60, align: "right" },
        { label: "Diferença", width: 60, align: "right" },
      ];
  const groups = new Map<string, InsumoCountRow[]>();
  for (const row of rows) {
    const list = groups.get(row.category) ?? [];
    list.push(row);
    groups.set(row.category, list);
  }
  const sorted = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));

  return (
    <Document title={title}>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader
          title={title}
          meta={meta}
          right={blank ? "Anote a contagem e lance depois no sistema" : `${rows.length} item(ns)`}
        />
        <PdfTableHead columns={columns} />
        {sorted.map(([category, items]) => (
          <View key={category}>
            <PdfGroupRow label={category} />
            {items.map((row, index) => {
              const diff = (row.counted ?? 0) - row.system;
              return (
                <View key={`${row.name}-${index}`} style={pdfStyles.row} wrap={false}>
                  <Text style={[pdfStyles.cell, columnStyle(columns[0])]}>
                    {row.name}
                    {row.unit ? <Text style={pdfStyles.cellMuted}> ({row.unit})</Text> : null}
                  </Text>
                  <Text style={[pdfStyles.num, columnStyle(columns[1]), { color: PDF.muted }]}>
                    {formatDecimal(row.system, 2)}
                  </Text>
                  {blank ? (
                    <View style={{ width: 70, alignItems: "center" }}>
                      <View style={[pdfStyles.box, { width: 50 }]} />
                    </View>
                  ) : (
                    <>
                      <Text style={[pdfStyles.num, columnStyle(columns[2])]}>{formatDecimal(row.counted ?? 0, 2)}</Text>
                      <Text
                        style={[
                          pdfStyles.num,
                          columnStyle(columns[3]),
                          diff < 0 ? { color: PDF.danger, fontWeight: 700 } : diff > 0 ? pdfStyles.strong : { color: PDF.muted },
                        ]}
                      >
                        {diff > 0 ? "+" : ""}
                        {formatDecimal(diff, 2)}
                      </Text>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        ))}
        <PdfFooter label="Cozinha · Inventário de insumos" />
      </Page>
    </Document>
  );
}

export async function downloadInsumoCountSheet(opts: { title: string; date: string; rows: InsumoCountRow[] }) {
  const blob = await pdf(
    <InsumoCountDocument
      title={opts.title}
      meta={opts.date ? formatLongDate(opts.date) : "Data a preencher"}
      rows={opts.rows}
      blank
    />,
  ).toBlob();
  downloadBlob(blob, "contagem-insumos.pdf");
}

export async function downloadInsumoInventoryPdf(opts: {
  title: string;
  date: string;
  responsible: string;
  rows: InsumoCountRow[];
}) {
  const blob = await pdf(
    <InsumoCountDocument
      title={opts.title}
      meta={[opts.date ? formatLongDate(opts.date) : "", opts.responsible].filter(Boolean).join(" · ")}
      rows={opts.rows}
      blank={false}
    />,
  ).toBlob();
  downloadBlob(blob, "inventario-insumos.pdf");
}
