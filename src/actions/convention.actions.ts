"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getCurrentCentreContext } from "@/lib/validations/centre-access"
import { Prisma } from "@/generated/prisma/client"

import {
  conventionSchema,
} from "@/lib/validations/convention.schema"

type ActionResult = {
  success: boolean
  message: string
  data?: unknown
}

/* =========================================================
   HELPERS
========================================================= */

/**
 * Nettoie une valeur optionnelle.
 */
function cleanOptional(value: string | undefined) {
  if (!value || value.trim() === "") {
    return null
  }

  return value.trim()
}

/**
 * Transforme une date venant du formulaire
 * en véritable Date Prisma.
 */
function parseDate(
  value: string,
  fieldName: string
) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `La date "${fieldName}" est invalide.`
    )
  }

  return date
}

/**
 * Transforme récursivement les Decimal Prisma
 * en string pour pouvoir les transmettre
 * proprement aux Client Components.
 *
 * Les Date sont conservées.
 */
function serializeForClient<T>(value: T): T {
  if (value instanceof Prisma.Decimal) {
    return value.toString() as T
  }

  if (value instanceof Date) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      serializeForClient(item)
    ) as T
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    const result: Record<string, unknown> = {}

    for (const [key, item] of Object.entries(
      value as Record<string, unknown>
    )) {
      result[key] = serializeForClient(item)
    }

    return result as T
  }

  return value
}

/**
 * Récupère le centre actuellement actif.
 *
 * IMPORTANT :
 * getCurrentCentreContext() retourne un objet
 * de contexte et NON directement un centreId.
 */
async function getCentreId() {
  const context =
    await getCurrentCentreContext()

  if (!context.centreId) {
    throw new Error(
      "Aucun centre actif n'est associé à votre compte."
    )
  }

  return context.centreId
}

/**
 * Vérifie que toutes les inscriptions sélectionnées
 * appartiennent bien au centre connecté.
 */
async function validateInscriptions(
  inscriptionIds: string[],
  centreId: string
) {
  if (inscriptionIds.length === 0) {
    return
  }

  /*
   * Évite qu'un même participant soit envoyé
   * plusieurs fois dans le formulaire.
   */
  const uniqueIds = [
    ...new Set(inscriptionIds),
  ]

  if (uniqueIds.length !== inscriptionIds.length) {
    throw new Error(
      "Une même inscription ne peut pas être ajoutée plusieurs fois à la convention."
    )
  }

  const inscriptions =
    await prisma.inscription.findMany({
      where: {
        id: {
          in: uniqueIds,
        },

        session: {
          centreId,
        },
      },

      select: {
        id: true,
      },
    })

  if (
    inscriptions.length !== uniqueIds.length
  ) {
    throw new Error(
      "Une ou plusieurs inscriptions sélectionnées ne sont pas accessibles depuis votre centre."
    )
  }
}

/* =========================================================
   CRÉATION
========================================================= */

export async function createConvention(
  values: unknown
): Promise<ActionResult> {
  try {
    /* -----------------------------------------
       VALIDATION FORMULAIRE
    ----------------------------------------- */

    const data =
      conventionSchema.parse(values)

    /* -----------------------------------------
       CENTRE ACTIF
    ----------------------------------------- */

    const centreId =
      await getCentreId()

    /* -----------------------------------------
       DONNÉES NORMALISÉES
    ----------------------------------------- */

    const numero =
      data.numero.trim()

    /* -----------------------------------------
       VÉRIFICATION NUMÉRO
    ----------------------------------------- */

    const existing =
      await prisma.convention.findFirst({
        where: {
          centreId,
          numero,
        },

        select: {
          id: true,
        },
      })

    if (existing) {
      return {
        success: false,
        message:
          "Ce numéro de convention existe déjà.",
      }
    }

    /* -----------------------------------------
       VÉRIFICATION INSCRIPTIONS
    ----------------------------------------- */

    await validateInscriptions(
      data.inscriptionIds,
      centreId
    )

    /* -----------------------------------------
       CRÉATION
    ----------------------------------------- */

    const convention =
      await prisma.convention.create({
        data: {
          centreId,

          numero,

          organisationNom:
            data.organisationNom.trim(),

          organisationAdresse:
            cleanOptional(
              data.organisationAdresse
            ),

          organisationEmail:
            cleanOptional(
              data.organisationEmail
            ),

          organisationTelephone:
            cleanOptional(
              data.organisationTelephone
            ),

          organisationContact:
            cleanOptional(
              data.organisationContact
            ),

          dateDebut:
            parseDate(
              data.dateDebut,
              "date de début"
            ),

          dateFin:
            parseDate(
              data.dateFin,
              "date de fin"
            ),

          montant:
            data.montant,

          devise:
            data.devise.toUpperCase(),

          statut:
            data.statut,

          dateSignature:
            data.dateSignature
              ? parseDate(
                  data.dateSignature,
                  "date de signature"
                )
              : null,

          observations:
            cleanOptional(
              data.observations
            ),

          participants:
            data.inscriptionIds.length > 0
              ? {
                  create:
                    data.inscriptionIds.map(
                      (inscriptionId) => ({
                        inscriptionId,
                      })
                    ),
                }
              : undefined,
        },

        include: {
          participants: true,
        },
      })

    /* -----------------------------------------
       CACHE
    ----------------------------------------- */

    revalidatePath(
      "/conventions"
    )

    /* -----------------------------------------
       RETOUR
    ----------------------------------------- */

    return {
      success: true,

      message:
        "Convention créée avec succès.",

      data: serializeForClient(
        convention
      ),
    }
  } catch (error) {
    console.error(
      "createConvention:",
      error
    )

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message:
          error.issues[0]?.message ??
          "Données invalides.",
      }
    }

    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2002") {
        return {
          success: false,
          message:
            "Ce numéro de convention est déjà utilisé.",
        }
      }
    }

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de la création de la convention.",
    }
  }
}

/* =========================================================
   MODIFICATION
========================================================= */

export async function updateConvention(
  id: string,
  values: unknown
): Promise<ActionResult> {
  try {
    /* -----------------------------------------
       VALIDATION
    ----------------------------------------- */

    const data =
      conventionSchema.parse(values)

    /* -----------------------------------------
       CENTRE ACTIF
    ----------------------------------------- */

    const centreId =
      await getCentreId()

    /* -----------------------------------------
       CONVENTION
    ----------------------------------------- */

    const convention =
      await prisma.convention.findFirst({
        where: {
          id,
          centreId,
        },
      })

    if (!convention) {
      return {
        success: false,
        message:
          "Convention introuvable.",
      }
    }

    /* -----------------------------------------
       PROTECTION CONVENTION ANNULÉE
    ----------------------------------------- */

    if (
      convention.statut === "ANNULEE"
    ) {
      return {
        success: false,
        message:
          "Une convention annulée ne peut plus être modifiée.",
      }
    }

    /* -----------------------------------------
       NUMÉRO
    ----------------------------------------- */

    const numero =
      data.numero.trim()

    /* -----------------------------------------
       DOUBLON NUMÉRO
    ----------------------------------------- */

    const duplicate =
      await prisma.convention.findFirst({
        where: {
          centreId,
          numero,

          NOT: {
            id,
          },
        },

        select: {
          id: true,
        },
      })

    if (duplicate) {
      return {
        success: false,
        message:
          "Ce numéro de convention est déjà utilisé.",
      }
    }

    /* -----------------------------------------
       VÉRIFICATION INSCRIPTIONS
    ----------------------------------------- */

    await validateInscriptions(
      data.inscriptionIds,
      centreId
    )

    /* -----------------------------------------
       TRANSACTION
    ----------------------------------------- */

    const updated =
      await prisma.$transaction(
        async (tx) => {
          /* -----------------------------------
             SUPPRESSION DES ANCIENS PARTICIPANTS
          ----------------------------------- */

          await tx.conventionParticipant.deleteMany(
            {
              where: {
                conventionId: id,
              },
            }
          )

          /* -----------------------------------
             MISE À JOUR CONVENTION
          ----------------------------------- */

          const result =
            await tx.convention.update({
              where: {
                id,
              },

              data: {
                numero,

                organisationNom:
                  data.organisationNom.trim(),

                organisationAdresse:
                  cleanOptional(
                    data.organisationAdresse
                  ),

                organisationEmail:
                  cleanOptional(
                    data.organisationEmail
                  ),

                organisationTelephone:
                  cleanOptional(
                    data.organisationTelephone
                  ),

                organisationContact:
                  cleanOptional(
                    data.organisationContact
                  ),

                dateDebut:
                  parseDate(
                    data.dateDebut,
                    "date de début"
                  ),

                dateFin:
                  parseDate(
                    data.dateFin,
                    "date de fin"
                  ),

                montant:
                  data.montant,

                devise:
                  data.devise.toUpperCase(),

                statut:
                  data.statut,

                dateSignature:
                  data.dateSignature
                    ? parseDate(
                        data.dateSignature,
                        "date de signature"
                      )
                    : null,

                observations:
                  cleanOptional(
                    data.observations
                  ),
              },
            })

          /* -----------------------------------
             NOUVEAUX PARTICIPANTS
          ----------------------------------- */

          if (
            data.inscriptionIds.length > 0
          ) {
            await tx.conventionParticipant.createMany(
              {
                data:
                  data.inscriptionIds.map(
                    (inscriptionId) => ({
                      conventionId: id,
                      inscriptionId,
                    })
                  ),
              }
            )
          }

          return result
        }
      )

    /* -----------------------------------------
       CACHE
    ----------------------------------------- */

    revalidatePath(
      "/conventions"
    )

    revalidatePath(
      `/conventions/${id}`
    )

    revalidatePath(
      `/conventions/${id}/modifier`
    )

    /* -----------------------------------------
       RETOUR
    ----------------------------------------- */

    return {
      success: true,

      message:
        "Convention modifiée avec succès.",

      data: serializeForClient(
        updated
      ),
    }
  } catch (error) {
    console.error(
      "updateConvention:",
      error
    )

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message:
          error.issues[0]?.message ??
          "Données invalides.",
      }
    }

    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2002") {
        return {
          success: false,
          message:
            "Ce numéro de convention est déjà utilisé.",
        }
      }
    }

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Erreur lors de la modification.",
    }
  }
}

/* =========================================================
   SUPPRESSION
========================================================= */

export async function deleteConvention(
  id: string
): Promise<ActionResult> {
  try {
    /* -----------------------------------------
       CENTRE ACTIF
    ----------------------------------------- */

    const centreId =
      await getCentreId()

    /* -----------------------------------------
       CONVENTION
    ----------------------------------------- */

    const convention =
      await prisma.convention.findFirst({
        where: {
          id,
          centreId,
        },

        include: {
          documents: {
            select: {
              id: true,
            },
          },

          participants: {
            select: {
              id: true,
            },
          },
        },
      })

    if (!convention) {
      return {
        success: false,
        message:
          "Convention introuvable.",
      }
    }

    /* -----------------------------------------
       PROTECTION STATUT
    ----------------------------------------- */

    if (
      convention.statut === "SIGNEE" ||
      convention.statut === "ACTIVE" ||
      convention.statut === "TERMINEE"
    ) {
      return {
        success: false,
        message:
          "Cette convention ne peut plus être supprimée.",
      }
    }

    /* -----------------------------------------
       DOCUMENTS
    ----------------------------------------- */

    if (
      convention.documents.length > 0
    ) {
      return {
        success: false,
        message:
          "Supprimez d'abord les documents associés à cette convention.",
      }
    }

    /* -----------------------------------------
       SUPPRESSION
    ----------------------------------------- */

    /*
     * Les ConventionParticipant ont
     * onDelete: Cascade.
     *
     * Ils seront donc supprimés
     * automatiquement avec la convention.
     */

    await prisma.convention.delete({
      where: {
        id,
      },
    })

    /* -----------------------------------------
       CACHE
    ----------------------------------------- */

    revalidatePath(
      "/conventions"
    )

    revalidatePath(
      `/conventions/${id}`
    )

    /* -----------------------------------------
       RETOUR
    ----------------------------------------- */

    return {
      success: true,
      message:
        "Convention supprimée.",
    }
  } catch (error) {
    console.error(
      "deleteConvention:",
      error
    )

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de supprimer la convention.",
    }
  }
}

/* =========================================================
   STATUT
========================================================= */

const statutSchema =
  z.enum([
    "BROUILLON",
    "EN_ATTENTE",
    "SIGNEE",
    "ACTIVE",
    "TERMINEE",
    "ANNULEE",
    "EXPIREE",
  ])

export async function updateConventionStatus(
  id: string,
  statut: z.infer<typeof statutSchema>
): Promise<ActionResult> {
  try {
    /* -----------------------------------------
       VALIDATION STATUT
    ----------------------------------------- */

    statutSchema.parse(statut)

    /* -----------------------------------------
       CENTRE ACTIF
    ----------------------------------------- */

    const centreId =
      await getCentreId()

    /* -----------------------------------------
       CONVENTION
    ----------------------------------------- */

    const convention =
      await prisma.convention.findFirst({
        where: {
          id,
          centreId,
        },
      })

    if (!convention) {
      return {
        success: false,
        message:
          "Convention introuvable.",
      }
    }

    /* -----------------------------------------
       PROTECTION CONVENTION ANNULÉE
    ----------------------------------------- */

    if (
      convention.statut === "ANNULEE" &&
      statut !== "ANNULEE"
    ) {
      return {
        success: false,
        message:
          "Une convention annulée ne peut pas être réactivée.",
      }
    }

    /* -----------------------------------------
       DATE SIGNATURE
    ----------------------------------------- */

    let dateSignature =
      convention.dateSignature

    if (
      (statut === "SIGNEE" ||
        statut === "ACTIVE") &&
      !dateSignature
    ) {
      dateSignature = new Date()
    }

    /* -----------------------------------------
       MISE À JOUR
    ----------------------------------------- */

    const updated =
      await prisma.convention.update({
        where: {
          id,
        },

        data: {
          statut,
          dateSignature,
        },
      })

    /* -----------------------------------------
       CACHE
    ----------------------------------------- */

    revalidatePath(
      "/conventions"
    )

    revalidatePath(
      `/conventions/${id}`
    )

    /* -----------------------------------------
       RETOUR
    ----------------------------------------- */

    return {
      success: true,

      message:
        "Statut mis à jour.",

      data: serializeForClient(
        updated
      ),
    }
  } catch (error) {
    console.error(
      "updateConventionStatus:",
      error
    )

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message:
          "Le statut sélectionné est invalide.",
      }
    }

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de modifier le statut.",
    }
  }
}

/* =========================================================
   RETIRER PARTICIPANT
========================================================= */

export async function removeConventionParticipant(
  participantId: string
): Promise<ActionResult> {
  try {
    /* -----------------------------------------
       CENTRE ACTIF
    ----------------------------------------- */

    const centreId =
      await getCentreId()

    /* -----------------------------------------
       PARTICIPANT
    ----------------------------------------- */

    const participant =
      await prisma.conventionParticipant.findFirst(
        {
          where: {
            id: participantId,

            convention: {
              centreId,
            },
          },

          select: {
            id: true,
            conventionId: true,
            convention: {
              select: {
                statut: true,
              },
            },
          },
        }
      )

    if (!participant) {
      return {
        success: false,
        message:
          "Participant introuvable.",
      }
    }

    /* -----------------------------------------
       PROTECTION STATUT
    ----------------------------------------- */

    if (
      participant.convention.statut ===
        "SIGNEE" ||
      participant.convention.statut ===
        "ACTIVE" ||
      participant.convention.statut ===
        "TERMINEE"
    ) {
      return {
        success: false,
        message:
          "Le participant ne peut plus être retiré d'une convention signée, active ou terminée.",
      }
    }

    /* -----------------------------------------
       SUPPRESSION
    ----------------------------------------- */

    await prisma.conventionParticipant.delete({
      where: {
        id: participantId,
      },
    })

    /* -----------------------------------------
       CACHE
    ----------------------------------------- */

    revalidatePath(
      "/conventions"
    )

    revalidatePath(
      `/conventions/${participant.conventionId}`
    )

    /* -----------------------------------------
       RETOUR
    ----------------------------------------- */

    return {
      success: true,

      message:
        "Participant retiré.",
    }
  } catch (error) {
    console.error(
      "removeConventionParticipant:",
      error
    )

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de retirer le participant.",
    }
  }
}