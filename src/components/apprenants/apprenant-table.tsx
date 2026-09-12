"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Archive,
  ChevronLeft,
  ChevronRight,
  UserRound,
} from "lucide-react";

import Swal from "sweetalert2";
import { toast } from "sonner";

import {
  ApprenantModal,
  type ApprenantModalData,
} from "./apprenant-modal";

import {
  deleteApprenant,
  archiveApprenant,
} from "@/actions/apprenant.actions";

interface ApprenantTableProps {
  apprenants: ApprenantModalData[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  statut?: string;
}

const STATUT_LABELS: Record<string, string> = {
  ACTIF: "Actif",
  INACTIF: "Inactif",
  DIPLOME: "Diplômé",
  SUSPENDU: "Suspendu",
  ARCHIVE: "Archivé",
};

const STATUT_CLASSES: Record<string, string> = {
  ACTIF: "badge-success",
  INACTIF: "badge-ghost",
  DIPLOME: "badge-info",
  SUSPENDU: "badge-warning",
  ARCHIVE: "badge-neutral",
};

export function ApprenantTable({
  apprenants,
  total,
  page,
  totalPages,
  search,
  statut,
}: ApprenantTableProps) {
  const router = useRouter();
  const currentSearchParams = useSearchParams();

  const [modalOpen, setModalOpen] = useState(false);

  const [selectedApprenant, setSelectedApprenant] =
    useState<ApprenantModalData | null>(null);

  const [searchValue, setSearchValue] = useState(search);

  const updateParams = (values: Record<string, string>) => {
    const params = new URLSearchParams(
      currentSearchParams.toString(),
    );

    Object.entries(values).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    router.push(`/apprenants?${params.toString()}`);
  };

  const handleSearch = () => {
    updateParams({
      q: searchValue.trim(),
      page: "1",
    });
  };

  const handleEdit = (apprenant: ApprenantModalData) => {
    setSelectedApprenant(apprenant);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedApprenant(null);
    setModalOpen(true);
  };

  // =========================================================
  // SUPPRESSION AVEC SWEETALERT2
  // =========================================================

  const handleDelete = async (
    apprenant: ApprenantModalData,
  ) => {
    const result = await Swal.fire({
      title: "Supprimer l'apprenant ?",
      html: `
        Vous êtes sur le point de supprimer
        <strong>${apprenant.prenom} ${apprenant.nom}</strong>.
        <br />
        <span style="color:#dc2626;">
          Cette action est irréversible.
        </span>
      `,
      icon: "warning",

      showCancelButton: true,

      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",

      reverseButtons: true,

      focusCancel: true,

      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",

      customClass: {
        popup: "rounded-2xl",
        confirmButton: "btn btn-error",
        cancelButton: "btn",
      },

      buttonsStyling: false,
    });

    if (!result.isConfirmed) {
      return;
    }

    // Afficher un état de chargement
    Swal.fire({
      title: "Suppression en cours...",
      text: "Veuillez patienter.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const response = await deleteApprenant(
        apprenant.id,
      );

      Swal.close();

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);

      router.refresh();
    } catch (error) {
      console.error(
        "Erreur suppression apprenant :",
        error,
      );

      Swal.close();

      toast.error(
        "Une erreur inattendue est survenue lors de la suppression.",
      );
    }
  };

  // =========================================================
  // ARCHIVAGE AVEC SWEETALERT2
  // =========================================================

  const handleArchive = async (
    apprenant: ApprenantModalData,
  ) => {
    const result = await Swal.fire({
      title: "Archiver l'apprenant ?",
      html: `
        Voulez-vous archiver
        <strong>${apprenant.prenom} ${apprenant.nom}</strong> ?
        <br />
        <span style="color:#64748b;">
          L'apprenant ne sera pas supprimé définitivement.
        </span>
      `,
      icon: "question",

      showCancelButton: true,

      confirmButtonText: "Oui, archiver",
      cancelButtonText: "Annuler",

      reverseButtons: true,

      focusCancel: true,

      confirmButtonColor: "#f59e0b",
      cancelButtonColor: "#64748b",

      customClass: {
        popup: "rounded-2xl",
        confirmButton: "btn btn-warning",
        cancelButton: "btn",
      },

      buttonsStyling: false,
    });

    if (!result.isConfirmed) {
      return;
    }

    // Afficher un état de chargement
    Swal.fire({
      title: "Archivage en cours...",
      text: "Veuillez patienter.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const response = await archiveApprenant(
        apprenant.id,
      );

      Swal.close();

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);

      router.refresh();
    } catch (error) {
      console.error(
        "Erreur archivage apprenant :",
        error,
      );

      Swal.close();

      toast.error(
        "Une erreur inattendue est survenue lors de l'archivage.",
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* ==================================================
          BARRE D'ACTIONS
      =================================================== */}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="join w-full sm:max-w-xl">
            <input
              value={searchValue}
              onChange={(event) =>
                setSearchValue(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="Rechercher un apprenant..."
              className="input input-bordered join-item w-full"
            />

            <button
              type="button"
              onClick={handleSearch}
              className="btn join-item bg-[#0f5da8] text-white hover:bg-[#0c4d8c]"
              title="Rechercher"
            >
              <Search size={18} />
            </button>
          </div>

          <select
            value={statut ?? ""}
            onChange={(event) =>
              updateParams({
                statut: event.target.value,
                page: "1",
              })
            }
            className="select select-bordered"
          >
            <option value="">
              Tous les statuts
            </option>

            <option value="ACTIF">
              Actifs
            </option>

            <option value="INACTIF">
              Inactifs
            </option>

            <option value="DIPLOME">
              Diplômés
            </option>

            <option value="SUSPENDU">
              Suspendus
            </option>

            <option value="ARCHIVE">
              Archivés
            </option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="btn border-0 bg-[#0f5da8] text-white hover:bg-[#0c4d8c]"
        >
          <Plus size={18} />

          Nouvel apprenant
        </button>
      </div>

      {/* ==================================================
          TABLEAU
      =================================================== */}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <table className="table">
          <thead>
            <tr>
              <th>Apprenant</th>
              <th>Numéro</th>
              <th>Contact</th>
              <th>Ville</th>
              <th>Statut</th>
              <th className="text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {apprenants.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <UserRound size={40} />

                    <p className="font-medium">
                      Aucun apprenant trouvé.
                    </p>

                    <button
                      type="button"
                      onClick={handleCreate}
                      className="btn btn-sm bg-[#0f5da8] text-white"
                    >
                      <Plus size={16} />
                      Ajouter un apprenant
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              apprenants.map((apprenant) => (
                <tr
                  key={apprenant.id}
                  className="hover"
                >
                  <td>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {apprenant.prenom}{" "}
                        {apprenant.nom}
                      </div>

                      {apprenant.email && (
                        <div className="text-xs text-slate-500">
                          {apprenant.email}
                        </div>
                      )}
                    </div>
                  </td>

                  <td>
                    <span className="font-mono text-sm">
                      {apprenant.numero ?? "—"}
                    </span>
                  </td>

                  <td>
                    {apprenant.telephone ?? "—"}
                  </td>

                  <td>
                    {apprenant.ville ?? "—"}
                  </td>

                  <td>
                    <span
                      className={`badge ${
                        STATUT_CLASSES[
                          apprenant.statut
                        ] ?? "badge-ghost"
                      }`}
                    >
                      {STATUT_LABELS[
                        apprenant.statut
                      ] ?? apprenant.statut}
                    </span>
                  </td>

                  <td>
                    <div className="flex justify-end gap-1">
                      {/* MODIFIER */}
                      <button
                        type="button"
                        onClick={() =>
                          handleEdit(apprenant)
                        }
                        className="btn btn-sm btn-ghost"
                        title="Modifier"
                      >
                        <Pencil size={16} />
                      </button>

                      {/* ARCHIVER */}
                      {apprenant.statut !==
                        "ARCHIVE" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleArchive(
                              apprenant,
                            )
                          }
                          className="btn btn-sm btn-ghost text-warning"
                          title="Archiver"
                        >
                          <Archive size={16} />
                        </button>
                      )}

                      {/* SUPPRIMER */}
                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            apprenant,
                          )
                        }
                        className="btn btn-sm btn-ghost text-error"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ==================================================
          PAGINATION
      =================================================== */}

      {totalPages > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {total} apprenant
            {total > 1 ? "s" : ""} · Page{" "}
            {page} sur {totalPages}
          </p>

          <div className="join">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                updateParams({
                  page: String(page - 1),
                })
              }
              className="btn join-item"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                updateParams({
                  page: String(page + 1),
                })
              }
              className="btn join-item"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================
          MODAL
      =================================================== */}

      <ApprenantModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        apprenant={selectedApprenant}
      />
    </div>
  );
}