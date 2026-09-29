"use client";

import { Document, Page, Text, View, pdf } from "@react-pdf/renderer";
import { downloadBlob, slugify } from "@/lib/download";
import { formatShortDate } from "@/lib/dates";
import {
  PDF,
  PdfFooter,
  PdfHeader,
  PdfTableHead,
  columnStyle,
  pdfStyles,
  type PdfColumn,
} from "@/lib/pdf/header";
import { guestTotal, type EventRecord } from "@/lib/types";

export interface SeparationPdfRow {
  name: string;
  category: string;
  unit: string;
  quantity: number;
  dishes?: string;
  note?: string;
  edited?: boolean;
}

export interface SeparationPdfKitItem {
  name: string;
  perKit: number;
  total: number;
  edited?: boolean;
}

export interface SeparationPdfKit {
  name: string;
  kitQty: number;
  scaleLabel?: string;
  items: SeparationPdfKitItem[];
}

export interface SeparationPdfExtra {
  name: string;
  quantity: number;
}

export interface SeparationPdfDrink {
  label: string;
  unit: string;
  calc: string;
  qty: string;
}

export interface SeparationPdfExtras {
  kits?: SeparationPdfKit[];
  extras?: SeparationPdfExtra[];
  drinks?: SeparationPdfDrink[];
  notes?: string;
}

/** Acima disso a lista ocupa mais de uma página e ganha cabeçalho repetido. */
const LONG_LIST = 40;

const MATERIAL_COLUMNS: PdfColumn[] = [
  { label: "Material", flex: 2.3 },
  { label: "Categoria", flex: 1.4 },
  { label: "Pratos", flex: 2.4 },
  { label: "Est.", width: 30, align: "right" },
  { label: "Env.", width: 30, align: "center" },
  { label: "Ret.", width: 30, align: "center" },
  { label: "Obs", flex: 1.2 },
];

const DRINK_COLUMNS: PdfColumn[] = [
  { label: "Bebida", flex: 1.1 },
  { label: "Unidade", flex: 1.1 },
  { label: "Cálculo", flex: 3.6 },
  { label: "Qtd.", width: 36, align: "right" },
];

function eventLine(event: EventRecord) {
  const venue = event.venue.address?.trim() || event.venue.name?.trim() || "";
  const date = event.date ? formatShortDate(event.date) : "Data a definir";
  return [date, venue].filter(Boolean).join(" · ");
}

function staffLine(event: EventRecord) {
  return `Convidados ${guestTotal(event.guests)} · Garçons ${event.staff.garcons} · Garçonetes ${event.staff.garconetes} · Copeiras ${event.staff.copeiros} · Chefes ${event.staff.chefes} · Ilhas ${event.islands ?? 0}`;
}

function MaterialRow({ row }: { row: SeparationPdfRow }) {
  return (
    <View style={[pdfStyles.row, row.edited ? { backgroundColor: PDF.edited } : {}]} wrap={false}>
      <Text style={[pdfStyles.cell, columnStyle(MATERIAL_COLUMNS[0])]}>
        {row.name}
        {row.unit ? <Text style={pdfStyles.cellMuted}> ({row.unit})</Text> : null}
      </Text>
      <Text style={[pdfStyles.cellMuted, columnStyle(MATERIAL_COLUMNS[1])]}>{row.category}</Text>
      <Text style={[pdfStyles.cellMuted, columnStyle(MATERIAL_COLUMNS[2])]}>{row.dishes || ""}</Text>
      <Text style={[pdfStyles.num, pdfStyles.strong, columnStyle(MATERIAL_COLUMNS[3])]}>{row.quantity}</Text>
      <View style={{ width: 30, alignItems: "center" }}>
        <View style={pdfStyles.box} />
      </View>
      <View style={{ width: 30, alignItems: "center" }}>
        <View style={pdfStyles.box} />
      </View>
      <Text style={[pdfStyles.cellMuted, columnStyle(MATERIAL_COLUMNS[6]), { paddingLeft: 4 }]}>{row.note || ""}</Text>
    </View>
  );
}

function Extras({ extra }: { extra?: SeparationPdfExtras }) {
  const drinks = extra?.drinks ?? [];
  const kits = extra?.kits ?? [];
  const extras = extra?.extras ?? [];
  return (
    <>
      {drinks.length > 0 ? (
        <View wrap={false}>
          <Text style={pdfStyles.sectionTitle}>Bebidas</Text>
          <PdfTableHead columns={DRINK_COLUMNS} fixed={false} />
          {drinks.map((drink) => (
            <View key={drink.label} style={pdfStyles.row}>
              <Text style={[pdfStyles.cell, columnStyle(DRINK_COLUMNS[0])]}>{drink.label}</Text>
              <Text style={[pdfStyles.cellMuted, columnStyle(DRINK_COLUMNS[1])]}>{drink.unit}</Text>
              <Text style={[pdfStyles.cellMuted, columnStyle(DRINK_COLUMNS[2])]}>{drink.calc}</Text>
              <Text style={[pdfStyles.num, pdfStyles.strong, columnStyle(DRINK_COLUMNS[3])]}>{drink.qty}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {kits.length > 0 ? (
        <View>
          <Text style={pdfStyles.sectionTitle} minPresenceAhead={40}>
            Kits de transporte
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
            {kits.map((kit) => (
              <View key={kit.name} style={{ width: "48.5%", marginBottom: 6 }} wrap={false}>
                <View style={[pdfStyles.thead, { justifyContent: "space-between" }]}>
                  <Text style={[pdfStyles.cell, pdfStyles.strong]}>{kit.name}</Text>
                  <Text style={pdfStyles.cellMuted}>
                    {kit.kitQty}x{kit.scaleLabel ? ` · ${kit.scaleLabel}` : ""}
                  </Text>
                </View>
                {kit.items.map((item, index) => (
                  <View
                    key={`${item.name}-${index}`}
                    style={[pdfStyles.row, item.edited ? { backgroundColor: PDF.edited } : {}]}
                  >
                    <Text style={[pdfStyles.cell, { flex: 1 }]}>
                      <Text style={pdfStyles.cellMuted}>{item.perKit}x </Text>
                      {item.name}
                    </Text>
                    <Text style={[pdfStyles.num, pdfStyles.strong, { width: 30 }]}>{item.total}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {extras.length > 0 ? (
        <View wrap={false}>
          <Text style={pdfStyles.sectionTitle}>Extras</Text>
          {extras.map((item, index) => (
            <View key={`${item.name}-${index}`} style={pdfStyles.row}>
              <Text style={[pdfStyles.cell, { flex: 1 }]}>{item.name}</Text>
              <Text style={[pdfStyles.num, pdfStyles.strong, { width: 36 }]}>{item.quantity}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {extra?.notes?.trim() ? (
        <View wrap={false}>
          <Text style={pdfStyles.sectionTitle}>Observação</Text>
          <Text style={pdfStyles.cell}>{extra.notes.trim()}</Text>
        </View>
      ) : null}
    </>
  );
}

export function SeparationDocument({
  event,
  rows,
  extra,
}: {
  event: EventRecord;
  rows: SeparationPdfRow[];
  extra?: SeparationPdfExtras;
}) {
  const long = rows.length > LONG_LIST;
  const header = (
    <PdfHeader
      title="Separação de Materiais"
      meta={`${event.title || "Evento sem nome"} · ${eventLine(event)}`}
      right={event.code}
    />
  );
  const footer = <PdfFooter label={`Separação de materiais · ${event.code || event.title}`} />;

  const materials = (
    <>
      <Text style={pdfStyles.hint}>{staffLine(event)}</Text>
      <Text style={pdfStyles.sectionTitle}>Lista de materiais · {rows.length}</Text>
      {rows.length === 0 ? (
        <Text style={pdfStyles.hint}>Nenhum material na lista.</Text>
      ) : (
        <>
          <PdfTableHead columns={MATERIAL_COLUMNS} fixed={long} />
          {rows.map((row, index) => (
            <MaterialRow key={`${row.name}-${index}`} row={row} />
          ))}
        </>
      )}
    </>
  );

  return (
    <Document title={`Separação de materiais · ${event.title}`}>
      {long ? (
        <>
          <Page size="A4" style={pdfStyles.page}>
            {header}
            {materials}
            {footer}
          </Page>
          <Page size="A4" style={pdfStyles.page}>
            {header}
            <Extras extra={extra} />
            {footer}
          </Page>
        </>
      ) : (
        <Page size="A4" style={pdfStyles.page}>
          {header}
          {materials}
          <Extras extra={extra} />
          {footer}
        </Page>
      )}
    </Document>
  );
}

export async function downloadSeparationPdf(
  event: EventRecord,
  rows: SeparationPdfRow[],
  extra?: SeparationPdfExtras,
) {
  const blob = await pdf(<SeparationDocument event={event} rows={rows} extra={extra} />).toBlob();
  downloadBlob(
    blob,
    `separacao-materiais-${(event.code || "").toLowerCase() || "evento"}-${slugify(event.title || "evento") || "evento"}.pdf`,
  );
}
