
"use server";

import { revalidatePath } from "next/cache";

import {
  StatutEcheance,
  StatutFacture,
  StatutPaiement,
} from "@/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

import { getCurrentCentreContext } from "@/lib/validations/centre-access";

import {
  createPaiementSchema,
  updatePaiementSchema,
} from "@/lib/validations/paiement.schema";

/* ============================================================
   TYPES
============================================================ */

type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

type PaymentWhere = {
  centreId: string;
  factureId?: string;
  echeanceId?: string;
};

type RecalculResult = {
  montantPaye: string;
  montantDu: string;
};

/* ============================================================
   SERIALISATION
============================================================ */

/**
 * Transforme récursivement les valeurs Prisma non sérialisables
 * avant de les transmettre à un Client Component.
 *
 * Decimal -> string
 * Date    -> string ISO
 */
function serializeForClient<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  // Valeurs primitives
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  // BigInt
  if (typeof value === "bigint") {
    return String(value) as T;
  }

  // Date
  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  // Tableau
  if (Array.isArray(value)) {
    return value.map((item) =>
      serializeForClient(item),
    ) as T;
  }

  // Objets
  if (typeof value === "object") {
    const objectValue =
      value as Record<string, unknown>;

    /*
     * ========================================================
     * PRISMA DECIMAL
     * ========================================================
     *
     * Selon la version/génération de Prisma, le constructeur
     * peut s'appeler Decimal, Decimal2, etc.
     *
     * On ne se base donc PAS sur constructor.name.
     *
     * Un Decimal Prisma possède généralement :
     * - s : signe
     * - e : exposant
     * - d : chiffres
     */
    if (
      "s" in objectValue &&
      "e" in objectValue &&
      "d" in objectValue &&
      Array.isArray(
        objectValue.d,
      )
    ) {
      return String(value) as T;
    }

    /*
     * ========================================================
     * OBJET NORMAL
     * ========================================================
     */

    const result: Record<
      string,
      unknown
    > = {};

    for (const [
      key,
      item,
    ] of Object.entries(
      objectValue,
    )) {
      result[key] =
        serializeForClient(item);
    }

    return result as T;
  }

  return value;
}

/* ============================================================
   CENTRE
============================================================ */

/**
 * Retourne le centre courant.
 */
async function getCentreId() {
  const context =
    await getCurrentCentreContext();

  if (!context.centreId) {
    throw new Error(
      "Aucun centre actif n'est associé à votre compte.",
    );
  }

  return context.centreId;
}

/* ============================================================
   SOMME PAIEMENTS
============================================================ */

/**
 * Somme uniquement les paiements réellement effectués.
 */
async function getTotalPaiementsEffectues(
  tx: any,
  where: PaymentWhere,
) {
  const aggregate =
    await tx.paiement.aggregate({
      where: {
        ...where,
        statut:
          StatutPaiement.EFFECTUE,
      },

      _sum: {
        montant: true,
      },
    });

  return (
    aggregate._sum.montant ?? 0
  );
}

/* ============================================================
   RECALCUL ECHEANCE
============================================================ */

async function recalculerEcheance(
  tx: any,
  echeanceId: string,
  centreId: string,
): Promise<RecalculResult> {
  const echeance =
    await tx.echeancePaiement.findFirst(
      {
        where: {
          id: echeanceId,
          centreId,
        },
      },
    );

  if (!echeance) {
    throw new Error(
      "Échéance introuvable.",
    );
  }

  const montantPaye =
    await getTotalPaiementsEffectues(
      tx,
      {
        centreId,
        echeanceId,
      },
    );

  const montant =
    Number(echeance.montant);

  const paye =
    Number(montantPaye);

  const reste = Math.max(
    montant - paye,
    0,
  );

  let statut:
    | StatutEcheance =
    echeance.statut;

  if (
    echeance.statut ===
    StatutEcheance.ANNULEE
  ) {
    statut =
      StatutEcheance.ANNULEE;
  } else if (paye >= montant) {
    statut =
      StatutEcheance.PAYEE;
  } else if (paye > 0) {
    statut =
      StatutEcheance.PARTIELLE;
  } else if (
    new Date(
      echeance.dateEcheance,
    ) < new Date()
  ) {
    statut =
      StatutEcheance.EN_RETARD;
  } else {
    statut =
      StatutEcheance.EN_ATTENTE;
  }

  await tx.echeancePaiement.update(
    {
      where: {
        id: echeanceId,
      },

      data: {
        montantPaye:
          montantPaye.toString(),

        montantDu:
          reste.toFixed(2),

        statut,
      },
    },
  );

  return {
    montantPaye:
      montantPaye.toString(),

    montantDu:
      reste.toFixed(2),
  };
}

/* ============================================================
   RECALCUL FACTURE
============================================================ */

async function recalculerFacture(
  tx: any,
  factureId: string,
  centreId: string,
) {
  const facture =
    await tx.facture.findFirst({
      where: {
        id: factureId,
        centreId,
      },
    });

  if (!facture) {
    throw new Error(
      "Facture introuvable.",
    );
  }

  const montantPaye =
    await getTotalPaiementsEffectues(
      tx,
      {
        centreId,
        factureId,
      },
    );

  const total =
    Number(facture.total);

  const paye =
    Number(montantPaye);

  const reste = Math.max(
    total - paye,
    0,
  );

  let statut:
    | StatutFacture =
    facture.statut;

  if (
    facture.statut ===
    StatutFacture.ANNULEE
  ) {
    statut =
      StatutFacture.ANNULEE;
  } else if (paye >= total) {
    statut =
      StatutFacture.PAYEE;
  } else if (paye > 0) {
    statut =
      StatutFacture.PARTIELLEMENT_PAYEE;
  } else if (
    facture.dateEcheance &&
    new Date(
      facture.dateEcheance,
    ) < new Date()
  ) {
    statut =
      StatutFacture.EN_RETARD;
  } else if (
    facture.statut ===
    StatutFacture.BROUILLON
  ) {
    statut =
      StatutFacture.BROUILLON;
  } else {
    statut =
      StatutFacture.EMISE;
  }

  await tx.facture.update({
    where: {
      id: factureId,
    },

    data: {
      montantPaye:
        montantPaye.toString(),

      montantDu:
        reste.toFixed(2),

      statut,
    },
  });

  return {
    montantPaye:
      montantPaye.toString(),

    montantDu:
      reste.toFixed(2),

    statut,
  };
}

/* ============================================================
   VERIFICATION FACTURE
============================================================ */

async function verifierFacture(
  tx: any,
  factureId: string,
  centreId: string,
) {
  const facture =
    await tx.facture.findFirst({
      where: {
        id: factureId,
        centreId,
      },
    });

  if (!facture) {
    throw new Error(
      "La facture sélectionnée est introuvable.",
    );
  }

  if (
    facture.statut ===
    StatutFacture.ANNULEE
  ) {
    throw new Error(
      "Impossible d'enregistrer un paiement sur une facture annulée.",
    );
  }

  return facture;
}

/* ============================================================
   VERIFICATION ECHEANCE
============================================================ */

async function verifierEcheance(
  tx: any,
  echeanceId: string,
  centreId: string,
  factureId?: string | null,
) {
  const echeance =
    await tx.echeancePaiement.findFirst(
      {
        where: {
          id: echeanceId,
          centreId,
        },
      },
    );

  if (!echeance) {
    throw new Error(
      "L'échéance sélectionnée est introuvable.",
    );
  }

  if (
    echeance.statut ===
    StatutEcheance.ANNULEE
  ) {
    throw new Error(
      "Impossible d'enregistrer un paiement sur une échéance annulée.",
    );
  }

  if (
    factureId &&
    echeance.factureId !==
      factureId
  ) {
    throw new Error(
      "Cette échéance n'appartient pas à la facture sélectionnée.",
    );
  }

  return echeance;
}

/* ============================================================
   VERIFICATION SURPAIEMENT
============================================================ */

async function verifierMontantDisponible(
  tx: any,
  params: {
    centreId: string;
    montant: number;
    factureId?: string | null;
    echeanceId?: string | null;
    paiementId?: string;
  },
) {
  const {
    centreId,
    montant,
    factureId,
    echeanceId,
    paiementId,
  } = params;

  if (montant <= 0) {
    throw new Error(
      "Le montant du paiement doit être supérieur à zéro.",
    );
  }

  /* ==========================================================
     FACTURE
  ========================================================== */

  if (factureId) {
    const facture =
      await tx.facture.findFirst({
        where: {
          id: factureId,
          centreId,
        },
      });

    if (!facture) {
      throw new Error(
        "Facture introuvable.",
      );
    }

    const aggregate =
      await tx.paiement.aggregate({
        where: {
          centreId,
          factureId,

          statut:
            StatutPaiement.EFFECTUE,

          ...(paiementId
            ? {
                id: {
                  not: paiementId,
                },
              }
            : {}),
        },

        _sum: {
          montant: true,
        },
      });

    const dejaPaye =
      Number(
        aggregate._sum.montant ??
          0,
      );

    const disponible =
      Math.max(
        Number(facture.total) -
          dejaPaye,
        0,
      );

    if (montant > disponible) {
      throw new Error(
        `Le montant dépasse le reste à payer de la facture (${disponible.toFixed(
          2,
        )} FCFA).`,
      );
    }
  }

  /* ==========================================================
     ECHEANCE
  ========================================================== */

  if (echeanceId) {
    const echeance =
      await tx.echeancePaiement.findFirst(
        {
          where: {
            id: echeanceId,
            centreId,
          },
        },
      );

    if (!echeance) {
      throw new Error(
        "Échéance introuvable.",
      );
    }

    const aggregate =
      await tx.paiement.aggregate({
        where: {
          centreId,
          echeanceId,

          statut:
            StatutPaiement.EFFECTUE,

          ...(paiementId
            ? {
                id: {
                  not: paiementId,
                },
              }
            : {}),
        },

        _sum: {
          montant: true,
        },
      });

    const dejaPaye =
      Number(
        aggregate._sum.montant ??
          0,
      );

    const disponible =
      Math.max(
        Number(echeance.montant) -
          dejaPaye,
        0,
      );

    if (montant > disponible) {
      throw new Error(
        `Le montant dépasse le reste de cette échéance (${disponible.toFixed(
          2,
        )} FCFA).`,
      );
    }
  }
}

/* ============================================================
   GET PAIEMENTS
============================================================ */

export async function getPaiements() {
  const centreId =
    await getCentreId();

  const paiements =
    await prisma.paiement.findMany({
      where: {
        centreId,
      },

      orderBy: {
        creeLe: "desc",
      },

      select: {
        id: true,
        centreId: true,

        apprenantId: true,
        inscriptionId: true,

        factureId: true,
        echeanceId: true,

        reference: true,
        montant: true,

        mode: true,
        statut: true,

        datePaiement: true,

        referenceTransaction:
          true,

        notes: true,

        /* ====================================================
           APPRENANT
        ==================================================== */

        apprenant: {
          select: {
            id: true,
            prenom: true,
            nom: true,
          },
        },

        /* ====================================================
           INSCRIPTION
        ==================================================== */

        inscription: {
          select: {
            id: true,
            numero: true,

            montantConvenu: true,
            statut: true,

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
                nom: true,
                code: true,

                formation: {
                  select: {
                    id: true,
                    nom: true,
                  },
                },
              },
            },
          },
        },

        /* ====================================================
           FACTURE
        ==================================================== */

        facture: {
          select: {
            id: true,
            numero: true,

            total: true,
            montantPaye: true,
            montantDu: true,
          },
        },

        /* ====================================================
           ECHEANCE
        ==================================================== */

        echeance: {
          select: {
            id: true,
            numero: true,

            montant: true,
            montantPaye: true,
            montantDu: true,

            statut: true,
          },
        },
      },
    });

  /**
   * IMPORTANT :
   * Aucun Decimal Prisma ne doit traverser la frontière
   * Server Component -> Client Component.
   */
  return paiements.map(
    (paiement) => ({
      id: paiement.id,

      centreId:
        paiement.centreId,

      apprenantId:
        paiement.apprenantId,

      inscriptionId:
        paiement.inscriptionId,

      factureId:
        paiement.factureId,

      echeanceId:
        paiement.echeanceId,

      reference:
        paiement.reference,

      montant:
        paiement.montant.toString(),

      mode:
        paiement.mode,

      statut:
        paiement.statut,

      datePaiement:
        paiement.datePaiement
          ? paiement.datePaiement.toISOString()
          : null,

      referenceTransaction:
        paiement.referenceTransaction,

      notes:
        paiement.notes,

      apprenant:
        paiement.apprenant,

      inscription:
        paiement.inscription
          ? {
              id:
                paiement
                  .inscription
                  .id,

              numero:
                paiement
                  .inscription
                  .numero,

              montantConvenu:
                paiement
                  .inscription
                  .montantConvenu
                  .toString(),

              statut:
                paiement
                  .inscription
                  .statut,

              apprenant:
                paiement
                  .inscription
                  .apprenant,

              session:
                paiement
                  .inscription
                  .session
                  ? {
                      id:
                        paiement
                          .inscription
                          .session
                          .id,

                      nom:
                        paiement
                          .inscription
                          .session
                          .nom,

                      code:
                        paiement
                          .inscription
                          .session
                          .code,

                      formation:
                        paiement
                          .inscription
                          .session
                          .formation,
                    }
                  : null,
            }
          : null,

      facture:
        paiement.facture
          ? {
              id:
                paiement.facture.id,

              numero:
                paiement.facture
                  .numero,

              total:
                paiement.facture
                  .total
                  .toString(),

              montantPaye:
                paiement.facture
                  .montantPaye
                  .toString(),

              montantDu:
                paiement.facture
                  .montantDu
                  .toString(),
            }
          : null,

      echeance:
        paiement.echeance
          ? {
              id:
                paiement.echeance.id,

              numero:
                paiement.echeance
                  .numero,

              montant:
                paiement.echeance
                  .montant
                  .toString(),

              montantPaye:
                paiement.echeance
                  .montantPaye
                  .toString(),

              montantDu:
                paiement.echeance
                  .montantDu
                  .toString(),

              statut:
                paiement.echeance
                  .statut,
            }
          : null,
    }),
  );
}

/* ============================================================
   GET PAIEMENT BY ID
============================================================ */

export async function getPaiementById(
  id: string,
) {
  const centreId =
    await getCentreId();

  const paiement =
    await prisma.paiement.findFirst({
      where: {
        id,
        centreId,
      },

      include: {
        apprenant: true,

        inscription: {
          include: {
            session: {
              include: {
                formation: true,
              },
            },
          },
        },

        facture: {
          include: {
            lignes: true,

            echeances: {
              orderBy: {
                numero: "asc",
              },
            },
          },
        },

        echeance: true,
      },
    });

  if (!paiement) {
    return null;
  }

  return serializeForClient(
    paiement,
  );
}

/* ============================================================
   DONNEES FORMULAIRE
============================================================ */

export async function getPaiementFormData() {
  const centreId =
    await getCentreId();

  const inscriptions =
    await prisma.inscription.findMany({
      where: {
        session: {
          centreId,
        },

        statut: {
          in: [
            "CONFIRMEE",
            "ACTIVE",
          ],
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

      select: {
        id: true,
        numero: true,
        montantConvenu: true,

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
            code: true,
            nom: true,

            formation: {
              select: {
                id: true,
                nom: true,
              },
            },
          },
        },

        factures: {
          where: {
            statut: {
              not: "ANNULEE",
            },
          },

          orderBy: {
            dateEmission: "desc",
          },

          select: {
            id: true,
            numero: true,

            total: true,
            montantPaye: true,
            montantDu: true,

            statut: true,

            echeances: {
              orderBy: {
                numero: "asc",
              },

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
    });

  return {
    inscriptions:
      inscriptions.map(
        (inscription) => ({
          id:
            inscription.id,

          numero:
            inscription.numero,

          montantConvenu:
            inscription
              .montantConvenu
              .toString(),

          apprenant:
            inscription
              .apprenant,

          session: {
            id:
              inscription
                .session.id,

            code:
              inscription
                .session.code,

            nom:
              inscription
                .session.nom,

            formation:
              inscription
                .session
                .formation,
          },

          factures:
            inscription.factures.map(
              (facture) => ({
                id:
                  facture.id,

                numero:
                  facture.numero,

                total:
                  facture.total
                    .toString(),

                montantPaye:
                  facture
                    .montantPaye
                    .toString(),

                montantDu:
                  facture
                    .montantDu
                    .toString(),

                statut:
                  facture.statut,

                echeances:
                  facture.echeances.map(
                    (echeance) => ({
                      id:
                        echeance.id,

                      numero:
                        echeance.numero,

                      dateEcheance:
                        echeance
                          .dateEcheance
                          .toISOString(),

                      montant:
                        echeance
                          .montant
                          .toString(),

                      montantPaye:
                        echeance
                          .montantPaye
                          .toString(),

                      montantDu:
                        echeance
                          .montantDu
                          .toString(),

                      statut:
                        echeance.statut,
                    }),
                  ),
              }),
            ),
        }),
      ),
  };
}

/* ============================================================
   CREATE
============================================================ */

export async function createPaiement(
  data: unknown,
): Promise<ActionResult> {
  try {
    const centreId =
      await getCentreId();

    const parsed =
      createPaiementSchema.parse(
        data,
      );

    const result =
      await prisma.$transaction(
        async (tx) => {
          let factureId =
            parsed.factureId ??
            null;

          let echeanceId =
            parsed.echeanceId ??
            null;

          let inscriptionId =
            parsed.inscriptionId ??
            null;

          let apprenantId =
            parsed.apprenantId ??
            null;

          /* ----------------------------------------
             FACTURE
          ---------------------------------------- */

          if (factureId) {
            const facture =
              await verifierFacture(
                tx,
                factureId,
                centreId,
              );

            if (!inscriptionId) {
              inscriptionId =
                facture.inscriptionId ??
                null;
            }
          }

          /* ----------------------------------------
             ECHEANCE
          ---------------------------------------- */

          if (echeanceId) {
            const echeance =
              await verifierEcheance(
                tx,
                echeanceId,
                centreId,
                factureId,
              );

            if (!factureId) {
              factureId =
                echeance.factureId ??
                null;
            }

            if (!inscriptionId) {
              inscriptionId =
                echeance.inscriptionId ??
                null;
            }
          }

          /* ----------------------------------------
             INSCRIPTION
          ---------------------------------------- */

          if (inscriptionId) {
            const inscription =
              await tx.inscription.findFirst(
                {
                  where: {
                    id: inscriptionId,

                    session: {
                      centreId,
                    },
                  },

                  select: {
                    id: true,
                    apprenantId: true,
                  },
                },
              );

            if (!inscription) {
              throw new Error(
                "L'inscription sélectionnée est introuvable.",
              );
            }

            if (!apprenantId) {
              apprenantId =
                inscription.apprenantId;
            }
          }

          /* ----------------------------------------
             APPRENANT
          ---------------------------------------- */

          if (apprenantId) {
            const apprenant =
              await tx.apprenant.findFirst(
                {
                  where: {
                    id: apprenantId,
                    centreId,
                  },

                  select: {
                    id: true,
                  },
                },
              );

            if (!apprenant) {
              throw new Error(
                "L'apprenant sélectionné est introuvable.",
              );
            }
          }

          /* ----------------------------------------
             MONTANT
          ---------------------------------------- */

          await verifierMontantDisponible(
            tx,
            {
              centreId,

              montant:
                Number(
                  parsed.montant,
                ),

              factureId,
              echeanceId,
            },
          );

          /* ----------------------------------------
             CREATION
          ---------------------------------------- */

          const paiement =
            await tx.paiement.create({
              data: {
                centreId,

                apprenantId,
                inscriptionId,

                factureId,
                echeanceId,

                reference:
                  parsed.reference,

                montant:
                  parsed.montant,

                mode:
                  parsed.mode,

                statut:
                  parsed.statut,

                datePaiement:
                  parsed.datePaiement
                    ? new Date(
                        parsed.datePaiement,
                      )
                    : null,

                referenceTransaction:
                  parsed.referenceTransaction ??
                  null,

                notes:
                  parsed.notes ??
                  null,
              },
            });

          /* ----------------------------------------
             RECALCULS
          ---------------------------------------- */

          if (echeanceId) {
            await recalculerEcheance(
              tx,
              echeanceId,
              centreId,
            );
          }

          if (factureId) {
            await recalculerFacture(
              tx,
              factureId,
              centreId,
            );
          }

          return paiement;
        },
      );

    revalidatePath(
      "/paiements",
    );

    revalidatePath(
      "/factures",
    );

    if (result.factureId) {
      revalidatePath(
        `/factures/${result.factureId}`,
      );
    }

    return {
      success: true,

      message:
        "Paiement enregistré avec succès.",

      data: {
        id: result.id,
      },
    };
  } catch (error) {
    console.error(
      "CREATE_PAIEMENT_ERROR:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer le paiement.",
    };
  }
}

/* ============================================================
   UPDATE
============================================================ */

export async function updatePaiement(
  id: string,
  data: unknown,
): Promise<ActionResult> {
  try {
    const centreId =
      await getCentreId();

    const parsed =
      updatePaiementSchema.parse(
        data,
      );

    const result =
      await prisma.$transaction(
        async (tx) => {
          const ancien =
            await tx.paiement.findFirst(
              {
                where: {
                  id,
                  centreId,
                },
              },
            );

          if (!ancien) {
            throw new Error(
              "Paiement introuvable.",
            );
          }

          let factureId =
            parsed.factureId ??
            null;

          let echeanceId =
            parsed.echeanceId ??
            null;

          let inscriptionId =
            parsed.inscriptionId ??
            null;

          let apprenantId =
            parsed.apprenantId ??
            null;

          /* ----------------------------------------
             FACTURE
          ---------------------------------------- */

          if (factureId) {
            const facture =
              await verifierFacture(
                tx,
                factureId,
                centreId,
              );

            if (!inscriptionId) {
              inscriptionId =
                facture.inscriptionId ??
                null;
            }
          }

          /* ----------------------------------------
             ECHEANCE
          ---------------------------------------- */

          if (echeanceId) {
            const echeance =
              await verifierEcheance(
                tx,
                echeanceId,
                centreId,
                factureId,
              );

            if (!factureId) {
              factureId =
                echeance.factureId ??
                null;
            }

            if (!inscriptionId) {
              inscriptionId =
                echeance.inscriptionId ??
                null;
            }
          }

          /* ----------------------------------------
             INSCRIPTION
          ---------------------------------------- */

          if (inscriptionId) {
            const inscription =
              await tx.inscription.findFirst(
                {
                  where: {
                    id: inscriptionId,

                    session: {
                      centreId,
                    },
                  },

                  select: {
                    id: true,
                    apprenantId: true,
                  },
                },
              );

            if (!inscription) {
              throw new Error(
                "L'inscription sélectionnée est introuvable.",
              );
            }

            if (!apprenantId) {
              apprenantId =
                inscription.apprenantId;
            }
          }

          /* ----------------------------------------
             APPRENANT
          ---------------------------------------- */

          if (apprenantId) {
            const apprenant =
              await tx.apprenant.findFirst(
                {
                  where: {
                    id: apprenantId,
                    centreId,
                  },
                },
              );

            if (!apprenant) {
              throw new Error(
                "L'apprenant sélectionné est introuvable.",
              );
            }
          }

          /* ----------------------------------------
             MONTANT
          ---------------------------------------- */

          await verifierMontantDisponible(
            tx,
            {
              centreId,

              montant:
                Number(
                  parsed.montant,
                ),

              factureId,
              echeanceId,

              paiementId: id,
            },
          );

          /* ----------------------------------------
             UPDATE
          ---------------------------------------- */

          const paiement =
            await tx.paiement.update({
              where: {
                id,
              },

              data: {
                apprenantId,
                inscriptionId,

                factureId,
                echeanceId,

                reference:
                  parsed.reference,

                montant:
                  parsed.montant,

                mode:
                  parsed.mode,

                statut:
                  parsed.statut,

                datePaiement:
                  parsed.datePaiement
                    ? new Date(
                        parsed.datePaiement,
                      )
                    : null,

                referenceTransaction:
                  parsed.referenceTransaction ??
                  null,

                notes:
                  parsed.notes ??
                  null,
              },
            });

          /* ----------------------------------------
             ANCIENNES RELATIONS
          ---------------------------------------- */

          if (
            ancien.echeanceId &&
            ancien.echeanceId !==
              echeanceId
          ) {
            await recalculerEcheance(
              tx,
              ancien.echeanceId,
              centreId,
            );
          }

          if (
            ancien.factureId &&
            ancien.factureId !==
              factureId
          ) {
            await recalculerFacture(
              tx,
              ancien.factureId,
              centreId,
            );
          }

          /* ----------------------------------------
             NOUVELLES RELATIONS
          ---------------------------------------- */

          if (echeanceId) {
            await recalculerEcheance(
              tx,
              echeanceId,
              centreId,
            );
          }

          if (factureId) {
            await recalculerFacture(
              tx,
              factureId,
              centreId,
            );
          }

          return paiement;
        },
      );

    revalidatePath(
      "/paiements",
    );

    revalidatePath(
      "/factures",
    );

    if (result.factureId) {
      revalidatePath(
        `/factures/${result.factureId}`,
      );
    }

    return {
      success: true,

      message:
        "Paiement modifié avec succès.",

      data: {
        id: result.id,
      },
    };
  } catch (error) {
    console.error(
      "UPDATE_PAIEMENT_ERROR:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de modifier le paiement.",
    };
  }
}

/* ============================================================
   DELETE
============================================================ */

export async function deletePaiement(
  id: string,
): Promise<ActionResult> {
  try {
    const centreId =
      await getCentreId();

    await prisma.$transaction(
      async (tx) => {
        const paiement =
          await tx.paiement.findFirst(
            {
              where: {
                id,
                centreId,
              },
            },
          );

        if (!paiement) {
          throw new Error(
            "Paiement introuvable.",
          );
        }

        const factureId =
          paiement.factureId;

        const echeanceId =
          paiement.echeanceId;

        await tx.paiement.delete({
          where: {
            id,
          },
        });

        if (echeanceId) {
          await recalculerEcheance(
            tx,
            echeanceId,
            centreId,
          );
        }

        if (factureId) {
          await recalculerFacture(
            tx,
            factureId,
            centreId,
          );
        }
      },
    );

    revalidatePath(
      "/paiements",
    );

    revalidatePath(
      "/factures",
    );

    return {
      success: true,

      message:
        "Paiement supprimé avec succès.",
    };
  } catch (error) {
    console.error(
      "DELETE_PAIEMENT_ERROR:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de supprimer le paiement.",
    };
  }
}
