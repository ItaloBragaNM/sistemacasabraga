"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { formatBRL, formatDecimal } from "@/lib/crm/format";
import { downloadBlob, slugify } from "@/lib/download";
import { adjustedQuantity, costPerPortion, ingredientTotal, projectedCmv, recipeCost } from "@/lib/fichas-tecnicas/calc";
import { TECHNICAL_SHEET_KIND_LABELS, type TechnicalSheet } from "@/lib/fichas-tecnicas/types";
import {
  PDF,
  PdfFooter,
  PdfHeader,
  PdfTableHead,
  columnStyle,
  pdfStyles,
  type PdfColumn,
} from "@/lib/pdf/header";

const COLUMNS: PdfColumn[] = [
  { label: "Ingrediente", flex: 30 },
  { label: "Marca", flex: 12 },
  { label: "Qtd. líquida", flex: 10, align: "right" },
  { label: "Un.", width: 28, align: "center" },
  { label: "% aprov.", flex: 7, align: "right" },
  { label: "Qtd. ajustada", flex: 10, align: "right" },
  { label: "Custo un.", flex: 10, align: "right" },
  { label: "Custo total", flex: 12, align: "right" },
];

const styles = StyleSheet.create({
  meta: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  metaBox: { width: "33.33%", paddingRight: 8, paddingVertical: 2 },
  label: { fontSize: PDF.small, letterSpacing: 0.6, textTransform: "uppercase", color: PDF.muted },
  value: { fontSize: PDF.body },
  totals: { marginTop: 6, flexDirection: "row", justifyContent: "flex-end" },
  totalBox: { width: 220, borderWidth: 0.6, borderColor: PDF.line, paddingVertical: 5, paddingHorizontal: 8 },
  totalLine: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  totalLabel: { flex: 1 },
  totalValue: { width: 90, textAlign: "right" },
  method: { fontSize: PDF.body, lineHeight: 1.4 },
});

export function SheetDocument({ sheet }: { sheet: TechnicalSheet }) {
  const cost = recipeCost(sheet);
  const cmv = projectedCmv(sheet);
  const perPortion = costPerPortion(sheet);
  const yieldLabel = [
    sheet.yieldWeight ? `${formatDecimal(sheet.yieldWeight, 0)} ${sheet.yieldWeightUnit}` : "",
    sheet.yieldPortions ? `${formatDecimal(sheet.yieldPortions, 0)} porções` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const meta = [
    { label: "Item", value: sheet.name },
    { label: "Tipo", value: TECHNICAL_SHEET_KIND_LABELS[sheet.kind] },
    { label: "Classificação", value: sheet.classification || "—" },
    { label: "Setor", value: sheet.sector || "—" },
    { label: "Tamanho da porção", value: sheet.portionSize || "—" },
    { label: "Rendimento", value: yieldLabel || "—" },
    { label: "Preço de venda", value: formatBRL(sheet.salePrice) },
  ];

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader
          title={sheet.name || "Ficha técnica"}
          meta={TECHNICAL_SHEET_KIND_LABELS[sheet.kind]}
        />

        <View style={styles.meta}>
          {meta.map((item) => (
            <View key={item.label} style={styles.metaBox}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          ))}
        </View>

        <PdfTableHead columns={COLUMNS} fixed={false} />
        {sheet.ingredients.map((item) => {
          const cells = [
            item.name || "—",
            item.brand || "—",
            formatDecimal(item.netQuantity, 2),
            item.unit,
            `${formatDecimal(item.yieldPercent, 0)}%`,
            formatDecimal(adjustedQuantity(item), 2),
            formatBRL(item.unitCost),
            formatBRL(ingredientTotal(item)),
          ];
          return (
            <View key={item.id} style={pdfStyles.row} wrap={false}>
              {cells.map((text, index) => (
                <Text key={COLUMNS[index].label} style={[pdfStyles.cell, columnStyle(COLUMNS[index])]}>
                  {text}
                </Text>
              ))}
            </View>
          );
        })}

        <View style={styles.totals} wrap={false}>
          <View style={styles.totalBox}>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Custo total da receita</Text>
              <Text style={[styles.totalValue, pdfStyles.strong]}>{formatBRL(cost)}</Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Custo por porção</Text>
              <Text style={styles.totalValue}>{perPortion ? formatBRL(perPortion) : "—"}</Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Preço de venda</Text>
              <Text style={styles.totalValue}>{formatBRL(sheet.salePrice)}</Text>
            </View>
            <View style={[styles.totalLine, { marginBottom: 0 }]}>
              <Text style={styles.totalLabel}>CMV projetado</Text>
              <Text style={[styles.totalValue, pdfStyles.strong, { fontSize: 10 }]}>{formatDecimal(cmv, 1)}%</Text>
            </View>
          </View>
        </View>

        <Text style={pdfStyles.sectionTitle} minPresenceAhead={30}>
          Modo de preparo
        </Text>
        <Text style={styles.method}>{sheet.method || "—"}</Text>

        <PdfFooter label={`${TECHNICAL_SHEET_KIND_LABELS[sheet.kind]} · ${sheet.name || "receita"}`} />
      </Page>
    </Document>
  );
}

export async function downloadTechnicalSheetPdf(sheet: TechnicalSheet) {
  const blob = await pdf(<SheetDocument sheet={sheet} />).toBlob();
  downloadBlob(blob, `ficha-tecnica-${slugify(sheet.name) || "receita"}.pdf`);
}
