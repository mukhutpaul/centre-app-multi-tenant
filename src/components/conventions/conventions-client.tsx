"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  FileSignature,
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Eye,
  Users,
  Clock3,
  CheckCircle2,
  FileText,
  XCircle,
  Printer,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import Swal from "sweetalert2";
import { toast } from "sonner";

import ConventionModal from "./convention-modal";

import {
  deleteConvention,
  updateConventionStatus,
} from "@/actions/convention.actions";

/* =========================================================
 * TYPES
 * ========================================================= */

type ConventionStatus =
  | "BROUILLON"
  | "EN_ATTENTE"
  | "SIGNEE"
  | "ACTIVE"
  | "TERMINEE"
  | "ANNULEE"
  | "EXPIREE";

type Convention = {
  id: string;
  numero: string;
  organisationNom: string;
  organisationContact: string | null;
  dateDebut: Date | string;
  dateFin: Date | string;
  montant: unknown;
  devise: string;
  statut: ConventionStatus;
  participants: {
    id: string;
    inscriptionId: string;
    inscription: {
      apprenant: {
        prenom: string;
        nom: string;
      };
    };
  }[];
};

type InscriptionOption = {
  value: string;
  label: string;
};

type Props = {
  conventions: Convention[];
  inscriptions: InscriptionOption[];
};

/* =========================================================
 * STATUS CONFIG
 * ========================================================= */

const statusConfig: Record<
  ConventionStatus,
  {
    label: string;
    className: string;
  }
> = {
  BROUILLON: {
    label: "Brouillon",
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },

  EN_ATTENTE: {
    label: "En attente",
    className:
      "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  },

  SIGNEE: {
    label: "Signée",
    className:
      "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  },

  ACTIVE: {
    label: "Active",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  },

  TERMINEE: {
    label: "Terminée",
    className:
      "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  },

  ANNULEE: {
    label: "Annulée",
    className: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  },

  EXPIREE: {
    label: "Expirée",
    className: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  },
};

/* =========================================================
 * COMPONENT
 * ========================================================= */

export default function ConventionsClient({
  conventions,
  inscriptions,
}: Props) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConventionStatus | "TOUS">(
    "TOUS",
  );

  const [selectedConvention, setSelectedConvention] =
    useState<Convention | null>(null);

  const [modalOpen, setModalOpen] = useState(false);

  const [processingId, setProcessingId] = useState<string | null>(null);

  /* =========================================================
   * FILTER
   * ========================================================= */

  const filteredConventions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return conventions.filter((convention) => {
      const matchesSearch =
        !term ||
        convention.numero.toLowerCase().includes(term) ||
        convention.organisationNom.toLowerCase().includes(term) ||
        convention.organisationContact?.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "TOUS" || convention.statut === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [conventions, search, statusFilter]);

  /* =========================================================
   * STATS
   * ========================================================= */

  const stats = useMemo(
    () => ({
      total: conventions.length,

      attente: conventions.filter((c) => c.statut === "EN_ATTENTE").length,

      actives: conventions.filter((c) => c.statut === "ACTIVE").length,

      signees: conventions.filter((c) => c.statut === "SIGNEE").length,

      terminees: conventions.filter((c) => c.statut === "TERMINEE").length,
    }),
    [conventions],
  );

  /* =========================================================
   * CREATE
   * ========================================================= */

  function openCreate() {
    setSelectedConvention(null);
    setModalOpen(true);
  }

  /* =========================================================
   * EDIT
   * ========================================================= */

  function openEdit(convention: Convention) {
    setSelectedConvention(convention);
    setModalOpen(true);
  }

  function printConvention(convention: Convention) {
    window.open(`/conventions/${convention.id}/imprimer`, "_blank");
  }

  /* =========================================================
   * DETAILS
   * ========================================================= */

  function openDetails(convention: Convention) {
    router.push(`/conventions/${convention.id}`);
  }

  /* =========================================================
   * DELETE
   * ========================================================= */

  async function handleDelete(convention: Convention) {
    if (processingId) {
      return;
    }

    const result = await Swal.fire({
      title: "Supprimer cette convention ?",

      text: `La convention ${convention.numero} sera définitivement supprimée.`,

      icon: "warning",

      showCancelButton: true,

      confirmButtonText: "Oui, supprimer",

      cancelButtonText: "Annuler",

      reverseButtons: true,

      confirmButtonColor: "#dc2626",

      cancelButtonColor: "#64748b",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setProcessingId(convention.id);

      const response = await deleteConvention(convention.id);

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);

      router.refresh();
    } catch (error) {
      console.error("Erreur suppression convention:", error);

      toast.error("Une erreur est survenue lors de la suppression.");
    } finally {
      setProcessingId(null);
    }
  }

  /* =========================================================
   * STATUS
   * ========================================================= */

  async function handleStatusChange(
    convention: Convention,
    statut: ConventionStatus,
  ) {
    if (processingId || statut === convention.statut) {
      return;
    }

    try {
      setProcessingId(convention.id);

      const response = await updateConventionStatus(convention.id, statut);

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success(response.message);

      router.refresh();
    } catch (error) {
      console.error("Erreur changement statut convention:", error);

      toast.error("Une erreur est survenue lors du changement de statut.");
    } finally {
      setProcessingId(null);
    }
  }

  /* =========================================================
   * RENDER
   * ========================================================= */

  return (
    <div className="space-y-6">
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0f5da8] text-white shadow-sm">
            <FileSignature className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Conventions
            </h1>

            <p className="text-sm text-slate-500">
              Gérez les conventions avec les organisations
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0f5da8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c4d8c] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Nouvelle convention
        </button>
      </div>

      {/* ================================================= */}
      {/* STATS */}
      {/* ================================================= */}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total" value={stats.total} icon={FileText} />

        <StatCard label="En attente" value={stats.attente} icon={Clock3} />

        <StatCard label="Signées" value={stats.signees} icon={CheckCircle2} />

        <StatCard label="Actives" value={stats.actives} icon={Users} />

        <StatCard label="Terminées" value={stats.terminees} icon={XCircle} />
      </div>

      {/* ================================================= */}
      {/* FILTER */}
      {/* ================================================= */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px]">
          {/* SEARCH */}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par numéro, organisation ou contact..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0f5da8] focus:ring-2 focus:ring-[#0f5da8]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* STATUS */}

          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as ConventionStatus | "TOUS")
              }
              className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[#0f5da8] focus:ring-2 focus:ring-[#0f5da8]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="TOUS">Tous les statuts</option>

              <option value="BROUILLON">Brouillon</option>

              <option value="EN_ATTENTE">En attente</option>

              <option value="SIGNEE">Signée</option>

              <option value="ACTIVE">Active</option>

              <option value="TERMINEE">Terminée</option>

              <option value="ANNULEE">Annulée</option>

              <option value="EXPIREE">Expirée</option>
            </select>
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* RESULT COUNT */}
      {/* ================================================= */}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {filteredConventions.length}
          </span>{" "}
          convention
          {filteredConventions.length !== 1 ? "s" : ""} affichée
          {filteredConventions.length !== 1 ? "s" : ""}
        </p>

        {(search || statusFilter !== "TOUS") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("TOUS");
            }}
            className="cursor-pointer text-sm font-medium text-[#0f5da8] hover:underline"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* ================================================= */}
      {/* DESKTOP TABLE */}
      {/* ================================================= */}

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Convention
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Organisation
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Période
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Participants
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Montant
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Statut
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredConventions.map((convention) => {
                const isProcessing = processingId === convention.id;

                return (
                  <tr
                    key={convention.id}
                    className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    {/* CONVENTION */}

                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {convention.numero}
                      </div>
                    </td>

                    {/* ORGANISATION */}

                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {convention.organisationNom}
                      </div>

                      {convention.organisationContact && (
                        <div className="mt-0.5 text-xs text-slate-500">
                          {convention.organisationContact}
                        </div>
                      )}
                    </td>

                    {/* PERIODE */}

                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(convention.dateDebut)}

                      <span className="mx-1">→</span>

                      {formatDate(convention.dateFin)}
                    </td>

                    {/* PARTICIPANTS */}

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Users className="h-3.5 w-3.5" />

                        {convention.participants.length}
                      </span>
                    </td>

                    {/* MONTANT */}

                    <td className="px-5 py-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {formatMoney(convention.montant, convention.devise)}
                    </td>

                    {/* STATUT */}

                    <td className="px-5 py-4">
                      <StatusBadge statut={convention.statut} />
                    </td>

                    {/* ACTIONS */}

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {/* VOIR */}

                        <button
                          type="button"
                          title="Voir les détails"
                          aria-label="Voir les détails"
                          onClick={() => openDetails(convention)}
                          className="cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#0f5da8] dark:hover:bg-slate-800"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          title="Imprimer la convention"
                          aria-label="Imprimer la convention"
                          onClick={() => printConvention(convention)}
                          className="cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800"
                        >
                          <Printer className="h-4 w-4" />
                        </button>

                        {/* MODIFIER */}

                        <button
                          type="button"
                          title="Modifier"
                          aria-label="Modifier"
                          disabled={isProcessing}
                          onClick={() => openEdit(convention)}
                          className="cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-blue-500/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {/* SUPPRIMER */}

                        <button
                          type="button"
                          title="Supprimer"
                          aria-label="Supprimer"
                          disabled={isProcessing}
                          onClick={() => handleDelete(convention)}
                          className="cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        {/* STATUS */}

                        <select
                          value={convention.statut}
                          disabled={isProcessing}
                          onChange={(e) =>
                            handleStatusChange(
                              convention,
                              e.target.value as ConventionStatus,
                            )
                          }
                          title="Changer le statut"
                          className="ml-1 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none transition focus:border-[#0f5da8] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                          {Object.entries(statusConfig).map(
                            ([value, config]) => (
                              <option key={value} value={value}>
                                {config.label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredConventions.length === 0 && <EmptyState />}
      </div>

      {/* ================================================= */}
      {/* MOBILE */}
      {/* ================================================= */}

      <div className="space-y-3 md:hidden">
        {filteredConventions.map((convention) => {
          const isProcessing = processingId === convention.id;

          return (
            <div
              key={convention.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {/* HEADER */}

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900 dark:text-white">
                    {convention.numero}
                  </p>

                  <p className="mt-1 truncate text-sm text-slate-500">
                    {convention.organisationNom}
                  </p>
                </div>

                <StatusBadge statut={convention.statut} />
              </div>

              {/* DETAILS */}

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                {/* PERIODE */}

                <div>
                  <p className="text-xs text-slate-400">Période</p>

                  <p className="mt-1 text-slate-700 dark:text-slate-300">
                    {formatDate(convention.dateDebut)}
                  </p>

                  <p className="text-slate-500">
                    → {formatDate(convention.dateFin)}
                  </p>
                </div>

                {/* PARTICIPANTS */}

                <div>
                  <p className="text-xs text-slate-400">Participants</p>

                  <p className="mt-1 font-semibold text-slate-800 dark:text-white">
                    {convention.participants.length}
                  </p>
                </div>

                {/* MONTANT */}

                <div>
                  <p className="text-xs text-slate-400">Montant</p>

                  <p className="mt-1 font-semibold text-slate-800 dark:text-white">
                    {formatMoney(convention.montant, convention.devise)}
                  </p>
                </div>

                {/* CONTACT */}

                <div>
                  <p className="text-xs text-slate-400">Contact</p>

                  <p className="mt-1 truncate text-slate-700 dark:text-slate-300">
                    {convention.organisationContact ?? "-"}
                  </p>
                </div>
              </div>

              {/* ACTIONS */}

              <div className="mt-4 flex items-center justify-end gap-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                {/* VOIR */}

                <button
                  type="button"
                  title="Voir les détails"
                  aria-label="Voir les détails"
                  onClick={() => openDetails(convention)}
                  className="cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#0f5da8] dark:hover:bg-slate-800"
                >
                  <Eye className="h-4 w-4" />
                </button>

                {/* MODIFIER */}

                <button
                  type="button"
                  title="Modifier"
                  aria-label="Modifier"
                  disabled={isProcessing}
                  onClick={() => openEdit(convention)}
                  className="cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-blue-500/10"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                {/* SUPPRIMER */}

                <button
                  type="button"
                  title="Supprimer"
                  aria-label="Supprimer"
                  disabled={isProcessing}
                  onClick={() => handleDelete(convention)}
                  className="cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                {/* STATUS */}

                <select
                  value={convention.statut}
                  disabled={isProcessing}
                  onChange={(e) =>
                    handleStatusChange(
                      convention,
                      e.target.value as ConventionStatus,
                    )
                  }
                  title="Changer le statut"
                  className="ml-1 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none transition focus:border-[#0f5da8] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {Object.entries(statusConfig).map(([value, config]) => (
                    <option key={value} value={value}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}

        {filteredConventions.length === 0 && <EmptyState />}
      </div>

      {/* ================================================= */}
      {/* MODAL */}
      {/* ================================================= */}

      <ConventionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedConvention(null);
        }}
        convention={selectedConvention}
        inscriptions={inscriptions}
      />
    </div>
  );
}

/* =========================================================
 * STAT CARD
 * ========================================================= */

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>

          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0f5da8] dark:bg-blue-500/10 dark:text-blue-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
 * STATUS BADGE
 * ========================================================= */

function StatusBadge({ statut }: { statut: ConventionStatus }) {
  const config = statusConfig[statut];

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

/* =========================================================
 * EMPTY STATE
 * ========================================================= */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        <FileSignature className="h-6 w-6" />
      </div>

      <h3 className="mt-4 font-semibold text-slate-800 dark:text-white">
        Aucune convention trouvée
      </h3>

      <p className="mt-1 max-w-md text-sm text-slate-500">
        Aucune convention ne correspond à votre recherche ou aux filtres
        sélectionnés.
      </p>
    </div>
  );
}

/* =========================================================
 * HELPERS
 * ========================================================= */

function formatDate(value: Date | string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatMoney(value: unknown, devise: string): string {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number)} ${devise}`;
}
