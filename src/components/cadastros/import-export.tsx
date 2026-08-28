"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { Button } from "@/components/ui/button";
import { applyImport, buildExport, ENTITY_LABELS, type EntityKey } from "@/lib/cadastros/io";
import { exportToXlsx, readXlsx } from "@/lib/cadastros/xlsx";

export function ImportExport({ entity }: { entity: EntityKey }) {
  const { data, replaceAll } = useCadastros();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (!data) return;
    try {
      const { fileName, sheetName, headers, rows } = buildExport(entity, data);
      await exportToXlsx(`${fileName}-casa-braga`, sheetName, headers, rows);
      toast.success("Planilha exportada.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível exportar a planilha.");
    }
  };

  const handleFile = async (file: File) => {
    if (!data) return;
    setBusy(true);
    try {
      const rows = await readXlsx(file);
      if (rows.length === 0) {
        toast.error("Planilha vazia ou sem cabeçalho reconhecido.");
        return;
      }
      const { next, created, updated } = applyImport(entity, rows, data);
      if (created + updated === 0) {
        toast.error("Nenhum registro válido encontrado. Confira os títulos das colunas.");
        return;
      }
      const ok = window.confirm(
        `Importar ${ENTITY_LABELS[entity]}?\n\n${created} novo(s) · ${updated} atualizado(s)\n\nNada é apagado — apenas criado ou atualizado.`,
      );
      if (!ok) return;
      replaceAll(next);
      toast.success(`Importado: ${created} novo(s), ${updated} atualizado(s).`);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível ler a planilha. Exporte um modelo e use o mesmo formato.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xlsm"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button variant="outline" className="h-10 px-3" onClick={handleExport} disabled={!data}>
        <Download data-icon="inline-start" />
        Exportar
      </Button>
      <Button
        variant="outline"
        className="h-10 px-3"
        onClick={() => fileRef.current?.click()}
        disabled={!data || busy}
      >
        <Upload data-icon="inline-start" />
        {busy ? "Importando…" : "Importar"}
      </Button>
    </div>
  );
}
