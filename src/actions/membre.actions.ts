"use server";

import {
  Role,
  RoleSysteme,
  StatutMembre,
} from "@/generated/prisma/enums";

import { peutAttribuerRole } from "@/lib/auth/permissions";

import { prisma } from "@/lib/prisma";

import {
  getCurrentCentreContext,
  requireRole,
} from "@/lib/validations/centre-access";

import { membreSchema } from "@/lib/validations/membre.schema";

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

type ActionResult = {
  success: boolean;
  message: string;
};

/**
 * Données supplémentaires utilisées par le SUPER_ADMIN.
 *
 * Le centre est obligatoire pour un SUPER_ADMIN puisqu'il
 * n'a pas de centre courant.
 */
type MembreData = {
  utilisateurId: string;
  role: Role;
  statut: StatutMembre;
  centreId?: string;
};

/**
 * ============================================================
 * GET MEMBRES
 * ============================================================
 *
 * SUPER_ADMIN :
 *    voit les membres de tous les centres.
 *
 * Utilisateur normal :
 *    voit uniquement les membres de son centre.
 */
export async function getMembres() {
  const context =
    await getCurrentCentreContext();

  /**
   * ----------------------------------------------------------
   * SUPER ADMIN
   * ----------------------------------------------------------
   */
  if (
    context.roleSysteme ===
    RoleSysteme.SUPER_ADMIN
  ) {
    return prisma.membre.findMany({
      include: {
        utilisateur: {
          select: {
            id: true,
            email: true,
            prenom: true,
            nom: true,
            telephone: true,
            statut: true,
            roleSysteme: true,
            derniereConnexion: true,
            avatarUrl: true,
            creeLe: true,
          },
        },

        centre: {
          select: {
            id: true,
            nom: true,
            slug: true,
            code: true,
            statut: true,
          },
        },
      },

      orderBy: [
        {
          statut: "asc",
        },
        {
          creeLe: "desc",
        },
      ],
    });
  }

  /**
   * ----------------------------------------------------------
   * UTILISATEUR NORMAL
   * ----------------------------------------------------------
   */
  if (!context.centreId) {
    throw new Error(
      "Aucun centre actif n'est associé à votre compte.",
    );
  }

  if (
    !context.role ||
    ![
      Role.PROPRIETAIRE,
      Role.ADMINISTRATEUR,
      Role.RESPONSABLE,
    ].some(
      (role) => role === context.role,
    )
  ) {
    throw new Error(
      "Vous n'avez pas les permissions nécessaires.",
    );
  }

  return prisma.membre.findMany({
    where: {
      centreId: context.centreId,
    },

    include: {
      utilisateur: {
        select: {
          id: true,
          email: true,
          prenom: true,
          nom: true,
          telephone: true,
          statut: true,
          roleSysteme: true,
          derniereConnexion: true,
          avatarUrl: true,
          creeLe: true,
        },
      },
    },

    orderBy: [
      {
        statut: "asc",
      },
      {
        creeLe: "desc",
      },
    ],
  });
}

/**
 * ============================================================
 * GET MEMBRE PAR ID
 * ============================================================
 */
export async function getMembreById(
  membreId: string,
) {
  const context =
    await getCurrentCentreContext();

  /**
   * ----------------------------------------------------------
   * SUPER ADMIN
   * ----------------------------------------------------------
   */
  if (
    context.roleSysteme ===
    RoleSysteme.SUPER_ADMIN
  ) {
    const membre =
      await prisma.membre.findUnique({
        where: {
          id: membreId,
        },

        include: {
          utilisateur: {
            select: {
              id: true,
              email: true,
              prenom: true,
              nom: true,
              telephone: true,
              statut: true,
              roleSysteme: true,
              derniereConnexion: true,
            },
          },

          centre: {
            select: {
              id: true,
              nom: true,
              slug: true,
              code: true,
              statut: true,
            },
          },
        },
      });

    if (!membre) {
      throw new Error(
        "Membre introuvable.",
      );
    }

    return membre;
  }

  /**
   * ----------------------------------------------------------
   * UTILISATEUR NORMAL
   * ----------------------------------------------------------
   */
  if (!context.centreId) {
    throw new Error(
      "Aucun centre actif n'est associé à votre compte.",
    );
  }

  const membre =
    await prisma.membre.findFirst({
      where: {
        id: membreId,
        centreId: context.centreId,
      },

      include: {
        utilisateur: {
          select: {
            id: true,
            email: true,
            prenom: true,
            nom: true,
            telephone: true,
            statut: true,
            roleSysteme: true,
            derniereConnexion: true,
          },
        },

        centre: {
          select: {
            id: true,
            nom: true,
            slug: true,
            code: true,
            statut: true,
          },
        },
      },
    });

  if (!membre) {
    throw new Error(
      "Membre introuvable.",
    );
  }

  return membre;
}

/**
 * ============================================================
 * CRÉER UN MEMBRE
 * ============================================================
 *
 * Cas 1 :
 * SUPER_ADMIN
 *    → choisit le centre
 *
 * Cas 2 :
 * PROPRIETAIRE / ADMINISTRATEUR
 *    → utilise automatiquement son centre courant
 */
export async function createMembre(
  data: unknown,
) {
  const context =
    await getCurrentCentreContext();

  /**
   * ----------------------------------------------------------
   * VALIDATION
   * ----------------------------------------------------------
   */
  const parsed =
    membreSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ??
        "Données invalides.",
    );
  }

  const {
    utilisateurId,
    role,
    statut,
  } = parsed.data;

  /**
   * Récupération éventuelle du centre fourni.
   *
   * Le centre fourni par le client n'est utilisé QUE
   * pour un SUPER_ADMIN.
   */
  const centreIdFourni =
    (parsed.data as MembreData).centreId;

  let centreId: string;

  /**
   * ----------------------------------------------------------
   * SUPER ADMIN
   * ----------------------------------------------------------
   */
  if (
    context.roleSysteme ===
    RoleSysteme.SUPER_ADMIN
  ) {
    if (!centreIdFourni) {
      throw new Error(
        "Le centre est obligatoire pour ajouter un membre.",
      );
    }

    centreId = centreIdFourni;

    /**
     * Vérifier que le centre existe et est exploitable.
     */
    const centre =
      await prisma.centreFormation.findUnique({
        where: {
          id: centreId,
        },

        select: {
          id: true,
          nom: true,
          statut: true,
        },
      });

    if (!centre) {
      throw new Error(
        "Centre introuvable.",
      );
    }
  } else {
    /**
     * --------------------------------------------------------
     * UTILISATEUR NORMAL
     * --------------------------------------------------------
     */
    if (!context.centreId) {
      throw new Error(
        "Aucun centre actif n'est associé à votre compte.",
      );
    }

    centreId = context.centreId;

    /**
     * Seuls ces rôles peuvent ajouter des membres.
     */
    if (
      !context.role ||
      ![
        Role.PROPRIETAIRE,
        Role.ADMINISTRATEUR,
      ].some(
        (allowedRole) =>
          allowedRole === context.role,
      )
    ) {
      throw new Error(
        "Vous n'avez pas les permissions nécessaires pour ajouter un membre.",
      );
    }

    /**
     * Le centre envoyé par le client ne doit jamais
     * permettre de changer de tenant.
     */
    if (
      centreIdFourni &&
      centreIdFourni !== context.centreId
    ) {
      throw new Error(
        "Vous ne pouvez pas ajouter un membre dans un autre centre.",
      );
    }
  }

  /**
   * ----------------------------------------------------------
   * VÉRIFICATION UTILISATEUR
   * ----------------------------------------------------------
   */
  const utilisateur =
    await prisma.utilisateur.findUnique({
      where: {
        id: utilisateurId,
      },

      select: {
        id: true,
        email: true,
        roleSysteme: true,
        statut: true,
      },
    });

  if (!utilisateur) {
    throw new Error(
      "Utilisateur introuvable.",
    );
  }

  /**
   * Un SUPER_ADMIN global ne doit pas être ajouté comme
   * membre d'un centre.
   *
   * Si tu veux qu'un Super Admin puisse également avoir
   * un compte dans un centre, il faudra prévoir une règle
   * spécifique. Pour l'instant, on garde une séparation nette.
   */
  if (
    utilisateur.roleSysteme ===
    RoleSysteme.SUPER_ADMIN
  ) {
    throw new Error(
      "Un Super Administrateur ne peut pas être ajouté comme membre d'un centre.",
    );
  }

  /**
   * ----------------------------------------------------------
   * VÉRIFICATION DU RÔLE
   * ----------------------------------------------------------
   *
   * Le SUPER_ADMIN peut attribuer n'importe quel rôle
   * de centre.
   *
   * Les responsables du centre sont soumis à
   * peutAttribuerRole().
   */
  if (
    context.roleSysteme !==
    RoleSysteme.SUPER_ADMIN
  ) {
    if (!context.role) {
      throw new Error(
        "Votre rôle de centre est introuvable.",
      );
    }

    if (
      !peutAttribuerRole(
        context.role,
        role,
      )
    ) {
      throw new Error(
        "Vous n'êtes pas autorisé à attribuer ce rôle.",
      );
    }
  }

  /**
   * ----------------------------------------------------------
   * VÉRIFICATION MEMBRE EXISTANT
   * ----------------------------------------------------------
   */
  const existing =
    await prisma.membre.findUnique({
      where: {
        utilisateurId_centreId: {
          utilisateurId,
          centreId,
        },
      },
    });

  if (existing) {
    throw new Error(
      "Cet utilisateur est déjà membre de ce centre.",
    );
  }

  /**
   * ----------------------------------------------------------
   * CRÉATION
   * ----------------------------------------------------------
   */
  const membre =
    await prisma.membre.create({
      data: {
        utilisateurId,

        centreId,

        role,

        statut,

        dateInvitation:
          new Date(),

        dateActivation:
          statut === StatutMembre.ACTIF
            ? new Date()
            : null,
      },

      include: {
        utilisateur: {
          select: {
            id: true,
            email: true,
            prenom: true,
            nom: true,
            telephone: true,
            statut: true,
            roleSysteme: true,
          },
        },

        centre: {
          select: {
            id: true,
            nom: true,
            code: true,
          },
        },
      },
    });

  return {
    success: true,
    message:
      "Membre ajouté avec succès.",
    membre,
  };
}

/**
 * ============================================================
 * MODIFIER UN MEMBRE
 * ============================================================
 */
export async function updateMembre(
  membreId: string,
  data: unknown,
) {
  const context =
    await getCurrentCentreContext();

  const parsed =
    membreSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ??
        "Données invalides.",
    );
  }

  const membre =
    await prisma.membre.findUnique({
      where: {
        id: membreId,
      },
    });

  if (!membre) {
    throw new Error(
      "Membre introuvable.",
    );
  }

  /**
   * ----------------------------------------------------------
   * CONTRÔLE CENTRE
   * ----------------------------------------------------------
   */
  if (
    context.roleSysteme !==
    RoleSysteme.SUPER_ADMIN
  ) {
    if (!context.centreId) {
      throw new Error(
        "Aucun centre actif n'est associé à votre compte.",
      );
    }

    if (
      membre.centreId !==
      context.centreId
    ) {
      throw new Error(
        "Ce membre n'appartient pas à votre centre.",
      );
    }
  }

  /**
   * ----------------------------------------------------------
   * SUPER ADMIN
   * ----------------------------------------------------------
   */
  if (
    context.roleSysteme ===
    RoleSysteme.SUPER_ADMIN
  ) {
    const updated =
      await prisma.membre.update({
        where: {
          id: membreId,
        },

        data: {
          role: parsed.data.role,

          statut:
            parsed.data.statut,

          dateActivation:
            parsed.data.statut ===
            StatutMembre.ACTIF
              ? membre.dateActivation ??
                new Date()
              : membre.dateActivation,
        },

        include: {
          utilisateur: {
            select: {
              id: true,
              email: true,
              prenom: true,
              nom: true,
            },
          },
        },
      });

    return {
      success: true,
      message:
        "Membre modifié avec succès.",
      membre: updated,
    };
  }

  /**
   * ----------------------------------------------------------
   * UTILISATEUR NORMAL
   * ----------------------------------------------------------
   */
  if (!context.role) {
    throw new Error(
      "Votre rôle de centre est introuvable.",
    );
  }

  if (
    ![
      Role.PROPRIETAIRE,
      Role.ADMINISTRATEUR,
    ].some(
      (allowedRole) =>
        allowedRole === context.role,
    )
  ) {
    throw new Error(
      "Vous n'avez pas les permissions nécessaires.",
    );
  }

  /**
   * Empêcher l'auto-modification du rôle.
   */
  if (
    membre.utilisateurId ===
      context.userId &&
    parsed.data.role !== membre.role
  ) {
    throw new Error(
      "Vous ne pouvez pas modifier votre propre rôle.",
    );
  }

  /**
   * Vérifier que le rôle peut être attribué.
   */
  if (
    !peutAttribuerRole(
      context.role,
      parsed.data.role,
    )
  ) {
    throw new Error(
      "Vous n'êtes pas autorisé à attribuer ce rôle.",
    );
  }

  const updated =
    await prisma.membre.update({
      where: {
        id: membreId,
      },

      data: {
        role: parsed.data.role,

        statut:
          parsed.data.statut,

        dateActivation:
          parsed.data.statut ===
          StatutMembre.ACTIF
            ? membre.dateActivation ??
              new Date()
            : membre.dateActivation,
      },

      include: {
        utilisateur: {
          select: {
            id: true,
            email: true,
            prenom: true,
            nom: true,
          },
        },
      },
    });

  return {
    success: true,
    message:
      "Membre modifié avec succès.",
    membre: updated,
  };
}

/**
 * ============================================================
 * MODIFIER LE RÔLE
 * ============================================================
 */
export async function updateRoleMembre(
  membreId: string,
  role: Role,
) {
  const context =
    await getCurrentCentreContext();

  const membre =
    await prisma.membre.findUnique({
      where: {
        id: membreId,
      },
    });

  if (!membre) {
    throw new Error(
      "Membre introuvable.",
    );
  }

  /**
   * ----------------------------------------------------------
   * CONTRÔLE CENTRE
   * ----------------------------------------------------------
   */
  if (
    context.roleSysteme !==
    RoleSysteme.SUPER_ADMIN
  ) {
    if (!context.centreId) {
      throw new Error(
        "Aucun centre actif n'est associé à votre compte.",
      );
    }

    if (
      membre.centreId !==
      context.centreId
    ) {
      throw new Error(
        "Ce membre n'appartient pas à votre centre.",
      );
    }
  }

  /**
   * ----------------------------------------------------------
   * EMPÊCHER L'AUTO-MODIFICATION
   * ----------------------------------------------------------
   */
  if (
    membre.utilisateurId ===
    context.userId
  ) {
    throw new Error(
      "Vous ne pouvez pas modifier votre propre rôle.",
    );
  }

  /**
   * ----------------------------------------------------------
   * SUPER ADMIN
   * ----------------------------------------------------------
   */
  if (
    context.roleSysteme ===
    RoleSysteme.SUPER_ADMIN
  ) {
    await prisma.membre.update({
      where: {
        id: membreId,
      },

      data: {
        role,
      },
    });

    return {
      success: true,
      message:
        "Rôle modifié avec succès.",
    };
  }

  /**
   * ----------------------------------------------------------
   * UTILISATEUR NORMAL
   * ----------------------------------------------------------
   */
  if (!context.role) {
    throw new Error(
      "Votre rôle de centre est introuvable.",
    );
  }

  if (
    ![
      Role.PROPRIETAIRE,
      Role.ADMINISTRATEUR,
    ].some(
      (allowedRole) =>
        allowedRole === context.role,
    )
  ) {
    throw new Error(
      "Vous n'avez pas les permissions nécessaires.",
    );
  }

  if (
    !peutAttribuerRole(
      context.role,
      role,
    )
  ) {
    throw new Error(
      "Vous n'êtes pas autorisé à attribuer ce rôle.",
    );
  }

  /**
   * Protection :
   * un administrateur ne peut pas modifier le rôle
   * d'un propriétaire.
   */
  if (
    membre.role ===
      Role.PROPRIETAIRE &&
    context.role !==
      Role.PROPRIETAIRE
  ) {
    throw new Error(
      "Seul le propriétaire peut modifier le rôle d'un propriétaire.",
    );
  }

  await prisma.membre.update({
    where: {
      id: membreId,
    },

    data: {
      role,
    },
  });

  return {
    success: true,
    message:
      "Rôle modifié avec succès.",
  };
}

/**
 * ============================================================
 * MODIFIER LE STATUT DU MEMBRE
 * ============================================================
 *
 * Contrairement à StatutUtilisateur, ceci concerne
 * uniquement l'accès de l'utilisateur à CE centre.
 */
export async function updateStatutMembre(
  membreId: string,
  statut: StatutMembre,
) {
  const context =
    await getCurrentCentreContext();

  const membre =
    await prisma.membre.findUnique({
      where: {
        id: membreId,
      },
    });

  if (!membre) {
    throw new Error(
      "Membre introuvable.",
    );
  }

  /**
   * ----------------------------------------------------------
   * CONTRÔLE CENTRE
   * ----------------------------------------------------------
   */
  if (
    context.roleSysteme !==
    RoleSysteme.SUPER_ADMIN
  ) {
    if (!context.centreId) {
      throw new Error(
        "Aucun centre actif n'est associé à votre compte.",
      );
    }

    if (
      membre.centreId !==
      context.centreId
    ) {
      throw new Error(
        "Ce membre n'appartient pas à votre centre.",
      );
    }
  }

  /**
   * ----------------------------------------------------------
   * EMPÊCHER L'AUTO-MODIFICATION
   * ----------------------------------------------------------
   */
  if (
    membre.utilisateurId ===
    context.userId
  ) {
    throw new Error(
      "Vous ne pouvez pas modifier votre propre statut de membre.",
    );
  }

  /**
   * ----------------------------------------------------------
   * SUPER ADMIN
   * ----------------------------------------------------------
   */
  if (
    context.roleSysteme ===
    RoleSysteme.SUPER_ADMIN
  ) {
    await prisma.membre.update({
      where: {
        id: membreId,
      },

      data: {
        statut,

        dateActivation:
          statut ===
          StatutMembre.ACTIF
            ? membre.dateActivation ??
              new Date()
            : membre.dateActivation,
      },
    });

    return {
      success: true,
      message:
        "Statut du membre mis à jour.",
    };
  }

  /**
   * ----------------------------------------------------------
   * UTILISATEUR NORMAL
   * ----------------------------------------------------------
   */
  if (!context.role) {
    throw new Error(
      "Votre rôle de centre est introuvable.",
    );
  }

  if (
    ![
      Role.PROPRIETAIRE,
      Role.ADMINISTRATEUR,
    ].some(
      (allowedRole) =>
        allowedRole === context.role,
    )
  ) {
    throw new Error(
      "Vous n'avez pas les permissions nécessaires.",
    );
  }

  /**
   * Un administrateur ne peut pas désactiver
   * le propriétaire.
   */
  if (
    membre.role ===
      Role.PROPRIETAIRE &&
    context.role !==
      Role.PROPRIETAIRE
  ) {
    throw new Error(
      "Seul le propriétaire peut modifier le statut d'un propriétaire.",
    );
  }

  await prisma.membre.update({
    where: {
      id: membreId,
    },

    data: {
      statut,

      dateActivation:
        statut ===
        StatutMembre.ACTIF
          ? membre.dateActivation ??
            new Date()
          : membre.dateActivation,
    },
  });

  return {
    success: true,
    message:
      "Statut du membre mis à jour.",
  };
}

/**
 * ============================================================
 * SUPPRIMER / RETIRER UN MEMBRE
 * ============================================================
 *
 * Cette action retire l'utilisateur du centre.
 *
 * Elle ne supprime PAS l'utilisateur global.
 *
 * C'est important parce qu'un utilisateur peut appartenir
 * à plusieurs centres.
 */
export async function deleteMembre(
  membreId: string,
): Promise<ActionResult> {
  const context =
    await getCurrentCentreContext();

  const membre =
    await prisma.membre.findUnique({
      where: {
        id: membreId,
      },
    });

  if (!membre) {
    throw new Error(
      "Membre introuvable.",
    );
  }

  /**
   * ----------------------------------------------------------
   * CONTRÔLE CENTRE
   * ----------------------------------------------------------
   */
  if (
    context.roleSysteme !==
    RoleSysteme.SUPER_ADMIN
  ) {
    if (!context.centreId) {
      throw new Error(
        "Aucun centre actif n'est associé à votre compte.",
      );
    }

    if (
      membre.centreId !==
      context.centreId
    ) {
      throw new Error(
        "Ce membre n'appartient pas à votre centre.",
      );
    }
  }

  /**
   * ----------------------------------------------------------
   * EMPÊCHER AUTO-SUPPRESSION
   * ----------------------------------------------------------
   */
  if (
    membre.utilisateurId ===
    context.userId
  ) {
    throw new Error(
      "Vous ne pouvez pas vous retirer vous-même du centre.",
    );
  }

  /**
   * ----------------------------------------------------------
   * UTILISATEUR NORMAL
   * ----------------------------------------------------------
   */
  if (
    context.roleSysteme !==
    RoleSysteme.SUPER_ADMIN
  ) {
    if (!context.role) {
      throw new Error(
        "Votre rôle de centre est introuvable.",
      );
    }

    if (
      ![
        Role.PROPRIETAIRE,
        Role.ADMINISTRATEUR,
      ].some(
        (allowedRole) =>
          allowedRole === context.role,
      )
    ) {
      throw new Error(
        "Vous n'avez pas les permissions nécessaires.",
      );
    }

    /**
     * Un administrateur ne peut pas retirer
     * le propriétaire.
     */
    if (
      membre.role ===
        Role.PROPRIETAIRE &&
      context.role !==
        Role.PROPRIETAIRE
    ) {
      throw new Error(
        "Seul le propriétaire peut retirer un propriétaire.",
      );
    }
  }

  /**
   * ----------------------------------------------------------
   * SUPPRESSION DU MEMBRE
   * ----------------------------------------------------------
   *
   * On ne supprime pas Utilisateur.
   */
  await prisma.membre.delete({
    where: {
      id: membreId,
    },
  });

  return {
    success: true,
    message:
      "Membre retiré du centre avec succès.",
  };
}