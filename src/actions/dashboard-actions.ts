"use server";

import { prisma } from "@/lib/prisma";
import { requireCentreManager } from "@/lib/validations/centre-access";

/* =========================================================
   TYPES
========================================================= */

export type DashboardSession = {
  id: string;
  formation: string;
  code: string;
  date: string;
  participants: number;
};

export type DashboardActivity = {
  id: string;
  type: string;
  message: string;
  date: Date;
};

export type DashboardData = {
  centre: {
    id: string;
    nom: string;
    code: string;
    slug: string;
  };

  statistiques: {
    apprenants: number;
    formations: number;
    sessions: number;
    sessionsEnCours: number;
    tauxPresence: number | null;
  };

  evolutionInscriptions: {
    periode: string;
    inscriptions: number;
  }[];

  sessionsAVenir: DashboardSession[];

  activitesRecentes: DashboardActivity[];
};

/* =========================================================
   HELPERS
========================================================= */

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function formatPeriode(date: Date) {
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      month: "short",
      year: "numeric",
    },
  )
    .format(date)
    .replace(".", "");
}

function getDebutMois(
  date: Date,
  nombreMois: number,
) {
  const debut = new Date(
    date.getFullYear(),
    date.getMonth() -
      nombreMois +
      1,
    1,
  );

  debut.setHours(
    0,
    0,
    0,
    0,
  );

  return debut;
}

/* =========================================================
   DASHBOARD
========================================================= */

export async function getDashboardData(): Promise<
  | {
      success: true;
      data: DashboardData;
    }
  | {
      success: false;
      message: string;
    }
> {
  try {
    /*
     * ======================================================
     * 1. CENTRE COURANT
     *
     * IMPORTANT :
     * aucun centreId ne vient du navigateur.
     *
     * requireCentreManager() utilise l'utilisateur
     * authentifié et retourne son centre courant.
     * ======================================================
     */

    const { centre } =
      await requireCentreManager();

    if (!centre?.id) {
      return {
        success: false,
        message:
          "Aucun centre n'est associé à votre compte.",
      };
    }

    const centreId =
      centre.id;

    /*
     * ======================================================
     * 2. DATES
     * ======================================================
     */

    const maintenant =
      new Date();

    const debutMoisActuel =
      new Date(
        maintenant.getFullYear(),
        maintenant.getMonth(),
        1,
      );

    const debutSixMois =
      getDebutMois(
        maintenant,
        6,
      );

    const finMoisActuel =
      new Date(
        maintenant.getFullYear(),
        maintenant.getMonth() + 1,
        1,
      );

    /*
     * ======================================================
     * 3. STATISTIQUES PRINCIPALES
     * ======================================================
     *
     * Toutes les requêtes sont volontairement limitées
     * au centre courant.
     * ======================================================
     */

    const [
      nombreApprenants,
      nombreFormations,
      nombreSessions,
      nombreSessionsEnCours,
      presences,
      sessionsAVenir,
      inscriptionsEvolution,
    ] =
      await Promise.all([
        /*
         * APPRENANTS
         */
        prisma.apprenant.count({
          where: {
            inscriptions: {
              some: {
                session: {
                  centreId,
                },
              },
            },
          },
        }),

        /*
         * FORMATIONS
         */
        prisma.formation.count({
          where: {
            centreId,
          },
        }),

        /*
         * SESSIONS
         */
        prisma.sessionFormation.count({
          where: {
            centreId,
          },
        }),

        /*
         * SESSIONS EN COURS
         *
         * Une session est considérée comme en cours
         * lorsqu'elle a commencé et n'est pas encore terminée.
         */
        prisma.sessionFormation.count({
          where: {
            centreId,

            dateDebut: {
              lte: maintenant,
            },

            dateFin: {
              gte: maintenant,
            },
          },
        }),

        /*
         * PRESENCES
         *
         * On remonte uniquement les présences appartenant
         * à des plannings du centre courant.
         */
        prisma.presence.findMany({
          where: {
            planning: {
              session: {
                centreId,
              },
            },
          },

          select: {
            statut: true,
          },
        }),

        /*
         * SESSIONS À VENIR
         */
        prisma.sessionFormation.findMany({
          where: {
            centreId,

            dateDebut: {
              gte: maintenant,
            },
          },

          orderBy: {
            dateDebut: "asc",
          },

          take: 5,

          select: {
            id: true,
            code: true,
            nom: true,
            dateDebut: true,

            formation: {
              select: {
                nom: true,
              },
            },

            _count: {
              select: {
                inscriptions: true,
              },
            },
          },
        }),

        /*
         * INSCRIPTIONS DES 6 DERNIERS MOIS
         */
        prisma.inscription.findMany({
          where: {
            session: {
              centreId,
            },

            dateInscription: {
              gte: debutSixMois,
              lt: finMoisActuel,
            },
          },

          select: {
            dateInscription: true,
          },

          orderBy: {
            dateInscription: "asc",
          },
        }),
      ]);

    /*
     * ======================================================
     * 4. TAUX DE PRESENCE
     * ======================================================
     *
     * PRESENT + RETARD = présence effective.
     * ======================================================
     */

    let tauxPresence:
      | number
      | null = null;

    if (presences.length > 0) {
      const presentes =
        presences.filter(
          (presence) =>
            presence.statut ===
              "PRESENT" ||
            presence.statut ===
              "RETARD",
        ).length;

      tauxPresence =
        round2(
          (presentes /
            presences.length) *
            100,
        );
    }

    /*
     * ======================================================
     * 5. EVOLUTION DES INSCRIPTIONS
     * ======================================================
     */

    const evolutionMap =
      new Map<
        string,
        {
          periode: string;
          inscriptions: number;
        }
      >();

    /*
     * On initialise toujours les 6 mois.
     * Ainsi le graphique aura également les mois sans inscription.
     */

    for (
      let i = 5;
      i >= 0;
      i--
    ) {
      const date =
        new Date(
          maintenant.getFullYear(),
          maintenant.getMonth() -
            i,
          1,
        );

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}`;

      evolutionMap.set(
        key,
        {
          periode:
            formatPeriode(
              date,
            ),
          inscriptions: 0,
        },
      );
    }

    for (const inscription of inscriptionsEvolution) {
      const date =
        new Date(
          inscription.dateInscription,
        );

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}`;

      const current =
        evolutionMap.get(key);

      if (current) {
        current.inscriptions++;
      }
    }

    const evolutionInscriptions =
      Array.from(
        evolutionMap.values(),
      );

    /*
     * ======================================================
     * 6. SESSIONS À VENIR
     * ======================================================
     */

    const sessionsAVenirData: DashboardSession[] =
      sessionsAVenir.map(
        (session) => ({
          id: session.id,

          formation:
            session.formation
              .nom,

          code:
            session.code,

          date:
            session.dateDebut,

          participants:
            session._count
              .inscriptions,
        }),
      );

    /*
     * ======================================================
     * 7. ACTIVITÉS RÉCENTES
     * ======================================================
     *
     * On récupère plusieurs sources du centre courant.
     *
     * On ne récupère jamais une activité appartenant
     * à un autre centre.
     * ======================================================
     */

    const [
      dernieresInscriptions,
      dernieresSessions,
      dernieresEvaluations,
    ] =
      await Promise.all([
        prisma.inscription.findMany({
          where: {
            session: {
              centreId,
            },
          },

          orderBy: {
            dateInscription:
              "desc",
          },

          take: 5,

          select: {
            id: true,
            dateInscription: true,

            apprenant: {
              select: {
                nom: true,
                prenom: true,
              },
            },
          },
        }),

        prisma.sessionFormation.findMany({
          where: {
            centreId,
          },

          orderBy: {
            creeLe: "desc",
          },

          take: 5,

          select: {
            id: true,
            creeLe: true,

            formation: {
              select: {
                nom: true,
              },
            },
          },
        }),

        prisma.evaluationResultat.findMany({
          where: {
            inscription: {
              session: {
                centreId,
              },
            },
          },

          orderBy: {
            id: "desc",
          },

          take: 5,

          select: {
            inscription: {
              select: {
                apprenant: {
                  select: {
                    nom: true,
                    prenom: true,
                  },
                },
              },
            },
          },
        }),
      ]);

    const activites: DashboardActivity[] =
      [];

    /*
     * INSCRIPTIONS
     */

    for (const inscription of dernieresInscriptions) {
      activites.push({
        id: `inscription-${inscription.id}`,

        type: "INSCRIPTION",

        message: `Nouvelle inscription — ${inscription.apprenant.prenom} ${inscription.apprenant.nom}`,

        date:
          inscription.dateInscription,
      });
    }

    /*
     * SESSIONS
     */

    for (const session of dernieresSessions) {
      activites.push({
        id: `session-${session.id}`,

        type: "SESSION",

        message: `Session créée — ${session.formation.nom}`,

        date:
          session.creeLe,
      });
    }

    /*
     * EVALUATIONS
     */

    for (const evaluation of dernieresEvaluations) {
      activites.push({
        id: `evaluation-${evaluation.inscription.apprenant.prenom}-${evaluation.inscription.apprenant.nom}`,

        type: "EVALUATION",

        message: `Évaluation enregistrée — ${evaluation.inscription.apprenant.prenom} ${evaluation.inscription.apprenant.nom}`,

        /*
         * EvaluationResultat n'ayant pas forcément
         * un champ date explicite exploitable ici,
         * on utilise la date actuelle comme date technique.
         *
         * À remplacer par creeLe/dateEvaluation si votre
         * modèle possède ce champ.
         */
        date:
          maintenant,
      });
    }

    /*
     * ======================================================
     * 8. TRI DES ACTIVITÉS
     * ======================================================
     */

    activites.sort(
      (a, b) =>
        new Date(
          b.date,
        ).getTime() -
        new Date(
          a.date,
        ).getTime(),
    );

    /*
     * ======================================================
     * 9. REPONSE
     * ======================================================
     */

    return {
      success: true,

      data: {
        centre: {
          id: centre.id,
          nom: centre.nom,
          code: centre.code,
          slug: centre.slug,
        },

        statistiques: {
          apprenants:
            nombreApprenants,

          formations:
            nombreFormations,

          sessions:
            nombreSessions,

          sessionsEnCours:
            nombreSessionsEnCours,

          tauxPresence,
        },

        evolutionInscriptions,

        sessionsAVenir:
          sessionsAVenirData,

        activitesRecentes:
          activites.slice(
            0,
            10,
          ),
      },
    };
  } catch (error) {
    console.error(
      "[GET_DASHBOARD_DATA]",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de charger le tableau de bord.",
    };
  }
}