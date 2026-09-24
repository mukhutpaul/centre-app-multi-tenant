import Link from "next/link"
import {
  ArrowLeft,
  CreditCard,
  CalendarDays,
  Building2,
  FileText,
} from "lucide-react"

import { getFacture } from "@/actions/facture-actions"

function money(
  value: string | number,
  devise: string
) {
  return `${Number(value).toLocaleString(
    "fr-FR"
  )} ${devise}`
}

export default async function FactureDetailPage({
  params,
}: {
  params: Promise<{
    id: string
  }>
}) {
  const { id } = await params

  const result =
    await getFacture(id)

  if (!result.success) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-red-50 p-4 text-red-700">
          {result.message}
        </div>
      </div>
    )
  }

  const facture =
    result.data as any

  const devise =
    facture.convention?.devise ??
    "XAF"

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/factures"
            className="rounded-lg border p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />

              <h1 className="text-2xl font-bold">
                {facture.numero}
              </h1>
            </div>

            <p className="text-sm text-muted-foreground">
              Facture de convention
            </p>
          </div>
        </div>

        {Number(
          facture.montantDu
        ) > 0 && (
          <Link
            href={`/paiements/nouveau?type=REGLEMENT_FACTURE_CONVENTION&factureId=${facture.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f5da8] px-4 py-3 text-sm font-medium text-white"
          >
            <CreditCard className="h-4 w-4" />
            Enregistrer un règlement
          </Link>
        )}
      </div>

      {/* RESUME */}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border p-5">
          <div className="text-sm text-muted-foreground">
            Total
          </div>

          <div className="mt-2 text-xl font-bold">
            {money(
              facture.total,
              devise
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-5">
          <div className="text-sm text-muted-foreground">
            Payé
          </div>

          <div className="mt-2 text-xl font-bold text-emerald-600">
            {money(
              facture.montantPaye,
              devise
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-5">
          <div className="text-sm text-muted-foreground">
            Reste
          </div>

          <div className="mt-2 text-xl font-bold text-orange-600">
            {money(
              facture.montantDu,
              devise
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-5">
          <div className="text-sm text-muted-foreground">
            Statut
          </div>

          <div className="mt-2 font-semibold">
            {facture.statut}
          </div>
        </div>
      </div>

      {/* CONVENTION */}

      <div className="rounded-2xl border p-6">
        <div className="mb-5 flex items-center gap-2">
          <Building2 className="h-5 w-5" />

          <h2 className="text-lg font-semibold">
            Convention
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">
              Numéro
            </div>

            <div className="mt-1 font-medium">
              {
                facture.convention
                  ?.numero
              }
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">
              Organisation
            </div>

            <div className="mt-1 font-medium">
              {
                facture.convention
                  ?.organisationNom
              }
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">
              Montant convention
            </div>

            <div className="mt-1 font-medium">
              {money(
                facture.convention
                  ?.montant,
                devise
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ECHEANCES */}

      <div className="rounded-2xl border">
        <div className="border-b p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />

            <h2 className="font-semibold">
              Échéances
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-5 py-3 text-left">
                  N°
                </th>

                <th className="px-5 py-3 text-left">
                  Date
                </th>

                <th className="px-5 py-3 text-right">
                  Montant
                </th>

                <th className="px-5 py-3 text-right">
                  Payé
                </th>

                <th className="px-5 py-3 text-right">
                  Reste
                </th>

                <th className="px-5 py-3 text-center">
                  Statut
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {facture.echeances.map(
                (echeance: any) => (
                  <tr
                    key={
                      echeance.id
                    }
                  >
                    <td className="px-5 py-4">
                      {echeance.numero}
                    </td>

                    <td className="px-5 py-4">
                      {new Date(
                        echeance.dateEcheance
                      ).toLocaleDateString(
                        "fr-FR"
                      )}
                    </td>

                    <td className="px-5 py-4 text-right font-medium">
                      {money(
                        echeance.montant,
                        devise
                      )}
                    </td>

                    <td className="px-5 py-4 text-right text-emerald-600">
                      {money(
                        echeance.montantPaye,
                        devise
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {money(
                        echeance.montantDu,
                        devise
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="rounded-full bg-muted px-3 py-1 text-xs">
                        {
                          echeance.statut
                        }
                      </span>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAIEMENTS */}

      <div className="rounded-2xl border">
        <div className="border-b p-5">
          <h2 className="font-semibold">
            Règlements
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-5 py-3 text-left">
                  Référence
                </th>

                <th className="px-5 py-3 text-left">
                  Date
                </th>

                <th className="px-5 py-3 text-left">
                  Échéance
                </th>

                <th className="px-5 py-3 text-right">
                  Montant
                </th>

                <th className="px-5 py-3 text-left">
                  Mode
                </th>

                <th className="px-5 py-3 text-center">
                  Statut
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {facture.paiements.map(
                (paiement: any) => (
                  <tr
                    key={
                      paiement.id
                    }
                  >
                    <td className="px-5 py-4 font-medium">
                      {
                        paiement.reference
                      }
                    </td>

                    <td className="px-5 py-4">
                      {paiement.datePaiement
                        ? new Date(
                            paiement.datePaiement
                          ).toLocaleDateString(
                            "fr-FR"
                          )
                        : "-"}
                    </td>

                    <td className="px-5 py-4">
                      {paiement.echeance
                        ? `#${paiement.echeance.numero}`
                        : "-"}
                    </td>

                    <td className="px-5 py-4 text-right font-medium">
                      {money(
                        paiement.montant,
                        devise
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {
                        paiement.mode
                      }
                    </td>

                    <td className="px-5 py-4 text-center">
                      {
                        paiement.statut
                      }
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}