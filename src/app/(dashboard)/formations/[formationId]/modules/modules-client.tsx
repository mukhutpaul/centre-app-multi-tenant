"use client";

import { useState } from "react";

import {
  ArrowLeft,
  BookOpen,
} from "lucide-react";

import { Role } from "@/generated/prisma/enums";

import ModuleModal from "@/components/formations/module-modal";
import { ModuleTable } from "@/components/formations/module-table";

interface ModulesClientProps {
  formation: any;
  modules: any[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  currentRole: Role | null;
  isSuperAdmin: boolean;
}

export default function ModulesClient({
  formation,
  modules,
  total,
  page,
  totalPages,
  search,
  currentRole,
  isSuperAdmin,
}: ModulesClientProps) {
  const [modalOpen, setModalOpen] =
    useState(false);

  const [selectedModule, setSelectedModule] =
    useState<any | null>(null);

  const canManage =
    isSuperAdmin ||
    currentRole === Role.PROPRIETAIRE ||
    currentRole === Role.ADMINISTRATEUR ||
    currentRole === Role.RESPONSABLE;

  function handleCreate() {
    setSelectedModule(null);
    setModalOpen(true);
  }

  function handleEdit(module: any) {
    setSelectedModule(module);
    setModalOpen(true);
  }

  function retourFormations() {
    window.location.href =
      "/formations";
  }

  return (
    <>
      <div className="space-y-6">
        {/* EN-TÊTE */}
        <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-6 w-6" />
              </div>

              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="badge badge-outline font-mono">
                    {formation.code}
                  </span>

                  <span className="badge badge-primary badge-outline">
                    {formation.type}
                  </span>
                </div>

                <h1 className="text-2xl font-bold">
                  {formation.nom}
                </h1>

                <p className="mt-1 text-sm text-base-content/60">
                  Gestion des modules de cette
                  formation
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={retourFormations}
              className="btn btn-outline"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux formations
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-base-200 p-4">
              <div className="text-xs text-base-content/60">
                Modules
              </div>

              <div className="mt-1 text-2xl font-bold">
                {formation._count?.modules ??
                  total}
              </div>
            </div>

            <div className="rounded-xl bg-base-200 p-4">
              <div className="text-xs text-base-content/60">
                Sessions
              </div>

              <div className="mt-1 text-2xl font-bold">
                {formation._count?.sessions ??
                  0}
              </div>
            </div>

            <div className="rounded-xl bg-base-200 p-4">
              <div className="text-xs text-base-content/60">
                Statut
              </div>

              <div className="mt-1 font-semibold">
                {formation.statut}
              </div>
            </div>

            <div className="rounded-xl bg-base-200 p-4">
              <div className="text-xs text-base-content/60">
                Durée
              </div>

              <div className="mt-1 font-semibold">
                {formation.dureeHeures ??
                  "—"}{" "}
                {formation.dureeHeures
                  ? "h"
                  : ""}
              </div>
            </div>
          </div>
        </div>

        {/* MODULES */}
        <ModuleTable
          modules={modules}
          total={total}
          page={page}
          totalPages={totalPages}
          search={search}
          canManage={canManage}
          onCreate={handleCreate}
          onEdit={handleEdit}
        />
      </div>

      {canManage && (
        <ModuleModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          formationId={formation.id}
          module={selectedModule}
        />
      )}
    </>
  );
}