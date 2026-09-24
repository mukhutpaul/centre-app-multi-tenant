"use server"

import { prisma } from "@/lib/prisma"

import { getCurrentCentreContext } from "@/lib/validations/centre-access"

export async function getDashboardFinancier() {
  const context = await getCurrentCentreContext()

  if (!context.centreId) {
    throw new Error(
      "Aucun centre actif n'est associé à votre compte."
    )
  }

  const centreId = context.centreId

  const maintenant = new Date()

  const debutJour = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    maintenant.getDate(),
    0,
    0,
    0,
    0
  )

  const finJour = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    maintenant.getDate(),
    23,
    59,
    59,
    999
  )

  const debutMois = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    1,
    0,
    0,
    0,
    0
  )

  const finMois = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  )

  /**
   * ==========================================================
   * 1. PAIEMENTS EFFECTUES DU CENTRE
   * ==========================================================
   */
  const paiementsEffectues =
    await prisma.paiement.findMany({
      where: {
        centreId,
        statut: "EFFECTUE",
      },
      select: {
        id: true,
        montant: true,
        type: true,
        mode: true,
        datePaiement: true,
        reference: true,

        tarifFormation: {
          select: {
            devise: true,
          },
        },

        facture: {
          select: {
            convention: {
              select: {
                devise: true,
              },
            },
          },
        },
      },

      orderBy: {
        datePaiement: "desc",
      },
    })

  /**
   * ==========================================================
   * 2. FONCTION DE DEVISE
   * ==========================================================
   */
  function getDevise(
    paiement: (typeof paiementsEffectues)[number]
  ) {
    if (paiement.type === "PAIEMENT_REGULIER") {
      return (
        paiement.tarifFormation?.devise ??
        "XAF"
      )
    }

    return (
      paiement.facture?.convention?.devise ??
      "XAF"
    )
  }

  /**
   * ==========================================================
   * 3. AGREGATION PAR DEVISE
   * ==========================================================
   */
  function aggregateByCurrency(
    paiements: typeof paiementsEffectues
  ) {
    const result: Record<
      string,
      number
    > = {}

    for (const paiement of paiements) {
      const devise =
        getDevise(paiement)

      result[devise] =
        (result[devise] ?? 0) +
        Number(paiement.montant)
    }

    return Object.entries(result).map(
      ([devise, montant]) => ({
        devise,
        montant,
      })
    )
  }

  /**
   * ==========================================================
   * 4. PAIEMENTS DU JOUR
   * ==========================================================
   */
  const paiementsJour =
    paiementsEffectues.filter(
      (paiement) => {
        if (!paiement.datePaiement) {
          return false
        }

        return (
          paiement.datePaiement >=
            debutJour &&
          paiement.datePaiement <=
            finJour
        )
      }
    )

  /**
   * ==========================================================
   * 5. PAIEMENTS DU MOIS
   * ==========================================================
   */
  const paiementsMois =
    paiementsEffectues.filter(
      (paiement) => {
        if (!paiement.datePaiement) {
          return false
        }

        return (
          paiement.datePaiement >=
            debutMois &&
          paiement.datePaiement <=
            finMois
        )
      }
    )

  /**
   * ==========================================================
   * 6. REPARTITION PAR TYPE
   * ==========================================================
   */
  const paiementsReguliers =
    paiementsEffectues.filter(
      (paiement) =>
        paiement.type ===
        "PAIEMENT_REGULIER"
    )

  const paiementsConventions =
    paiementsEffectues.filter(
      (paiement) =>
        paiement.type ===
        "REGLEMENT_FACTURE_CONVENTION"
    )

  /**
   * ==========================================================
   * 7. FACTURES
   * ==========================================================
   */
  const factures =
    await prisma.facture.findMany({
      where: {
        centreId,
      },

      select: {
        id: true,
        numero: true,
        total: true,
        montantPaye: true,
        montantDu: true,
        statut: true,
        dateEcheance: true,
        dateEmission: true,

        convention: {
          select: {
            organisationNom: true,
            numero: true,
            devise: true,
          },
        },
      },

      orderBy: {
        dateEmission: "desc",
      },
    })

  const facturesImpayees =
    factures.filter(
      (facture) =>
        Number(facture.montantDu) >
          0 &&
        facture.statut !==
          "ANNULEE"
    )

  /**
   * ==========================================================
   * 8. RESTE A RECOUVRER PAR DEVISE
   * ==========================================================
   */
  const resteFacturesParDevise: Record<
    string,
    number
  > = {}

  for (const facture of facturesImpayees) {
    const devise =
      facture.convention?.devise ??
      "XAF"

    resteFacturesParDevise[devise] =
      (resteFacturesParDevise[
        devise
      ] ?? 0) +
      Number(facture.montantDu)
  }

  /**
   * ==========================================================
   * 9. ECHEANCES EN RETARD
   * ==========================================================
   */
  const echeances =
    await prisma.echeancePaiement.findMany({
      where: {
        centreId,
        dateEcheance: {
          lt: maintenant,
        },
        montantDu: {
          gt: 0,
        },
        statut: {
          not: "ANNULEE",
        },
      },

      include: {
        facture: {
          select: {
            id: true,
            numero: true,

            convention: {
              select: {
                organisationNom: true,
                devise: true,
              },
            },
          },
        },
      },

      orderBy: {
        dateEcheance: "asc",
      },
    })

  /**
   * ==========================================================
   * 10. EVOLUTION 7 DERNIERS JOURS
   * ==========================================================
   */
  const evolution = []

  for (let i = 6; i >= 0; i--) {
    const date = new Date(
      maintenant.getFullYear(),
      maintenant.getMonth(),
      maintenant.getDate() - i
    )

    const debut = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0
    )

    const fin = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999
    )

    const paiementsJourEvolution =
      paiementsEffectues.filter(
        (paiement) => {
          if (
            !paiement.datePaiement
          ) {
            return false
          }

          return (
            paiement.datePaiement >=
              debut &&
            paiement.datePaiement <=
              fin
          )
        }
      )

    evolution.push({
      date:
        date.toISOString(),
      montants:
        aggregateByCurrency(
          paiementsJourEvolution
        ),
    })
  }

  /**
   * ==========================================================
   * 11. DERNIERS PAIEMENTS
   * ==========================================================
   */
  const derniersPaiements =
    await prisma.paiement.findMany({
      where: {
        centreId,
      },

      take: 10,

      orderBy: {
        creeLe: "desc",
      },

      include: {
        apprenant: {
          select: {
            nom: true,
            prenom: true,
          },
        },

        tarifFormation: {
          select: {
            nom: true,
            devise: true,
          },
        },

        facture: {
          select: {
            numero: true,

            convention: {
              select: {
                organisationNom: true,
                devise: true,
              },
            },
          },
        },
      },
    })

  /**
   * ==========================================================
   * 12. RETOUR
   * ==========================================================
   */
  return {
    aujourdHui: {
      total: aggregateByCurrency(
        paiementsJour
      ),
      nombre:
        paiementsJour.length,
    },

    mois: {
      total: aggregateByCurrency(
        paiementsMois
      ),
      nombre:
        paiementsMois.length,
    },

    regular: {
      total: aggregateByCurrency(
        paiementsReguliers
      ),
      nombre:
        paiementsReguliers.length,
    },

    conventions: {
      total: aggregateByCurrency(
        paiementsConventions
      ),
      nombre:
        paiementsConventions.length,
    },

    factures: {
      total: factures.length,
      impayees:
        facturesImpayees.length,

      reste: Object.entries(
        resteFacturesParDevise
      ).map(
        ([devise, montant]) => ({
          devise,
          montant,
        })
      ),
    },

    echeances: {
      enRetard:
        echeances.length,

      total: aggregateByCurrency(
        echeances.map(
          (echeance) => ({
            ...echeance,
            type:
              "REGLEMENT_FACTURE_CONVENTION",
            montant:
              echeance.montantDu,
            datePaiement: null,
            reference: "",
            tarifFormation: null,
            facture:
              echeance.facture,
          }) as any
        )
      ),
    },

    evolution,

    derniersPaiements:
      derniersPaiements.map(
        (paiement) => ({
          id: paiement.id,
          reference:
            paiement.reference,
          type: paiement.type,
          montant:
            Number(paiement.montant),
          statut:
            paiement.statut,
          mode:
            paiement.mode,
          datePaiement:
            paiement.datePaiement
              ?.toISOString() ?? null,

          devise:
            paiement.type ===
            "PAIEMENT_REGULIER"
              ? paiement
                  .tarifFormation
                  ?.devise ?? "XAF"
              : paiement
                  .facture
                  ?.convention
                  ?.devise ?? "XAF",

          objet:
            paiement.type ===
            "PAIEMENT_REGULIER"
              ? paiement
                  .tarifFormation
                  ?.nom ??
                "Paiement régulier"
              : paiement
                  .facture
                  ?.numero ??
                "Facture",

          beneficiaire:
            paiement.type ===
            "PAIEMENT_REGULIER"
              ? paiement
                  .apprenant
                  ? `${paiement.apprenant.nom} ${paiement.apprenant.prenom}`
                  : "Apprenant"
              : paiement
                  .facture
                  ?.convention
                  ?.organisationNom ??
                "Organisation",
        })
      ),
  }
}