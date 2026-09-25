"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import Link from "next/link";

import Select from "react-select";
import Swal from "sweetalert2";

import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Edit3,
  FileText,
  Gavel,
  Loader2,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
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
      return "badge-info badge-outline";

    case "EN_COURS":
      return "badge-warning badge-outline";

    case "TERMINE":
      return "badge-success badge-outline";

    case "ANNULE":
      return "badge-error badge-outline";

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
     FILTRE
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

  const totalMembres =
    jurys.reduce(
      (total, jury) =>
        total +
        (jury.membresCount || 0),
      0,
    );

  const totalEvaluations =
    jurys.reduce(
      (total, jury) =>
        total +
        (jury.evaluationsCount ||
          0),
      0,
    );

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
     CREATE
  ======================================================= */

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  /* =======================================================
     EDIT
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
      <div className="flex min-h-[70vh] items-center justify-center bg-base-200">
        <div className="flex flex-col items-center gap-4">

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Loader2
              size={34}
              className="animate-spin text-primary"
            />
          </div>

          <div className="text-center">
            <p className="font-bold">
              Chargement des jurys
            </p>

            <p className="mt-1 text-sm opacity-50">
              Préparation de votre espace de délibération...
            </p>
          </div>

        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-base-200 p-3 sm:p-5 lg:p-7">

      <div className="mx-auto max-w-[1500px]">

        {/* =================================================
            HEADER
        ================================================= */}

        <section className="relative mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary to-secondary p-6 text-primary-content shadow-xl md:p-8">

          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">

            <div className="flex items-start gap-4">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner backdrop-blur">
                <Gavel
                  size={28}
                />
              </div>

              <div>

                <div className="mb-2 flex flex-wrap items-center gap-2">

                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                    Administration académique
                  </span>

                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">
                    Délibérations
                  </span>

                </div>

                <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                  Gestion des jurys
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-primary-content/75 md:text-base">
                  Organisez vos jurys, gérez les membres,
                  suivez les évaluations et centralisez
                  les décisions de délibération.
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={openCreate}
              className="btn cursor-pointer border-0 bg-white px-5 text-primary shadow-lg hover:bg-base-100"
            >
              <Plus size={18} />
              Nouveau jury
            </button>

          </div>

        </section>

        {/* =================================================
            KPI
        ================================================= */}

        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

          <div className="group rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider opacity-50">
                  Total jurys
                </p>

                <p className="mt-2 text-3xl font-black">
                  {totalJurys}
                </p>

                <p className="mt-1 text-xs opacity-50">
                  Jurys enregistrés
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Gavel size={21} />
              </div>

            </div>

          </div>

          <div className="group rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider opacity-50">
                  Planifiés
                </p>

                <p className="mt-2 text-3xl font-black">
                  {jurysPlanifies}
                </p>

                <p className="mt-1 text-xs opacity-50">
                  En attente
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-info/10 text-info">
                <CalendarDays size={21} />
              </div>

            </div>

          </div>

          <div className="group rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider opacity-50">
                  En cours
                </p>

                <p className="mt-2 text-3xl font-black">
                  {jurysEnCours}
                </p>

                <p className="mt-1 text-xs opacity-50">
                  Délibérations actives
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <ClipboardCheck size={21} />
              </div>

            </div>

          </div>

          <div className="group rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider opacity-50">
                  Terminés
                </p>

                <p className="mt-2 text-3xl font-black">
                  {jurysTermines}
                </p>

                <p className="mt-1 text-xs opacity-50">
                  Délibérations clôturées
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-success">
                <CheckCircle2 size={21} />
              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            MINI STATS
        ================================================= */}

        <section className="mb-6 grid gap-3 md:grid-cols-2">

          <div className="flex items-center justify-between rounded-2xl border border-base-300 bg-base-100 px-5 py-4 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <Users size={19} />
              </div>

              <div>
                <p className="text-sm font-bold">
                  Membres de jury
                </p>

                <p className="text-xs opacity-50">
                  Total associé aux jurys
                </p>
              </div>

            </div>

            <span className="text-xl font-black">
              {totalMembres}
            </span>

          </div>

          <div className="flex items-center justify-between rounded-2xl border border-base-300 bg-base-100 px-5 py-4 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ClipboardCheck size={19} />
              </div>

              <div>
                <p className="text-sm font-bold">
                  Évaluations jury
                </p>

                <p className="text-xs opacity-50">
                  Évaluations enregistrées
                </p>
              </div>

            </div>

            <span className="text-xl font-black">
              {totalEvaluations}
            </span>

          </div>

        </section>

        {/* =================================================
            FILTRES
        ================================================= */}

        <section className="mb-5 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">

          <div className="mb-4 flex flex-col gap-1">

            <h2 className="font-bold">
              Rechercher et filtrer
            </h2>

            <p className="text-xs opacity-50">
              Retrouvez rapidement un jury, une session ou une formation.
            </p>

          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_230px_auto]">

            <div className="relative">

              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 opacity-40"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                className="input input-bordered h-11 w-full pl-10"
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
              className="select select-bordered h-11 w-full cursor-pointer"
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
              className="btn btn-ghost h-11 cursor-pointer"
            >
              <X size={16} />
              Réinitialiser
            </button>

          </div>

        </section>

        {/* =================================================
            TABLE HEADER
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">

          <div className="flex flex-col gap-4 border-b border-base-300 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Gavel size={17} />
                </div>

                <h2 className="font-black">
                  Liste des jurys
                </h2>

              </div>

              <p className="mt-1 text-sm opacity-50">
                {filteredJurys.length} résultat
                {filteredJurys.length > 1
                  ? "s"
                  : ""}{" "}
                affiché
                {filteredJurys.length > 1
                  ? "s"
                  : ""}
              </p>

            </div>

            <div className="flex items-center gap-2">

              <span className="badge badge-ghost">
                {jurys.length} total
              </span>

              {statutFilter !==
                "TOUS" && (
                <span className="badge badge-primary badge-outline">
                  {getStatutLabel(
                    statutFilter,
                  )}
                </span>
              )}

            </div>

          </div>

          {/* =================================================
              TABLE
          ================================================= */}

          <div className="overflow-x-auto">

            <table className="table">

              <thead>

                <tr className="bg-base-200/50 text-xs uppercase tracking-wide">

                  <th className="py-4">
                    Jury
                  </th>

                  <th>
                    Formation / Session
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Statut
                  </th>

                  <th>
                    Membres
                  </th>

                  <th>
                    Évaluations
                  </th>

                  <th>
                    Décision
                  </th>

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
                      className="py-20"
                    >

                      <div className="flex flex-col items-center text-center">

                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-base-200 text-base-content/30">
                          <Gavel size={36} />
                        </div>

                        <h3 className="mt-5 text-lg font-black">
                          Aucun jury trouvé
                        </h3>

                        <p className="mt-1 max-w-md text-sm opacity-50">
                          Aucun jury ne correspond
                          aux critères de recherche
                          actuels.
                        </p>

                        <button
                          type="button"
                          onClick={
                            openCreate
                          }
                          className="btn btn-primary mt-5 cursor-pointer"
                        >
                          <Plus size={17} />
                          Créer un jury
                        </button>

                      </div>

                    </td>

                  </tr>
                ) : (
                  filteredJurys.map(
                    (jury) => (
                      <tr
                        key={jury.id}
                        className="group hover:bg-base-200/40"
                      >

                        {/* JURY */}

                        <td className="min-w-[250px]">

                          <div className="flex items-center gap-3">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-content">
                              <Gavel
                                size={19}
                              />
                            </div>

                            <div className="min-w-0">

                              <p className="truncate font-bold">
                                {jury.nom}
                              </p>

                              <p className="mt-0.5 text-xs opacity-50">
                                Créé le{" "}
                                {formatDate(
                                  jury.creeLe,
                                )}
                              </p>

                            </div>

                          </div>

                        </td>

                        {/* FORMATION / SESSION */}

                        <td className="min-w-[250px]">

                          <p className="font-semibold">
                            {
                              jury
                                .session
                                .formation
                                .nom
                            }
                          </p>

                          <div className="mt-1 flex items-center gap-1.5 text-xs opacity-55">

                            <span>
                              {
                                jury
                                  .session
                                  .nom
                              }
                            </span>

                            <span>
                              •
                            </span>

                            <span className="font-mono">
                              {
                                jury
                                  .session
                                  .code
                              }
                            </span>

                          </div>

                        </td>

                        {/* DATE */}

                        <td className="min-w-[170px]">

                          <div className="flex items-center gap-2">

                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-base-200">
                              <CalendarDays
                                size={15}
                                className="opacity-60"
                              />
                            </div>

                            <div>

                              <p className="font-semibold">
                                {formatDate(
                                  jury.datePrevue,
                                )}
                              </p>

                              {jury.lieu && (
                                <p className="mt-0.5 flex items-center gap-1 text-xs opacity-50">
                                  <MapPin
                                    size={11}
                                  />
                                  {
                                    jury.lieu
                                  }
                                </p>
                              )}

                            </div>

                          </div>

                        </td>

                        {/* STATUT */}

                        <td>

                          <span
                            className={`badge ${getStatutBadge(
                              jury.statut,
                            )} gap-1.5 whitespace-nowrap`}
                          >

                            <span className="h-1.5 w-1.5 rounded-full bg-current" />

                            {getStatutLabel(
                              jury.statut,
                            )}

                          </span>

                        </td>

                        {/* MEMBRES */}

                        <td>

                          <div className="flex items-center gap-2">

                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                              <Users
                                size={15}
                              />
                            </div>

                            <span className="font-bold">
                              {
                                jury.membresCount
                              }
                            </span>

                          </div>

                        </td>

                        {/* EVALUATIONS */}

                        <td>

                          <div className="flex items-center gap-2">

                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <ClipboardCheck
                                size={15}
                              />
                            </div>

                            <span className="font-bold">
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
                            )} whitespace-nowrap`}
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
                              className="btn btn-primary btn-sm cursor-pointer gap-1.5"
                            >
                              Gérer
                              <ChevronRight
                                size={15}
                              />
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
                              className="btn btn-ghost btn-sm cursor-pointer text-error hover:bg-error/10"
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

        </section>

      </div>

      {/* =====================================================
          MODAL
      ===================================================== */}

      {modalOpen && (
        <dialog
          open
          className="modal modal-open"
        >

          <div className="modal-box max-w-3xl overflow-hidden p-0">

            {/* HEADER MODAL */}

            <div className="relative overflow-hidden bg-gradient-to-br from-primary to-secondary p-6 text-primary-content">

              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />

              <div className="relative flex items-start justify-between gap-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                    {editingJury ? (
                      <Edit3 size={22} />
                    ) : (
                      <Gavel size={22} />
                    )}
                  </div>

                  <div>

                    <h3 className="text-xl font-black">
                      {editingJury
                        ? "Modifier le jury"
                        : "Créer un jury"}
                    </h3>

                    <p className="mt-1 text-sm text-primary-content/70">
                      {editingJury
                        ? "Modifiez les informations de cette délibération."
                        : "Configurez une nouvelle session de jury."}
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(
                      false,
                    );
                    resetForm();
                  }}
                  className="btn btn-circle btn-sm border-0 bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                >
                  <X size={18} />
                </button>

              </div>

            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >

              {/* SESSION */}

              <div>

                <label className="mb-2 block text-sm font-bold">
                  Session de formation
                  <span className="ml-1 text-error">
                    *
                  </span>
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

                <span className="mb-2 text-sm font-bold">
                  Nom du jury
                  <span className="ml-1 text-error">
                    *
                  </span>
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

              {/* DATE / LIEU */}

              <div className="grid gap-4 md:grid-cols-2">

                <label className="form-control">

                  <span className="mb-2 text-sm font-bold">
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

                <label className="form-control">

                  <span className="mb-2 text-sm font-bold">
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

              {/* STATUT / DECISION */}

              <div className="grid gap-4 md:grid-cols-2">

                <div>

                  <label className="mb-2 block text-sm font-bold">
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

                <div>

                  <label className="mb-2 block text-sm font-bold">
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

                <span className="mb-2 text-sm font-bold">
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
                  placeholder="Observations, remarques ou notes de délibération..."
                />

              </label>

              {/* FOOTER */}

              <div className="flex flex-col-reverse gap-2 border-t border-base-300 pt-5 sm:flex-row sm:justify-end">

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
                  ) : editingJury ? (
                    <ShieldCheck
                      size={17}
                    />
                  ) : (
                    <Plus size={17} />
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
              className="cursor-pointer"
            >
              close
            </button>
          </form>

        </dialog>
      )}

    </div>
  );
}