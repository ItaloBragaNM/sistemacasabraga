import ExcelJS from "exceljs";
import { downloadBlob } from "@/lib/download";
import { LABOR_CONTA_AZUL_CATEGORY, type LaborPayment } from "./types";

function isoToBr(value: string) {
  const day = (value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return value || "";
  const [year, month, date] = day.split("-");
  return `${date}/${month}/${year}`;
}

export async function downloadContaAzulSheet(payments: LaborPayment[], fileName: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Lançamentos");
  const headers = [
    "Data de Competência",
    "Data de Vencimento",
    "Data de Pagamento",
    "Valor",
    "Categoria",
    "Descrição",
    "Cliente/Fornecedor",
    "CNPJ/CPF Cliente/Fornecedor",
    "Centro de custo",
    "Observações",
  ];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E443E" } };
    cell.font = { bold: true, color: { argb: "FFFFFBFA" } };
  });

  for (const payment of payments) {
    const date = isoToBr(payment.eventDate);
    const extra = [
      payment.overtimeHours ? `${payment.overtimeHours}h extra` : "",
      payment.allowance ? "ajuda de custo" : "",
      payment.pix ? `PIX ${payment.pix}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    sheet.addRow([
      date,
      date,
      "",
      -Math.abs(payment.total),
      LABOR_CONTA_AZUL_CATEGORY,
      `${payment.workerName} · ${payment.functionLabel} · ${payment.eventCode}`,
      payment.workerName,
      payment.workerCpf,
      payment.eventCode,
      extra,
    ]);
  }

  sheet.columns.forEach((column) => {
    column.width = 28;
  });
  sheet.getColumn(4).numFmt = "0.00";

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`,
  );
}
