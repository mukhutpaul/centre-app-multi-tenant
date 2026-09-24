import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CreditCard,
  FileWarning,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react"

import {
  getDashboardFinancier,
} from "@/actions/dashboard-financier-actions"

export default async function FinancePage() {
  const data =
    await getDashboardFinancier()

  return (
    <div className="space-y-6 p-6">

      {/* ======================================================
          HEADER
      ====================================================== */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
          <Wallet className="h-4 w-4" />
          Finance
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Tableau de bord financier
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Vue globale des encaissements, factures et échéances du centre.
        </p>
      </div>

      {/* ======================================================
          KPI
      ====================================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <FinancialCard
          title="Encaissements aujourd'hui"
          icon={
            <ArrowDownLeft className="h-5 w-5" />
          }
          values={data.aujourdHui.total}
          subtitle={`${data.aujourdHui.nombre} opération(s)`}
        />

        <FinancialCard
          title="Encaissements du mois"
          icon={
            <TrendingUp className="h-5 w-5" />
          }
          values={data.mois.total}
          subtitle={`${data.mois.nombre} opération(s)`}
        />

        <FinancialCard
          title="Factures impayées"
          icon={
            <FileWarning className="h-5 w-5" />
          }
          values={data.factures.reste}
          subtitle={`${data.factures.impayees} facture(s)`}
          danger
        />

        <FinancialCard
          title="Échéances en retard"
          icon={
            <CalendarClock className="h-5 w-5" />
          }
          values={data.echeances.total}
          subtitle={`${data.echeances.enRetard} échéance(s)`}
          danger
        />
      </div>

      {/* ======================================================
          REPARTITION
      ====================================================== */}
      <div className="grid gap-6 lg:grid-cols-2">

        <FinancialDistribution
          title="Paiements réguliers"
          description="Formation, inscription, brevet, certification..."
          icon={
            <CreditCard className="h-5 w-5" />
          }
          values={data.regular.total}
          count={data.regular.nombre}
        />

        <FinancialDistribution
          title="Règlements de conventions"
          description="Paiements liés aux factures des conventions."
          icon={
            <Receipt className="h-5 w-5" />
          }
          values={data.conventions.total}
          count={data.conventions.nombre}
        />
      </div>

      {/* ======================================================
          EVOLUTION
      ====================================================== */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <TrendingUp className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Évolution des encaissements
            </h2>

            <p className="text-sm text-slate-500">
              Sept derniers jours.
            </p>
          </div>
        </div>

        <EvolutionChart
          evolution={data.evolution}
        />
      </section>

      {/* ======================================================
          DERNIERS PAIEMENTS
      ====================================================== */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="border-b border-slate-200 p-6 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Wallet className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Dernières opérations
              </h2>

              <p className="text-sm text-slate-500">
                Les dernières opérations financières enregistrées.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950">
              <tr>
                <th className="px-6 py-4 font-semibold">
                  Référence
                </th>

                <th className="px-6 py-4 font-semibold">
                  Bénéficiaire
                </th>

                <th className="px-6 py-4 font-semibold">
                  Objet
                </th>

                <th className="px-6 py-4 font-semibold">
                  Montant
                </th>

                <th className="px-6 py-4 font-semibold">
                  Mode
                </th>

                <th className="px-6 py-4 font-semibold">
                  Statut
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.derniersPaiements.map(
                (paiement) => (
                  <tr
                    key={paiement.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-6 py-4">
                      <a
                        href={`/paiements/${paiement.id}`}
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        {paiement.reference}
                      </a>

                      {paiement.datePaiement && (
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(
                            paiement.datePaiement
                          )}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {paiement.beneficiaire}
                    </td>

                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {paiement.objet}
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {formatMoney(
                        paiement.montant,
                        paiement.devise
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {formatMode(
                        paiement.mode
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge
                        status={
                          paiement.statut
                        }
                      />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ======================================================
          ALERTES
      ====================================================== */}
      <div className="grid gap-6 lg:grid-cols-2">

        <AlertCard
          title="Factures à recouvrer"
          icon={
            <FileWarning className="h-5 w-5" />
          }
          count={
            data.factures.impayees
          }
          description="facture(s) présentent encore un montant dû."
        />

        <AlertCard
          title="Échéances en retard"
          icon={
            <AlertTriangle className="h-5 w-5" />
          }
          count={
            data.echeances.enRetard
          }
          description="échéance(s) ont dépassé leur date prévue."
        />
      </div>
    </div>
  )
}

/* ============================================================
   FINANCIAL CARD
============================================================ */

function FinancialCard({
  title,
  icon,
  values,
  subtitle,
  danger = false,
}: {
  title: string
  icon: React.ReactNode
  values: {
    devise: string
    montant: number
  }[]
  subtitle: string
  danger?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 ${
        danger
          ? "border-red-100 dark:border-red-900/30"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            danger
              ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
              : "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
          }`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        {title}
      </p>

      <div className="mt-2 space-y-1">
        {values.length ? (
          values.map((item) => (
            <p
              key={item.devise}
              className="text-xl font-bold text-slate-900 dark:text-white"
            >
              {formatMoney(
                item.montant,
                item.devise
              )}
            </p>
          ))
        ) : (
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            0
          </p>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {subtitle}
      </p>
    </div>
  )
}

/* ============================================================
   DISTRIBUTION
============================================================ */

function FinancialDistribution({
  title,
  description,
  icon,
  values,
  count,
}: {
  title: string
  description: string
  icon: React.ReactNode
  values: {
    devise: string
    montant: number
  }[]
  count: number
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
          {icon}
        </div>

        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {values.length ? (
          values.map((item) => (
            <div
              key={item.devise}
              className="flex items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-950"
            >
              <span className="text-sm text-slate-500">
                {item.devise}
              </span>

              <span className="font-bold text-slate-900 dark:text-white">
                {formatMoney(
                  item.montant,
                  item.devise
                )}
              </span>
            </div>
          ))
        ) : (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950">
            Aucun encaissement.
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        {count} opération(s)
      </p>
    </section>
  )
}

/* ============================================================
   EVOLUTION
============================================================ */

function EvolutionChart({
  evolution,
}: {
  evolution: {
    date: string
    montants: {
      devise: string
      montant: number
    }[]
  }[]
}) {
  const devises = Array.from(
    new Set(
      evolution.flatMap(
        (jour) =>
          jour.montants.map(
            (item) => item.devise
          )
      )
    )
  )

  if (!devises.length) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500 dark:bg-slate-950">
        Aucune donnée disponible.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {devises.map((devise) => {
        const values =
          evolution.map((jour) => {
            const item =
              jour.montants.find(
                (value) =>
                  value.devise ===
                  devise
              )

            return item?.montant ?? 0
          })

        const max = Math.max(
          ...values,
          1
        )

        return (
          <div key={devise}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {devise}
              </span>

              <span className="text-xs text-slate-500">
                7 derniers jours
              </span>
            </div>

            <div className="flex h-48 items-end gap-2">
              {values.map(
                (value, index) => {
                  const height =
                    Math.max(
                      4,
                      (value / max) *
                        100
                    )

                  return (
                    <div
                      key={index}
                      className="group flex flex-1 flex-col items-center justify-end gap-2"
                    >
                      <span className="hidden text-[10px] font-medium text-slate-500 group-hover:block">
                        {formatMoney(
                          value,
                          devise
                        )}
                      </span>

                      <div
                        className="w-full rounded-t-lg bg-blue-600 transition-all hover:bg-blue-700"
                        style={{
                          height: `${height}%`,
                        }}
                      />

                      <span className="text-[10px] text-slate-400">
                        {formatShortDate(
                          evolution[
                            index
                          ].date
                        )}
                      </span>
                    </div>
                  )
                }
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ============================================================
   ALERT
============================================================ */

function AlertCard({
  title,
  icon,
  count,
  description,
}: {
  title: string
  icon: React.ReactNode
  count: number
  description: string
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/30 dark:bg-amber-950/20">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm dark:bg-slate-900">
          {icon}
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>

          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
            {count}
          </p>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   HELPERS
============================================================ */

function formatMoney(
  montant: number,
  devise: string
) {
  return `${montant.toLocaleString(
    "fr-FR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )} ${devise}`
}

function formatDate(
  date: string
) {
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(date))
}

function formatShortDate(
  date: string
) {
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      weekday: "short",
      day: "2-digit",
    }
  ).format(new Date(date))
}

function formatMode(
  mode: string
) {
  const labels: Record<
    string,
    string
  > = {
    ESPECES: "Espèces",
    VIREMENT: "Virement",
    MOBILE_MONEY: "Mobile Money",
    CARTE: "Carte",
    CHEQUE: "Chèque",
    AUTRE: "Autre",
  }

  return labels[mode] ?? mode
}

function formatStatus(
  status: string
) {
  const labels: Record<
    string,
    string
  > = {
    EFFECTUE: "Effectué",
    EN_ATTENTE: "En attente",
    ECHEC: "Échec",
    ANNULE: "Annulé",
    REMBOURSE: "Remboursé",
  }

  return labels[status] ?? status
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  const classes: Record<
    string,
    string
  > = {
    EFFECTUE:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",

    EN_ATTENTE:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",

    ECHEC:
      "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",

    ANNULE:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",

    REMBOURSE:
      "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        classes[status] ??
        "bg-slate-100 text-slate-600"
      }`}
    >
      {formatStatus(status)}
    </span>
  )
}