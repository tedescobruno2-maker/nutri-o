import { getSupplementCatalog } from "@/lib/dal";
import { SupplementsView } from "@/components/suplementos/SupplementsView";

export default async function SuplementosPage() {
  const catalog = await getSupplementCatalog();

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Suplementos</h1>
          <p className="text-muted">Catálogo de ativos, marcas/produtos e fórmulas manipuladas (Fase 6).</p>
        </div>
      </div>

      <SupplementsView {...catalog} />
    </div>
  );
}
