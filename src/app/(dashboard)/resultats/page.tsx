"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileText,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  Scale,
  Users,
  XCircle,
} from "lucide-react";

import { toast } from "sonner";

import {
  downloadBrevetPdf,
  downloadReleveNotesPdf,
  getResultats,
} from "@/actions/resultat-actions";

/* ============================================================
   TYPES
============================================================ */

type ResultatItem = {
  id: string;
  inscriptionId?: string;

  apprenant: {
    id: string;
    prenom: string;
    nom: string;
    numero?: string | null;
  };

  formation: {
    id?: string;
    nom: string;
    code?: string | null;
  };

  session: {
    id?: string;
    nom?: string | null;
    code?: string | null;
    dateDebut?: string | Date | null;
    dateFin?: string | Date | null;
  };

  inscription?: {
    id?: string;
    numero?: string | null;
  };

  moyenneEvaluations: number | null;
  contributionEvaluations: number | null;

  moyenneJury: number | null;
  contributionJury: number | null;

  moyenneGenerale: number | null;

  resultat: string;
  resultatLabel: string;
  mention?: string | null;

  nombreEvaluations?: number;
  nombreEvaluationsJury?: number;

  modules?: Array<{
    id?: string;
    nom?: string | null;
    code?: string | null;
    note?: number | null;
    noteMaximale?: number | null;
    pourcentage?: number | null;
    resultat?: string | null;
  }>;

  certification?: {
    id: string;
    numero: string;
    intitule: string;
    statut: string;
    dateObtention?: string | Date | null;
    mention?: string | null;
  } | null;
};

type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
};

/* ============================================================
   HELPERS
============================================================ */

function toNumber(
  value: number | string | null | undefined
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function clampPercentage(
  value: number | null | undefined
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return Math.max(0, Math.min(100, value));
}

function formatPercentage(
  value: number | null | undefined
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${value.toFixed(2)} %`;
}

function formatDate(
  value: string | Date | null | undefined
): string {
  if (!value) {
    return "—";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getApprenantName(
  item: ResultatItem
): string {
  const prenom =
    item.apprenant?.prenom ?? "";

  const nom =
    item.apprenant?.nom ?? "";

  const fullName =
    `${prenom} ${nom}`.trim();

  return fullName || "Apprenant inconnu";
}

function getFormationName(
  item: ResultatItem
): string {
  return (
    item.formation?.nom ??
    "Formation inconnue"
  );
}

function getSessionName(
  item: ResultatItem
): string {
  if (item.session?.nom) {
    return item.session.nom;
  }

  if (item.session?.code) {
    return item.session.code;
  }

  return "Session inconnue";
}

function getResultatBadgeClass(
  resultat: string
): string {
  switch (resultat) {
    case "REUSSITE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "REUSSITE_SOUS_CONDITION":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "ECHEC":
      return "bg-red-50 text-red-700 ring-red-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function getResultatIcon(
  resultat: string
) {
  switch (resultat) {
    case "REUSSITE":
      return CheckCircle2;

    case "ECHEC":
      return XCircle;

    case "REUSSITE_SOUS_CONDITION":
      return ClipboardCheck;

    default:
      return FileText;
  }
}

function getResultatLabel(
  item: ResultatItem
): string {
  if (item.resultatLabel) {
    return item.resultatLabel;
  }

  switch (item.resultat) {
    case "REUSSITE":
      return "Réussite";

    case "REUSSITE_SOUS_CONDITION":
      return "Réussite sous condition";

    case "ECHEC":
      return "Échec";

    default:
      return "Non évalué";
  }
}

function getMentionLabel(
  mention?: string | null
): string {
  if (!mention) {
    return "—";
  }

  const labels: Record<string, string> = {
    EXCELLENT: "Excellent",
    TRES_BIEN: "Très bien",
    BIEN: "Bien",
    ASSEZ_BIEN: "Assez bien",
    PASSABLE: "Passable",
  };

  return labels[mention] ?? mention;
}

function getFinalStatus(
  item: ResultatItem
): "COMPLETE" | "PARTIEL" | "VIDE" {
  const hasEvaluations =
    item.moyenneEvaluations !== null;

  const hasJury =
    item.moyenneJury !== null;

  if (hasEvaluations && hasJury) {
    return "COMPLETE";
  }

  if (hasEvaluations || hasJury) {
    return "PARTIEL";
  }

  return "VIDE";
}

/* ============================================================
   PDF
============================================================ */

function openPdf(
  base64: string,
  filename: string
) {
  try {
    const binary = atob(base64);

    const bytes = Uint8Array.from(
      binary,
      (char) => char.charCodeAt(0)
    );

    const blob = new Blob(
      [bytes],
      {
        type: "application/pdf",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (error) {
    console.error(
      "Erreur ouverture PDF:",
      error
    );

    toast.error(
      "Impossible d'ouvrir le document PDF."
    );
  }
}

/* ============================================================
   PAGE
============================================================ */

export default function ResultatsPage() {
  const [resultats, setResultats] =
    useState<ResultatItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [filtreResultat, setFiltreResultat] =
    useState("TOUS");

  const [filtreEtat, setFiltreEtat] =
    useState("TOUS");

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  /* ==========================================================
     CHARGEMENT
  ========================================================== */

  const loadResultats = useCallback(
    async () => {
      setLoading(true);

      try {
        const response =
          (await getResultats()) as ActionResult<
            ResultatItem[]
          >;

        if (!response?.success) {
          toast.error(
            response?.message ??
              "Impossible de charger les résultats."
          );

          setResultats([]);

          return;
        }

        const data =
          Array.isArray(response.data)
            ? response.data
            : [];

        /*
         * Protection importante :
         * on normalise les données reçues afin que
         * le rendu ne tente jamais de lire
         * item.formation.nom ou item.apprenant.nom
         * sur undefined.
         */
        const normalized =
          data.map((item: any) => ({
            ...item,

            apprenant: {
              id:
                item?.apprenant?.id ??
                "",
              prenom:
                item?.apprenant?.prenom ??
                "",
              nom:
                item?.apprenant?.nom ??
                "",
              numero:
                item?.apprenant?.numero ??
                null,
            },

            formation: {
              id:
                item?.formation?.id ??
                "",
              nom:
                item?.formation?.nom ??
                "Formation inconnue",
              code:
                item?.formation?.code ??
                null,
            },

            session: {
              id:
                item?.session?.id ??
                "",
              nom:
                item?.session?.nom ??
                null,
              code:
                item?.session?.code ??
                null,
              dateDebut:
                item?.session?.dateDebut ??
                null,
              dateFin:
                item?.session?.dateFin ??
                null,
            },

            inscription:
              item?.inscription ?? {
                id:
                  item?.inscriptionId ??
                  "",
                numero: null,
              },

            moyenneEvaluations:
              toNumber(
                item?.moyenneEvaluations
              ),

            contributionEvaluations:
              toNumber(
                item?.contributionEvaluations
              ),

            moyenneJury:
              toNumber(
                item?.moyenneJury
              ),

            contributionJury:
              toNumber(
                item?.contributionJury
              ),

            moyenneGenerale:
              toNumber(
                item?.moyenneGenerale
              ),

            modules:
              Array.isArray(
                item?.modules
              )
                ? item.modules
                : [],

            nombreEvaluations:
              Number(
                item?.nombreEvaluations ??
                  0
              ),

            nombreEvaluationsJury:
              Number(
                item?.nombreEvaluationsJury ??
                  0
              ),
          }));

        setResultats(normalized);
      } catch (error) {
        console.error(
          "Erreur chargement résultats:",
          error
        );

        toast.error(
          "Une erreur est survenue lors du chargement des résultats."
        );

        setResultats([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadResultats();
  }, [loadResultats]);

  /* ==========================================================
     FILTRES
  ========================================================== */

  const resultatsFiltres =
    useMemo(() => {
      const term =
        search.trim().toLowerCase();

      return resultats.filter(
        (item) => {
          const nom =
            getApprenantName(
              item
            ).toLowerCase();

          const numero =
            (
              item.apprenant
                ?.numero ?? ""
            ).toLowerCase();

          const formation =
            getFormationName(
              item
            ).toLowerCase();

          const session =
            getSessionName(
              item
            ).toLowerCase();

          const matchesSearch =
            !term ||
            nom.includes(term) ||
            numero.includes(term) ||
            formation.includes(term) ||
            session.includes(term);

          const matchesResultat =
            filtreResultat === "TOUS" ||
            item.resultat ===
              filtreResultat;

          const etat =
            getFinalStatus(item);

          const matchesEtat =
            filtreEtat === "TOUS" ||
            etat === filtreEtat;

          return (
            matchesSearch &&
            matchesResultat &&
            matchesEtat
          );
        }
      );
    }, [
      resultats,
      search,
      filtreResultat,
      filtreEtat,
    ]);

  /* ==========================================================
     STATISTIQUES
  ========================================================== */

  const statistiques =
    useMemo(() => {
      const total =
        resultats.length;

      const reussites =
        resultats.filter(
          (item) =>
            item.resultat ===
            "REUSSITE"
        ).length;

      const echecs =
        resultats.filter(
          (item) =>
            item.resultat ===
            "ECHEC"
        ).length;

      const complets =
        resultats.filter(
          (item) =>
            getFinalStatus(item) ===
            "COMPLETE"
        ).length;

      const attenteJury =
        resultats.filter(
          (item) =>
            item.moyenneEvaluations !==
              null &&
            item.moyenneJury ===
              null
        ).length;

      const attenteEvaluations =
        resultats.filter(
          (item) =>
            item.moyenneEvaluations ===
              null &&
            item.moyenneJury !==
              null
        ).length;

      const moyennesFinales =
        resultats
          .map(
            (item) =>
              item.moyenneGenerale
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          );

      const moyenneGenerale =
        moyennesFinales.length > 0
          ? moyennesFinales.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
            moyennesFinales.length
          : null;

      return {
        total,
        reussites,
        echecs,
        complets,
        attenteJury,
        attenteEvaluations,
        moyenneGenerale,
      };
    }, [resultats]);

  /* ==========================================================
     TÉLÉCHARGEMENT RELEVÉ
  ========================================================== */

  const handleReleve =
    async (
      item: ResultatItem
    ) => {
      setProcessingId(
        `${item.id}-releve`
      );

      try {
        const response =
          (await downloadReleveNotesPdf(
            item.id
          )) as ActionResult<{
            base64: string;
            filename: string;
          }>;

        if (!response.success) {
          toast.error(
            response.message ??
              "Impossible de générer le relevé."
          );

          return;
        }

        if (
          !response.data?.base64
        ) {
          toast.error(
            "Le PDF généré est vide."
          );

          return;
        }

        openPdf(
          response.data.base64,
          response.data.filename ??
            "releve-notes.pdf"
        );

        toast.success(
          "Relevé de notes généré."
        );
      } catch (error) {
        console.error(
          error
        );

        toast.error(
          "Erreur lors de la génération du relevé."
        );
      } finally {
        setProcessingId(null);
      }
    };

  /* ==========================================================
     TÉLÉCHARGEMENT BREVET
  ========================================================== */

  const handleBrevet =
    async (
      item: ResultatItem
    ) => {
      setProcessingId(
        `${item.id}-brevet`
      );

      try {
        const response =
          (await downloadBrevetPdf(
            item.id
          )) as ActionResult<{
            base64: string;
            filename: string;
          }>;

        if (!response.success) {
          toast.error(
            response.message ??
              "Impossible de générer le brevet."
          );

          return;
        }

        if (
          !response.data?.base64
        ) {
          toast.error(
            "Le PDF généré est vide."
          );

          return;
        }

        openPdf(
          response.data.base64,
          response.data.filename ??
            "brevet.pdf"
        );

        toast.success(
          "Brevet généré."
        );
      } catch (error) {
        console.error(
          error
        );

        toast.error(
          "Erreur lors de la génération du brevet."
        );
      } finally {
        setProcessingId(null);
      }
    };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex min-h-[500px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Loader2 className="h-6 w-6 animate-spin text-slate-700" />
              </div>

              <p className="text-sm font-medium text-slate-500">
                Chargement des résultats...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <GraduationCap className="h-4 w-4" />
              Formation
              <ChevronRight className="h-3.5 w-3.5" />
              Résultats
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Résultats des apprenants
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Les évaluations de formation représentent
              <strong className="mx-1 text-slate-700">
                70 %
              </strong>
              et les évaluations du jury
              <strong className="mx-1 text-slate-700">
                30 %
              </strong>
              du résultat final.
            </p>
          </div>

          <button
            type="button"
            onClick={loadResultats}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>

        {/* ====================================================
            KPI
        ==================================================== */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Résultats
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {statistiques.total}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                <GraduationCap className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  Réussites
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-700">
                  {statistiques.reussites}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                  Échecs
                </p>

                <p className="mt-2 text-2xl font-bold text-red-700">
                  {statistiques.echecs}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Moyenne finale
                </p>

                <p className="mt-2 text-2xl font-bold text-blue-700">
                  {formatPercentage(
                    statistiques.moyenneGenerale
                  )}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                <Award className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================
            EXPLICATION 70 / 30
        ==================================================== */}

        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                <BookOpen className="h-5 w-5 text-blue-700" />
              </div>

              <div>
                <h2 className="font-bold text-blue-900">
                  Évaluations de formation — 70 %
                </h2>

                <p className="mt-1 text-sm leading-6 text-blue-800/80">
                  La moyenne des évaluations validées
                  des différents modules constitue
                  70 % du résultat final.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                <Scale className="h-5 w-5 text-violet-700" />
              </div>

              <div>
                <h2 className="font-bold text-violet-900">
                  Jury — 30 %
                </h2>

                <p className="mt-1 text-sm leading-6 text-violet-800/80">
                  La moyenne des notes attribuées
                  par les membres du jury constitue
                  30 % du résultat final.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================
            FILTRES
        ==================================================== */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Rechercher
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Nom, numéro, formation ou session..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Résultat
              </label>

              <select
                value={filtreResultat}
                onChange={(event) =>
                  setFiltreResultat(
                    event.target.value
                  )
                }
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="TOUS">
                  Tous
                </option>

                <option value="REUSSITE">
                  Réussite
                </option>

                <option value="REUSSITE_SOUS_CONDITION">
                  Réussite sous condition
                </option>

                <option value="ECHEC">
                  Échec
                </option>

                <option value="NON_EVALUE">
                  Non évalué
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                État
              </label>

              <select
                value={filtreEtat}
                onChange={(event) =>
                  setFiltreEtat(
                    event.target.value
                  )
                }
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="TOUS">
                  Tous
                </option>

                <option value="COMPLETE">
                  Évaluation complète
                </option>

                <option value="PARTIEL">
                  Partiel
                </option>

                <option value="VIDE">
                  Sans évaluation
                </option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>
              {resultatsFiltres.length} résultat(s)
              affiché(s)
            </span>

            {statistiques.attenteJury >
              0 && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                {statistiques.attenteJury} en attente du jury
              </span>
            )}

            {statistiques.attenteEvaluations >
              0 && (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                {statistiques.attenteEvaluations} en attente d'évaluations
              </span>
            )}
          </div>
        </div>

        {/* ====================================================
            TABLE
        ==================================================== */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                Résultats
              </h2>

              <p className="mt-0.5 text-xs text-slate-400">
                Calcul : évaluations 70 % + jury 30 %
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Users className="h-4 w-4" />
              {resultatsFiltres.length} apprenant(s)
            </div>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1250px] text-left text-sm">

              <thead className="border-b border-slate-100 bg-slate-50/80">
                <tr>

                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Apprenant
                  </th>

                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Formation
                  </th>

                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Évaluations
                    <span className="ml-1 text-blue-500">
                      70 %
                    </span>
                  </th>

                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Jury
                    <span className="ml-1 text-violet-500">
                      30 %
                    </span>
                  </th>

                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Résultat final
                  </th>

                  <th className="px-4 py-3 font-semibold text-slate-600">
                    État
                  </th>

                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {resultatsFiltres.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-16 text-center"
                    >
                      <div className="flex flex-col items-center">

                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                          <FileText className="h-6 w-6 text-slate-400" />
                        </div>

                        <p className="mt-4 font-semibold text-slate-700">
                          Aucun résultat trouvé
                        </p>

                        <p className="mt-1 max-w-md text-xs text-slate-400">
                          Aucun résultat ne correspond
                          aux critères sélectionnés.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  resultatsFiltres.map(
                    (item) => {
                      const etat =
                        getFinalStatus(
                          item
                        );

                      const Icon =
                        getResultatIcon(
                          item.resultat
                        );

                      const evaluationPercent =
                        clampPercentage(
                          item.moyenneEvaluations
                        );

                      const juryPercent =
                        clampPercentage(
                          item.moyenneJury
                        );

                      return (
                        <tr
                          key={
                            item.id
                          }
                          className="transition hover:bg-slate-50/70"
                        >

                          {/* APPRENANT */}

                          <td className="px-4 py-4">

                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
                                {(
                                  item
                                    .apprenant
                                    ?.prenom ??
                                  "?"
                                )
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">

                                <p className="truncate font-semibold text-slate-900">
                                  {getApprenantName(
                                    item
                                  )}
                                </p>

                                <p className="mt-0.5 text-xs text-slate-400">
                                  N°{" "}
                                  {item
                                    .apprenant
                                    ?.numero ??
                                    "—"}
                                </p>

                              </div>

                            </div>

                          </td>

                          {/* FORMATION */}

                          <td className="px-4 py-4">

                            <p className="font-medium text-slate-800">
                              {getFormationName(
                                item
                              )}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              {getSessionName(
                                item
                              )}
                            </p>

                          </td>

                          {/* ÉVALUATIONS 70% */}

                          <td className="px-4 py-4">

                            <div className="w-44">

                              <div className="mb-1.5 flex items-center justify-between gap-2">

                                <span className="text-xs text-slate-400">
                                  Moyenne
                                </span>

                                <span className="font-bold text-blue-700">
                                  {formatPercentage(
                                    evaluationPercent
                                  )}
                                </span>

                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                                <div
                                  className="h-full rounded-full bg-blue-500 transition-all"
                                  style={{
                                    width: `${evaluationPercent ?? 0}%`,
                                  }}
                                />

                              </div>

                              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">

                                <span>
                                  Contribution
                                </span>

                                <span className="font-semibold text-blue-600">
                                  {formatPercentage(
                                    item.contributionEvaluations
                                  )}
                                </span>

                              </div>

                            </div>

                          </td>

                          {/* JURY 30% */}

                          <td className="px-4 py-4">

                            <div className="w-44">

                              <div className="mb-1.5 flex items-center justify-between gap-2">

                                <span className="text-xs text-slate-400">
                                  Moyenne
                                </span>

                                <span className="font-bold text-violet-700">
                                  {formatPercentage(
                                    juryPercent
                                  )}
                                </span>

                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                                <div
                                  className="h-full rounded-full bg-violet-500 transition-all"
                                  style={{
                                    width: `${juryPercent ?? 0}%`,
                                  }}
                                />

                              </div>

                              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">

                                <span>
                                  Contribution
                                </span>

                                <span className="font-semibold text-violet-600">
                                  {formatPercentage(
                                    item.contributionJury
                                  )}
                                </span>

                              </div>

                            </div>

                          </td>

                          {/* FINAL */}

                          <td className="px-4 py-4">

                            <div>
                              <p className="text-lg font-bold text-slate-900">
                                {formatPercentage(
                                  item.moyenneGenerale
                                )}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {getMentionLabel(
                                  item.mention
                                )}
                              </p>
                            </div>

                          </td>

                          {/* ETAT */}

                          <td className="px-4 py-4">

                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getResultatBadgeClass(
                                item.resultat
                              )}`}
                            >
                              <Icon className="h-3.5 w-3.5" />

                              {getResultatLabel(
                                item
                              )}
                            </span>

                            {etat ===
                              "PARTIEL" && (
                              <p className="mt-1.5 text-[11px] text-amber-600">
                                Résultat incomplet
                              </p>
                            )}

                          </td>

                          {/* ACTIONS */}

                          <td className="px-4 py-4">

                            <div className="flex justify-end gap-2">

                              <Link
                                href={`/resultats/${item.id}`}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                Détails
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Link>

                              <button
                                type="button"
                                disabled={
                                  processingId ===
                                  `${item.id}-releve`
                                }
                                onClick={() =>
                                  handleReleve(
                                    item
                                  )
                                }
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {processingId ===
                                `${item.id}-releve` ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Download className="h-3.5 w-3.5" />
                                )}

                                Relevé
                              </button>

                              <button
                                type="button"
                                disabled={
                                  processingId ===
                                  `${item.id}-brevet` ||
                                  item.moyenneGenerale ===
                                    null
                                }
                                onClick={() =>
                                  handleBrevet(
                                    item
                                  )
                                }
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {processingId ===
                                `${item.id}-brevet` ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Award className="h-3.5 w-3.5" />
                                )}

                                Brevet
                              </button>

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )
                )}

              </tbody>
            </table>
          </div>
        </div>

        {/* ====================================================
            FORMULE
        ==================================================== */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                <Scale className="h-5 w-5 text-slate-600" />
              </div>

              <div>

                <p className="text-sm font-bold text-slate-900">
                  Formule de calcul
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  La moyenne finale n'est calculée que
                  lorsque les deux composantes sont disponibles.
                </p>

              </div>

            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">

              <span className="text-blue-600">
                Évaluations × 70 %
              </span>

              <span className="mx-2 text-slate-400">
                +
              </span>

              <span className="text-violet-600">
                Jury × 30 %
              </span>

              <span className="mx-2 text-slate-400">
                =
              </span>

              <span className="text-slate-900">
                Résultat final
              </span>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}