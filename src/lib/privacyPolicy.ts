/**
 * Aviso de privacidade versionado (Fase 11, 6.2 A4/F2/F3). Fica em código (não em banco) de
 * propósito: qualquer alteração de texto passa por revisão do Bruno/Luana antes de publicar,
 * como qualquer outra mudança de produto — não é editável por um formulário na hora.
 *
 * `PRIVACY_POLICY_VERSION` é o valor gravado em `Consent.textVersion` — mude o número sempre que
 * o texto abaixo mudar de forma que afete o que o paciente aceitou.
 *
 * Aviso: texto redigido a partir da Parte 6 do plano mestre, que já traz o aviso de que não é
 * parecer jurídico (6.3) — mesma ressalva vale aqui.
 */

export const PRIVACY_POLICY_VERSION = "2026-08-26.1";

export const DPO_DISPENSA_JUSTIFICATIVA =
  "Consultório de nutricionista único (uma profissional, Luana Gois), enquadrado como agente de tratamento de pequeno porte pela Res. CD/ANPD 2/2022. A indicação de encarregado (DPO) é tratada pela ANPD como boa prática recomendada, não como obrigação, para agentes de pequeno porte que não realizam tratamento de alto risco — o critério geral de alto risco (tratamento em larga escala, ou que afete significativamente direitos fundamentais) não se configura aqui: consultório único, sem venda de sistema ou de base de dados a terceiros. Enquanto isso não mudar, a própria Luana Gois é o ponto de contato para exercício de direitos do titular. Se o sistema um dia for vendido a outras clínicas, esta análise precisa ser refeita antes.";

export const SUBPROCESSORS = [
  { name: "Vercel", purpose: "Hospedagem da aplicação (funções em gru1, São Paulo)" },
  { name: "Supabase", purpose: "Banco de dados e armazenamento de arquivos" },
  { name: "Resend", purpose: "Envio de e-mails transacionais (convites, notificações)" },
  { name: "Google Gemini", purpose: "Leitura assistida por IA de exames laboratoriais e sugestões nutricionais — nunca recebe nome, CPF, e-mail, telefone ou data de nascimento do paciente em texto; o PDF de exame enviado para leitura contém o nome impresso (ver ressalva)" },
];

export const PRIVACY_POLICY_SECTIONS = [
  {
    title: "Quem trata os seus dados",
    body: "Luana Gois, nutricionista responsável pelo consultório, é a controladora dos dados tratados neste sistema. Contato para qualquer assunto de privacidade: o telefone/e-mail cadastrados nas Configurações do consultório.",
  },
  {
    title: "Por que tratamos seus dados (base legal)",
    body: "O prontuário nutricional (anamnese, medidas, exames, plano alimentar, suplementação) é tratado com base na tutela da saúde por profissional de saúde (LGPD Art. 11, II, \"f\") — essa base dispensa consentimento para o cuidado em si. Tudo que estiver fora do cuidado direto (uso de IA na leitura de exames, telenutrição, uso de imagem em divulgação, marketing, pesquisa) depende do seu consentimento específico, que pode ser dado ou retirado a qualquer momento na aba \"Meus dados\" do portal.",
  },
  {
    title: "Por quanto tempo guardamos",
    body: "O prontuário é mantido por no mínimo 20 anos a partir do último registro clínico (Res. CFN 594/2017, Art. 3º, VI) — mesmo que você solicite exclusão, esse prazo prevalece sobre o direito de eliminação (LGPD Art. 16, I). Dados que não fazem parte do prontuário clínico (ex.: preferência de marketing) podem ser eliminados a pedido, a qualquer momento.",
  },
  {
    title: "Com quem seus dados são compartilhados",
    body: "Nunca vendemos nem cedemos sua base de dados a terceiros para vantagem econômica (vedado pela LGPD Art. 11, §4º). Usamos os seguintes prestadores de serviço (operadores) para o sistema funcionar:",
  },
  {
    title: "Seus direitos",
    body: "Confirmação de que tratamos seus dados, acesso ao que temos, correção, portabilidade (baixar uma cópia em formato legível por máquina), eliminação do que não precisa ficar guardado por obrigação legal, informação sobre com quem compartilhamos, e revogação de qualquer consentimento dado. Para exercer qualquer um, use a aba \"Meus dados\" do portal ou fale diretamente com a Luana — o prazo de resposta é de até 15 dias (LGPD Art. 19).",
  },
  {
    title: "Encarregado de proteção de dados (DPO)",
    body: DPO_DISPENSA_JUSTIFICATIVA,
  },
];
