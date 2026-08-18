import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY?.trim();
const from = process.env.EMAIL_FROM || "Nutri Luana Gois <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailResult = {
  ok: boolean;
  mode: "sent" | "test";
  error?: string;
};

/**
 * Envia um e-mail via Resend. Se RESEND_API_KEY não estiver configurada, roda em
 * "modo de teste": em vez de falhar, registra o conteúdo completo no console do
 * servidor e retorna sucesso — assim o fluxo (formulário marcado como enviado, etc.)
 * funciona de ponta a ponta mesmo antes de uma chave real ser configurada.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<SendEmailResult> {
  if (!resend) {
    console.log(
      `\n[email:modo-teste] RESEND_API_KEY não configurada — e-mail não enviado de verdade.\n` +
        `Para: ${to}\nAssunto: ${subject}\n---\n${html}\n---\n`
    );
    return { ok: true, mode: "test" };
  }

  try {
    const result = await resend.emails.send({ from, to, subject, html });
    if (result.error) {
      return { ok: false, mode: "sent", error: result.error.message };
    }
    return { ok: true, mode: "sent" };
  } catch (err) {
    return { ok: false, mode: "sent", error: err instanceof Error ? err.message : String(err) };
  }
}
