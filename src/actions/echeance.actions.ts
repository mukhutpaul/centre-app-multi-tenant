"use server";

import { revalidatePath } from "next/cache";

import {
  StatutEcheance,
  StatutFacture,
  StatutPaiement,
} from "@/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

import { getCurrentCentreContext } from "@/lib/validations/centre-access";
import { Prisma } from "@/generated/prisma/browser";

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

type GenerateEcheancierOptions = {
  nombreEcheances: number;
  premiereDateEcheance?: Date | string | null;
};

type ActionResult = {
  success: boolean;
  message: string;
};

/**
 * ============================================================
 * CONSTANTES
 * ============================================================
 */

const FACTURES_PATH = "/factures";

/**
 * ============================================================
 * UTILITAIRES
 * ============================================================
 */

/**
 * Ajoute un nombre de mois en conservant le jour lorsque cela
 * est possible.
 *
 * Exemple :
 *
 * 31 janvier + 1 mois
 * => 28 février
 *
 * 31 janvier + 2 mois
 * => 31 mars
 */
function addMonthsClamped(
  date: Date,
  months: number,
): Date {
  const result = new Date(date);

  const day = result.getDate();

  result.setDate(1);
  result.setMonth(
    result.getMonth() + months,
  );

  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();

  result.setDate(
    Math.min(day, lastDay),
  );

  return result;
}

/**
 * Retourne le statut d'une échéance selon sa situation.
 */
function getStatutEcheance(
  dateEcheance: Date,
  montant: number,
  montantPaye: number,
): StatutEcheance {
  if (montantPaye >= montant) {
    return StatutEcheance.PAYEE;
  }

  if (montantPaye > 0) {
    return StatutEcheance.PARTIELLE;
  }

  if (
    dateEcheance.getTime() <
    Date.now()
  ) {
    return StatutEcheance.EN_RETARD;
  }

  return StatutEcheance.EN_ATTENTE;
}

/**
 * ============================================================
 * GET ECHEANCES D'UNE FACTURE
 * ============================================================
 */
export async function getEcheancesByFacture(
  factureId: string,
) {
  const context =
    await getCurrentCentreContext();

  if (!context.centreId) {
    throw new Error(
      "Aucun centre actif n'est associé à votre compte.",
    );
  }

  /**
   * Vérification de la facture.
   *
   * IMPORTANT :
   * le centreId vient toujours du contexte authentifié.
   */
  const facture =
    await prisma.facture.findFirst({
      where: {
        id: factureId,
        centreId: context.centreId,
      },
      select: {
        id: true,
      },
    });

  if (!facture) {
    throw new Error(
      "Facture introuvable dans votre centre.",
    );
  }

  const echeances =
    await prisma.echeancePaiement.findMany({
      where: {
        factureId,
        centreId: context.centreId,
      },

      include: {
        paiements: {
          where: {
            statut:
              StatutPaiement.EFFECTUE,
          },
          orderBy: {
            datePaiement: "desc",
          },
        },
      },

      orderBy: {
        numero: "asc",
      },
    });

  return echeances;
}

/**
 * ============================================================
 * GET ECHEANCE PAR ID
 * ============================================================
 */
export async function getEcheanceById(
  echeanceId: string,
) {
  const context =
    await getCurrentCentreContext();

  if (!context.centreId) {
    throw new Error(
      "Aucun centre actif n'est associé à votre compte.",
    );
  }

  const echeance =
    await prisma.echeancePaiement.findFirst({
      where: {
        id: echeanceId,
        centreId: context.centreId,
      },

      include: {
        facture: {
          include: {
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
            lignes: true,
          },
        },

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

        paiements: {
          where: {
            statut:
              StatutPaiement.EFFECTUE,
          },
          orderBy: {
            datePaiement: "desc",
          },
        },
      },
    });

  if (!echeance) {
    throw new Error(
      "Échéance introuvable.",
    );
  }

  return echeance;
}

/**
 * ============================================================
 * GENERER L'ECHEANCIER
 * ============================================================
 *
 * Exemple :
 *
 * Facture = 300 000
 * Nombre = 3
 *
 * => 100 000
 * => 100 000
 * => 100 000
 *
 * Exemple :
 *
 * Facture = 100 000
 * Nombre = 3
 *
 * => 33 333.33
 * => 33 333.33
 * => 33 333.34
 *
 * Le dernier montant absorbe toujours l'éventuel arrondi.
 */
export async function generateEcheancier(
  factureId: string,
  options: GenerateEcheancierOptions,
): Promise<ActionResult> {
  const context =
    await getCurrentCentreContext();

  if (!context.centreId) {
    throw new Error(
      "Aucun centre actif n'est associé à votre compte.",
    );
  }

  /**
   * ==========================================================
   * VALIDATION DU NOMBRE
   * ==========================================================
   */

  const nombre =
    Number(
      options.nombreEcheances,
    );

  if (
    !Number.isInteger(nombre) ||
    nombre < 1 ||
    nombre > 36
  ) {
    throw new Error(
      "Le nombre d'échéances doit être compris entre 1 et 36.",
    );
  }

  /**
   * ==========================================================
   * TRANSACTION
   * ==========================================================
   *
   * On fait toute la génération dans une transaction.
   *
   * Ainsi :
   *
   * facture verrouillée/lue
   *        ↓
   * vérification
   *        ↓
   * création des échéances
   *
   * Tout réussit ou tout est annulé.
   *
   * Prisma recommande les transactions pour les opérations
   * dépendantes qui doivent réussir ou échouer ensemble.
   */
  const result =
    await prisma.$transaction(
      async (tx) => {
        /**
         * ------------------------------------------------------
         * FACTURE
         * ------------------------------------------------------
         */

        const facture =
          await tx.facture.findFirst({
            where: {
              id: factureId,
              centreId:
                context.centreId,
            },

            include: {
              inscription: true,
              echeances: {
                select: {
                  id: true,
                },
              },
            },
          });

        if (!facture) {
          throw new Error(
            "Facture introuvable dans votre centre.",
          );
        }

        /**
         * ------------------------------------------------------
         * FACTURE ANNULEE
         * ------------------------------------------------------
         */

        if (
          facture.statut ===
          StatutFacture.ANNULEE
        ) {
          throw new Error(
            "Impossible de générer un échéancier pour une facture annulée.",
          );
        }

        /**
         * ------------------------------------------------------
         * FACTURE SANS INSCRIPTION
         * ------------------------------------------------------
         *
         * EcheancePaiement.inscriptionId est optionnel
         * dans le schéma actuel.
         *
         * Mais pour le workflow formation, une facture
         * d'inscription doit idéalement être liée à une
         * inscription.
         *
         * On autorise donc la génération sans inscription,
         * puisque le schéma le permet.
         */

        /**
         * ------------------------------------------------------
         * ECHEANCIER EXISTANT
         * ------------------------------------------------------
         */

        if (
          facture.echeances.length > 0
        ) {
          throw new Error(
            "Un échéancier existe déjà pour cette facture.",
          );
        }

        /**
         * ------------------------------------------------------
         * TOTAL
         * ------------------------------------------------------
         */

        const total =
          facture.total;

        if (
          total.lessThanOrEqualTo(0)
        ) {
          throw new Error(
            "Impossible de générer un échéancier pour une facture dont le total est nul.",
          );
        }

        /**
         * ------------------------------------------------------
         * PREMIERE DATE
         * ------------------------------------------------------
         */

        let premiereDate: Date;

        if (
          options.premiereDateEcheance
        ) {
          premiereDate =
            new Date(
              options.premiereDateEcheance,
            );
        } else if (
          facture.dateEcheance
        ) {
          premiereDate =
            new Date(
              facture.dateEcheance,
            );
        } else {
          premiereDate =
            new Date(
              facture.dateEmission,
            );
        }

        if (
          Number.isNaN(
            premiereDate.getTime(),
          )
        ) {
          throw new Error(
            "La date de première échéance est invalide.",
          );
        }

        /**
         * ------------------------------------------------------
         * CALCUL DES MONTANTS
         * ------------------------------------------------------
         *
         * Decimal.js garantit ici que les calculs financiers
         * ne reposent pas sur les flottants JavaScript.
         */

        const base =
          total
            .div(nombre)
            .toDecimalPlaces(2);

        /**
         * ------------------------------------------------------
         * CREATION
         * ------------------------------------------------------
         */

        const echeances = [];

        for (
          let index = 0;
          index < nombre;
          index++
        ) {
          const numero =
            index + 1;

          /**
           * Tous les versements sauf le dernier
           * prennent le montant de base.
           */
          let montant = base;

          /**
           * Le dernier prend le solde exact.
           *
           * Exemple :
           *
           * 100 000 / 3
           *
           * base = 33 333.33
           *
           * dernier =
           * 100 000 - (33 333.33 × 2)
           *
           * = 33 333.34
           */
          if (
            numero === nombre
          ) {
            montant =
              total.minus(
                base.mul(
                  nombre - 1,
                ),
              );
          }

          /**
           * Chaque échéance est mensuelle.
           */
          const dateEcheance =
            addMonthsClamped(
              premiereDate,
              index,
            );

          /**
           * Statut initial.
           */
          const statut =
            getStatutEcheance(
              dateEcheance,
              Number(montant),
              0,
            );

          const echeance =
            await tx.echeancePaiement.create(
              {
                data: {
                  centreId:
                    context.centreId!,

                  inscriptionId:
                    facture.inscriptionId ??
                    null,

                  factureId:
                    facture.id,

                  numero,

                  dateEcheance,

                  montant,

                  montantPaye:
                    0,

                  montantDu:
                    montant,

                  statut,

                  notes: null,
                },
              },
            );

          echeances.push(
            echeance,
          );
        }

        return echeances;
      },
    );

  /**
   * ==========================================================
   * INVALIDATION CACHE
   * ==========================================================
   */

  revalidatePath(
    FACTURES_PATH,
  );

  revalidatePath(
    `${FACTURES_PATH}/${factureId}`,
  );

  revalidatePath(
    "/echeances",
  );

  return {
    success: true,
    message: `${result.length} échéance${result.length > 1 ? "s" : ""} générée${result.length > 1 ? "s" : ""} avec succès.`,
  };
}

/**
 * ============================================================
 * SUPPRIMER L'ECHEANCIER
 * ============================================================
 *
 * Cette fonction est volontairement stricte :
 *
 * on ne supprime pas un échéancier contenant déjà
 * des paiements effectués.
 */
export async function deleteEcheancier(
  factureId: string,
): Promise<ActionResult> {
  const context =
    await getCurrentCentreContext();

  if (!context.centreId) {
    throw new Error(
      "Aucun centre actif n'est associé à votre compte.",
    );
  }

  const facture =
    await prisma.facture.findFirst({
      where: {
        id: factureId,
        centreId: context.centreId,
      },

      include: {
        echeances: {
          include: {
            paiements: {
              where: {
                statut:
                  StatutPaiement.EFFECTUE,
              },
            },
          },
        },
      },
    });

  if (!facture) {
    throw new Error(
      "Facture introuvable.",
    );
  }

  if (
    facture.echeances.length === 0
  ) {
    throw new Error(
      "Aucun échéancier n'existe pour cette facture.",
    );
  }

  const contientPaiements =
    facture.echeances.some(
      (echeance) =>
        echeance.paiements.length > 0,
    );

  if (contientPaiements) {
    throw new Error(
      "Impossible de supprimer cet échéancier car au moins une échéance possède déjà un paiement.",
    );
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.echeancePaiement.deleteMany(
        {
          where: {
            factureId,
            centreId:
              context.centreId!,
          },
        },
      );

      /**
       * Recalculer la facture après suppression
       * de l'échéancier.
       *
       * Les paiements effectués restent la source
       * de vérité pour montantPaye.
       */
      const paiements =
        await tx.paiement.findMany({
          where: {
            factureId,
            centreId:
              context.centreId!,
            statut:
              StatutPaiement.EFFECTUE,
          },

          select: {
            montant: true,
          },
        });

      let montantPaye =
        new factureDecimal(0);

      for (
        const paiement of paiements
      ) {
        montantPaye =
          montantPaye.plus(
            paiement.montant,
          );
      }

      const montantDu =
        facture.total.minus(
          montantPaye,
        );

      let statut =
        facture.statut;

      if (
        facture.statut !==
        StatutFacture.ANNULEE
      ) {
        if (
          montantDu.lessThanOrEqualTo(
            0,
          )
        ) {
          statut =
            StatutFacture.PAYEE;
        } else if (
          montantPaye.greaterThan(0)
        ) {
          statut =
            StatutFacture.PARTIELLEMENT_PAYEE;
        } else if (
          facture.dateEcheance &&
          facture.dateEcheance <
            new Date()
        ) {
          statut =
            StatutFacture.EN_RETARD;
        } else {
          statut =
            StatutFacture.EMISE;
        }
      }

      await tx.facture.update({
        where: {
          id: factureId,
        },

        data: {
          montantPaye,
          montantDu,
          statut,
        },
      });
    },
  );

  revalidatePath(
    FACTURES_PATH,
  );

  revalidatePath(
    `${FACTURES_PATH}/${factureId}`,
  );

  return {
    success: true,
    message:
      "Échéancier supprimé avec succès.",
  };
}

/**
 * ============================================================
 * DECIMAL HELPER
 * ============================================================
 *
 * On évite de dépendre directement d'un import Prisma
 * supplémentaire dans ce fichier.
 */


const factureDecimal =
  Prisma.Decimal(0);