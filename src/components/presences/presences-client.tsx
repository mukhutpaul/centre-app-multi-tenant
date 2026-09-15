"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  FileWarning,
  QrCode,
  Search,
  Trash2,
  UserX,
  Users,
  XCircle,
} from "lucide-react";

import Swal from "sweetalert2";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Select from "react-select";

import {
  createPresence,
  deletePresence,
  getPresenceTable,
  updatePresence,
} from "@/actions/presence.actions";

type Props = {
  plannings: any[];
};

const statutLabels: Record<string, string> = {
  PRESENT: "Présent",
  ABSENT: "Absent",
  RETARD: "Retard",
  EXCUSE: "Excusé",
};

const statutClasses: Record<string, string> = {
  PRESENT:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400",

  ABSENT:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400",

  RETARD:
    "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-400",

  EXCUSE:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400",
};

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatTime(value: string | Date | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPlanning(planning: any) {
  return `${formatDate(planning.debut)} • ${formatTime(
    planning.debut,
  )} - ${formatTime(planning.fin)}`;
}

export default function PresencesClient({ plannings }: Props) {
  const router = useRouter();

  const [selectedPlanningId, setSelectedPlanningId] = useState<string>(
    plannings[0]?.id ?? "",
  );

  const [table, setTable] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [editingPresence, setEditingPresence] = useState<any>(null);

  const [editStatut, setEditStatut] = useState("PRESENT");

  const [editMotif, setEditMotif] = useState("");

  const [editCommentaire, setEditCommentaire] = useState("");

  const [saving, setSaving] = useState(false);

  const [processingRowId, setProcessingRowId] = useState<string | null>(null);

  /* =====================================================
     CHARGER LA TABLE
  ====================================================== */

  async function loadTable(planningId: string) {
    if (!planningId) {
      setTable(null);
      return;
    }

    try {
      setLoading(true);

      const result = await getPresenceTable(planningId);

      setTable(result);
    } catch (error: any) {
      console.error(error);

      toast.error(error?.message || "Impossible de charger les présences.");

      setTable(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTable(selectedPlanningId);
  }, [selectedPlanningId]);

  /* =====================================================
     RECHERCHE
  ====================================================== */

  const filteredRows = useMemo(() => {
    if (!table?.rows) {
      return [];
    }

    const term = search.trim().toLowerCase();

    if (!term) {
      return table.rows;
    }

    return table.rows.filter((row: any) => {
      const apprenant = row.inscription?.apprenant;

      const nom = [apprenant?.prenom, apprenant?.nom].filter(Boolean).join(" ");

      const numero = row.inscription?.numero ?? "";

      return (
        nom.toLowerCase().includes(term) || numero.toLowerCase().includes(term)
      );
    });
  }, [table, search]);

  /* =====================================================
     MARQUER UNE PRESENCE
  ====================================================== */

  async function markPresence(row: any, statut: string) {
    const rowId = row.inscription?.id ?? null;

    if (!rowId || processingRowId) {
      return;
    }

    try {
      setProcessingRowId(rowId);

      const response = await createPresence({
        planningId: selectedPlanningId,

        inscriptionId: row.inscription.id,

        statut: statut as any,
      });

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);

      await loadTable(selectedPlanningId);
    } catch (error) {
      console.error(error);

      toast.error("Impossible d'enregistrer la présence.");
    } finally {
      setProcessingRowId(null);
    }
  }

  /* =====================================================
     SUPPRESSION
  ====================================================== */

  async function handleDelete(presence: any) {
    const apprenant = presence.inscription?.apprenant;

    const nom = [apprenant?.prenom, apprenant?.nom].filter(Boolean).join(" ");

    const result = await Swal.fire({
      title: "Supprimer la présence ?",

      text: `La présence de ${nom || "cet apprenant"} sera supprimée.`,

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

    try {
      setProcessingRowId(presence.inscription?.id ?? null);

      const response = await deletePresence(presence.id);

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);

      await loadTable(selectedPlanningId);
    } catch (error) {
      console.error(error);

      toast.error("Impossible de supprimer la présence.");
    } finally {
      setProcessingRowId(null);
    }
  }

  /* =====================================================
     OUVRIR MODIFICATION
  ====================================================== */

  function openEdit(presence: any) {
    setEditingPresence(presence);

    setEditStatut(presence.statut);

    setEditMotif(presence.motif ?? "");

    setEditCommentaire(presence.commentaire ?? "");
  }

  /* =====================================================
     MODIFICATION
  ====================================================== */

  async function handleUpdate() {
    if (!editingPresence) {
      return;
    }

    try {
      setSaving(true);

      const response = await updatePresence(editingPresence.id, {
        statut: editStatut as any,

        heureArrivee: editingPresence.heureArrivee
          ? new Date(editingPresence.heureArrivee).toISOString()
          : null,

        heureDepart: editingPresence.heureDepart
          ? new Date(editingPresence.heureDepart).toISOString()
          : null,

        minutesRetard: editingPresence.minutesRetard,

        motif: editMotif.trim() || null,

        commentaire: editCommentaire.trim() || null,
      });

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);

      setEditingPresence(null);

      await loadTable(selectedPlanningId);
    } catch (error) {
      console.error(error);

      toast.error("Impossible de modifier la présence.");
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     PLANNING COURANT
  ====================================================== */

  const currentPlanning = plannings.find(
    (planning) => planning.id === selectedPlanningId,
  );

  /* =====================================================
     RENDER
  ====================================================== */

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* =================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Présences
              </h1>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Gestion des présences des apprenants.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/presences/scanner")}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <QrCode className="h-4 w-4" />
          Scanner un QR
        </button>
      </div>

      {/* =================================================
          FILTRES
      ================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Planning / cours
            </label>

            <Select
              value={
                currentPlanning
                  ? {
                      value: currentPlanning.id,
                      label: `${currentPlanning.session?.formation?.nom ?? "Formation"} — ${
                        currentPlanning.titre || "Cours"
                      } — ${formatDate(currentPlanning.debut)} — ${formatTime(
                        currentPlanning.debut,
                      )} à ${formatTime(currentPlanning.fin)}`,
                    }
                  : null
              }
              onChange={(option) => {
                setSelectedPlanningId(option?.value ?? "");
              }}
              options={plannings.map((planning) => ({
                value: planning.id,
                label: `${planning.session?.formation?.nom ?? "Formation"} — ${
                  planning.titre || "Cours"
                } — ${formatDate(planning.debut)} — ${formatTime(
                  planning.debut,
                )} à ${formatTime(planning.fin)}`,
              }))}
              placeholder="Sélectionner un planning..."
              isSearchable
              isClearable={false}
              noOptionsMessage={() => "Aucun planning trouvé"}
              loadingMessage={() => "Chargement..."}
              className="text-sm"
              classNamePrefix="planning-select"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Rechercher un apprenant
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nom ou numéro..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>
        </div>

        {currentPlanning && (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {currentPlanning.session?.formation?.nom}
            </span>

            <span className="text-slate-500">
              {currentPlanning.titre || "Cours"}
            </span>

            <span className="text-slate-500">
              {formatPlanning(currentPlanning)}
            </span>

            {currentPlanning.salle && (
              <span className="text-slate-500">
                Salle : {currentPlanning.salle.nom}
              </span>
            )}
          </div>
        )}
      </div>

      {/* =================================================
          STATISTIQUES
      ================================================== */}

      {table && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Total"
            value={table.statistiques?.total ?? 0}
          />

          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Présents"
            value={table.statistiques?.presents ?? 0}
            type="success"
          />

          <StatCard
            icon={<Clock3 className="h-5 w-5" />}
            label="Retards"
            value={table.statistiques?.retards ?? 0}
            type="warning"
          />

          <StatCard
            icon={<UserX className="h-5 w-5" />}
            label="Absents"
            value={table.statistiques?.absents ?? 0}
            type="danger"
          />

          <StatCard
            icon={<FileWarning className="h-5 w-5" />}
            label="Excusés"
            value={table.statistiques?.excuses ?? 0}
            type="info"
          />

          <StatCard
            icon={<XCircle className="h-5 w-5" />}
            label="Non marqués"
            value={table.statistiques?.nonMarques ?? 0}
          />
        </div>
      )}

      {/* =================================================
          TABLE
      ================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex min-h-[350px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />

              <p className="text-sm text-slate-500">
                Chargement des présences...
              </p>
            </div>
          </div>
        ) : !selectedPlanningId ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">
            <CalendarDays className="mb-4 h-10 w-10 text-slate-300" />

            <h3 className="font-semibold text-slate-800 dark:text-white">
              Aucun planning sélectionné
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Sélectionnez un cours pour afficher la table des présences.
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">
            <Users className="mb-4 h-10 w-10 text-slate-300" />

            <h3 className="font-semibold text-slate-800 dark:text-white">
              Aucun apprenant
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Aucun apprenant ne correspond à votre recherche.
            </p>
          </div>
        ) : (
          <>
            {/* =================================================
                DESKTOP
            ================================================== */}

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/50">
                    <th className="px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">
                      #
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">
                      Apprenant
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">
                      Statut
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">
                      Arrivée
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">
                      Départ
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">
                      Retard
                    </th>

                    <th className="px-5 py-4 text-right font-semibold text-slate-600 dark:text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row: any, index: number) => {
                    const apprenant = row.inscription?.apprenant;

                    const presence = row.presence;

                    const nom = [apprenant?.prenom, apprenant?.nom]
                      .filter(Boolean)
                      .join(" ");

                    const isProcessing = processingRowId === row.inscription.id;

                    return (
                      <tr
                        key={row.inscription.id}
                        className="border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-5 py-4 text-slate-400">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                              {(
                                apprenant?.prenom?.[0] ||
                                apprenant?.nom?.[0] ||
                                "A"
                              ).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {nom || "Apprenant"}
                              </p>

                              <p className="text-xs text-slate-500">
                                {row.inscription.numero}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {presence ? (
                            <StatusBadge statut={presence.statut} />
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                              Non marqué
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                          {formatTime(presence?.heureArrivee)}
                        </td>

                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                          {formatTime(presence?.heureDepart)}
                        </td>

                        <td className="px-5 py-4">
                          {presence?.minutesRetard ? (
                            <span className="font-semibold text-orange-600">
                              {presence.minutesRetard} min
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            {!presence ? (
                              <>
                                <QuickButton
                                  title="Présent"
                                  onClick={() => markPresence(row, "PRESENT")}
                                  disabled={!!processingRowId}
                                  className="border-green-200 text-green-700 hover:bg-green-50"
                                >
                                  {isProcessing ? (
                                    <LoadingIcon />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                  )}
                                </QuickButton>

                                <QuickButton
                                  title="Absent"
                                  onClick={() => markPresence(row, "ABSENT")}
                                  disabled={!!processingRowId}
                                  className="border-red-200 text-red-700 hover:bg-red-50"
                                >
                                  {isProcessing ? (
                                    <LoadingIcon />
                                  ) : (
                                    <UserX className="h-4 w-4" />
                                  )}
                                </QuickButton>

                                <QuickButton
                                  title="Retard"
                                  onClick={() => markPresence(row, "RETARD")}
                                  disabled={!!processingRowId}
                                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                                >
                                  {isProcessing ? (
                                    <LoadingIcon />
                                  ) : (
                                    <Clock3 className="h-4 w-4" />
                                  )}
                                </QuickButton>
                              </>
                            ) : (
                              <>
                                <QuickButton
                                  title="Modifier"
                                  onClick={() => openEdit(presence)}
                                  disabled={!!processingRowId}
                                  className="border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </QuickButton>

                                <QuickButton
                                  title="Supprimer"
                                  onClick={() => handleDelete(presence)}
                                  disabled={!!processingRowId}
                                  className="border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </QuickButton>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* =================================================
                MOBILE
            ================================================== */}

            <div className="divide-y divide-slate-100 dark:divide-slate-800 lg:hidden">
              {filteredRows.map((row: any, index: number) => {
                const apprenant = row.inscription?.apprenant;

                const presence = row.presence;

                const nom = [apprenant?.prenom, apprenant?.nom]
                  .filter(Boolean)
                  .join(" ");

                const isProcessing = processingRowId === row.inscription.id;

                return (
                  <div key={row.inscription.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                          {(
                            apprenant?.prenom?.[0] ||
                            apprenant?.nom?.[0] ||
                            "A"
                          ).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900 dark:text-white">
                            {nom || "Apprenant"}
                          </p>

                          <p className="text-xs text-slate-500">
                            {row.inscription.numero}
                          </p>
                        </div>
                      </div>

                      {presence ? (
                        <StatusBadge statut={presence.statut} />
                      ) : (
                        <span className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                          Non marqué
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <InfoMini
                        label="Arrivée"
                        value={formatTime(presence?.heureArrivee)}
                      />

                      <InfoMini
                        label="Départ"
                        value={formatTime(presence?.heureDepart)}
                      />

                      <InfoMini
                        label="Retard"
                        value={
                          presence?.minutesRetard
                            ? `${presence.minutesRetard} min`
                            : "—"
                        }
                      />
                    </div>

                    <div className="mt-4 flex gap-2">
                      {!presence ? (
                        <>
                          <button
                            type="button"
                            disabled={!!processingRowId}
                            onClick={() => markPresence(row, "PRESENT")}
                            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <LoadingIcon />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Présent
                          </button>

                          <button
                            type="button"
                            disabled={!!processingRowId}
                            onClick={() => markPresence(row, "ABSENT")}
                            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <LoadingIcon />
                            ) : (
                              <UserX className="h-4 w-4" />
                            )}
                            Absent
                          </button>

                          <button
                            type="button"
                            disabled={!!processingRowId}
                            onClick={() => markPresence(row, "RETARD")}
                            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <LoadingIcon />
                            ) : (
                              <Clock3 className="h-4 w-4" />
                            )}
                            Retard
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(presence)}
                            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Edit3 className="h-4 w-4" />
                            Modifier
                          </button>

                          <button
                            type="button"
                            disabled={!!processingRowId}
                            onClick={() => handleDelete(presence)}
                            className="flex cursor-pointer items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>

                    <p className="mt-2 text-right text-[10px] text-slate-400">
                      #{index + 1}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* =================================================
          MODAL MODIFICATION
      ================================================== */}

      {editingPresence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">
                  Modifier la présence
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  {editingPresence.inscription?.apprenant?.prenom}{" "}
                  {editingPresence.inscription?.apprenant?.nom}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingPresence(null)}
                className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Statut
                </label>

                <select
                  value={editStatut}
                  onChange={(event) => setEditStatut(event.target.value)}
                  className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="PRESENT">Présent</option>

                  <option value="ABSENT">Absent</option>

                  <option value="RETARD">Retard</option>

                  <option value="EXCUSE">Excusé</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Motif
                </label>

                <input
                  value={editMotif}
                  onChange={(event) => setEditMotif(event.target.value)}
                  placeholder="Motif éventuel..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Commentaire
                </label>

                <textarea
                  value={editCommentaire}
                  onChange={(event) => setEditCommentaire(event.target.value)}
                  rows={3}
                  placeholder="Commentaire..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingPresence(null)}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleUpdate}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
  type = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  type?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const classes = {
    default: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300",

    success:
      "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400",

    warning:
      "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400",

    danger: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",

    info: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${classes[type]}`}
        >
          {icon}
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>

          <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ statut }: { statut: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
        statutClasses[statut] ?? "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />

      {statutLabels[statut] ?? statut}
    </span>
  );
}

/* =========================================================
   QUICK BUTTON
========================================================= */

function QuickButton({
  children,
  title,
  onClick,
  className,
  disabled = false,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  className: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border bg-white transition disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 ${className}`}
    >
      {children}
    </button>
  );
}

/* =========================================================
   INFO MOBILE
========================================================= */

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   LOADING ICON
========================================================= */

function LoadingIcon() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}
