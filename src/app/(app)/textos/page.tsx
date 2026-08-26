import { getGuidanceTexts } from "@/lib/dal";
import { GuidanceTextsView } from "@/components/settings/GuidanceTextsView";
import { GuidanceTextModal } from "@/components/settings/GuidanceTextModal";

export default async function GuidanceTextsPage() {
  const texts = await getGuidanceTexts();

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
        <GuidanceTextsView texts={texts} />
      )}
    </div>
  );
}
