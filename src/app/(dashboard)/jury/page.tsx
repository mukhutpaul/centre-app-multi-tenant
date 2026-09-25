"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import Select from "react-select";
import Swal from "sweetalert2";

import {
  CalendarDays,
  ClipboardCheck,
  Edit3,
  FileText,
  Gavel,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { toast } from "sonner";

import {
  createJury,
  deleteJury,
  getJurys,
  getJurySessionOptions,
  updateJury,
} from "@/actions/jury-actions";

/* =========================================================
   TYPES
========================================================= */

type StatutJury =
  | "PLANIFIE"
  | "EN_COURS"
  | "TERMINE"
  | "ANNULE";

type DecisionJury =
  | "ADMIS"
  | "ADMIS_SOUS_CONDITION"
  | "AJOURNE"
  | "ECHEC";

type Jury = {
  id: string;
  sessionId: string;
  nom: string;
  datePrevue: string | null;
  lieu: string | null;
  statut: StatutJury;
  decision: DecisionJury | null;
  notesDeliberation: string | null;

  session: {
    id: string;
    code: string;
    nom: string;
    dateDebut: string | Date;
    dateFin: string | Date;

    formation: {
      id: string;
      code: string;
      nom: string;
    };
  };

  membresCount: number;
  evaluationsCount: number;

  creeLe: string;
  modifieLe: string;
};

type SessionOption = {
  id: string;
  code: string;
  nom: string;
  dateDebut: string;
  dateFin: string;
  statut: string;

  formation: {
    id: string;
    code: string;
    nom: string;
  };
};

type SelectOption = {
  value: string;
  label: string;
};

/* =========================================================
   OPTIONS
========================================================= */

const STATUT_OPTIONS: {
  value: StatutJury;
  label: string;
}[] = [
  {
    value: "PLANIFIE",
    label: "Planifié",
  },
  {
    value: "EN_COURS",
    label: "En cours",
  },
  {
    value: "TERMINE",
    label: "Terminé",
  },
  {
    value: "ANNULE",
    label: "Annulé",
  },
];

const DECISION_OPTIONS: {
  value: DecisionJury;
  label: string;
}[] = [
  {
    value: "ADMIS",
    label: "Admis",
  },
  {
    value: "ADMIS_SOUS_CONDITION",
    label: "Admis sous condition",
  },
  {
    value: "AJOURNE",
    label: "Ajourné",
  },
  {
    value: "ECHEC",
    label: "Échec",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function formatDate(
  value?: string | Date | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function formatDateInput(
  value?: string | null,
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStatutLabel(
  statut: StatutJury,
) {
  return (
    STATUT_OPTIONS.find(
      (item) =>
        item.value === statut,
    )?.label ?? statut
  );
}

function getDecisionLabel(
  decision: DecisionJury | null,
) {
  if (!decision) {
    return "Aucune";
  }

  return (
    DECISION_OPTIONS.find(
      (item) =>
        item.value === decision,
    )?.label ?? decision
  );
}

function getStatutBadge(
  statut: StatutJury,
) {
  switch (statut) {
    case "PLANIFIE":
      return "badge-info";

    case "EN_COURS":
      return "badge-warning";

    case "TERMINE":
      return "badge-success";

    case "ANNULE":
      return "badge-error";

    default:
      return "badge-ghost";
  }
}

function getDecisionBadge(
  decision: DecisionJury | null,
) {
  switch (decision) {
    case "ADMIS":
      return "badge-success";

    case "ADMIS_SOUS_CONDITION":
      return "badge-warning";

    case "AJOURNE":
      return "badge-info";

    case "ECHEC":
      return "badge-error";

    default:
      return "badge-ghost";
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function JuryPage() {
  const router = useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [jurys, setJurys] =
    useState<Jury[]>([]);

  const [
    sessions,
    setSessions,
  ] = useState<SessionOption[]>(
    [],
  );

  const [loading, setLoading] =
    useState(true);

  /* =======================================================
     FILTRES
  ======================================================= */

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statutFilter,
    setStatutFilter,
  ] = useState<
    StatutJury | "TOUS"
  >("TOUS");

  /* =======================================================
     MODAL
  ======================================================= */

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);

  const [
    editingJury,
    setEditingJury,
  ] = useState<Jury | null>(null);

  const [
    sessionId,
    setSessionId,
  ] = useState("");

  const [nom, setNom] =
    useState("");

  const [
    datePrevue,
    setDatePrevue,
  ] = useState("");

  const [lieu, setLieu] =
    useState("");

  const [
    statut,
    setStatut,
  ] = useState<StatutJury>(
    "PLANIFIE",
  );

  const [
    decision,
    setDecision,
  ] = useState<
    DecisionJury | ""
  >("");

  const [
    notesDeliberation,
    setNotesDeliberation,
  ] = useState("");

  /* =======================================================
     CHARGEMENT
  ======================================================= */

  async function loadData() {
    try {
      setLoading(true);

      const [
        jurysResponse,
        sessionsResponse,
      ] = await Promise.all([
        getJurys(),
        getJurySessionOptions(),
      ]);

      if (
        !jurysResponse?.success
      ) {
        throw new Error(
          jurysResponse?.message ??
            "Impossible de récupérer les jurys.",
        );
      }

      setJurys(
        jurysResponse.data ?? [],
      );

      if (
        sessionsResponse?.success
      ) {
        setSessions(
          sessionsResponse.data ??
            [],
        );
      }
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de charger les jurys.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  /* =======================================================
     OPTIONS SESSION
  ======================================================= */

  const sessionOptions =
    useMemo<SelectOption[]>(
      () =>
        sessions.map(
          (session) => ({
            value: session.id,
            label: `${session.formation.nom} — ${session.nom} (${session.code})`,
          }),
        ),
      [sessions],
    );

  /* =======================================================
     JURYS FILTRÉS
  ======================================================= */

  const filteredJurys =
    useMemo(() => {
      const term =
        search.trim().toLowerCase();

      return jurys.filter(
        (jury) => {
          const matchesSearch =
            !term ||
            jury.nom
              .toLowerCase()
              .includes(term) ||
            jury.session.nom
              .toLowerCase()
              .includes(term) ||
            jury.session.code
              .toLowerCase()
              .includes(term) ||
            jury.session.formation.nom
              .toLowerCase()
              .includes(term);

          const matchesStatut =
            statutFilter === "TOUS" ||
            jury.statut ===
              statutFilter;

          return (
            matchesSearch &&
            matchesStatut
          );
        },
      );
    }, [
      jurys,
      search,
      statutFilter,
    ]);

  /* =======================================================
     STATISTIQUES
  ======================================================= */

  const totalJurys =
    jurys.length;

  const jurysPlanifies =
    jurys.filter(
      (jury) =>
        jury.statut ===
        "PLANIFIE",
    ).length;

  const jurysEnCours =
    jurys.filter(
      (jury) =>
        jury.statut ===
        "EN_COURS",
    ).length;

  const jurysTermines =
    jurys.filter(
      (jury) =>
        jury.statut ===
        "TERMINE",
    ).length;

  /* =======================================================
     RESET
  ======================================================= */

  function resetForm() {
    setEditingJury(null);
    setSessionId("");
    setNom("");
    setDatePrevue("");
    setLieu("");
    setStatut("PLANIFIE");
    setDecision("");
    setNotesDeliberation("");
  }

  /* =======================================================
     OPEN CREATE
  ======================================================= */

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  /* =======================================================
     OPEN EDIT
  ======================================================= */

  function openEdit(
    jury: Jury,
  ) {
    setEditingJury(jury);

    setSessionId(
      jury.sessionId,
    );

    setNom(jury.nom);

    setDatePrevue(
      formatDateInput(
        jury.datePrevue,
      ),
    );

    setLieu(
      jury.lieu ?? "",
    );

    setStatut(
      jury.statut,
    );

    setDecision(
      jury.decision ?? "",
    );

    setNotesDeliberation(
      jury.notesDeliberation ??
        "",
    );

    setModalOpen(true);
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!sessionId) {
      toast.error(
        "Veuillez sélectionner une session.",
      );
      return;
    }

    if (!nom.trim()) {
      toast.error(
        "Le nom du jury est obligatoire.",
      );
      return;
    }

    startTransition(async () => {
      try {
        const response =
          editingJury
            ? await updateJury(
                editingJury.id,
                {
                  sessionId,
                  nom: nom.trim(),
                  datePrevue:
                    datePrevue ||
                    null,
                  lieu:
                    lieu.trim() ||
                    null,
                  statut,
                  decision:
                    decision || null,
                  notesDeliberation:
                    notesDeliberation.trim() ||
                    null,
                },
              )
            : await createJury({
                sessionId,
                nom: nom.trim(),
                datePrevue:
                  datePrevue ||
                  null,
                lieu:
                  lieu.trim() ||
                  null,
                statut,
                decision:
                  decision || null,
                notesDeliberation:
                  notesDeliberation.trim() ||
                  null,
              });

        if (!response?.success) {
          throw new Error(
            response?.message ??
              "Opération impossible.",
          );
        }

        toast.success(
          response.message ??
            "Jury enregistré.",
        );

        setModalOpen(false);
        resetForm();

        await loadData();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer le jury.",
        );
      }
    });
  }

  /* =======================================================
     DELETE
  ======================================================= */

  async function handleDelete(
    jury: Jury,
  ) {
    const result =
      await Swal.fire({
        title:
          "Supprimer ce jury ?",

        html: `
          <div style="text-align:center">
            <p>
              Vous êtes sur le point de supprimer :
            </p>

            <strong>
              ${jury.nom}
            </strong>

            <p style="margin-top:8px">
              Cette opération ne pourra pas être annulée.
            </p>
          </div>
        `,

        icon: "warning",

        showCancelButton: true,

        confirmButtonText:
          "Oui, supprimer",

        cancelButtonText:
          "Annuler",

        reverseButtons: true,
      });

    if (!result.isConfirmed) {
      return;
    }

    startTransition(async () => {
      try {
        const response =
          await deleteJury(
            jury.id,
          );

        if (!response?.success) {
          throw new Error(
            response?.message ??
              "Suppression impossible.",
          );
        }

        toast.success(
          response.message ??
            "Jury supprimé.",
        );

        await loadData();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de supprimer le jury.",
        );
      }
    });
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={40}
            className="animate-spin text-primary"
          />

          <p className="text-sm opacity-60">
            Chargement des jurys...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-base-200 p-4 md:p-6">

      <div className="mx-auto max-w-7xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6 rounded-3xl bg-gradient-to-r from-primary to-secondary p-6 text-primary-content shadow-xl">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <Gavel size={30} />
              </div>

              <div>

                <p className="text-sm opacity-80">
                  Administration académique
                </p>

                <h1 className="text-2xl font-black md:text-3xl">
                  Jurys
                </h1>

                <p className="mt-1 text-sm opacity-80">
                  Organisez les jurys et les délibérations.
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={openCreate}
              className="btn cursor-pointer border-0 bg-white text-primary hover:bg-white/90"
            >
              <Plus size={18} />
              Nouveau jury
            </button>

          </div>

        </div>

        {/* =================================================
            STATS
        ================================================= */}

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">

          <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-60">
                  Total jurys
                </p>

                <p className="mt-1 text-2xl font-black">
                  {totalJurys}
                </p>
              </div>

              <Gavel className="text-primary" />
            </div>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-60">
                  Planifiés
                </p>

                <p className="mt-1 text-2xl font-black">
                  {jurysPlanifies}
                </p>
              </div>

              <CalendarDays className="text-info" />
            </div>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-60">
                  En cours
                </p>

                <p className="mt-1 text-2xl font-black">
                  {jurysEnCours}
                </p>
              </div>

              <ClipboardCheck className="text-warning" />
            </div>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-60">
                  Terminés
                </p>

                <p className="mt-1 text-2xl font-black">
                  {jurysTermines}
                </p>
              </div>

              <FileText className="text-success" />
            </div>
          </div>

        </div>

        {/* =================================================
            FILTRES
        ================================================= */}

        <div className="mb-6 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">

          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">

            <div className="relative">

              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                className="input input-bordered w-full pl-10"
                placeholder="Rechercher un jury, une session, une formation..."
              />

            </div>

            <select
              value={statutFilter}
              onChange={(event) =>
                setStatutFilter(
                  event.target
                    .value as
                    | StatutJury
                    | "TOUS",
                )
              }
              className="select select-bordered w-full cursor-pointer"
            >
              <option value="TOUS">
                Tous les statuts
              </option>

              {STATUT_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatutFilter(
                  "TOUS",
                );
              }}
              className="btn btn-ghost cursor-pointer"
            >
              Réinitialiser
            </button>

          </div>

        </div>

        {/* =================================================
            TABLE
        ================================================= */}

        <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">

          <div className="border-b border-base-300 p-5">

            <div className="flex items-center justify-between">

              <div>
                <h2 className="font-bold">
                  Liste des jurys
                </h2>

                <p className="text-sm opacity-60">
                  {filteredJurys.length} jury
                  {filteredJurys.length >
                  1
                    ? "s"
                    : ""}{" "}
                  affiché
                  {filteredJurys.length >
                  1
                    ? "s"
                    : ""}
                </p>
              </div>

            </div>

          </div>

          <div className="overflow-x-auto">

            <table className="table">

              <thead>
                <tr>

                  <th>Jury</th>

                  <th>Formation / Session</th>

                  <th>Date</th>

                  <th>Statut</th>

                  <th>Membres</th>

                  <th>Évaluations</th>

                  <th>Décision</th>

                  <th className="text-right">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody>

                {filteredJurys.length ===
                0 ? (
                  <tr>

                    <td
                      colSpan={8}
                      className="py-16 text-center"
                    >

                      <Gavel
                        size={46}
                        className="mx-auto opacity-20"
                      />

                      <p className="mt-3 font-semibold">
                        Aucun jury trouvé
                      </p>

                      <p className="text-sm opacity-60">
                        Créez votre premier jury
                        pour commencer les délibérations.
                      </p>

                      <button
                        type="button"
                        onClick={
                          openCreate
                        }
                        className="btn btn-primary btn-sm mt-4 cursor-pointer"
                      >
                        <Plus size={16} />
                        Créer un jury
                      </button>

                    </td>

                  </tr>
                ) : (
                  filteredJurys.map(
                    (jury) => (
                      <tr
                        key={jury.id}
                        className="hover"
                      >

                        {/* JURY */}

                        <td>

                          <div className="flex items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Gavel
                                size={19}
                              />
                            </div>

                            <div>

                              <p className="font-bold">
                                {jury.nom}
                              </p>

                              <p className="text-xs opacity-50">
                                Créé le{" "}
                                {formatDate(
                                  jury.creeLe,
                                )}
                              </p>

                            </div>

                          </div>

                        </td>

                        {/* SESSION */}

                        <td>

                          <div>

                            <p className="font-semibold">
                              {
                                jury
                                  .session
                                  .formation
                                  .nom
                              }
                            </p>

                            <p className="text-xs opacity-60">
                              {
                                jury
                                  .session
                                  .nom
                              }{" "}
                              ·{" "}
                              {
                                jury
                                  .session
                                  .code
                              }
                            </p>

                          </div>

                        </td>

                        {/* DATE */}

                        <td>

                          <div className="flex items-center gap-2">

                            <CalendarDays
                              size={15}
                              className="opacity-50"
                            />

                            <span>
                              {formatDate(
                                jury.datePrevue,
                              )}
                            </span>

                          </div>

                          {jury.lieu && (
                            <div className="mt-1 flex items-center gap-2 text-xs opacity-50">
                              <MapPin
                                size={13}
                              />

                              {
                                jury.lieu
                              }
                            </div>
                          )}

                        </td>

                        {/* STATUT */}

                        <td>

                          <span
                            className={`badge ${getStatutBadge(
                              jury.statut,
                            )}`}
                          >
                            {getStatutLabel(
                              jury.statut,
                            )}
                          </span>

                        </td>

                        {/* MEMBRES */}

                        <td>

                          <div className="flex items-center gap-2">

                            <Users
                              size={15}
                              className="opacity-50"
                            />

                            <span className="font-semibold">
                              {
                                jury.membresCount
                              }
                            </span>

                          </div>

                        </td>

                        {/* EVALUATIONS */}

                        <td>

                          <div className="flex items-center gap-2">

                            <ClipboardCheck
                              size={15}
                              className="opacity-50"
                            />

                            <span className="font-semibold">
                              {
                                jury.evaluationsCount
                              }
                            </span>

                          </div>

                        </td>

                        {/* DECISION */}

                        <td>

                          <span
                            className={`badge ${getDecisionBadge(
                              jury.decision,
                            )}`}
                          >
                            {getDecisionLabel(
                              jury.decision,
                            )}
                          </span>

                        </td>

                        {/* ACTIONS */}

                        <td>

                          <div className="flex justify-end gap-1">

                            <Link
                              href={`/jury/${jury.id}`}
                              className="btn btn-primary btn-sm cursor-pointer"
                            >
                              Gérer
                            </Link>

                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  jury,
                                )
                              }
                              className="btn btn-ghost btn-sm cursor-pointer"
                              title="Modifier"
                            >
                              <Edit3
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  jury,
                                )
                              }
                              disabled={
                                isPending
                              }
                              className="btn btn-ghost btn-sm cursor-pointer text-error"
                              title="Supprimer"
                            >
                              <Trash2
                                size={16}
                              />
                            </button>

                          </div>

                        </td>

                      </tr>
                    ),
                  )
                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

      {/* =====================================================
          MODAL CREATE / UPDATE
      ===================================================== */}

      {modalOpen && (
        <dialog
          open
          className="modal modal-open"
        >

          <div className="modal-box max-w-3xl">

            <div className="mb-6 flex items-center justify-between">

              <div>

                <h3 className="text-xl font-black">
                  {editingJury
                    ? "Modifier le jury"
                    : "Créer un jury"}
                </h3>

                <p className="text-sm opacity-60">
                  Configurez la session et les informations du jury.
                </p>

              </div>

              <button
                type="button"
                onClick={() => {
                  setModalOpen(
                    false,
                  );
                  resetForm();
                }}
                className="btn btn-circle btn-ghost cursor-pointer"
              >
                <X size={18} />
              </button>

            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* SESSION */}

              <div>

                <label className="mb-2 block text-sm font-semibold">
                  Session de formation *
                </label>

                <Select
                  options={
                    sessionOptions
                  }

                  value={
                    sessionOptions.find(
                      (
                        option,
                      ) =>
                        option.value ===
                        sessionId,
                    ) ?? null
                  }

                  onChange={(
                    option,
                  ) =>
                    setSessionId(
                      option?.value ??
                        "",
                    )
                  }

                  placeholder="Sélectionner une session..."
                  isSearchable
                  classNamePrefix="react-select"
                />

              </div>

              {/* NOM */}

              <label className="form-control">

                <span className="mb-2 text-sm font-semibold">
                  Nom du jury *
                </span>

                <input
                  value={nom}
                  onChange={(event) =>
                    setNom(
                      event.target
                        .value,
                    )
                  }
                  className="input input-bordered w-full"
                  placeholder="Ex. Jury final — Promotion 2026"
                />

              </label>

              <div className="grid gap-4 md:grid-cols-2">

                {/* DATE */}

                <label className="form-control">

                  <span className="mb-2 text-sm font-semibold">
                    Date prévue
                  </span>

                  <input
                    type="date"
                    value={
                      datePrevue
                    }
                    onChange={(
                      event,
                    ) =>
                      setDatePrevue(
                        event.target
                          .value,
                      )
                    }
                    className="input input-bordered w-full"
                  />

                </label>

                {/* LIEU */}

                <label className="form-control">

                  <span className="mb-2 text-sm font-semibold">
                    Lieu
                  </span>

                  <input
                    value={lieu}
                    onChange={(event) =>
                      setLieu(
                        event.target
                          .value,
                      )
                    }
                    className="input input-bordered w-full"
                    placeholder="Salle de délibération"
                  />

                </label>

              </div>

              <div className="grid gap-4 md:grid-cols-2">

                {/* STATUT */}

                <div>

                  <label className="mb-2 block text-sm font-semibold">
                    Statut
                  </label>

                  <Select
                    options={
                      STATUT_OPTIONS
                    }

                    value={
                      STATUT_OPTIONS.find(
                        (
                          option,
                        ) =>
                          option.value ===
                          statut,
                      )
                    }

                    onChange={(
                      option,
                    ) =>
                      setStatut(
                        option?.value ??
                          "PLANIFIE",
                      )
                    }

                    isSearchable={false}
                    classNamePrefix="react-select"
                  />

                </div>

                {/* DECISION */}

                <div>

                  <label className="mb-2 block text-sm font-semibold">
                    Décision
                  </label>

                  <Select
                    options={
                      DECISION_OPTIONS
                    }

                    isClearable
                    value={
                      DECISION_OPTIONS.find(
                        (
                          option,
                        ) =>
                          option.value ===
                          decision,
                      ) ?? null
                    }

                    onChange={(
                      option,
                    ) =>
                      setDecision(
                        option?.value ??
                          "",
                      )
                    }

                    placeholder="Aucune décision"
                    isSearchable={false}
                    classNamePrefix="react-select"
                  />

                </div>

              </div>

              {/* NOTES */}

              <label className="form-control">

                <span className="mb-2 text-sm font-semibold">
                  Notes de délibération
                </span>

                <textarea
                  value={
                    notesDeliberation
                  }
                  onChange={(event) =>
                    setNotesDeliberation(
                      event.target
                        .value,
                    )
                  }
                  className="textarea textarea-bordered min-h-32 w-full"
                  placeholder="Observations ou notes de délibération..."
                />

              </label>

              {/* ACTIONS */}

              <div className="flex justify-end gap-2 border-t border-base-300 pt-5">

                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(
                      false,
                    );
                    resetForm();
                  }}
                  className="btn btn-ghost cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={
                    isPending
                  }
                  className="btn btn-primary cursor-pointer"
                >

                  {isPending ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Plus
                      size={17}
                    />
                  )}

                  {editingJury
                    ? "Enregistrer les modifications"
                    : "Créer le jury"}

                </button>

              </div>

            </form>

          </div>

          <form
            method="dialog"
            className="modal-backdrop"
          >
            <button
              type="button"
              onClick={() => {
                setModalOpen(
                  false,
                );
                resetForm();
              }}
            >
              close
            </button>
          </form>

        </dialog>
      )}

    </div>
  );
}