"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { formatLongDate, formatWeekday } from "@/lib/dates";
import { UNIFORM_SIZE_LABELS } from "@/lib/labels";
import {
  DRINK_ITEMS,
  guestTotal,
  suggestedDrinkQuantities,
  UNIFORM_PIECES,
  UNIFORM_SIZES,
  type EventRecord,
} from "@/lib/types";

const colors = {
  forest: "#1E443E",
  petrol: "#003F3C",
  cream: "#FFFBFA",
  terracotta: "#E13F3A",
  muted: "#5D6F6C",
  line: "#C9D5D1",
  edited: "#B8860B",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.cream,
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 32,
    fontFamily: "Helvetica",
    color: colors.forest,
  },
  header: { backgroundColor: colors.petrol, color: colors.cream, padding: 16, marginBottom: 14 },
  brand: { fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  title: { fontSize: 22, fontFamily: "Times-Bold" },
  subtitle: { fontSize: 10, marginTop: 4, color: colors.cream },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  meta: { flex: 1, borderWidth: 1, borderColor: colors.line, padding: 8 },
  metaLabel: {
    fontSize: 7,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 3,
  },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  sectionTitle: {
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: 10,
    marginBottom: 6,
    color: colors.forest,
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.6,
    borderBottomColor: colors.line,
    paddingVertical: 5,
    alignItems: "center",
  },
  check: { width: 16, fontSize: 11, color: colors.muted },
  name: { flex: 3, fontSize: 10 },
  qty: { flex: 1, fontSize: 11, textAlign: "right", fontFamily: "Helvetica-Bold" },
  unit: { width: 40, fontSize: 9, color: colors.muted, textAlign: "right" },
  note: { flex: 2, fontSize: 8, color: colors.muted, textAlign: "right" },
  editedTag: { color: colors.edited, fontFamily: "Helvetica-Bold" },
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

export interface SeparationPdfRow {
  name: string;
  category: string;
  unit: string;
  quantity: number;
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

export interface SeparationPdfExtras {
  kits?: SeparationPdfKit[];
  extras?: SeparationPdfExtra[];
  notes?: string;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function SeparationDocument({
  event,
  rows,
  extra,
}: {
  event: EventRecord;
  rows: SeparationPdfRow[];
  extra?: SeparationPdfExtras;
}) {
  const categories = Array.from(new Set(rows.map((row) => row.category))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Casa Braga · Separação de Materiais</Text>
          <Text style={styles.title}>{event.title || "Evento sem nome"}</Text>
          <Text style={styles.subtitle}>{event.code}</Text>
        </View>

        <View style={styles.metaRow}>
          <Meta
            label="Data"
            value={event.date ? `${formatWeekday(event.date)}, ${formatLongDate(event.date)}` : "—"}
          />
          <Meta label="Convidados" value={String(guestTotal(event.guests))} />
          <Meta label="Ilhas" value={String(event.islands ?? 0)} />
        </View>
        <View style={styles.metaRow}>
          <Meta
            label="Equipe (gar / garç / cop / chef)"
            value={`${event.staff.garcons} / ${event.staff.garconetes} / ${event.staff.copeiros} / ${event.staff.chefes}`}
          />
          <Meta label="Itens da lista" value={String(rows.length)} />
          <Meta label="Total de peças" value={String(total)} />
        </View>

        {categories.map((category) => {
          const items = rows.filter((row) => row.category === category);
          return (
            <View key={category} wrap={false}>
              <Text style={styles.sectionTitle}>{category}</Text>
              {items.map((row, index) => (
                <View key={`${row.name}-${index}`} style={styles.row}>
                  <Text style={styles.check}>{"\u2610"}</Text>
                  <Text style={styles.name}>
                    {row.name}
                    {row.edited ? <Text style={styles.editedTag}> · editado</Text> : null}
                  </Text>
                  <Text style={styles.qty}>{row.quantity}</Text>
                  <Text style={styles.unit}>{row.unit}</Text>
                  <Text style={styles.note}>{row.note ?? ""}</Text>
                </View>
              ))}
            </View>
          );
        })}

        {rows.length === 0 ? (
          <Text style={{ fontSize: 10, color: colors.muted, marginTop: 12 }}>
            Nenhum material calculado a partir dos pratos.
          </Text>
        ) : null}

        {(extra?.kits ?? []).map((kit) => (
          <View key={kit.name}>
            <Text style={styles.sectionTitle}>
              {kit.name}
              {kit.scaleLabel ? ` · ${kit.scaleLabel}` : ""} · {kit.kitQty} kit
              {kit.kitQty === 1 ? "" : "s"}
            </Text>
            {kit.items.map((item, index) => (
              <View key={`${item.name}-${index}`} style={styles.row}>
                <Text style={styles.check}>{"\u2610"}</Text>
                <Text style={styles.name}>
                  {item.perKit}x {item.name}
                  {item.edited ? <Text style={styles.editedTag}> · editado</Text> : null}
                </Text>
                <Text style={styles.qty}>{item.total}</Text>
                <Text style={styles.unit}>un</Text>
                <Text style={styles.note} />
              </View>
            ))}
          </View>
        ))}

        {(extra?.extras ?? []).length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Extras / Equipamentos</Text>
            {extra!.extras!.map((item, index) => (
              <View key={`${item.name}-${index}`} style={styles.row}>
                <Text style={styles.check}>{"\u2610"}</Text>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.qty}>{item.quantity}</Text>
                <Text style={styles.unit}>un</Text>
                <Text style={styles.note} />
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Bebidas</Text>
        {DRINK_ITEMS.map((drink) => {
          const drinks =
            event.drinksAuto === false
              ? event.drinks
              : suggestedDrinkQuantities(guestTotal(event.guests));
          return (
            <View key={drink.key} style={styles.row}>
              <Text style={styles.check}>{"\u2610"}</Text>
              <Text style={styles.name}>{drink.label}</Text>
              <Text style={styles.qty}>{drinks[drink.key] || "—"}</Text>
              <Text style={styles.unit} />
              <Text style={styles.note} />
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>Fardamentos</Text>
        {UNIFORM_PIECES.map((piece) => (
          <View key={piece.key} style={styles.row}>
            <Text style={styles.check}>{"\u2610"}</Text>
            <Text style={styles.name}>{piece.label}</Text>
            <Text style={styles.qty}>
              {UNIFORM_SIZES.map(
                (size) => `${UNIFORM_SIZE_LABELS[size]} ${event.uniforms[piece.key][size] || 0}`,
              ).join("  ·  ")}
            </Text>
            <Text style={styles.unit} />
            <Text style={styles.note} />
          </View>
        ))}

        {extra?.notes?.trim() ? (
          <View>
            <Text style={styles.sectionTitle}>Observação geral</Text>
            <Text style={{ fontSize: 10, color: colors.muted, lineHeight: 1.4 }}>
              {extra.notes.trim()}
            </Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text>Lista operacional — sem valores financeiros</Text>
          <Text>
            Impresso em{" "}
            {new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadSeparationPdf(
  event: EventRecord,
  rows: SeparationPdfRow[],
  extra?: SeparationPdfExtras,
) {
  const blob = await pdf(<SeparationDocument event={event} rows={rows} extra={extra} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const slug = (event.title || "evento")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  link.href = url;
  link.download = `separacao-materiais-${(event.code || "").toLowerCase() || "evento"}-${slug}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
