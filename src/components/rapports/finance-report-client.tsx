
"use client";

import {
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import {
  getFinanceReport,
  type FinanceReportParams,
} from "@/actions/finance-report.actions";

import FinanceApprenantVerification from "./finance-apprenant-verification";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  FileWarning,
  Landmark,
  Loader2,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  WalletCards,
  Users,
} from "lucide-react";

import { toast } from "sonner";

/* ============================================================
   TYPES
============================================================ */

type FinanceReport = Awaited<
  ReturnType<typeof getFinanceReport>
>;

type Props = {
  initialReport: FinanceReport;
};

/* ============================================================
   LABELS
============================================================ */

const MODE_LABELS: Record<string, string> = {
  ESPECES: "Espèces",
  VIREMENT: "Virement",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte",
  CHEQUE: "Chèque",
  AUTRE: "Autre",
};

const FACTURE_STATUS_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  EMISE: "Émise",
  PARTIELLEMENT_PAYEE: "Partiellement payée",
  PAYEE: "Payée",
  EN_RETARD: "En retard",
  ANNULEE: "Annulée",
};

const PAIEMENT_STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  EFFECTUE: "Effectué",
  ECHEC: "Échec",
  ANNULE: "Annulé",
  REMBOURSE: "Remboursé",
};

/* ============================================================
   HELPERS
============================================================ */

function money(
  value: string | number,
  devise: string,
) {
  const numericValue = Number(value);

  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(
    Number.isFinite(numericValue)
      ? numericValue
      : 0,
  )} ${devise}`;
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(
    "fr-FR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function getVariationColor(
  variation: number,
) {
  if (variation > 0) {
    return "text-success";
  }

  if (variation < 0) {
    return "text-error";
  }

  return "text-base-content/50";
}

function getVariationIcon(
  variation: number,
) {
  if (variation > 0) {
    return (
      <ArrowUpRight
        size={15}
      />
    );
  }

  if (variation < 0) {
    return (
      <ArrowDownRight
        size={15}
      />
    );
  }

  return null;
}

/* ============================================================
   KPI CARD
============================================================ */

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  variation,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  variation?: number;
}) {
  return (
    <div className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-base-content/60">
              {title}
            </p>

            <p className="mt-2 text-2xl font-black tracking-tight">
              {value}
            </p>

            {subtitle && (
              <p className="mt-1 text-xs text-base-content/50">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>
        </div>

        {variation !== undefined && (
          <div
            className={`mt-4 flex items-center gap-1 text-xs font-bold ${getVariationColor(
              variation,
            )}`}
          >
            {getVariationIcon(variation)}

            {Math.abs(variation).toFixed(1)} %

            <span className="font-normal text-base-content/50">
              vs période précédente
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   SECTION
============================================================ */

function Section({
  title,
  description,
  icon,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`card border border-base-300 bg-base-100 shadow-sm ${className}`}
    >
      <div className="card-body p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {icon}
              </div>
            )}

            <div>
              <h2 className="font-bold">
                {title}
              </h2>

              {description && (
                <p className="mt-1 text-xs text-base-content/50">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {children}
      </div>
    </section>
  );
}

/* ============================================================
   COMPONENT
============================================================ */

export default function FinanceReportClient({
  initialReport,
}: Props) {
  const [report, setReport] =
    useState(initialReport);

  const [isPending, startTransition] =
    useTransition();

  const [dateDebut, setDateDebut] =
    useState(
      initialReport.periode.dateDebut.slice(
        0,
        10,
      ),
    );

  const [dateFin, setDateFin] =
    useState(
      initialReport.periode.dateFin.slice(
        0,
        10,
      ),
    );

  const devise =
    report.centre.devise;

  /* ==========================================================
     RECHARGEMENT DU RAPPORT
  ========================================================== */

  function chargerRapport(
    params?: FinanceReportParams,
  ) {
    startTransition(async () => {
      try {
        const next =
          await getFinanceReport(
            params ?? {
              dateDebut,
              dateFin,
            },
          );

        setReport(next);

        toast.success(
          "Rapport financier actualisé.",
        );
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de charger le rapport.",
        );
      }
    });
  }

  /* ==========================================================
     PRESETS
  ========================================================== */

  function applyPreset(
    preset:
      | "mois"
      | "moisPrecedent"
      | "trimestre"
      | "annee",
  ) {
    const now = new Date();

    let start: Date;
    let end: Date;

    if (preset === "mois") {
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      );
    } else if (
      preset === "moisPrecedent"
    ) {
      start = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
      );
    } else if (
      preset === "trimestre"
    ) {
      const quarter = Math.floor(
        now.getMonth() / 3,
      );

      start = new Date(
        now.getFullYear(),
        quarter * 3,
        1,
      );

      end = new Date(
        now.getFullYear(),
        quarter * 3 + 3,
        0,
      );
    } else {
      start = new Date(
        now.getFullYear(),
        0,
        1,
      );

      end = new Date(
        now.getFullYear(),
        11,
        31,
      );
    }

    const startString =
      start
        .toISOString()
        .slice(0, 10);

    const endString =
      end
        .toISOString()
        .slice(0, 10);

    setDateDebut(startString);
    setDateFin(endString);

    chargerRapport({
      dateDebut: startString,
      dateFin: endString,
    });
  }

  /* ==========================================================
     STATISTIQUES
  ========================================================== */

  const taux = Number(
    report.resume.tauxRecouvrement,
  );

  const topFormation =
    report.formations[0];

  const topDebiteur =
    report.debiteurs[0];

  const totalModes = useMemo(
    () =>
      report.paiementsParMode.reduce(
        (sum, item) =>
          sum +
          Number(item.montant || 0),
        0,
      ),
    [report.paiementsParMode],
  );

  return (
    <div className="space-y-6 pb-10">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="rounded-3xl border border-base-300 bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-content shadow-lg">
                <WalletCards size={25} />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  Finance
                </p>

                <h1 className="text-2xl font-black md:text-3xl">
                  Rapports financiers
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-sm text-base-content/60">
              Vue consolidée de la
              facturation, des
              encaissements, des
              créances, des échéances
              et de la performance
              financière de{" "}
              <strong>
                {report.centre.nom}
              </strong>
              .
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() =>
                  applyPreset("mois")
                }
              >
                Ce mois
              </button>

              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() =>
                  applyPreset(
                    "moisPrecedent",
                  )
                }
              >
                Mois précédent
              </button>

              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() =>
                  applyPreset(
                    "trimestre",
                  )
                }
              >
                Trimestre
              </button>

              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() =>
                  applyPreset("annee")
                }
              >
                Année
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="date"
                className="input input-bordered input-sm"
                value={dateDebut}
                onChange={(event) =>
                  setDateDebut(
                    event.target.value,
                  )
                }
              />

              <input
                type="date"
                className="input input-bordered input-sm"
                value={dateFin}
                onChange={(event) =>
                  setDateFin(
                    event.target.value,
                  )
                }
              />

              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={isPending}
                onClick={() =>
                  chargerRapport()
                }
              >
                {isPending ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <RefreshCcw
                    size={16}
                  />
                )}

                Actualiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          KPIs
      ====================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total facturé"
          value={money(
            report.resume
              .totalFacture,
            devise,
          )}
          subtitle={`${report.resume.nombreFactures} facture(s)`}
          icon={
            <FileCheck2 size={22} />
          }
          variation={
            report.comparaison
              .facture.variation
          }
        />

        <KpiCard
          title="Encaissements"
          value={money(
            report.resume
              .totalNetEncaisse,
            devise,
          )}
          subtitle={`${report.resume.nombrePaiementsEffectues} paiement(s) effectué(s)`}
          icon={
            <CreditCard size={22} />
          }
          variation={
            report.comparaison
              .encaissement
              .variation
          }
        />

        <KpiCard
          title="Créances"
          value={money(
            report.resume
              .totalCreance,
            devise,
          )}
          subtitle="Montant restant à recouvrer"
          icon={
            <Landmark size={22} />
          }
        />

        <KpiCard
          title="En retard"
          value={money(
            report.resume
              .totalEnRetard,
            devise,
          )}
          subtitle={`${report.resume.nombreEcheancesEnRetard} échéance(s)`}
          icon={
            <AlertTriangle
              size={22}
            />
          }
        />
      </div>

      {/* ======================================================
          INDICATEURS SECONDAIRES
      ====================================================== */}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-base-300 bg-base-100 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-base-content/60">
              Taux de recouvrement
            </span>

            <TrendingUp
              size={19}
              className="text-success"
            />
          </div>

          <div className="mt-3 flex items-end gap-2">
            <span className="text-3xl font-black">
              {taux.toFixed(1)}%
            </span>
          </div>

          <progress
            className="progress progress-success mt-4 w-full"
            value={Math.min(
              Math.max(taux, 0),
              100,
            )}
            max="100"
          />

          <p className="mt-2 text-xs text-base-content/50">
            Part du montant facturé
            déjà couverte par les
            règlements.
          </p>
        </div>

        <div className="rounded-2xl border border-base-300 bg-base-100 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-base-content/60">
              Panier moyen
            </span>

            <CreditCard
              size={19}
              className="text-primary"
            />
          </div>

          <p className="mt-3 text-3xl font-black">
            {money(
              report.resume
                .panierMoyenPaiement,
              devise,
            )}
          </p>

          <p className="mt-2 text-xs text-base-content/50">
            Montant moyen par paiement
            effectué.
          </p>
        </div>

        <div className="rounded-2xl border border-base-300 bg-base-100 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-base-content/60">
              Remboursements
            </span>

            <TrendingDown
              size={19}
              className="text-warning"
            />
          </div>

          <p className="mt-3 text-3xl font-black">
            {money(
              report.resume
                .totalRembourse,
              devise,
            )}
          </p>

          <p className="mt-2 text-xs text-base-content/50">
            Montant des paiements
            marqués comme remboursés.
          </p>
        </div>
      </div>

      {/* ======================================================
          ÉVOLUTION
      ====================================================== */}

      <Section
        title="Évolution financière"
        description="Facturation et encaissements par mois sur la période sélectionnée."
        icon={
          <BarChart3 size={20} />
        }
      >
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-12 items-end gap-3">
              {report.evolution.map(
                (item) => {
                  const facture =
                    Number(
                      item.facture || 0,
                    );

                  const encaisse =
                    Number(
                      item.encaisse || 0,
                    );

                  const maximum =
                    Math.max(
                      facture,
                      encaisse,
                      1,
                    );

                  const factureHeight =
                    Math.max(
                      8,
                      (facture /
                        maximum) *
                        180,
                    );

                  const encaisseHeight =
                    Math.max(
                      8,
                      (encaisse /
                        maximum) *
                        180,
                    );

                  return (
                    <div
                      key={
                        item.periode
                      }
                      className="flex flex-col items-center"
                    >
                      <div className="flex h-[190px] items-end gap-1">
                        <div
                          className="w-5 rounded-t-md bg-primary transition-all"
                          style={{
                            height: `${factureHeight}px`,
                          }}
                          title={`Facturé : ${money(
                            item.facture,
                            devise,
                          )}`}
                        />

                        <div
                          className="w-5 rounded-t-md bg-success transition-all"
                          style={{
                            height: `${encaisseHeight}px`,
                          }}
                          title={`Encaissé : ${money(
                            item.encaisse,
                            devise,
                          )}`}
                        />
                      </div>

                      <span className="mt-2 text-[11px] text-base-content/50">
                        {item.libelle}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-5 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-primary" />
            Facturé
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-success" />
            Encaissé
          </div>
        </div>
      </Section>

      {/* ======================================================
          FACTURATION + MODES
      ====================================================== */}

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Factures par statut"
          description="Répartition des factures de la période."
          icon={
            <FileCheck2 size={20} />
          }
        >
          <div className="space-y-3">
            {report.facturesParStatut.map(
              (item) => (
                <div
                  key={item.statut}
                  className="flex items-center justify-between gap-4 rounded-xl border border-base-300 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-base-200 text-xs font-black">
                      {item.nombre}
                    </span>

                    <span className="text-sm font-semibold">
                      {FACTURE_STATUS_LABELS[
                        item.statut
                      ] ??
                        item.statut}
                    </span>
                  </div>

                  <span className="text-sm font-bold">
                    {money(
                      item.montant,
                      devise,
                    )}
                  </span>
                </div>
              ),
            )}

            {!report
              .facturesParStatut
              .length && (
              <p className="py-8 text-center text-sm text-base-content/50">
                Aucune facture sur
                cette période.
              </p>
            )}
          </div>
        </Section>

        <Section
          title="Encaissements par mode"
          description="Origine des règlements effectués et enregistrés."
          icon={
            <CreditCard size={20} />
          }
        >
          <div className="space-y-3">
            {report.paiementsParMode.map(
              (item) => {
                const montant =
                  Number(
                    item.montant || 0,
                  );

                const percent =
                  totalModes > 0
                    ? (montant /
                        totalModes) *
                      100
                    : 0;

                return (
                  <div
                    key={item.mode}
                    className="rounded-xl border border-base-300 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {MODE_LABELS[
                          item.mode
                        ] ??
                          item.mode}
                      </span>

                      <span className="text-sm font-black">
                        {money(
                          item.montant,
                          devise,
                        )}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                      <progress
                        className="progress progress-primary flex-1"
                        value={percent}
                        max="100"
                      />

                      <span className="w-12 text-right text-xs text-base-content/50">
                        {percent.toFixed(
                          0,
                        )}
                        %
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-base-content/50">
                      {item.nombre}{" "}
                      paiement(s)
                    </p>
                  </div>
                );
              },
            )}

            {!report
              .paiementsParMode
              .length && (
              <p className="py-8 text-center text-sm text-base-content/50">
                Aucun paiement sur
                cette période.
              </p>
            )}
          </div>
        </Section>
      </div>

      {/* ======================================================
          FORMATIONS
      ====================================================== */}

      <Section
        title="Performance par formation"
        description="Quelles formations génèrent le plus de facturation et d'encaissement ?"
        icon={
          <BarChart3 size={20} />
        }
      >
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Formation</th>

                <th className="text-right">
                  Facturé
                </th>

                <th className="text-right">
                  Encaissé
                </th>

                <th className="text-right">
                  Créance
                </th>

                <th className="text-right">
                  Factures
                </th>
              </tr>
            </thead>

            <tbody>
              {report.formations.map(
                (formation) => (
                  <tr
                    key={
                      formation.id
                    }
                    className="hover"
                  >
                    <td>
                      <div>
                        <p className="font-bold">
                          {
                            formation.nom
                          }
                        </p>

                        <p className="text-xs text-base-content/50">
                          {
                            formation.code
                          }
                        </p>
                      </div>
                    </td>

                    <td className="text-right font-semibold">
                      {money(
                        formation.facture,
                        devise,
                      )}
                    </td>

                    <td className="text-right font-semibold text-success">
                      {money(
                        formation.encaisse,
                        devise,
                      )}
                    </td>

                    <td className="text-right font-semibold text-warning">
                      {money(
                        formation.creance,
                        devise,
                      )}
                    </td>

                    <td className="text-right">
                      <span className="badge badge-ghost">
                        {
                          formation.nombreFactures
                        }
                      </span>
                    </td>
                  </tr>
                ),
              )}

              {!report.formations
                .length && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-base-content/50"
                  >
                    Aucune donnée de
                    formation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ======================================================
          DÉBITEURS + ÉCHÉANCES
      ====================================================== */}

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Principaux débiteurs"
          description="Apprenants présentant les créances les plus importantes."
          icon={
            <Users size={20} />
          }
        >
          <div className="space-y-3">
            {report.debiteurs.map(
              (
                debiteur,
                index,
              ) => (
                <div
                  key={
                    debiteur.inscriptionId ??
                    debiteur.apprenantId ??
                    index
                  }
                  className="flex items-center justify-between gap-4 rounded-xl border border-base-300 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-error/10 text-xs font-black text-error">
                      {index + 1}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-bold">
                        {
                          debiteur.nom
                        }
                      </p>

                      <p className="truncate text-xs text-base-content/50">
                        {debiteur.formation ??
                          "Formation non renseignée"}

                        {debiteur.numeroInscription &&
                          ` · ${debiteur.numeroInscription}`}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-black text-error">
                      {money(
                        debiteur.totalDu,
                        devise,
                      )}
                    </p>

                    <p className="text-xs text-base-content/50">
                      {
                        debiteur.nombreEcheances
                      }{" "}
                      échéance(s)
                    </p>
                  </div>
                </div>
              ),
            )}

            {!report.debiteurs
              .length && (
              <div className="rounded-xl border border-dashed border-base-300 p-8 text-center">
                <CheckCircle2
                  className="mx-auto text-success"
                  size={28}
                />

                <p className="mt-3 font-semibold">
                  Aucun débiteur
                </p>

                <p className="mt-1 text-xs text-base-content/50">
                  Aucune créance active
                  détectée.
                </p>
              </div>
            )}
          </div>
        </Section>

        <Section
          title="Échéances en retard"
          description="Les échéances qui nécessitent une action de recouvrement."
          icon={
            <CalendarClock
              size={20}
            />
          }
        >
          <div className="space-y-3">
            {report.echeancesEnRetard
              .slice(0, 8)
              .map((echeance) => (
                <div
                  key={
                    echeance.id
                  }
                  className="rounded-xl border border-error/20 bg-error/5 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold">
                        {
                          echeance.apprenant
                        }
                      </p>

                      <p className="mt-1 text-xs text-base-content/50">
                        Échéance #
                        {
                          echeance.numero
                        }

                        {" · "}

                        {formatDate(
                          echeance.dateEcheance,
                        )}
                      </p>
                    </div>

                    <span className="badge badge-error badge-outline">
                      {
                        echeance.joursRetard
                      }{" "}
                      j.
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-base-content/50">
                      Reste à payer
                    </span>

                    <span className="font-black text-error">
                      {money(
                        echeance.montantDu,
                        devise,
                      )}
                    </span>
                  </div>
                </div>
              ))}

            {!report
              .echeancesEnRetard
              .length && (
              <div className="rounded-xl border border-dashed border-base-300 p-8 text-center">
                <CheckCircle2
                  className="mx-auto text-success"
                  size={28}
                />

                <p className="mt-3 font-semibold">
                  Aucun retard
                </p>

                <p className="mt-1 text-xs text-base-content/50">
                  Toutes les échéances
                  sont à jour.
                </p>
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* ======================================================
          PROCHAINES ÉCHÉANCES
      ====================================================== */}

      <Section
        title="Prochaines échéances"
        description="Anticipation des encaissements à venir."
        icon={
          <CalendarClock
            size={20}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Apprenant</th>
                <th>Formation</th>
                <th>Date</th>

                <th className="text-right">
                  Montant dû
                </th>

                <th className="text-right">
                  Échéance
                </th>
              </tr>
            </thead>

            <tbody>
              {report.prochainesEcheances.map(
                (echeance) => (
                  <tr
                    key={
                      echeance.id
                    }
                    className="hover"
                  >
                    <td className="font-semibold">
                      {
                        echeance.apprenant
                      }
                    </td>

                    <td className="text-sm text-base-content/60">
                      {
                        echeance.formation ??
                        "-"
                      }
                    </td>

                    <td className="text-sm">
                      {formatDate(
                        echeance.dateEcheance,
                      )}
                    </td>

                    <td className="text-right font-black text-warning">
                      {money(
                        echeance.montantDu,
                        devise,
                      )}
                    </td>

                    <td className="text-right">
                      <span className="badge badge-warning badge-outline">
                        dans{" "}
                        {
                          echeance.joursAvantEcheance
                        }{" "}
                        j.
                      </span>
                    </td>
                  </tr>
                ),
              )}

              {!report
                .prochainesEcheances
                .length && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-base-content/50"
                  >
                    Aucune échéance
                    future à recouvrer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ======================================================
          CONTRÔLE FINANCIER
      ====================================================== */}

      <Section
        title="Contrôle et qualité financière"
        description="Cette section détecte les anomalies qui peuvent fausser les indicateurs."
        icon={
          <FileWarning
            size={20}
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-base-300 p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold">
                Paiements non affectés
              </p>

              <CreditCard
                size={19}
                className="text-warning"
              />
            </div>

            <p className="mt-3 text-3xl font-black">
              {
                report.controle
                  .paiementsNonAffectes
                  .nombre
              }
            </p>

            <p className="mt-1 text-xs text-base-content/50">
              {money(
                report.controle
                  .paiementsNonAffectes
                  .montant,
                devise,
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-base-300 p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold">
                Factures incohérentes
              </p>

              <AlertTriangle
                size={19}
                className="text-error"
              />
            </div>

            <p className="mt-3 text-3xl font-black">
              {
                report.controle
                  .facturesIncoherentes
                  .nombre
              }
            </p>

            <p className="mt-1 text-xs text-base-content/50">
              Écart détecté :{" "}
              {money(
                report.controle
                  .facturesIncoherentes
                  .ecart,
                devise,
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-base-300 p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold">
                Échéances incohérentes
              </p>

              <FileWarning
                size={19}
                className="text-error"
              />
            </div>

            <p className="mt-3 text-3xl font-black">
              {
                report.controle
                  .echeancesIncoherentes
                  .nombre
              }
            </p>

            <p className="mt-1 text-xs text-base-content/50">
              Écart détecté :{" "}
              {money(
                report.controle
                  .echeancesIncoherentes
                  .ecart,
                devise,
              )}
            </p>
          </div>
        </div>
      </Section>

      {/* ======================================================
          VÉRIFICATION FINANCIÈRE D'UN APPRENANT
      ====================================================== */}

      <FinanceApprenantVerification
        devise={devise}
      />

      {/* ======================================================
          SYNTHÈSE
      ====================================================== */}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp
                size={20}
              />
            </div>

            <div>
              <p className="font-bold">
                Meilleure formation
              </p>

              <p className="mt-1 text-sm">
                {topFormation
                  ? topFormation.nom
                  : "Aucune donnée"}
              </p>

              {topFormation && (
                <p className="mt-1 text-xs text-base-content/50">
                  {money(
                    topFormation.facture,
                    devise,
                  )}{" "}
                  facturés.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-error/20 bg-error/5 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
              <Users size={20} />
            </div>

            <div>
              <p className="font-bold">
                Plus grosse créance
              </p>

              <p className="mt-1 text-sm">
                {topDebiteur
                  ? topDebiteur.nom
                  : "Aucune donnée"}
              </p>

              {topDebiteur && (
                <p className="mt-1 text-xs text-base-content/50">
                  {money(
                    topDebiteur.totalDu,
                    devise,
                  )}{" "}
                  à recouvrer.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          ÉTAT DE CHARGEMENT
      ====================================================== */}

      {isPending && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-sm font-semibold shadow-xl">
          <Loader2
            size={17}
            className="animate-spin text-primary"
          />

          Actualisation du rapport...
        </div>
      )}
    </div>
  );
}