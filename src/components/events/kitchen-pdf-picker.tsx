"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/cadastros/ui";
import {
  ALL_KITCHEN_PDF_SECTIONS,
  downloadKitchenPdf,
  KITCHEN_PDF_SECTIONS,
  type KitchenPdfSectionKey,
} from "@/components/events/kitchen-pdf";
import { Button } from "@/components/ui/button";
import { eventImageAttachments, type EventRecord } from "@/lib/types";
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
  return open ? <KitchenPdfPickerForm key={event.id} {...{ event, working, onClose, onWorking }} /> : null;
}

function KitchenPdfPickerForm({
  event,
  working,
  onClose,
  onWorking,
}: {
  event: EventRecord;
  working: boolean;
  onClose: () => void;
  onWorking: (value: boolean) => void;
}) {
  const [mode, setMode] = useState<"completa" | "especifica">("completa");
  const [sections, setSections] = useState<KitchenPdfSectionKey[]>([...ALL_KITCHEN_PDF_SECTIONS]);
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const imageCount = eventImageAttachments(event.attachments).length;

  const toggle = (key: KitchenPdfSectionKey) => {
    setMode("especifica");
    setSections((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  const download = async () => {
    const chosen: KitchenPdfSectionKey[] =
      mode === "completa" ? [...ALL_KITCHEN_PDF_SECTIONS] : [...sections];
    if (includeAttachments) chosen.push("anexos");
    if (chosen.length === 0) {
      toast.error("Selecione ao menos uma seção.");
      return;
    }
    try {
      onWorking(true);
      await downloadKitchenPdf(event, chosen);
      toast.success(mode === "completa" ? "PDF completo baixado." : "PDF do relatório baixado.");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      onWorking(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Baixar PDF do relatório">
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
            Relatório completo
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
          <p className="text-xs font-medium text-forest/50">Seções do relatório</p>
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
        <label
          className={cn(
            "flex cursor-pointer items-start gap-2 rounded-lg border border-forest/15 px-3 py-2 text-sm text-forest",
            imageCount === 0 && "cursor-not-allowed opacity-55",
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-forest"
            checked={includeAttachments}
            disabled={imageCount === 0}
            onChange={(event) => setIncludeAttachments(event.target.checked)}
          />
          <span>
            Incluir imagens anexadas
            <span className="mt-0.5 block text-xs text-forest/50">
              {imageCount === 0
                ? "Nenhuma imagem neste relatório. Anexe em Fotos e vídeos."
                : `${imageCount} imagem${imageCount === 1 ? "" : "ns"} no PDF.`}
            </span>
          </span>
        </label>
        <div className="flex justify-end gap-2 border-t border-forest/10 pt-4">
          <Button type="button" variant="outline" className="h-10" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-10 px-5"
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
