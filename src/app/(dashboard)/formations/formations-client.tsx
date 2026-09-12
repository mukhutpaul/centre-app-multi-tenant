
"use client";

import { useState } from "react";

import {
  Role,
  StatutFormation,
  TypeFormation,
} from "@/generated/prisma/enums";

import FormationModal from "@/components/formations/formation-modal";
import { FormationTable } from "@/components/formations/formation-table";

/**
 * ============================================================
 * PROPS
 * ============================================================
 */

interface FormationsClientProps {
  formations: any[];

  total: number;

  page: number;

  totalPages: number;

  search: string;

  statut:
    | StatutFormation
    | "TOUS";

  type:
    | TypeFormation
    | "TOUS";

  currentRole: Role | null;

  isSuperAdmin: boolean;
}

/**
 * ============================================================
 * COMPOSANT
 * ============================================================
 */

export default function FormationsClient({
  formations,
  total,
  page,
  totalPages,
  search,
  statut,
  type,
  currentRole,
  isSuperAdmin,
}: FormationsClientProps) {
  const [modalOpen, setModalOpen] =
    useState(false);

  const [
    selectedFormation,
    setSelectedFormation,
  ] = useState<any | null>(null);

  /**
   * ----------------------------------------------------------
   * DROITS DE GESTION
   * ----------------------------------------------------------
   *
   * Même logique que FormateurTable :
   *
   * SUPER_ADMIN
   * PROPRIETAIRE
   * ADMINISTRATEUR
   * RESPONSABLE
   */

  const canManage =
    isSuperAdmin ||
    currentRole ===
      Role.PROPRIETAIRE ||
    currentRole ===
      Role.ADMINISTRATEUR ||
    currentRole ===
      Role.RESPONSABLE;

  /**
   * ----------------------------------------------------------
   * CRÉATION
   * ----------------------------------------------------------
   */

  function handleCreate() {
    setSelectedFormation(
      null
    );

    setModalOpen(true);
  }

  /**
   * ----------------------------------------------------------
   * MODIFICATION
   * ----------------------------------------------------------
   */

  function handleEdit(
    formation: any
  ) {
    setSelectedFormation(
      formation
    );

    setModalOpen(true);
  }

  /**
   * ----------------------------------------------------------
   * RENDU
   * ----------------------------------------------------------
   */

  return (
    <>
      <FormationTable
        formations={formations}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        statut={statut}
        type={type}
        canManage={canManage}
        onCreate={handleCreate}
        onEdit={handleEdit}
      />

      {canManage && (
        <FormationModal
          open={modalOpen}
          onOpenChange={
            setModalOpen
          }
          formation={
            selectedFormation
          }
        />
      )}
    </>
  );
}
