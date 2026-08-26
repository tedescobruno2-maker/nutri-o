"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRecipe } from "@/actions/recipes";

export function DeleteRecipeButton({ recipeId, recipeName }: { recipeId: string; recipeName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`Remover a receita "${recipeName}"?`)) {
          startTransition(async () => {
            await deleteRecipe(recipeId);
            router.push("/recipes");
          });
        }
      }}
    >
      Remover
    </button>
  );
}
