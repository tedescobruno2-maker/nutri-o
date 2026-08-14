// Catálogo de exames laboratoriais comumente solicitados em consultas de nutrição.
// Usado para montar a lista de seleção ao solicitar exames para um paciente.

export type ExamCatalogGroup = {
  category: string;
  exams: string[];
};

export const EXAMS_CATALOG: ExamCatalogGroup[] = [
  {
    category: "Hemograma e Glicemia",
    exams: [
      "Hemograma completo",
      "Glicemia de jejum",
      "Hemoglobina glicada (HbA1c)",
      "Insulina de jejum",
      "Curva glicêmica (TOTG)",
      "Peptídeo C",
    ],
  },
  {
    category: "Perfil Lipídico",
    exams: ["Colesterol total e frações (HDL, LDL, VLDL)", "Triglicerídeos", "Apolipoproteína B"],
  },
  {
    category: "Função Tireoidiana",
    exams: ["TSH", "T4 livre", "T3", "Anti-TPO", "Anti-tireoglobulina"],
  },
  {
    category: "Função Renal",
    exams: ["Ureia", "Creatinina", "Ácido úrico", "Taxa de filtração glomerular (TFG)", "Sódio e Potássio"],
  },
  {
    category: "Função Hepática",
    exams: ["TGO (AST)", "TGP (ALT)", "Gama GT", "Fosfatase alcalina", "Bilirrubinas totais e frações"],
  },
  {
    category: "Vitaminas e Minerais",
    exams: [
      "Vitamina D (25-OH)",
      "Vitamina B12",
      "Ácido fólico",
      "Ferro sérico",
      "Ferritina",
      "Transferrina/Saturação de transferrina",
      "Zinco",
      "Magnésio",
      "Cálcio total e iônico",
      "Ômega 3 index",
    ],
  },
  {
    category: "Hormônios",
    exams: [
      "Cortisol",
      "Testosterona total",
      "Testosterona livre",
      "Estradiol",
      "Progesterona",
      "LH",
      "FSH",
      "Prolactina",
      "DHEA-S",
      "SHBG",
      "Insulina",
    ],
  },
  {
    category: "Marcadores Inflamatórios e Outros",
    exams: [
      "Proteína C reativa (PCR)",
      "Homocisteína",
      "Eletroforese de proteínas",
      "Exame de urina (EAS)",
      "Parasitológico de fezes",
      "Impedância bioelétrica (bioimpedância)",
      "Eletrocardiograma (ECG)",
    ],
  },
];

export const ALL_CATALOG_EXAMS = EXAMS_CATALOG.flatMap((g) => g.exams);
