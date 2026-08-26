"use client";

import { useTransition } from "react";

/** Botão genérico de confirmar+executar uma server action, com erro (ex: bloqueio de remoção por
 * FK) mostrado ao usuário em vez de estourar silenciosamente. Usado nos 4 CRUDs de Suplementos. */
export function ConfirmActionButton({
  label,
  confirmText,
  onConfirm,
  className,
}: {
  label: React.ReactNode;
  confirmText: string;
  onConfirm: () => Promise<void>;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={className ?? "btn btn-ghost btn-sm"}
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(confirmText)) return;
        startTransition(async () => {
          try {
            await onConfirm();
          } catch (err) {
            alert(err instanceof Error ? err.message : "Falha ao executar a ação.");
          }
        });
      }}
    >
      {label}
    </button>
  );
}
