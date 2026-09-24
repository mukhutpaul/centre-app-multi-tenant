"use server";

import {
  StatutPaiement,
  TypePaiement,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

type PeriodeRapport =
  | "JOUR"
  | "MOIS"
  | "TRIMESTRE"
  | "SEMESTRE"
  | "ANNEE";

export type RapportFinancier = {
  periode: {
    debut: Date;
    fin: Date;
    type: PeriodeRapport;
  };

  synthese: {
    totalEncaisse: number;
    totalPaiementsReguliers: number;
    totalReglementsConventions: number;

    totalFacture: number;
    totalFacturePaye: number;
    totalFactureReste: number;

    totalEcheances: number;
    totalEcheancesPayees: number;
    totalEcheancesRestantes: number;
    totalEcheancesEnRetard: number;
  };

  inscriptions: {
    total: number;
    payees: number;
    partielles: number;
    nonPayees: number;
  };

  modesPaiement: {
    mode: string;
    montant: number;
    nombre: number;
  }[];

  evolution: {
    periode: string;
    montant: number;
  }[];

  inscriptionsDetails: {
    id: string;
    numero: string;
    apprenant: string;
    formation: string;
    session: string;

    /**
     * Total de tous les frais liés à la formation.
     *
     * Exemple :
     * - Inscription : 100 USD
     * - Formation : 800 USD
     * - Examen : 150 USD
     * - Certification : 100 USD
     *
     * tarif = 1 150 USD
     */
    tarif: number;

    montantConvenu: number;

    /**
     * Total de tous les paiements réguliers
     * effectués pour cette inscription.
     */
    totalPaye: number;

    /**
     * Total frais - total payé.
     */
    reste: number;

    pourcentage: number;

    statut:
      | "PAYEE"
      | "PARTIELLE"
      | "NON_PAYEE";

    dernierPaiement: Date | null;
  }[];

  paiements: {
    id: string;
    date: Date | null;
    apprenant: string;
    inscription: string | null;
    montant: number;
    devise: string;
    mode: string;
    type: string;
    reference: string | null;
  }[];

  echeances: {
    id: string;
    inscription: string | null;
    apprenant: string;
    dateEcheance: Date;
    montant: number;
    montantPaye: number;
    montantDu: number;
    statut: string;
    enRetard: boolean;
  }[];
};

/*
 * ============================================================
 * PERIODE
 * ============================================================
 */

function debutPeriode(
  type: PeriodeRapport,
  date: Date
): Date {
  const d = new Date(date);

  if (type === "JOUR") {
    return new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      0,
      0,
      0,
      0
    );
  }

  if (type === "MOIS") {
    return new Date(
      d.getFullYear(),
      d.getMonth(),
      1,
      0,
      0,
      0,
      0
    );
  }

  if (type === "TRIMESTRE") {
    const trimestre =
      Math.floor(d.getMonth() / 3);

    return new Date(
      d.getFullYear(),
      trimestre * 3,
      1,
      0,
      0,
      0,
      0
    );
  }

  if (type === "SEMESTRE") {
    const semestre =
      d.getMonth() < 6 ? 0 : 6;

    return new Date(
      d.getFullYear(),
      semestre,
      1,
      0,
      0,
      0,
      0
    );
  }

  return new Date(
    d.getFullYear(),
    0,
    1,
    0,
    0,
    0,
    0
  );
}

function finPeriode(
  type: PeriodeRapport,
  date: Date
): Date {
  const debut = debutPeriode(
    type,
    date
  );

  if (type === "JOUR") {
    return new Date(
      debut.getFullYear(),
      debut.getMonth(),
      debut.getDate() + 1,
      0,
      0,
      0,
      0
    );
  }

  if (type === "MOIS") {
    return new Date(
      debut.getFullYear(),
      debut.getMonth() + 1,
      1,
      0,
      0,
      0,
      0
    );
  }

  if (type === "TRIMESTRE") {
    return new Date(
      debut.getFullYear(),
      debut.getMonth() + 3,
      1,
      0,
      0,
      0,
      0
    );
  }

  if (type === "SEMESTRE") {
    return new Date(
      debut.getFullYear(),
      debut.getMonth() + 6,
      1,
      0,
      0,
      0,
      0
    );
  }

  return new Date(
    debut.getFullYear() + 1,
    0,
    1,
    0,
    0,
    0,
    0
  );
}

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function nombre(
  value: unknown
): number {
  return Number(value ?? 0);
}

function formatPeriode(
  date: Date,
  type: PeriodeRapport
): string {
  if (type === "JOUR") {
    return date.toLocaleDateString(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
      }
    );
  }

  if (type === "MOIS") {
    return date.toLocaleDateString(
      "fr-FR",
      {
        month: "short",
        year: "numeric",
      }
    );
  }

  if (type === "TRIMESTRE") {
    const trimestre =
      Math.floor(date.getMonth() / 3) + 1;

    return `T${trimestre} ${date.getFullYear()}`;
  }

  if (type === "SEMESTRE") {
    const semestre =
      date.getMonth() < 6 ? 1 : 2;

    return `S${semestre} ${date.getFullYear()}`;
  }

  return String(
    date.getFullYear()
  );
}

/*
 * ============================================================
 * RAPPORT FINANCIER
 * ============================================================
 */

export async function getRapportFinancier(
  params?: {
    type?: PeriodeRapport;
    date?: string;
    inscriptionId?: string;
    apprenantId?: string;
  }
) {
  try {
    /*
     * ========================================================
     * 1. PARAMETRES
     * ========================================================
     */

    const type =
      params?.type ?? "MOIS";

    const dateReference =
      params?.date
        ? new Date(params.date)
        : new Date();

    if (
      Number.isNaN(
        dateReference.getTime()
      )
    ) {
      throw new Error(
        "Date de référence invalide."
      );
    }

    const debut =
      debutPeriode(
        type,
        dateReference
      );

    const fin =
      finPeriode(
        type,
        dateReference
      );

    /*
     * ========================================================
     * 2. PAIEMENTS EFFECTUES
     * ========================================================
     */

    const paiements =
      await prisma.paiement.findMany({
        where: {
          statut:
            StatutPaiement.EFFECTUE,

          datePaiement: {
            gte: debut,
            lt: fin,
          },

          ...(params?.inscriptionId
            ? {
                inscriptionId:
                  params.inscriptionId,
              }
            : {}),

          ...(params?.apprenantId
            ? {
                apprenantId:
                  params.apprenantId,
              }
            : {}),
        },

        include: {
          apprenant: true,

          inscription: {
            include: {
              apprenant: true,

              session: {
                include: {
                  formation: {
                    include: {
                      tarifs: true,
                    },
                  },
                },
              },
            },
          },

          facture: {
            include: {
              convention: true,
            },
          },

          echeance: true,

          tarifFormation: true,
        },

        orderBy: {
          datePaiement: "desc",
        },
      });

    /*
     * ========================================================
     * 3. FACTURES
     * ========================================================
     */

    const factures =
      await prisma.facture.findMany({
        where: {
          dateEmission: {
            gte: debut,
            lt: fin,
          },
        },

        include: {
          convention: true,
        },

        orderBy: {
          dateEmission: "desc",
        },
      });

    /*
     * ========================================================
     * 4. ECHEANCES
     * ========================================================
     */

    const echeances =
      await prisma.echeancePaiement.findMany({
        where: {
          dateEcheance: {
            gte: debut,
            lt: fin,
          },

          ...(params?.inscriptionId
            ? {
                inscriptionId:
                  params.inscriptionId,
              }
            : {}),
        },

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

          facture: true,
        },

        orderBy: {
          dateEcheance: "asc",
        },
      });

    /*
     * ========================================================
     * 5. INSCRIPTIONS
     *
     * Chemin :
     *
     * inscription
     *      ↓
     * session
     *      ↓
     * formation
     *      ↓
     * tarifs
     * ========================================================
     */

    const inscriptions =
      await prisma.inscription.findMany({
        where: {
          ...(params?.inscriptionId
            ? {
                id: params.inscriptionId,
              }
            : {}),

          ...(params?.apprenantId
            ? {
                apprenantId:
                  params.apprenantId,
              }
            : {}),
        },

        include: {
          apprenant: true,

          session: {
            include: {
              formation: {
                include: {
                  tarifs: true,
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

            include: {
              tarifFormation: true,
            },
          },

          echeances: {
            orderBy: {
              dateEcheance: "asc",
            },
          },
        },

        orderBy: {
          dateInscription: "desc",
        },
      });

    /*
     * ========================================================
     * 6. CALCUL ENCAISSEMENTS
     * ========================================================
     */

    let totalEncaisse = 0;

    let totalPaiementsReguliers = 0;

    let totalReglementsConventions = 0;

    const modes =
      new Map<
        string,
        {
          montant: number;
          nombre: number;
        }
      >();

    const evolutionMap =
      new Map<string, number>();

    for (const paiement of paiements) {
      const montant =
        nombre(
          paiement.montant
        );

      totalEncaisse += montant;

      /*
       * Paiement régulier
       */

      if (
        paiement.type ===
        TypePaiement.PAIEMENT_REGULIER
      ) {
        totalPaiementsReguliers +=
          montant;
      }

      /*
       * Règlement facture/convention
       */

      if (
        paiement.type ===
        TypePaiement.REGLEMENT_FACTURE_CONVENTION
      ) {
        totalReglementsConventions +=
          montant;
      }

      /*
       * Mode de paiement
       */

      const mode =
        paiement.mode;

      const ancien =
        modes.get(mode) ?? {
          montant: 0,
          nombre: 0,
        };

      modes.set(mode, {
        montant:
          ancien.montant +
          montant,

        nombre:
          ancien.nombre + 1,
      });

      /*
       * Evolution
       */

      if (
        paiement.datePaiement
      ) {
        const cle =
          formatPeriode(
            paiement.datePaiement,
            type
          );

        evolutionMap.set(
          cle,
          (
            evolutionMap.get(cle) ??
            0
          ) + montant
        );
      }
    }

    /*
     * ========================================================
     * 7. FACTURES
     * ========================================================
     */

    const totalFacture =
      factures.reduce(
        (
          total,
          facture
        ) =>
          total +
          nombre(
            facture.total
          ),
        0
      );

    const totalFacturePaye =
      factures.reduce(
        (
          total,
          facture
        ) =>
          total +
          nombre(
            facture.montantPaye
          ),
        0
      );

    const totalFactureReste =
      factures.reduce(
        (
          total,
          facture
        ) =>
          total +
          nombre(
            facture.montantDu
          ),
        0
      );

    /*
     * ========================================================
     * 8. ECHEANCES
     * ========================================================
     */

    const maintenant =
      new Date();

    const totalEcheances =
      echeances.reduce(
        (
          total,
          echeance
        ) =>
          total +
          nombre(
            echeance.montant
          ),
        0
      );

    const totalEcheancesPayees =
      echeances.reduce(
        (
          total,
          echeance
        ) =>
          total +
          nombre(
            echeance.montantPaye
          ),
        0
      );

    const totalEcheancesRestantes =
      echeances.reduce(
        (
          total,
          echeance
        ) =>
          total +
          nombre(
            echeance.montantDu
          ),
        0
      );

    const totalEcheancesEnRetard =
      echeances
        .filter(
          (echeance) =>
            echeance.dateEcheance <
              maintenant &&
            nombre(
              echeance.montantDu
            ) > 0
        )
        .reduce(
          (
            total,
            echeance
          ) =>
            total +
            nombre(
              echeance.montantDu
            ),
          0
        );

    /*
     * ========================================================
     * 9. DETAILS DES INSCRIPTIONS
     * ========================================================
     *
     * IMPORTANT :
     *
     * Le montant de la colonne "tarif" représente maintenant
     * le TOTAL de tous les TarifFormation actifs liés à la
     * formation.
     *
     * Exemple :
     *
     *   Inscription       100 USD
     *   Formation         800 USD
     *   Examen            150 USD
     *   Certification     100 USD
     *   --------------------------------
     *   TOTAL           1 150 USD
     *
     * Ensuite :
     *
     *   Total frais = 1 150 USD
     *   Total payé  =   700 USD
     *   Reste       =   450 USD
     *
     * ========================================================
     */

    const inscriptionsDetails =
      inscriptions.map(
        (inscription) => {
          /*
           * ==================================================
           * FORMATION
           * ==================================================
           */

          const formation =
            inscription.session
              .formation;

          /*
           * ==================================================
           * TARIFS DE LA FORMATION
           * ==================================================
           *
           * On récupère uniquement les tarifs actifs.
           *
           * Chaque TarifFormation représente un frais
           * distinct lié à la formation.
           *
           * Exemple :
           *
           * [
           *   { montant: 100, actif: true },
           *   { montant: 800, actif: true },
           *   { montant: 150, actif: true }
           * ]
           *
           * donnera :
           *
           * 100 + 800 + 150 = 1 050
           * ==================================================
           */

          const tarifsActifs =
            formation.tarifs.filter(
              (tarif) =>
                tarif.actif
            );

          /*
           * ==================================================
           * TOTAL DE TOUS LES FRAIS
           * ==================================================
           */

          let montantTarif =
            tarifsActifs.reduce(
              (
                total,
                tarif
              ) =>
                total +
                nombre(
                  tarif.montant
                ),
              0
            );

          /*
           * ==================================================
           * FALLBACK
           *
           * Si aucun tarif actif n'existe, on regarde les
           * tarifs existants.
           *
           * Cela évite d'afficher 0 pour une formation qui
           * possède des tarifs mais qui auraient été
           * désactivés.
           * ==================================================
           */

          if (
            tarifsActifs.length === 0 &&
            formation.tarifs.length > 0
          ) {
            montantTarif =
              formation.tarifs.reduce(
                (
                  total,
                  tarif
                ) =>
                  total +
                  nombre(
                    tarif.montant
                  ),
                0
              );
          }

          /*
           * ==================================================
           * DERNIER FALLBACK
           *
           * Si la formation n'a aucun TarifFormation,
           * on utilise le montant convenu de l'inscription.
           * ==================================================
           */

          if (
            montantTarif === 0
          ) {
            montantTarif =
              nombre(
                inscription.montantConvenu
              );
          }

          /*
           * ==================================================
           * PAIEMENTS DE L'INSCRIPTION
           * ==================================================
           *
           * On ne prend que les paiements réguliers.
           *
           * Les règlements de conventions/factures ne sont
           * pas considérés comme des paiements individuels
           * de l'inscription.
           * ==================================================
           */

          const paiementsInscription =
            inscription.paiements.filter(
              (paiement) =>
                paiement.type ===
                TypePaiement.PAIEMENT_REGULIER
            );

          /*
           * ==================================================
           * TOTAL PAYE
           * ==================================================
           */

          const totalPaye =
            paiementsInscription.reduce(
              (
                total,
                paiement
              ) =>
                total +
                nombre(
                  paiement.montant
                ),
              0
            );

          /*
           * ==================================================
           * RESTE A PAYER
           * ==================================================
           */

          const reste =
            Math.max(
              montantTarif -
                totalPaye,
              0
            );

          /*
           * ==================================================
           * POURCENTAGE
           * ==================================================
           */

          const pourcentage =
            montantTarif > 0
              ? Math.min(
                  (
                    totalPaye /
                    montantTarif
                  ) * 100,
                  100
                )
              : 0;

          /*
           * ==================================================
           * STATUT FINANCIER
           * ==================================================
           */

          let statut:
            | "PAYEE"
            | "PARTIELLE"
            | "NON_PAYEE";

          if (
            montantTarif > 0 &&
            totalPaye >=
              montantTarif
          ) {
            statut =
              "PAYEE";
          } else if (
            totalPaye > 0
          ) {
            statut =
              "PARTIELLE";
          } else {
            statut =
              "NON_PAYEE";
          }

          /*
           * ==================================================
           * DERNIER PAIEMENT
           * ==================================================
           */

          const dernierPaiement =
            paiementsInscription[0]
              ?.datePaiement ??
            null;

          /*
           * ==================================================
           * NOM APPRENANT
           * ==================================================
           */

          const nomApprenant =
            `${inscription.apprenant.prenom} ${inscription.apprenant.nom}`;

          /*
           * ==================================================
           * NOM SESSION
           * ==================================================
           */

          const nomSession =
            inscription.session
              .nom ??
            inscription.session
              .code;

          /*
           * ==================================================
           * RESULTAT INSCRIPTION
           * ==================================================
           */

          return {
            id:
              inscription.id,

            numero:
              inscription.numero,

            apprenant:
              nomApprenant,

            formation:
              formation.nom,

            session:
              nomSession,

            /*
             * TOTAL DE TOUS LES FRAIS
             */
            tarif:
              montantTarif,

            montantConvenu:
              nombre(
                inscription.montantConvenu
              ),

            /*
             * TOTAL DE TOUS LES PAIEMENTS
             */
            totalPaye,

            /*
             * TOTAL - PAYE
             */
            reste,

            pourcentage,

            statut,

            dernierPaiement,
          };
        }
      );

    /*
     * ========================================================
     * 10. STATISTIQUES INSCRIPTIONS
     * ========================================================
     */

    const inscriptionsPayees =
      inscriptionsDetails.filter(
        (item) =>
          item.statut ===
          "PAYEE"
      ).length;

    const inscriptionsPartielles =
      inscriptionsDetails.filter(
        (item) =>
          item.statut ===
          "PARTIELLE"
      ).length;

    const inscriptionsNonPayees =
      inscriptionsDetails.filter(
        (item) =>
          item.statut ===
          "NON_PAYEE"
      ).length;

    /*
     * ========================================================
     * 11. EVOLUTION
     * ========================================================
     */

    const evolution =
      Array.from(
        evolutionMap.entries()
      ).map(
        ([
          periode,
          montant,
        ]) => ({
          periode,
          montant,
        })
      );

    /*
     * ========================================================
     * 12. RESULTAT
     * ========================================================
     */

    return {
      success: true as const,

      data: {
        periode: {
          debut,
          fin,
          type,
        },

        synthese: {
          totalEncaisse,

          totalPaiementsReguliers,

          totalReglementsConventions,

          totalFacture,

          totalFacturePaye,

          totalFactureReste,

          totalEcheances,

          totalEcheancesPayees,

          totalEcheancesRestantes,

          totalEcheancesEnRetard,
        },

        inscriptions: {
          total:
            inscriptionsDetails.length,

          payees:
            inscriptionsPayees,

          partielles:
            inscriptionsPartielles,

          nonPayees:
            inscriptionsNonPayees,
        },

        modesPaiement:
          Array.from(
            modes.entries()
          ).map(
            ([
              mode,
              valeur,
            ]) => ({
              mode,

              montant:
                valeur.montant,

              nombre:
                valeur.nombre,
            })
          ),

        evolution,

        /*
         * ====================================================
         * PAIEMENTS
         * ====================================================
         */

        paiements:
          paiements.map(
            (paiement) => ({
              id:
                paiement.id,

              date:
                paiement.datePaiement,

              apprenant:
                paiement.apprenant
                  ? `${paiement.apprenant.prenom} ${paiement.apprenant.nom}`
                  : "-",

              inscription:
                paiement.inscription
                  ?.numero ??
                null,

              montant:
                nombre(
                  paiement.montant
                ),

              devise:
                paiement.devise,

              mode:
                paiement.mode,

              type:
                paiement.type,

              reference:
                paiement.reference ??
                null,
            })
          ),

        /*
         * ====================================================
         * ECHEANCES
         * ====================================================
         */

        echeances:
          echeances.map(
            (echeance) => ({
              id:
                echeance.id,

              inscription:
                echeance.inscription
                  ?.numero ??
                null,

              apprenant:
                echeance.inscription
                  ?.apprenant
                  ? `${echeance.inscription.apprenant.prenom} ${echeance.inscription.apprenant.nom}`
                  : "-",

              dateEcheance:
                echeance.dateEcheance,

              montant:
                nombre(
                  echeance.montant
                ),

              montantPaye:
                nombre(
                  echeance.montantPaye
                ),

              montantDu:
                nombre(
                  echeance.montantDu
                ),

              statut:
                echeance.statut,

              enRetard:
                echeance.dateEcheance <
                  maintenant &&
                nombre(
                  echeance.montantDu
                ) > 0,
            })
          ),

        /*
         * ====================================================
         * INSCRIPTIONS
         * ====================================================
         */

        inscriptionsDetails,
      },
    };
  } catch (error) {
    console.error(
      "Erreur rapport financier:",
      error
    );

    return {
      success: false as const,

      error:
        error instanceof Error
          ? error.message
          : "Impossible de générer le rapport financier.",
    };
  }
}