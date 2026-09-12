"use client";

import { useState } from "react";
import UtilisateurTable from "@/components/utilisateurs/utilisateur-table";
import UtilisateurModal from "@/components/utilisateurs/utilisateur-modal";

type Utilisateur = {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  statut: string;
};

type Membre = {
  id: string;
  role: string;
  statut: string;
  utilisateur: Utilisateur;
};

export default function UtilisateursClient({
  membres,
}: {
  membres: Membre[];
}) {
  const [modalOpen, setModalOpen] =
    useState(false);

  const [selected, setSelected] =
    useState<Membre | null>(null);

  const [rows, setRows] =
    useState(membres);

  function refresh() {
    window.location.reload();
  }

  function handleAdd() {
    setSelected(null);
    setModalOpen(true);
  }

  function handleEdit(membre: Membre) {
    setSelected(membre);
    setModalOpen(true);
  }

  return (
    <>
      <UtilisateurTable
        membres={rows}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onRefresh={refresh}
      />

      <UtilisateurModal
        open={modalOpen}
        membre={selected}
        onClose={() =>
          setModalOpen(false)
        }
        onSuccess={refresh}
      />
    </>
  );
}