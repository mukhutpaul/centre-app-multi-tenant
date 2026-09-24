
"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  createFacture,
} from "@/actions/facture-actions"

import {
  EcheancesForm,
  type EcheanceFormItem,
} from "./echeances-form"

type Convention = {
  id: string
  numero: string
  organisationNom: string
  montant: string
  devise: string
}

type Props = {
  conventions: Convention[]
}

export function FactureForm({
  conventions,
}: Props) {
  const router = useRouter()

  const [conventionId, setConventionId] =
    useState("")

  const [notes, setNotes] =
    useState("")

  const [dateEcheance, setDateEcheance] =
    useState("")

  const [echeances, setEcheances] =
    useState<EcheanceFormItem[]>([])

  const [loading, setLoading] =
    useState(false)

  const convention = useMemo(
    () =>
      conventions.find(
        (item) =>
          item.id === conventionId
      ),
    [conventions, conventionId]
  )

  const montantFacture =
    Number(convention?.montant ?? 0)

  async function submit(
    event: React.FormEvent
  ) {
    event.preventDefault()

    /* =====================================================
       VALIDATION CONVENTION
    ===================================================== */

    if (!convention) {
      toast.error(
        "Sélectionnez une convention."
      )
      return
    }

    if (montantFacture <= 0) {
      toast.error(
        "Cette convention ne peut pas être facturée car son montant est nul."
      )
      return
    }

    /* =====================================================
       VALIDATION ÉCHÉANCES
    ===================================================== */

    if (echeances.length === 0) {
      toast.error(
        "Ajoutez au moins une échéance."
      )
      return
    }

    const totalEcheances =
      echeances.reduce(
        (total, item) =>
          total +
          Number(item.montant || 0),
        0
      )

    if (
      Math.abs(
        totalEcheances -
          montantFacture
      ) > 0.01
    ) {
      toast.error(
        "Le total des échéances doit être égal au montant de la facture."
      )
      return
    }

    /* =====================================================
       VALIDATION DES ÉCHÉANCES
    ===================================================== */

    for (
      let index = 0;
      index < echeances.length;
      index++
    ) {
      const echeance =
        echeances[index]

      if (
        !echeance.dateEcheance
      ) {
        toast.error(
          `La date de l'échéance ${index + 1} est obligatoire.`
        )
        return
      }

      if (
        Number(echeance.montant || 0) <= 0
      ) {
        toast.error(
          `Le montant de l'échéance ${index + 1} doit être supérieur à zéro.`
        )
        return
      }
    }

    setLoading(true)

    try {
      /* ===================================================
         LIGNE DE FACTURE AUTOMATIQUE

         La facture est basée sur la convention.
         L'utilisateur n'a donc pas besoin de saisir
         manuellement une ligne.
      =================================================== */

      const lignes = [
        {
          description:
            `Formation - Convention ${convention.numero}`,
          quantite: 1,
          prixUnitaire:
            convention.montant,
        },
      ]

      /* ===================================================
         CRÉATION FACTURE
      =================================================== */

      const result =
        await createFacture({
          conventionId,

          lignes,

          dateEcheance:
            dateEcheance ||
            undefined,

          notes:
            notes.trim() ||
            undefined,

          echeances:
            echeances.map(
              (item) => ({
                dateEcheance:
                  item.dateEcheance,

                montant:
                  item.montant,

                notes:
                  item.notes ||
                  null,
              })
            ),
        })

      /* ===================================================
         ERREUR
      =================================================== */

      if (!result.success) {
        toast.error(
          result.message
        )
        return
      }

      /* ===================================================
         SUCCÈS
      =================================================== */

      toast.success(
        result.message
      )

      router.push(
        "/factures"
      )

      router.refresh()
    } catch (error) {
      console.error(
        "Erreur création facture:",
        error
      )

      toast.error(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de la création de la facture."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-6"
    >
      {/* =================================================
          CONVENTION
      ================================================= */}

      <div className="rounded-2xl border bg-background p-6 shadow-sm">
        <h2 className="text-lg font-semibold">
          Convention
        </h2>

        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">
              Convention
            </label>

            <select
              value={conventionId}
              onChange={(event) =>
                setConventionId(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0f5da8]"
              disabled={loading}
            >
              <option value="">
                Sélectionner une convention
              </option>

              {conventions.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.numero} —{" "}
                    {item.organisationNom} —{" "}
                    {Number(
                      item.montant
                    ).toLocaleString(
                      "fr-FR"
                    )}{" "}
                    {item.devise}
                  </option>
                )
              )}
            </select>
          </div>

          {convention && (
            <>
              <div className="rounded-xl bg-muted/40 p-4">
                <div className="text-xs text-muted-foreground">
                  Organisation
                </div>

                <div className="mt-1 font-semibold">
                  {
                    convention.organisationNom
                  }
                </div>
              </div>

              <div className="rounded-xl bg-muted/40 p-4">
                <div className="text-xs text-muted-foreground">
                  Montant de la convention
                </div>

                <div className="mt-1 text-lg font-bold">
                  {montantFacture.toLocaleString(
                    "fr-FR"
                  )}{" "}
                  {convention.devise}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* =================================================
          ÉCHÉANCES
      ================================================= */}

      {convention && (
        <div className="rounded-2xl border bg-background p-6 shadow-sm">
          <EcheancesForm
            echeances={echeances}
            setEcheances={
              setEcheances
            }
            devise={
              convention.devise
            }
            montantFacture={
              montantFacture
            }
          />
        </div>
      )}

      {/* =================================================
          INFORMATIONS
      ================================================= */}

      {convention && (
        <div className="rounded-2xl border bg-background p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Informations
          </h2>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">
                Date d'échéance globale
              </label>

              <input
                type="date"
                value={
                  dateEcheance
                }
                onChange={(event) =>
                  setDateEcheance(
                    event.target.value
                  )
                }
                disabled={loading}
                className="mt-2 w-full rounded-xl border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0f5da8]"
              />

              <p className="mt-1 text-xs text-muted-foreground">
                Cette date est facultative. Les
                échéances détaillées ci-dessus restent
                prioritaires pour le règlement.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">
                Notes
              </label>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                rows={3}
                disabled={loading}
                placeholder="Ajouter une note..."
                className="mt-2 w-full rounded-xl border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0f5da8]"
              />
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          RÉSUMÉ
      ================================================= */}

      {convention && (
        <div className="rounded-2xl border bg-muted/30 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Total de la facture
              </p>

              <p className="mt-1 text-2xl font-bold">
                {montantFacture.toLocaleString(
                  "fr-FR"
                )}{" "}
                {convention.devise}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                Total des échéances
              </p>

              <p
                className={`mt-1 text-lg font-semibold ${
                  Math.abs(
                    echeances.reduce(
                      (total, item) =>
                        total +
                        Number(
                          item.montant ||
                            0
                        ),
                      0
                    ) -
                      montantFacture
                  ) < 0.01
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {echeances
                  .reduce(
                    (total, item) =>
                      total +
                      Number(
                        item.montant ||
                          0
                      ),
                    0
                  )
                  .toLocaleString(
                    "fr-FR"
                  )}{" "}
                {convention.devise}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          ACTIONS
      ================================================= */}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() =>
            router.back()
          }
          disabled={loading}
          className="rounded-xl border px-5 py-3 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Annuler
        </button>

        <button
          type="submit"
          disabled={
            loading ||
            !convention
          }
          className="rounded-xl bg-[#0f5da8] px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Création..."
            : "Créer la facture"}
        </button>
      </div>
    </form>
  )
}

