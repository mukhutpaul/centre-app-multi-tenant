import "server-only";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  type Permission,
} from "@/lib/auth/permissions";
import {
  Role,
  RoleSysteme,
  StatutCentre,
  StatutMembre,
} from "@/generated/prisma/enums";

/**
 * Permissions accessibles sans appartenance
 * préalable à un centre.
 *
 * Ces permissions concernent l'administration
 * globale de la plateforme.
 */
const GLOBAL_PERMISSIONS = new Set<Permission>([
  PERMISSIONS.CENTRE_VOIR,
  PERMISSIONS.CENTRE_CREER,
  PERMISSIONS.CENTRE_MODIFIER,
  PERMISSIONS.CENTRE_DESACTIVER,
  PERMISSIONS.UTILISATEUR_GERER,
]);

/**
 * Utilisateur connecté.
 */
export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("NON_AUTHENTIFIE");
  }

  const utilisateur = await prisma.utilisateur.findUnique({
    where: {
      id: session.user.id,
    },
    include: {
      membres: {
        include: {
          centre: true,
        },
      },
    },
  });

  if (!utilisateur) {
    throw new Error("UTILISATEUR_INTROUVABLE");
  }

  return utilisateur;
}

/**
 * Vérifie qu'un utilisateur possède une permission.
 *
 * IMPORTANT :
 * - Le SUPER_ADMIN possède les permissions globales.
 * - Les utilisateurs classiques doivent être membres
 *   d'un centre actif.
 */
export async function requirePermission(
  permission: Permission,
) {
  const utilisateur = await getCurrentUser();

  /**
   * ==========================================================
   * SUPER ADMIN
   * ==========================================================
   *
   * Le Super Administrateur agit au niveau global.
   * Il n'a donc pas besoin d'être membre d'un centre.
   */
  if (
    utilisateur.roleSysteme === RoleSysteme.SUPER_ADMIN
  ) {
    if (!GLOBAL_PERMISSIONS.has(permission)) {
      throw new Error(
        "PERMISSION_REFUSEE",
      );
    }

    return utilisateur;
  }

  /**
   * ==========================================================
   * UTILISATEUR CLASSIQUE
   * ==========================================================
   */

  const membreActif = utilisateur.membres.find(
    (membre) =>
      membre.statut === StatutMembre.ACTIF &&
      (membre.centre.statut === StatutCentre.ESSAI ||
        membre.centre.statut === StatutCentre.ACTIF),
  );

  /**
   * Certaines permissions globales peuvent éventuellement
   * être utilisées sans appartenance à un centre.
   *
   * Pour l'instant, on conserve la logique prévue :
   * ces permissions sont réservées au SUPER_ADMIN.
   */
  if (GLOBAL_PERMISSIONS.has(permission)) {
    throw new Error(
      "PERMISSION_REFUSEE",
    );
  }

  /**
   * Une permission liée aux données d'un centre
   * nécessite une appartenance active.
   */
  if (!membreActif) {
    throw new Error(
      "ACCES_CENTRE_REFUSE",
    );
  }

  /**
   * ==========================================================
   * AUTORISATION PAR RÔLE
   * ==========================================================
   *
   * Ici, on vérifie que le rôle du membre permet
   * l'utilisation de la permission demandée.
   *
   * Les permissions détaillées doivent être définies
   * dans permissions.ts.
   */
  const role = membreActif.role;

  if (!rolePossedePermission(role, permission)) {
    throw new Error(
      "PERMISSION_REFUSEE",
    );
  }

  return utilisateur;
}

/**
 * Vérifie si un rôle possède une permission.
 *
 * Cette fonction centralise la correspondance
 * entre les rôles et les permissions.
 */
function rolePossedePermission(
  role: Role,
  permission: Permission,
): boolean {
  switch (permission) {
    /**
     * --------------------------------------------------------
     * UTILISATEURS
     * --------------------------------------------------------
     */
    case PERMISSIONS.UTILISATEUR_GERER:
      return [
        Role.PROPRIETAIRE,
        Role.ADMINISTRATEUR,
        Role.RESPONSABLE,
      ].includes(role);

    /**
     * --------------------------------------------------------
     * CENTRES
     * --------------------------------------------------------
     *
     * Ces permissions restent normalement réservées
     * au SUPER_ADMIN.
     */
    case PERMISSIONS.CENTRE_VOIR:
    case PERMISSIONS.CENTRE_CREER:
    case PERMISSIONS.CENTRE_MODIFIER:
    case PERMISSIONS.CENTRE_DESACTIVER:
      return false;

    /**
     * --------------------------------------------------------
     * AUTRES PERMISSIONS
     * --------------------------------------------------------
     *
     * Si tu ajoutes de nouvelles permissions dans
     * permissions.ts, ajoute ici leur règle.
     */
    default:
      return false;
  }
}

/**
 * Récupère le contexte du centre actif
 * de l'utilisateur connecté.
 *
 * Cette fonction est particulièrement utile
 * pour toutes les opérations multi-tenant.
 */
export async function getCurrentCentreContext() {
  const utilisateur = await getCurrentUser();

  /**
   * Le Super Administrateur travaille au niveau global
   * et n'est pas obligé d'avoir un centre.
   */
  if (
    utilisateur.roleSysteme === RoleSysteme.SUPER_ADMIN
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
   * Recherche d'une appartenance active
   * à un centre actif ou en période d'essai.
   */
  const membre = utilisateur.membres.find(
    (item) =>
      item.statut === StatutMembre.ACTIF &&
      (item.centre.statut === StatutCentre.ESSAI ||
        item.centre.statut === StatutCentre.ACTIF),
  );

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
 * Alias pratique.
 */
export async function getCurrentCentre() {
  return getCurrentCentreContext();
}

/**
 * Vérifie qu'un utilisateur possède l'un
 * des rôles demandés.
 *
 * IMPORTANT :
 * Le paramètre accepte Role[] complet.
 *
 * Exemple :
 * requireRole([
 *   Role.PROPRIETAIRE,
 *   Role.ADMINISTRATEUR,
 *   Role.RESPONSABLE,
 * ]);
 */
export async function requireRole(
  roles: Role[],
) {
  const context = await getCurrentCentreContext();

  /**
   * Le SUPER_ADMIN peut administrer la plateforme
   * sans appartenance à un centre.
   */
  if (
    context.roleSysteme === RoleSysteme.SUPER_ADMIN
  ) {
    return context;
  }

  /**
   * Sécurité supplémentaire.
   */
  if (!context.role) {
    throw new Error(
      "ROLE_UTILISATEUR_INTROUVABLE",
    );
  }

  /**
   * Vérification du rôle.
   */
  if (!roles.includes(context.role)) {
    throw new Error(
      "Vous n'avez pas les permissions nécessaires.",
    );
  }

  return context;
}

/**
 * Vérifie l'accès Super Administrateur.
 */
export async function requireSuperAdmin() {
  const context = await getCurrentCentreContext();

  if (
    context.roleSysteme !== RoleSysteme.SUPER_ADMIN
  ) {
    throw new Error(
      "Accès réservé au Super Administrateur.",
    );
  }

  return context;
}

/**
 * Vérifie l'accès à la gestion d'un centre.
 */
export async function requireCentreManager() {
  return requireRole([
    Role.PROPRIETAIRE,
    Role.ADMINISTRATEUR,
    Role.RESPONSABLE,
  ]);
}