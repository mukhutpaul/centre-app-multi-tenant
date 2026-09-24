"use server"

import { prisma } from "@/lib/prisma"
import { getCurrentCentreContext } from "@/lib/validations/centre-access"

export async function getInscriptionsForPaiement() {
  const context = await getCurrentCentreContext()

  if (!context.centreId) {
    throw new Error("Aucun centre actif n'est associé à votre compte.")
  }

  const centreId = context.centreId

  return prisma.inscription.findMany({
    where: {
      session: {
        formation: {
          centreId,
        },
      },
      statut: {
        notIn: ["ANNULEE"],
      },
    },
    include: {
      apprenant: {
        select: {
          id: true,
          numero: true,
          nom: true,
          prenom: true,
        },
      },
      session: {
        include: {
          formation: {
            select: {
              id: true,
              code: true,
              nom: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        apprenant: {
          nom: "asc",
        },
      },
      {
        apprenant: {
          prenom: "asc",
        },
      },
    ],
  })
}

export async function getTarifsForInscription(
  inscriptionId: string
) {
  const context = await getCurrentCentreContext()

  if (!context.centreId) {
    throw new Error("Aucun centre actif n'est associé à votre compte.")
  }

  const centreId = context.centreId

  const inscription = await prisma.inscription.findFirst({
    where: {
      id: inscriptionId,
      session: {
        formation: {
          centreId,
        },
      },
    },
    select: {
      id: true,
      session: {
        select: {
          formationId: true,
        },
      },
    },
  })

  if (!inscription) {
    throw new Error("Inscription introuvable.")
  }

  const tarifs = await prisma.tarifFormation.findMany({
    where: {
      centreId,
      formationId: inscription.session.formationId,
      actif: true,
    },
    orderBy: [
      {
        type: "asc",
      },
      {
        nom: "asc",
      },
    ],
  })

  const result = await Promise.all(
    tarifs.map(async (tarif) => {
      const aggregate = await prisma.paiement.aggregate({
        where: {
          centreId,
          inscriptionId,
          tarifFormationId: tarif.id,
          type: "PAIEMENT_REGULIER",
          statut: "EFFECTUE",
        },
        _sum: {
          montant: true,
        },
      })

      const dejaPaye = aggregate._sum.montant ?? 0
      const reste = Number(tarif.montant) - Number(dejaPaye)

      return {
        id: tarif.id,
        nom: tarif.nom,
        description: tarif.description,
        type: tarif.type,
        montant: Number(tarif.montant),
        devise: tarif.devise,
        dejaPaye: Number(dejaPaye),
        reste: Math.max(0, reste),
      }
    })
  )

  return result
}

export async function getFacturesForReglement() {
  const context = await getCurrentCentreContext()

  if (!context.centreId) {
    throw new Error("Aucun centre actif n'est associé à votre compte.")
  }

  const centreId = context.centreId

  return prisma.facture.findMany({
    where: {
      centreId,
      conventionId: {
        not: undefined,
      },
      montantDu: {
        gt: 0,
      },
      statut: {
        not: "ANNULEE",
      },
    },
    include: {
      convention: {
        select: {
          id: true,
          numero: true,
          organisationNom: true,
          montant: true,
          devise: true,
        },
      },
      echeances: {
        where: {
          montantDu: {
            gt: 0,
          },
          statut: {
            not: "ANNULEE",
          },
        },
        orderBy: {
          numero: "asc",
        },
      },
    },
    orderBy: {
      dateEmission: "desc",
    },
  })
}

export async function getEcheancesForFacture(
  factureId: string
) {
  const context = await getCurrentCentreContext()

  if (!context.centreId) {
    throw new Error("Aucun centre actif n'est associé à votre compte.")
  }

  const centreId = context.centreId

  const facture = await prisma.facture.findFirst({
    where: {
      id: factureId,
      centreId,
    },
    select: {
      id: true,
    },
  })

  if (!facture) {
    throw new Error("Facture introuvable.")
  }

  return prisma.echeancePaiement.findMany({
    where: {
      centreId,
      factureId,
      montantDu: {
        gt: 0,
      },
      statut: {
        not: "ANNULEE",
      },
    },
    orderBy: {
      numero: "asc",
    },
  })
}