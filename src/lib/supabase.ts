import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

export const STORAGE_BUCKET = "uploads";

/**
 * Cliente Supabase server-side (chave secreta — nunca expor no browser).
 * `null` quando as variáveis de ambiente não estão configuradas, permitindo
 * que o app funcione localmente com armazenamento em disco (ver actions/upload.ts).
 */
export const supabaseAdmin = url && secretKey ? createClient(url, secretKey) : null;
