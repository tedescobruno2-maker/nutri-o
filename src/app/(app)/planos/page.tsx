import { redirect } from "next/navigation";
import { getClientsBasic, getRecipes, getClientActivePlanId } from "@/lib/dal";
import { ClientPicker } from "@/components/planbuilder/ClientPicker";
import { PlanBuilder } from "@/components/planbuilder/PlanBuilder";
import { NewMealPlanButton } from "@/components/mealplan/NewMealPlanButton";

export default async function PlanosPage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  const { clientId } = await searchParams;
  const clients = await getClientsBasic();

  // Paciente já com plano em andamento — não recomeça do zero, abre direto o editor dele.
  if (clientId) {
    const activePlanId = await getClientActivePlanId(clientId);
    if (activePlanId) redirect(`/planos/${activePlanId}`);
  }

  const selected = clientId ? clients.find((c) => c.id === clientId) ?? null : null;
  const recipes = selected ? await getRecipes() : [];

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Plano Alimentar</h1>
          <p className="text-muted">Escolha um paciente para começar a montar o plano alimentar dele.</p>
        </div>
      </div>

      <ClientPicker clients={clients} selected={selected} />

      {selected && (
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card card-pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <strong>{selected.name}</strong>
              <p className="text-tertiary" style={{ fontSize: "0.8rem" }}>Sem plano em andamento — comece do zero ou monte a partir de receitas abaixo.</p>
            </div>
            <NewMealPlanButton clientId={selected.id} hasPlan={false} />
          </div>

          <div>
            <h2 style={{ marginBottom: 12, fontSize: "1rem" }}>Montar a partir de receitas</h2>
            <PlanBuilder clients={[selected]} recipes={recipes} initialClientId={selected.id} />
          </div>
        </div>
      )}
    </div>
  );
}
