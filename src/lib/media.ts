export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  const header = comma >= 0 ? dataUrl.slice(0, comma) : "";
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const mime = header.match(/data:([^;,]+)/)?.[1] || "application/octet-stream";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function fileNameForDataUrl(fileName: string, dataUrl: string) {
  if (/\.[a-z0-9]{2,5}$/i.test(fileName)) return fileName;
  const mime = dataUrl.match(/data:([^;,]+)/)?.[1] ?? "";
  if (mime === "image/jpeg") return `${fileName || "imagem"}.jpg`;
  if (mime === "image/png") return `${fileName || "imagem"}.png`;
  if (mime === "image/webp") return `${fileName || "imagem"}.webp`;
  if (mime.startsWith("video/")) return `${fileName || "video"}.mp4`;
  if (mime === "application/pdf") return `${fileName || "arquivo"}.pdf`;
  return fileName || "arquivo";
}

export function downloadDataUrl(dataUrl: string, fileName: string) {
  const url = URL.createObjectURL(dataUrlToBlob(dataUrl));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileNameForDataUrl(fileName, dataUrl);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function openDataUrl(dataUrl: string) {
  const url = URL.createObjectURL(dataUrlToBlob(dataUrl));
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.location.href = url;
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
