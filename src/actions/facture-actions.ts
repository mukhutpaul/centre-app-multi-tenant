
"use server"

import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { getCurrentCentreContext } from "@/lib/validations/centre-access"
import { revalidatePath } from "next/cache"

type Result = {
  success: boolean
  message: string
  data?: unknown
}

/* =========================================================
   TYPES
========================================================= */

type FactureLigneInput = {
  description: string
  quantite: number | string
  prixUnitaire: number | string
}

type EcheanceInput = {
  dateEcheance: string | Date
  montant: number | string
  notes?: string | null
}

type CreateFactureInput = {
  conventionId: string
  numero?: string
  dateEmission?: string | Date
  dateEcheance?: string | Date | null
  remise?: number | string
  taxe?: number | string
  notes?: string | null
  lignes: FactureLigneInput[]
  echeances?: EcheanceInput[]
}

/* =========================================================
   CENTRE ACTIF
========================================================= */

async function getCentreId(): Promise<string> {
  const context = await getCurrentCentreContext()

  if (!context.centreId) {
    throw new Error(
      "Aucun centre actif n'est associé à votre compte."
    )
  }

  return context.centreId
}

/* =========================================================
   DECIMAL
========================================================= */

function dec(value: unknown): Prisma.Decimal {
  return new Prisma.Decimal(String(value ?? 0))
}

/* =========================================================
   SERIALISATION
========================================================= */

function serialize<T>(value: T): T {
  if (value instanceof Prisma.Decimal) {
    return value.toString() as T
  }

  if (value instanceof Date) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => serialize(item)) as T
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    const result: Record<string, unknown> = {}

    for (const [key, item] of Object.entries(
      value as Record<string, unknown>
    )) {
      result[key] = serialize(item)
    }

    return result as T
  }

  return value
}

/* =========================================================
   REFERENCE PAIEMENT
========================================================= */

async function generateReference(
  tx: Prisma.TransactionClient,
  centreId: string
): Promise<string> {
  const year = new Date().getFullYear()

  const last = await tx.paiement.findFirst({
    where: {
      centreId,
      reference: {
        startsWith: `PAY-${year}-`,
      },
    },

    orderBy: {
      reference: "desc",
    },

    select: {
      reference: true,
    },
  })

  let sequence = 1

  if (last?.reference) {
    const part = last.reference.split("-").pop()
    const number = Number(part)

    if (!Number.isNaN(number)) {
      sequence = number + 1
    }
  }

  return `PAY-${year}-${String(sequence).padStart(5, "0")}`
}

/* =========================================================
   CREATION FACTURE
========================================================= */

export async function createFacture(
  input: CreateFactureInput
): Promise<Result> {
  try {
    const centreId = await getCentreId()

    if (!input.conventionId) {
      return {
        success: false,
        message: "La convention est obligatoire.",
      }
    }

    if (
      !input.lignes ||
      input.lignes.length === 0
    ) {
      return {
        success: false,
        message:
          "La facture doit contenir au moins une ligne.",
      }
    }

    /* -----------------------------------------------------
       VALIDATION DES LIGNES
    ----------------------------------------------------- */

    const lignes = input.lignes.map(
      (ligne, index) => {
        const description =
          String(
            ligne.description ?? ""
          ).trim()

        const quantite = dec(
          ligne.quantite
        )

        const prixUnitaire = dec(
          ligne.prixUnitaire
        )

        if (!description) {
          throw new Error(
            `La description de la ligne ${index + 1} est obligatoire.`
          )
        }

        if (quantite.lte(0)) {
          throw new Error(
            `La quantité de la ligne ${index + 1} doit être supérieure à zéro.`
          )
        }

        if (prixUnitaire.lt(0)) {
          throw new Error(
            `Le prix de la ligne ${index + 1} ne peut pas être négatif.`
          )
        }

        const total =
          quantite.mul(prixUnitaire)

        return {
          description,
          quantite,
          prixUnitaire,
          total,
        }
      }
    )

    /* -----------------------------------------------------
       TRANSACTION
    ----------------------------------------------------- */

    const facture =
      await prisma.$transaction(
        async (tx) => {
          /* -------------------------------------------------
             1. VÉRIFIER LA CONVENTION
          ------------------------------------------------- */

          const convention =
            await tx.convention.findFirst({
              where: {
                id: input.conventionId,
                centreId,
              },
            })

          if (!convention) {
            throw new Error(
              "Convention introuvable ou non autorisée."
            )
          }

          /* -------------------------------------------------
             2. MONTANT DE LA CONVENTION
          ------------------------------------------------- */

          if (convention.montant.lte(0)) {
            throw new Error(
              "Cette convention ne peut pas être facturée car son montant est nul."
            )
          }

          /* -------------------------------------------------
             3. UNE SEULE FACTURE PAR CONVENTION
          ------------------------------------------------- */

          const factureExistante =
            await tx.facture.findFirst({
              where: {
                centreId,
                conventionId:
                  input.conventionId,
              },

              select: {
                id: true,
                numero: true,
              },
            })

          if (factureExistante) {
            throw new Error(
              `Une facture existe déjà pour cette convention (${factureExistante.numero}).`
            )
          }

          /* -------------------------------------------------
             4. NUMÉRO FACTURE
          ------------------------------------------------- */

          const numero =
            input.numero?.trim() ||
            `FAC-${new Date().getFullYear()}-${Date.now()}`

          const numeroExiste =
            await tx.facture.findFirst({
              where: {
                centreId,
                numero,
              },

              select: {
                id: true,
              },
            })

          if (numeroExiste) {
            throw new Error(
              `Le numéro de facture ${numero} existe déjà.`
            )
          }

          /* -------------------------------------------------
             5. CALCULS
          ------------------------------------------------- */

          const sousTotal =
            lignes.reduce(
              (total, ligne) =>
                total.add(ligne.total),
              dec(0)
            )

          const remise = dec(
            input.remise
          )

          const taxe = dec(
            input.taxe
          )

          if (remise.lt(0)) {
            throw new Error(
              "La remise ne peut pas être négative."
            )
          }

          if (taxe.lt(0)) {
            throw new Error(
              "La taxe ne peut pas être négative."
            )
          }

          if (remise.gt(sousTotal)) {
            throw new Error(
              "La remise ne peut pas être supérieure au sous-total."
            )
          }

          const total =
            sousTotal
              .sub(remise)
              .add(taxe)

          if (total.lt(0)) {
            throw new Error(
              "Le total de la facture ne peut pas être négatif."
            )
          }

          /* -------------------------------------------------
             6. LE TOTAL DOIT CORRESPONDRE À LA CONVENTION
          ------------------------------------------------- */

          if (
            !total.equals(
              convention.montant
            )
          ) {
            throw new Error(
              `Le total de la facture (${total.toString()}) doit être égal au montant de la convention (${convention.montant.toString()}).`
            )
          }

          /* -------------------------------------------------
             7. DATES
          ------------------------------------------------- */

          const dateEmission =
            input.dateEmission
              ? new Date(
                  input.dateEmission
                )
              : new Date()

          const dateEcheance =
            input.dateEcheance
              ? new Date(
                  input.dateEcheance
                )
              : null

          if (
            Number.isNaN(
              dateEmission.getTime()
            )
          ) {
            throw new Error(
              "La date d'émission est invalide."
            )
          }

          if (
            dateEcheance &&
            Number.isNaN(
              dateEcheance.getTime()
            )
          ) {
            throw new Error(
              "La date d'échéance est invalide."
            )
          }

          /* -------------------------------------------------
             8. CRÉATION FACTURE
          ------------------------------------------------- */

          const nouvelleFacture =
            await tx.facture.create({
              data: {
                centreId,

                conventionId:
                  input.conventionId,

                numero,

                dateEmission,
                dateEcheance,

                sousTotal,
                remise,
                taxe,
                total,

                montantPaye: dec(0),
                montantDu: total,

                statut: "EMISE",

                notes:
                  input.notes?.trim() ||
                  null,

                lignes: {
                  create: lignes,
                },
              },

              include: {
                lignes: true,
                convention: true,
              },
            })

          /* -------------------------------------------------
             9. ÉCHÉANCES
          ------------------------------------------------- */

          if (
            input.echeances &&
            input.echeances.length > 0
          ) {
            const echeances =
              input.echeances

            const totalEcheances =
              echeances.reduce(
                (
                  somme,
                  echeance
                ) =>
                  somme.add(
                    dec(
                      echeance.montant
                    )
                  ),
                dec(0)
              )

            if (
              !totalEcheances.equals(
                total
              )
            ) {
              throw new Error(
                `Le total des échéances (${totalEcheances.toString()}) doit être égal au total de la facture (${total.toString()}).`
              )
            }

            for (
              let i = 0;
              i < echeances.length;
              i++
            ) {
              const echeance =
                echeances[i]

              const montant =
                dec(
                  echeance.montant
                )

              const dateEcheance =
                new Date(
                  echeance.dateEcheance
                )

              if (montant.lte(0)) {
                throw new Error(
                  `Le montant de l'échéance ${i + 1} doit être supérieur à zéro.`
                )
              }

              if (
                Number.isNaN(
                  dateEcheance.getTime()
                )
              ) {
                throw new Error(
                  `La date de l'échéance ${i + 1} est invalide.`
                )
              }

              await tx.echeancePaiement.create(
                {
                  data: {
                    centreId,

                    factureId:
                      nouvelleFacture.id,

                    numero: i + 1,

                    dateEcheance,
                    montant,

                    montantPaye: dec(0),
                    montantDu: montant,

                    statut:
                      "EN_ATTENTE",

                    notes:
                      echeance.notes?.trim() ||
                      null,
                  },
                }
              )
            }
          }

          return nouvelleFacture
        }
      )

    /* -----------------------------------------------------
       REVALIDATION
    ----------------------------------------------------- */

    revalidatePath("/factures")
    revalidatePath("/factures/nouveau")
    revalidatePath("/echeances")
    revalidatePath("/paiements")

    return {
      success: true,
      message:
        "Facture créée avec succès.",
      data: serialize(facture),
    }
  } catch (error) {
    console.error(
      "Erreur createFacture:",
      error
    )

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de créer la facture.",
    }
  }
}

/* =========================================================
   LISTE DES PAIEMENTS
========================================================= */

export async function getPaiements(): Promise<Result> {
  try {
    const centreId =
      await getCentreId()

    const paiements =
      await prisma.paiement.findMany({
        where: {
          centreId,
        },

        include: {
          apprenant: {
            select: {
              id: true,
              nom: true,
              postnom: true,
              prenom: true,
            },
          },

          inscription: {
            select: {
              id: true,
              numero: true,

              apprenant: {
                select: {
                  id: true,
                  nom: true,
                  postnom: true,
                  prenom: true,
                },
              },
            },
          },

          facture: {
            select: {
              id: true,
              numero: true,
              total: true,
            },
          },

          echeance: {
            select: {
              id: true,
              numero: true,
              dateEcheance: true,
              montant: true,
            },
          },

          tarifFormation: {
            select: {
              id: true,
              nom: true,
              type: true,
              montant: true,
              devise: true,
            },
          },
        },

        orderBy: {
          creeLe: "desc",
        },
      })

    return {
      success: true,
      message:
        "Paiements récupérés.",
      data: serialize(paiements),
    }
  } catch (error) {
    console.error(
      "Erreur getPaiements:",
      error
    )

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les paiements.",
    }
  }
}

/* =========================================================
   DETAIL D'UN PAIEMENT
========================================================= */

export async function getPaiement(
  paiementId: string
): Promise<Result> {
  try {
    const centreId =
      await getCentreId()

    const paiement =
      await prisma.paiement.findFirst({
        where: {
          id: paiementId,
          centreId,
        },

        include: {
          apprenant: true,

          inscription: {
            include: {
              apprenant: true,

              session: {
                include: {
                  formation: true,
                },
              },
            },
          },

          tarifFormation: true,

          facture: {
            include: {
              echeances: {
                orderBy: {
                  numero: "asc",
                },
              },
            },
          },

          echeance: true,
        },
      })

    if (!paiement) {
      return {
        success: false,
        message:
          "Paiement introuvable.",
      }
    }

    return {
      success: true,
      message:
        "Paiement récupéré.",
      data: serialize(paiement),
    }
  } catch (error) {
    console.error(
      "Erreur getPaiement:",
      error
    )

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer le paiement.",
    }
  }
}

/* =========================================================
   LISTE DES FACTURES
========================================================= */

export async function getFactures(): Promise<Result> {
  try {
    const centreId =
      await getCentreId()

    console.log(
      "[getFactures] centreId:",
      centreId
    )

    const factures =
      await prisma.facture.findMany({
        where: {
          centreId,
        },

        include: {
          convention: {
            select: {
              id: true,
              numero: true,
              organisationNom: true,
              montant: true,
              devise: true,
              statut: true,
            },
          },

          lignes: {
            select: {
              id: true,
              description: true,
              quantite: true,
              prixUnitaire: true,
              total: true,
            },

            orderBy: {
              id: "asc",
            },
          },

          paiements: {
            where: {
              statut: "EFFECTUE",
            },

            select: {
              id: true,
              montant: true,
              devise: true,
              mode: true,
              datePaiement: true,
              reference: true,
            },

            orderBy: {
              datePaiement: "desc",
            },
          },

          echeances: {
            select: {
              id: true,
              numero: true,
              dateEcheance: true,
              montant: true,
              montantPaye: true,
              montantDu: true,
              statut: true,
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

    console.log(
      "[getFactures] nombre:",
      factures.length
    )

    return {
      success: true,
      message:
        "Factures récupérées.",
      data: serialize(factures),
    }
  } catch (error) {
    console.error(
      "=================================================="
    )
    console.error(
      "ERREUR getFactures"
    )
    console.error(
      error
    )
    console.error(
      "=================================================="
    )

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les factures.",
    }
  }
}


/* =========================================================
   DETAIL D'UNE FACTURE
========================================================= */


export async function getFacture(
  factureId: string
): Promise<Result> {
  try {
    const centreId = await getCentreId()

    if (!factureId) {
      return {
        success: false,
        message: "Identifiant de facture obligatoire.",
      }
    }

    const facture = await prisma.facture.findFirst({
      where: {
        id: factureId,
        centreId,
      },

      include: {
        // =====================================================
        // CONVENTION
        // =====================================================
        convention: {
          select: {
            id: true,
            numero: true,
            organisationNom: true,
            organisationAdresse: true,
            organisationEmail: true,
            organisationTelephone: true,
            organisationContact: true,
            dateDebut: true,
            dateFin: true,
            montant: true,
            devise: true,
            statut: true,
            dateSignature: true,
            observations: true,
          },
        },

        // =====================================================
        // LIGNES DE FACTURE
        // =====================================================
        lignes: {
          orderBy: {
            id: "asc",
          },
        },

        // =====================================================
        // ÉCHÉANCES
        // =====================================================
        echeances: {
          orderBy: {
            numero: "asc",
          },
        },

        // =====================================================
        // PAIEMENTS
        // =====================================================
        paiements: {
          orderBy: {
            creeLe: "desc",
          },

          include: {
            // -------------------------------------------------
            // APPRENANT
            // -------------------------------------------------
            apprenant: {
              select: {
                id: true,
                nom: true,
                prenom: true,
              },
            },

            // -------------------------------------------------
            // INSCRIPTION
            // -------------------------------------------------
            inscription: {
              select: {
                id: true,
                numero: true,
              },
            },

            // -------------------------------------------------
            // ÉCHÉANCE DU PAIEMENT
            // -------------------------------------------------
            echeance: {
              select: {
                id: true,
                numero: true,
                dateEcheance: true,
                montant: true,
                montantPaye: true,
                montantDu: true,
                statut: true,
              },
            },
          },
        },
      },
    })

    // =======================================================
    // FACTURE INTROUVABLE
    // =======================================================
    if (!facture) {
      return {
        success: false,
        message: "Facture introuvable.",
      }
    }

    // =======================================================
    // SUCCÈS
    // =======================================================
    return {
      success: true,
      message: "Facture récupérée.",
      data: serialize(facture),
    }
  } catch (error) {
    console.error("Erreur getFacture:", error)

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer la facture.",
    }
  }
}


/* =========================================================
   SUPPRESSION D'UNE FACTURE
========================================================= */

export async function deleteFacture(
  factureId: string
): Promise<Result> {
  try {
    const centreId = await getCentreId()

    if (!factureId) {
      return {
        success: false,
        message: "Identifiant de facture obligatoire.",
      }
    }

    /* -----------------------------------------------------
       TRANSACTION
    ----------------------------------------------------- */

    await prisma.$transaction(async (tx) => {
      /* ---------------------------------------------------
         1. VÉRIFIER LA FACTURE
      --------------------------------------------------- */

      const facture = await tx.facture.findFirst({
        where: {
          id: factureId,
          centreId,
        },

        include: {
          lignes: {
            select: {
              id: true,
            },
          },

          echeances: {
            select: {
              id: true,
            },
          },

          paiements: {
            select: {
              id: true,
            },
          },
        },
      })

      if (!facture) {
        throw new Error(
          "Facture introuvable ou non autorisée."
        )
      }

      /* ---------------------------------------------------
         2. EMPÊCHER LA SUPPRESSION SI DES PAIEMENTS EXISTENT
         ---------------------------------------------------

         Une facture qui possède déjà des paiements ne doit
         normalement pas être supprimée afin de préserver
         l'historique financier.
      --------------------------------------------------- */

      if (facture.paiements.length > 0) {
        throw new Error(
          "Cette facture ne peut pas être supprimée car elle possède déjà un ou plusieurs paiements."
        )
      }

      /* ---------------------------------------------------
         3. SUPPRIMER LES ÉCHÉANCES
      --------------------------------------------------- */

      if (facture.echeances.length > 0) {
        await tx.echeancePaiement.deleteMany({
          where: {
            factureId: facture.id,
            centreId,
          },
        })
      }

      /* ---------------------------------------------------
         4. SUPPRIMER LES LIGNES
      --------------------------------------------------- */

      if (facture.lignes.length > 0) {
        await tx.ligneFacture.deleteMany({
          where: {
            factureId: facture.id,
          },
        })
      }

      /* ---------------------------------------------------
         5. SUPPRIMER LA FACTURE
      --------------------------------------------------- */

      await tx.facture.delete({
        where: {
          id: facture.id,
        },
      })
    })

    /* -----------------------------------------------------
       REVALIDATION
    ----------------------------------------------------- */

    revalidatePath("/factures")
    revalidatePath("/factures/nouveau")
    revalidatePath("/echeances")
    revalidatePath("/paiements")

    return {
      success: true,
      message: "Facture supprimée avec succès.",
    }
  } catch (error) {
    console.error(
      "Erreur deleteFacture:",
      error
    )

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de supprimer la facture.",
    }
  }
}