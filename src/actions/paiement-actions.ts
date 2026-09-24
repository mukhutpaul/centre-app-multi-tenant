"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { getCurrentCentreContext } from "@/lib/validations/centre-access"

/* =========================================================
TYPES
========================================================= */

export type TypePaiementInput =
| "REGLEMENT_FACTURE_CONVENTION"
| "PAIEMENT_REGULIER"

export type ModePaiementInput =
| "ESPECES"
| "VIREMENT"
| "MOBILE_MONEY"
| "CARTE"
| "CHEQUE"
| "AUTRE"

export type CreatePaiementInput = {
type: TypePaiementInput
montant: string | number
mode: ModePaiementInput

datePaiement?: string
referenceTransaction?: string
notes?: string

/* Paiement régulier */
inscriptionId?: string
tarifFormationId?: string

/* Règlement facture convention */
factureId?: string
echeanceId?: string
}

export type UpdatePaiementInput = {
paiementId: string
mode: ModePaiementInput
referenceTransaction?: string
notes?: string
}

export type Result<T = unknown> = {
success: boolean
message: string
data?: T
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

function toDecimal(value: unknown): Prisma.Decimal {
return new Prisma.Decimal(String(value ?? 0))
}

function parseMontant(
value: unknown
): Prisma.Decimal | null {
try {
if (
value === null ||
value === undefined ||
value === ""
) {
return null
}


const texte = String(value).trim()

if (!texte) {
  return null
}

const montant = new Prisma.Decimal(texte)

if (!montant.isFinite()) {
  return null
}

if (montant.lte(0)) {
  return null
}

return montant


} catch {
return null
}
}

/* =========================================================
SERIALISATION
========================================================= */

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

/* =========================================================
REFERENCE PAIEMENT
========================================================= */

async function generateReference(
tx: Prisma.TransactionClient,
centreId: string
): Promise<string> {
const annee = new Date().getFullYear()

const dernier = await tx.paiement.findFirst({
where: {
centreId,
reference: {
startsWith: `PAY-${annee}-`,
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

if (dernier?.reference) {
const partie = dernier.reference.split("-").pop()
const nombre = Number(partie)


if (
  Number.isInteger(nombre) &&
  nombre > 0
) {
  sequence = nombre + 1
}

}

return `PAY-${annee}-${String(sequence).padStart(5, "0")}`
}

/* =========================================================
VALIDATION DATE
========================================================= */

function parseDatePaiement(
value?: string
): Date {
const date = value
? new Date(value)
: new Date()

if (Number.isNaN(date.getTime())) {
throw new Error(
"La date du paiement est invalide."
)
}

return date
}

/* =========================================================
LISTE DES PAIEMENTS
========================================================= */

export async function getPaiements(): Promise<Result> {
  try {
    const centreId = await getCentreId()

    const paiements = await prisma.paiement.findMany({
      where: {
        centreId,
      },

      include: {
        apprenant: {
          select: {
            id: true,
            nom: true,
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
                prenom: true,
              },
            },

            session: {
              select: {
                id: true,

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
        },

        tarifFormation: {
          select: {
            id: true,
            nom: true,
            description: true,
            montant: true,
            devise: true,
            actif: true,
          },
        },

        facture: {
          select: {
            id: true,
            numero: true,
            total: true,
            montantPaye: true,
            montantDu: true,
            statut: true,

            convention: {
              select: {
                id: true,
                numero: true,
                organisationNom: true,
                montant: true,
                devise: true,
              },
            },
          },
        },

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

      orderBy: {
        creeLe: "desc",
      },
    })

    return {
      success: true,
      message: "Paiements récupérés avec succès.",
      data: serializeForClient(paiements),
    }
  } catch (error) {
    console.error("getPaiements:", error)

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
DETAIL PAIEMENT
========================================================= */

export async function getPaiement(paiementId: string) {
try {
const centreId = await getCentreId()


const paiement = await prisma.paiement.findFirst({
  where: {
    id: paiementId,
    centreId,
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

    inscription: {
      select: {
        id: true,
        numero: true,

        apprenant: {
          select: {
            id: true,
            numero: true,
            nom: true,
            prenom: true,
          },
        },

        session: {
          select: {
            id: true,
            nom: true,

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
    },

    tarifFormation: {
      select: {
        id: true,
        nom: true,
        description: true,
        montant: true,
        devise: true,
        actif: true,
      },
    },

    facture: {
      select: {
        id: true,
        numero: true,
        total: true,
        montantPaye: true,
        montantDu: true,
        statut: true,

        convention: {
          select: {
            id: true,
            numero: true,
            organisationNom: true,
            montant: true,
            devise: true,

            participants: {
              select: {
                id: true,

                inscription: {
                  select: {
                    id: true,
                    numero: true,

                    apprenant: {
                      select: {
                        id: true,
                        numero: true,
                        nom: true,
                        prenom: true,
                      },
                    },

                    session: {
                      select: {
                        id: true,
                        nom: true,

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
                },
              },
            },
          },
        },
      },
    },

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
})

if (!paiement) {
  return {
    success: false,
    message: "Paiement introuvable.",
  }
}

return {
  success: true,
  message: "Paiement récupéré avec succès.",
  data: serializeForClient(paiement),
}


} catch (error) {
console.error("getPaiement:", error)


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
CREATION PAIEMENT
========================================================= */

export async function createPaiement(
input: CreatePaiementInput
): Promise<Result> {
try {
if (!input) {
return {
success: false,
message:
"Les données du paiement sont obligatoires.",
}
}


if (
  input.type ===
  "PAIEMENT_REGULIER"
) {
  return createPaiementRegulier(input)
}

if (
  input.type ===
  "REGLEMENT_FACTURE_CONVENTION"
) {
  return createReglementFacture(input)
}

return {
  success: false,
  message:
    "Type de paiement invalide.",
}

} catch (error) {
console.error("createPaiement:", error)


return {
  success: false,
  message:
    error instanceof Error
      ? error.message
      : "Impossible d'enregistrer le paiement.",
}


}
}

/* =========================================================
PAIEMENT REGULIER
========================================================= */

export async function createPaiementRegulier(
input: CreatePaiementInput
): Promise<Result> {
try {
if (!input) {
return {
success: false,
message:
"Les données du paiement sont obligatoires.",
}
}

if (
  input.type !==
  "PAIEMENT_REGULIER"
) {
  return {
    success: false,
    message:
      "Le type de paiement est invalide pour cette opération.",
  }
}

const centreId = await getCentreId()

const montant =
  parseMontant(input.montant)

if (!montant) {
  return {
    success: false,
    message:
      "Le montant du paiement doit être supérieur à 0.",
  }
}

if (!input.mode) {
  return {
    success: false,
    message:
      "Le mode de paiement est obligatoire.",
  }
}

if (!input.inscriptionId) {
  return {
    success: false,
    message:
      "L'inscription est obligatoire pour un paiement régulier.",
  }
}

if (!input.tarifFormationId) {
  return {
    success: false,
    message:
      "Le frais à payer est obligatoire.",
  }
}

if (input.factureId) {
  return {
    success: false,
    message:
      "Un paiement régulier ne peut pas être lié à une facture.",
  }
}

if (input.echeanceId) {
  return {
    success: false,
    message:
      "Un paiement régulier ne peut pas être lié à une échéance.",
  }
}

const datePaiement =
  parseDatePaiement(
    input.datePaiement
  )

const paiement =
  await prisma.$transaction(
    async (tx) => {
      const inscription =
        await tx.inscription.findFirst({
          where: {
            id: input.inscriptionId,

            session: {
              formation: {
                centreId,
              },
            },
          },

          include: {
            apprenant: true,

            session: {
              include: {
                formation: true,
              },
            },
          },
        })

      if (!inscription) {
        throw new Error(
          "Inscription introuvable ou inaccessible."
        )
      }

      const tarif =
        await tx.tarifFormation.findFirst({
          where: {
            id:
              input.tarifFormationId,

            centreId,

            formationId:
              inscription
                .session
                .formationId,

            actif: true,
          },
        })

      if (!tarif) {
        throw new Error(
          "Le frais sélectionné n'appartient pas à la formation de cette inscription ou n'est plus actif."
        )
      }

      const paiementsExistants =
        await tx.paiement.aggregate({
          where: {
            centreId,

            type:
              "PAIEMENT_REGULIER",

            inscriptionId:
              inscription.id,

            tarifFormationId:
              tarif.id,

            statut:
              "EFFECTUE",
          },

          _sum: {
            montant: true,
          },
        })

      const dejaPaye =
        toDecimal(
          paiementsExistants
            ._sum
            .montant ?? 0
        )

      const montantTarif =
        toDecimal(
          tarif.montant
        )

      const resteAvantPaiement =
        montantTarif.sub(
          dejaPaye
        )

      if (
        resteAvantPaiement.lte(0)
      ) {
        throw new Error(
          "Ce frais est déjà entièrement payé."
        )
      }

      if (
        montant.gt(
          resteAvantPaiement
        )
      ) {
        throw new Error(
          `Le montant du paiement (${montant.toFixed(
            2
          )} ${tarif.devise}) dépasse le montant restant du frais (${resteAvantPaiement.toFixed(
            2
          )} ${tarif.devise}).`
        )
      }

      const reference =
        await generateReference(
          tx,
          centreId
        )

      const paiement =
        await tx.paiement.create({
          data: {
            centreId,

            type:
              "PAIEMENT_REGULIER",

            apprenantId:
              inscription.apprenantId,

            inscriptionId:
              inscription.id,

            tarifFormationId:
              tarif.id,

            factureId: null,
            echeanceId: null,

            reference,

            montant,

            devise:
              tarif.devise,

            mode:
              input.mode,

            statut:
              "EFFECTUE",

            datePaiement,

            referenceTransaction:
              input.referenceTransaction?.trim() ||
              null,

            notes:
              input.notes?.trim() ||
              null,
          },

          include: {
            inscription: {
              include: {
                apprenant: true,
              },
            },

            tarifFormation: true,
          },
        })

      return paiement
    }
  )

revalidatePath("/paiements")
revalidatePath("/inscriptions")

return {
  success: true,
  message:
    "Paiement régulier enregistré avec succès.",
  data: serializeForClient(paiement),
}


} catch (error) {
console.error(
"createPaiementRegulier:",
error
)


return {
  success: false,
  message:
    error instanceof Error
      ? error.message
      : "Impossible d'enregistrer le paiement régulier.",
}


}
}

/* =========================================================
REGLEMENT FACTURE CONVENTION
========================================================= */

export async function createReglementFacture(
input: CreatePaiementInput
): Promise<Result> {
try {
if (!input) {
return {
success: false,
message:
"Les données du règlement sont obligatoires.",
}
}


if (
  input.type !==
  "REGLEMENT_FACTURE_CONVENTION"
) {
  return {
    success: false,
    message:
      "Le type de paiement est invalide pour cette opération.",
  }
}

const centreId = await getCentreId()

const montant =
  parseMontant(input.montant)

if (!montant) {
  return {
    success: false,
    message:
      "Le montant du règlement doit être supérieur à 0.",
  }
}

if (!input.mode) {
  return {
    success: false,
    message:
      "Le mode de paiement est obligatoire.",
  }
}

if (!input.factureId) {
  return {
    success: false,
    message:
      "La facture est obligatoire.",
  }
}

if (!input.echeanceId) {
  return {
    success: false,
    message:
      "L'échéance est obligatoire.",
  }
}

if (input.inscriptionId) {
  return {
    success: false,
    message:
      "Un règlement de facture de convention ne doit pas être directement lié à une inscription.",
  }
}

if (input.tarifFormationId) {
  return {
    success: false,
    message:
      "Un règlement de facture ne peut pas être lié à un tarif de formation.",
  }
}

const datePaiement =
  parseDatePaiement(
    input.datePaiement
  )

const paiement =
  await prisma.$transaction(
    async (tx) => {
      const facture =
        await tx.facture.findFirst({
          where: {
            id:
              input.factureId,

            centreId,
          },

          include: {
            convention: true,
          },
        })

      if (!facture) {
        throw new Error(
          "Facture introuvable ou inaccessible."
        )
      }

      if (!facture.convention) {
        throw new Error(
          "Cette facture n'est liée à aucune convention."
        )
      }

      const montantConvention =
        toDecimal(
          facture
            .convention
            .montant
        )

      if (
        montantConvention.lte(0)
      ) {
        throw new Error(
          "Une facture ne peut pas être réglée pour une convention dont le montant est nul."
        )
      }

      const totalFacture =
        toDecimal(
          facture.total
        )

      if (totalFacture.lte(0)) {
        throw new Error(
          "Cette facture possède un montant nul ou invalide."
        )
      }

      const echeance =
        await tx.echeancePaiement.findFirst({
          where: {
            id:
              input.echeanceId,

            factureId:
              facture.id,

            centreId,
          },
        })

      if (!echeance) {
        throw new Error(
          "L'échéance sélectionnée n'appartient pas à cette facture."
        )
      }

      const montantEcheance =
        toDecimal(
          echeance.montant
        )

      const montantDejaPaye =
        toDecimal(
          echeance.montantPaye
        )

      const montantRestant =
        montantEcheance.sub(
          montantDejaPaye
        )

      if (
        montantRestant.lte(0)
      ) {
        throw new Error(
          "Cette échéance est déjà entièrement payée."
        )
      }

      if (
        montant.gt(
          montantRestant
        )
      ) {
        throw new Error(
          `Le montant du règlement (${montant.toFixed(
            2
          )} ${facture.convention.devise}) dépasse le montant restant de l'échéance (${montantRestant.toFixed(
            2
          )} ${facture.convention.devise}).`
        )
      }

      const reference =
        await generateReference(
          tx,
          centreId
        )

      const paiement =
        await tx.paiement.create({
          data: {
            centreId,

            type:
              "REGLEMENT_FACTURE_CONVENTION",

            apprenantId: null,
            inscriptionId: null,
            tarifFormationId: null,

            factureId:
              facture.id,

            echeanceId:
              echeance.id,

            reference,

            montant,

            devise:
              facture
                .convention
                .devise,

            mode:
              input.mode,

            statut:
              "EFFECTUE",

            datePaiement,

            referenceTransaction:
              input.referenceTransaction?.trim() ||
              null,

            notes:
              input.notes?.trim() ||
              null,
          },
        })

      const nouveauMontantPaye =
        montantDejaPaye.add(
          montant
        )

      const nouveauMontantDu =
        montantEcheance.sub(
          nouveauMontantPaye
        )

      let statutEcheance:
        | "EN_ATTENTE"
        | "PARTIELLE"
        | "PAYEE"

      if (
        nouveauMontantPaye.equals(
          montantEcheance
        )
      ) {
        statutEcheance =
          "PAYEE"
      } else if (
        nouveauMontantPaye.gt(0)
      ) {
        statutEcheance =
          "PARTIELLE"
      } else {
        statutEcheance =
          "EN_ATTENTE"
      }

      await tx.echeancePaiement.update({
        where: {
          id:
            echeance.id,
        },

        data: {
          montantPaye:
            nouveauMontantPaye,

          montantDu:
            nouveauMontantDu,

          statut:
            statutEcheance,
        },
      })

      const paiementsEffectues =
        await tx.paiement.aggregate({
          where: {
            centreId,

            factureId:
              facture.id,

            statut:
              "EFFECTUE",
          },

          _sum: {
            montant: true,
          },
        })

      const montantPayeFacture =
        toDecimal(
          paiementsEffectues
            ._sum
            .montant ?? 0
        )

      const montantDuFacture =
        totalFacture.sub(
          montantPayeFacture
        )

      let statutFacture:
        | "EMISE"
        | "PARTIELLEMENT_PAYEE"
        | "PAYEE"

      if (
        montantPayeFacture.gte(
          totalFacture
        )
      ) {
        statutFacture =
          "PAYEE"
      } else if (
        montantPayeFacture.gt(0)
      ) {
        statutFacture =
          "PARTIELLEMENT_PAYEE"
      } else {
        statutFacture =
          "EMISE"
      }

      await tx.facture.update({
        where: {
          id:
            facture.id,
        },

        data: {
          montantPaye:
            montantPayeFacture,

          montantDu:
            montantDuFacture.lt(0)
              ? new Prisma.Decimal(0)
              : montantDuFacture,

          statut:
            statutFacture,
        },
      })

      return paiement
    }
  )

revalidatePath("/paiements")
revalidatePath("/factures")
revalidatePath("/echeances")

return {
  success: true,
  message:
    "Règlement de la facture enregistré avec succès.",
  data: serializeForClient(paiement),
}


} catch (error) {
console.error(
"createReglementFacture:",
error
)


return {
  success: false,
  message:
    error instanceof Error
      ? error.message
      : "Impossible d'enregistrer le règlement de la facture.",
}


}
}

/* =========================================================
MODIFICATION
========================================================= */

export async function updatePaiement(
input: UpdatePaiementInput
): Promise<Result> {
try {
if (!input?.paiementId) {
return {
success: false,
message:
"Le paiement est obligatoire.",
}
}


const centreId =
  await getCentreId()

const paiement =
  await prisma.paiement.findFirst({
    where: {
      id:
        input.paiementId,

      centreId,
    },
  })

if (!paiement) {
  return {
    success: false,
    message:
      "Paiement introuvable.",
  }
}

if (
  paiement.statut ===
  "EFFECTUE"
) {
  return {
    success: false,
    message:
      "Un paiement effectué ne peut pas être modifié. Utilisez une procédure d'annulation ou de remboursement.",
  }
}

const updated =
  await prisma.paiement.update({
    where: {
      id:
        paiement.id,
    },

    data: {
      mode:
        input.mode,

      referenceTransaction:
        input.referenceTransaction?.trim() ||
        null,

      notes:
        input.notes?.trim() ||
        null,
    },
  })

revalidatePath("/paiements")

return {
  success: true,
  message:
    "Paiement modifié avec succès.",
  data: serializeForClient(updated),
}


} catch (error) {
console.error(
"updatePaiement:",
error
)


return {
  success: false,
  message:
    error instanceof Error
      ? error.message
      : "Impossible de modifier le paiement.",
}


}
}

/* =========================================================
SUPPRESSION
========================================================= */

export async function deletePaiement(
paiementId: string
): Promise<Result> {
try {
if (!paiementId) {
return {
success: false,
message:
"Le paiement est obligatoire.",
}
}


const centreId =
  await getCentreId()

const paiement =
  await prisma.paiement.findFirst({
    where: {
      id: paiementId,
      centreId,
    },
  })

if (!paiement) {
  return {
    success: false,
    message:
      "Paiement introuvable.",
  }
}

if (
  paiement.statut ===
  "EFFECTUE"
) {
  return {
    success: false,
    message:
      "Un paiement effectué ne peut pas être supprimé. Utilisez une procédure d'annulation ou de remboursement.",
  }
}

await prisma.paiement.delete({
  where: {
    id:
      paiement.id,
  },
})

revalidatePath("/paiements")

return {
  success: true,
  message:
    "Paiement supprimé avec succès.",
}


} catch (error) {
console.error(
"deletePaiement:",
error
)


return {
  success: false,
  message:
    error instanceof Error
      ? error.message
      : "Impossible de supprimer le paiement.",
}


}
}


/* =========================================================
   TARIFS RESTANTS À PAYER POUR UNE INSCRIPTION
========================================================= */

export type TarifRestant = {
  id: string
  nom: string
  description: string | null
  montant: string
  montantPaye: string
  montantRestant: string
  devise: string
  actif: boolean
}

export type TarifsForInscriptionData = {
  inscription: {
    id: string
    numero: string

    apprenant: {
      id: string
      prenom: string
      nom: string
    }

    session: {
      id: string

      formation: {
        id: string
        code: string
        nom: string
      }
    }
  }

  tarifs: TarifRestant[]
}

export async function getTarifsForInscription(
  inscriptionId: string
): Promise<Result<TarifsForInscriptionData>> {
  try {
    // =========================================================
    // 1. VALIDATION
    // =========================================================

    if (!inscriptionId) {
      return {
        success: false,
        message: "L'inscription est obligatoire.",
      }
    }

    const centreId = await getCentreId()

    // =========================================================
    // 2. RÉCUPÉRER L'INSCRIPTION
    // =========================================================

    const inscription =
      await prisma.inscription.findFirst({
        where: {
          id: inscriptionId,

          session: {
            centreId,
          },
        },

        select: {
          id: true,
          numero: true,
          apprenantId: true,

          apprenant: {
            select: {
              id: true,
              prenom: true,
              nom: true,
            },
          },

          session: {
            select: {
              id: true,
              formationId: true,

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
      })

    if (!inscription) {
      return {
        success: false,
        message:
          "Inscription introuvable ou inaccessible.",
      }
    }

    // =========================================================
    // 3. RÉCUPÉRER LES FRAIS DE LA FORMATION
    // =========================================================

    const tarifs =
      await prisma.tarifFormation.findMany({
        where: {
          centreId,

          formationId:
            inscription.session.formationId,

          actif: true,
        },

        orderBy: {
          nom: "asc",
        },
      })

    // =========================================================
    // 4. AUCUN FRAIS
    // =========================================================

    if (tarifs.length === 0) {
      return {
        success: true,

        message:
          "Aucun frais n'est enregistré pour cette formation.",

        data: {
          inscription: {
            id: inscription.id,

            numero: inscription.numero,

            apprenant:
              inscription.apprenant,

            session: {
              id: inscription.session.id,

              formation:
                inscription.session.formation,
            },
          },

          tarifs: [],
        },
      }
    }

    // =========================================================
    // 5. RÉCUPÉRER TOUS LES PAIEMENTS EFFECTUÉS
    //    POUR CETTE INSCRIPTION
    // =========================================================

    const paiements =
      await prisma.paiement.findMany({
        where: {
          centreId,

          inscriptionId:
            inscription.id,

          type: "PAIEMENT_REGULIER",

          statut: "EFFECTUE",

          tarifFormationId: {
            not: null,
          },
        },

        select: {
          tarifFormationId: true,
          montant: true,
        },
      })

    // =========================================================
    // 6. CALCULER LE TOTAL PAYÉ POUR CHAQUE FRAIS
    // =========================================================

    const montantsPayes =
      new Map<string, Prisma.Decimal>()

    for (const paiement of paiements) {
      if (!paiement.tarifFormationId) {
        continue
      }

      const montantActuel =
        montantsPayes.get(
          paiement.tarifFormationId
        ) ??
        new Prisma.Decimal(0)

      montantsPayes.set(
        paiement.tarifFormationId,

        montantActuel.add(
          paiement.montant
        )
      )
    }

    // =========================================================
    // 7. CALCULER LE RESTE
    // =========================================================

    const tarifsRestants: TarifRestant[] = []

    for (const tarif of tarifs) {
      const montantTotal =
        toDecimal(tarif.montant)

      const montantPaye =
        montantsPayes.get(
          tarif.id
        ) ??
        new Prisma.Decimal(0)

      let montantRestant =
        montantTotal.sub(
          montantPaye
        )

      // Protection contre un dépassement historique
      if (montantRestant.lt(0)) {
        montantRestant =
          new Prisma.Decimal(0)
      }

      // =======================================================
      // FRAIS ENTIÈREMENT PAYÉ :
      // ON LE CACHE
      // =======================================================

      if (montantRestant.lte(0)) {
        continue
      }

      tarifsRestants.push({
        id: tarif.id,

        nom: tarif.nom,

        description:
          tarif.description,

        montant:
          montantTotal.toString(),

        montantPaye:
          montantPaye.toString(),

        montantRestant:
          montantRestant.toString(),

        devise:
          tarif.devise,

        actif:
          tarif.actif,
      })
    }

    // =========================================================
    // 8. RETOURNER LES FRAIS RESTANTS
    // =========================================================

    return {
      success: true,

      message:
        tarifsRestants.length > 0
          ? "Frais restant à payer récupérés avec succès."
          : "Tous les frais de cette formation sont entièrement payés.",

      data: {
        inscription: {
          id: inscription.id,

          numero:
            inscription.numero,

          apprenant:
            inscription.apprenant,

          session: {
            id:
              inscription.session.id,

            formation:
              inscription.session.formation,
          },
        },

        tarifs:
          tarifsRestants,
      },
    }
  } catch (error) {
    console.error(
      "getTarifsForInscription:",
      error
    )

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les frais restant à payer.",
    }
  }
}

/* =========================================================
   DONNÉES DU FORMULAIRE DE MODIFICATION
========================================================= */

export type PaiementFormData = {
  modesPaiement: {
    value: ModePaiementInput
    label: string
  }[]
}

export async function getPaiementFormData(): Promise<
  Result<PaiementFormData>
> {
  try {
    await getCentreId()

    return {
      success: true,
      message:
        "Données du formulaire récupérées avec succès.",

      data: {
        modesPaiement: [
          {
            value: "ESPECES",
            label: "Espèces",
          },
          {
            value: "VIREMENT",
            label: "Virement bancaire",
          },
          {
            value: "MOBILE_MONEY",
            label: "Mobile Money",
          },
          {
            value: "CARTE",
            label: "Carte bancaire",
          },
          {
            value: "CHEQUE",
            label: "Chèque",
          },
          {
            value: "AUTRE",
            label: "Autre",
          },
        ],
      },
    }
  } catch (error) {
    console.error(
      "getPaiementFormData:",
      error
    )

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les données du formulaire.",
    }
  }
}

export async function getPaiementById(
  paiementId: string
) {
  try {
    const centreId = await getCentreId()

    const paiement = await prisma.paiement.findFirst({
      where: {
        id: paiementId,
        centreId,
      },

      include: {
        apprenant: {
          select: {
            id: true,
            nom: true,
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
                prenom: true,
              },
            },

            session: {
              select: {
                id: true,
                nom: true,

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
        },

        tarifFormation: {
          select: {
            id: true,
            nom: true,
            description: true,
            montant: true,
            devise: true,
            actif: true,
          },
        },

        facture: {
          select: {
            id: true,
            numero: true,
            total: true,
            montantPaye: true,
            montantDu: true,
            statut: true,

            convention: {
              select: {
                id: true,
                numero: true,
                organisationNom: true,
                montant: true,
                devise: true,
              },
            },
          },
        },

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
    })

    if (!paiement) {
      return {
        success: false,
        message: "Paiement introuvable.",
      }
    }

    return {
      success: true,
      data: serializeForClient(paiement),
    }
  } catch (error) {
    console.error("getPaiementById:", error)

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer le paiement.",
    }
  }
}

