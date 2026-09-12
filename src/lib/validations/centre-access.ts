import { auth } from "@/auth";

import {
  Role,
  RoleSysteme,
  StatutCentre,
  StatutMembre,
} from "@/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

/**
 * ============================================================
 * CONTEXTE UTILISATEUR
 * ============================================================
 *
 * Le SUPER_ADMIN est un utilisateur global de la plateforme.
 * Il n'a donc pas besoin d'avoir un Membre.
 *
 * Les autres utilisateurs doivent obligatoirement être
 * rattachés à un centre via Membre.
 */
export async function getCurrentUserContext() {
  const session = await auth();

  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("UNAUTHENTICATED");
  }

  const utilisateur = await prisma.utilisateur.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      prenom: true,
      nom: true,
      roleSysteme: true,
      statut: true,
    },
  });

  if (!utilisateur) {
    throw new Error("Utilisateur introuvable.");
  }

  return utilisateur;
}

/**
 * ============================================================
 * VÉRIFIER SUPER ADMIN
 * ============================================================
 */
export async function isSuperAdmin() {
  const utilisateur = await getCurrentUserContext();

  return (
    utilisateur.roleSysteme === RoleSysteme.SUPER_ADMIN
  );
}

/**
 * ============================================================
 * CONTEXTE DU CENTRE COURANT
 * ============================================================
 *
 * IMPORTANT :
 *
 * - SUPER_ADMIN :
 *   peut fonctionner sans centre.
 *
 * - autres utilisateurs :
 *   doivent posséder un Membre ACTIF dans un centre
 *   ESSAI ou ACTIF.
 */
export async function getCurrentCentreContext() {
  const utilisateur = await getCurrentUserContext();

  /**
   * ----------------------------------------------------------
   * SUPER ADMIN
   * ----------------------------------------------------------
   */
  if (
    utilisateur.roleSysteme ===
    RoleSysteme.SUPER_ADMIN
  ) {
    return {
      userId: utilisateur.id,
      membreId: null,
      centreId: null,
      role: null,
      roleSysteme: utilisateur.roleSysteme,
      centre: null,
      utilisateur,
    };
  }

  /**
   * ----------------------------------------------------------
   * UTILISATEUR NORMAL
   * ----------------------------------------------------------
   */
  const membre = await prisma.membre.findFirst({
    where: {
      utilisateurId: utilisateur.id,

      statut: StatutMembre.ACTIF,

      centre: {
        statut: {
          in: [
            StatutCentre.ESSAI,
            StatutCentre.ACTIF,
          ],
        },
      },
    },

    orderBy: [
      {
        dateActivation: "desc",
      },
      {
        creeLe: "desc",
      },
    ],

    select: {
      id: true,
      centreId: true,
      role: true,
      statut: true,

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
      "Vous n'êtes rattaché à aucun centre actif.",
    );
  }

  return {
    userId: utilisateur.id,
    membreId: membre.id,
    centreId: membre.centreId,
    role: membre.role,
    roleSysteme: utilisateur.roleSysteme,
    centre: membre.centre,
    utilisateur,
  };
}

/**
 * ============================================================
 * ALIAS
 * ============================================================
 */
export async function getCurrentCentre() {
  return getCurrentCentreContext();
}

/**
 * ============================================================
 * VÉRIFICATION RÔLE CENTRE
 * ============================================================
 *
 * Cette fonction concerne uniquement les utilisateurs
 * rattachés à un centre.
 */
export async function requireRole(
  roles: Role[],
) {
  const context =
    await getCurrentCentreContext();

  /**
   * Un SUPER_ADMIN n'a pas besoin d'un rôle Membre.
   */
  if (
    context.roleSysteme ===
    RoleSysteme.SUPER_ADMIN
  ) {
    return context;
  }

  const autorise = roles.some(
    (role) => role === context.role,
  );

  if (!autorise) {
    throw new Error(
      "Vous n'avez pas les permissions nécessaires.",
    );
  }

  return context;
}

/**
 * ============================================================
 * SUPER ADMIN UNIQUEMENT
 * ============================================================
 */
export async function requireSuperAdmin() {
  const context =
    await getCurrentCentreContext();

  if (
    context.roleSysteme !==
    RoleSysteme.SUPER_ADMIN
  ) {
    throw new Error(
      "Accès réservé au Super Administrateur.",
    );
  }

  return context;
}

/**
 * ============================================================
 * RESPONSABLE DU CENTRE
 * ============================================================
 */
export async function requireCentreManager() {
  return requireRole([
    Role.PROPRIETAIRE,
    Role.ADMINISTRATEUR,
    Role.RESPONSABLE,
  ]);
}