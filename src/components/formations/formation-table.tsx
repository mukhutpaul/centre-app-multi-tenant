"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import {
  StatutFormation,
  TypeFormation,
} from "@/generated/prisma/enums";

import {
  deleteFormation,
  updateFormationStatut,
} from "@/actions/formation.actions";

import Swal from "sweetalert2";

import {
  Archive,
  BadgeDollarSign,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Layers3,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

interface FormationTableProps {
  formations: any[];

  total: number;

  page: number;

  totalPages: number;

  search: string;

  statut: StatutFormation | "TOUS";

  type: TypeFormation | "TOUS";

  canManage: boolean;

  onCreate: () => void;

  onEdit: (formation: any) => void;
}

/**
 * ============================================================
 * LABELS
 * ============================================================
 */

const statutLabels: Record<
  StatutFormation,
  string
> = {
  BROUILLON: "Brouillon",
  ACTIVE: "Active",
  ARCHIVEE: "Archivée",
};

const typeLabels: Record<
  TypeFormation,
  string
> = {
  PRESENTIEL: "Présentiel",
  DISTANCIEL: "Distanciel",
  HYBRIDE: "Hybride",
};

/**
 * ============================================================
 * BADGE STATUT
 * ============================================================
 */

function StatutBadge({
  statut,
}: {
  statut: StatutFormation;
}) {
  const classes: Record<
    StatutFormation,
    string
  > = {
    BROUILLON:
      "badge badge-warning badge-sm gap-1",

    ACTIVE:
      "badge badge-success badge-sm gap-1",

    ARCHIVEE:
      "badge badge-neutral badge-sm gap-1",
  };

  return (
    <span className={classes[statut]}>
      <span
        className="h-1.5 w-1.5 rounded-full bg-current"
        aria-hidden="true"
      />

      {statutLabels[statut]}
    </span>
  );
}

/**
 * ============================================================
 * BADGE TYPE
 * ============================================================
 */

function TypeBadge({
  type,
}: {
  type: TypeFormation;
}) {
  return (
    <span className="badge badge-outline badge-sm whitespace-nowrap">
      {typeLabels[type]}
    </span>
  );
}

/**
 * ============================================================
 * COMPOSANT
 * ============================================================
 */

export function FormationTable({
  formations,
  total,
  page,
  totalPages,
  search,
  statut,
  type,
  canManage,
  onCreate,
  onEdit,
}: FormationTableProps) {
  const router = useRouter();

  const [searchValue, setSearchValue] =
    useState(search);

  const [isProcessing, setIsProcessing] =
    useState(false);

  /**
   * ----------------------------------------------------------
   * SYNCHRONISATION RECHERCHE
   * ----------------------------------------------------------
   */

  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  /**
   * ----------------------------------------------------------
   * MISE À JOUR URL
   * ----------------------------------------------------------
   */

  function updateParams(
    updates: Record<
      string,
      string | null
    >
  ) {
    const params =
      new URLSearchParams(
        window.location.search
      );

    Object.entries(updates).forEach(
      ([key, value]) => {
        if (
          value === null ||
          value === ""
        ) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
    );

    router.push(
      `?${params.toString()}`
    );
  }

  /**
   * ----------------------------------------------------------
   * RECHERCHE AVEC DEBOUNCE
   * ----------------------------------------------------------
   */

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        const valeur =
          searchValue.trim();

        if (
          valeur ===
          search.trim()
        ) {
          return;
        }

        updateParams({
          q:
            valeur || null,

          page: "1",
        });
      }, 350);

    return () =>
      window.clearTimeout(
        timer
      );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  /**
   * ----------------------------------------------------------
   * CHANGEMENT STATUT
   * ----------------------------------------------------------
   */

  async function handleArchive(
    formation: any
  ) {
    const result =
      await Swal.fire({
        title:
          "Archiver la formation ?",

        html: `
          <div style="font-size:14px;line-height:1.6">
            La formation
            <strong>${escapeHtml(
              formation.nom
            )}</strong>
            sera archivée.
            <br />
            Elle ne sera pas supprimée.
          </div>
        `,

        icon: "warning",

        showCancelButton: true,

        confirmButtonText:
          "Oui, archiver",

        cancelButtonText:
          "Annuler",

        reverseButtons: true,

        confirmButtonColor:
          "#f59e0b",
      });

    if (!result.isConfirmed) {
      return;
    }

    setIsProcessing(true);

    try {
      await updateFormationStatut(
        formation.id,
        StatutFormation.ARCHIVEE
      );

      await Swal.fire({
        title:
          "Formation archivée",

        text:
          "La formation a été archivée avec succès.",

        icon: "success",

        confirmButtonText: "OK",
      });

      router.refresh();
    } catch (error) {
      await Swal.fire({
        title:
          "Impossible d'archiver",

        text:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue.",

        icon: "error",

        confirmButtonText:
          "Fermer",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  /**
   * ----------------------------------------------------------
   * RESTAURER
   * ----------------------------------------------------------
   */

  async function handleRestore(
    formation: any
  ) {
    const result =
      await Swal.fire({
        title:
          "Réactiver la formation ?",

        text: `La formation « ${formation.nom} » redeviendra active.`,

        icon: "question",

        showCancelButton: true,

        confirmButtonText:
          "Oui, réactiver",

        cancelButtonText:
          "Annuler",

        reverseButtons: true,

        confirmButtonColor:
          "#16a34a",
      });

    if (!result.isConfirmed) {
      return;
    }

    setIsProcessing(true);

    try {
      await updateFormationStatut(
        formation.id,
        StatutFormation.ACTIVE
      );

      await Swal.fire({
        title:
          "Formation réactivée",

        text:
          "La formation est maintenant active.",

        icon: "success",

        confirmButtonText: "OK",
      });

      router.refresh();
    } catch (error) {
      await Swal.fire({
        title:
          "Impossible de réactiver",

        text:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue.",

        icon: "error",

        confirmButtonText:
          "Fermer",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  /**
   * ----------------------------------------------------------
   * SUPPRESSION
   * ----------------------------------------------------------
   */

  async function handleDelete(
    formation: any
  ) {
    const result =
      await Swal.fire({
        title:
          "Supprimer la formation ?",

        html: `
          <div style="font-size:14px;line-height:1.6">
            Vous êtes sur le point de supprimer
            <strong>${escapeHtml(
              formation.nom
            )}</strong>.
            <br />
            <br />
            <span style="color:#dc2626;font-weight:600">
              Cette opération est définitive.
            </span>
          </div>
        `,

        icon: "warning",

        showCancelButton: true,

        confirmButtonText:
          "Oui, supprimer",

        cancelButtonText:
          "Annuler",

        reverseButtons: true,

        confirmButtonColor:
          "#dc2626",
      });

    if (!result.isConfirmed) {
      return;
    }

    setIsProcessing(true);

    try {
      await deleteFormation(
        formation.id
      );

      await Swal.fire({
        title:
          "Formation supprimée",

        text:
          "La formation a été supprimée avec succès.",

        icon: "success",

        confirmButtonText: "OK",
      });

      router.refresh();
    } catch (error) {
      await Swal.fire({
        title:
          "Suppression impossible",

        text:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue.",

        icon: "error",

        confirmButtonText:
          "Fermer",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  /**
   * ----------------------------------------------------------
   * RÉINITIALISER LES FILTRES
   * ----------------------------------------------------------
   */

  function resetFilters() {
    setSearchValue("");

    router.push("?");
  }

  const hasFilters =
    Boolean(
      search.trim() ||
        statut !== "TOUS" ||
        type !== "TOUS"
    );

  /**
   * ----------------------------------------------------------
   * CALCUL AFFICHAGE
   * ----------------------------------------------------------
   */

  const firstItem =
    total === 0
      ? 0
      : (page - 1) * 10 + 1;

  const lastItem =
    Math.min(
      page * 10,
      total
    );

  return (
    <div className="space-y-4">
      {/* ================================================== */}
      {/* EN-TÊTE */}
      {/* ================================================== */}

      <div className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* TITRE */}

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-xl font-bold">
                  Formations
                </h1>

                <p className="text-sm text-base-content/60">
                  Gérez les formations de votre centre.
                </p>
              </div>
            </div>

            {/* BOUTON */}

            {canManage && (
              <button
                type="button"
                onClick={onCreate}
                className="btn btn-primary gap-2"
              >
                <Plus className="h-4 w-4" />

                Nouvelle formation
              </button>
            )}
          </div>

          {/* ================================================== */}
          {/* RECHERCHE + FILTRES */}
          {/* ================================================== */}

          <div className="flex flex-col gap-3 xl:flex-row">
            {/* RECHERCHE */}

            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40" />

              <input
                type="search"
                value={searchValue}
                onChange={(event) =>
                  setSearchValue(
                    event.target.value
                  )
                }
                placeholder="Rechercher par code, nom, description..."
                className="input input-bordered w-full pl-10"
              />

              {searchValue && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchValue("")
                  }
                  className="btn btn-xs btn-circle btn-ghost absolute right-2 top-1/2 -translate-y-1/2"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* STATUT */}

            <select
              value={statut}
              onChange={(event) =>
                updateParams({
                  statut:
                    event.target.value ===
                    "TOUS"
                      ? null
                      : event.target.value,

                  page: "1",
                })
              }
              className="select select-bordered w-full xl:w-52"
            >
              <option value="TOUS">
                Tous les statuts
              </option>

              {Object.values(
                StatutFormation
              ).map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {statutLabels[value]}
                </option>
              ))}
            </select>

            {/* TYPE */}

            <select
              value={type}
              onChange={(event) =>
                updateParams({
                  type:
                    event.target.value ===
                    "TOUS"
                      ? null
                      : event.target.value,

                  page: "1",
                })
              }
              className="select select-bordered w-full xl:w-52"
            >
              <option value="TOUS">
                Tous les types
              </option>

              {Object.values(
                TypeFormation
              ).map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {typeLabels[value]}
                </option>
              ))}
            </select>

            {/* RESET */}

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="btn btn-ghost gap-2"
              >
                <RotateCcw className="h-4 w-4" />

                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* INDICATEUR FILTRES */}
      {/* ================================================== */}

      {hasFilters && (
        <div className="flex items-center gap-2 text-sm text-base-content/60">
          <Filter className="h-4 w-4" />

          <span>
            {total} résultat
            {total > 1 ? "s" : ""}{" "}
            trouvé
            {total > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* ================================================== */}
      {/* TABLE */}
      {/* ================================================== */}

      <div className="card overflow-hidden border border-base-300 bg-base-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            {/* HEADER */}

            <thead>
              <tr>
                <th>
                  Formation
                </th>

                <th>
                  Type
                </th>

                <th>
                  Durée
                </th>

                <th>
                  Modules
                </th>

                <th>
                  Sessions
                </th>

                {/* NOUVELLE COLONNE TARIFS */}

                <th>
                  Tarifs
                </th>

                <th>
                  Statut
                </th>

                {canManage && (
                  <th className="text-right">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            {/* BODY */}

            <tbody>
              {formations.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      canManage
                        ? 8
                        : 7
                    }
                  >
                    <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-base-200">
                        <BookOpen className="h-6 w-6 text-base-content/40" />
                      </div>

                      <div>
                        <p className="font-semibold">
                          Aucune formation trouvée
                        </p>

                        <p className="mt-1 text-sm text-base-content/60">
                          {hasFilters
                            ? "Essayez de modifier vos critères de recherche."
                            : "Commencez par créer votre première formation."}
                        </p>
                      </div>

                      {canManage &&
                        !hasFilters && (
                          <button
                            type="button"
                            onClick={
                              onCreate
                            }
                            className="btn btn-primary btn-sm gap-2"
                          >
                            <Plus className="h-4 w-4" />

                            Créer une formation
                          </button>
                        )}

                      {hasFilters && (
                        <button
                          type="button"
                          onClick={
                            resetFilters
                          }
                          className="btn btn-ghost btn-sm gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />

                          Réinitialiser
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                formations.map(
                  (formation) => {
                    const modulesCount =
                      formation
                        ._count
                        ?.modules ??
                      formation.nombreModules ??
                      0;

                    const sessionsCount =
                      formation
                        ._count
                        ?.sessions ??
                      0;

                    /**
                     * ------------------------------------------------
                     * NOMBRE DE TARIFS LIÉS
                     * ------------------------------------------------
                     */

                    const tarifsCount =
                      formation
                        ._count
                        ?.tarifs ??
                      0;

                    return (
                      <tr
                        key={
                          formation.id
                        }
                        className="hover"
                      >
                        {/* ================================= */}
                        {/* FORMATION */}
                        {/* ================================= */}

                        <td className="min-w-64">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <BookOpen className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <div className="font-semibold">
                                {
                                  formation.nom
                                }
                              </div>

                              <div className="mt-0.5 font-mono text-xs text-base-content/50">
                                {
                                  formation.code
                                }
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* ================================= */}
                        {/* TYPE */}
                        {/* ================================= */}

                        <td>
                          <TypeBadge
                            type={
                              formation.type
                            }
                          />
                        </td>

                        {/* ================================= */}
                        {/* DURÉE */}
                        {/* ================================= */}

                        <td>
                          <div className="flex items-center gap-1.5 whitespace-nowrap text-sm">
                            <Clock3 className="h-4 w-4 text-base-content/40" />

                            {formation.dureeHeures !=
                            null
                              ? `${formation.dureeHeures} h`
                              : "—"}
                          </div>
                        </td>

                        {/* ================================= */}
                        {/* MODULES */}
                        {/* ================================= */}

                        <td>
                          <div className="flex items-center gap-1.5">
                            <Layers3 className="h-4 w-4 text-base-content/40" />

                            <span className="font-medium">
                              {
                                modulesCount
                              }
                            </span>
                          </div>
                        </td>

                        {/* ================================= */}
                        {/* SESSIONS */}
                        {/* ================================= */}

                        <td>
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4 text-base-content/40" />

                            <span className="font-medium">
                              {
                                sessionsCount
                              }
                            </span>
                          </div>
                        </td>

                        {/* ================================= */}
                        {/* TARIFS */}
                        {/* ================================= */}

                        <td>
                          <div className="flex items-center gap-1.5">
                            <BadgeDollarSign className="h-4 w-4 text-base-content/40" />

                            <span className="font-medium">
                              {
                                tarifsCount
                              }
                            </span>

                            <span className="text-xs text-base-content/50">
                              tarif
                              {tarifsCount >
                              1
                                ? "s"
                                : ""}
                            </span>
                          </div>
                        </td>

                        {/* ================================= */}
                        {/* STATUT */}
                        {/* ================================= */}

                        <td>
                          <StatutBadge
                            statut={
                              formation.statut
                            }
                          />
                        </td>

                        {/* ================================= */}
                        {/* ACTIONS */}
                        {/* ================================= */}

                        {canManage && (
                          <td>
                            <div className="flex justify-end gap-1">
                              {/* MODULES */}

                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/formations/${formation.id}/modules`
                                  )
                                }
                                className="btn btn-sm btn-outline"
                                title="Gérer les modules"
                              >
                                <BookOpen className="h-4 w-4" />

                                Modules
                              </button>

                              {/* TARIFS */}

                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/formations/${formation.id}/tarifs`
                                  )
                                }
                                className="btn btn-sm btn-outline"
                                title="Gérer les tarifs"
                              >
                                <BadgeDollarSign className="h-4 w-4" />

                                Tarifs
                              </button>

                              {/* MODIFIER */}

                              <button
                                type="button"
                                onClick={() =>
                                  onEdit(
                                    formation
                                  )
                                }
                                disabled={
                                  isProcessing
                                }
                                className="btn btn-sm btn-ghost btn-square tooltip"
                                data-tip="Modifier"
                                aria-label="Modifier"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>

                              {/* ARCHIVER */}

                              {formation.statut !==
                                StatutFormation.ARCHIVEE && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleArchive(
                                      formation
                                    )
                                  }
                                  disabled={
                                    isProcessing
                                  }
                                  className="btn btn-sm btn-ghost btn-square text-warning tooltip"
                                  data-tip="Archiver"
                                  aria-label="Archiver"
                                >
                                  <Archive className="h-4 w-4" />
                                </button>
                              )}

                              {/* RESTAURER */}

                              {formation.statut ===
                                StatutFormation.ARCHIVEE && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRestore(
                                      formation
                                    )
                                  }
                                  disabled={
                                    isProcessing
                                  }
                                  className="btn btn-sm btn-ghost btn-square text-success tooltip"
                                  data-tip="Réactiver"
                                  aria-label="Réactiver"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                              )}

                              {/* SUPPRIMER */}

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    formation
                                  )
                                }
                                disabled={
                                  isProcessing
                                }
                                className="btn btn-sm btn-ghost btn-square text-error tooltip"
                                data-tip="Supprimer"
                                aria-label="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>

        {/* ================================================== */}
        {/* FOOTER PAGINATION */}
        {/* ================================================== */}

        {total > 0 && (
          <div className="flex flex-col gap-3 border-t border-base-300 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-base-content/60">
              Affichage de{" "}
              <span className="font-medium text-base-content">
                {firstItem}
              </span>{" "}
              à{" "}
              <span className="font-medium text-base-content">
                {lastItem}
              </span>{" "}
              sur{" "}
              <span className="font-medium text-base-content">
                {total}
              </span>{" "}
              formation
              {total > 1
                ? "s"
                : ""}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateParams({
                      page: String(
                        Math.max(
                          1,
                          page - 1
                        )
                      ),
                    })
                  }
                  disabled={
                    page <= 1 ||
                    isProcessing
                  }
                  className="btn btn-sm btn-outline btn-square"
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="px-2 text-sm">
                  Page{" "}
                  <strong>
                    {page}
                  </strong>{" "}
                  /{" "}
                  <strong>
                    {totalPages}
                  </strong>
                </span>

                <button
                  type="button"
                  onClick={() =>
                    updateParams({
                      page: String(
                        Math.min(
                          totalPages,
                          page + 1
                        )
                      ),
                    })
                  }
                  disabled={
                    page >=
                      totalPages ||
                    isProcessing
                  }
                  className="btn btn-sm btn-outline btn-square"
                  aria-label="Page suivante"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ============================================================
 * PROTECTION HTML POUR SWEETALERT
 * ============================================================
 */

function escapeHtml(
  value: unknown
): string {
  return String(value ?? "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}