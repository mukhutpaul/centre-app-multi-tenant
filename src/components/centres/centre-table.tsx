"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Edit3,
  Plus,
  Power,
  Search,
  X,
  Filter,
  UserPlus,
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";

import { CentreModal } from "./centre-modal";
import { FirstUserModal } from "./first-user-modal";

import { toggleCentre } from "@/actions/centre.actions";

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

interface Centre {
  id: string;
  nom: string;
  slug: string;
  code: string;

  /**
   * StatutCentre dans Prisma :
   *
   * ESSAI
   * ACTIF
   * SUSPENDU
   * RESILIE
   */
  statut: "ESSAI" | "ACTIF" | "SUSPENDU" | "RESILIE";

  adresse: string | null;
  ville: string | null;
  pays: string | null;
  codePostal: string | null;

  telephone: string | null;
  email: string | null;

  siteWeb: string | null;
  logoUrl: string | null;

  devise: string;
  fuseauHoraire: string;
}

interface Props {
  centres: Centre[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export function CentreTable({
  centres,
  total,
  page,
  totalPages,
}: Props) {
  /**
   * ==========================================================
   * MODAL CENTRE
   * ==========================================================
   */

  const [modalOpen, setModalOpen] = useState(false);

  const [selectedCentre, setSelectedCentre] =
    useState<Centre | undefined>(undefined);

  /**
   * ==========================================================
   * MODAL PREMIER UTILISATEUR
   * ==========================================================
   */

  const [firstUserModalOpen, setFirstUserModalOpen] =
    useState(false);

  const [selectedCentreForUser, setSelectedCentreForUser] =
    useState<Centre | null>(null);

  /**
   * ==========================================================
   * RECHERCHE
   * ==========================================================
   */

  const [search, setSearch] = useState("");

  /**
   * ==========================================================
   * FILTRE STATUT
   * ==========================================================
   */

  const [statusFilter, setStatusFilter] = useState<
    "TOUS" | Centre["statut"]
  >("TOUS");

  /**
   * ==========================================================
   * CRÉATION CENTRE
   * ==========================================================
   */

  const openCreate = () => {
    setSelectedCentre(undefined);
    setModalOpen(true);
  };

  /**
   * ==========================================================
   * MODIFICATION CENTRE
   * ==========================================================
   */

  const openEdit = (centre: Centre) => {
    setSelectedCentre(centre);
    setModalOpen(true);
  };

  /**
   * ==========================================================
   * PREMIER UTILISATEUR
   * ==========================================================
   */

  const openFirstUser = (centre: Centre) => {
    /**
     * Un centre résilié ne peut pas recevoir
     * de nouvel utilisateur.
     */
    if (centre.statut === "RESILIE") {
      toast.error(
        "Un centre résilié ne peut pas recevoir de nouvel utilisateur.",
      );
      return;
    }

    setSelectedCentreForUser(centre);
    setFirstUserModalOpen(true);
  };

  /**
   * ==========================================================
   * FERMER PREMIER UTILISATEUR
   * ==========================================================
   */

  const closeFirstUser = () => {
    setFirstUserModalOpen(false);
    setSelectedCentreForUser(null);
  };

  /**
   * ==========================================================
   * ACTIVATION / SUSPENSION
   * ==========================================================
   *
   * Règles :
   *
   * ACTIF    -> SUSPENDU
   * SUSPENDU -> ACTIF
   * ESSAI    -> ACTIF
   * RESILIE  -> aucune action
   */

  const handleToggle = async (centre: Centre) => {
    /**
     * Sécurité côté interface.
     */
    if (centre.statut === "RESILIE") {
      toast.error(
        "Un centre résilié ne peut pas être réactivé.",
      );
      return;
    }

    const isActive = centre.statut === "ACTIF";

    const action = isActive
      ? "suspendre"
      : "activer";

    const result = await Swal.fire({
      title: isActive
        ? "Suspendre le centre ?"
        : "Activer le centre ?",

      text: `Voulez-vous ${action} « ${centre.nom} » ?`,

      icon: "warning",

      showCancelButton: true,

      confirmButtonText: isActive
        ? "Oui, suspendre"
        : "Oui, activer",

      cancelButtonText: "Annuler",

      confirmButtonColor: isActive
        ? "#dc2626"
        : "#16a34a",

      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const response = await toggleCentre(
        centre.id,
      );

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);

      window.location.reload();
    } catch (error) {
      console.error(
        "TOGGLE CENTRE:",
        error,
      );

      toast.error(
        "Impossible de modifier le statut du centre.",
      );
    }
  };

  /**
   * ==========================================================
   * BADGE STATUT
   * ==========================================================
   */

  const getStatusBadge = (
    statut: Centre["statut"],
  ) => {
    switch (statut) {
      case "ACTIF":
        return (
          <span className="badge badge-success gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
            Actif
          </span>
        );

      case "SUSPENDU":
        return (
          <span className="badge badge-warning gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            Suspendu
          </span>
        );

      case "RESILIE":
        return (
          <span className="badge badge-error gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Résilié
          </span>
        );

      case "ESSAI":
      default:
        return (
          <span className="badge badge-info gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Essai
          </span>
        );
    }
  };

  /**
   * ==========================================================
   * FILTRAGE LOCAL
   * ==========================================================
   */

  const filteredCentres = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return centres.filter((centre) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          centre.nom,
          centre.code,
          centre.ville,
          centre.pays,
          centre.telephone,
          centre.email,
        ]
          .filter(Boolean)
          .some((value) =>
            value!
              .toLowerCase()
              .includes(normalizedSearch),
          );

      const matchesStatus =
        statusFilter === "TOUS" ||
        centre.statut === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    centres,
    search,
    statusFilter,
  ]);

  /**
   * ==========================================================
   * FILTRES ACTIFS
   * ==========================================================
   */

  const hasFilters =
    search.trim() !== "" ||
    statusFilter !== "TOUS";

  /**
   * ==========================================================
   * RÉINITIALISATION
   * ==========================================================
   */

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("TOUS");
  };

  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <>
      <div className="space-y-4">

        {/* ====================================================
            EN-TÊTE
        ==================================================== */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Building2
                size={20}
                className="text-[#0f5da8]"
              />

              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Centres
              </h2>

              <span className="badge badge-ghost">
                {total}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Gestion des centres de formation.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="btn border-0 bg-[#0f5da8] text-white hover:bg-[#0c4d8c]"
          >
            <Plus size={18} />

            Nouveau centre
          </button>
        </div>

        {/* ====================================================
            RECHERCHE ET FILTRES
        ==================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">

            {/* Recherche */}

            <div className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Rechercher un centre, code, ville, e-mail..."
                className="input input-bordered w-full pl-10 pr-10"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="btn btn-circle btn-ghost btn-xs absolute right-2 top-1/2 -translate-y-1/2"
                  aria-label="Effacer la recherche"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Statut */}

            <div className="flex items-center gap-2">
              <Filter
                size={17}
                className="hidden text-slate-400 sm:block"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | "TOUS"
                      | Centre["statut"],
                  )
                }
                className="select select-bordered w-full sm:w-48"
              >
                <option value="TOUS">
                  Tous les statuts
                </option>

                <option value="ACTIF">
                  Actifs
                </option>

                <option value="ESSAI">
                  En essai
                </option>

                <option value="SUSPENDU">
                  Suspendus
                </option>

                <option value="RESILIE">
                  Résiliés
                </option>
              </select>
            </div>

            {/* Réinitialiser */}

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="btn btn-outline"
              >
                <X size={16} />

                Réinitialiser
              </button>
            )}
          </div>

          {/* Résultat */}

          <div className="mt-3 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {filteredCentres.length} centre
              {filteredCentres.length > 1
                ? "s"
                : ""}{" "}
              affiché
              {filteredCentres.length > 1
                ? "s"
                : ""}
            </span>

            {hasFilters && (
              <span>
                Filtre
                {search
                  ? ` : « ${search} »`
                  : ""}
                {statusFilter !==
                "TOUS"
                  ? ` · ${statusFilter}`
                  : ""}
              </span>
            )}
          </div>
        </div>

        {/* ====================================================
            TABLEAU
        ==================================================== */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="overflow-x-auto">
            <table className="table w-full">

              <thead>
                <tr>
                  <th>Centre</th>
                  <th>Code</th>
                  <th>Localisation</th>
                  <th>Contact</th>
                  <th>Statut</th>
                  <th className="text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>

                {filteredCentres.map(
                  (centre) => {
                    const isActive =
                      centre.statut ===
                      "ACTIF";

                    const isResilie =
                      centre.statut ===
                      "RESILIE";

                    return (
                      <tr
                        key={centre.id}
                        className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >

                        {/* ==================================
                            CENTRE
                        ================================== */}

                        <td>
                          <div className="flex items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0f5da8] dark:bg-blue-950/40">
                              <Building2
                                size={19}
                              />
                            </div>

                            <div className="min-w-0">

                              <p className="font-semibold text-slate-900 dark:text-white">
                                {centre.nom}
                              </p>

                              <p className="max-w-[220px] truncate text-xs text-slate-500">
                                {centre.email ||
                                  "Aucun e-mail"}
                              </p>

                            </div>
                          </div>
                        </td>

                        {/* ==================================
                            CODE
                        ================================== */}

                        <td>
                          <span className="badge badge-outline font-mono">
                            {centre.code}
                          </span>
                        </td>

                        {/* ==================================
                            LOCALISATION
                        ================================== */}

                        <td>
                          <div>

                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {centre.ville ||
                                "—"}
                            </p>

                            <p className="text-xs text-slate-500">
                              {centre.pays ||
                                "—"}
                            </p>

                          </div>
                        </td>

                        {/* ==================================
                            CONTACT
                        ================================== */}

                        <td>
                          <div className="space-y-1">

                            {centre.telephone && (
                              <p className="text-sm text-slate-700 dark:text-slate-300">
                                {
                                  centre.telephone
                                }
                              </p>
                            )}

                            {centre.email && (
                              <p className="max-w-[180px] truncate text-xs text-slate-500">
                                {
                                  centre.email
                                }
                              </p>
                            )}

                            {!centre.telephone &&
                              !centre.email && (
                                <span className="text-slate-400">
                                  —
                                </span>
                              )}

                          </div>
                        </td>

                        {/* ==================================
                            STATUT
                        ================================== */}

                        <td>
                          {getStatusBadge(
                            centre.statut,
                          )}
                        </td>

                        {/* ==================================
                            ACTIONS
                        ================================== */}

                        <td>
                          <div className="flex flex-wrap justify-end gap-2">

                            {/* ==================================
                                PREMIER UTILISATEUR
                            ================================== */}

                            <button
                              type="button"
                              onClick={() =>
                                openFirstUser(
                                  centre,
                                )
                              }
                              disabled={
                                isResilie
                              }
                              className="btn btn-sm border-blue-200 bg-white text-blue-600 hover:border-blue-300 hover:bg-blue-50 dark:border-blue-900 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-blue-950/30 disabled:cursor-not-allowed disabled:opacity-50"
                              title={
                                isResilie
                                  ? "Un centre résilié ne peut pas recevoir de nouvel utilisateur"
                                  : "Ajouter le premier utilisateur"
                              }
                            >
                              <UserPlus
                                size={15}
                              />

                              <span>
                                1er utilisateur
                              </span>
                            </button>

                            {/* ==================================
                                MODIFIER
                            ================================== */}

                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  centre,
                                )
                              }
                              className="btn btn-sm border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-[#0f5da8] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                              title="Modifier le centre"
                            >
                              <Edit3
                                size={15}
                              />

                              <span>
                                Modifier
                              </span>
                            </button>

                            {/* ==================================
                                ACTIVER / SUSPENDRE
                            ================================== */}

                            {!isResilie && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggle(
                                    centre,
                                  )
                                }
                                className={
                                  isActive
                                    ? "btn btn-sm border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-slate-800 dark:hover:bg-red-950/30"
                                    : "btn btn-sm border-green-200 bg-white text-green-600 hover:bg-green-50 dark:border-green-900 dark:bg-slate-800 dark:hover:bg-green-950/30"
                                }
                                title={
                                  isActive
                                    ? "Suspendre le centre"
                                    : "Activer le centre"
                                }
                              >
                                <Power
                                  size={15}
                                />

                                <span>
                                  {isActive
                                    ? "Suspendre"
                                    : "Activer"}
                                </span>
                              </button>
                            )}

                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}

              </tbody>
            </table>
          </div>

          {/* ==================================================
              AUCUN CENTRE
          ================================================== */}

          {filteredCentres.length ===
            0 && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">

              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                {hasFilters ? (
                  <Search
                    size={28}
                  />
                ) : (
                  <Building2
                    size={28}
                  />
                )}
              </div>

              <h3 className="font-bold text-slate-900 dark:text-white">
                {hasFilters
                  ? "Aucun résultat"
                  : "Aucun centre trouvé"}
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {hasFilters
                  ? "Aucun centre ne correspond aux critères de recherche."
                  : "Aucun centre ne correspond aux critères de recherche."}
              </p>

              {hasFilters ? (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="btn btn-sm mt-5"
                >
                  <X size={16} />

                  Réinitialiser
                  les filtres
                </button>
              ) : (
                <button
                  type="button"
                  onClick={
                    openCreate
                  }
                  className="btn btn-sm mt-5 border-0 bg-[#0f5da8] text-white hover:bg-[#0c4d8c]"
                >
                  <Plus size={16} />

                  Ajouter un
                  centre
                </button>
              )}

            </div>
          )}
        </div>

        {/* ====================================================
            PAGINATION
        ==================================================== */}

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-sm text-slate-500">
              Page {page} sur{" "}
              {totalPages}
            </p>

            <div className="join">

              {Array.from(
                {
                  length:
                    totalPages,
                },
                (_, index) =>
                  index + 1,
              ).map((item) => (
                <a
                  key={item}
                  href={`/centres?page=${item}`}
                  className={`join-item btn btn-sm ${
                    item === page
                      ? "btn-active bg-[#0f5da8] text-white"
                      : ""
                  }`}
                >
                  {item}
                </a>
              ))}

            </div>
          </div>
        )}

      </div>

      {/* ======================================================
          MODAL CENTRE
      ====================================================== */}

      <CentreModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedCentre(
            undefined,
          );
        }}
        centre={selectedCentre}
      />

      {/* ======================================================
          MODAL PREMIER UTILISATEUR
      ====================================================== */}

      <FirstUserModal
        open={firstUserModalOpen}
        centre={
          selectedCentreForUser
            ? {
                id: selectedCentreForUser.id,
                nom: selectedCentreForUser.nom,
                code: selectedCentreForUser.code,
              }
            : null
        }
        onClose={
          closeFirstUser
        }
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </>
  );
}