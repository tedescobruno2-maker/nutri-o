/** Teto de upload do sistema. Precisa acompanhar `serverActions.bodySizeLimit` no
 * next.config.ts — que por sua vez é limitado pelo teto rígido de 4,5 MB da Vercel para o corpo
 * da requisição. Acima disso o envio é rejeitado ANTES da Server Action rodar, então não há como
 * tratar o erro lá dentro: a validação precisa acontecer aqui, no navegador. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function formatMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1).replace(".", ",");
}

/** Retorna a mensagem de erro quando o arquivo passa do limite, ou null quando está ok. */
export function checkUploadSize(file: File | null | undefined): string | null {
  if (!file || file.size <= MAX_UPLOAD_BYTES) return null;
  return `O arquivo tem ${formatMb(file.size)} MB e o limite de envio é ${formatMb(MAX_UPLOAD_BYTES)} MB. Comprima o arquivo (ou divida em partes) e tente de novo.`;
}
