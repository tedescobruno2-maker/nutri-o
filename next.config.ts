import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // O padrão do Next é 1 MB, e todo upload do sistema passa por Server Action (PDF de
      // exame, relatório da balança, foto de alimento, logo e assinatura). Um laudo
      // laboratorial real já passa de 1,8 MB, então o envio era rejeitado pelo framework
      // ANTES da action rodar — por isso aparecia a tela genérica de erro em vez da mensagem
      // tratada. 4 MB deixa folga sob o teto de 4,5 MB da Vercel (limite rígido da plataforma,
      // 413 FUNCTION_PAYLOAD_TOO_LARGE), contando o overhead do multipart.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
