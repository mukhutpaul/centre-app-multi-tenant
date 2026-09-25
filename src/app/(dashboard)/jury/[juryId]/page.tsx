"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import Select from "react-select";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  FileText,
  Gavel,
  Loader2,
  MapPin,
  Plus,
  Save,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { toast } from "sonner";

import {
  createMembreJury,
  deleteMembreJury,
  getEvaluationsJury,
  getJuryInscriptionOptions,
  getMembresJury,
  updateMembreJury,
  createEvaluationJury,
  deleteEvaluationJury,
  updateEvaluationJury,
} from "@/actions/jury-membre-actions";

/* =========================================================
   TYPES
========================================================= */

type RoleMembreJury =
  | "PRESIDENT"
  | "MEMBRE"
  | "OBSERVATEUR";

type DecisionJury =
  | "ADMIS"
  | "ADMIS_SOUS_CONDITION"
  | "AJOURNE"
  | "ECHEC";

type MembreJury = {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  organisme: string | null;
  role: RoleMembreJury;
};

type InscriptionOption = {
  id: string;
  numero: string;
  apprenant: {
    id: string;
    numero: string;
    prenom: string;
    nom: string;
  };
};

type EvaluationJury = {
  id: string;
  juryId: string;
  inscriptionId: string;
  apprenantId: string;
  membreJuryId: string;
  note: number | null;
  decision: DecisionJury | null;
  commentaire: string | null;

  apprenant: {
    id: string;
    numero: string;
    prenom: string;
    nom: string;
  };

  membreJury: {
    id: string;
    prenom: string;
    nom: string;
    role: RoleMembreJury;
  };
};

type SelectOption = {
  value: string;
  label: string;
};

/* =========================================================
   CONSTANTES
========================================================= */

const ROLE_OPTIONS: {
  value: RoleMembreJury;
  label: string;
}[] = [
  {
    value: "PRESIDENT",
    label: "Président",
  },
  {
    value: "MEMBRE",
    label: "Membre",
  },
  {
    value: "OBSERVATEUR",
    label: "Observateur",
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

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getInitials(
  prenom?: string,
  nom?: string,
) {
  return `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase();
}

function getRoleLabel(role: RoleMembreJury) {
  return (
    ROLE_OPTIONS.find(
      (item) => item.value === role,
    )?.label ?? role
  );
}

function getDecisionLabel(
  decision: DecisionJury | null,
) {
  if (!decision) return "Non déterminée";

  return (
    DECISION_OPTIONS.find(
      (item) => item.value === decision,
    )?.label ?? decision
  );
}

function decisionBadge(
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
   COMPOSANT
========================================================= */

export default function JuryDetailPage() {
  const params = useParams();
  const router = useRouter();

  const juryId = String(params.juryId);

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [activeTab, setActiveTab] =
    useState<
      "informations" | "membres" | "evaluations"
    >("informations");

  const [membres, setMembres] =
    useState<MembreJury[]>([]);

  const [
    inscriptions,
    setInscriptions,
  ] = useState<InscriptionOption[]>([]);

  const [
    evaluations,
    setEvaluations,
  ] = useState<EvaluationJury[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    search,
    setSearch,
  ] = useState("");

  /* =======================================================
     MODAL MEMBRE
  ======================================================= */

  const [
    membreModalOpen,
    setMembreModalOpen,
  ] = useState(false);

  const [
    editingMembre,
    setEditingMembre,
  ] = useState<MembreJury | null>(null);

  const [
    prenom,
    setPrenom,
  ] = useState("");

  const [
    nom,
    setNom,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    telephone,
    setTelephone,
  ] = useState("");

  const [
    organisme,
    setOrganisme,
  ] = useState("");

  const [
    role,
    setRole,
  ] = useState<RoleMembreJury>("MEMBRE");

  /* =======================================================
     MODAL EVALUATION
  ======================================================= */

  const [
    evaluationModalOpen,
    setEvaluationModalOpen,
  ] = useState(false);

  const [
    editingEvaluation,
    setEditingEvaluation,
  ] = useState<EvaluationJury | null>(null);

  const [
    inscriptionId,
    setInscriptionId,
  ] = useState("");

  const [
    membreJuryId,
    setMembreJuryId,
  ] = useState("");

  const [
    note,
    setNote,
  ] = useState("");

  const [
    decision,
    setDecision,
  ] = useState<
    DecisionJury | ""
  >("");

  const [
    commentaire,
    setCommentaire,
  ] = useState("");

  /* =======================================================
     CHARGEMENT
  ======================================================= */

  async function loadData() {
    try {
      setLoading(true);

      const [
        membresResponse,
        inscriptionsResponse,
        evaluationsResponse,
      ] = await Promise.all([
        getMembresJury(juryId),
        getJuryInscriptionOptions(juryId),
        getEvaluationsJury(juryId),
      ]);

      if (
        membresResponse?.success
      ) {
        setMembres(
          membresResponse.data ?? [],
        );
      } else {
        throw new Error(
          membresResponse?.message ??
            "Impossible de charger les membres.",
        );
      }

      if (
        inscriptionsResponse?.success
      ) {
        setInscriptions(
          inscriptionsResponse.data ?? [],
        );
      }

      if (
        evaluationsResponse?.success
      ) {
        setEvaluations(
          evaluationsResponse.data ?? [],
        );
      }
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de charger les données du jury.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (juryId) {
      loadData();
    }
  }, [juryId]);

  /* =======================================================
     OPTIONS REACT SELECT
  ======================================================= */

  const membreOptions =
    useMemo<SelectOption[]>(
      () =>
        membres.map((membre) => ({
          value: membre.id,
          label: `${membre.prenom} ${membre.nom} — ${getRoleLabel(
            membre.role,
          )}`,
        })),
      [membres],
    );

  const inscriptionOptions =
    useMemo<SelectOption[]>(
      () =>
        inscriptions.map(
          (inscription) => ({
            value: inscription.id,
            label: `${inscription.apprenant.prenom} ${inscription.apprenant.nom} — ${inscription.numero}`,
          }),
        ),
      [inscriptions],
    );

  /* =======================================================
     FILTRE EVALUATIONS
  ======================================================= */

  const filteredEvaluations =
    useMemo(() => {
      const value =
        search.trim().toLowerCase();

      if (!value) {
        return evaluations;
      }

      return evaluations.filter(
        (evaluation) => {
          const apprenant =
            `${evaluation.apprenant.prenom} ${evaluation.apprenant.nom}`;

          const membre =
            `${evaluation.membreJury.prenom} ${evaluation.membreJury.nom}`;

          return (
            apprenant
              .toLowerCase()
              .includes(value) ||
            membre
              .toLowerCase()
              .includes(value)
          );
        },
      );
    }, [evaluations, search]);

  /* =======================================================
     RESET MEMBRE
  ======================================================= */

  function resetMembreForm() {
    setEditingMembre(null);
    setPrenom("");
    setNom("");
    setEmail("");
    setTelephone("");
    setOrganisme("");
    setRole("MEMBRE");
  }

  /* =======================================================
     OUVRIR EDIT MEMBRE
  ======================================================= */

  function openEditMembre(
    membre: MembreJury,
  ) {
    setEditingMembre(membre);
    setPrenom(membre.prenom);
    setNom(membre.nom);
    setEmail(membre.email ?? "");
    setTelephone(
      membre.telephone ?? "",
    );
    setOrganisme(
      membre.organisme ?? "",
    );
    setRole(membre.role);

    setMembreModalOpen(true);
  }

  /* =======================================================
     ENREGISTRER MEMBRE
  ======================================================= */

  function submitMembre(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!prenom.trim()) {
      toast.error(
        "Le prénom est obligatoire.",
      );
      return;
    }

    if (!nom.trim()) {
      toast.error(
        "Le nom est obligatoire.",
      );
      return;
    }

    startTransition(async () => {
      try {
        const response =
          editingMembre
            ? await updateMembreJury(
                editingMembre.id,
                {
                  prenom: prenom.trim(),
                  nom: nom.trim(),
                  email:
                    email.trim() || null,
                  telephone:
                    telephone.trim() ||
                    null,
                  organisme:
                    organisme.trim() ||
                    null,
                  role,
                },
              )
            : await createMembreJury(
                juryId,
                {
                  prenom: prenom.trim(),
                  nom: nom.trim(),
                  email:
                    email.trim() || null,
                  telephone:
                    telephone.trim() ||
                    null,
                  organisme:
                    organisme.trim() ||
                    null,
                  role,
                },
              );

        if (!response?.success) {
          throw new Error(
            response?.message ??
              "Opération impossible.",
          );
        }

        toast.success(
          response.message ??
            "Membre enregistré.",
        );

        setMembreModalOpen(false);
        resetMembreForm();

        await loadData();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer le membre.",
        );
      }
    });
  }

  /* =======================================================
     SUPPRIMER MEMBRE
  ======================================================= */

  async function handleDeleteMembre(
    membre: MembreJury,
  ) {
    const result =
      await Swal.fire({
        title: "Supprimer ce membre ?",
        text: `${membre.prenom} ${membre.nom} sera retiré du jury.`,
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
          await deleteMembreJury(
            membre.id,
          );

        if (!response?.success) {
          throw new Error(
            response?.message ??
              "Suppression impossible.",
          );
        }

        toast.success(
          "Membre supprimé.",
        );

        await loadData();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de supprimer le membre.",
        );
      }
    });
  }

  /* =======================================================
     RESET EVALUATION
  ======================================================= */

  function resetEvaluationForm() {
    setEditingEvaluation(null);
    setInscriptionId("");
    setMembreJuryId("");
    setNote("");
    setDecision("");
    setCommentaire("");
  }

  /* =======================================================
     EDIT EVALUATION
  ======================================================= */

  function openEditEvaluation(
    evaluation: EvaluationJury,
  ) {
    setEditingEvaluation(
      evaluation,
    );

    setInscriptionId(
      evaluation.inscriptionId,
    );

    setMembreJuryId(
      evaluation.membreJuryId,
    );

    setNote(
      evaluation.note === null
        ? ""
        : String(evaluation.note),
    );

    setDecision(
      evaluation.decision ?? "",
    );

    setCommentaire(
      evaluation.commentaire ?? "",
    );

    setEvaluationModalOpen(true);
  }

  /* =======================================================
     ENREGISTRER EVALUATION
  ======================================================= */

  function submitEvaluation(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!inscriptionId) {
      toast.error(
        "Sélectionnez un apprenant.",
      );
      return;
    }

    if (!membreJuryId) {
      toast.error(
        "Sélectionnez un membre du jury.",
      );
      return;
    }

    if (note !== "") {
      const numericNote =
        Number(note);

      if (
        !Number.isFinite(
          numericNote,
        ) ||
        numericNote < 0 ||
        numericNote > 100
      ) {
        toast.error(
          "La note doit être comprise entre 0 et 100.",
        );
        return;
      }
    }

    startTransition(async () => {
      try {
        const response =
          editingEvaluation
            ? await updateEvaluationJury(
                editingEvaluation.id,
                {
                  inscriptionId,
                  apprenantId:
                    inscriptions.find(
                      (item) =>
                        item.id ===
                        inscriptionId,
                    )?.apprenant.id ?? "",
                  membreJuryId,
                  note:
                    note === ""
                      ? null
                      : Number(note),
                  decision:
                    decision || null,
                  commentaire:
                    commentaire.trim() ||
                    null,
                },
              )
            : await createEvaluationJury({
                juryId,
                inscriptionId,
                apprenantId:
                  inscriptions.find(
                    (item) =>
                      item.id ===
                      inscriptionId,
                  )?.apprenant.id ?? "",
                membreJuryId,
                note:
                  note === ""
                    ? null
                    : Number(note),
                decision:
                  decision || null,
                commentaire:
                  commentaire.trim() ||
                  null,
              });

        if (!response?.success) {
          throw new Error(
            response?.message ??
              "Impossible d'enregistrer l'évaluation.",
          );
        }

        toast.success(
          response.message ??
            "Évaluation enregistrée.",
        );

        setEvaluationModalOpen(
          false,
        );

        resetEvaluationForm();

        await loadData();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer l'évaluation.",
        );
      }
    });
  }

  /* =======================================================
     SUPPRIMER EVALUATION
  ======================================================= */

  async function handleDeleteEvaluation(
    evaluation: EvaluationJury,
  ) {
    const result =
      await Swal.fire({
        title:
          "Supprimer cette évaluation ?",
        text: "Cette opération est irréversible.",
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
          await deleteEvaluationJury(
            evaluation.id,
          );

        if (!response?.success) {
          throw new Error(
            response?.message ??
              "Suppression impossible.",
          );
        }

        toast.success(
          "Évaluation supprimée.",
        );

        await loadData();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de supprimer l'évaluation.",
        );
      }
    });
  }

  /* =======================================================
     STATISTIQUES
  ======================================================= */

  const nombreAdmis =
    evaluations.filter(
      (item) =>
        item.decision === "ADMIS",
    ).length;

  const nombreEchecs =
    evaluations.filter(
      (item) =>
        item.decision === "ECHEC",
    ).length;

  const notes = evaluations
    .map((item) =>
      item.note === null
        ? null
        : Number(item.note),
    )
    .filter(
      (
        item,
      ): item is number =>
        item !== null &&
        Number.isFinite(item),
    );

  const moyenne =
    notes.length > 0
      ? notes.reduce(
          (sum, value) =>
            sum + value,
          0,
        ) / notes.length
      : 0;

  /* =======================================================
     RENDER
  ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="animate-spin text-primary"
            size={40}
          />
          <p className="text-sm opacity-60">
            Chargement du jury...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 p-4 md:p-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mx-auto max-w-7xl">

        <div className="mb-6">

          <Link
            href="/jury"
            className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-base-content/60 hover:text-primary"
          >
            <ArrowLeft size={17} />
            Retour aux jurys
          </Link>

          <div className="rounded-3xl bg-gradient-to-r from-primary to-secondary p-6 text-primary-content shadow-xl">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                  <Gavel size={30} />
                </div>

                <div>
                  <p className="text-sm opacity-80">
                    Gestion du jury
                  </p>

                  <h1 className="text-2xl font-black md:text-3xl">
                    Jury de délibération
                  </h1>

                  <p className="mt-1 text-sm opacity-80">
                    Membres, évaluations et décisions
                  </p>
                </div>

              </div>

              <div className="flex flex-wrap gap-2">

                <button
                  type="button"
                  onClick={() => {
                    resetMembreForm();
                    setMembreModalOpen(
                      true,
                    );
                  }}
                  className="btn btn-sm cursor-pointer border-0 bg-white text-primary hover:bg-white/90"
                >
                  <UserPlus size={16} />
                  Ajouter un membre
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetEvaluationForm();
                    setEvaluationModalOpen(
                      true,
                    );
                  }}
                  className="btn btn-sm cursor-pointer border-0 bg-white/15 text-white hover:bg-white/25"
                >
                  <Plus size={16} />
                  Évaluer
                </button>

              </div>

            </div>

          </div>

        </div>

        {/* ===================================================
            STATISTIQUES
        =================================================== */}

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">

          <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-60">
                  Membres
                </p>

                <p className="mt-1 text-2xl font-black">
                  {membres.length}
                </p>
              </div>

              <Users className="text-primary" />
            </div>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-60">
                  Évaluations
                </p>

                <p className="mt-1 text-2xl font-black">
                  {evaluations.length}
                </p>
              </div>

              <ClipboardCheck className="text-secondary" />
            </div>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-60">
                  Moyenne
                </p>

                <p className="mt-1 text-2xl font-black">
                  {moyenne.toFixed(2)}
                  <span className="text-sm font-medium opacity-50">
                    %
                  </span>
                </p>
              </div>

              <Award className="text-warning" />
            </div>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-60">
                  Admis
                </p>

                <p className="mt-1 text-2xl font-black">
                  {nombreAdmis}
                </p>

                <p className="text-xs opacity-50">
                  Échecs : {nombreEchecs}
                </p>
              </div>

              <CheckCircle2 className="text-success" />
            </div>
          </div>

        </div>

        {/* ===================================================
            TABS
        =================================================== */}

        <div className="mb-6 overflow-x-auto rounded-2xl border border-base-300 bg-base-100 shadow-sm">

          <div className="flex min-w-max">

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "informations",
                )
              }
              className={`cursor-pointer px-5 py-4 text-sm font-semibold transition ${
                activeTab ===
                "informations"
                  ? "border-b-2 border-primary text-primary"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              Informations
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "membres",
                )
              }
              className={`cursor-pointer px-5 py-4 text-sm font-semibold transition ${
                activeTab === "membres"
                  ? "border-b-2 border-primary text-primary"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              Membres
              <span className="badge badge-sm ml-2">
                {membres.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "evaluations",
                )
              }
              className={`cursor-pointer px-5 py-4 text-sm font-semibold transition ${
                activeTab ===
                "evaluations"
                  ? "border-b-2 border-primary text-primary"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              Évaluations
              <span className="badge badge-sm ml-2">
                {evaluations.length}
              </span>
            </button>

          </div>

        </div>

        {/* ===================================================
            INFORMATIONS
        =================================================== */}

        {activeTab ===
          "informations" && (
          <div className="grid gap-6 lg:grid-cols-2">

            <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">

              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-3 text-primary">
                  <Gavel size={21} />
                </div>

                <div>
                  <h2 className="font-bold">
                    Informations du jury
                  </h2>

                  <p className="text-xs opacity-60">
                    Configuration générale
                  </p>
                </div>
              </div>

              <div className="space-y-4">

                <div>
                  <p className="text-xs opacity-50">
                    Nom du jury
                  </p>

                  <p className="font-semibold">
                    Jury de délibération
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <div className="rounded-xl bg-base-200 p-4">
                    <div className="flex items-center gap-2 text-sm opacity-60">
                      <Users size={16} />
                      Membres
                    </div>

                    <p className="mt-1 text-xl font-black">
                      {membres.length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-base-200 p-4">
                    <div className="flex items-center gap-2 text-sm opacity-60">
                      <ClipboardCheck size={16} />
                      Évaluations
                    </div>

                    <p className="mt-1 text-xl font-black">
                      {evaluations.length}
                    </p>
                  </div>

                </div>

              </div>

            </div>

            <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">

              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-secondary/10 p-3 text-secondary">
                  <FileText size={21} />
                </div>

                <div>
                  <h2 className="font-bold">
                    Délibération
                  </h2>

                  <p className="text-xs opacity-60">
                    Synthèse des résultats
                  </p>
                </div>
              </div>

              <div className="space-y-3">

                <div className="flex items-center justify-between rounded-xl bg-success/10 p-4">
                  <span className="font-medium">
                    Admis
                  </span>

                  <span className="badge badge-success">
                    {nombreAdmis}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-error/10 p-4">
                  <span className="font-medium">
                    Échecs
                  </span>

                  <span className="badge badge-error">
                    {nombreEchecs}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-primary/10 p-4">
                  <span className="font-medium">
                    Moyenne générale
                  </span>

                  <span className="font-black text-primary">
                    {moyenne.toFixed(2)} %
                  </span>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ===================================================
            MEMBRES
        =================================================== */}

        {activeTab ===
          "membres" && (
          <div className="rounded-2xl border border-base-300 bg-base-100 shadow-sm">

            <div className="flex flex-col gap-4 border-b border-base-300 p-5 md:flex-row md:items-center md:justify-between">

              <div>
                <h2 className="font-bold">
                  Membres du jury
                </h2>

                <p className="text-sm opacity-60">
                  Les personnes participant à la délibération.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetMembreForm();
                  setMembreModalOpen(
                    true,
                  );
                }}
                className="btn btn-primary btn-sm cursor-pointer"
              >
                <UserPlus size={16} />
                Ajouter
              </button>

            </div>

            <div className="overflow-x-auto">

              <table className="table">

                <thead>
                  <tr>
                    <th>Membre</th>
                    <th>Rôle</th>
                    <th>Organisme</th>
                    <th>Contact</th>
                    <th className="text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {membres.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-16 text-center"
                      >
                        <Users
                          size={42}
                          className="mx-auto opacity-30"
                        />

                        <p className="mt-3 font-semibold">
                          Aucun membre
                        </p>

                        <p className="text-sm opacity-60">
                          Ajoutez les membres du jury.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    membres.map(
                      (membre) => (
                        <tr
                          key={
                            membre.id
                          }
                        >
                          <td>
                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-content">
                                {getInitials(
                                  membre.prenom,
                                  membre.nom,
                                )}
                              </div>

                              <div>
                                <p className="font-semibold">
                                  {
                                    membre.prenom
                                  }{" "}
                                  {
                                    membre.nom
                                  }
                                </p>

                                <p className="text-xs opacity-50">
                                  {membre.email ??
                                    "Aucun email"}
                                </p>
                              </div>

                            </div>
                          </td>

                          <td>
                            <span className="badge badge-outline">
                              {getRoleLabel(
                                membre.role,
                              )}
                            </span>
                          </td>

                          <td>
                            {membre.organisme ??
                              "—"}
                          </td>

                          <td>
                            {membre.telephone ??
                              "—"}
                          </td>

                          <td>
                            <div className="flex justify-end gap-1">

                              <button
                                type="button"
                                onClick={() =>
                                  openEditMembre(
                                    membre,
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
                                  handleDeleteMembre(
                                    membre,
                                  )
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
        )}

        {/* ===================================================
            EVALUATIONS
        =================================================== */}

        {activeTab ===
          "evaluations" && (
          <div className="rounded-2xl border border-base-300 bg-base-100 shadow-sm">

            <div className="flex flex-col gap-4 border-b border-base-300 p-5 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <h2 className="font-bold">
                  Évaluations du jury
                </h2>

                <p className="text-sm opacity-60">
                  Notes attribuées par les membres du jury.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">

                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40"
                  />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Rechercher..."
                    className="input input-bordered w-full pl-9 sm:w-64"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    resetEvaluationForm();
                    setEvaluationModalOpen(
                      true,
                    );
                  }}
                  className="btn btn-primary cursor-pointer"
                >
                  <Plus size={17} />
                  Nouvelle évaluation
                </button>

              </div>

            </div>

            <div className="overflow-x-auto">

              <table className="table">

                <thead>
                  <tr>
                    <th>Apprenant</th>
                    <th>Membre du jury</th>
                    <th>Note / 100</th>
                    <th>Décision</th>
                    <th>Commentaire</th>
                    <th className="text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {filteredEvaluations.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-16 text-center"
                      >
                        <ClipboardCheck
                          size={42}
                          className="mx-auto opacity-30"
                        />

                        <p className="mt-3 font-semibold">
                          Aucune évaluation
                        </p>

                        <p className="text-sm opacity-60">
                          Aucune évaluation ne correspond à votre recherche.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredEvaluations.map(
                      (evaluation) => (
                        <tr
                          key={
                            evaluation.id
                          }
                        >

                          <td>
                            <div>
                              <p className="font-semibold">
                                {
                                  evaluation
                                    .apprenant
                                    .prenom
                                }{" "}
                                {
                                  evaluation
                                    .apprenant
                                    .nom
                                }
                              </p>

                              <p className="text-xs opacity-50">
                                {
                                  evaluation
                                    .apprenant
                                    .numero
                                }
                              </p>
                            </div>
                          </td>

                          <td>
                            <div>
                              <p className="font-medium">
                                {
                                  evaluation
                                    .membreJury
                                    .prenom
                                }{" "}
                                {
                                  evaluation
                                    .membreJury
                                    .nom
                                }
                              </p>

                              <p className="text-xs opacity-50">
                                {getRoleLabel(
                                  evaluation
                                    .membreJury
                                    .role,
                                )}
                              </p>
                            </div>
                          </td>

                          <td>
                            <span className="font-black">
                              {evaluation.note ??
                                "—"}
                            </span>

                            {evaluation.note !==
                              null && (
                              <span className="ml-1 text-xs opacity-50">
                                / 100
                              </span>
                            )}
                          </td>

                          <td>
                            <span
                              className={`badge ${decisionBadge(
                                evaluation.decision,
                              )}`}
                            >
                              {getDecisionLabel(
                                evaluation.decision,
                              )}
                            </span>
                          </td>

                          <td className="max-w-xs">
                            <span className="line-clamp-2 text-sm opacity-70">
                              {evaluation.commentaire ??
                                "—"}
                            </span>
                          </td>

                          <td>
                            <div className="flex justify-end gap-1">

                              <button
                                type="button"
                                onClick={() =>
                                  openEditEvaluation(
                                    evaluation,
                                  )
                                }
                                className="btn btn-ghost btn-sm cursor-pointer"
                              >
                                <Edit3
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteEvaluation(
                                    evaluation,
                                  )
                                }
                                className="btn btn-ghost btn-sm cursor-pointer text-error"
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
        )}

      </div>

      {/* =====================================================
          MODAL MEMBRE
      ===================================================== */}

      {membreModalOpen && (
        <dialog
          open
          className="modal modal-open"
        >
          <div className="modal-box max-w-2xl">

            <div className="mb-6 flex items-center justify-between">

              <div>
                <h3 className="text-xl font-black">
                  {editingMembre
                    ? "Modifier le membre"
                    : "Ajouter un membre"}
                </h3>

                <p className="text-sm opacity-60">
                  Informations du membre du jury
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMembreModalOpen(
                    false,
                  );
                  resetMembreForm();
                }}
                className="btn btn-circle btn-ghost cursor-pointer"
              >
                <X size={18} />
              </button>

            </div>

            <form
              onSubmit={submitMembre}
              className="space-y-5"
            >

              <div className="grid gap-4 sm:grid-cols-2">

                <label className="form-control">
                  <span className="label-text mb-2 font-semibold">
                    Prénom *
                  </span>

                  <input
                    value={prenom}
                    onChange={(event) =>
                      setPrenom(
                        event.target.value,
                      )
                    }
                    className="input input-bordered w-full"
                    placeholder="Jean"
                  />
                </label>

                <label className="form-control">
                  <span className="label-text mb-2 font-semibold">
                    Nom *
                  </span>

                  <input
                    value={nom}
                    onChange={(event) =>
                      setNom(
                        event.target.value,
                      )
                    }
                    className="input input-bordered w-full"
                    placeholder="MUKHUT"
                  />
                </label>

              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <label className="form-control">
                  <span className="label-text mb-2 font-semibold">
                    Email
                  </span>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value,
                      )
                    }
                    className="input input-bordered w-full"
                    placeholder="email@example.com"
                  />
                </label>

                <label className="form-control">
                  <span className="label-text mb-2 font-semibold">
                    Téléphone
                  </span>

                  <input
                    value={telephone}
                    onChange={(event) =>
                      setTelephone(
                        event.target.value,
                      )
                    }
                    className="input input-bordered w-full"
                    placeholder="+243 ..."
                  />
                </label>

              </div>

              <label className="form-control">
                <span className="label-text mb-2 font-semibold">
                  Organisme
                </span>

                <input
                  value={organisme}
                  onChange={(event) =>
                    setOrganisme(
                      event.target.value,
                    )
                  }
                  className="input input-bordered w-full"
                  placeholder="Université, entreprise..."
                />
              </label>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Rôle *
                </label>

                <Select
                  options={ROLE_OPTIONS}
                  value={ROLE_OPTIONS.find(
                    (item) =>
                      item.value ===
                      role,
                  )}
                  onChange={(option) =>
                    setRole(
                      option?.value ??
                        "MEMBRE",
                    )
                  }
                  isSearchable={false}
                  classNamePrefix="react-select"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-base-300 pt-5">

                <button
                  type="button"
                  onClick={() => {
                    setMembreModalOpen(
                      false,
                    );
                    resetMembreForm();
                  }}
                  className="btn btn-ghost cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-primary cursor-pointer"
                >
                  {isPending ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={17} />
                  )}

                  Enregistrer
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
                setMembreModalOpen(
                  false,
                );
                resetMembreForm();
              }}
            >
              close
            </button>
          </form>
        </dialog>
      )}

      {/* =====================================================
          MODAL EVALUATION
      ===================================================== */}

      {evaluationModalOpen && (
        <dialog
          open
          className="modal modal-open"
        >
          <div className="modal-box max-w-2xl">

            <div className="mb-6 flex items-center justify-between">

              <div>
                <h3 className="text-xl font-black">
                  {editingEvaluation
                    ? "Modifier l'évaluation"
                    : "Nouvelle évaluation"}
                </h3>

                <p className="text-sm opacity-60">
                  Note du membre du jury sur 100.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEvaluationModalOpen(
                    false,
                  );
                  resetEvaluationForm();
                }}
                className="btn btn-circle btn-ghost cursor-pointer"
              >
                <X size={18} />
              </button>

            </div>

            <form
              onSubmit={
                submitEvaluation
              }
              className="space-y-5"
            >

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Apprenant *
                </label>

                <Select
                  options={
                    inscriptionOptions
                  }
                  value={
                    inscriptionOptions.find(
                      (option) =>
                        option.value ===
                        inscriptionId,
                    ) ?? null
                  }
                  onChange={(option) =>
                    setInscriptionId(
                      option?.value ?? "",
                    )
                  }
                  placeholder="Sélectionner un apprenant..."
                  isSearchable
                  classNamePrefix="react-select"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Membre du jury *
                </label>

                <Select
                  options={membreOptions}
                  value={
                    membreOptions.find(
                      (option) =>
                        option.value ===
                        membreJuryId,
                    ) ?? null
                  }
                  onChange={(option) =>
                    setMembreJuryId(
                      option?.value ?? "",
                    )
                  }
                  placeholder="Sélectionner un membre..."
                  isSearchable
                  classNamePrefix="react-select"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <label className="form-control">
                  <span className="label-text mb-2 font-semibold">
                    Note / 100
                  </span>

                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={note}
                    onChange={(event) =>
                      setNote(
                        event.target.value,
                      )
                    }
                    className="input input-bordered w-full"
                    placeholder="0 à 100"
                  />
                </label>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Décision
                  </label>

                  <Select
                    options={
                      DECISION_OPTIONS
                    }
                    value={
                      DECISION_OPTIONS.find(
                        (option) =>
                          option.value ===
                          decision,
                      ) ?? null
                    }
                    onChange={(option) =>
                      setDecision(
                        option?.value ??
                          "",
                      )
                    }
                    placeholder="Sélectionner..."
                    isSearchable={false}
                    classNamePrefix="react-select"
                  />
                </div>

              </div>

              <label className="form-control">
                <span className="label-text mb-2 font-semibold">
                  Commentaire
                </span>

                <textarea
                  value={commentaire}
                  onChange={(event) =>
                    setCommentaire(
                      event.target.value,
                    )
                  }
                  className="textarea textarea-bordered min-h-28 w-full"
                  placeholder="Observation du membre du jury..."
                />
              </label>

              <div className="rounded-xl bg-info/10 p-4 text-sm">

                <div className="flex gap-3">

                  <ClipboardCheck
                    size={20}
                    className="mt-0.5 shrink-0 text-info"
                  />

                  <div>
                    <p className="font-semibold">
                      Échelle de notation
                    </p>

                    <p className="mt-1 opacity-70">
                      La note du jury est enregistrée
                      directement sur une base de
                      <strong> 100 %</strong>.
                    </p>
                  </div>

                </div>

              </div>

              <div className="flex justify-end gap-2 border-t border-base-300 pt-5">

                <button
                  type="button"
                  onClick={() => {
                    setEvaluationModalOpen(
                      false,
                    );
                    resetEvaluationForm();
                  }}
                  className="btn btn-ghost cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-primary cursor-pointer"
                >
                  {isPending ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={17} />
                  )}

                  Enregistrer
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
                setEvaluationModalOpen(
                  false,
                );
                resetEvaluationForm();
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