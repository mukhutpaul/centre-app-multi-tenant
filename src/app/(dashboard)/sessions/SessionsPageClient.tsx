"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteSession,
  updateSessionStatut,
} from "@/actions/session.actions";

type Session = {
  id: string;
  code: string;
  nom: string | null;
  dateDebut: Date | string;
  dateFin: Date | string;
  capacite: number | null;
  statut: string;
  ouvertureInscriptions: Date | string | null;
  fermetureInscriptions: Date | string | null;
  formation: {
    id: string;
    code: string;
    nom: string;
  };
  _count?: {
    inscriptions: number;
    modules: number;
    formateurs: number;
  };
};

type Props = {
  initialSessions: Session[];
  initialError: string | null;
};

const STATUTS = [
  {
    value: "PLANIFIEE",
    label: "Planifiée",
  },
  {
    value: "INSCRIPTIONS_OUVERTES",
    label: "Inscriptions ouvertes",
  },
  {
    value: "INSCRIPTIONS_FERMEES",
    label: "Inscriptions fermées",
  },
  {
    value: "EN_COURS",
    label: "En cours",
  },
  {
    value: "TERMINEE",
    label: "Terminée",
  },
  {
    value: "ANNULEE",
    label: "Annulée",
  },
  {
    value: "SUSPENDUE",
    label: "Suspendue",
  },
];

const ITEMS_PER_PAGE = 10;

function formatDate(date: Date | string | null) {
  if (!date) return "-";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function getStatusLabel(status: string) {
  return (
    STATUTS.find((item) => item.value === status)?.label ?? status
  );
}

function getStatusClass(status: string) {
  switch (status) {
    case "PLANIFIEE":
      return "badge badge-info";

    case "INSCRIPTIONS_OUVERTES":
      return "badge badge-success";

    case "INSCRIPTIONS_FERMEES":
      return "badge badge-warning";

    case "EN_COURS":
      return "badge badge-primary";

    case "TERMINEE":
      return "badge badge-neutral";

    case "ANNULEE":
      return "badge badge-error";

    case "SUSPENDUE":
      return "badge badge-warning";

    default:
      return "badge";
  }
}

export default function SessionsPageClient({
  initialSessions,
  initialError,
}: Props) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TOUS");
  const [formationFilter, setFormationFilter] = useState("TOUTES");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const formations = useMemo(() => {
    const map = new Map<string, string>();

    sessions.forEach((session) => {
      if (!map.has(session.formation.id)) {
        map.set(session.formation.id, session.formation.nom);
      }
    });

    return Array.from(map.entries()).map(([id, nom]) => ({
      id,
      nom,
    }));
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sessions.filter((session) => {
      const matchesSearch =
        !normalizedSearch ||
        session.code.toLowerCase().includes(normalizedSearch) ||
        (session.nom ?? "").toLowerCase().includes(normalizedSearch) ||
        session.formation.nom.toLowerCase().includes(normalizedSearch) ||
        session.formation.code.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "TOUS" || session.statut === statusFilter;

      const matchesFormation =
        formationFilter === "TOUTES" ||
        session.formation.id === formationFilter;

      return matchesSearch && matchesStatus && matchesFormation;
    });
  }, [sessions, search, statusFilter, formationFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSessions.length / ITEMS_PER_PAGE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedSessions = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;

    return filteredSessions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSessions, safeCurrentPage]);

  const totalSessions = sessions.length;

  const activeSessions = sessions.filter(
    (session) =>
      session.statut === "EN_COURS" ||
      session.statut === "INSCRIPTIONS_OUVERTES"
  ).length;

  const plannedSessions = sessions.filter(
    (session) => session.statut === "PLANIFIEE"
  ).length;

  const completedSessions = sessions.filter(
    (session) => session.statut === "TERMINEE"
  ).length;

  function resetFilters() {
    setSearch("");
    setStatusFilter("TOUS");
    setFormationFilter("TOUTES");
    setCurrentPage(1);
  }

  async function handleStatusChange(
    sessionId: string,
    newStatus: string
  ) {
    setLoading(true);

    try {
      const result = await updateSessionStatut(
        sessionId,
        newStatus as never
      );

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setSessions((current) =>
        current.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                statut: newStatus,
              }
            : session
        )
      );

      toast.success("Statut de la session mis à jour.");
    } catch {
      toast.error(
        "Une erreur est survenue lors de la modification du statut."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(session: Session) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer la session "${session.code}" ?`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const result = await deleteSession(session.id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setSessions((current) =>
        current.filter((item) => item.id !== session.id)
      );

      toast.success("Session supprimée avec succès.");
    } catch {
      toast.error("Impossible de supprimer la session.");
    } finally {
      setLoading(false);
    }
  }

  if (initialError) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>{initialError}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm breadcrumbs">
            <ul>
              <li>
                <Link href="/formations">Formations</Link>
              </li>
              <li>Sessions</li>
            </ul>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold mt-2">
            Sessions de formation
          </h1>

          <p className="text-base-content/60 mt-1">
            Planifiez et gérez les sessions de vos formations.
          </p>
        </div>

        <Link
          href="/sessions/nouvelle"
          className="btn btn-primary"
        >
          <Plus size={18} />
          Nouvelle session
        </Link>
      </div>

      {/* STATISTIQUES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card bg-base-100 shadow-sm border border-base-300">
          <div className="card-body">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-base-content/60">
                  Total sessions
                </p>
                <p className="text-3xl font-bold mt-1">
                  {totalSessions}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <CalendarDays size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm border border-base-300">
          <div className="card-body">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-base-content/60">
                  Actives
                </p>
                <p className="text-3xl font-bold mt-1">
                  {activeSessions}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-success/10 text-success">
                <Users size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm border border-base-300">
          <div className="card-body">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-base-content/60">
                  Planifiées
                </p>
                <p className="text-3xl font-bold mt-1">
                  {plannedSessions}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-info/10 text-info">
                <CalendarDays size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm border border-base-300">
          <div className="card-body">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-base-content/60">
                  Terminées
                </p>
                <p className="text-3xl font-bold mt-1">
                  {completedSessions}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral/10">
                <CalendarDays size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTRES */}
      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* RECHERCHE */}
            <label className="input input-bordered flex items-center gap-2">
              <Search size={18} className="opacity-50" />

              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                className="grow"
              />
            </label>

            {/* STATUT */}
            <select
              className="select select-bordered w-full"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="TOUS">Tous les statuts</option>

              {STATUTS.map((status) => (
                <option
                  key={status.value}
                  value={status.value}
                >
                  {status.label}
                </option>
              ))}
            </select>

            {/* FORMATION */}
            <select
              className="select select-bordered w-full"
              value={formationFilter}
              onChange={(event) => {
                setFormationFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="TOUTES">
                Toutes les formations
              </option>

              {formations.map((formation) => (
                <option
                  key={formation.id}
                  value={formation.id}
                >
                  {formation.nom}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn btn-outline"
              onClick={resetFilters}
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Formation</th>
                  <th>Période</th>
                  <th>Capacité</th>
                  <th>Statut</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedSessions.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="py-12 text-center">
                        <CalendarDays
                          size={42}
                          className="mx-auto opacity-30"
                        />

                        <p className="font-semibold mt-3">
                          Aucune session trouvée
                        </p>

                        <p className="text-sm text-base-content/60 mt-1">
                          Modifiez vos filtres ou créez une nouvelle
                          session.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedSessions.map((session) => {
                    const inscriptions =
                      session._count?.inscriptions ?? 0;

                    return (
                      <tr key={session.id}>
                        {/* SESSION */}
                        <td>
                          <div className="font-bold">
                            {session.code}
                          </div>

                          {session.nom && (
                            <div className="text-sm text-base-content/60">
                              {session.nom}
                            </div>
                          )}
                        </td>

                        {/* FORMATION */}
                        <td>
                          <div className="font-medium">
                            {session.formation.nom}
                          </div>

                          <div className="text-xs text-base-content/60">
                            {session.formation.code}
                          </div>
                        </td>

                        {/* DATES */}
                        <td>
                          <div className="text-sm">
                            {formatDate(session.dateDebut)}
                          </div>

                          <div className="text-xs text-base-content/60">
                            au {formatDate(session.dateFin)}
                          </div>
                        </td>

                        {/* CAPACITE */}
                        <td>
                          <div className="flex items-center gap-2">
                            <Users size={16} />

                            <span>
                              {inscriptions}
                              {session.capacite !== null
                                ? ` / ${session.capacite}`
                                : ""}
                            </span>
                          </div>
                        </td>

                        {/* STATUT */}
                        <td>
                          <select
                            className={`select select-bordered select-sm ${getStatusClass(
                              session.statut
                            )}`}
                            value={session.statut}
                            disabled={loading}
                            onChange={(event) =>
                              handleStatusChange(
                                session.id,
                                event.target.value
                              )
                            }
                          >
                            {STATUTS.map((status) => (
                              <option
                                key={status.value}
                                value={status.value}
                              >
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* ACTIONS */}
                        <td>
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/sessions/${session.id}`}
                              className="btn btn-sm btn-ghost"
                              title="Voir"
                            >
                              <Eye size={17} />
                            </Link>

                            <Link
                              href={`/sessions/${session.id}/modifier`}
                              className="btn btn-sm btn-ghost"
                              title="Modifier"
                            >
                              <Pencil size={17} />
                            </Link>

                            <button
                              type="button"
                              className="btn btn-sm btn-error btn-outline"
                              disabled={loading}
                              onClick={() => handleDelete(session)}
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {filteredSessions.length > 0 && (
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between p-4 border-t border-base-300">
              <div className="text-sm text-base-content/60">
                Affichage de{" "}
                <strong>
                  {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}
                </strong>{" "}
                à{" "}
                <strong>
                  {Math.min(
                    safeCurrentPage * ITEMS_PER_PAGE,
                    filteredSessions.length
                  )}
                </strong>{" "}
                sur{" "}
                <strong>{filteredSessions.length}</strong>{" "}
                session(s)
              </div>

              <div className="join">
                <button
                  className="join-item btn btn-sm"
                  disabled={safeCurrentPage <= 1}
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                >
                  <ChevronLeft size={16} />
                </button>

                <button className="join-item btn btn-sm">
                  {safeCurrentPage} / {totalPages}
                </button>

                <button
                  className="join-item btn btn-sm"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(totalPages, page + 1)
                    )
                  }
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}