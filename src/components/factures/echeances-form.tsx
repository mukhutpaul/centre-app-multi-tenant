"use client"

import { Plus, Trash2 } from "lucide-react"

export type EcheanceFormItem = {
  dateEcheance: string
  montant: string
  notes: string
}

type Props = {
  echeances: EcheanceFormItem[]
  setEcheances: (
    value: EcheanceFormItem[]
  ) => void
  devise: string
  montantFacture: number
}

export function EcheancesForm({
  echeances,
  setEcheances,
  devise,
  montantFacture,
}: Props) {
  function ajouter() {
    setEcheances([
      ...echeances,
      {
        dateEcheance: "",
        montant: "",
        notes: "",
      },
    ])
  }

  function supprimer(index: number) {
    setEcheances(
      echeances.filter(
        (_, i) => i !== index
      )
    )
  }

  function modifier(
    index: number,
    field: keyof EcheanceFormItem,
    value: string
  ) {
    const copie = [...echeances]

    copie[index] = {
      ...copie[index],
      [field]: value,
    }

    setEcheances(copie)
  }

  const totalEcheances =
    echeances.reduce(
      (total, echeance) =>
        total +
        Number(echeance.montant || 0),
      0
    )

  const difference =
    montantFacture - totalEcheances

  const estValide =
    Math.abs(difference) < 0.01

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">
            Échéances
          </h3>

          <p className="text-sm text-muted-foreground">
            Définissez manuellement les dates et montants.
          </p>
        </div>

        <button
          type="button"
          onClick={ajouter}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      <div className="space-y-3">
        {echeances.map(
          (echeance, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-xl border p-4 md:grid-cols-[70px_1fr_180px_1fr_auto]"
            >
              <div>
                <label className="text-xs text-muted-foreground">
                  N°
                </label>

                <div className="mt-2 font-semibold">
                  {index + 1}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">
                  Date d'échéance
                </label>

                <input
                  type="date"
                  value={
                    echeance.dateEcheance
                  }
                  onChange={(event) =>
                    modifier(
                      index,
                      "dateEcheance",
                      event.target.value
                    )
                  }
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f5da8]"
                />
              </div>

              <div>
                <label className="text-xs font-medium">
                  Montant
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      echeance.montant
                    }
                    onChange={(event) =>
                      modifier(
                        index,
                        "montant",
                        event.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 pr-14 text-sm outline-none focus:ring-2 focus:ring-[#0f5da8]"
                  />

                  <span className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-xs text-muted-foreground">
                    {devise}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">
                  Note
                </label>

                <input
                  type="text"
                  value={
                    echeance.notes
                  }
                  onChange={(event) =>
                    modifier(
                      index,
                      "notes",
                      event.target.value
                    )
                  }
                  placeholder="Optionnel"
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f5da8]"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() =>
                    supprimer(index)
                  }
                  className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {echeances.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aucune échéance.
          <br />
          Cliquez sur « Ajouter » pour définir l'échéancier.
        </div>
      )}

      <div className="rounded-xl bg-muted/40 p-4">
        <div className="flex items-center justify-between text-sm">
          <span>
            Montant de la facture
          </span>

          <strong>
            {montantFacture.toLocaleString(
              "fr-FR"
            )}{" "}
            {devise}
          </strong>
        </div>

        <div className="mt-2 flex items-center justify-between text-sm">
          <span>
            Total des échéances
          </span>

          <strong>
            {totalEcheances.toLocaleString(
              "fr-FR"
            )}{" "}
            {devise}
          </strong>
        </div>

        <div className="my-3 border-t" />

        <div className="flex items-center justify-between">
          <span className="font-medium">
            Différence
          </span>

          <span
            className={
              estValide
                ? "font-bold text-emerald-600"
                : "font-bold text-red-600"
            }
          >
            {difference.toLocaleString(
              "fr-FR"
            )}{" "}
            {devise}
          </span>
        </div>

        {!estValide && (
          <p className="mt-2 text-xs text-red-600">
            Le total des échéances doit être exactement égal au montant de la facture.
          </p>
        )}
      </div>
    </div>
  )
}