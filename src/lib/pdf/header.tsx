"use client";

import { Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { pdfAsset } from "@/lib/pdf/assets";
import { PDF_FONT, registerPdfFonts } from "@/lib/pdf/fonts";

registerPdfFonts();

/** Padrão único de todos os PDFs: A4, margens de 18/22 pt, corpo de 8–9 pt, tinta quase preta. */
export const PDF = {
  ink: "#1C1C1C",
  muted: "#5D6F6C",
  line: "#D5DBD9",
  strongLine: "#1C1C1C",
  danger: "#C4453C",
  edited: "#FFF4CC",
  marginX: 22,
  marginTop: 18,
  marginBottom: 30,
  body: 8.5,
  small: 7.5,
} as const;

export const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    paddingTop: PDF.marginTop,
    paddingBottom: PDF.marginBottom,
    paddingHorizontal: PDF.marginX,
    fontFamily: PDF_FONT,
    fontSize: PDF.body,
    color: PDF.ink,
    lineHeight: 1.3,
  },
  landscape: {
    paddingHorizontal: 18,
  },
  headerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 0.6,
    borderBottomColor: PDF.line,
  },
  logo: { width: 30, height: 30 },
  headerBody: { flex: 1 },
  headerTitle: { fontSize: 12, fontFamily: PDF_FONT, fontWeight: 700 },
  headerMeta: { fontSize: PDF.small, color: PDF.muted, marginTop: 1 },
  headerRight: { fontSize: PDF.small, color: PDF.muted, textAlign: "right", maxWidth: 220 },
  footer: {
    position: "absolute",
    bottom: 12,
    left: PDF.marginX,
    right: PDF.marginX,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: PDF.muted,
    borderTopWidth: 0.5,
    borderTopColor: PDF.line,
    paddingTop: 3,
  },
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: PDF_FONT,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 3,
  },
  hint: { fontSize: PDF.small, color: PDF.muted, marginBottom: 5 },
  thead: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderBottomWidth: 0.8,
    borderBottomColor: PDF.strongLine,
    paddingBottom: 2.5,
    backgroundColor: "#FFFFFF",
  },
  th: { fontSize: 6.8, fontFamily: PDF_FONT, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.4,
    borderBottomColor: PDF.line,
    paddingVertical: 2.8,
  },
  cell: { fontSize: PDF.body },
  cellMuted: { fontSize: PDF.small, color: PDF.muted },
  num: { fontSize: PDF.body, textAlign: "right" },
  strong: { fontFamily: PDF_FONT, fontWeight: 700 },
  box: { width: 22, height: 11, borderWidth: 0.6, borderColor: PDF.line },
  groupRow: {
    paddingTop: 5,
    paddingBottom: 1.5,
    borderBottomWidth: 0.4,
    borderBottomColor: PDF.line,
  },
  groupText: {
    fontSize: 7,
    fontFamily: PDF_FONT,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: PDF.muted,
  },
});

export function PdfPage({
  children,
  landscape = false,
  size = "A4",
}: {
  children: React.ReactNode;
  landscape?: boolean;
  size?: "A4" | "LETTER";
}) {
  return (
    <Page size={size} orientation={landscape ? "landscape" : "portrait"} style={[pdfStyles.page, landscape ? pdfStyles.landscape : {}]}>
      {children}
    </Page>
  );
}

export function printedAt() {
  return new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Cabeçalho com o selo. Com `fixed`, repete em todas as páginas. */
export function PdfHeader({
  title,
  meta,
  right,
  fixed = true,
}: {
  title: string;
  meta?: string;
  right?: string;
  fixed?: boolean;
}) {
  return (
    <View style={pdfStyles.headerWrap} fixed={fixed}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf não aceita alt */}
      <Image src={pdfAsset("/brand/zoraide-seal.png")} style={pdfStyles.logo} />
      <View style={pdfStyles.headerBody}>
        <Text style={pdfStyles.headerTitle}>{title}</Text>
        {meta ? <Text style={pdfStyles.headerMeta}>{meta}</Text> : null}
      </View>
      {right ? <Text style={pdfStyles.headerRight}>{right}</Text> : null}
    </View>
  );
}

/** Rodapé fixo: identificação do documento, página e data de impressão. */
export function PdfFooter({ label }: { label: string }) {
  return (
    <View style={pdfStyles.footer} fixed>
      <Text>{label}</Text>
      <Text render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} de ${totalPages} · ${printedAt()}`} />
    </View>
  );
}

export type PdfColumn = {
  label: string;
  width?: number;
  flex?: number;
  align?: "left" | "right" | "center";
};

export function columnStyle(column: PdfColumn) {
  return {
    ...(column.width ? { width: column.width } : { flex: column.flex ?? 1 }),
    textAlign: column.align ?? "left",
    paddingRight: column.align === "right" ? 0 : 4,
  } as const;
}

/** Cabeçalho de tabela. Fica `fixed` para repetir no topo de cada página da tabela. */
export function PdfTableHead({ columns, fixed = true }: { columns: PdfColumn[]; fixed?: boolean }) {
  return (
    <View style={pdfStyles.thead} fixed={fixed}>
      {columns.map((column) => (
        <Text key={column.label} style={[pdfStyles.th, columnStyle(column)]}>
          {column.label}
        </Text>
      ))}
    </View>
  );
}

export function PdfRow({
  children,
  wrap = false,
}: {
  children: React.ReactNode;
  wrap?: boolean;
}) {
  return (
    <View style={pdfStyles.row} wrap={wrap} minPresenceAhead={12}>
      {children}
    </View>
  );
}

export function PdfTable({
  columns,
  children,
}: {
  columns: PdfColumn[];
  children: React.ReactNode;
}) {
  return (
    <View>
      <PdfTableHead columns={columns} />
      {children}
    </View>
  );
}

export function PdfGroupRow({ label }: { label: string }) {
  return (
    <View style={pdfStyles.groupRow} wrap={false} minPresenceAhead={14}>
      <Text style={pdfStyles.groupText}>{label}</Text>
    </View>
  );
}
