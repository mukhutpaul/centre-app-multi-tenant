import { prisma } from "@/lib/prisma"

import ConventionsClient from "@/components/conventions/conventions-client"

export default async function ConventionsPage() {
  // =========================================================
  // CENTRE
  // =========================================================

  const centre = await prisma.centreFormation.findFirst({
    select: {
      id: true,
    },
  })

  if (!centre) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        Aucun centre de formation trouvé.
      </div>
    )
  }

  // =========================================================
  // CONVENTIONS
  // =========================================================

  const conventions = await prisma.convention.findMany({
    where: {
      centreId: centre.id,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      participants: {
        include: {
          inscription: {
            include: {
              apprenant: {
                select: {
                  prenom: true,
                  nom: true,
                },
              },
            },
          },
        },
      },
    },
  })

  // =========================================================
  // INSCRIPTIONS DISPONIBLES
  // =========================================================

  const inscriptions = await prisma.inscription.findMany({
    where: {
      session: {
        centreId: centre.id,
      },
    },

    orderBy: {
      creeLe: "desc",
    },

    include: {
      apprenant: {
        select: {
          prenom: true,
          nom: true,
          numero: true,
        },
      },

      session: {
        select: {
          nom: true,
          code: true,
        },
      },
    },
  })

  // =========================================================
  // TRANSFORMATION DES CONVENTIONS
  // =========================================================

  const conventionData = conventions.map((convention) => ({
    ...convention,

    montant: convention.montant.toString(),

    dateDebut: convention.dateDebut.toISOString(),

    dateFin: convention.dateFin.toISOString(),

    dateSignature: convention.dateSignature
      ? convention.dateSignature.toISOString()
      : null,

    participants: convention.participants.map((participant) => ({
      ...participant,

      montant: participant.montant
        ? participant.montant.toString()
        : null,
    })),
  }))

  // =========================================================
  // OPTIONS D'INSCRIPTIONS
  // =========================================================

  const inscriptionOptions = inscriptions.map((inscription) => {
    const apprenantNom =
      `${inscription.apprenant.prenom} ${inscription.apprenant.nom}`.trim()

    const numero =
      inscription.apprenant.numero
        ? ` — ${inscription.apprenant.numero}`
        : ""

    const sessionNom =
      inscription.session.nom ||
      inscription.session.code ||
      "Session sans nom"

    return {
      value: inscription.id,

      label: `${apprenantNom}${numero} — ${sessionNom}`,
    }
  })

  // =========================================================
  // RENDU
  // =========================================================

  return (
    <div className="p-4 sm:p-6">
      <ConventionsClient
        conventions={conventionData}
        inscriptions={inscriptionOptions}
      />
    </div>
  )
}