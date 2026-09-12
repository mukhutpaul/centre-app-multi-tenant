import {
  Role,
  RoleSysteme,
} from "@/generated/prisma/enums";

/**
 * ============================================================
 * PERMISSIONS DU SYSTÈME
 * ============================================================
 */

export const PERMISSIONS = {
  // ----------------------------------------------------------
  // CENTRES
  // ----------------------------------------------------------
  CENTRE_VOIR: "CENTRE_VOIR",
  CENTRE_CREER: "CENTRE_CREER",
  CENTRE_MODIFIER: "CENTRE_MODIFIER",
  CENTRE_DESACTIVER: "CENTRE_DESACTIVER",

  // ----------------------------------------------------------
  // APPRENANTS
  // ----------------------------------------------------------
  APPRENANT_VOIR: "APPRENANT_VOIR",
  APPRENANT_CREER: "APPRENANT_CREER",
  APPRENANT_MODIFIER: "APPRENANT_MODIFIER",

  // ----------------------------------------------------------
  // FORMATIONS
  // ----------------------------------------------------------
  FORMATION_VOIR: "FORMATION_VOIR",
  FORMATION_CREER: "FORMATION_CREER",
  FORMATION_MODIFIER: "FORMATION_MODIFIER",

  // ----------------------------------------------------------
  // SESSIONS
  // ----------------------------------------------------------
  SESSION_VOIR: "SESSION_VOIR",
  SESSION_CREER: "SESSION_CREER",
  SESSION_MODIFIER: "SESSION_MODIFIER",

  // ----------------------------------------------------------
  // PRÉSENCES
  // ----------------------------------------------------------
  PRESENCE_VOIR: "PRESENCE_VOIR",
  PRESENCE_MODIFIER: "PRESENCE_MODIFIER",

  // ----------------------------------------------------------
  // PAIEMENTS
  // ----------------------------------------------------------
  PAIEMENT_VOIR: "PAIEMENT_VOIR",
  PAIEMENT_CREER: "PAIEMENT_CREER",

  // ----------------------------------------------------------
  // ÉVALUATIONS
  // ----------------------------------------------------------
  EVALUATION_VOIR: "EVALUATION_VOIR",
  EVALUATION_CREER: "EVALUATION_CREER",

  // ----------------------------------------------------------
  // UTILISATEURS
  // ----------------------------------------------------------
  UTILISATEUR_GERER: "UTILISATEUR_GERER",
} as const;

/**
 * Type représentant une permission valide.
 */
export type Permission =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];


/**
 * ============================================================
 * SUPER ADMIN
 * ============================================================
 */

export function estSuperAdmin(
  roleSysteme: RoleSysteme,
): boolean {
  return (
    roleSysteme === RoleSysteme.SUPER_ADMIN
  );
}


/**
 * ============================================================
 * GESTION DES UTILISATEURS
 * ============================================================
 */

export function peutGererUtilisateurs(
  role: Role,
): boolean {
  return (
    role === Role.PROPRIETAIRE ||
    role === Role.ADMINISTRATEUR ||
    role === Role.RESPONSABLE
  );
}


/**
 * ============================================================
 * GESTION DES MEMBRES
 * ============================================================
 */

export function peutGererMembres(
  role: Role,
): boolean {
  return (
    role === Role.PROPRIETAIRE ||
    role === Role.ADMINISTRATEUR ||
    role === Role.RESPONSABLE
  );
}


/**
 * ============================================================
 * MODIFICATION DES RÔLES
 * ============================================================
 */

export function peutModifierRole(
  role: Role,
): boolean {
  return (
    role === Role.PROPRIETAIRE ||
    role === Role.ADMINISTRATEUR
  );
}


/**
 * ============================================================
 * ATTRIBUTION D'UN RÔLE
 * ============================================================
 */

export function peutAttribuerRole(
  roleActuel: Role,
  nouveauRole: Role,
): boolean {
  /**
   * Le propriétaire peut attribuer n'importe quel
   * rôle centre.
   */
  if (
    roleActuel === Role.PROPRIETAIRE
  ) {
    return true;
  }

  /**
   * L'administrateur peut attribuer n'importe quel
   * rôle sauf PROPRIETAIRE.
   */
  if (
    roleActuel === Role.ADMINISTRATEUR
  ) {
    return (
      nouveauRole !== Role.PROPRIETAIRE
    );
  }

  /**
   * Les autres rôles ne peuvent pas attribuer
   * de rôles.
   */
  return false;
}


/**
 * ============================================================
 * RÔLES DISPONIBLES
 * ============================================================
 */

export function rolesDisponiblesPour(
  roleActuel: Role,
): Role[] {
  const tousLesRoles =
    Object.values(Role) as Role[];

  /**
   * Le propriétaire peut attribuer tous les rôles.
   */
  if (
    roleActuel === Role.PROPRIETAIRE
  ) {
    return tousLesRoles;
  }

  /**
   * L'administrateur peut attribuer tous les rôles
   * sauf PROPRIETAIRE.
   */
  if (
    roleActuel === Role.ADMINISTRATEUR
  ) {
    return tousLesRoles.filter(
      (role) =>
        role !== Role.PROPRIETAIRE,
    );
  }

  /**
   * Les autres rôles ne peuvent attribuer
   * aucun rôle.
   */
  return [];
}