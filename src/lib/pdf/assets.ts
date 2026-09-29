/** No navegador os arquivos vêm de /public; no Node (verificação de PDFs) vêm do disco. */
export function pdfAsset(path: string) {
  if (typeof window !== "undefined") return path;
  return `${process.cwd()}/public${path}`;
}
