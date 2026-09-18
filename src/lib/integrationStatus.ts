import "server-only";

/** Diagnóstico das integrações do servidor (Configurações → Diagnóstico).
 *
 * Existe porque variável de ambiente ausente em produção quebra um recurso inteiro em silêncio,
 * e o erro só aparece no momento em que a nutricionista tenta usar — foi o que aconteceu com a
 * GEMINI_API_KEY na importação de exames. Aqui dá para ver o estado antes de precisar.
 *
 * Nunca expõe o VALOR de um segredo — só se está definido ou não. A única exceção é a URL
 * pública do app, que não é segredo e precisa ser conferida de olho: se ficar apontando para
 * localhost em produção, os links de convite/reinício de senha enviados ao paciente não abrem. */

export type IntegrationStatus = {
  label: string;
  envVars: string[];
  configured: boolean;
  affects: string;
  value?: string;
};

function isSet(name: string): boolean {
  const v = process.env[name];
  return typeof v === "string" && v.trim() !== "";
}

export function getIntegrationStatus(): IntegrationStatus[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  return [
    {
      label: "Banco de dados",
      envVars: ["DATABASE_URL", "DIRECT_URL"],
      configured: isSet("DATABASE_URL") && isSet("DIRECT_URL"),
      affects: "Tudo — sem isto o sistema não abre.",
    },
    {
      label: "Inteligência artificial (Gemini)",
      envVars: ["GEMINI_API_KEY"],
      configured: isSet("GEMINI_API_KEY"),
      affects: "Importar exames em PDF, importar relatório da balança, preencher alimento com IA e sugerir medida caseira.",
    },
    {
      label: "Armazenamento de arquivos (Supabase Storage)",
      envVars: ["SUPABASE_URL", "SUPABASE_SECRET_KEY"],
      configured: isSet("SUPABASE_URL") && isSet("SUPABASE_SECRET_KEY"),
      affects: "Fotos de alimentos e receitas, logo, assinatura e anexos de exame.",
    },
    {
      label: "Envio de e-mail (Resend)",
      envVars: ["RESEND_API_KEY", "EMAIL_FROM"],
      configured: isSet("RESEND_API_KEY") && isSet("EMAIL_FROM"),
      affects: "Convite do portal do paciente, reinício de senha e formulário pré-consulta.",
    },
    {
      label: "Busca de imagens (Pixabay)",
      envVars: ["PIXABAY_API_KEY"],
      configured: isSet("PIXABAY_API_KEY"),
      affects: "Sugestão de foto ao cadastrar receita/alimento. Sem isto o resto funciona normal, só não sugere imagem.",
    },
    {
      label: "Endereço público do sistema",
      envVars: ["NEXT_PUBLIC_APP_URL"],
      // Em produção, apontar para localhost é tão quebrado quanto estar vazio: o link vai no
      // e-mail do paciente e não abre na máquina dele.
      configured: !!appUrl && !appUrl.includes("localhost"),
      affects: "Monta os links enviados por e-mail ao paciente (convite do portal e reinício de senha).",
      value: appUrl || "(não definido)",
    },
  ];
}
