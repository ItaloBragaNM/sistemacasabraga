import ExcelJS from "exceljs";

export type Cell = string | number;

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleDateString("pt-BR");
  if (typeof value === "object") {
    const rich = value as { text?: string; result?: unknown; hyperlink?: string };
    if (typeof rich.text === "string") return rich.text.trim();
    if (rich.result !== undefined) return cellToString(rich.result);
    return "";
  }
  return String(value).trim();
}

export async function exportToXlsx(
  fileName: string,
  sheetName: string,
  headers: string[],
  rows: Cell[][],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31) || "Dados");
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E443E" } };
    cell.font = { bold: true, color: { argb: "FFFFFBFA" } };
  });
  for (const row of rows) sheet.addRow(row);
  sheet.columns.forEach((column) => {
    let max = 12;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      max = Math.max(max, String(cell.value ?? "").length + 2);
    });
    column.width = Math.min(max, 48);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Reads the first sheet into row objects keyed by the header cells. */
export async function readXlsx(file: File): Promise<Record<string, string>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerCells = (sheet.getRow(1).values as unknown[]) ?? [];
  const headers = headerCells.slice(1).map((value) => cellToString(value));

  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = (row.values as unknown[]).slice(1);
    const record: Record<string, string> = {};
    let hasContent = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const text = cellToString(values[index]);
      record[header] = text;
      if (text) hasContent = true;
    });
    if (hasContent) rows.push(record);
  });
  return rows;
}
