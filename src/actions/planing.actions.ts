"use server";

// ============================================================
// CENTRE DE FORMATION SaaS
// ACTIONS SERVEUR — CALENDRIER / PLANNING
// Prisma 7
// ============================================================

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

import {
  getCurrentCentreContext,
  requireRole,
} from "@/lib/validations/centre-access";

// ============================================================
// TYPES
// ============================================================

export interface PlanningFormData {
  sessionId: string;
  salleId?: string | null;
  titre?: string | null;
  debut: string | Date;
  fin: string | Date;
  description?: string | null;
}

// ============================================================
// RÔLES AUTORISÉS
// ============================================================

const PLANNING_ROLES = [
  "PROPRIETAIRE",
  "ADMINISTRATEUR",
  "RESPONSABLE",
  "SECRETAIRE",
] as const;

// ============================================================
// VÉRIFIER LES PERMISSIONS
// ============================================================

function canManagePlanning(role: string | null | undefined): boolean {
  return !!role && PLANNING_ROLES.includes(
    role as (typeof PLANNING_ROLES)[number],
  );
}

// ============================================================
// CONTEXTE DU CENTRE COURANT
// ============================================================

async function getPlanningContext() {
  const context = await getCurrentCentreContext();

  if (!context) {
    throw new Error(
      "Impossible de récupérer le contexte utilisateur.",
    );
  }

  if (!context.centreId) {
    throw new Error(
      "Aucun centre actif n'est associé à votre compte.",
    );
  }

  return context;
}

// ============================================================
// VALIDATION
// ============================================================

function validatePlanningData(data: PlanningFormData) {
  const errors: Record<string, string> = {};

  if (!data || !data.sessionId?.trim()) {
    errors.sessionId = "La session est obligatoire.";
  }

  if (!data?.debut) {
    errors.debut = "La date de début est obligatoire.";
  }

  if (!data?.fin) {
    errors.fin = "La date de fin est obligatoire.";
  }

  let debut: Date | null = null;
  let fin: Date | null = null;

  // ----------------------------------------------------------
  // DÉBUT
  // ----------------------------------------------------------

  if (data?.debut) {
    debut = new Date(data.debut);

    if (Number.isNaN(debut.getTime())) {
      errors.debut = "La date de début est invalide.";
      debut = null;
    }
  }

  // ----------------------------------------------------------
  // FIN
  // ----------------------------------------------------------

  if (data?.fin) {
    fin = new Date(data.fin);

    if (Number.isNaN(fin.getTime())) {
      errors.fin = "La date de fin est invalide.";
      fin = null;
    }
  }

  // ----------------------------------------------------------
  // COHÉRENCE DES DATES
  // ----------------------------------------------------------

  if (
    debut &&
    fin &&
    !Number.isNaN(debut.getTime()) &&
    !Number.isNaN(fin.getTime()) &&
    fin <= debut
  ) {
    errors.fin =
      "La date de fin doit être postérieure à la date de début.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    debut,
    fin,
  };
}

// ============================================================
// VÉRIFIER UN CHEVAUCHEMENT DE SALLE
// ============================================================

async function hasRoomConflict(params: {
  salleId: string;
  centreId: string;
  debut: Date;
  fin: Date;
  excludePlanningId?: string;
}) {
  const conflict = await prisma.planning.findFirst({
    where: {
      salleId: params.salleId,

      // ------------------------------------------------------
      // SÉCURITÉ CENTRE
      // ------------------------------------------------------
      salle: {
        centreId: params.centreId,
      },

      // ------------------------------------------------------
      // CHEVAUCHEMENT
      // ------------------------------------------------------
      debut: {
        lt: params.fin,
      },

      fin: {
        gt: params.debut,
      },

      ...(params.excludePlanningId
        ? {
            id: {
              not: params.excludePlanningId,
            },
          }
        : {}),
    },

    include: {
      salle: true,

      session: {
        include: {
          formation: {
            select: {
              code: true,
              nom: true,
            },
          },
        },
      },
    },
  });

  return conflict;
}

// ============================================================
// GET CENTRE COURANT
// ============================================================

export async function getCurrentCentre() {
  try {
    const context = await getPlanningContext();

    const centre = await prisma.centreFormation.findUnique({
      where: {
        id: context.centreId,
      },

      select: {
        id: true,
        nom: true,
        slug: true,
        code: true,
        devise: true,
        fuseauHoraire: true,
        logoUrl: true,
        statut: true,
      },
    });

    if (!centre) {
      return {
        success: false,
        error: "Centre de formation introuvable.",
        centre: null,
      };
    }

    return {
      success: true,
      centre,
    };
  } catch (error) {
    console.error(
      "Erreur getCurrentCentre():",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer le centre courant.",
      centre: null,
    };
  }
}

// ============================================================
// GET SESSIONS DISPONIBLES POUR LE PLANNING
// ============================================================

export async function getSessionsForPlanning() {
  try {
    const context = await getPlanningContext();

    const sessions =
      await prisma.sessionFormation.findMany({
        where: {
          centreId: context.centreId,

          statut: {
            not: "ANNULEE",
          },
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

        orderBy: [
          {
            dateDebut: "asc",
          },
          {
            code: "asc",
          },
        ],
      });

    return {
      success: true,

      sessions: sessions.map((session) => ({
        id: session.id,
        code: session.code,
        nom: session.nom,

        dateDebut:
          session.dateDebut.toISOString(),

        dateFin:
          session.dateFin.toISOString(),

        statut: session.statut,

        formation: {
          id: session.formation.id,
          code: session.formation.code,
          nom: session.formation.nom,
        },
      })),
    };
  } catch (error) {
    console.error(
      "Erreur getSessionsForPlanning():",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les sessions.",
      sessions: [],
    };
  }
}

// ============================================================
// GET SALLES DU CENTRE COURANT
// ============================================================

export async function getSallesForPlanning() {
  try {
    const context = await getPlanningContext();

    const salles = await prisma.salle.findMany({
      where: {
        centreId: context.centreId,
      },

      select: {
        id: true,
        nom: true,
        code: true,
        capacite: true,
        localisation: true,
      },

      orderBy: [
        {
          nom: "asc",
        },
        {
          code: "asc",
        },
      ],
    });

    return {
      success: true,
      salles,
    };
  } catch (error) {
    console.error(
      "Erreur getSallesForPlanning():",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les salles.",
      salles: [],
    };
  }
}

// ============================================================
// GET PLANNINGS DU CENTRE COURANT
// ============================================================

export async function getPlannings() {
  try {
    const context = await getPlanningContext();

    const plannings =
      await prisma.planning.findMany({
        where: {
          session: {
            centreId: context.centreId,
          },
        },

        include: {
          session: {
            select: {
              id: true,
              code: true,
              nom: true,
              statut: true,

              formation: {
                select: {
                  id: true,
                  code: true,
                  nom: true,
                },
              },
            },
          },

          salle: {
            select: {
              id: true,
              nom: true,
              code: true,
              capacite: true,
              localisation: true,
            },
          },
        },

        orderBy: {
          debut: "asc",
        },
      });

    return {
      success: true,

      plannings: plannings.map((planning) => ({
        id: planning.id,

        sessionId: planning.sessionId,
        salleId: planning.salleId,

        titre: planning.titre,

        debut: planning.debut.toISOString(),
        fin: planning.fin.toISOString(),

        description: planning.description,

        session: {
          id: planning.session.id,
          code: planning.session.code,
          nom: planning.session.nom,
          statut: planning.session.statut,

          formation: {
            id: planning.session.formation.id,
            code: planning.session.formation.code,
            nom: planning.session.formation.nom,
          },
        },

        salle: planning.salle
          ? {
              id: planning.salle.id,
              nom: planning.salle.nom,
              code: planning.salle.code,
              capacite: planning.salle.capacite,
              localisation:
                planning.salle.localisation,
            }
          : null,
      })),
    };
  } catch (error) {
    console.error(
      "Erreur getPlannings():",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer le calendrier.",
      plannings: [],
    };
  }
}

// ============================================================
// GET PLANNING PAR ID
// ============================================================

export async function getPlanningById(id: string) {
  try {
    const context = await getPlanningContext();

    if (!id?.trim()) {
      return {
        success: false,
        error: "Identifiant du planning invalide.",
        planning: null,
      };
    }

    const planning =
      await prisma.planning.findFirst({
        where: {
          id: id.trim(),

          session: {
            centreId: context.centreId,
          },
        },

        include: {
          session: {
            include: {
              formation: true,
            },
          },

          salle: true,
        },
      });

    if (!planning) {
      return {
        success: false,
        error:
          "Événement introuvable ou inaccessible.",
        planning: null,
      };
    }

    return {
      success: true,

      planning: {
        id: planning.id,

        sessionId: planning.sessionId,
        salleId: planning.salleId,

        titre: planning.titre,

        debut: planning.debut.toISOString(),
        fin: planning.fin.toISOString(),

        description: planning.description,

        session: {
          id: planning.session.id,
          code: planning.session.code,
          nom: planning.session.nom,

          formation: {
            id: planning.session.formation.id,
            code: planning.session.formation.code,
            nom: planning.session.formation.nom,
          },
        },

        salle: planning.salle
          ? {
              id: planning.salle.id,
              nom: planning.salle.nom,
              code: planning.salle.code,
            }
          : null,
      },
    };
  } catch (error) {
    console.error(
      "Erreur getPlanningById():",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer l'événement.",
      planning: null,
    };
  }
}

// ============================================================
// CRÉER UN PLANNING
// ============================================================

export async function createPlanning(
  data: PlanningFormData,
) {
  try {
    const context = await getPlanningContext();

    // --------------------------------------------------------
    // PERMISSION
    // --------------------------------------------------------

    if (!canManagePlanning(context.role)) {
      return {
        success: false,
        error:
          "Vous n'avez pas l'autorisation d'ajouter un événement au calendrier.",
      };
    }

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    const validation =
      validatePlanningData(data);

    if (
      !validation.valid ||
      !validation.debut ||
      !validation.fin
    ) {
      return {
        success: false,
        error:
          "Veuillez corriger les erreurs du formulaire.",
        errors: validation.errors,
      };
    }

    const debut = validation.debut;
    const fin = validation.fin;

    // --------------------------------------------------------
    // SESSION DU CENTRE COURANT
    // --------------------------------------------------------

    const session =
      await prisma.sessionFormation.findFirst({
        where: {
          id: data.sessionId.trim(),
          centreId: context.centreId,
        },

        select: {
          id: true,
          code: true,
          nom: true,
        },
      });

    if (!session) {
      return {
        success: false,
        error:
          "La session sélectionnée est introuvable ou n'appartient pas à votre centre.",
      };
    }

    // --------------------------------------------------------
    // SALLE DU CENTRE COURANT
    // --------------------------------------------------------

    let salleId: string | null =
      data.salleId?.trim() || null;

    if (salleId) {
      const salle =
        await prisma.salle.findFirst({
          where: {
            id: salleId,
            centreId: context.centreId,
          },

          select: {
            id: true,
            nom: true,
          },
        });

      if (!salle) {
        return {
          success: false,
          error:
            "La salle sélectionnée est introuvable ou n'appartient pas à votre centre.",
        };
      }

      // ------------------------------------------------------
      // CONFLIT DE SALLE
      // ------------------------------------------------------

      const conflict =
        await hasRoomConflict({
          salleId: salle.id,
          centreId: context.centreId,
          debut,
          fin,
        });

      if (conflict) {
        const sessionNom =
          conflict.session.nom ||
          `${conflict.session.formation.code} — ${conflict.session.code}`;

        return {
          success: false,
          error:
            `La salle "${conflict.salle?.nom ?? salle.nom}" ` +
            `est déjà réservée pendant cette période ` +
            `pour la session "${sessionNom}".`,
        };
      }
    }

    // --------------------------------------------------------
    // CRÉATION
    // --------------------------------------------------------

    const planning =
      await prisma.planning.create({
        data: {
          sessionId: session.id,

          salleId,

          titre:
            data.titre?.trim() || null,

          debut,

          fin,

          description:
            data.description?.trim() || null,
        },

        select: {
          id: true,
          sessionId: true,
        },
      });

    // --------------------------------------------------------
    // REVALIDATION
    // --------------------------------------------------------

    revalidatePath(
      "/dashboard/calendrier",
    );

    revalidatePath(
      "/dashboard/sessions",
    );

    revalidatePath(
      `/dashboard/sessions/${session.id}`,
    );

    return {
      success: true,

      message:
        "Événement ajouté au calendrier avec succès.",

      data: {
        id: planning.id,
      },
    };
  } catch (error) {
    console.error(
      "Erreur createPlanning():",
      error,
    );

    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2003") {
        return {
          success: false,
          error:
            "Impossible de créer l'événement. Une relation sélectionnée est invalide.",
        };
      }
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de créer l'événement.",
    };
  }
}

// ============================================================
// MODIFIER UN PLANNING
// ============================================================

export async function updatePlanning(
  id: string,
  data: PlanningFormData,
) {
  try {
    const context = await getPlanningContext();

    // --------------------------------------------------------
    // PERMISSION
    // --------------------------------------------------------

    if (!canManagePlanning(context.role)) {
      return {
        success: false,
        error:
          "Vous n'avez pas l'autorisation de modifier cet événement.",
      };
    }

    if (!id?.trim()) {
      return {
        success: false,
        error:
          "Identifiant du planning invalide.",
      };
    }

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    const validation =
      validatePlanningData(data);

    if (
      !validation.valid ||
      !validation.debut ||
      !validation.fin
    ) {
      return {
        success: false,
        error:
          "Veuillez corriger les erreurs du formulaire.",
        errors: validation.errors,
      };
    }

    const debut = validation.debut;
    const fin = validation.fin;

    // --------------------------------------------------------
    // PLANNING EXISTANT
    // --------------------------------------------------------

    const existingPlanning =
      await prisma.planning.findFirst({
        where: {
          id: id.trim(),

          session: {
            centreId: context.centreId,
          },
        },

        select: {
          id: true,
          sessionId: true,
        },
      });

    if (!existingPlanning) {
      return {
        success: false,
        error:
          "Événement introuvable ou cet événement n'appartient pas à votre centre.",
      };
    }

    // --------------------------------------------------------
    // SESSION
    // --------------------------------------------------------

    const session =
      await prisma.sessionFormation.findFirst({
        where: {
          id: data.sessionId.trim(),
          centreId: context.centreId,
        },

        select: {
          id: true,
        },
      });

    if (!session) {
      return {
        success: false,
        error:
          "La session sélectionnée est introuvable ou n'appartient pas à votre centre.",
      };
    }

    // --------------------------------------------------------
    // SALLE
    // --------------------------------------------------------

    const salleId =
      data.salleId?.trim() || null;

    if (salleId) {
      const salle =
        await prisma.salle.findFirst({
          where: {
            id: salleId,
            centreId: context.centreId,
          },

          select: {
            id: true,
            nom: true,
          },
        });

      if (!salle) {
        return {
          success: false,
          error:
            "La salle sélectionnée est introuvable ou n'appartient pas à votre centre.",
        };
      }

      // ------------------------------------------------------
      // CONFLIT DE SALLE
      // ------------------------------------------------------

      const conflict =
        await hasRoomConflict({
          salleId: salle.id,
          centreId: context.centreId,
          debut,
          fin,
          excludePlanningId: id.trim(),
        });

      if (conflict) {
        const sessionNom =
          conflict.session.nom ||
          `${conflict.session.formation.code} — ${conflict.session.code}`;

        return {
          success: false,
          error:
            `La salle "${conflict.salle?.nom ?? salle.nom}" ` +
            `est déjà réservée pendant cette période ` +
            `pour la session "${sessionNom}".`,
        };
      }
    }

    // --------------------------------------------------------
    // MODIFICATION
    // --------------------------------------------------------

    await prisma.planning.update({
      where: {
        id: id.trim(),
      },

      data: {
        sessionId: session.id,

        salleId,

        titre:
          data.titre?.trim() || null,

        debut,

        fin,

        description:
          data.description?.trim() || null,
      },
    });

    // --------------------------------------------------------
    // REVALIDATION
    // --------------------------------------------------------

    revalidatePath(
      "/dashboard/calendrier",
    );

    revalidatePath(
      "/dashboard/sessions",
    );

    revalidatePath(
      `/dashboard/sessions/${existingPlanning.sessionId}`,
    );

    revalidatePath(
      `/dashboard/sessions/${session.id}`,
    );

    return {
      success: true,
      message:
        "Événement modifié avec succès.",
    };
  } catch (error) {
    console.error(
      "Erreur updatePlanning():",
      error,
    );

    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2025") {
        return {
          success: false,
          error: "Événement introuvable.",
        };
      }

      if (error.code === "P2003") {
        return {
          success: false,
          error:
            "Impossible de modifier l'événement. Une relation sélectionnée est invalide.",
        };
      }
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de modifier l'événement.",
    };
  }
}

// ============================================================
// SUPPRIMER UN PLANNING
// ============================================================

export async function deletePlanning(
  id: string,
) {
  try {
    const context = await getPlanningContext();

    // --------------------------------------------------------
    // PERMISSION
    // --------------------------------------------------------

    if (!canManagePlanning(context.role)) {
      return {
        success: false,
        error:
          "Vous n'avez pas l'autorisation de supprimer cet événement.",
      };
    }

    if (!id?.trim()) {
      return {
        success: false,
        error:
          "Identifiant du planning invalide.",
      };
    }

    // --------------------------------------------------------
    // VÉRIFIER L'APPARTENANCE AU CENTRE
    // --------------------------------------------------------

    const planning =
      await prisma.planning.findFirst({
        where: {
          id: id.trim(),

          session: {
            centreId: context.centreId,
          },
        },

        select: {
          id: true,
          sessionId: true,
          titre: true,
        },
      });

    if (!planning) {
      return {
        success: false,
        error:
          "Événement introuvable ou cet événement n'appartient pas à votre centre.",
      };
    }

    // --------------------------------------------------------
    // SUPPRESSION
    // --------------------------------------------------------

    await prisma.planning.delete({
      where: {
        id: planning.id,
      },
    });

    // --------------------------------------------------------
    // REVALIDATION
    // --------------------------------------------------------

    revalidatePath(
      "/dashboard/calendrier",
    );

    revalidatePath(
      "/dashboard/sessions",
    );

    revalidatePath(
      `/dashboard/sessions/${planning.sessionId}`,
    );

    return {
      success: true,
      message:
        "Événement supprimé avec succès.",
    };
  } catch (error) {
    console.error(
      "Erreur deletePlanning():",
      error,
    );

    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2003") {
        return {
          success: false,
          error:
            "Impossible de supprimer cet événement car il est encore utilisé par d'autres données.",
        };
      }

      if (error.code === "P2025") {
        return {
          success: false,
          error:
            "Événement introuvable.",
        };
      }
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de supprimer l'événement.",
    };
  }
}

// ============================================================
// CRÉER UNE SALLE DEPUIS LE CALENDRIER
// ============================================================

export async function createSalle(data: {
  nom: string;
  code: string;
  capacite?: number | null;
  localisation?: string | null;
}) {
  const context = await getCurrentCentreContext();

  if (!context?.centreId) {
    return {
      success: false,
      message: "Aucun centre actif n'est associé à votre compte.",
    };
  }

  const nom = data.nom.trim();
  const code = data.code.trim().toUpperCase();
  const localisation =
    data.localisation?.trim() || null;

  if (!nom) {
    return {
      success: false,
      message: "Le nom de la salle est obligatoire.",
    };
  }

  if (!code) {
    return {
      success: false,
      message: "Le code de la salle est obligatoire.",
    };
  }

  if (
    data.capacite !== null &&
    data.capacite !== undefined &&
    (!Number.isInteger(data.capacite) ||
      data.capacite < 1)
  ) {
    return {
      success: false,
      message: "La capacité doit être un nombre entier supérieur à 0.",
    };
  }

  const salleExistante = await prisma.salle.findFirst({
    where: {
      centreId: context.centreId,
      OR: [
        {
          code: {
            equals: code,
          },
        },
        {
          nom: {
            equals: nom,
          },
        },
      ],
    },
  });

  if (salleExistante) {
    if (salleExistante.code === code) {
      return {
        success: false,
        message: `Une salle avec le code "${code}" existe déjà.`,
      };
    }

    return {
      success: false,
      message: `Une salle portant le nom "${nom}" existe déjà.`,
    };
  }

  try {
    const salle = await prisma.salle.create({
      data: {
        centreId: context.centreId,
        nom,
        code,
        capacite: data.capacite ?? null,
        localisation,
      },
      select: {
        id: true,
        nom: true,
        code: true,
        capacite: true,
        localisation: true,
      },
    });

    return {
      success: true,
      message: "Salle créée avec succès.",
      salle,
    };
  } catch (error) {
    console.error(
      "Erreur création salle calendrier :",
      error,
    );

    return {
      success: false,
      message: "Impossible de créer la salle.",
    };
  }
}