/**
 * Uploads são servidos em /api/uploads/:file. URLs absolutas gravadas antes
 * (ou vindas de produção) viram caminho relativo para carregar pelo proxy local.
 */
export function assetSrc(url: string | null | undefined): string {
  if (!url) return "";
  const match = url.match(/\/api\/uploads\/[A-Za-z0-9._-]+/);
  return match ? match[0] : url;
}
