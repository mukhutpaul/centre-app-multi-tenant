import Link from "next/link";

import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  AlertCircle,
  ReceiptText,
  UserRound,
  ArrowRight,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

import { getCurrentCentreContext } from "@/lib/validations/centre-access";

import { StatutEcheance } from "@/generated/prisma/enums";

import EcheancesSearch from "@/components/echeances/echeances-search";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    recherche?: string;
  }>;
};

function formatMoney(value: unknown) {
  const montant = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(montant);
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function getStatutLabel(statut: StatutEcheance) {
  switch (statut) {
    case "PAYEE":
      return "Payée";

    case "PARTIELLE":
      return "Partielle";

    case "EN_RETARD":
      return "En retard";

    case "ANNULEE":
      return "Annulée";

    case "EN_ATTENTE":
    default:
      return "En attente";
  }
}

function getStatutClass(statut: StatutEcheance) {
  switch (statut) {
    case "PAYEE":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";

    case "PARTIELLE":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";

    case "EN_RETARD":
      return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";

    case "ANNULEE":
      return "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400";

    case "EN_ATTENTE":
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
  }
}

function getStatutIcon(statut: StatutEcheance) {
  switch (statut) {
    case "PAYEE":
      return CheckCircle2;

    case "PARTIELLE":
      return Clock3;

    case "EN_RETARD":
      return AlertCircle;

    case "ANNULEE":
      return AlertCircle;

    case "EN_ATTENTE":
    default:
      return Clock3;
  }
}

export default async function EcheancesPage({ searchParams }: Props) {
  const context = await getCurrentCentreContext();

  if (!context.centreId) {
    throw new Error("Aucun centre actif n'est associé à votre compte.");
  }

  const centreId = context.centreId;

  const params = await searchParams;

  const recherche = params.recherche?.trim() ?? "";

  const echeances = await prisma.echeancePaiement.findMany({
    where: {
      centreId,

      ...(recherche
        ? {
            OR: [
              // =====================================================
              // NUMÉRO D'ÉCHÉANCE
              // numero = Int
              // =====================================================
              ...(!Number.isNaN(Number(recherche))
                ? [
                    {
                      numero: Number(recherche),
                    },
                  ]
                : []),

              // =====================================================
              // NUMÉRO INSCRIPTION
              // =====================================================
              {
                inscription: {
                  numero: {
                    contains: recherche,
                  },
                },
              },

              // =====================================================
              // PRÉNOM APPRENANT
              // =====================================================
              {
                inscription: {
                  apprenant: {
                    prenom: {
                      contains: recherche,
                    },
                  },
                },
              },

              // =====================================================
              // NOM APPRENANT
              // =====================================================
              {
                inscription: {
                  apprenant: {
                    nom: {
                      contains: recherche,
                    },
                  },
                },
              },

              // =====================================================
              // FORMATION
              // =====================================================
              {
                inscription: {
                  session: {
                    formation: {
                      nom: {
                        contains: recherche,
                      },
                    },
                  },
                },
              },

              // =====================================================
              // NUMÉRO FACTURE
              // =====================================================
              {
                facture: {
                  numero: {
                    contains: recherche,
                  },
                },
              },
            ],
          }
        : {}),
    },

    orderBy: [
      {
        dateEcheance: "asc",
      },

      {
        numero: "asc",
      },
    ],

    include: {
      inscription: {
        select: {
          id: true,
          numero: true,

          apprenant: {
            select: {
              id: true,
              prenom: true,
              nom: true,
            },
          },

          session: {
            select: {
              id: true,
              code: true,
              nom: true,

              formation: {
                select: {
                  nom: true,
                },
              },
            },
          },
        },
      },

      facture: {
        select: {
          id: true,
          numero: true,
          total: true,
          statut: true,
        },
      },
    },
  });

  const totalEcheances = echeances.length;

  const montantTotal = echeances.reduce(
    (total, echeance) => total + Number(echeance.montant),
    0,
  );

  const montantPaye = echeances.reduce(
    (total, echeance) => total + Number(echeance.montantPaye),
    0,
  );

  const montantDu = echeances.reduce(
    (total, echeance) => total + Number(echeance.montantDu),
    0,
  );

  const echeancesPayees = echeances.filter(
    (echeance) => echeance.statut === "PAYEE",
  ).length;

  const echeancesEnRetard = echeances.filter(
    (echeance) => echeance.statut === "EN_RETARD",
  ).length;

  const echeancesPartielles = echeances.filter(
    (echeance) => echeance.statut === "PARTIELLE",
  ).length;

  const echeancesEnAttente = echeances.filter(
    (echeance) => echeance.statut === "EN_ATTENTE",
  ).length;

  const tauxPaiement =
    montantTotal > 0
      ? Math.min(100, Math.round((montantPaye / montantTotal) * 100))
      : 0;

  return (
    <div className="w-full space-y-6">
      {/* ===================================================== */}
      {/* EN-TÊTE */}
      {/* ===================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarClock className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Échéances de paiement
              </h1>

              <p className="text-sm text-muted-foreground">
                Suivez les échéances financières de vos inscriptions.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/factures"
          className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
        >
          <ReceiptText className="h-4 w-4" />
          Voir les factures
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* ===================================================== */}
      {/* RECHERCHE AUTOMATIQUE */}
      {/* ===================================================== */}

      <EcheancesSearch recherche={recherche} />

      {/* ===================================================== */}
      {/* STATISTIQUES */}
      {/* ===================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* TOTAL */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total échéances</p>

              <p className="mt-2 text-2xl font-bold">{totalEcheances}</p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <CalendarClock className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* PAYÉES */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Échéances payées</p>

              <p className="mt-2 text-2xl font-bold">{echeancesPayees}</p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* RETARD */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">En retard</p>

              <p className="mt-2 text-2xl font-bold">{echeancesEnRetard}</p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* PARTIELLES */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Paiements partiels
              </p>

              <p className="mt-2 text-2xl font-bold">{echeancesPartielles}</p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Clock3 className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================== */}
      {/* RÉSUMÉ FINANCIER */}
      {/* ===================================================== */}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Montant total</p>

          <p className="mt-2 text-xl font-bold">{formatMoney(montantTotal)}</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Montant encaissé</p>

          <p className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(montantPaye)}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Reste à payer</p>

            <span className="text-xs font-semibold">{tauxPaiement} %</span>
          </div>

          <p className="mt-2 text-xl font-bold text-red-600 dark:text-red-400">
            {formatMoney(montantDu)}
          </p>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${tauxPaiement}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ===================================================== */}
      {/* ÉTATS */}
      {/* ===================================================== */}

      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
          En attente : {echeancesEnAttente}
        </span>

        <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
          Partielles : {echeancesPartielles}
        </span>

        <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
          En retard : {echeancesEnRetard}
        </span>

        <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          Payées : {echeancesPayees}
        </span>
      </div>

      {/* ===================================================== */}
      {/* TABLEAU */}
      {/* ===================================================== */}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Liste des échéances</h2>

              <p className="text-sm text-muted-foreground">
                {totalEcheances} échéance
                {totalEcheances > 1 ? "s" : ""} trouvée
                {totalEcheances > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {echeances.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              {recherche ? (
                <SearchIcon />
              ) : (
                <CalendarClock className="h-7 w-7 text-muted-foreground" />
              )}
            </div>

            <h3 className="mt-4 text-lg font-semibold">
              {recherche ? "Aucun résultat" : "Aucune échéance"}
            </h3>

            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {recherche
                ? `Aucune échéance ne correspond à « ${recherche} ».`
                : "Aucun échéancier de paiement n'a encore été généré pour ce centre."}
            </p>

            {recherche ? (
              <Link
                href="/echeances"
                className="mt-5 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
              >
                Effacer la recherche
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/factures"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Consulter les factures
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Échéance</th>

                  <th className="px-5 py-3 font-medium">Apprenant</th>

                  <th className="px-5 py-3 font-medium">Formation</th>

                  <th className="px-5 py-3 font-medium">Facture</th>

                  <th className="px-5 py-3 font-medium">Date</th>

                  <th className="px-5 py-3 text-right font-medium">Montant</th>

                  <th className="px-5 py-3 text-right font-medium">Payé</th>

                  <th className="px-5 py-3 text-right font-medium">Reste</th>

                  <th className="px-5 py-3 font-medium">Statut</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {echeances.map((echeance) => {
                  const montant = Number(echeance.montant);

                  const montantPaye = Number(echeance.montantPaye);

                  const montantDu = Number(echeance.montantDu);

                  const progression =
                    montant > 0
                      ? Math.min(100, Math.round((montantPaye / montant) * 100))
                      : 0;

                  const StatutIcon = getStatutIcon(echeance.statut);

                  return (
                    <tr
                      key={echeance.id}
                      className="transition hover:bg-muted/30"
                    >
                      {/* ÉCHÉANCE */}
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold">
                            Échéance #{echeance.numero}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {echeance.inscription.numero}
                          </p>
                        </div>
                      </td>

                      {/* APPRENANT */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/inscriptions/${echeance.inscription.id}`}
                          className="group flex items-center gap-3"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <UserRound className="h-4 w-4" />
                          </div>

                          <div>
                            <p className="font-medium group-hover:text-primary">
                              {echeance.inscription.apprenant.prenom}{" "}
                              {echeance.inscription.apprenant.nom}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {echeance.inscription.numero}
                            </p>
                          </div>
                        </Link>
                      </td>

                      {/* FORMATION */}
                      <td className="px-5 py-4">
                        <p className="max-w-[220px] truncate font-medium">
                          {echeance.inscription.session.formation.nom}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {echeance.inscription.session.code}
                        </p>
                      </td>

                      {/* FACTURE */}
                      <td className="px-5 py-4">
                        {echeance.facture ? (
                          <Link
                            href={`/factures/${echeance.facture.id}`}
                            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                          >
                            <ReceiptText className="h-4 w-4" />

                            {echeance.facture.numero}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Aucune facture
                          </span>
                        )}
                      </td>

                      {/* DATE */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="h-4 w-4 text-muted-foreground" />

                          <span className="text-sm">
                            {formatDate(echeance.dateEcheance)}
                          </span>
                        </div>
                      </td>

                      {/* MONTANT */}
                      <td className="px-5 py-4 text-right">
                        <span className="font-semibold">
                          {formatMoney(montant)}
                        </span>
                      </td>

                      {/* PAYÉ */}
                      <td className="px-5 py-4 text-right">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {formatMoney(montantPaye)}
                        </span>
                      </td>

                      {/* RESTE */}
                      <td className="px-5 py-4 text-right">
                        <div>
                          <span
                            className={
                              montantDu > 0
                                ? "font-semibold text-red-600 dark:text-red-400"
                                : "font-semibold text-emerald-600 dark:text-emerald-400"
                            }
                          >
                            {formatMoney(montantDu)}
                          </span>

                          <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{
                                width: `${progression}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* STATUT */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatutClass(
                            echeance.statut,
                          )}`}
                        >
                          <StatutIcon className="h-3.5 w-3.5" />

                          {getStatutLabel(echeance.statut)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7 text-muted-foreground"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
