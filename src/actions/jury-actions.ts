"use server";

import { prisma } from "@/lib/prisma";
import { requireCentreManager } from "@/lib/validations/centre-access";

/* =========================================================
   TYPES
========================================================= */

type StatutJury =
  | "PLANIFIE"
  | "EN_COURS"
  | "TERMINE"
  | "ANNULE";

type DecisionJury =
  | "ADMIS"
  | "ADMIS_SOUS_CONDITION"
  | "AJOURNE"
  | "ECHEC";

type JuryInput = {
  sessionId: string;
  nom: string;
  datePrevue?: string | null;
  lieu?: string | null;
  statut?: StatutJury;
  decision?: DecisionJury | null;
  notesDeliberation?: string | null;
};

/* =========================================================
   CENTRE
========================================================= */

async function getCentreId(): Promise<string> {
  const { centre } =
    await requireCentreManager();

  if (!centre?.id) {
    throw new Error(
      "Aucun centre n'est associé à votre compte.",
    );
  }

  return centre.id;
}

/* =========================================================
   DATE
========================================================= */

function parseDate(
  value?: string | null,
): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      "La date prévue du jury est invalide.",
    );
  }

  return date;
}

/* =========================================================
   GET JURY
========================================================= */

export async function getJurys() {
  try {
    const centreId =
      await getCentreId();

    const jurys =
      await prisma.jury.findMany({
        where: {
          centreId,
        },

        include: {
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

          _count: {
            select: {
              membres: true,
              evaluations: true,
            },
          },
        },

        orderBy: [
          {
            datePrevue: "desc",
          },
          {
            creeLe: "desc",
          },
        ],
      });

    return {
      success: true,
      data: jurys.map((jury) => ({
        id: jury.id,
        sessionId: jury.sessionId,
        nom: jury.nom,
        datePrevue:
          jury.datePrevue?.toISOString() ??
          null,
        lieu: jury.lieu,
        statut: jury.statut,
        decision: jury.decision,
        notesDeliberation:
          jury.notesDeliberation,

        session: jury.session,

        membresCount:
          jury._count.membres,

        evaluationsCount:
          jury._count.evaluations,

        creeLe:
          jury.creeLe.toISOString(),

        modifieLe:
          jury.modifieLe.toISOString(),
      })),
    };
  } catch (error) {
    console.error(
      "GET JURYS:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les jurys.",
      data: [],
    };
  }
}

/* =========================================================
   GET JURY BY ID
========================================================= */

export async function getJuryById(
  id: string,
) {
  try {
    const centreId =
      await getCentreId();

    const jury =
      await prisma.jury.findFirst({
        where: {
          id,
          centreId,
        },

        include: {
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

          membres: {
            orderBy: [
              {
                role: "asc",
              },
              {
                nom: "asc",
              },
            ],
          },

          _count: {
            select: {
              membres: true,
              evaluations: true,
            },
          },
        },
      });

    if (!jury) {
      return {
        success: false,
        message:
          "Jury introuvable ou accès non autorisé.",
      };
    }

    return {
      success: true,
      data: {
        id: jury.id,
        sessionId: jury.sessionId,
        nom: jury.nom,
        datePrevue:
          jury.datePrevue?.toISOString() ??
          null,
        lieu: jury.lieu,
        statut: jury.statut,
        decision: jury.decision,
        notesDeliberation:
          jury.notesDeliberation,

        session: jury.session,

        membres: jury.membres,

        membresCount:
          jury._count.membres,

        evaluationsCount:
          jury._count.evaluations,
      },
    };
  } catch (error) {
    console.error(
      "GET JURY BY ID:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer le jury.",
    };
  }
}

/* =========================================================
   OPTIONS SESSIONS
========================================================= */

export async function getJurySessionOptions() {
  try {
    const centreId =
      await getCentreId();

    const sessions =
      await prisma.sessionFormation.findMany({
        where: {
          centreId,
        },

        select: {
          id: true,
          code: true,
          nom: true,
          dateDebut: true,
          dateFin: true,
          statut: true,

          formation: {
            select: {
              id: true,
              code: true,
              nom: true,
            },
          },
        },

        orderBy: {
          dateDebut: "desc",
        },
      });

    return {
      success: true,

      data: sessions.map(
        (session) => ({
          id: session.id,
          code: session.code,
          nom: session.nom,
          dateDebut:
            session.dateDebut.toISOString(),
          dateFin:
            session.dateFin.toISOString(),
          statut: session.statut,

          formation:
            session.formation,
        }),
      ),
    };
  } catch (error) {
    console.error(
      "GET JURY SESSION OPTIONS:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les sessions.",
      data: [],
    };
  }
}

/* =========================================================
   CREATE
========================================================= */

export async function createJury(
  data: JuryInput,
) {
  try {
    const centreId =
      await getCentreId();

    const sessionId =
      data.sessionId?.trim();

    const nom =
      data.nom?.trim();

    if (!sessionId) {
      return {
        success: false,
        message:
          "La session de formation est obligatoire.",
      };
    }

    if (!nom) {
      return {
        success: false,
        message:
          "Le nom du jury est obligatoire.",
      };
    }

    /* =====================================================
       VERIFICATION SESSION
    ===================================================== */

    const session =
      await prisma.sessionFormation.findFirst({
        where: {
          id: sessionId,
          centreId,
        },

        select: {
          id: true,
        },
      });

    if (!session) {
      return {
        success: false,
        message:
          "La session sélectionnée est introuvable ou n'appartient pas à votre centre.",
      };
    }

    /* =====================================================
       DOUBLON
    ===================================================== */

    const existing =
      await prisma.jury.findFirst({
        where: {
          centreId,
          sessionId,
          nom,
        },

        select: {
          id: true,
        },
      });

    if (existing) {
      return {
        success: false,
        message:
          "Un jury portant ce nom existe déjà pour cette session.",
      };
    }

    const datePrevue =
      parseDate(data.datePrevue);

    const jury =
      await prisma.jury.create({
        data: {
          centreId,
          sessionId,
          nom,
          datePrevue,
          lieu:
            data.lieu?.trim() ||
            null,

          statut:
            data.statut ??
            "PLANIFIE",

          decision:
            data.decision ??
            null,

          notesDeliberation:
            data.notesDeliberation?.trim() ||
            null,
        },

        include: {
          session: {
            select: {
              id: true,
              code: true,
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
      });

    return {
      success: true,
      message:
        "Jury créé avec succès.",

      data: {
        id: jury.id,
        sessionId:
          jury.sessionId,
        nom: jury.nom,
        datePrevue:
          jury.datePrevue?.toISOString() ??
          null,
        lieu: jury.lieu,
        statut: jury.statut,
        decision:
          jury.decision,
        notesDeliberation:
          jury.notesDeliberation,
        session:
          jury.session,
      },
    };
  } catch (error) {
    console.error(
      "CREATE JURY:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de créer le jury.",
    };
  }
}

/* =========================================================
   UPDATE
========================================================= */

export async function updateJury(
  id: string,
  data: JuryInput,
) {
  try {
    const centreId =
      await getCentreId();

    const jury =
      await prisma.jury.findFirst({
        where: {
          id,
          centreId,
        },

        select: {
          id: true,
        },
      });

    if (!jury) {
      return {
        success: false,
        message:
          "Jury introuvable ou accès non autorisé.",
      };
    }

    const sessionId =
      data.sessionId?.trim();

    const nom =
      data.nom?.trim();

    if (!sessionId) {
      return {
        success: false,
        message:
          "La session de formation est obligatoire.",
      };
    }

    if (!nom) {
      return {
        success: false,
        message:
          "Le nom du jury est obligatoire.",
      };
    }

    /* =====================================================
       SESSION DU CENTRE
    ===================================================== */

    const session =
      await prisma.sessionFormation.findFirst({
        where: {
          id: sessionId,
          centreId,
        },

        select: {
          id: true,
        },
      });

    if (!session) {
      return {
        success: false,
        message:
          "La session sélectionnée est invalide.",
      };
    }

    /* =====================================================
       DOUBLON
    ===================================================== */

    const duplicate =
      await prisma.jury.findFirst({
        where: {
          centreId,
          sessionId,
          nom,
          NOT: {
            id,
          },
        },

        select: {
          id: true,
        },
      });

    if (duplicate) {
      return {
        success: false,
        message:
          "Un autre jury porte déjà ce nom pour cette session.",
      };
    }

    const datePrevue =
      parseDate(data.datePrevue);

    const updated =
      await prisma.jury.update({
        where: {
          id,
        },

        data: {
          sessionId,
          nom,
          datePrevue,
          lieu:
            data.lieu?.trim() ||
            null,

          statut:
            data.statut ??
            "PLANIFIE",

          decision:
            data.decision ??
            null,

          notesDeliberation:
            data.notesDeliberation?.trim() ||
            null,
        },

        include: {
          session: {
            select: {
              id: true,
              code: true,
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
      });

    return {
      success: true,
      message:
        "Jury modifié avec succès.",

      data: {
        id: updated.id,
        sessionId:
          updated.sessionId,
        nom: updated.nom,
        datePrevue:
          updated.datePrevue?.toISOString() ??
          null,
        lieu: updated.lieu,
        statut: updated.statut,
        decision:
          updated.decision,
        notesDeliberation:
          updated.notesDeliberation,
        session:
          updated.session,
      },
    };
  } catch (error) {
    console.error(
      "UPDATE JURY:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de modifier le jury.",
    };
  }
}

/* =========================================================
   DELETE
========================================================= */

export async function deleteJury(
  id: string,
) {
  try {
    const centreId =
      await getCentreId();

    const jury =
      await prisma.jury.findFirst({
        where: {
          id,
          centreId,
        },

        include: {
          _count: {
            select: {
              membres: true,
              evaluations: true,
              documents: true,
            },
          },
        },
      });

    if (!jury) {
      return {
        success: false,
        message:
          "Jury introuvable ou accès non autorisé.",
      };
    }

    /* =====================================================
       PROTECTION
    ===================================================== */

    if (
      jury._count.evaluations >
      0
    ) {
      return {
        success: false,
        message:
          "Impossible de supprimer ce jury car des évaluations y sont déjà enregistrées.",
      };
    }

    if (
      jury._count.documents >
      0
    ) {
      return {
        success: false,
        message:
          "Impossible de supprimer ce jury car des documents lui sont associés.",
      };
    }

    await prisma.jury.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      message:
        "Jury supprimé avec succès.",
    };
  } catch (error) {
    console.error(
      "DELETE JURY:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de supprimer le jury.",
    };
  }
}