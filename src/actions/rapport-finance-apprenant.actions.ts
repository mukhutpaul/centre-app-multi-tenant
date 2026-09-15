"use server";

import {
  Prisma,
  StatutFacture,
  StatutPaiement,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

import { getCurrentCentreContext } from "@/lib/validations/centre-access";

/* ============================================================
   TYPES
============================================================ */

export type ApprenantFinanceOption = {
  id: string;
  nomComplet: string;
  numero: string | null;
};

export type FormationFinanceOption = {
  id: string;
  code: string;
  nom: string;
};

export type SessionFinanceOption = {
  inscriptionId: string;
  numeroInscription: string;
  statutInscription: string;

  sessionId: string;
  sessionCode: string;
  sessionNom: string | null;

  dateDebut: string;
  dateFin: string;

  formationId: string;
  formationCode: string;
  formationNom: string;
};

export type SituationFinanciereApprenant = {
  apprenant: {
    id: string;
    nomComplet: string;
    numero: string | null;
    email: string | null;
    telephone: string | null;
  };

  inscription: {
    id: string;
    numero: string;
    statut: string;
    typeFinancement: string;
    dateInscription: string;
    montantConvenu: number;
  };

  formation: {
    id: string;
    code: string;
    nom: string;
  };

  session: {
    id: string;
    code: string;
    nom: string | null;
    dateDebut: string;
    dateFin: string;
  };

  resume: {
    montantConvenu: number;
    totalFacture: number;
    totalEncaisse: number;
    detteRestante: number;
    montantEnRetard: number;

    nombreFactures: number;
    nombrePaiements: number;
    nombrePaiementsEffectues: number;

    nombreEcheances: number;
    nombreEcheancesEnRetard: number;

    tauxPaiement: number;
  };

  paiements: {
    id: string;
    reference: string;
    montant: number;
    mode: string;
    statut: string;
    datePaiement: string | null;
    referenceTransaction: string | null;
    notes: string | null;

    factureNumero: string | null;
    echeanceNumero: number | null;
  }[];

  factures: {
    id: string;
    numero: string;
    dateEmission: string;
    dateEcheance: string | null;

    sousTotal: number;
    remise: number;
    taxe: number;
    total: number;

    montantPaye: number;
    montantDu: number;

    statut: string;
    notes: string | null;
  }[];

  echeances: {
    id: string;
    numero: number;

    dateEcheance: string;
    montant: number;
    montantPaye: number;
    montantDu: number;

    statut: string;

    joursRetard: number;
    estEnRetard: boolean;
  }[];
};

/* ============================================================
   CONTEXTE CENTRE
============================================================ */

async function getCentreIdOrThrow() {
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
   APPRENANTS
============================================================ */

export async function getApprenantsFinanceOptions(): Promise<
  ApprenantFinanceOption[]
> {
  const centreId =
    await getCentreIdOrThrow();

  const apprenants =
    await prisma.apprenant.findMany({
      where: {
        centreId,
        inscriptions: {
          some: {
            session: {
              centreId,
            },
          },
        },
      },

      select: {
        id: true,
        prenom: true,
        nom: true,
        numero: true,
      },

      orderBy: [
        {
          nom: "asc",
        },
        {
          prenom: "asc",
        },
      ],
    });

  return apprenants.map(
    (apprenant) => ({
      id: apprenant.id,

      nomComplet:
        `${apprenant.nom} ${apprenant.prenom}`.trim(),

      numero:
        apprenant.numero ?? null,
    }),
  );
}

/* ============================================================
   FORMATIONS D'UN APPRENANT
============================================================ */

export async function getFormationsFinanceByApprenant(
  apprenantId: string,
): Promise<FormationFinanceOption[]> {
  const centreId =
    await getCentreIdOrThrow();

  if (!apprenantId) {
    return [];
  }

  const inscriptions =
    await prisma.inscription.findMany({
      where: {
        apprenantId,

        session: {
          centreId,
        },
      },

      select: {
        session: {
          select: {
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
    });

  const formationsMap =
    new Map<
      string,
      FormationFinanceOption
    >();

  for (const inscription of inscriptions) {
    const formation =
      inscription.session.formation;

    formationsMap.set(
      formation.id,
      {
        id: formation.id,
        code: formation.code,
        nom: formation.nom,
      },
    );
  }

  return Array.from(
    formationsMap.values(),
  ).sort((a, b) =>
    a.nom.localeCompare(
      b.nom,
      "fr",
    ),
  );
}

/* ============================================================
   SESSIONS / INSCRIPTIONS
============================================================ */

export async function getSessionsFinanceByApprenantFormation(
  apprenantId: string,
  formationId: string,
): Promise<SessionFinanceOption[]> {
  const centreId =
    await getCentreIdOrThrow();

  if (
    !apprenantId ||
    !formationId
  ) {
    return [];
  }

  const inscriptions =
    await prisma.inscription.findMany({
      where: {
        apprenantId,

        session: {
          centreId,
          formationId,
        },
      },

      select: {
        id: true,
        numero: true,
        statut: true,

        session: {
          select: {
            id: true,
            code: true,
            nom: true,

            dateDebut: true,
            dateFin: true,

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

      orderBy: {
        dateInscription: "desc",
      },
    });

  return inscriptions.map(
    (inscription) => ({
      inscriptionId:
        inscription.id,

      numeroInscription:
        inscription.numero,

      statutInscription:
        inscription.statut,

      sessionId:
        inscription.session.id,

      sessionCode:
        inscription.session.code,

      sessionNom:
        inscription.session.nom,

      dateDebut:
        inscription.session.dateDebut.toISOString(),

      dateFin:
        inscription.session.dateFin.toISOString(),

      formationId:
        inscription.session.formation.id,

      formationCode:
        inscription.session.formation.code,

      formationNom:
        inscription.session.formation.nom,
    }),
  );
}

/* ============================================================
   SITUATION FINANCIÈRE
============================================================ */

export async function getSituationFinanciereApprenant(
  inscriptionId: string,
): Promise<SituationFinanciereApprenant> {
  const centreId =
    await getCentreIdOrThrow();

  if (!inscriptionId) {
    throw new Error(
      "Aucune inscription n'a été sélectionnée.",
    );
  }

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
        statut: true,
        typeFinancement: true,
        dateInscription: true,
        montantConvenu: true,

        apprenant: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            numero: true,
            email: true,
            telephone: true,
          },
        },

        session: {
          select: {
            id: true,
            code: true,
            nom: true,
            dateDebut: true,
            dateFin: true,

            formation: {
              select: {
                id: true,
                code: true,
                nom: true,
              },
            },
          },
        },

        factures: {
          where: {
            statut: {
              notIn: [
                StatutFacture.ANNULEE,
                StatutFacture.BROUILLON,
              ],
            },
          },

          select: {
            id: true,
            numero: true,

            dateEmission: true,
            dateEcheance: true,

            sousTotal: true,
            remise: true,
            taxe: true,
            total: true,

            montantPaye: true,
            montantDu: true,

            statut: true,
            notes: true,
          },

          orderBy: {
            dateEmission: "desc",
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
            dateEcheance: "asc",
          },
        },
      },
    });

  if (!inscription) {
    throw new Error(
      "Cette inscription est introuvable ou n'appartient pas à votre centre.",
    );
  }

  /* ==========================================================
     IDS DES FACTURES / ÉCHÉANCES
  ========================================================== */

  const factureIds =
    inscription.factures.map(
      (facture) => facture.id,
    );

  const echeanceIds =
    inscription.echeances.map(
      (echeance) => echeance.id,
    );

  /* ==========================================================
     PAIEMENTS
     
     On récupère les paiements :
     - directement liés à l'inscription
     - liés à une facture de l'inscription
     - liés à une échéance de l'inscription
     
     Prisma ne duplique pas une ligne findMany lorsque
     plusieurs conditions OR correspondent au même paiement.
  ========================================================== */

  const paiementOr: Prisma.PaiementWhereInput[] =
    [
      {
        inscriptionId:
          inscription.id,
      },
    ];

  if (factureIds.length > 0) {
    paiementOr.push({
      factureId: {
        in: factureIds,
      },
    });
  }

  if (echeanceIds.length > 0) {
    paiementOr.push({
      echeanceId: {
        in: echeanceIds,
      },
    });
  }

  const paiements =
    await prisma.paiement.findMany({
      where: {
        centreId,

        OR: paiementOr,
      },

      select: {
        id: true,
        reference: true,
        montant: true,
        mode: true,
        statut: true,

        datePaiement: true,
        referenceTransaction: true,
        notes: true,

        facture: {
          select: {
            numero: true,
          },
        },

        echeance: {
          select: {
            numero: true,
          },
        },
      },

      orderBy: [
        {
          datePaiement: "desc",
        },
        {
          reference: "desc",
        },
      ],
    });

  /* ==========================================================
     CALCULS
  ========================================================== */

  const montantConvenu =
    Number(
      inscription.montantConvenu,
    ) || 0;

  const totalFacture =
    inscription.factures.reduce(
      (sum, facture) =>
        sum +
        (Number(facture.total) || 0),
      0,
    );

  const paiementsEffectues =
    paiements.filter(
      (paiement) =>
        paiement.statut ===
        StatutPaiement.EFFECTUE,
    );

  const totalEncaisse =
    paiementsEffectues.reduce(
      (sum, paiement) =>
        sum +
        (Number(paiement.montant) || 0),
      0,
    );

  /*
   * Si des factures émises existent,
   * la dette est calculée sur celles-ci.
   *
   * Sinon, on utilise le montant convenu
   * de l'inscription.
   */
  const baseDette =
    totalFacture > 0
      ? totalFacture
      : montantConvenu;

  const detteRestante =
    Math.max(
      0,
      baseDette - totalEncaisse,
    );

  const now = new Date();

  const echeancesEnRetard =
    inscription.echeances.filter(
      (echeance) => {
        const montantDu =
          Number(
            echeance.montantDu,
          ) || 0;

        return (
          echeance.dateEcheance <
            now &&
          montantDu > 0
        );
      },
    );

  const montantEnRetard =
    echeancesEnRetard.reduce(
      (sum, echeance) =>
        sum +
        (Number(
          echeance.montantDu,
        ) || 0),
      0,
    );

  const tauxPaiement =
    baseDette > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (totalEncaisse /
              baseDette) *
              100,
          ),
        )
      : 0;

  /* ==========================================================
     SERIALISATION
  ========================================================== */

  return {
    apprenant: {
      id:
        inscription.apprenant.id,

      nomComplet:
        `${inscription.apprenant.nom} ${inscription.apprenant.prenom}`.trim(),

      numero:
        inscription.apprenant.numero ??
        null,

      email:
        inscription.apprenant.email ??
        null,

      telephone:
        inscription.apprenant.telephone ??
        null,
    },

    inscription: {
      id: inscription.id,

      numero:
        inscription.numero,

      statut:
        inscription.statut,

      typeFinancement:
        inscription.typeFinancement,

      dateInscription:
        inscription.dateInscription.toISOString(),

      montantConvenu,
    },

    formation: {
      id:
        inscription.session
          .formation.id,

      code:
        inscription.session
          .formation.code,

      nom:
        inscription.session
          .formation.nom,
    },

    session: {
      id:
        inscription.session.id,

      code:
        inscription.session.code,

      nom:
        inscription.session.nom,

      dateDebut:
        inscription.session.dateDebut.toISOString(),

      dateFin:
        inscription.session.dateFin.toISOString(),
    },

    resume: {
      montantConvenu,

      totalFacture,

      totalEncaisse,

      detteRestante,

      montantEnRetard,

      nombreFactures:
        inscription.factures
          .length,

      nombrePaiements:
        paiements.length,

      nombrePaiementsEffectues:
        paiementsEffectues.length,

      nombreEcheances:
        inscription.echeances
          .length,

      nombreEcheancesEnRetard:
        echeancesEnRetard.length,

      tauxPaiement,
    },

    paiements:
      paiements.map(
        (paiement) => ({
          id: paiement.id,

          reference:
            paiement.reference,

          montant:
            Number(
              paiement.montant,
            ) || 0,

          mode:
            paiement.mode,

          statut:
            paiement.statut,

          datePaiement:
            paiement.datePaiement
              ? paiement.datePaiement.toISOString()
              : null,

          referenceTransaction:
            paiement.referenceTransaction ??
            null,

          notes:
            paiement.notes ??
            null,

          factureNumero:
            paiement.facture
              ?.numero ??
            null,

          echeanceNumero:
            paiement.echeance
              ?.numero ??
            null,
        }),
      ),

    factures:
      inscription.factures.map(
        (facture) => ({
          id: facture.id,

          numero:
            facture.numero,

          dateEmission:
            facture.dateEmission.toISOString(),

          dateEcheance:
            facture.dateEcheance
              ? facture.dateEcheance.toISOString()
              : null,

          sousTotal:
            Number(
              facture.sousTotal,
            ) || 0,

          remise:
            Number(
              facture.remise,
            ) || 0,

          taxe:
            Number(
              facture.taxe,
            ) || 0,

          total:
            Number(
              facture.total,
            ) || 0,

          montantPaye:
            Number(
              facture.montantPaye,
            ) || 0,

          montantDu:
            Number(
              facture.montantDu,
            ) || 0,

          statut:
            facture.statut,

          notes:
            facture.notes ??
            null,
        }),
      ),

    echeances:
      inscription.echeances.map(
        (echeance) => {
          const montantDu =
            Number(
              echeance.montantDu,
            ) || 0;

          const estEnRetard =
            echeance.dateEcheance <
              now &&
            montantDu > 0;

          const joursRetard =
            estEnRetard
              ? Math.max(
                  0,
                  Math.floor(
                    (
                      now.getTime() -
                      echeance.dateEcheance.getTime()
                    ) /
                      86400000,
                  ),
                )
              : 0;

          return {
            id: echeance.id,

            numero:
              echeance.numero,

            dateEcheance:
              echeance.dateEcheance.toISOString(),

            montant:
              Number(
                echeance.montant,
              ) || 0,

            montantPaye:
              Number(
                echeance.montantPaye,
              ) || 0,

            montantDu,

            statut:
              echeance.statut,

            joursRetard,

            estEnRetard,
          };
        },
      ),
  };
}