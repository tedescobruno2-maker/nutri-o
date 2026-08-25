import "server-only";
import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";

const ISSUER = "Nutri Luana Gois";

function buildTotp(secret: string, email: string) {
  return new TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}

/** Gera um novo segredo TOTP (base32) — ainda não fica ativo até `mfaEnabledAt` ser gravado. */
export function generateMfaSecret(): string {
  return new Secret({ size: 20 }).base32;
}

/** Data URL (PNG) do QR code para o app autenticador escanear. */
export async function getMfaQrCodeDataUrl(secret: string, email: string): Promise<string> {
  const totp = buildTotp(secret, email);
  return QRCode.toDataURL(totp.toString());
}

/** Verifica um código de 6 dígitos digitado pelo usuário, com tolerância de 1 passo (±30s). */
export function verifyMfaCode(secret: string, code: string, email: string): boolean {
  const totp = buildTotp(secret, email);
  const delta = totp.validate({ token: code.trim(), window: 1 });
  return delta !== null;
}
