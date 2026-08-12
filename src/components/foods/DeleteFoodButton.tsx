"use client";

import { useTransition } from "react";
import { deleteFood } from "@/actions/foods";

export function DeleteFoodButton({ foodId }: { foodId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      disabled={isPending}
      onClick={() => {
        if (confirm("Remover este alimento do banco?")) {
          startTransition(() => deleteFood(foodId));
        }
      }}
    >
      Remover
    </button>
  );
}
