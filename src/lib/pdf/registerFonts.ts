import { Font } from "@react-pdf/renderer";
import path from "node:path";

// Compartilhado entre todos os documentos PDF (MealPlanDocument, SupplementPrescriptionDocument).
// Roboto embutido (baixado de fonts.gstatic.com) — nunca a fonte padrão do @react-pdf, que não
// tem os acentos do português.
Font.register({
  family: "Roboto",
  fonts: [
    { src: path.join(process.cwd(), "src/lib/pdf/fonts/Roboto-Regular.ttf"), fontWeight: "normal" },
    { src: path.join(process.cwd(), "src/lib/pdf/fonts/Roboto-Bold.ttf"), fontWeight: "bold" },
  ],
});

// Desativa a hifenização automática (o dicionário embutido é de inglês, e quebraria palavras em
// português de forma errada) — também evita um bug de resolução de módulo do @react-pdf/hyphenate
// fora do bundler do Next.
Font.registerHyphenationCallback((word) => [word]);
