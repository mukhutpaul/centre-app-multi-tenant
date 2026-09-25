"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Edit3,
  FileText,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Target,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import Select, {
  type SingleValue,
  type StylesConfig,
} from "react-select";

import Swal from "sweetalert2";
import { toast } from "sonner";

import {
  createEvaluation,
  createModeleEvaluation,
  deleteEvaluation,
  getEvaluationOptions,
  getEvaluations,
  updateEvaluation,
  validerEvaluation,
} from "@/actions/evaluation-actions";

/* ============================================================
   TYPES
============================================================ */

type Row = {
  id: string;

  inscriptionId: string;
  moduleSessionId: string;
  modeleId?: string | null;
  evaluateurId?: string | null;
  apprenantId?: string | null;

  note: number;
  noteMaximale: number;
  pourcentage?: number | null;

  statut?: string | null;
  resultat?: string | null;
  commentaire?: string | null;

  dateEvaluation?: string | Date | null;

  apprenant?: string | null;

  inscription?: {
    numero?: string | null;
  } | null;

  moduleSession?: {
    module?: string | null;
    formation?: string | null;
    session?: string | null;
  } | null;

  evaluateur?: string | null;
};

type Options = Awaited<
  ReturnType<typeof getEvaluationOptions>
>;

type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

type ModelForm = {
  nom: string;
  description: string;
  noteMaximale: string;
  notePassage: string;
  coefficient: string;
  actif: boolean;
};

/* ============================================================
   FORMULAIRE INITIAL
============================================================ */

function createEmptyForm() {
  return {
    id: "",
    inscriptionId: "",
    moduleSessionId: "",
    modeleId: "",
    evaluateurId: "",
    apprenantId: "",
    note: "",
    noteMaximale: "20",
    statut: "BROUILLON",
    commentaire: "",
    dateEvaluation: new Date()
      .toISOString()
      .slice(0, 10),
  };
}

function createEmptyModelForm(): ModelForm {
  return {
    nom: "",
    description: "",
    noteMaximale: "20",
    notePassage: "10",
    coefficient: "1",
    actif: true,
  };
}

/* ============================================================
   UTILITAIRES
============================================================ */

function formatDate(
  value: string | Date | null | undefined,
) {
  if (!value) {
    return "—";
  }

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat("fr-FR").format(
      date,
    );
  } catch {
    return "—";
  }
}

function percent(value: number) {
  if (!Number.isFinite(value)) {
    return "0,00 %";
  }

  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`;
}

function calculatePercentage(
  note: number,
  maximum: number,
) {
  if (
    !Number.isFinite(note) ||
    !Number.isFinite(maximum) ||
    maximum <= 0
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      (note / maximum) * 100,
    ),
  );
}

function getResultBadge(
  resultat?: string | null,
) {
  switch (resultat) {
    case "REUSSITE":
      return {
        label: "Réussite",
        className:
          "badge badge-success gap-1",
      };

    case "ECHEC":
      return {
        label: "Échec",
        className:
          "badge badge-error gap-1",
      };

    default:
      return {
        label: resultat ?? "Non défini",
        className:
          "badge badge-ghost gap-1",
      };
  }
}

function getStatusBadge(
  statut?: string | null,
) {
  switch (statut) {
    case "VALIDEE":
      return {
        className:
          "badge badge-success",
      };

    case "REJETEE":
      return {
        className:
          "badge badge-error",
      };

    case "SOUMISE":
      return {
        className:
          "badge badge-info",
      };

    default:
      return {
        className:
          "badge badge-warning",
      };
  }
}

/* ============================================================
   REACT SELECT
============================================================ */

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "48px",
    borderRadius: "0.75rem",
    borderColor: state.isFocused
      ? "oklch(var(--p))"
      : "oklch(var(--bc) / 0.15)",
    boxShadow: state.isFocused
      ? "0 0 0 1px oklch(var(--p))"
      : "none",
    backgroundColor:
      "oklch(var(--b1))",
    cursor: "pointer",
    "&:hover": {
      borderColor:
        "oklch(var(--bc) / 0.3)",
    },
  }),

  menu: (base) => ({
    ...base,
    zIndex: 9999,
    borderRadius: "0.75rem",
    overflow: "hidden",
  }),

  option: (base, state) => ({
    ...base,
    cursor: "pointer",
    backgroundColor: state.isSelected
      ? "oklch(var(--p))"
      : state.isFocused
        ? "oklch(var(--b2))"
        : "transparent",
    color: state.isSelected
      ? "oklch(var(--pc))"
      : "inherit",
  }),

  placeholder: (base) => ({
    ...base,
    opacity: 0.55,
  }),

  singleValue: (base) => ({
    ...base,
    color: "inherit",
  }),
};

/* ============================================================
   PAGE
============================================================ */

export default function EvaluationsPage() {
  const [rows, setRows] = useState<Row[]>([]);

  const [options, setOptions] =
    useState<Options | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [creatingModel, setCreatingModel] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [open, setOpen] =
    useState(false);

  const [openModelModal, setOpenModelModal] =
    useState(false);

  const [form, setForm] =
    useState(createEmptyForm());

  const [modelForm, setModelForm] =
    useState(createEmptyModelForm());

  /* ==========================================================
     CHARGEMENT
  ========================================================== */

  const load = useCallback(async () => {
    try {
      setLoading(true);

      /*
       * IMPORTANT
       * --------------------------------------------------------
       * Aucun centreId n'est envoyé.
       *
       * Les Server Actions récupèrent le centre
       * avec requireCentreManager().
       */

      const [
        evaluations,
        evaluationOptions,
      ] = await Promise.all([
        getEvaluations(),
        getEvaluationOptions(),
      ]);

      setRows(
        (evaluations ?? []) as Row[],
      );

      setOptions(
        evaluationOptions ?? null,
      );
    } catch (error) {
      console.error(
        "Erreur chargement évaluations :",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur de chargement des évaluations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* ==========================================================
     RECHERCHE
  ========================================================== */

  const filtered = useMemo(() => {
    const q = search
      .trim()
      .toLowerCase();

    if (!q) {
      return rows;
    }

    return rows.filter((r) =>
      [
        r.apprenant,
        r.moduleSession?.module,
        r.moduleSession?.formation,
        r.moduleSession?.session,
        r.evaluateur,
        r.resultat,
        r.statut,
        r.inscription?.numero,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  /* ==========================================================
     INSCRIPTION
  ========================================================== */

  const selectedInscription =
    options?.inscriptions.find(
      (item) =>
        item.id ===
        form.inscriptionId,
    );

  /* ==========================================================
     MODELE
  ========================================================== */

  const selectedModel =
    options?.modeles.find(
      (item) =>
        item.id ===
        form.modeleId,
    );

  /* ==========================================================
     MODULES DISPONIBLES
  ========================================================== */

  const availableModules =
    useMemo(() => {
      if (!options) {
        return [];
      }

      if (!selectedInscription) {
        return options.modulesSessions;
      }

      return options.modulesSessions.filter(
        (moduleSession) =>
          moduleSession.sessionId ===
          selectedInscription.sessionId,
      );
    }, [
      options,
      selectedInscription,
    ]);

  /* ==========================================================
     OPTIONS REACT SELECT
  ========================================================== */

  const inscriptionOptions =
    useMemo<SelectOption[]>(() => {
      if (!options) {
        return [];
      }

      return options.inscriptions.map(
        (item) => ({
          value: item.id,
          label: `${item.apprenant} — ${item.formation}`,
          description: `${item.session} · ${item.numero}`,
        }),
      );
    }, [options]);

  const moduleOptions =
    useMemo<SelectOption[]>(() => {
      return availableModules.map(
        (item) => ({
          value: item.id,
          label: item.module,
          description: item.session,
        }),
      );
    }, [availableModules]);

  const modelOptions =
    useMemo<SelectOption[]>(() => {
      if (!options) {
        return [];
      }

      return options.modeles
        .filter(
          (item) => item.actif,
        )
        .map((item) => ({
          value: item.id,
          label: item.nom,
          description:
            `Note max : ${item.noteMaximale} · ` +
            `Seuil : ${item.notePassage ?? "-"} · ` +
            `Coef. : ${item.coefficient ?? 1}`,
        }));
    }, [options]);

  const evaluatorOptions =
    useMemo<SelectOption[]>(() => {
      if (!options) {
        return [];
      }

      return options.formateurs.map(
        (item) => ({
          value: item.id,
          label: item.nom,
        }),
      );
    }, [options]);

  /* ==========================================================
     POURCENTAGE
  ========================================================== */

  const currentMax =
    Number(form.noteMaximale) || 0;

  const currentNote =
    Number(form.note) || 0;

  const currentPercent =
    calculatePercentage(
      currentNote,
      currentMax,
    );

  const selectedPassingPercentage =
    selectedModel?.notePassage != null &&
    Number(selectedModel.noteMaximale) > 0
      ? (Number(
          selectedModel.notePassage,
        ) /
          Number(
            selectedModel.noteMaximale,
          )) *
        100
      : null;

  /* ==========================================================
     STATISTIQUES
  ========================================================== */

  const statistics = useMemo(() => {
    const validated = rows.filter(
      (row) =>
        row.statut ===
        "VALIDEE",
    ).length;

    const success = rows.filter(
      (row) =>
        row.resultat ===
        "REUSSITE",
    ).length;

    const average =
      rows.length > 0
        ? rows.reduce(
            (total, row) =>
              total +
              Number(
                row.pourcentage ?? 0,
              ),
            0,
          ) / rows.length
        : 0;

    return {
      total: rows.length,
      validated,
      success,
      average,
    };
  }, [rows]);

  /* ==========================================================
     CREATION
  ========================================================== */

  function openCreate() {
    setForm(createEmptyForm());

    setOpen(true);
  }

  /* ==========================================================
     MODIFICATION
  ========================================================== */

  function openEdit(r: Row) {
    setForm({
      id: r.id ?? "",

      inscriptionId:
        r.inscriptionId ?? "",

      moduleSessionId:
        r.moduleSessionId ?? "",

      modeleId:
        r.modeleId ?? "",

      evaluateurId:
        r.evaluateurId ?? "",

      apprenantId:
        r.apprenantId ?? "",

      note:
        r.note !== null &&
        r.note !== undefined
          ? String(r.note)
          : "",

      noteMaximale:
        r.noteMaximale !== null &&
        r.noteMaximale !== undefined
          ? String(r.noteMaximale)
          : "20",

      statut:
        r.statut ??
        "BROUILLON",

      commentaire:
        r.commentaire ?? "",

      dateEvaluation:
        r.dateEvaluation
          ? new Date(
              r.dateEvaluation,
            )
              .toISOString()
              .slice(0, 10)
          : "",
    });

    setOpen(true);
  }

  /* ==========================================================
     INSCRIPTION
  ========================================================== */

  function onInscriptionChange(
    option: SingleValue<SelectOption>,
  ) {
    const inscriptionId =
      option?.value ?? "";

    const inscription =
      options?.inscriptions.find(
        (item) =>
          item.id ===
          inscriptionId,
      );

    setForm((current) => ({
      ...current,

      inscriptionId,

      apprenantId:
        inscription?.apprenantId ??
        "",

      moduleSessionId: "",
    }));
  }

  /* ==========================================================
     MODULE
  ========================================================== */

  function onModuleChange(
    option: SingleValue<SelectOption>,
  ) {
    setForm((current) => ({
      ...current,

      moduleSessionId:
        option?.value ?? "",
    }));
  }

  /* ==========================================================
     MODELE
  ========================================================== */

  function onModeleChange(
    option: SingleValue<SelectOption>,
  ) {
    const modeleId =
      option?.value ?? "";

    const modele =
      options?.modeles.find(
        (item) =>
          item.id ===
          modeleId,
      );

    setForm((current) => ({
      ...current,

      modeleId,

      noteMaximale: modele
        ? String(
            modele.noteMaximale,
          )
        : current.noteMaximale,
    }));
  }

  /* ==========================================================
     EVALUATEUR
  ========================================================== */

  function onEvaluatorChange(
    option: SingleValue<SelectOption>,
  ) {
    setForm((current) => ({
      ...current,

      evaluateurId:
        option?.value ?? "",
    }));
  }

  /* ==========================================================
     ENREGISTREMENT EVALUATION
  ========================================================== */

  async function save(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    if (!options) {
      toast.error(
        "Les options ne sont pas encore chargées.",
      );

      return;
    }

    if (!form.inscriptionId) {
      toast.error(
        "Veuillez sélectionner une inscription.",
      );

      return;
    }

    if (!form.moduleSessionId) {
      toast.error(
        "Veuillez sélectionner un module.",
      );

      return;
    }

    if (form.note === "") {
      toast.error(
        "Veuillez saisir une note.",
      );

      return;
    }

    const inscription =
      options.inscriptions.find(
        (item) =>
          item.id ===
          form.inscriptionId,
      );

    if (!inscription) {
      toast.error(
        "L'inscription sélectionnée est introuvable.",
      );

      return;
    }

    const apprenantId =
      inscription.apprenantId;

    if (!apprenantId) {
      toast.error(
        "Impossible de déterminer l'apprenant.",
      );

      return;
    }

    const note =
      Number(form.note);

    const noteMaximale =
      Number(form.noteMaximale);

    if (!Number.isFinite(note)) {
      toast.error(
        "La note saisie est invalide.",
      );

      return;
    }

    if (
      !Number.isFinite(
        noteMaximale,
      ) ||
      noteMaximale <= 0
    ) {
      toast.error(
        "La note maximale est invalide.",
      );

      return;
    }

    if (note < 0) {
      toast.error(
        "La note ne peut pas être négative.",
      );

      return;
    }

    if (
      note > noteMaximale
    ) {
      toast.error(
        `La note ne peut pas dépasser ${noteMaximale}.`,
      );

      return;
    }

    const moduleSession =
      options.modulesSessions.find(
        (item) =>
          item.id ===
          form.moduleSessionId,
      );

    if (!moduleSession) {
      toast.error(
        "Le module sélectionné est introuvable.",
      );

      return;
    }

    if (
      moduleSession.sessionId !==
      inscription.sessionId
    ) {
      toast.error(
        "Le module ne correspond pas à la session.",
      );

      return;
    }

    try {
      setSaving(true);

      const payload = {
        inscriptionId:
          form.inscriptionId,

        moduleSessionId:
          form.moduleSessionId,

        modeleId:
          form.modeleId ||
          null,

        evaluateurId:
          form.evaluateurId ||
          null,

        apprenantId,

        note,

        noteMaximale,

        statut:
          form.statut as any,

        commentaire:
          form.commentaire.trim() ||
          null,

        dateEvaluation:
          form.dateEvaluation ||
          null,
      };

      if (form.id) {
        const response =
          await updateEvaluation({
            id: form.id,
            ...payload,
          });

        if (!response?.success) {
          throw new Error(
            response?.message ??
              "Impossible de modifier l'évaluation.",
          );
        }

        toast.success(
          "Évaluation modifiée avec succès.",
        );
      } else {
        const response =
          await createEvaluation(
            payload,
          );

        if (!response?.success) {
          throw new Error(
            response?.message ??
              "Impossible de créer l'évaluation.",
          );
        }

        toast.success(
          "Évaluation créée avec succès.",
        );
      }

      setOpen(false);
      setForm(createEmptyForm());

      await load();
    } catch (error) {
      console.error(
        "SAVE EVALUATION:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'enregistrement.",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
     CREATION MODELE
  ========================================================== */

  async function saveModel(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (creatingModel) {
      return;
    }

    const nom =
      modelForm.nom.trim();

    const noteMaximale =
      Number(
        modelForm.noteMaximale,
      );

    const notePassage =
      Number(
        modelForm.notePassage,
      );

    const coefficient =
      Number(
        modelForm.coefficient,
      );

    if (!nom) {
      toast.error(
        "Veuillez saisir le nom du modèle.",
      );

      return;
    }

    if (
      !Number.isFinite(
        noteMaximale,
      ) ||
      noteMaximale <= 0
    ) {
      toast.error(
        "La note maximale doit être supérieure à zéro.",
      );

      return;
    }

    if (
      !Number.isFinite(
        notePassage,
      ) ||
      notePassage < 0 ||
      notePassage > noteMaximale
    ) {
      toast.error(
        `Le seuil doit être compris entre 0 et ${noteMaximale}.`,
      );

      return;
    }

    if (
      !Number.isFinite(
        coefficient,
      ) ||
      coefficient <= 0
    ) {
      toast.error(
        "Le coefficient doit être supérieur à zéro.",
      );

      return;
    }

    try {
      setCreatingModel(true);

      /*
       * Aucun centreId ici.
       *
       * Le Server Action récupère automatiquement
       * le centre courant.
       */

      const response =
        await createModeleEvaluation({
          nom,

          description:
            modelForm.description.trim() ||
            null,

          noteMaximale,

          notePassage,

          coefficient,

          actif:
            modelForm.actif,
        });

      if (!response?.success) {
        throw new Error(
          response?.message ??
            "Impossible de créer le modèle.",
        );
      }

      toast.success(
        "Modèle d'évaluation créé avec succès.",
      );

      setOpenModelModal(false);

      setModelForm(
        createEmptyModelForm(),
      );

      /*
       * Recharge les modèles.
       */
      const [
        evaluations,
        evaluationOptions,
      ] = await Promise.all([
        getEvaluations(),
        getEvaluationOptions(),
      ]);

      setRows(
        (evaluations ?? []) as Row[],
      );

      setOptions(
        evaluationOptions ?? null,
      );

      /*
       * Si le serveur retourne le modèle créé,
       * on le sélectionne automatiquement.
       */
      if (
        response.data?.id
      ) {
        setForm((current) => ({
          ...current,
          modeleId:
            response.data.id,
          noteMaximale:
            String(
              response.data
                .noteMaximale ??
                noteMaximale,
            ),
        }));
      }
    } catch (error) {
      console.error(
        "CREATE MODELE EVALUATION:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de créer le modèle.",
      );
    } finally {
      setCreatingModel(false);
    }
  }

  /* ==========================================================
     SUPPRESSION
  ========================================================== */

  async function remove(
    r: Row,
  ) {
    const confirmation =
      await Swal.fire({
        title:
          "Supprimer l'évaluation ?",

        html:
          `<div class="text-sm">` +
          `<b>${r.apprenant ?? "Apprenant"}</b>` +
          `<br />` +
          `${r.moduleSession?.module ?? "Module"}` +
          `</div>`,

        icon: "warning",

        showCancelButton: true,

        confirmButtonText:
          "Supprimer",

        cancelButtonText:
          "Annuler",

        reverseButtons: true,

        focusCancel: true,
      });

    if (
      !confirmation.isConfirmed
    ) {
      return;
    }

    try {
      const response =
        await deleteEvaluation(
          r.id,
        );

      if (!response?.success) {
        throw new Error(
          response?.message ??
            "Suppression impossible.",
        );
      }

      toast.success(
        "Évaluation supprimée avec succès.",
      );

      await load();
    } catch (error) {
      console.error(
        "DELETE EVALUATION:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Suppression impossible.",
      );
    }
  }

  /* ==========================================================
     VALIDATION
  ========================================================== */

  async function validate(
    r: Row,
  ) {
    const confirmation =
      await Swal.fire({
        title:
          "Valider l'évaluation ?",

        html:
          `Note : <b>${r.note}/${r.noteMaximale}</b>` +
          `<br />` +
          `Résultat : <b>${percent(
            Number(
              r.pourcentage ?? 0,
            ),
          )}</b>`,

        icon: "question",

        showCancelButton: true,

        confirmButtonText:
          "Valider",

        cancelButtonText:
          "Annuler",

        reverseButtons: true,

        focusCancel: true,
      });

    if (
      !confirmation.isConfirmed
    ) {
      return;
    }

    try {
      const response =
        await validerEvaluation(
          r.id,
        );

      if (!response?.success) {
        throw new Error(
          response?.message ??
            "Validation impossible.",
        );
      }

      toast.success(
        "Évaluation validée avec succès.",
      );

      await load();
    } catch (error) {
      console.error(
        "VALIDATE EVALUATION:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Validation impossible.",
      );
    }
  }

  /* ==========================================================
     FERMETURE
  ========================================================== */

  function closeModal() {
    if (saving) {
      return;
    }

    setOpen(false);
    setForm(createEmptyForm());
  }

  function closeModelModal() {
    if (creatingModel) {
      return;
    }

    setOpenModelModal(false);

    setModelForm(
      createEmptyModelForm(),
    );
  }

  /* ==========================================================
     RENDU
  ========================================================== */

  return (
    <main className="min-h-screen bg-base-200/40 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-primary-content shadow-xl">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <GraduationCap
                  size={30}
                />
              </div>

              <div>
                <div className="mb-1 text-sm font-medium opacity-80">
                  Gestion pédagogique
                </div>

                <h1 className="text-2xl font-bold md:text-3xl">
                  Évaluations
                </h1>

                <p className="mt-2 max-w-2xl text-sm opacity-80 md:text-base">
                  Gérez les notes des apprenants,
                  les modèles d'évaluation,
                  les résultats et les validations.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  setOpenModelModal(true)
                }
                className="btn btn-outline border-white/40 text-white hover:border-white hover:bg-white/10 cursor-pointer"
              >
                <Settings2
                  size={18}
                />
                Nouveau modèle
              </button>

              <button
                type="button"
                onClick={openCreate}
                className="btn bg-white text-primary hover:bg-white/90 border-0 cursor-pointer"
              >
                <Plus size={18} />
                Nouvelle évaluation
              </button>
            </div>
          </div>
        </section>

        {/* ====================================================
            STATISTIQUES
        ==================================================== */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border bg-base-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-60">
                  Total évaluations
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {statistics.total}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-base-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-60">
                  Évaluations validées
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {statistics.validated}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
                <CheckCircle2
                  size={22}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-base-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-60">
                  Réussites
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {statistics.success}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/10 text-info">
                <Award size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-base-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-60">
                  Moyenne générale
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {percent(
                    statistics.average,
                  )}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <BarChart3
                  size={22}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            OUTILS
        ==================================================== */}

        <section className="rounded-2xl border bg-base-100 p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Rechercher un apprenant, une formation, un module, une session..."
                className="input input-bordered h-12 w-full pl-11"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="btn btn-ghost btn-sm btn-circle absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                  title="Effacer"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                void load()
              }
              disabled={loading}
              className="btn btn-outline h-12 cursor-pointer"
            >
              <RefreshCw
                size={17}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Actualiser
            </button>
          </div>
        </section>

        {/* ====================================================
            TABLE
        ==================================================== */}

        <section className="overflow-hidden rounded-2xl border bg-base-100 shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-bold">
                Liste des évaluations
              </h2>

              <p className="text-sm opacity-60">
                {filtered.length} résultat
                {filtered.length > 1
                  ? "s"
                  : ""}
              </p>
            </div>

            <div className="hidden items-center gap-2 text-sm opacity-60 md:flex">
              <Target size={16} />
              Résultats exprimés sur 100 %
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Apprenant</th>
                  <th>Formation / Module</th>
                  <th>Note</th>
                  <th>Résultat</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th className="text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-16 text-center"
                    >
                      <Loader2
                        size={30}
                        className="mx-auto animate-spin text-primary"
                      />

                      <p className="mt-3 text-sm opacity-60">
                        Chargement des évaluations...
                      </p>
                    </td>
                  </tr>
                ) : filtered.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-16 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-base-200">
                          <FileText
                            size={28}
                            className="opacity-40"
                          />
                        </div>

                        <h3 className="mt-4 font-semibold">
                          Aucune évaluation
                        </h3>

                        <p className="mt-1 text-sm opacity-60">
                          Commencez par créer une
                          nouvelle évaluation.
                        </p>

                        <button
                          type="button"
                          onClick={
                            openCreate
                          }
                          className="btn btn-primary btn-sm mt-4 cursor-pointer"
                        >
                          <Plus size={16} />
                          Créer une évaluation
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const resultBadge =
                      getResultBadge(
                        r.resultat,
                      );

                    const statusBadge =
                      getStatusBadge(
                        r.statut,
                      );

                    const rowPercentage =
                      Math.max(
                        0,
                        Math.min(
                          100,
                          Number(
                            r.pourcentage ??
                              0,
                          ),
                        ),
                      );

                    return (
                      <tr
                        key={r.id}
                        className="hover"
                      >
                        {/* APPRENANT */}

                        <td>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <UserRound
                                size={18}
                              />
                            </div>

                            <div>
                              <div className="font-semibold">
                                {r.apprenant ??
                                  "—"}
                              </div>

                              <div className="text-xs opacity-50">
                                {
                                  r
                                    .inscription
                                    ?.numero
                                }
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* FORMATION */}

                        <td>
                          <div className="font-medium">
                            {
                              r
                                .moduleSession
                                ?.module
                            }
                          </div>

                          <div className="mt-1 text-xs opacity-50">
                            {
                              r
                                .moduleSession
                                ?.formation
                            }

                            {" · "}

                            {
                              r
                                .moduleSession
                                ?.session
                            }
                          </div>
                        </td>

                        {/* NOTE */}

                        <td>
                          <div className="font-bold">
                            {r.note}
                            {" / "}
                            {
                              r.noteMaximale
                            }
                          </div>

                          <div className="text-xs opacity-50">
                            {
                              percent(
                                rowPercentage,
                              )
                            }
                          </div>
                        </td>

                        {/* RESULTAT */}

                        <td className="min-w-[190px]">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-bold">
                              {percent(
                                rowPercentage,
                              )}
                            </span>

                            <span
                              className={
                                resultBadge.className
                              }
                            >
                              {resultBadge.label}
                            </span>
                          </div>

                          <progress
                            className="progress progress-primary mt-2 h-2 w-full"
                            value={
                              rowPercentage
                            }
                            max="100"
                          />
                        </td>

                        {/* STATUT */}

                        <td>
                          <span
                            className={
                              statusBadge.className
                            }
                          >
                            {r.statut ??
                              "—"}
                          </span>
                        </td>

                        {/* DATE */}

                        <td className="whitespace-nowrap">
                          {formatDate(
                            r.dateEvaluation,
                          )}
                        </td>

                        {/* ACTIONS */}

                        <td>
                          <div className="flex justify-end gap-2">
                            {r.statut !==
                              "VALIDEE" && (
                              <button
                                type="button"
                                onClick={() =>
                                  validate(
                                    r,
                                  )
                                }
                                className="btn btn-sm btn-success btn-outline cursor-pointer"
                                title="Valider"
                              >
                                <CheckCircle2
                                  size={16}
                                />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  r,
                                )
                              }
                              className="btn btn-sm btn-info btn-outline cursor-pointer"
                              title="Modifier"
                            >
                              <Edit3
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                remove(r)
                              }
                              className="btn btn-sm btn-error btn-outline cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2
                                size={16}
                              />
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
        </section>
      </div>

      {/* ======================================================
          MODALE EVALUATION
      ====================================================== */}

      {open && options && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm md:p-6"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-base-100 shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b bg-base-100 px-5 py-4 md:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <GraduationCap
                    size={22}
                  />
                </div>

                <div>
                  <h2 className="text-lg font-bold md:text-xl">
                    {form.id
                      ? "Modifier l'évaluation"
                      : "Nouvelle évaluation"}
                  </h2>

                  <p className="text-xs opacity-60 md:text-sm">
                    Saisissez la note et obtenez
                    automatiquement le résultat sur 100 %.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="btn btn-sm btn-circle btn-ghost cursor-pointer"
              >
                <X size={19} />
              </button>
            </div>

            {/* BODY */}

            <form
              onSubmit={save}
              className="overflow-y-auto"
            >
              <div className="space-y-6 p-5 md:p-7">

                {/* ================================
                    SECTION 1
                ================================= */}

                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookOpen
                        size={17}
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold">
                        Contexte académique
                      </h3>

                      <p className="text-xs opacity-50">
                        Inscription et module évalué
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">

                    {/* INSCRIPTION */}

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Inscription{" "}
                        <span className="text-error">
                          *
                        </span>
                      </label>

                      <Select
                        options={
                          inscriptionOptions
                        }
                        value={
                          inscriptionOptions.find(
                            (item) =>
                              item.value ===
                              form.inscriptionId,
                          ) ??
                          null
                        }
                        onChange={
                          onInscriptionChange
                        }
                        placeholder="Sélectionner une inscription..."
                        isClearable
                        isSearchable
                        styles={
                          selectStyles
                        }
                        noOptionsMessage={() =>
                          "Aucune inscription"
                        }
                      />

                      {selectedInscription && (
                        <div className="mt-2 flex items-center gap-2 text-xs opacity-60">
                          <Users
                            size={13}
                          />

                          {selectedInscription.apprenant}
                          {" · "}
                          {
                            selectedInscription.session
                          }
                        </div>
                      )}
                    </div>

                    {/* MODULE */}

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Module{" "}
                        <span className="text-error">
                          *
                        </span>
                      </label>

                      <Select
                        options={
                          moduleOptions
                        }
                        value={
                          moduleOptions.find(
                            (item) =>
                              item.value ===
                              form.moduleSessionId,
                          ) ??
                          null
                        }
                        onChange={
                          onModuleChange
                        }
                        placeholder="Sélectionner un module..."
                        isClearable
                        isSearchable
                        styles={
                          selectStyles
                        }
                        isDisabled={
                          !form.inscriptionId
                        }
                        noOptionsMessage={() =>
                          "Aucun module pour cette session"
                        }
                      />
                    </div>
                  </div>
                </section>

                {/* ================================
                    SECTION 2
                ================================= */}

                <section className="rounded-2xl border bg-base-200/40 p-4 md:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10 text-info">
                        <Settings2
                          size={17}
                        />
                      </div>

                      <div>
                        <h3 className="font-semibold">
                          Paramètres de l'évaluation
                        </h3>

                        <p className="text-xs opacity-50">
                          Modèle et évaluateur
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setOpenModelModal(
                          true,
                        )
                      }
                      className="btn btn-primary btn-sm cursor-pointer"
                    >
                      <Plus
                        size={15}
                      />

                      Nouveau modèle
                    </button>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">

                    {/* MODELE */}

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Modèle d'évaluation
                      </label>

                      <Select
                        options={
                          modelOptions
                        }
                        value={
                          modelOptions.find(
                            (item) =>
                              item.value ===
                              form.modeleId,
                          ) ??
                          null
                        }
                        onChange={
                          onModeleChange
                        }
                        placeholder="Sélectionner un modèle..."
                        isClearable
                        isSearchable
                        styles={
                          selectStyles
                        }
                        noOptionsMessage={() =>
                          "Aucun modèle actif"
                        }
                      />

                      {selectedModel && (
                        <div className="mt-2 rounded-xl border bg-base-100 p-3">
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div>
                              <div className="opacity-50">
                                Maximum
                              </div>

                              <b>
                                {
                                  selectedModel.noteMaximale
                                }
                              </b>
                            </div>

                            <div>
                              <div className="opacity-50">
                                Seuil
                              </div>

                              <b>
                                {
                                  selectedModel.notePassage ??
                                  "—"
                                }
                              </b>
                            </div>

                            <div>
                              <div className="opacity-50">
                                Coefficient
                              </div>

                              <b>
                                {
                                  selectedModel.coefficient ??
                                  1
                                }
                              </b>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* EVALUATEUR */}

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Évaluateur
                      </label>

                      <Select
                        options={
                          evaluatorOptions
                        }
                        value={
                          evaluatorOptions.find(
                            (item) =>
                              item.value ===
                              form.evaluateurId,
                          ) ??
                          null
                        }
                        onChange={
                          onEvaluatorChange
                        }
                        placeholder="Sélectionner un évaluateur..."
                        isClearable
                        isSearchable
                        styles={
                          selectStyles
                        }
                        noOptionsMessage={() =>
                          "Aucun évaluateur"
                        }
                      />
                    </div>
                  </div>
                </section>

                {/* ================================
                    SECTION 3
                ================================= */}

                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
                      <Target
                        size={17}
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold">
                        Résultat
                      </h3>

                      <p className="text-xs opacity-50">
                        Note, maximum et calcul automatique
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-3">

                    {/* NOTE */}

                    <label className="form-control">
                      <span className="mb-2 text-sm font-medium">
                        Note{" "}
                        <span className="text-error">
                          *
                        </span>
                      </span>

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={
                          currentMax ||
                          undefined
                        }
                        className="input input-bordered h-12 text-lg font-semibold"
                        value={
                          form.note
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (current) => ({
                              ...current,
                              note: event
                                .target
                                .value,
                            }),
                          )
                        }
                        required
                      />
                    </label>

                    {/* MAX */}

                    <label className="form-control">
                      <span className="mb-2 text-sm font-medium">
                        Note maximale{" "}
                        <span className="text-error">
                          *
                        </span>
                      </span>

                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="input input-bordered h-12"
                        value={
                          form.noteMaximale
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (current) => ({
                              ...current,
                              noteMaximale:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        required
                      />
                    </label>

                    {/* DATE */}

                    <label className="form-control">
                      <span className="mb-2 text-sm font-medium">
                        Date d'évaluation
                      </span>

                      <div className="relative">
                        <CalendarDays
                          size={17}
                          className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"
                        />

                        <input
                          type="date"
                          className="input input-bordered h-12 w-full pl-11"
                          value={
                            form.dateEvaluation
                          }
                          onChange={(
                            event,
                          ) =>
                            setForm(
                              (current) => ({
                                ...current,
                                dateEvaluation:
                                  event
                                    .target
                                    .value,
                              }),
                            )
                          }
                        />
                      </div>
                    </label>
                  </div>

                  {/* RESULTAT VISUEL */}

                  <div className="mt-5 overflow-hidden rounded-2xl border bg-base-200/50">
                    <div className="p-5">
                      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                        <div>
                          <p className="text-sm opacity-60">
                            Pourcentage obtenu
                          </p>

                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-4xl font-black text-primary">
                              {percent(
                                currentPercent,
                              )}
                            </span>

                            <span className="text-sm opacity-50">
                              ({currentNote} /{" "}
                              {currentMax ||
                                0})
                            </span>
                          </div>
                        </div>

                        <div className="min-w-[250px] md:w-[45%]">
                          <div className="mb-2 flex justify-between text-xs">
                            <span>
                              Progression
                            </span>

                            <span>
                              {percent(
                                currentPercent,
                              )}
                            </span>
                          </div>

                          <progress
                            className="progress progress-primary h-3 w-full"
                            value={
                              currentPercent
                            }
                            max="100"
                          />
                        </div>
                      </div>

                      {selectedPassingPercentage !==
                        null && (
                        <div className="mt-5 flex items-center gap-2 rounded-xl border bg-base-100 px-4 py-3 text-sm">
                          <Target
                            size={17}
                            className="text-warning"
                          />

                          <span>
                            Seuil de réussite :
                          </span>

                          <b>
                            {percent(
                              selectedPassingPercentage,
                            )}
                          </b>

                          <span className="opacity-50">
                            (
                            {
                              selectedModel?.notePassage
                            }{" "}
                            /{" "}
                            {
                              selectedModel?.noteMaximale
                            }
                            )
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* ================================
                    SECTION 4
                ================================= */}

                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
                      <FileText
                        size={17}
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold">
                        Statut et commentaire
                      </h3>

                      <p className="text-xs opacity-50">
                        Informations complémentaires
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-3">

                    {/* STATUT */}

                    <label className="form-control">
                      <span className="mb-2 text-sm font-medium">
                        Statut
                      </span>

                      <select
                        className="select select-bordered h-12 cursor-pointer"
                        value={
                          form.statut
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (current) => ({
                              ...current,
                              statut:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      >
                        <option value="BROUILLON">
                          Brouillon
                        </option>

                        <option value="SOUMISE">
                          Soumise
                        </option>

                        <option value="REJETEE">
                          Rejetée
                        </option>
                      </select>
                    </label>

                    {/* COMMENTAIRE */}

                    <label className="form-control md:col-span-2">
                      <span className="mb-2 text-sm font-medium">
                        Commentaire
                      </span>

                      <textarea
                        className="textarea textarea-bordered min-h-28"
                        value={
                          form.commentaire
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (current) => ({
                              ...current,
                              commentaire:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        placeholder="Ajouter une observation sur l'évaluation..."
                      />
                    </label>
                  </div>
                </section>
              </div>

              {/* FOOTER */}

              <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t bg-base-100 px-5 py-4 sm:flex-row sm:justify-end md:px-7">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="btn cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary min-w-44 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />

                      Enregistrement...
                    </>
                  ) : (
                    <>
                      {form.id ? (
                        <Edit3
                          size={17}
                        />
                      ) : (
                        <Plus
                          size={17}
                        />
                      )}

                      {form.id
                        ? "Enregistrer"
                        : "Créer l'évaluation"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          MODALE CREATION MODELE
      ====================================================== */}

      {openModelModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModelModal();
            }
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-base-100 shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b bg-gradient-to-r from-primary/10 to-transparent px-5 py-5 md:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-content">
                  <Settings2
                    size={22}
                  />
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    Nouveau modèle d'évaluation
                  </h2>

                  <p className="text-sm opacity-60">
                    Définissez les règles de notation.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  closeModelModal
                }
                disabled={
                  creatingModel
                }
                className="btn btn-sm btn-circle btn-ghost cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={saveModel}
              className="space-y-5 p-5 md:p-7"
            >
              <div className="grid gap-5 md:grid-cols-2">

                {/* NOM */}

                <label className="form-control md:col-span-2">
                  <span className="mb-2 text-sm font-medium">
                    Nom du modèle{" "}
                    <span className="text-error">
                      *
                    </span>
                  </span>

                  <input
                    type="text"
                    className="input input-bordered h-12"
                    value={
                      modelForm.nom
                    }
                    onChange={(event) =>
                      setModelForm(
                        (current) => ({
                          ...current,
                          nom: event
                            .target
                            .value,
                        }),
                      )
                    }
                    placeholder="Ex. Évaluation standard"
                    required
                  />
                </label>

                {/* NOTE MAX */}

                <label className="form-control">
                  <span className="mb-2 text-sm font-medium">
                    Note maximale{" "}
                    <span className="text-error">
                      *
                    </span>
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="input input-bordered h-12"
                    value={
                      modelForm.noteMaximale
                    }
                    onChange={(event) =>
                      setModelForm(
                        (current) => ({
                          ...current,
                          noteMaximale:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    required
                  />
                </label>

                {/* SEUIL */}

                <label className="form-control">
                  <span className="mb-2 text-sm font-medium">
                    Seuil de réussite{" "}
                    <span className="text-error">
                      *
                    </span>
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input input-bordered h-12"
                    value={
                      modelForm.notePassage
                    }
                    onChange={(event) =>
                      setModelForm(
                        (current) => ({
                          ...current,
                          notePassage:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    required
                  />

                  <span className="mt-1 text-xs opacity-50">
                    Exemple : 10 sur 20 =
                    50 %.
                  </span>
                </label>

                {/* COEFFICIENT */}

                <label className="form-control">
                  <span className="mb-2 text-sm font-medium">
                    Coefficient
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="input input-bordered h-12"
                    value={
                      modelForm.coefficient
                    }
                    onChange={(event) =>
                      setModelForm(
                        (current) => ({
                          ...current,
                          coefficient:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                {/* ACTIF */}

                <div className="flex items-end">
                  <label className="flex w-full cursor-pointer items-center justify-between rounded-xl border bg-base-200/50 p-4">
                    <div>
                      <div className="font-medium">
                        Modèle actif
                      </div>

                      <div className="text-xs opacity-50">
                        Disponible dans les évaluations
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      className="toggle toggle-primary cursor-pointer"
                      checked={
                        modelForm.actif
                      }
                      onChange={(event) =>
                        setModelForm(
                          (current) => ({
                            ...current,
                            actif:
                              event
                                .target
                                .checked,
                          }),
                        )
                      }
                    />
                  </label>
                </div>

                {/* DESCRIPTION */}

                <label className="form-control md:col-span-2">
                  <span className="mb-2 text-sm font-medium">
                    Description
                  </span>

                  <textarea
                    className="textarea textarea-bordered min-h-28"
                    value={
                      modelForm.description
                    }
                    onChange={(event) =>
                      setModelForm(
                        (current) => ({
                          ...current,
                          description:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="Décrivez l'utilisation de ce modèle..."
                  />
                </label>
              </div>

              {/* APERCU */}

              <div className="rounded-2xl border bg-base-200/50 p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold">
                  <BarChart3
                    size={17}
                    className="text-primary"
                  />

                  Aperçu du modèle
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-base-100 p-3 text-center">
                    <div className="text-xs opacity-50">
                      Maximum
                    </div>

                    <div className="mt-1 text-lg font-bold">
                      {
                        modelForm.noteMaximale
                      }
                    </div>
                  </div>

                  <div className="rounded-xl bg-base-100 p-3 text-center">
                    <div className="text-xs opacity-50">
                      Seuil
                    </div>

                    <div className="mt-1 text-lg font-bold">
                      {
                        modelForm.notePassage
                      }
                    </div>
                  </div>

                  <div className="rounded-xl bg-base-100 p-3 text-center">
                    <div className="text-xs opacity-50">
                      Coefficient
                    </div>

                    <div className="mt-1 text-lg font-bold">
                      {
                        modelForm.coefficient
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER */}

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    closeModelModal
                  }
                  disabled={
                    creatingModel
                  }
                  className="btn cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={
                    creatingModel
                  }
                  className="btn btn-primary min-w-44 cursor-pointer"
                >
                  {creatingModel ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />

                      Création...
                    </>
                  ) : (
                    <>
                      <Plus
                        size={17}
                      />

                      Créer le modèle
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}