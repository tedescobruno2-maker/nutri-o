import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

// Dois buckets, por sensibilidade do conteúdo (Fase 0 do plano mestre):
// - public-assets: fotos de alimentos/receitas/logo — não é dado pessoal, pode ficar público.
// - patient-docs: PDFs de exame e laudos — dado de saúde, nunca público. Servido por URL assinada
//   de TTL curto, gerada sob demanda (ver getSignedDocumentUrl em actions/upload.ts).
export const PUBLIC_BUCKET = "public-assets";
export const PATIENT_BUCKET = "patient-docs";

/**
 * Cliente Supabase server-side (chave secreta — nunca expor no browser).
 * `null` quando as variáveis de ambiente não estão configuradas, permitindo
 * que o app funcione localmente com armazenamento em disco (ver actions/upload.ts).
 */
export const supabaseAdmin = url && secretKey ? createClient(url, secretKey) : null;
