export const MATERIAL_PHOTO_MAX_EDGE = 480;
export const MATERIAL_PHOTO_MAX_BYTES = 90 * 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image"));
    image.src = src;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encode"))),
      "image/jpeg",
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(blob);
  });
}

/** Compact JPEG data URL for catalog photos stored in app_state. */
export async function compressImageToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("not-image");
  }
  const source = await loadImage(await readFileAsDataUrl(file));
  const longest = Math.max(source.naturalWidth || source.width, source.naturalHeight || source.height) || 1;
  const scale = Math.min(1, MATERIAL_PHOTO_MAX_EDGE / longest);
  const width = Math.max(1, Math.round((source.naturalWidth || source.width) * scale));
  const height = Math.max(1, Math.round((source.naturalHeight || source.height) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#FFFBFA";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);

  let quality = 0.72;
  let blob = await canvasToJpeg(canvas, quality);
  while (blob.size > MATERIAL_PHOTO_MAX_BYTES && quality > 0.4) {
    quality -= 0.08;
    blob = await canvasToJpeg(canvas, quality);
  }
  if (blob.size > MATERIAL_PHOTO_MAX_BYTES) {
    throw new Error("too-large");
  }
  return blobToDataUrl(blob);
}

export function isImageDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}
