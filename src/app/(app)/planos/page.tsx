import { getClientsBasic, getRecipes } from "@/lib/dal";
import { PlanBuilder } from "@/components/planbuilder/PlanBuilder";

export default async function NewPlanPage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  const [{ clientId }, clients, recipes] = await Promise.all([searchParams, getClientsBasic(), getRecipes()]);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Montar Plano Alimentar</h1>
          <p className="text-muted">Selecione um paciente e monte o plano com receitas do acervo.</p>
        </div>
      </div>

      <PlanBuilder clients={clients} recipes={recipes} initialClientId={clientId} />
    </div>
  );
}
