
import Link from "next/link"

import {
  Plus,
  FileText,
  Eye,
  Printer,
  Pencil,
  Trash2,
  Receipt,
  CalendarClock,
  ChevronRight,
} from "lucide-react"

import {
  getFactures,
  deleteFacture,
} from "@/actions/facture-actions"

/* =========================================================
   FORMATAGE MONÉTAIRE
========================================================= */

function formatMoney(
  value: string | number | null | undefined,
  devise = "USD"
) {
  return `${Number(value ?? 0).toLocaleString("fr-FR")} ${devise}`
}

/* =========================================================
   LIBELLÉ DU STATUT
========================================================= */

function statutLabel(statut: string) {
  switch (statut) {
    case "BROUILLON":
      return "Brouillon"

    case "EMISE":
      return "Émise"

    case "PARTIELLEMENT_PAYEE":
      return "Partiellement payée"

    case "PAYEE":
      return "Payée"

    case "ANNULEE":
      return "Annulée"

    case "EN_RETARD":
      return "En retard"

    default:
      return statut
  }
}

/* =========================================================
   PAGE FACTURES
========================================================= */

export default async function FacturesPage() {
  const result = await getFactures()

  const factures = result.success
    ? ((result.data ?? []) as any[])
    : []

  const totalFactures = factures.length

  const facturesPayees = factures.filter(
    (facture) => Number(facture.montantPaye ?? 0) >= Number(facture.total ?? 0)
  ).length

  const facturesNonPayees = factures.filter(
    (facture) => Number(facture.montantPaye ?? 0) <= 0
  ).length

  return (
    <div className="min-h-full space-y-6 bg-slate-50/50 p-4 md:p-6 lg:p-8">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

        <div className="space-y-1">

          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Receipt className="h-4 w-4" />
            Gestion financière
            <ChevronRight className="h-3.5 w-3.5" />
            Factures
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Factures
          </h1>

          <p className="text-sm text-slate-500">
            Gérez les factures liées aux conventions et suivez les paiements.
          </p>

        </div>

        <Link
          href="/factures/nouveau"
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0f5da8] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0c4f90] hover:shadow-md active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Nouvelle facture
        </Link>

      </div>

      {/* =====================================================
          MESSAGE ERREUR
      ===================================================== */}

      {!result.success && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          <FileText className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">
              Impossible de charger les factures
            </p>

            <p className="mt-1">
              {result.message}
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          MINI STATISTIQUES
      ===================================================== */}

      <div className="grid gap-4 sm:grid-cols-3">

        {/* TOTAL */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total factures
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {totalFactures}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#0f5da8]">
              <Receipt className="h-5 w-5" />
            </div>

          </div>

        </div>

        {/* PAYÉES */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Factures payées
              </p>

              <p className="mt-2 text-2xl font-bold text-emerald-600">
                {facturesPayees}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Receipt className="h-5 w-5" />
            </div>

          </div>

        </div>

        {/* NON PAYÉES */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                À traiter
              </p>

              <p className="mt-2 text-2xl font-bold text-amber-600">
                {facturesNonPayees}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <CalendarClock className="h-5 w-5" />
            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          TABLE CARD
      ===================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* ===================================================
            TABLE HEADER
        =================================================== */}

        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">

          <div>
            <h2 className="font-semibold text-slate-900">
              Liste des factures
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              {totalFactures} facture{totalFactures > 1 ? "s" : ""} enregistrée
              {totalFactures > 1 ? "s" : ""}
            </p>
          </div>

          <div className="text-xs text-slate-400">
            Faites défiler horizontalement sur petit écran
          </div>

        </div>

        {/* ===================================================
            TABLE
        =================================================== */}

        <div className="overflow-x-auto">

          <table className="min-w-[1250px] w-full text-sm">

            {/* =================================================
                HEADER
            ================================================= */}

            <thead>

              <tr className="border-b border-slate-200 bg-slate-50/80">

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Facture
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Convention
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Organisation
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Payé
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reste
                </th>

                <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Échéances
                </th>

                <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Statut
                </th>

                <th className="sticky right-0 z-20 min-w-[340px] border-l border-slate-200 bg-slate-50/95 px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm">
                  Actions
                </th>

              </tr>

            </thead>

            {/* =================================================
                BODY
            ================================================= */}

            <tbody className="divide-y divide-slate-100">

              {factures.length === 0 ? (

                <tr>

                  <td
                    colSpan={9}
                    className="px-5 py-16 text-center"
                  >

                    <div className="mx-auto flex max-w-sm flex-col items-center">

                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <FileText className="h-7 w-7" />
                      </div>

                      <h3 className="mt-4 font-semibold text-slate-800">
                        Aucune facture
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Aucune facture n'a encore été enregistrée.
                      </p>

                      <Link
                        href="/factures/nouveau"
                        className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0f5da8] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#0c4f90]"
                      >
                        <Plus className="h-4 w-4" />
                        Créer une facture
                      </Link>

                    </div>

                  </td>

                </tr>

              ) : (

                factures.map((facture) => {

                  const montantPaye = Number(
                    facture.montantPaye ?? 0
                  )

                  const montantTotal = Number(
                    facture.total ?? 0
                  )

                  const factureNonPayee =
                    montantPaye <= 0

                  const facturePayee =
                    montantPaye >= montantTotal &&
                    montantTotal > 0

                  return (
                    <tr
                      key={facture.id}
                      className="group transition-colors hover:bg-slate-50/80"
                    >

                      {/* =====================================
                          FACTURE
                      ===================================== */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0f5da8]">
                            <FileText className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">

                            <p className="font-semibold text-slate-800">
                              {facture.numero}
                            </p>

                            <p className="text-[11px] text-slate-400">
                              Facture
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* =====================================
                          CONVENTION
                      ===================================== */}

                      <td className="px-5 py-4">

                        <span className="font-medium text-slate-700">
                          {facture.convention?.numero || "—"}
                        </span>

                      </td>

                      {/* =====================================
                          ORGANISATION
                      ===================================== */}

                      <td className="max-w-[220px] px-5 py-4">

                        <p
                          className="truncate font-medium text-slate-700"
                          title={
                            facture.convention?.organisationNom ||
                            "—"
                          }
                        >
                          {facture.convention?.organisationNom || "—"}
                        </p>

                      </td>

                      {/* =====================================
                          TOTAL
                      ===================================== */}

                      <td className="px-5 py-4 text-right">

                        <span className="font-semibold text-slate-800">
                          {formatMoney(
                            facture.total,
                            facture.convention?.devise
                          )}
                        </span>

                      </td>

                      {/* =====================================
                          PAYÉ
                      ===================================== */}

                      <td className="px-5 py-4 text-right">

                        <span className="font-semibold text-emerald-600">
                          {formatMoney(
                            facture.montantPaye,
                            facture.convention?.devise
                          )}
                        </span>

                      </td>

                      {/* =====================================
                          RESTE
                      ===================================== */}

                      <td className="px-5 py-4 text-right">

                        <span
                          className={
                            montantPaye <= 0
                              ? "font-semibold text-amber-600"
                              : facturePayee
                                ? "font-semibold text-emerald-600"
                                : "font-semibold text-slate-700"
                          }
                        >
                          {formatMoney(
                            facture.montantDu,
                            facture.convention?.devise
                          )}
                        </span>

                      </td>

                      {/* =====================================
                          ÉCHÉANCES
                      ===================================== */}

                      <td className="px-5 py-4 text-center">

                        <span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                          {facture.echeances?.length ??
                            facture._count?.echeances ??
                            0}
                        </span>

                      </td>

                      {/* =====================================
                          STATUT
                      ===================================== */}

                      <td className="px-5 py-4 text-center">

                        <span
                          className={`
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-full
                            border
                            px-3
                            py-1.5
                            text-xs
                            font-semibold
                            ${
                              facturePayee
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : factureNonPayee
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-blue-200 bg-blue-50 text-blue-700"
                            }
                          `}
                        >

                          <span
                            className={`
                              h-1.5
                              w-1.5
                              rounded-full
                              ${
                                facturePayee
                                  ? "bg-emerald-500"
                                  : factureNonPayee
                                    ? "bg-amber-500"
                                    : "bg-blue-500"
                              }
                            `}
                          />

                          {statutLabel(facture.statut)}

                        </span>

                      </td>

                      {/* =================================================
                          ACTIONS
                      ================================================= */}

                      <td className="sticky right-0 z-10 min-w-[340px] border-l border-slate-200 bg-white px-5 py-4 shadow-[-8px_0_16px_rgba(15,23,42,0.05)] transition-colors group-hover:bg-slate-50">

                        <div className="flex items-center justify-end gap-1.5">

                          {/* VOIR */}

                          <Link
                            href={`/factures/${facture.id}`}
                            title="Voir la facture"
                            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          {/* MODIFIER */}

                          {factureNonPayee && (
                            <Link
                              href={`/factures/${facture.id}/modifier`}
                              title="Modifier la facture"
                              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-600 shadow-sm transition-all hover:bg-amber-100 hover:text-amber-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          )}

                          {/* IMPRIMER */}

                          <Link
                            href={`/factures/${facture.id}/imprimer`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Imprimer la facture"
                            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-blue-200 bg-blue-50 p-2 text-[#0f5da8] shadow-sm transition-all hover:bg-blue-100"
                          >
                            <Printer className="h-4 w-4" />
                          </Link>

                          {/* SUPPRIMER */}

                          {factureNonPayee && (
                            <form
                              action={async () => {
                                "use server"

                                await deleteFacture(
                                  facture.id
                                )
                              }}
                            >
                              <button
                                type="submit"
                                title="Supprimer la facture"
                                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-red-200 bg-red-50 p-2 text-red-500 shadow-sm transition-all hover:bg-red-100 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </form>
                          )}

                        </div>

                      </td>

                    </tr>
                  )
                })

              )}

            </tbody>

          </table>

        </div>

        {/* ===================================================
            FOOTER TABLE
        =================================================== */}

        {factures.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3">

            <p className="text-xs text-slate-500">
              {totalFactures} facture{totalFactures > 1 ? "s" : ""} au total
            </p>

          </div>
        )}

      </div>

    </div>
  )
}