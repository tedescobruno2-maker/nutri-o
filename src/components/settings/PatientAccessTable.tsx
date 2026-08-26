"use client";

import { useMemo, useState } from "react";
import { PatientAccessRow } from "@/components/settings/PatientAccessRow";

type PatientAccess = {
  id: string;
  name: string;
  email: string | null;
  userId: string | null;
  portalAccessScope: string;
  user: { active: boolean; mustChangePassword: boolean; lastLoginAt: Date | null } | null;
};

export function PatientAccessTable({ clients }: { clients: PatientAccess[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return clients;
    const q = query.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, query]);

  return (
    <div className="card card-pad">
      <input
        className="input"
        type="search"
        placeholder="Buscar paciente..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ maxWidth: 320, marginBottom: 14 }}
      />
      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Status do portal</th>
              <th>Navegação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((client) => (
              <PatientAccessRow key={client.id} client={client} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
