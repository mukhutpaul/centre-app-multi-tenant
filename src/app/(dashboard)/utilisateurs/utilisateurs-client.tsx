
"use client";

import { useState } from "react";

import UtilisateurTable from "@/components/utilisateurs/utilisateur-table";
import UtilisateurModal from "@/components/utilisateurs/utilisateur-modal";

/* ============================================================
   TYPES
============================================================ */

type Role =
  | "PROPRIETAIRE"
  | "ADMINISTRATEUR"
  | "RESPONSABLE"
  | "SECRETAIRE"
  | "COMPTABLE"
  | "FORMATEUR"
  | "JURY"
  | "APPRENANT";

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
  role: Role;
  statut: string;
  utilisateur: Utilisateur;
};

/* ============================================================
   PROPS
============================================================ */

type Props = {
  membres: Membre[];

  /**
   * Rôle de l'utilisateur actuellement connecté.
   *
   * Il est déterminé côté serveur dans page.tsx
   * puis transmis jusqu'aux composants clients.
   *
   * null peut notamment correspondre à un SUPER_ADMIN
   * qui n'a pas de rôle de membre dans un centre.
   */
  currentRole: Role | null;
};

/* ============================================================
   COMPOSANT
============================================================ */

export default function UtilisateursClient({
  membres,
  currentRole,
}: Props) {
  /* ==========================================================
     ÉTAT MODAL
  ========================================================== */

  const [modalOpen, setModalOpen] =
    useState(false);

  const [selected, setSelected] =
    useState<Membre | null>(null);

  /* ==========================================================
     LIGNES
  ========================================================== */

  const [rows, setRows] =
    useState<Membre[]>(membres);

  /* ==========================================================
     RAFRAÎCHISSEMENT
  ========================================================== */

  function refresh() {
    window.location.reload();
  }

  /* ==========================================================
     AJOUT
  ========================================================== */

  function handleAdd() {
    setSelected(null);
    setModalOpen(true);
  }

  /* ==========================================================
     MODIFICATION
  ========================================================== */

  function handleEdit(
    membre: Membre,
  ) {
    setSelected(membre);
    setModalOpen(true);
  }

  /* ==========================================================
     SUCCÈS MODAL
  ========================================================== */

  function handleSuccess() {
    setModalOpen(false);
    setSelected(null);
    refresh();
  }

  /* ==========================================================
     RENDU
  ========================================================== */

  return (
    <>
      {/* ======================================================
          TABLE DES UTILISATEURS
      ======================================================= */}

      <UtilisateurTable
        membres={rows}
        currentRole={currentRole}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onRefresh={refresh}
      />

      {/* ======================================================
          MODAL UTILISATEUR
      ======================================================= */}

      <UtilisateurModal
        open={modalOpen}
        membre={selected}
        currentRole={currentRole}
        onClose={() => {
          setModalOpen(false);
          setSelected(null);
        }}
        onSuccess={handleSuccess}
      />
    </>
  );
}
