import { getGuidanceTexts } from "@/lib/dal";
import { GuidanceTextCard } from "@/components/settings/GuidanceTextCard";
import { GuidanceTextModal } from "@/components/settings/GuidanceTextModal";

const TYPE_LABELS: Record<string, string> = {
  ORIENTACAO_GERAL: "Orientação geral",
  HIDRATACAO: "Hidratação",
  SUPLEMENTACAO: "Suplementação",
  PRE_TREINO: "Pré-treino",
  TAREFA_INICIAL: "Tarefa inicial",
};

export default async function GuidanceTextsPage() {
  const texts = await getGuidanceTexts();
  const byType = new Map<string, typeof texts>();
  for (const t of texts) {
    const list = byType.get(t.type) ?? [];
    list.push(t);
    byType.set(t.type, list);
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Biblioteca de Textos</h1>
          <p className="text-muted">Frases e orientações reutilizáveis nos planos alimentares.</p>
        </div>
        <GuidanceTextModal trigger={<span className="btn btn-primary">+ Novo texto</span>} />
      </div>

      {texts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span style={{ fontSize: "2rem" }}>📚</span>
            <p>Nenhum texto cadastrado ainda.</p>
          </div>
        </div>
      ) : (
        Object.keys(TYPE_LABELS).map((type) => {
          const list = byType.get(type);
          if (!list || list.length === 0) return null;
          return (
            <section key={type} className="section">
              <h2 style={{ marginBottom: 12, fontSize: "1rem" }}>{TYPE_LABELS[type]}</h2>
              <div className="patient-cards-grid">
                {list.map((t) => (
                  <GuidanceTextCard key={t.id} text={t} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
