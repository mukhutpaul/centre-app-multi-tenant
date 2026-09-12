"use client";

import { useState } from "react";

import {
  StatutFormateur,
  Role,
} from "@/generated/prisma/enums";

import FormateurModal from "@/components/formateurs/formateur-modal";
import { FormateurTable } from "@/components/formateurs/formateur-table";

interface FormateursClientProps {
  formateurs: any[];

  // ============================================================
  // PAGINATION
  // ============================================================
  total: number;
  page: number;
  totalPages: number;

  // ============================================================
  // FILTRES
  // ============================================================
  search: string;
  statut: StatutFormateur | "TOUS";

  // ============================================================
  // AUTHORIZATION
  // ============================================================
  currentRole: Role | null;
  isSuperAdmin: boolean;
}

export default function FormateursClient({
  formateurs,
  total,
  page,
  totalPages,
  search,
  statut,
  currentRole,
  isSuperAdmin,
}: FormateursClientProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const [selectedFormateur, setSelectedFormateur] =
    useState<any | null>(null);

  // ============================================================
  // PERMISSIONS
  // ============================================================

  const canManage =
    isSuperAdmin ||
    currentRole === Role.PROPRIETAIRE ||
    currentRole === Role.ADMINISTRATEUR ||
    currentRole === Role.RESPONSABLE;

  // ============================================================
  // CRÉATION
  // ============================================================

  function handleCreate() {
    setSelectedFormateur(null);
    setModalOpen(true);
  }

  // ============================================================
  // MODIFICATION
  // ============================================================

  function handleEdit(formateur: any) {
    setSelectedFormateur(formateur);
    setModalOpen(true);
  }

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <>
      <FormateurTable
        formateurs={formateurs}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        statut={statut}
        canManage={canManage}
        onCreate={handleCreate}
        onEdit={handleEdit}
      />

      {/* ========================================================
          MODAL FORMATEUR
      ======================================================== */}

      {canManage && (
        <FormateurModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          formateur={selectedFormateur}
        />
      )}
    </>
  );
}