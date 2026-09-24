
"use client";

import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  FileCheck2,
  FileText,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getRapportFinancier } from "@/actions/rapport-financier-actions";

/* ============================================================
   TYPES
============================================================ */

type PeriodeRapport =
  | "JOUR"
  | "MOIS"
  | "TRIMESTRE"
  | "SEMESTRE"
  | "ANNEE";

type RapportData = {
  periode: {
    debut: Date | string;
    fin: Date | string;
    type: PeriodeRapport;
  };

  synthese: {
    totalEncaisse: number;
    totalPaiementsReguliers: number;
    totalReglementsConventions: number;

    totalFacture: number;
    totalFacturePaye: number;
    totalFactureReste: number;

    totalEcheances: number;
    totalEcheancesPayees: number;
    totalEcheancesRestantes: number;
    totalEcheancesEnRetard: number;
  };

  inscriptions: {
    total: number;
    payees: number;
    partielles: number;
    nonPayees: number;
  };

  modesPaiement: {
    mode: string;
    montant: number;
    nombre: number;
  }[];

  evolution: {
    periode: string;
    montant: number;
  }[];

  inscriptionsDetails: {
    id: string;
    numero: string;
    apprenant: string;
    formation: string;
    session: string;
    tarif: number;
    montantConvenu: number;
    totalPaye: number;
    reste: number;
    pourcentage: number;
    statut: "PAYEE" | "PARTIELLE" | "NON_PAYEE";
    dernierPaiement: Date | string | null;
  }[];

  paiements: {
    id: string;
    date: Date | string | null;
    apprenant: string;
    inscription: string | null;
    montant: number;
    devise: string;
    mode: string;
    type: string;
    reference: string | null;
  }[];

  echeances: {
    id: string;
    inscription: string | null;
    apprenant: string;
    dateEcheance: Date | string;
    montant: number;
    montantPaye: number;
    montantDu: number;
    statut: string;
    enRetard: boolean;
  }[];
};

/* ============================================================
   HELPERS
============================================================ */

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;

  const date = value instanceof Date
    ? value
    : new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function formatDate(
  value: Date | string | null | undefined
) {
  const date = toDate(value);

  if (!date) return "-";

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(
  value: Date | string | null | undefined
) {
  const date = toDate(value);

  if (!date) return "-";

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value: number) {
  return (
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + " USD"
  );
}



function formatShortMoney(
  value: number,
  devise = "USD"
) {
  if (Math.abs(value) >= 1_000_000) {
    return (
      (value / 1_000_000).toLocaleString(
        "fr-FR",
        {
          maximumFractionDigits: 1,
        }
      ) + ` M ${devise}`
    );
  }

  if (Math.abs(value) >= 1_000) {
    return (
      (value / 1_000).toLocaleString(
        "fr-FR",
        {
          maximumFractionDigits: 1,
        }
      ) + ` K ${devise}`
    );
  }

  return formatMoney(value, devise);
}

function getDateInputValue() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getModeLabel(mode: string) {
  const labels: Record<string, string> = {
    ESPECES: "Espèces",
    VIREMENT: "Virement",
    MOBILE_MONEY: "Mobile Money",
    CARTE: "Carte",
    CHEQUE: "Chèque",
    AUTRE: "Autre",
  };

  return labels[mode] ?? mode;
}

function getTypePaiementLabel(type: string) {
  const labels: Record<string, string> = {
    PAIEMENT_REGULIER:
      "Paiement régulier",

    REGLEMENT_FACTURE_CONVENTION:
      "Règlement convention",
  };

  return labels[type] ?? type;
}

/* ============================================================
   BADGES
============================================================ */

function StatutInscriptionBadge({
  statut,
}: {
  statut:
    | "PAYEE"
    | "PARTIELLE"
    | "NON_PAYEE";
}) {
  if (statut === "PAYEE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Payée
      </span>
    );
  }

  if (statut === "PARTIELLE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
        <Clock3 className="h-3.5 w-3.5" />
        Partielle
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
      <XCircle className="h-3.5 w-3.5" />
      Non payée
    </span>
  );
}

function RetardBadge({
  enRetard,
}: {
  enRetard: boolean;
}) {
  if (!enRetard) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        À jour
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
      <AlertCircle className="h-3.5 w-3.5" />
      En retard
    </span>
  );
}

/* ============================================================
   CARD
============================================================ */

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
  valueClass = "",
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  iconClass: string;
  valueClass?: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p
            className={`mt-2 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl ${valueClass}`}
          >
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE
============================================================ */

export default function RapportFinancierPage() {
  const [type, setType] =
    useState<PeriodeRapport>("MOIS");

  const [date, setDate] =
    useState(getDateInputValue());

  const [rapport, setRapport] =
    useState<RapportData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [rechercheInscription, setRechercheInscription] =
    useState("");

  const [recherchePaiement, setRecherchePaiement] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<
      | "synthese"
      | "inscriptions"
      | "paiements"
      | "echeances"
    >("synthese");

  /* ============================================================
     CHARGEMENT
  ============================================================ */

  const chargerRapport = useCallback(
    async () => {
      setLoading(true);
      setError(null);

      try {
        const result =
          await getRapportFinancier({
            type,
            date,
          });

        if (!result.success) {
          setError(
            result.error ??
              "Impossible de charger le rapport."
          );

          setRapport(null);

          return;
        }

        setRapport(
          result.data as RapportData
        );
      } catch (err) {
        console.error(err);

        setError(
          "Une erreur est survenue lors du chargement du rapport."
        );

        setRapport(null);
      } finally {
        setLoading(false);
      }
    },
    [type, date]
  );

  useEffect(() => {
    chargerRapport();
  }, [chargerRapport]);

  /* ============================================================
     DONNEES CALCULEES
  ============================================================ */

  const inscriptionsFiltrees =
    useMemo(() => {
      if (!rapport) return [];

      const recherche =
        rechercheInscription
          .trim()
          .toLowerCase();

      if (!recherche) {
        return rapport.inscriptionsDetails;
      }

      return rapport.inscriptionsDetails.filter(
        (item) =>
          item.numero
            .toLowerCase()
            .includes(recherche) ||
          item.apprenant
            .toLowerCase()
            .includes(recherche) ||
          item.formation
            .toLowerCase()
            .includes(recherche) ||
          item.session
            .toLowerCase()
            .includes(recherche)
      );
    }, [
      rapport,
      rechercheInscription,
    ]);

  const paiementsFiltres =
    useMemo(() => {
      if (!rapport) return [];

      const recherche =
        recherchePaiement
          .trim()
          .toLowerCase();

      if (!recherche) {
        return rapport.paiements;
      }

      return rapport.paiements.filter(
        (item) =>
          item.apprenant
            .toLowerCase()
            .includes(recherche) ||
          item.inscription
            ?.toLowerCase()
            .includes(recherche) ||
          item.reference
            ?.toLowerCase()
            .includes(recherche) ||
          getModeLabel(item.mode)
            .toLowerCase()
            .includes(recherche)
      );
    }, [
      rapport,
      recherchePaiement,
    ]);

  const devisePrincipale =
    rapport?.paiements?.[0]?.devise ??
    "XAF";

  const tauxPaiementGlobal =
    rapport &&
    rapport.synthese.totalFacture > 0
      ? Math.min(
          (rapport.synthese.totalFacturePaye /
            rapport.synthese.totalFacture) *
            100,
          100
        )
      : 0;

  const totalModes =
    rapport?.modesPaiement.reduce(
      (sum, item) =>
        sum + item.montant,
      0
    ) ?? 0;

  /* ============================================================
     PERIODE LABEL
  ============================================================ */

  const periodeLabel = useMemo(() => {
    if (!rapport) return "";

    const debut = toDate(
      rapport.periode.debut
    );

    const fin = toDate(
      rapport.periode.fin
    );

    if (!debut || !fin) return "";

    const finReelle = new Date(fin);
    finReelle.setDate(
      finReelle.getDate() - 1
    );

    return `${formatDate(
      debut
    )} → ${formatDate(finReelle)}`;
  }, [rapport]);

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading && !rapport) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>

          <p className="text-sm font-medium text-slate-600">
            Génération du rapport financier...
          </p>
        </div>
      </div>
    );
  }

  /* ============================================================
     ERROR
  ============================================================ */

  if (error && !rapport) {
    return (
      <div className="min-h-[70vh] bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>

              <div>
                <h2 className="font-semibold text-red-900">
                  Impossible de générer le rapport
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={chargerRapport}
                  className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Réessayer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!rapport) return null;

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200">
                <TrendingUp className="h-3.5 w-3.5" />
                Analyse financière
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Rapport financier
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Suivez les encaissements, les paiements
                réguliers, les conventions, les factures,
                les échéances et la situation financière
                des inscriptions.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {periodeLabel}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                  <Wallet className="h-3.5 w-3.5" />
                  {formatMoney(
                    rapport.synthese.totalEncaisse,
                    devisePrincipale
                  )}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={chargerRapport}
              disabled={loading}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading
                    ? "animate-spin"
                    : ""
                }`}
              />

              Actualiser
            </button>
          </div>
        </div>

        {/* ======================================================
            FILTRES
        ====================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            {/* PERIODE */}

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Période
              </label>

              <div className="relative">
                <select
                  value={type}
                  onChange={(e) =>
                    setType(
                      e.target.value as PeriodeRapport
                    )
                  }
                  className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="JOUR">
                    Aujourd'hui
                  </option>

                  <option value="MOIS">
                    Mois
                  </option>

                  <option value="TRIMESTRE">
                    Trimestre
                  </option>

                  <option value="SEMESTRE">
                    Semestre
                  </option>

                  <option value="ANNEE">
                    Année
                  </option>
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* DATE */}

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date de référence
              </label>

              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="date"
                  value={date}
                  onChange={(e) =>
                    setDate(e.target.value)
                  }
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            {/* ETAT */}

            <div className="flex items-end">
              <div className="flex w-full items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm">
                  <CalendarDays className="h-4 w-4 text-slate-600" />
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Période analysée
                  </p>

                  <p className="text-sm font-semibold text-slate-800">
                    {periodeLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================
            MESSAGE LOADING
        ====================================================== */}

        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Actualisation du rapport...
          </div>
        )}

        {/* ======================================================
            KPI PRINCIPAUX
        ====================================================== */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <MetricCard
            title="Total encaissé"
            value={formatShortMoney(
              rapport.synthese.totalEncaisse,
              devisePrincipale
            )}
            subtitle={`${rapport.paiements.length} paiement(s) effectué(s)`}
            icon={Wallet}
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <MetricCard
            title="Paiements réguliers"
            value={formatShortMoney(
              rapport.synthese.totalPaiementsReguliers,
              devisePrincipale
            )}
            subtitle="Paiements liés aux inscriptions"
            icon={Banknote}
            iconClass="bg-blue-50 text-blue-600"
          />

          <MetricCard
            title="Règlements conventions"
            value={formatShortMoney(
              rapport.synthese.totalReglementsConventions,
              devisePrincipale
            )}
            subtitle="Paiements de factures convention"
            icon={FileCheck2}
            iconClass="bg-violet-50 text-violet-600"
          />

          <MetricCard
            title="Reste des factures"
            value={formatShortMoney(
              rapport.synthese.totalFactureReste,
              devisePrincipale
            )}
            subtitle="Montant encore à encaisser"
            icon={ArrowDownCircle}
            iconClass="bg-orange-50 text-orange-600"
          />
        </div>

        {/* ======================================================
            SECOND GROUPE KPI
        ====================================================== */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <MetricCard
            title="Total facturé"
            value={formatShortMoney(
              rapport.synthese.totalFacture,
              devisePrincipale
            )}
            subtitle="Factures émises sur la période"
            icon={FileText}
            iconClass="bg-slate-100 text-slate-700"
          />

          <MetricCard
            title="Factures payées"
            value={formatShortMoney(
              rapport.synthese.totalFacturePaye,
              devisePrincipale
            )}
            subtitle={`${tauxPaiementGlobal.toFixed(
              1
            )}% du montant facturé`}
            icon={CheckCircle2}
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <MetricCard
            title="Échéances restantes"
            value={formatShortMoney(
              rapport.synthese.totalEcheancesRestantes,
              devisePrincipale
            )}
            subtitle="Montants encore dus"
            icon={Clock3}
            iconClass="bg-amber-50 text-amber-600"
          />

          <MetricCard
            title="Échéances en retard"
            value={formatShortMoney(
              rapport.synthese.totalEcheancesEnRetard,
              devisePrincipale
            )}
            subtitle="À recouvrer en priorité"
            icon={AlertCircle}
            iconClass="bg-red-50 text-red-600"
          />
        </div>

        {/* ======================================================
            TABS
        ====================================================== */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="overflow-x-auto border-b border-slate-200">
            <div className="flex min-w-max px-2">
              {[
                {
                  id: "synthese",
                  label: "Synthèse",
                  icon: TrendingUp,
                },
                {
                  id: "inscriptions",
                  label: "Inscriptions",
                  icon: GraduationCap,
                },
                {
                  id: "paiements",
                  label: "Paiements effectués",
                  icon: CreditCard,
                },
                {
                  id: "echeances",
                  label: "Échéances",
                  icon: Clock3,
                },
              ].map((tab) => {
                const Icon = tab.icon;

                const active =
                  activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        tab.id as typeof activeTab
                      )
                    }
                    className={`inline-flex cursor-pointer items-center gap-2 border-b-2 px-4 py-4 text-sm font-semibold transition ${
                      active
                        ? "border-slate-900 text-slate-900"
                        : "border-transparent text-slate-400 hover:border-slate-200 hover:text-slate-700"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ====================================================
              SYNTHESE
          ==================================================== */}

          {activeTab === "synthese" && (
            <div className="space-y-6 p-5 sm:p-6">

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* INSCRIPTIONS */}

                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-slate-900">
                        Situation des inscriptions
                      </h2>

                      <p className="mt-1 text-xs text-slate-400">
                        Suivi des montants dus par inscription
                      </p>
                    </div>

                    <Users className="h-5 w-5 text-slate-400" />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400">
                        Total
                      </p>

                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {rapport.inscriptions.total}
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-50 p-4">
                      <p className="text-xs text-emerald-600">
                        Payées
                      </p>

                      <p className="mt-1 text-2xl font-bold text-emerald-700">
                        {rapport.inscriptions.payees}
                      </p>
                    </div>

                    <div className="rounded-xl bg-amber-50 p-4">
                      <p className="text-xs text-amber-600">
                        Partielles
                      </p>

                      <p className="mt-1 text-2xl font-bold text-amber-700">
                        {rapport.inscriptions.partielles}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-50 p-4">
                      <p className="text-xs text-red-600">
                        Non payées
                      </p>

                      <p className="mt-1 text-2xl font-bold text-red-700">
                        {rapport.inscriptions.nonPayees}
                      </p>
                    </div>
                  </div>
                </div>

                {/* MODES */}

                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-slate-900">
                        Modes de paiement
                      </h2>

                      <p className="mt-1 text-xs text-slate-400">
                        Répartition des encaissements
                      </p>
                    </div>

                    <CreditCard className="h-5 w-5 text-slate-400" />
                  </div>

                  <div className="mt-5 space-y-3">
                    {rapport.modesPaiement.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-400">
                        Aucun paiement enregistré.
                      </div>
                    ) : (
                      rapport.modesPaiement.map(
                        (item) => {
                          const pourcentage =
                            totalModes > 0
                              ? (item.montant /
                                  totalModes) *
                                100
                              : 0;

                          return (
                            <div
                              key={item.mode}
                              className="rounded-xl border border-slate-100 p-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {getModeLabel(
                                      item.mode
                                    )}
                                  </p>

                                  <p className="text-xs text-slate-400">
                                    {item.nombre} paiement(s)
                                  </p>
                                </div>

                                <p className="text-sm font-bold text-slate-900">
                                  {formatMoney(
                                    item.montant,
                                    devisePrincipale
                                  )}
                                </p>
                              </div>

                              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-slate-900 transition-all"
                                  style={{
                                    width: `${pourcentage}%`,
                                  }}
                                />
                              </div>

                              <p className="mt-1 text-right text-[11px] text-slate-400">
                                {pourcentage.toFixed(
                                  1
                                )}
                                %
                              </p>
                            </div>
                          );
                        }
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* EVOLUTION */}

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Évolution des encaissements
                    </h2>

                    <p className="mt-1 text-xs text-slate-400">
                      Encaissements regroupés selon la période sélectionnée
                    </p>
                  </div>

                  <span className="text-xs font-medium text-slate-400">
                    {rapport.evolution.length} période(s)
                  </span>
                </div>

                {rapport.evolution.length === 0 ? (
                  <div className="mt-5 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-400">
                    Aucun encaissement sur cette période.
                  </div>
                ) : (
                  <div className="mt-6 overflow-x-auto">
                    <div className="flex min-w-[600px] items-end gap-4 px-2 pb-2">
                      {rapport.evolution.map(
                        (item) => {
                          const maximum =
                            Math.max(
                              ...rapport.evolution.map(
                                (e) => e.montant
                              ),
                              1
                            );

                          const hauteur = Math.max(
                            (item.montant /
                              maximum) *
                              180,
                            8
                          );

                          return (
                            <div
                              key={item.periode}
                              className="flex min-w-[70px] flex-1 flex-col items-center"
                            >
                              <div className="mb-2 text-center text-[11px] font-semibold text-slate-600">
                                {formatShortMoney(
                                  item.montant,
                                  devisePrincipale
                                )}
                              </div>

                              <div className="flex h-[180px] w-full items-end justify-center rounded-xl bg-slate-50 px-2">
                                <div
                                  className="w-full max-w-[44px] rounded-t-lg bg-slate-900 transition-all"
                                  style={{
                                    height: `${hauteur}px`,
                                  }}
                                  title={`${item.periode}: ${formatMoney(
                                    item.montant,
                                    devisePrincipale
                                  )}`}
                                />
                              </div>

                              <div className="mt-2 text-center text-[11px] font-medium text-slate-500">
                                {item.periode}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ====================================================
              INSCRIPTIONS
          ==================================================== */}

          {activeTab === "inscriptions" && (
            <div className="p-5 sm:p-6">

              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Situation financière des inscriptions
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Consultez ce qui a été payé et ce qui reste à payer pour chaque inscription.
                  </p>
                </div>

                <div className="relative w-full lg:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={rechercheInscription}
                    onChange={(e) =>
                      setRechercheInscription(
                        e.target.value
                      )
                    }
                    placeholder="Rechercher une inscription..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1150px] text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Inscription
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Apprenant
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Formation
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Tarif
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Payé
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Reste
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Progression
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Statut
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Dernier paiement
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {inscriptionsFiltrees.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-4 py-12 text-center text-sm text-slate-400"
                          >
                            Aucune inscription trouvée.
                          </td>
                        </tr>
                      ) : (
                        inscriptionsFiltrees.map(
                          (item) => (
                            <tr
                              key={item.id}
                              className="transition hover:bg-slate-50/70"
                            >
                              <td className="px-4 py-4">
                                <span className="font-semibold text-slate-900">
                                  {item.numero}
                                </span>

                                <p className="mt-0.5 text-xs text-slate-400">
                                  {item.session}
                                </p>
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                    <UserRound className="h-4 w-4 text-slate-500" />
                                  </div>

                                  <span className="font-medium text-slate-800">
                                    {item.apprenant}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <span className="text-slate-700">
                                  {item.formation}
                                </span>
                              </td>

                              <td className="px-4 py-4 font-semibold text-slate-800">
                                {formatMoney(
                                  item.tarif,
                                  devisePrincipale
                                )}
                              </td>

                              <td className="px-4 py-4 font-semibold text-emerald-600">
                                {formatMoney(
                                  item.totalPaye,
                                  devisePrincipale
                                )}
                              </td>

                              <td className="px-4 py-4 font-semibold text-red-600">
                                {formatMoney(
                                  item.reste,
                                  devisePrincipale
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <div className="w-36">
                                  <div className="mb-1 flex items-center justify-between">
                                    <span className="text-xs text-slate-400">
                                      Progression
                                    </span>

                                    <span className="text-xs font-bold text-slate-700">
                                      {item.pourcentage.toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>

                                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className={`h-full rounded-full ${
                                        item.statut ===
                                        "PAYEE"
                                          ? "bg-emerald-500"
                                          : item.statut ===
                                            "PARTIELLE"
                                          ? "bg-amber-500"
                                          : "bg-red-400"
                                      }`}
                                      style={{
                                        width: `${Math.min(
                                          item.pourcentage,
                                          100
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <StatutInscriptionBadge
                                  statut={
                                    item.statut
                                  }
                                />
                              </td>

                              <td className="px-4 py-4 text-slate-500">
                                {formatDate(
                                  item.dernierPaiement
                                )}
                              </td>
                            </tr>
                          )
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              PAIEMENTS
          ==================================================== */}

          {activeTab === "paiements" && (
            <div className="p-5 sm:p-6">

              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Paiements effectués
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Tous les encaissements réellement enregistrés sur la période.
                  </p>
                </div>

                <div className="relative w-full lg:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={recherchePaiement}
                    onChange={(e) =>
                      setRecherchePaiement(
                        e.target.value
                      )
                    }
                    placeholder="Rechercher un paiement..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs font-medium text-emerald-600">
                    Total encaissé
                  </p>

                  <p className="mt-1 text-xl font-bold text-emerald-700">
                    {formatMoney(
                      rapport.synthese.totalEncaisse,
                      devisePrincipale
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-xs font-medium text-blue-600">
                    Paiements réguliers
                  </p>

                  <p className="mt-1 text-xl font-bold text-blue-700">
                    {formatMoney(
                      rapport.synthese.totalPaiementsReguliers,
                      devisePrincipale
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-violet-50 p-4">
                  <p className="text-xs font-medium text-violet-600">
                    Conventions
                  </p>

                  <p className="mt-1 text-xl font-bold text-violet-700">
                    {formatMoney(
                      rapport.synthese.totalReglementsConventions,
                      devisePrincipale
                    )}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Date
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Apprenant
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Inscription
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Type
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Mode
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Référence
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Montant
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {paiementsFiltres.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-12 text-center text-sm text-slate-400"
                          >
                            Aucun paiement trouvé.
                          </td>
                        </tr>
                      ) : (
                        paiementsFiltres.map(
                          (paiement) => (
                            <tr
                              key={paiement.id}
                              className="transition hover:bg-slate-50/70"
                            >
                              <td className="px-4 py-4 text-slate-600">
                                {formatDateTime(
                                  paiement.date
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                                    <UserRound className="h-4 w-4 text-slate-500" />
                                  </div>

                                  <span className="font-medium text-slate-800">
                                    {paiement.apprenant}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                {paiement.inscription ? (
                                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                    {paiement.inscription}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">
                                    -
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    paiement.type ===
                                    "PAIEMENT_REGULIER"
                                      ? "bg-blue-50 text-blue-700"
                                      : "bg-violet-50 text-violet-700"
                                  }`}
                                >
                                  {getTypePaiementLabel(
                                    paiement.type
                                  )}
                                </span>
                              </td>

                              <td className="px-4 py-4 text-slate-600">
                                {getModeLabel(
                                  paiement.mode
                                )}
                              </td>

                              <td className="px-4 py-4 font-mono text-xs text-slate-500">
                                {paiement.reference ??
                                  "-"}
                              </td>

                              <td className="px-4 py-4 text-right font-bold text-emerald-600">
                                +{" "}
                                {formatMoney(
                                  paiement.montant,
                                  paiement.devise
                                )}
                              </td>
                            </tr>
                          )
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              ECHEANCES
          ==================================================== */}

          {activeTab === "echeances" && (
            <div className="p-5 sm:p-6">

              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Échéances de paiement
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Suivi des échéances payées, restantes et en retard.
                </p>
              </div>

              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Total échéances
                  </p>

                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {formatMoney(
                      rapport.synthese.totalEcheances,
                      devisePrincipale
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs text-emerald-600">
                    Payées
                  </p>

                  <p className="mt-1 text-xl font-bold text-emerald-700">
                    {formatMoney(
                      rapport.synthese.totalEcheancesPayees,
                      devisePrincipale
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-red-50 p-4">
                  <p className="text-xs text-red-600">
                    En retard
                  </p>

                  <p className="mt-1 text-xl font-bold text-red-700">
                    {formatMoney(
                      rapport.synthese.totalEcheancesEnRetard,
                      devisePrincipale
                    )}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Échéance
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Apprenant
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Inscription
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Montant
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Payé
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Reste
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Statut
                        </th>

                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Situation
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {rapport.echeances.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-12 text-center text-sm text-slate-400"
                          >
                            Aucune échéance sur cette période.
                          </td>
                        </tr>
                      ) : (
                        rapport.echeances.map(
                          (echeance) => (
                            <tr
                              key={echeance.id}
                              className="transition hover:bg-slate-50/70"
                            >
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-slate-400" />

                                  <span className="font-semibold text-slate-800">
                                    {formatDate(
                                      echeance.dateEcheance
                                    )}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-4 font-medium text-slate-800">
                                {echeance.apprenant}
                              </td>

                              <td className="px-4 py-4">
                                {echeance.inscription ??
                                  "-"}
                              </td>

                              <td className="px-4 py-4 text-right font-semibold text-slate-800">
                                {formatMoney(
                                  echeance.montant,
                                  devisePrincipale
                                )}
                              </td>

                              <td className="px-4 py-4 text-right font-semibold text-emerald-600">
                                {formatMoney(
                                  echeance.montantPaye,
                                  devisePrincipale
                                )}
                              </td>

                              <td className="px-4 py-4 text-right font-semibold text-red-600">
                                {formatMoney(
                                  echeance.montantDu,
                                  devisePrincipale
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                  {echeance.statut}
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                <RetardBadge
                                  enRetard={
                                    echeance.enRetard
                                  }
                                />
                              </td>
                            </tr>
                          )
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================
            FOOTER SUMMARY
        ====================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                <TrendingUp className="h-5 w-5 text-slate-700" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Situation financière
                </p>

                <p className="text-xs text-slate-400">
                  Rapport calculé à partir des transactions enregistrées.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                {rapport.inscriptions.payees} payée(s)
              </span>

              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                {rapport.inscriptions.partielles} partielle(s)
              </span>

              <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                {rapport.inscriptions.nonPayees} non payée(s)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

