import Link from "next/link"
import {
  Plus,
  FileText,
  Eye,
} from "lucide-react"

import { getFactures } from "@/actions/facture-actions"

function formatMoney(
  value: string | number,
  devise = "USD"
) {
  return `${Number(value).toLocaleString(
    "fr-FR"
  )} ${devise}`
}

function statutLabel(
  statut: string
) {
  switch (statut) {
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

export default async function FacturesPage() {
  const result = await getFactures()

  const factures = result.success
    ? ((result.data ?? []) as any[])
    : []

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Factures
          </h1>

          <p className="text-sm text-muted-foreground">
            Gestion des factures liées aux conventions.
          </p>
        </div>

        <Link
          href="/factures/nouveau"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f5da8] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nouvelle facture
        </Link>
      </div>

      {/* MESSAGE */}

      {!result.success && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {result.message}
        </div>
      )}

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">
                  Facture
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Convention
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Organisation
                </th>

                <th className="px-4 py-3 text-right font-semibold">
                  Total
                </th>

                <th className="px-4 py-3 text-right font-semibold">
                  Payé
                </th>

                <th className="px-4 py-3 text-right font-semibold">
                  Reste
                </th>

                <th className="px-4 py-3 text-center font-semibold">
                  Échéances
                </th>

                <th className="px-4 py-3 text-center font-semibold">
                  Statut
                </th>

                <th className="px-4 py-3 text-right font-semibold">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {factures.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    <FileText className="mx-auto mb-3 h-8 w-8 opacity-40" />

                    Aucune facture enregistrée.
                  </td>
                </tr>
              ) : (
                factures.map(
                  (facture) => (
                    <tr
                      key={facture.id}
                      className="transition hover:bg-muted/20"
                    >
                      <td className="px-4 py-4 font-medium">
                        {facture.numero}
                      </td>

                      <td className="px-4 py-4">
                        {facture.convention
                          ?.numero}
                      </td>

                      <td className="px-4 py-4">
                        {
                          facture.convention
                            ?.organisationNom
                        }
                      </td>

                      <td className="px-4 py-4 text-right font-medium">
                        {formatMoney(
                          facture.total,
                          facture.convention
                            ?.devise
                        )}
                      </td>

                      <td className="px-4 py-4 text-right text-emerald-600">
                        {formatMoney(
                          facture.montantPaye,
                          facture.convention
                            ?.devise
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-medium">
                        {formatMoney(
                          facture.montantDu,
                          facture.convention
                            ?.devise
                        )}
                      </td>

                      <td className="px-4 py-4 text-center">
                        {facture._count
                          ?.echeances ?? 0}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                          {statutLabel(
                            facture.statut
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/factures/${facture.id}`}
                          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition hover:bg-muted"
                        >
                          <Eye className="h-4 w-4" />
                          Voir
                        </Link>
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
  )
}