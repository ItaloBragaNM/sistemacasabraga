"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { formatBRL, formatDecimal } from "@/lib/crm/format";
import { downloadBlob, slugify } from "@/lib/download";
import { adjustedQuantity, costPerPortion, ingredientTotal, projectedCmv, recipeCost } from "@/lib/fichas-tecnicas/calc";
import type { TechnicalSheet } from "@/lib/fichas-tecnicas/types";

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
    paddingBottom: 36,
    paddingHorizontal: 28,
    fontFamily: "Helvetica",
    color: colors.forest,
  },
  header: { backgroundColor: colors.petrol, color: colors.cream, padding: 14, marginBottom: 10 },
  brand: { fontSize: 8, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 },
  title: { fontSize: 18, fontFamily: "Times-Bold" },
  subtitle: { fontSize: 9, marginTop: 3, color: colors.cream },
  meta: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  metaBox: {
    width: "33.33%",
    paddingRight: 8,
    paddingVertical: 4,
  },
  label: { fontSize: 7, letterSpacing: 0.8, textTransform: "uppercase", color: colors.muted, marginBottom: 2 },
  value: { fontSize: 9 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.forest,
    color: colors.cream,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  th: { fontSize: 6.5, letterSpacing: 0.4, textTransform: "uppercase" },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.line,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  cell: { fontSize: 7.5 },
  totals: { marginTop: 8, flexDirection: "row", justifyContent: "flex-end" },
  totalBox: {
    width: 220,
    borderWidth: 0.8,
    borderColor: colors.forest,
    padding: 8,
  },
  totalLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  method: { marginTop: 12, borderWidth: 0.6, borderColor: colors.line, padding: 8, minHeight: 80 },
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

function SheetDocument({ sheet }: { sheet: TechnicalSheet }) {
  const cost = recipeCost(sheet);
  const cmv = projectedCmv(sheet);
  const perPortion = costPerPortion(sheet);
  const yieldLabel = [
    sheet.yieldWeight ? `${formatDecimal(sheet.yieldWeight, 0)} ${sheet.yieldWeightUnit}` : "",
    sheet.yieldPortions ? `${formatDecimal(sheet.yieldPortions, 0)} porções` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Casa Braga · Cozinha</Text>
          <Text style={styles.title}>Ficha técnica</Text>
          <Text style={styles.subtitle}>{sheet.name}</Text>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaBox}>
            <Text style={styles.label}>Item</Text>
            <Text style={styles.value}>{sheet.name}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.label}>Classificação</Text>
            <Text style={styles.value}>{sheet.classification || "—"}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.label}>Setor</Text>
            <Text style={styles.value}>{sheet.sector || "—"}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.label}>Tamanho da porção</Text>
            <Text style={styles.value}>{sheet.portionSize || "—"}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.label}>Rendimento</Text>
            <Text style={styles.value}>{yieldLabel || "—"}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.label}>Preço de venda</Text>
            <Text style={styles.value}>{formatBRL(sheet.salePrice)}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "22%" }]}>Ingrediente</Text>
          <Text style={[styles.th, { width: "12%" }]}>Marca</Text>
          <Text style={[styles.th, { width: "10%" }]}>Quantidade líquida</Text>
          <Text style={[styles.th, { width: "7%" }]}>Un.</Text>
          <Text style={[styles.th, { width: "9%" }]}>% aprov.</Text>
          <Text style={[styles.th, { width: "12%" }]}>Quantidade ajustada</Text>
          <Text style={[styles.th, { width: "13%" }]}>Custo un.</Text>
          <Text style={[styles.th, { width: "15%" }]}>Custo total</Text>
        </View>
        {sheet.ingredients.map((item) => (
          <View key={item.id} style={styles.row} wrap={false}>
            <Text style={[styles.cell, { width: "22%" }]}>{item.name || "—"}</Text>
            <Text style={[styles.cell, { width: "12%" }]}>{item.brand || "—"}</Text>
            <Text style={[styles.cell, { width: "10%" }]}>{formatDecimal(item.netQuantity, 2)}</Text>
            <Text style={[styles.cell, { width: "7%" }]}>{item.unit}</Text>
            <Text style={[styles.cell, { width: "9%" }]}>{formatDecimal(item.yieldPercent, 0)}%</Text>
            <Text style={[styles.cell, { width: "12%" }]}>{formatDecimal(adjustedQuantity(item), 2)}</Text>
            <Text style={[styles.cell, { width: "13%" }]}>{formatBRL(item.unitCost)}</Text>
            <Text style={[styles.cell, { width: "15%" }]}>{formatBRL(ingredientTotal(item))}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalBox}>
            <View style={styles.totalLine}>
              <Text style={{ fontSize: 8 }}>Custo total da receita</Text>
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold" }}>{formatBRL(cost)}</Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={{ fontSize: 8 }}>Custo por porção</Text>
              <Text style={{ fontSize: 9 }}>{perPortion ? formatBRL(perPortion) : "—"}</Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={{ fontSize: 8 }}>Preço de venda</Text>
              <Text style={{ fontSize: 9 }}>{formatBRL(sheet.salePrice)}</Text>
            </View>
            <View style={[styles.totalLine, { marginBottom: 0 }]}>
              <Text style={{ fontSize: 8 }}>CMV projetado</Text>
              <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>{formatDecimal(cmv, 1)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.method}>
          <Text style={styles.label}>Modo de preparo</Text>
          <Text style={{ fontSize: 9, lineHeight: 1.4, marginTop: 4 }}>{sheet.method || "—"}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Ficha técnica · Casa Braga</Text>
          <Text render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function downloadTechnicalSheetPdf(sheet: TechnicalSheet) {
  const blob = await pdf(<SheetDocument sheet={sheet} />).toBlob();
  downloadBlob(blob, `ficha-tecnica-${slugify(sheet.name) || "receita"}.pdf`);
}
