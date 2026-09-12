
"use client";

import { useEffect, useRef, useState } from "react";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import Swal from "sweetalert2";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  deleteModuleFormation,
} from "@/actions/module-formation.actions";

interface ModuleTableProps {
  modules: any[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  canManage: boolean;
  onCreate: () => void;
  onEdit: (module: any) => void;
}

/**
 * ============================================================
 * ÉCHAPPEMENT HTML
 * ============================================================
 */

function escapeHtml(value: string = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * ============================================================
 * TABLE DES MODULES
 * ============================================================
 */

export function ModuleTable({
  modules,
  total,
  page,
  totalPages,
  search,
  canManage,
  onCreate,
  onEdit,
}: ModuleTableProps) {
  const router = useRouter();

  /**
   * ----------------------------------------------------------
   * RECHERCHE
   * ----------------------------------------------------------
   */

  const [searchValue, setSearchValue] =
    useState(search);

  /**
   * Permet de savoir si le composant vient
   * juste d'être monté.
   *
   * Cela évite que le useEffect déclenche
   * immédiatement une navigation.
   */
  const isFirstRender = useRef(true);

  /**
   * Synchronisation avec la recherche provenant
   * de l'URL.
   */
  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  /**
   * ----------------------------------------------------------
   * RECHERCHE AVEC DEBOUNCE
   * ----------------------------------------------------------
   *
   * IMPORTANT :
   * - aucun rechargement complet de la page
   * - aucune boucle
   * - la première exécution est ignorée
   */

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeout = window.setTimeout(() => {
      const valeur = searchValue.trim();
      const valeurActuelle = search.trim();

      /**
       * Rien n'a changé.
       * On ne touche donc pas à l'URL.
       */
      if (valeur === valeurActuelle) {
        return;
      }

      const params = new URLSearchParams(
        window.location.search,
      );

      if (valeur) {
        params.set("q", valeur);
      } else {
        params.delete("q");
      }

      /**
       * Une nouvelle recherche recommence
       * toujours à la page 1.
       */
      params.set("page", "1");

      const queryString =
        params.toString();

      const nouvelleUrl =
        queryString
          ? `${window.location.pathname}?${queryString}`
          : window.location.pathname;

      /**
       * replace évite d'empiler chaque recherche
       * dans l'historique du navigateur.
       */
      router.replace(nouvelleUrl);
    }, 400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    searchValue,
    search,
    router,
  ]);

  /**
   * ----------------------------------------------------------
   * CHANGEMENT DE PAGE
   * ----------------------------------------------------------
   */

  function changerPage(
    nouvellePage: number,
  ) {
    if (
      nouvellePage < 1 ||
      nouvellePage > totalPages ||
      nouvellePage === page
    ) {
      return;
    }

    const params = new URLSearchParams(
      window.location.search,
    );

    params.set(
      "page",
      String(nouvellePage),
    );

    const queryString =
      params.toString();

    const nouvelleUrl =
      queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname;

    router.push(nouvelleUrl);
  }

  /**
   * ----------------------------------------------------------
   * RÉINITIALISER LA RECHERCHE
   * ----------------------------------------------------------
   */

  function reinitialiserRecherche() {
    setSearchValue("");

    const params = new URLSearchParams(
      window.location.search,
    );

    params.delete("q");
    params.set("page", "1");

    const queryString =
      params.toString();

    const nouvelleUrl =
      queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname;

    router.replace(nouvelleUrl);
  }

  /**
   * ----------------------------------------------------------
   * SUPPRESSION
   * ----------------------------------------------------------
   */

  async function handleDelete(
    moduleItem: any,
  ) {
    const result = await Swal.fire({
      title: "Supprimer ce module ?",
      html: `
        <div style="text-align:center">
          <div style="
            width:64px;
            height:64px;
            margin:0 auto 16px;
            border-radius:16px;
            display:flex;
            align-items:center;
            justify-content:center;
            background:#fee2e2;
            color:#dc2626;
            font-size:28px;
          ">
            🗑️
          </div>

          <p style="
            margin-bottom:8px;
            color:#64748b;
          ">
            Vous êtes sur le point de supprimer :
          </p>

          <strong style="
            font-size:18px;
          ">
            ${escapeHtml(moduleItem.nom)}
          </strong>

          <div style="
            margin-top:6px;
            font-family:monospace;
            color:#64748b;
          ">
            ${escapeHtml(moduleItem.code)}
          </div>

          <div style="
            margin-top:16px;
            padding:10px 12px;
            border-radius:10px;
            background:#fef2f2;
            color:#dc2626;
            font-size:13px;
          ">
            Cette opération est irréversible.
          </div>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: "rounded-2xl",
        confirmButton:
          "btn btn-error ml-2",
        cancelButton:
          "btn btn-ghost",
      },
      buttonsStyling: false,
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await deleteModuleFormation(
        moduleItem.id,
      );

      toast.success(
        "Module supprimé avec succès.",
      );

      /**
       * Rafraîchit uniquement les données
       * du Server Component.
       *
       * Pas de rechargement complet de la page.
       */
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer le module.",
      );
    }
  }

  /**
   * ----------------------------------------------------------
   * RENDU
   * ----------------------------------------------------------
   */

  return (
    <div className="space-y-5">
      {/* ======================================================
          EN-TÊTE
      ======================================================= */}

      <div className="rounded-2xl border border-base-300 bg-base-100 shadow-sm">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BookOpen className="h-6 w-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold">
                  Modules
                </h2>

                <span className="badge badge-primary badge-outline">
                  {total}
                </span>
              </div>

              <p className="mt-1 text-sm text-base-content/60">
                Gérez les modules, leur ordre,
                leur durée et leur coefficient.
              </p>
            </div>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={onCreate}
              className="btn btn-primary shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Ajouter un module
            </button>
          )}
        </div>

        {/* ====================================================
            BARRE DE RECHERCHE
        ===================================================== */}

        <div className="border-t border-base-300 bg-base-200/40 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40" />

              <input
                type="text"
                value={searchValue}
                onChange={(event) =>
                  setSearchValue(
                    event.target.value,
                  )
                }
                placeholder="Rechercher par code, nom ou description..."
                className="input input-bordered w-full bg-base-100 pl-10 pr-10 focus:border-primary"
              />

              {searchValue && (
                <button
                  type="button"
                  onClick={
                    reinitialiserRecherche
                  }
                  className="btn btn-circle btn-ghost btn-xs absolute right-2 top-1/2 -translate-y-1/2"
                  title="Effacer la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="text-sm text-base-content/60">
              {search ? (
                <>
                  Résultats pour{" "}
                  <span className="font-semibold text-base-content">
                    « {search} »
                  </span>
                </>
              ) : (
                "Liste de tous les modules"
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          TABLE
      ======================================================= */}

      <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="bg-base-200/60">
                <th className="w-16 text-center">
                  #
                </th>

                <th>Code</th>

                <th>Module</th>

                <th className="whitespace-nowrap">
                  Durée
                </th>

                <th className="whitespace-nowrap">
                  Coefficient
                </th>

                <th>Description</th>

                {canManage && (
                  <th className="w-32 text-right">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {modules.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      canManage ? 7 : 6
                    }
                    className="py-16 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-base-200 text-base-content/40">
                        <BookOpen className="h-8 w-8" />
                      </div>

                      <h3 className="font-semibold">
                        Aucun module trouvé
                      </h3>

                      <p className="mt-1 text-sm text-base-content/60">
                        {search
                          ? "Aucun module ne correspond à votre recherche."
                          : "Cette formation ne contient encore aucun module."}
                      </p>

                      {search ? (
                        <button
                          type="button"
                          onClick={
                            reinitialiserRecherche
                          }
                          className="btn btn-sm btn-ghost mt-4"
                        >
                          <X className="h-4 w-4" />
                          Effacer la recherche
                        </button>
                      ) : (
                        canManage && (
                          <button
                            type="button"
                            onClick={onCreate}
                            className="btn btn-sm btn-primary mt-4"
                          >
                            <Plus className="h-4 w-4" />
                            Ajouter le premier module
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                modules.map(
                  (moduleItem) => (
                    <tr
                      key={moduleItem.id}
                      className="transition-colors hover:bg-base-200/40"
                    >
                      {/* POSITION */}

                      <td className="text-center">
                        <span className="badge badge-neutral font-semibold">
                          {moduleItem.position}
                        </span>
                      </td>

                      {/* CODE */}

                      <td>
                        <span className="rounded-lg bg-base-200 px-2.5 py-1 font-mono text-sm font-semibold">
                          {moduleItem.code}
                        </span>
                      </td>

                      {/* MODULE */}

                      <td>
                        <div className="flex items-center gap-3">
                          <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
                            <BookOpen className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="font-semibold">
                              {moduleItem.nom}
                            </div>

                            <div className="text-xs text-base-content/50">
                              Position{" "}
                              {
                                moduleItem.position
                              }
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* DURÉE */}

                      <td>
                        {moduleItem.dureeHeures !==
                        null &&
                        moduleItem.dureeHeures !==
                          undefined &&
                        moduleItem.dureeHeures !==
                          "" ? (
                          <span className="badge badge-outline">
                            {moduleItem.dureeHeures}{" "}
                            h
                          </span>
                        ) : (
                          <span className="text-base-content/40">
                            —
                          </span>
                        )}
                      </td>

                      {/* COEFFICIENT */}

                      <td>
                        <span className="badge badge-info badge-outline">
                          ×{" "}
                          {moduleItem.coefficient ??
                            "1"}
                        </span>
                      </td>

                      {/* DESCRIPTION */}

                      <td className="max-w-sm">
                        {moduleItem.description ? (
                          <span className="line-clamp-2 text-sm text-base-content/70">
                            {
                              moduleItem.description
                            }
                          </span>
                        ) : (
                          <span className="text-sm text-base-content/40">
                            Aucune description
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}

                      {canManage && (
                        <td>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                onEdit(
                                  moduleItem,
                                )
                              }
                              className="btn btn-sm btn-square btn-ghost text-primary hover:bg-primary/10"
                              title="Modifier le module"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  moduleItem,
                                )
                              }
                              className="btn btn-sm btn-square btn-ghost text-error hover:bg-error/10"
                              title="Supprimer le module"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================
          PAGINATION
      ======================================================= */}

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              Page {page} sur {totalPages}
            </p>

            <p className="text-xs text-base-content/50">
              {total} module
              {total > 1 ? "s" : ""} au total
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline"
              disabled={page <= 1}
              onClick={() =>
                changerPage(page - 1)
              }
              title="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">
                Précédent
              </span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from(
                {
                  length: totalPages,
                },
                (_, index) =>
                  index + 1,
              ).map((numero) => (
                <button
                  key={numero}
                  type="button"
                  onClick={() =>
                    changerPage(numero)
                  }
                  className={`btn btn-sm ${
                    numero === page
                      ? "btn-primary"
                      : "btn-ghost"
                  }`}
                >
                  {numero}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-sm btn-outline"
              disabled={
                page >= totalPages
              }
              onClick={() =>
                changerPage(page + 1)
              }
              title="Page suivante"
            >
              <span className="hidden sm:inline">
                Suivant
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
