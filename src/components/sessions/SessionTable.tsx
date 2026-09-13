"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  GraduationCap,
  Pencil,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { useRouter, useSearchParams } from "next/navigation";

import { deleteSession } from "@/actions/session.actions";
import SessionStatusBadge from "./SessionStatusBadge";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SessionTableProps {
  sessions: any[];
  total: number;
  page: number;
  totalPages: number;
  search?: string;
  statut?: string;
  formationId?: string;
  formations?: any[];
  canManage?: boolean;
  onCreate?: () => void;
  onEdit?: (session: any) => void;
}

export default function SessionTable({
  sessions,
  total,
  page,
  totalPages,
  search = "",
  statut = "",
  formationId = "",
  formations = [],
  canManage = false,
  onCreate,
  onEdit,
}: SessionTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(search);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  /* ==========================================================
     FILTRES
  ========================================================== */

  function updateFilters(values: {
    search?: string;
    statut?: string;
    formationId?: string;
    page?: number;
  }) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    if (
      values.search !== undefined
    ) {
      if (values.search.trim()) {
        params.set(
          "search",
          values.search.trim()
        );
      } else {
        params.delete("search");
      }
    }

    if (
      values.statut !== undefined
    ) {
      if (values.statut) {
        params.set(
          "statut",
          values.statut
        );
      } else {
        params.delete("statut");
      }
    }

    if (
      values.formationId !== undefined
    ) {
      if (values.formationId) {
        params.set(
          "formationId",
          values.formationId
        );
      } else {
        params.delete("formationId");
      }
    }

    params.set(
      "page",
      String(values.page ?? 1)
    );

    startTransition(() => {
      router.push(
        `/sessions?${params.toString()}`
      );
    });
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchValue !== search) {
        updateFilters({
          search: searchValue,
          page: 1,
        });
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchValue]);

  function clearFilters() {
    setSearchValue("");

    startTransition(() => {
      router.push(
        "/sessions"
      );
    });
  }

  /* ==========================================================
     SUPPRESSION
  ========================================================== */

  async function handleDelete(
    session: any
  ) {
    const result = await Swal.fire({
      title: "Supprimer cette session ?",
      html: `
        <div class="text-sm">
          <p>Vous êtes sur le point de supprimer :</p>
          <p class="mt-2 font-semibold">
            ${session.code}
          </p>
          ${
            session.nom
              ? `<p>${session.nom}</p>`
              : ""
          }
          <p class="mt-3 text-red-600">
            Cette opération est irréversible.
          </p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
      reverseButtons: true,
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) {
      return;
    }

    Swal.fire({
      title: "Suppression...",
      text: "Veuillez patienter.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const response =
        await deleteSession(
          session.id
        );

      if (!response.success) {
        await Swal.fire({
          title: "Suppression impossible",
          text:
            response.error ||
            "Une erreur est survenue.",
          icon: "error",
          confirmButtonText: "OK",
        });

        return;
      }

      await Swal.fire({
        title: "Supprimée",
        text:
          response.message ||
          "Session supprimée avec succès.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
      });

      router.refresh();
    } catch (error) {
      await Swal.fire({
        title: "Erreur",
        text:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue.",
        icon: "error",
      });
    }
  }

  /* ==========================================================
     PAGINATION
  ========================================================== */

  function goToPage(
    targetPage: number
  ) {
    if (
      targetPage < 1 ||
      targetPage > totalPages
    ) {
      return;
    }

    updateFilters({
      page: targetPage,
    });
  }

  /* ==========================================================
     FORMAT DATE
  ========================================================== */

  function formatDate(
    value: string | Date
  ) {
    const date = new Date(value);

    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(date);
  }

  /* ==========================================================
     CAPACITE
  ========================================================== */

  function capacityText(
    session: any
  ) {
    const inscriptions =
      session._count?.inscriptions ?? 0;

    if (
      session.capacite === null ||
      session.capacite === undefined
    ) {
      return `${inscriptions} inscrit${
        inscriptions > 1 ? "s" : ""
      }`;
    }

    return `${inscriptions} / ${session.capacite}`;
  }

  const hasFilters =
    Boolean(search) ||
    Boolean(statut) ||
    Boolean(formationId);

  return (
    <div className="space-y-4">
      {/* ======================================================
          FILTRES
      ====================================================== */}

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_260px_auto]">
          {/* Recherche */}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={searchValue}
              onChange={(e) =>
                setSearchValue(
                  e.target.value
                )
              }
              placeholder="Rechercher une session..."
              className="pl-9"
            />
          </div>

          {/* Statut */}

          <select
            value={statut}
            onChange={(e) =>
              updateFilters({
                statut:
                  e.target.value,
                page: 1,
              })
            }
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">
              Tous les statuts
            </option>

            <option value="PLANIFIEE">
              Planifiées
            </option>

            <option value="INSCRIPTIONS_OUVERTES">
              Inscriptions ouvertes
            </option>

            <option value="INSCRIPTIONS_FERMEES">
              Inscriptions fermées
            </option>

            <option value="EN_COURS">
              En cours
            </option>

            <option value="TERMINEE">
              Terminées
            </option>

            <option value="ANNULEE">
              Annulées
            </option>

            <option value="SUSPENDUE">
              Suspendues
            </option>
          </select>

          {/* Formation */}

          <select
            value={formationId}
            onChange={(e) =>
              updateFilters({
                formationId:
                  e.target.value,
                page: 1,
              })
            }
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">
              Toutes les formations
            </option>

            {formations.map(
              (formation) => (
                <option
                  key={formation.id}
                  value={formation.id}
                >
                  {formation.code} —{" "}
                  {formation.nom}
                </option>
              )
            )}
          </select>

          {hasFilters && (
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
            >
              <X className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* ======================================================
          TABLE
      ====================================================== */}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold">
                  Session
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Formation
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Période
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Capacité
                </th>

                <th className="px-4 py-3 text-center font-semibold">
                  Modules
                </th>

                <th className="px-4 py-3 text-center font-semibold">
                  Formateurs
                </th>

                <th className="px-4 py-3 text-center font-semibold">
                  Statut
                </th>

                {canManage && (
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      canManage ? 8 : 7
                    }
                    className="px-4 py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <CalendarDays className="h-10 w-10 opacity-40" />

                      <p className="font-medium">
                        Aucune session trouvée
                      </p>

                      <p className="text-sm">
                        Modifiez vos critères
                        de recherche ou
                        créez une nouvelle
                        session.
                      </p>

                      {canManage &&
                        onCreate && (
                          <Button
                            onClick={
                              onCreate
                            }
                          >
                            Créer une session
                          </Button>
                        )}
                    </div>
                  </td>
                </tr>
              ) : (
                sessions.map(
                  (session) => (
                    <tr
                      key={session.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      {/* Session */}

                      <td className="px-4 py-4">
                        <div>
                          <div className="font-semibold">
                            {session.code}
                          </div>

                          {session.nom && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {session.nom}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Formation */}

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />

                          <div>
                            <div className="font-medium">
                              {
                                session
                                  .formation
                                  ?.nom
                              }
                            </div>

                            <div className="text-xs text-muted-foreground">
                              {
                                session
                                  .formation
                                  ?.code
                              }
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Dates */}

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />

                          <div>
                            <div className="font-medium">
                              {formatDate(
                                session.dateDebut
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground">
                              au{" "}
                              {formatDate(
                                session.dateFin
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Capacité */}

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />

                          <span>
                            {capacityText(
                              session
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Modules */}

                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <ClipboardList className="h-4 w-4 text-muted-foreground" />

                          {
                            session._count
                              ?.modules ??
                            0
                          }
                        </div>
                      </td>

                      {/* Formateurs */}

                      <td className="px-4 py-4 text-center">
                        {
                          session._count
                            ?.formateurs ??
                          0
                        }
                      </td>

                      {/* Statut */}

                      <td className="px-4 py-4 text-center">
                        <SessionStatusBadge
                          statut={
                            session.statut
                          }
                        />
                      </td>

                      {/* Actions */}

                      {canManage && (
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Détails"
                              onClick={() =>
                                router.push(
                                  `/sessions/${session.id}`
                                )
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {onEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Modifier"
                                onClick={() =>
                                  onEdit(
                                    session
                                  )
                                }
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              title="Supprimer"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() =>
                                handleDelete(
                                  session
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        {/* ====================================================
            FOOTER PAGINATION
        ==================================================== */}

        {total > 0 && (
          <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {total} session
              {total > 1 ? "s" : ""} au
              total
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={
                  page <= 1 ||
                  isPending
                }
                onClick={() =>
                  goToPage(page - 1)
                }
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Précédent
              </Button>

              <span className="px-3 text-sm">
                Page{" "}
                <strong>{page}</strong>{" "}
                sur{" "}
                <strong>
                  {totalPages}
                </strong>
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={
                  page >=
                    totalPages ||
                  isPending
                }
                onClick={() =>
                  goToPage(page + 1)
                }
              >
                Suivant
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}