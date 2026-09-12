
"use server";

import { prisma } from "@/lib/prisma";

import {
  RoleSysteme,
  StatutFormation,
  TypeFormation,
} from "@/generated/prisma/enums";

import {
  getCurrentCentreContext,
  requireCentreManager,
} from "@/lib/validations/centre-access";

import {
  formationSchema,
  type FormationInput,
} from "@/lib/validations/formation.schema";

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

const PAGE_SIZE = 10;

/**
 * ============================================================
 * UTILITAIRES
 * ============================================================
 */

function normaliserValeur(
  value?: string | null
) {
  const resultat = value?.trim();

  return resultat ? resultat : null;
}

function normaliserPage(
  page?: number
) {
  if (
    !page ||
    !Number.isFinite(page) ||
    page < 1
  ) {
    return 1;
  }

  return Math.floor(page);
}

/**
 * ============================================================
 * LISTE DES FORMATIONS
 * ============================================================
 */

export async function getFormations(params?: {
  search?: string;
  statut?: StatutFormation | "TOUS";
  type?: TypeFormation | "TOUS";
  page?: number;
}) {
  const context =
    await getCurrentCentreContext();

  const page = normaliserPage(
    params?.page
  );

  const search =
    params?.search?.trim() ?? "";

  /**
   * ----------------------------------------------------------
   * FILTRE CENTRE
   * ----------------------------------------------------------
   */

  const where: any = {};

  if (
    context.roleSysteme !==
    RoleSysteme.SUPER_ADMIN
  ) {
    if (!context.centreId) {
      throw new Error(
        "Centre introuvable."
      );
    }

    where.centreId =
      context.centreId;
  }

  /**
   * ----------------------------------------------------------
   * RECHERCHE
   * ----------------------------------------------------------
   */

  if (search) {
    where.OR = [
      {
        code: {
          contains: search,
        },
      },
      {
        nom: {
          contains: search,
        },
      },
      {
        description: {
          contains: search,
        },
      },
      {
        objectifs: {
          contains: search,
        },
      },
      {
        prerequis: {
          contains: search,
        },
      },
    ];
  }

  /**
   * ----------------------------------------------------------
   * FILTRE STATUT
   * ----------------------------------------------------------
   */

  if (
    params?.statut &&
    params.statut !== "TOUS"
  ) {
    where.statut =
      params.statut;
  }

  /**
   * ----------------------------------------------------------
   * FILTRE TYPE
   * ----------------------------------------------------------
   */

  if (
    params?.type &&
    params.type !== "TOUS"
  ) {
    where.type =
      params.type;
  }

  /**
   * ----------------------------------------------------------
   * PAGINATION
   * ----------------------------------------------------------
   */

  const [total, formations] =
    await Promise.all([
      prisma.formation.count({
        where,
      }),

      prisma.formation.findMany({
        where,

        orderBy: [
          {
            nom: "asc",
          },
          {
            code: "asc",
          },
        ],

        skip:
          (page - 1) *
          PAGE_SIZE,

        take: PAGE_SIZE,

        select: {
          id: true,
          centreId: true,

          code: true,
          nom: true,

          description: true,
          objectifs: true,
          prerequis: true,

          type: true,

          dureeHeures: true,

          nombreModules: true,

          statut: true,

          creeLe: true,
          modifieLe: true,

          _count: {
            select: {
              modules: true,
              sessions: true,
              tarifs: true,
              modelesEvaluation: true,
              certifications: true,
            },
          },
        },
      }),
    ]);

  /**
   * ----------------------------------------------------------
   * NOMBRE TOTAL DE PAGES
   * ----------------------------------------------------------
   */

  const totalPages = Math.max(
    1,
    Math.ceil(
      total / PAGE_SIZE
    )
  );

  /**
   * ----------------------------------------------------------
   * SÉCURITÉ SI LA PAGE DEMANDÉE
   * EST SUPÉRIEURE À LA DERNIÈRE PAGE
   * ----------------------------------------------------------
   */

  const pageCorrigee = Math.min(
    page,
    totalPages
  );

  /**
   * Si la page demandée n'existe
   * plus, on recharge la bonne page.
   */

  if (
    pageCorrigee !== page
  ) {
    const formationsCorrigees =
      await prisma.formation.findMany(
        {
          where,

          orderBy: [
            {
              nom: "asc",
            },
            {
              code: "asc",
            },
          ],

          skip:
            (pageCorrigee - 1) *
            PAGE_SIZE,

          take: PAGE_SIZE,

          select: {
            id: true,
            centreId: true,

            code: true,
            nom: true,

            description: true,
            objectifs: true,
            prerequis: true,

            type: true,

            dureeHeures: true,

            nombreModules: true,

            statut: true,

            creeLe: true,
            modifieLe: true,

            _count: {
              select: {
                modules: true,
                sessions: true,
                tarifs: true,
                modelesEvaluation: true,
                certifications: true,
              },
            },
          },
        }
      );

    return {
      formations:
        formationsCorrigees,
      total,
      page: pageCorrigee,
      totalPages,
      search,
      statut:
        params?.statut ??
        "TOUS",
      type:
        params?.type ??
        "TOUS",
    };
  }

  return {
    formations,
    total,
    page,
    totalPages,
    search,
    statut:
      params?.statut ??
      "TOUS",
    type:
      params?.type ??
      "TOUS",
  };
}

/**
 * ============================================================
 * CRÉATION
 * ============================================================
 */

export async function createFormation(
  input: FormationInput
) {
  const context =
    await requireCentreManager();

  if (!context.centreId) {
    throw new Error(
      "Centre introuvable."
    );
  }

  /**
   * ----------------------------------------------------------
   * VALIDATION
   * ----------------------------------------------------------
   */

  const validation =
    formationSchema.safeParse(
      input
    );

  if (!validation.success) {
    throw new Error(
      validation.error.issues[0]
        ?.message ??
        "Les données de la formation sont invalides."
    );
  }

  const data =
    validation.data;

  /**
   * ----------------------------------------------------------
   * NORMALISATION DU CODE
   * ----------------------------------------------------------
   */

  const code =
    data.code.trim().toUpperCase();

  /**
   * ----------------------------------------------------------
   * VÉRIFICATION CODE
   * ----------------------------------------------------------
   */

  const formationExistante =
    await prisma.formation.findFirst(
      {
        where: {
          centreId:
            context.centreId,

          code,
        },

        select: {
          id: true,
        },
      }
    );

  if (formationExistante) {
    throw new Error(
      `Le code « ${code} » est déjà utilisé par une autre formation.`
    );
  }

  /**
   * ----------------------------------------------------------
   * CRÉATION
   * ----------------------------------------------------------
   */

  const formation =
    await prisma.formation.create(
      {
        data: {
          centreId:
            context.centreId,

          code,

          nom: data.nom.trim(),

          description:
            normaliserValeur(
              data.description
            ),

          objectifs:
            normaliserValeur(
              data.objectifs
            ),

          prerequis:
            normaliserValeur(
              data.prerequis
            ),

          type: data.type,

          dureeHeures:
            data.dureeHeures,

          /**
           * Aucun module au moment
           * de la création.
           */
          nombreModules: 0,

          statut: data.statut,
        },

        select: {
          id: true,
          centreId: true,

          code: true,
          nom: true,

          description: true,
          objectifs: true,
          prerequis: true,

          type: true,

          dureeHeures: true,

          nombreModules: true,

          statut: true,

          creeLe: true,
          modifieLe: true,
        },
      }
    );

  return {
    success: true,

    message:
      "La formation a été créée avec succès.",

    formation,
  };
}

/**
 * ============================================================
 * MODIFICATION
 * ============================================================
 */

export async function updateFormation(
  id: string,
  input: FormationInput
) {
  const context =
    await requireCentreManager();

  if (!context.centreId) {
    throw new Error(
      "Centre introuvable."
    );
  }

  /**
   * ----------------------------------------------------------
   * VALIDATION
   * ----------------------------------------------------------
   */

  const validation =
    formationSchema.safeParse(
      input
    );

  if (!validation.success) {
    throw new Error(
      validation.error.issues[0]
        ?.message ??
        "Les données de la formation sont invalides."
    );
  }

  const data =
    validation.data;

  const code =
    data.code.trim().toUpperCase();

  /**
   * ----------------------------------------------------------
   * FORMATION À MODIFIER
   * ----------------------------------------------------------
   */

  const formation =
    await prisma.formation.findFirst(
      {
        where: {
          id,
          centreId:
            context.centreId,
        },

        select: {
          id: true,
        },
      }
    );

  if (!formation) {
    throw new Error(
      "Formation introuvable."
    );
  }

  /**
   * ----------------------------------------------------------
   * VÉRIFICATION DU CODE
   * ----------------------------------------------------------
   */

  const codeExistant =
    await prisma.formation.findFirst(
      {
        where: {
          centreId:
            context.centreId,

          code,

          NOT: {
            id,
          },
        },

        select: {
          id: true,
        },
      }
    );

  if (codeExistant) {
    throw new Error(
      `Le code « ${code} » est déjà utilisé par une autre formation.`
    );
  }

  /**
   * ----------------------------------------------------------
   * MISE À JOUR
   * ----------------------------------------------------------
   */

  const updated =
    await prisma.formation.update(
      {
        where: {
          id: formation.id,
        },

        data: {
          code,

          nom: data.nom.trim(),

          description:
            normaliserValeur(
              data.description
            ),

          objectifs:
            normaliserValeur(
              data.objectifs
            ),

          prerequis:
            normaliserValeur(
              data.prerequis
            ),

          type: data.type,

          dureeHeures:
            data.dureeHeures,

          statut: data.statut,
        },

        select: {
          id: true,
          centreId: true,

          code: true,
          nom: true,

          description: true,
          objectifs: true,
          prerequis: true,

          type: true,

          dureeHeures: true,

          nombreModules: true,

          statut: true,

          creeLe: true,
          modifieLe: true,
        },
      }
    );

  return {
    success: true,

    message:
      "La formation a été modifiée avec succès.",

    formation: updated,
  };
}

/**
 * ============================================================
 * CHANGEMENT DE STATUT
 * ============================================================
 */

export async function updateFormationStatut(
  id: string,
  statut: StatutFormation
) {
  const context =
    await requireCentreManager();

  if (!context.centreId) {
    throw new Error(
      "Centre introuvable."
    );
  }

  /**
   * ----------------------------------------------------------
   * VÉRIFICATION
   * ----------------------------------------------------------
   */

  const formation =
    await prisma.formation.findFirst(
      {
        where: {
          id,
          centreId:
            context.centreId,
        },

        select: {
          id: true,
          nom: true,
        },
      }
    );

  if (!formation) {
    throw new Error(
      "Formation introuvable."
    );
  }

  /**
   * ----------------------------------------------------------
   * MISE À JOUR
   * ----------------------------------------------------------
   */

  await prisma.formation.update(
    {
      where: {
        id: formation.id,
      },

      data: {
        statut,
      },
    }
  );

  const labels: Record<
    StatutFormation,
    string
  > = {
    BROUILLON: "Brouillon",
    ACTIVE: "Active",
    ARCHIVEE: "Archivée",
  };

  return {
    success: true,

    message: `La formation « ${formation.nom} » est maintenant « ${labels[statut]} ».`,
  };
}

/**
 * ============================================================
 * SUPPRESSION
 * ============================================================
 */

export async function deleteFormation(
  id: string
) {
  const context =
    await requireCentreManager();

  if (!context.centreId) {
    throw new Error(
      "Centre introuvable."
    );
  }

  /**
   * ----------------------------------------------------------
   * RÉCUPÉRATION
   * ----------------------------------------------------------
   */

  const formation =
    await prisma.formation.findFirst(
      {
        where: {
          id,
          centreId:
            context.centreId,
        },

        select: {
          id: true,
          nom: true,
          code: true,

          _count: {
            select: {
              modules: true,
              sessions: true,
              tarifs: true,
              modelesEvaluation: true,
              certifications: true,
            },
          },
        },
      }
    );

  if (!formation) {
    throw new Error(
      "Formation introuvable."
    );
  }

  /**
   * ----------------------------------------------------------
   * CONTRÔLE DES RELATIONS
   * ----------------------------------------------------------
   */

  const relations = [
    {
      label: "module",
      count:
        formation._count.modules,
    },
    {
      label: "session",
      count:
        formation._count.sessions,
    },
    {
      label: "tarif",
      count:
        formation._count.tarifs,
    },
    {
      label:
        "modèle d'évaluation",
      count:
        formation._count
          .modelesEvaluation,
    },
    {
      label:
        "certification",
      count:
        formation._count
          .certifications,
    },
  ];

  const relationsActives =
    relations.filter(
      (relation) =>
        relation.count > 0
    );

  if (
    relationsActives.length > 0
  ) {
    const details =
      relationsActives
        .map(
          (relation) =>
            `${relation.count} ${relation.label}${relation.count > 1 ? "s" : ""}`
        )
        .join(", ");

    throw new Error(
      `La formation « ${formation.nom} » ne peut pas être supprimée car elle est déjà utilisée : ${details}. Archivez-la plutôt.`
    );
  }

  /**
   * ----------------------------------------------------------
   * SUPPRESSION
   * ----------------------------------------------------------
   */

  await prisma.formation.delete(
    {
      where: {
        id: formation.id,
      },
    }
  );

  return {
    success: true,

    message:
      `La formation « ${formation.nom} » a été supprimée avec succès.`,
  };
}
