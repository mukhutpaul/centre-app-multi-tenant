
"use server";

import { revalidatePath } from "next/cache";

import {
  getCurrentCentreContext,
  requireCentreManager,
} from "@/lib/validations/centre-access";

import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

interface ModuleInput {
  code: string;
  nom: string;
  description?: string | null;
  position: number;
  dureeHeures?: number | string | null;
  coefficient?: number | string | null;
}

/**
 * ============================================================
 * NORMALISATION DECIMAL
 * ============================================================
 */
function normaliserDecimal(
  value: number | string | null | undefined,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const nombre =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(nombre)) {
    return null;
  }

  return nombre;
}

/**
 * ============================================================
 * VERIFIER L'ACCES A UNE FORMATION
 * ============================================================
 *
 * Vérifie :
 * - que la formation existe ;
 * - que l'utilisateur appartient au centre ;
 * - que le Super Administrateur peut accéder à toutes
 *   les formations.
 */
async function verifierFormationAccessible(
  formationId: string,
) {
  const context =
    await getCurrentCentreContext();

  const formation =
    await prisma.formation.findUnique({
      where: {
        id: formationId,
      },
      select: {
        id: true,
        centreId: true,
        code: true,
        nom: true,
      },
    });

  if (!formation) {
    throw new Error(
      "Formation introuvable.",
    );
  }

  /**
   * Le Super Administrateur peut accéder
   * aux formations de tous les centres.
   */
  if (
    context.roleSysteme !== "SUPER_ADMIN" &&
    formation.centreId !== context.centreId
  ) {
    throw new Error(
      "Vous n'avez pas accès à cette formation.",
    );
  }

  return formation;
}

/**
 * ============================================================
 * LISTE DES MODULES
 * ============================================================
 */
export async function getModulesFormation({
  formationId,
  search = "",
  page = 1,
}: {
  formationId: string;
  search?: string;
  page?: number;
}) {
  await verifierFormationAccessible(
    formationId,
  );

  const recherche = search.trim();

  const pageNormalisee =
    Number.isFinite(page) && page > 0
      ? Math.floor(page)
      : 1;

  const where = {
    formationId,

    ...(recherche
      ? {
          OR: [
            {
              code: {
                contains: recherche,
              },
            },
            {
              nom: {
                contains: recherche,
              },
            },
            {
              description: {
                contains: recherche,
              },
            },
          ],
        }
      : {}),
  };

  const [modules, total] =
    await prisma.$transaction([
      prisma.moduleFormation.findMany({
        where,

        orderBy: {
          position: "asc",
        },

        skip:
          (pageNormalisee - 1) *
          PAGE_SIZE,

        take: PAGE_SIZE,

        select: {
          id: true,
          formationId: true,
          code: true,
          nom: true,
          description: true,
          position: true,
          dureeHeures: true,
          coefficient: true,
          creeLe: true,
          modifieLe: true,
        },
      }),

      prisma.moduleFormation.count({
        where,
      }),
    ]);

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE),
  );

  return {
    modules,
    total,

    page: Math.min(
      pageNormalisee,
      totalPages,
    ),

    totalPages,
  };
}

/**
 * ============================================================
 * DETAIL DE LA FORMATION
 * ============================================================
 */
export async function getFormationAvecModules(
  formationId: string,
) {
  await verifierFormationAccessible(
    formationId,
  );

  return prisma.formation.findUnique({
    where: {
      id: formationId,
    },

    select: {
      id: true,
      centreId: true,
      code: true,
      nom: true,
      description: true,
      type: true,
      dureeHeures: true,
      nombreModules: true,
      statut: true,

      _count: {
        select: {
          modules: true,
          sessions: true,
        },
      },
    },
  });
}
/**
 * ============================================================
 * AJOUTER UN MODULE
 * ============================================================
 */
export async function createModuleFormation(
  formationId: string,
  input: ModuleInput,
) {
  /**
   * Vérification des permissions.
   */
  await requireCentreManager();

  /**
   * Vérification de l'accès à la formation.
   */
  await verifierFormationAccessible(
    formationId,
  );

  const code =
    input.code.trim().toUpperCase();

  const nom =
    input.nom.trim();

  /**
   * Validation du code.
   */
  if (!code) {
    throw new Error(
      "Le code du module est obligatoire.",
    );
  }

  /**
   * Validation du nom.
   */
  if (!nom) {
    throw new Error(
      "Le nom du module est obligatoire.",
    );
  }

  /**
   * Validation de la position.
   */
  const position = Number(
    input.position,
  );

  if (
    !Number.isInteger(position) ||
    position < 1
  ) {
    throw new Error(
      "La position doit être un nombre entier supérieur ou égal à 1.",
    );
  }

  /**
   * Durée.
   */
  const dureeHeures =
    normaliserDecimal(
      input.dureeHeures,
    );

  if (
    dureeHeures !== null &&
    dureeHeures < 0
  ) {
    throw new Error(
      "La durée du module ne peut pas être négative.",
    );
  }

  /**
   * Coefficient.
   */
  const coefficient =
    normaliserDecimal(
      input.coefficient,
    ) ?? 1;

  if (coefficient <= 0) {
    throw new Error(
      "Le coefficient doit être supérieur à 0.",
    );
  }

  /**
   * Vérification des doublons.
   *
   * Le modèle Prisma possède :
   *
   * @@unique([formationId, code])
   * @@unique([formationId, position])
   */
  const moduleExistant =
    await prisma.moduleFormation.findFirst({
      where: {
        formationId,

        OR: [
          {
            code,
          },
          {
            position,
          },
        ],
      },

      select: {
        code: true,
        position: true,
      },
    });

  if (moduleExistant) {
    if (
      moduleExistant.code === code
    ) {
      throw new Error(
        `Le code ${code} est déjà utilisé dans cette formation.`,
      );
    }

    if (
      moduleExistant.position === position
    ) {
      throw new Error(
        `La position ${position} est déjà utilisée dans cette formation.`,
      );
    }
  }

  /**
   * Création + mise à jour du compteur
   * dans une seule transaction.
   */
  const moduleCree =
    await prisma.$transaction(
      async (tx) => {
        const nouveauModule =
          await tx.moduleFormation.create({
            data: {
              formationId,
              code,
              nom,

              description:
                input.description?.trim() ||
                null,

              position,
              dureeHeures,
              coefficient,
            },

            select: {
              id: true,
              formationId: true,
              code: true,
              nom: true,
              description: true,
              position: true,
              dureeHeures: true,
              coefficient: true,
            },
          });

        await tx.formation.update({
          where: {
            id: formationId,
          },

          data: {
            nombreModules: {
              increment: 1,
            },
          },
        });

        return nouveauModule;
      },
    );

  /**
   * Rafraîchissement des pages.
   */
  revalidatePath(
    `/formations/${formationId}/modules`,
  );

  revalidatePath(
    "/formations",
  );

  return {
    success: true,

    message:
      "Module ajouté avec succès.",

    module: moduleCree,
  };
}

/**
 * ============================================================
 * MODIFIER UN MODULE
 * ============================================================
 */
export async function updateModuleFormation(
  id: string,
  input: ModuleInput,
) {
  /**
   * Vérification des permissions.
   */
  await requireCentreManager();

  /**
   * Recherche du module.
   */
  const moduleExistant =
    await prisma.moduleFormation.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        formationId: true,
      },
    });

  if (!moduleExistant) {
    throw new Error(
      "Module introuvable.",
    );
  }

  /**
   * Vérification de l'accès à la formation.
   */
  await verifierFormationAccessible(
    moduleExistant.formationId,
  );

  const code =
    input.code.trim().toUpperCase();

  const nom =
    input.nom.trim();

  /**
   * Validation du code.
   */
  if (!code) {
    throw new Error(
      "Le code du module est obligatoire.",
    );
  }

  /**
   * Validation du nom.
   */
  if (!nom) {
    throw new Error(
      "Le nom du module est obligatoire.",
    );
  }

  /**
   * Validation position.
   */
  const position = Number(
    input.position,
  );

  if (
    !Number.isInteger(position) ||
    position < 1
  ) {
    throw new Error(
      "La position doit être un nombre entier supérieur ou égal à 1.",
    );
  }

  /**
   * Durée.
   */
  const dureeHeures =
    normaliserDecimal(
      input.dureeHeures,
    );

  if (
    dureeHeures !== null &&
    dureeHeures < 0
  ) {
    throw new Error(
      "La durée du module ne peut pas être négative.",
    );
  }

  /**
   * Coefficient.
   */
  const coefficient =
    normaliserDecimal(
      input.coefficient,
    ) ?? 1;

  if (coefficient <= 0) {
    throw new Error(
      "Le coefficient doit être supérieur à 0.",
    );
  }

  /**
   * Vérification des doublons.
   *
   * On exclut le module actuellement modifié.
   */
  const doublon =
    await prisma.moduleFormation.findFirst({
      where: {
        formationId:
          moduleExistant.formationId,

        id: {
          not: id,
        },

        OR: [
          {
            code,
          },
          {
            position,
          },
        ],
      },

      select: {
        code: true,
        position: true,
      },
    });

  if (doublon) {
    if (
      doublon.code === code
    ) {
      throw new Error(
        `Le code ${code} est déjà utilisé dans cette formation.`,
      );
    }

    if (
      doublon.position === position
    ) {
      throw new Error(
        `La position ${position} est déjà utilisée dans cette formation.`,
      );
    }
  }

  /**
   * Modification du module.
   */
  const moduleModifie =
    await prisma.moduleFormation.update({
      where: {
        id,
      },

      data: {
        code,
        nom,

        description:
          input.description?.trim() ||
          null,

        position,
        dureeHeures,
        coefficient,
      },

      select: {
        id: true,
        formationId: true,
        code: true,
        nom: true,
        description: true,
        position: true,
        dureeHeures: true,
        coefficient: true,
      },
    });

  /**
   * Rafraîchissement.
   */
  revalidatePath(
    `/formations/${moduleExistant.formationId}/modules`,
  );

  revalidatePath(
    "/formations",
  );

  return {
    success: true,

    message:
      "Module modifié avec succès.",

    module: moduleModifie,
  };
}

/**
 * ============================================================
 * SUPPRIMER UN MODULE
 * ============================================================
 */
export async function deleteModuleFormation(
  id: string,
) {
  /**
   * Vérification des permissions.
   */
  await requireCentreManager();

  /**
   * Recherche du module.
   */
  const moduleASupprimer =
    await prisma.moduleFormation.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        formationId: true,
        code: true,
        nom: true,
      },
    });

  if (!moduleASupprimer) {
    throw new Error(
      "Module introuvable.",
    );
  }

  /**
   * Vérification de l'accès
   * à la formation.
   */
  await verifierFormationAccessible(
    moduleASupprimer.formationId,
  );

  /**
   * Suppression + décrémentation
   * du compteur dans une transaction.
   */
  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.moduleFormation.delete({
          where: {
            id: moduleASupprimer.id,
          },
        });

        await tx.formation.update({
          where: {
            id: moduleASupprimer.formationId,
          },

          data: {
            nombreModules: {
              decrement: 1,
            },
          },
        });
      },
    );
  } catch (error) {
    console.error(
      "Erreur suppression module :",
      error,
    );

    throw new Error(
      "Impossible de supprimer ce module. Il est probablement déjà utilisé dans une session ou une évaluation.",
    );
  }

  /**
   * Rafraîchissement.
   */
  revalidatePath(
    `/formations/${moduleASupprimer.formationId}/modules`,
  );

  revalidatePath(
    "/formations",
  );

  return {
    success: true,

    message:
      "Module supprimé avec succès.",
  };
}
