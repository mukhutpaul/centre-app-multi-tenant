import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { getCurrentCentreContext } from "@/lib/validations/centre-access"

import { FactureForm } from "@/components/factures/facture-form"

export default async function NouvelleFacturePage() {
  const context = await getCurrentCentreContext()

  if (!context.centreId) {
    redirect("/dashboard")
  }

  const centreId = context.centreId

  const conventions = await prisma.convention.findMany({
    where: {
      centreId,

      // Une facture n'est créée que pour
      // une convention avec un montant > 0
      montant: {
        gt: 0,
      },

      // Une seule facture par convention
      factures: {
        none: {},
      },
    },

    select: {
      id: true,
      numero: true,
      organisationNom: true,
      montant: true,
      devise: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  })

  const serialized = conventions.map((convention) => ({
    ...convention,
    montant: convention.montant.toString(),
  }))

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">
          Nouvelle facture
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Créez une facture à partir d'une convention dont
          le montant est supérieur à zéro.
        </p>
      </div>

      {serialized.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <p className="font-medium">
            Aucune convention disponible.
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            Une convention doit avoir un montant supérieur
            à zéro et ne pas avoir déjà de facture.
          </p>
        </div>
      ) : (
        <FactureForm
          conventions={serialized}
        />
      )}
    </div>
  )
}