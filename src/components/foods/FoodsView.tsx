"use client";

import { FoodCard } from "@/components/foods/FoodCard";
import { FoodsTable } from "@/components/foods/FoodsTable";
import { ViewToggle, useViewMode } from "@/components/ui/ViewToggle";
import type { getFoodsGrouped } from "@/lib/dal";

type FoodGroup = Awaited<ReturnType<typeof getFoodsGrouped>>[number];

export function FoodsView({ groups }: { groups: FoodGroup[] }) {
  const [mode, setMode] = useViewMode("view-mode:alimentos");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ViewToggle mode={mode} onChange={setMode} />
      </div>

      {mode === "table" ? (
        <FoodsTable groups={groups} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {groups.map((group) => (
            <FoodCard key={group.baseName} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
