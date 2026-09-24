"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/cadastros/ui";
import {
  ALL_KITCHEN_PDF_SECTIONS,
  downloadKitchenPdf,
  KITCHEN_PDF_SECTIONS,
  type KitchenPdfSectionKey,
} from "@/components/events/kitchen-pdf";
import { Button } from "@/components/ui/button";
import type { EventRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

export function KitchenPdfPicker({
  open,
  event,
  working,
  onClose,
  onWorking,
}: {
  open: boolean;
  event: EventRecord;
  working: boolean;
  onClose: () => void;
  onWorking: (value: boolean) => void;
}) {
  const [mode, setMode] = useState<"completa" | "especifica">("completa");
  const [sections, setSections] = useState<KitchenPdfSectionKey[]>(ALL_KITCHEN_PDF_SECTIONS);

  useEffect(() => {
    if (!open) return;
    setMode("completa");
    setSections(ALL_KITCHEN_PDF_SECTIONS);
  }, [open]);

  const toggle = (key: KitchenPdfSectionKey) => {
    setMode("especifica");
    setSections((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  const download = async () => {
    const chosen = mode === "completa" ? ALL_KITCHEN_PDF_SECTIONS : sections;
    if (chosen.length === 0) {
      toast.error("Selecione ao menos uma seção.");
      return;
    }
    try {
      onWorking(true);
      await downloadKitchenPdf(event, chosen);
      toast.success(mode === "completa" ? "PDF completo baixado." : "PDF da ficha baixado.");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      onWorking(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Baixar PDF da ficha">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("completa");
              setSections(ALL_KITCHEN_PDF_SECTIONS);
            }}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-sm",
              mode === "completa"
                ? "border-forest bg-forest/8 font-medium text-forest"
                : "border-forest/15 text-forest/70 hover:border-forest/30",
            )}
          >
            Ficha completa
          </button>
          <button
            type="button"
            onClick={() => setMode("especifica")}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-sm",
              mode === "especifica"
                ? "border-forest bg-forest/8 font-medium text-forest"
                : "border-forest/15 text-forest/70 hover:border-forest/30",
            )}
          >
            Informações específicas
          </button>
        </div>
        <div className={cn("space-y-2", mode === "completa" && "opacity-55")}>
          <p className="text-xs font-medium text-forest/50">Seções da ficha</p>
          {KITCHEN_PDF_SECTIONS.map((item) => {
            const checked = mode === "completa" || sections.includes(item.key);
            return (
              <label key={item.key} className="flex cursor-pointer items-center gap-2 text-sm text-forest">
                <input
                  type="checkbox"
                  className="size-4 accent-forest"
                  checked={checked}
                  disabled={mode === "completa"}
                  onChange={() => toggle(item.key)}
                />
                {item.label}
              </label>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 border-t border-forest/10 pt-4">
          <Button type="button" variant="outline" className="h-10" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-10 bg-terracotta px-5 text-cream hover:bg-terracotta/90"
            disabled={working}
            onClick={() => void download()}
          >
            {working ? "Gerando…" : "Baixar PDF"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
