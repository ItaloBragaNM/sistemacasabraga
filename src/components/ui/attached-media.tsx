"use client";

import { Download, ExternalLink, Trash2 } from "lucide-react";
import { isImageDataUrl } from "@/lib/images";
import { downloadDataUrl, openDataUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export function MediaActions({
  dataUrl,
  fileName,
  className,
}: {
  dataUrl: string;
  fileName: string;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      <button
        type="button"
        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] text-forest/70 hover:bg-forest/5 hover:text-forest"
        onClick={() => openDataUrl(dataUrl)}
      >
        <ExternalLink className="size-3.5" />
        Abrir
      </button>
      <button
        type="button"
        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] text-forest/70 hover:bg-forest/5 hover:text-forest"
        onClick={() => downloadDataUrl(dataUrl, fileName)}
      >
        <Download className="size-3.5" />
        Baixar
      </button>
    </div>
  );
}

export function AttachedMediaRow({
  name,
  dataUrl,
  mime,
  onRemove,
}: {
  name: string;
  dataUrl: string;
  mime?: string;
  onRemove?: () => void;
}) {
  const image = (mime ?? "").startsWith("image/") || isImageDataUrl(dataUrl);
  return (
    <li className="flex items-center gap-3 rounded-md border border-line px-3 py-2 text-sm">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="" className="size-12 shrink-0 rounded-md object-cover ring-1 ring-line" />
      ) : (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-forest/[0.04] text-[11px] text-forest/45">
          Vídeo
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-forest">{name}</span>
      <MediaActions dataUrl={dataUrl} fileName={name} />
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remover ${name}`}
          className="flex size-8 shrink-0 items-center justify-center text-forest/35 hover:text-danger"
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
    </li>
  );
}
