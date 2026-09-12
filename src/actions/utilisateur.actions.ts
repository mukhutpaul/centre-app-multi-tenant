"use server";

import {
  Role,
  RoleSysteme,
  StatutMembre,
  StatutUtilisateur,
  StatutCentre,
} from "@/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

import {
  getCurrentCentreContext,
} from "@/lib/validations/centre-access";

import {
  utilisateurSchema,
} from "@/lib/validations/utilisateur.schema";

import {
  peutAttribuerRole,
  peutModifierRole,
} from "@/lib/auth/permissions";

import bcrypt from "bcryptjs";

/**
 * ============================================================
 * TYPE DE RETOUR
 * ============================================================
 */

type ActionResult = {
  success: boolean;
  message: string;
};

/**
 * ============================================================
 * ROLES AUTORISÉS À VOIR / GÉRER LES UTILISATEURS
 * ============================================================
 *
 * PROPRIETAIRE
 * ADMINISTRATEUR
 * RESPONSABLE
 *
 * Le RESPONSABLE peut éventuellement consulter les utilisateurs,
 * mais ne peut pas créer/modifier les comptes selon les règles
 * définies plus bas.
 *
 * ============================================================
 */

const ROLES_GESTION_UTILISATEURS: Role[] = [
  Role.PROPRIETAIRE,
  Role.ADMINISTRATEUR,
  Role.RESPONSABLE,
];

/**
 * ============================================================
 * ROLES AUTORISÉS À CRÉER / MODIFIER LES UTILISATEURS
 * ============================================================
 *
 * Le propriétaire est le responsable principal du centre.
 *
 * L'administrateur peut également gérer les utilisateurs,
 * mais ne peut jamais attribuer le rôle PROPRIETAIRE.
 *
 * ============================================================
 */

const ROLES_CREATION_UTILISATEUR: Role[] = [
  Role.PROPRIETAIRE,
  Role.ADMINISTRATEUR,
];

/**
 * ============================================================
 * UTILITAIRE
 * ============================================================
 */

function verifierCentreActif(
  centreId: string | null,
) {
  if (!centreId) {
    throw new Error(
      "Aucun centre actif n'est associé à votre compte.",
    );
  }

  return centreId;
}

/**
 * ============================================================
 * GET UTILISATEURS
 * ============================================================
 */

export async function getUtilisateurs() {
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
            avatarUrl: true,
            derniereConnexion: true,
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

      orderBy: {
        creeLe: "desc",
      },
    });
  }

  /**
   * ----------------------------------------------------------
   * CENTRE
   * ----------------------------------------------------------
   */

  const centreId =
    verifierCentreActif(
      context.centreId,
    );

  /**
   * ----------------------------------------------------------
   * PERMISSION
   * ----------------------------------------------------------
   */

  if (
    !context.role ||
    !ROLES_GESTION_UTILISATEURS.includes(
      context.role,
    )
  ) {
    throw new Error(
      "Vous n'avez pas les permissions nécessaires pour consulter les utilisateurs.",
    );
  }

  /**
   * ----------------------------------------------------------
   * UTILISATEURS DU CENTRE COURANT
   * ----------------------------------------------------------
   */

  return prisma.membre.findMany({
    where: {
      centreId,
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
          avatarUrl: true,
          derniereConnexion: true,
          creeLe: true,
        },
      },
    },

    orderBy: {
      creeLe: "desc",
    },
  });
}

/**
 * ============================================================
 * GET UTILISATEUR PAR ID
 * ============================================================
 */

export async function getUtilisateurById(
  utilisateurId: string,
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
    const utilisateur =
      await prisma.utilisateur.findUnique({
        where: {
          id: utilisateurId,
        },

        include: {
          membres: {
            include: {
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
          },
        },
      });

    if (!utilisateur) {
      throw new Error(
        "Utilisateur introuvable.",
      );
    }

    return utilisateur;
  }

  /**
   * ----------------------------------------------------------
   * CENTRE
   * ----------------------------------------------------------
   */

  const centreId =
    verifierCentreActif(
      context.centreId,
    );

  /**
   * ----------------------------------------------------------
   * PERMISSION
   * ----------------------------------------------------------
   */

  if (
    !context.role ||
    !ROLES_GESTION_UTILISATEURS.includes(
      context.role,
    )
  ) {
    throw new Error(
      "Vous n'avez pas les permissions nécessaires.",
    );
  }

  /**
   * ----------------------------------------------------------
   * RECHERCHE DANS LE CENTRE COURANT
   * ----------------------------------------------------------
   */

  const membre =
    await prisma.membre.findUnique({
      where: {
        utilisateurId_centreId: {
          utilisateurId,
          centreId,
        },
      },

      include: {
        utilisateur: true,
      },
    });

  if (!membre) {
    throw new Error(
      "Utilisateur introuvable dans votre centre.",
    );
  }

  return membre;
}

/**
 * ============================================================
 * CRÉER UN UTILISATEUR DANS LE CENTRE COURANT
 * ============================================================
 *
 * AUTORISÉS :
 *
 * PROPRIETAIRE
 * ADMINISTRATEUR
 *
 * Le rôle est envoyé par le formulaire.
 *
 * Le serveur vérifie ensuite si l'utilisateur connecté
 * possède réellement le droit d'attribuer ce rôle.
 *
 * IMPORTANT :
 *
 * context.role vient de Membre.role côté serveur.
 * Il ne vient PAS du formulaire.
 *
 * ============================================================
 */

export async function createUtilisateur(
  data: unknown,
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
    throw new Error(
      "Le Super Administrateur doit créer le premier utilisateur depuis la gestion des centres.",
    );
  }

  /**
   * ----------------------------------------------------------
   * CENTRE COURANT
   * ----------------------------------------------------------
   */

  const centreId =
    verifierCentreActif(
      context.centreId,
    );

  /**
   * ----------------------------------------------------------
   * UTILISATEUR CONNECTÉ
   * ----------------------------------------------------------
   *
   * Le propriétaire est explicitement autorisé.
   */

  if (
    context.role !== Role.PROPRIETAIRE &&
    context.role !== Role.ADMINISTRATEUR
  ) {
    throw new Error(
      "Seul le propriétaire ou l'administrateur du centre peut créer un utilisateur.",
    );
  }

  /**
   * ----------------------------------------------------------
   * VALIDATION
   * ----------------------------------------------------------
   */

  const parsed =
    utilisateurSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ??
        "Données invalides.",
    );
  }

  const {
    email,
    prenom,
    nom,
    telephone,
    motDePasse,
    role,
  } = parsed.data;

  /**
   * ----------------------------------------------------------
   * NORMALISATION EMAIL
   * ----------------------------------------------------------
   */

  const emailNormalise =
    email.trim().toLowerCase();

  /**
   * ----------------------------------------------------------
   * VÉRIFICATION DE L'EMAIL
   * ----------------------------------------------------------
   */

  const existingUser =
    await prisma.utilisateur.findUnique({
      where: {
        email: emailNormalise,
      },

      select: {
        id: true,
      },
    });

  if (existingUser) {
    const existingMembership =
      await prisma.membre.findUnique({
        where: {
          utilisateurId_centreId: {
            utilisateurId:
              existingUser.id,

            centreId,
          },
        },

        select: {
          id: true,
        },
      });

    if (existingMembership) {
      throw new Error(
        "Cet utilisateur existe déjà dans votre centre.",
      );
    }

    throw new Error(
      "Cette adresse email existe déjà sur la plateforme.",
    );
  }

  /**
   * ----------------------------------------------------------
   * VÉRIFICATION DU RÔLE
   * ----------------------------------------------------------
   *
   * C'est ici que le propriétaire doit passer.
   *
   * Exemple :
   *
   * context.role = PROPRIETAIRE
   * role         = FORMATEUR
   *
   * => autorisé
   *
   * context.role = ADMINISTRATEUR
   * role         = PROPRIETAIRE
   *
   * => refusé
   *
   * ==========================================================
   */

  if (!context.role) {
    throw new Error(
      "Impossible de déterminer votre rôle dans ce centre.",
    );
  }

  if (
    !peutAttribuerRole(
      context.role,
      role,
    )
  ) {
    throw new Error(
      `Le rôle « ${role} » ne peut pas être attribué par votre rôle actuel.`,
    );
  }

  /**
   * ----------------------------------------------------------
   * PROPRIÉTAIRE UNIQUE
   * ----------------------------------------------------------
   *
   * Un centre ne peut avoir qu'un seul propriétaire.
   */

  if (
    role === Role.PROPRIETAIRE
  ) {
    const proprietaire =
      await prisma.membre.findFirst({
        where: {
          centreId,
          role: Role.PROPRIETAIRE,
        },

        select: {
          id: true,
        },
      });

    if (proprietaire) {
      throw new Error(
        "Ce centre possède déjà un propriétaire. Le rôle PROPRIETAIRE ne peut pas être attribué à un deuxième utilisateur.",
      );
    }
  }

  /**
   * ----------------------------------------------------------
   * MOT DE PASSE
   * ----------------------------------------------------------
   */

  const hash = motDePasse
    ? await bcrypt.hash(
        motDePasse,
        12,
      )
    : null;

  /**
   * ----------------------------------------------------------
   * TRANSACTION
   * ----------------------------------------------------------
   */

  const utilisateur =
    await prisma.$transaction(
      async (tx) => {
        const nouvelUtilisateur =
          await tx.utilisateur.create({
            data: {
              email:
                emailNormalise,

              prenom:
                prenom?.trim() ||
                null,

              nom:
                nom?.trim() ||
                null,

              telephone:
                telephone?.trim() ||
                null,

              motDePasse:
                hash,

              roleSysteme:
                RoleSysteme.UTILISATEUR,

              statut:
                StatutUtilisateur.ACTIF,
            },
          });

        await tx.membre.create({
          data: {
            utilisateurId:
              nouvelUtilisateur.id,

            centreId,

            /**
             * IMPORTANT :
             * le rôle choisi dans le formulaire
             * est réellement enregistré ici.
             */
            role,

            statut:
              StatutMembre.ACTIF,

            dateInvitation:
              new Date(),

            dateActivation:
              new Date(),
          },
        });

        return nouvelUtilisateur;
      },
    );

  /**
   * ----------------------------------------------------------
   * RETOUR
   * ----------------------------------------------------------
   */

  return {
    success: true,

    message:
      "Utilisateur créé et rattaché au centre avec succès.",

    utilisateur: {
      id:
        utilisateur.id,

      email:
        utilisateur.email,

      prenom:
        utilisateur.prenom,

      nom:
        utilisateur.nom,

      telephone:
        utilisateur.telephone,

      statut:
        utilisateur.statut,

      roleSysteme:
        utilisateur.roleSysteme,

      role,
    },
  };
}

/**
 * ============================================================
 * CRÉER LE PREMIER UTILISATEUR DU CENTRE
 * ============================================================
 *
 * SEUL LE SUPER_ADMIN peut effectuer cette opération.
 *
 * Le rôle envoyé par le client est ignoré.
 *
 * Le serveur impose :
 *
 * roleSysteme = UTILISATEUR
 * Membre.role = PROPRIETAIRE
 * statut = ACTIF
 *
 * ============================================================
 */

export async function createPremierUtilisateur(
  centreId: string,
  data: unknown,
) {
  const context =
    await getCurrentCentreContext();

  /**
   * ----------------------------------------------------------
   * SUPER ADMIN UNIQUEMENT
   * ----------------------------------------------------------
   */

  if (
    context.roleSysteme !==
    RoleSysteme.SUPER_ADMIN
  ) {
    throw new Error(
      "Seul le Super Administrateur peut créer le premier utilisateur d'un centre.",
    );
  }

  /**
   * ----------------------------------------------------------
   * CENTRE
   * ----------------------------------------------------------
   */

  if (!centreId?.trim()) {
    throw new Error(
      "Le centre est obligatoire.",
    );
  }

  const centre =
    await prisma.centreFormation.findUnique({
      where: {
        id: centreId,
      },

      select: {
        id: true,
        nom: true,
        code: true,
        statut: true,
      },
    });

  if (!centre) {
    throw new Error(
      "Centre introuvable.",
    );
  }

  /**
   * ----------------------------------------------------------
   * CENTRE RÉSILIÉ
   * ----------------------------------------------------------
   */

  if (
    centre.statut ===
    StatutCentre.RESILIE
  ) {
    throw new Error(
      "Impossible d'ajouter un utilisateur à un centre résilié.",
    );
  }

  /**
   * ----------------------------------------------------------
   * PROPRIÉTAIRE EXISTANT
   * ----------------------------------------------------------
   */

  const proprietaire =
    await prisma.membre.findFirst({
      where: {
        centreId,
        role:
          Role.PROPRIETAIRE,
      },

      select: {
        id: true,
      },
    });

  if (proprietaire) {
    throw new Error(
      "Ce centre possède déjà un propriétaire.",
    );
  }

  /**
   * ----------------------------------------------------------
   * VALIDATION
   * ----------------------------------------------------------
   */

  const parsed =
    utilisateurSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ??
        "Données invalides.",
    );
  }

  const {
    email,
    prenom,
    nom,
    telephone,
    motDePasse,
  } = parsed.data;

  const emailNormalise =
    email.trim().toLowerCase();

  /**
   * ----------------------------------------------------------
   * EMAIL UNIQUE
   * ----------------------------------------------------------
   */

  const existingUser =
    await prisma.utilisateur.findUnique({
      where: {
        email: emailNormalise,
      },

      select: {
        id: true,
      },
    });

  if (existingUser) {
    throw new Error(
      "Cette adresse email est déjà utilisée sur la plateforme.",
    );
  }

  /**
   * ----------------------------------------------------------
   * MOT DE PASSE
   * ----------------------------------------------------------
   */

  const hash = motDePasse
    ? await bcrypt.hash(
        motDePasse,
        12,
      )
    : null;

  /**
   * ----------------------------------------------------------
   * TRANSACTION
   * ----------------------------------------------------------
   */

  const result =
    await prisma.$transaction(
      async (tx) => {
        const utilisateur =
          await tx.utilisateur.create({
            data: {
              email:
                emailNormalise,

              prenom:
                prenom?.trim() ||
                null,

              nom:
                nom?.trim() ||
                null,

              telephone:
                telephone?.trim() ||
                null,

              motDePasse:
                hash,

              roleSysteme:
                RoleSysteme.UTILISATEUR,

              statut:
                StatutUtilisateur.ACTIF,
            },
          });

        const membre =
          await tx.membre.create({
            data: {
              utilisateurId:
                utilisateur.id,

              centreId:
                centre.id,

              /**
               * IMPORTANT :
               * premier utilisateur = propriétaire
               */
              role:
                Role.PROPRIETAIRE,

              statut:
                StatutMembre.ACTIF,

              dateInvitation:
                new Date(),

              dateActivation:
                new Date(),
            },
          });

        return {
          utilisateur,
          membre,
        };
      },
    );

  return {
    success: true,

    message:
      `Le propriétaire du centre « ${centre.nom} » a été créé avec succès.`,

    utilisateur: {
      id:
        result.utilisateur.id,

      email:
        result.utilisateur.email,

      prenom:
        result.utilisateur.prenom,

      nom:
        result.utilisateur.nom,

      telephone:
        result.utilisateur.telephone,

      statut:
        result.utilisateur.statut,

      roleSysteme:
        result.utilisateur.roleSysteme,
    },

    membre: {
      id:
        result.membre.id,

      role:
        result.membre.role,

      statut:
        result.membre.statut,

      centreId:
        result.membre.centreId,
    },
  };
}

/**
 * ============================================================
 * MODIFIER UN UTILISATEUR
 * ============================================================
 *
 * Le propriétaire peut :
 *
 * - modifier les informations personnelles
 * - modifier le rôle
 *
 * L'administrateur peut :
 *
 * - modifier les informations personnelles
 * - modifier les rôles autorisés
 * - MAIS jamais attribuer PROPRIETAIRE
 *
 * IMPORTANT :
 *
 * Le rôle est stocké dans Membre.role.
 *
 * ============================================================
 */

export async function updateUtilisateur(
  utilisateurId: string,
  data: unknown,
) {
  const context =
    await getCurrentCentreContext();

  /**
   * ==========================================================
   * SUPER ADMIN
   * ==========================================================
   *
   * Le SUPER_ADMIN modifie uniquement les informations
   * globales de l'utilisateur ici.
   *
   * Le rôle de centre reste dans Membre.
   */

  if (
    context.roleSysteme ===
    RoleSysteme.SUPER_ADMIN
  ) {
    const utilisateur =
      await prisma.utilisateur.findUnique({
        where: {
          id: utilisateurId,
        },
      });

    if (!utilisateur) {
      throw new Error(
        "Utilisateur introuvable.",
      );
    }

    const parsed =
      utilisateurSchema.safeParse(data);

    if (!parsed.success) {
      throw new Error(
        parsed.error.issues[0]?.message ??
          "Données invalides.",
      );
    }

    const {
      email,
      prenom,
      nom,
      telephone,
      motDePasse,
    } = parsed.data;

    const emailNormalise =
      email.trim().toLowerCase();

    const emailOwner =
      await prisma.utilisateur.findUnique({
        where: {
          email: emailNormalise,
        },

        select: {
          id: true,
        },
      });

    if (
      emailOwner &&
      emailOwner.id !== utilisateurId
    ) {
      throw new Error(
        "Cette adresse email est déjà utilisée.",
      );
    }

    const dataUpdate: {
      email: string;
      prenom: string | null;
      nom: string | null;
      telephone: string | null;
      motDePasse?: string | null;
    } = {
      email:
        emailNormalise,

      prenom:
        prenom?.trim() ||
        null,

      nom:
        nom?.trim() ||
        null,

      telephone:
        telephone?.trim() ||
        null,
    };

    if (motDePasse) {
      dataUpdate.motDePasse =
        await bcrypt.hash(
          motDePasse,
          12,
        );
    }

    const updated =
      await prisma.utilisateur.update({
        where: {
          id: utilisateurId,
        },

        data:
          dataUpdate,

        select: {
          id: true,
          email: true,
          prenom: true,
          nom: true,
          telephone: true,
          statut: true,
          roleSysteme: true,
        },
      });

    return {
      success: true,

      message:
        "Utilisateur modifié avec succès.",

      utilisateur:
        updated,
    };
  }

  /**
   * ==========================================================
   * CENTRE COURANT
   * ==========================================================
   */

  const centreId =
    verifierCentreActif(
      context.centreId,
    );

  /**
   * ==========================================================
   * PERMISSION
   * ==========================================================
   *
   * Le PROPRIETAIRE est explicitement autorisé.
   */

  if (
    context.role !== Role.PROPRIETAIRE &&
    context.role !== Role.ADMINISTRATEUR
  ) {
    throw new Error(
      "Seul le propriétaire ou l'administrateur du centre peut modifier un utilisateur.",
    );
  }

  /**
   * ==========================================================
   * MEMBRE
   * ==========================================================
   */

  const membership =
    await prisma.membre.findUnique({
      where: {
        utilisateurId_centreId: {
          utilisateurId,
          centreId,
        },
      },
    });

  if (!membership) {
    throw new Error(
      "Cet utilisateur n'appartient pas à votre centre.",
    );
  }

  /**
   * ==========================================================
   * VALIDATION
   * ==========================================================
   */

  const parsed =
    utilisateurSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ??
        "Données invalides.",
    );
  }

  const {
    email,
    prenom,
    nom,
    telephone,
    motDePasse,
    role,
  } = parsed.data;

  /**
   * ==========================================================
   * PROTECTION DE SON PROPRE RÔLE
   * ==========================================================
   *
   * Un utilisateur ne doit pas pouvoir se retirer lui-même
   * ses privilèges.
   */

  if (
    utilisateurId === context.userId &&
    membership.role !== role
  ) {
    throw new Error(
      "Vous ne pouvez pas modifier votre propre rôle.",
    );
  }

  /**
   * ==========================================================
   * PROPRIÉTAIRE
   * ==========================================================
   *
   * Le propriétaire peut attribuer tous les rôles autorisés.
   */

  if (!context.role) {
    throw new Error(
      "Impossible de déterminer votre rôle dans ce centre.",
    );
  }

  /**
   * ==========================================================
   * MODIFICATION DU RÔLE
   * ==========================================================
   */

  if (
    membership.role !== role
  ) {
    /**
     * Le rôle actuel de l'acteur doit permettre
     * la modification des rôles.
     */

    if (
      !peutModifierRole(
        context.role,
      )
    ) {
      throw new Error(
        "Vous n'avez pas les permissions nécessaires pour modifier le rôle de cet utilisateur.",
      );
    }

    /**
     * Vérification précise du rôle cible.
     */

    if (
      !peutAttribuerRole(
        context.role,
        role,
      )
    ) {
      throw new Error(
        `Vous n'êtes pas autorisé à attribuer le rôle « ${role} ».`,
      );
    }
  }

  /**
   * ==========================================================
   * PROTECTION DU PROPRIÉTAIRE
   * ==========================================================
   *
   * Un administrateur ne peut pas modifier le rôle
   * d'un propriétaire.
   */

  if (
    membership.role ===
      Role.PROPRIETAIRE &&
    context.role !==
      Role.PROPRIETAIRE &&
    membership.role !== role
  ) {
    throw new Error(
      "Seul le propriétaire peut modifier le rôle d'un propriétaire.",
    );
  }

  /**
   * ==========================================================
   * PROPRIÉTAIRE UNIQUE
   * ==========================================================
   */

  if (
    role === Role.PROPRIETAIRE &&
    membership.role !==
      Role.PROPRIETAIRE
  ) {
    const proprietaire =
      await prisma.membre.findFirst({
        where: {
          centreId,

          role:
            Role.PROPRIETAIRE,

          id: {
            not:
              membership.id,
          },
        },

        select: {
          id: true,
        },
      });

    if (proprietaire) {
      throw new Error(
        "Ce centre possède déjà un propriétaire.",
      );
    }
  }

  /**
   * ==========================================================
   * EMAIL
   * ==========================================================
   */

  const emailNormalise =
    email.trim().toLowerCase();

  const emailOwner =
    await prisma.utilisateur.findUnique({
      where: {
        email:
          emailNormalise,
      },

      select: {
        id: true,
      },
    });

  if (
    emailOwner &&
    emailOwner.id !==
      utilisateurId
  ) {
    throw new Error(
      "Cette adresse email est déjà utilisée.",
    );
  }

  /**
   * ==========================================================
   * DONNÉES UTILISATEUR
   * ==========================================================
   */

  const dataUpdate: {
    email: string;
    prenom: string | null;
    nom: string | null;
    telephone: string | null;
    motDePasse?: string | null;
  } = {
    email:
      emailNormalise,

    prenom:
      prenom?.trim() ||
      null,

    nom:
      nom?.trim() ||
      null,

    telephone:
      telephone?.trim() ||
      null,
  };

  /**
   * Le mot de passe est modifié uniquement
   * lorsqu'un nouveau mot de passe est envoyé.
   */

  if (motDePasse) {
    dataUpdate.motDePasse =
      await bcrypt.hash(
        motDePasse,
        12,
      );
  }

  /**
   * ==========================================================
   * TRANSACTION
   * ==========================================================
   */

  const result =
    await prisma.$transaction(
      async (tx) => {
        const utilisateur =
          await tx.utilisateur.update({
            where: {
              id:
                utilisateurId,
            },

            data:
              dataUpdate,

            select: {
              id: true,
              email: true,
              prenom: true,
              nom: true,
              telephone: true,
              statut: true,
              roleSysteme: true,
            },
          });

        const membre =
          await tx.membre.update({
            where: {
              id:
                membership.id,
            },

            data: {
              role,
            },

            select: {
              id: true,
              role: true,
              statut: true,
              centreId: true,
            },
          });

        return {
          utilisateur,
          membre,
        };
      },
    );

  return {
    success: true,

    message:
      membership.role === role
        ? "Utilisateur modifié avec succès."
        : "Utilisateur et rôle modifiés avec succès.",

    utilisateur:
      result.utilisateur,

    membre:
      result.membre,
  };
}

/**
 * ============================================================
 * MODIFIER LE STATUT UTILISATEUR
 * ============================================================
 */

export async function updateStatutUtilisateur(
  utilisateurId: string,
  statut: StatutUtilisateur,
): Promise<ActionResult> {
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
    if (
      utilisateurId ===
      context.userId
    ) {
      throw new Error(
        "Vous ne pouvez pas modifier le statut de votre propre compte.",
      );
    }

    const utilisateur =
      await prisma.utilisateur.findUnique({
        where: {
          id: utilisateurId,
        },
      });

    if (!utilisateur) {
      throw new Error(
        "Utilisateur introuvable.",
      );
    }

    await prisma.utilisateur.update({
      where: {
        id: utilisateurId,
      },

      data: {
        statut,
      },
    });

    return {
      success: true,

      message:
        "Statut utilisateur mis à jour.",
    };
  }

  /**
   * ----------------------------------------------------------
   * CENTRE
   * ----------------------------------------------------------
   */

  const centreId =
    verifierCentreActif(
      context.centreId,
    );

  /**
   * ----------------------------------------------------------
   * PERMISSION
   * ----------------------------------------------------------
   */

  if (
    context.role !==
      Role.PROPRIETAIRE &&
    context.role !==
      Role.ADMINISTRATEUR
  ) {
    throw new Error(
      "Seul le propriétaire ou l'administrateur peut modifier le statut d'un utilisateur.",
    );
  }

  /**
   * ----------------------------------------------------------
   * PROTECTION COMPTE PERSONNEL
   * ----------------------------------------------------------
   */

  if (
    utilisateurId ===
    context.userId
  ) {
    throw new Error(
      "Vous ne pouvez pas modifier le statut de votre propre compte.",
    );
  }

  /**
   * ----------------------------------------------------------
   * MEMBRE
   * ----------------------------------------------------------
   */

  const membre =
    await prisma.membre.findUnique({
      where: {
        utilisateurId_centreId: {
          utilisateurId,
          centreId,
        },
      },
    });

  if (!membre) {
    throw new Error(
      "Utilisateur introuvable dans votre centre.",
    );
  }

  /**
   * ----------------------------------------------------------
   * PROTECTION PROPRIÉTAIRE
   * ----------------------------------------------------------
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

  await prisma.utilisateur.update({
    where: {
      id: utilisateurId,
    },

    data: {
      statut,
    },
  });

  return {
    success: true,

    message:
      "Statut utilisateur mis à jour.",
  };
}

/**
 * ============================================================
 * SUPPRIMER / RETIRER UTILISATEUR
 * ============================================================
 */

export async function deleteUtilisateur(
  utilisateurId: string,
): Promise<ActionResult> {
  const context =
    await getCurrentCentreContext();

  /**
   * ----------------------------------------------------------
   * PROTECTION DE SON PROPRE COMPTE
   * ----------------------------------------------------------
   */

  if (
    utilisateurId ===
    context.userId
  ) {
    throw new Error(
      "Vous ne pouvez pas supprimer votre propre compte.",
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
    const utilisateur =
      await prisma.utilisateur.findUnique({
        where: {
          id: utilisateurId,
        },
      });

    if (!utilisateur) {
      throw new Error(
        "Utilisateur introuvable.",
      );
    }

    await prisma.utilisateur.delete({
      where: {
        id: utilisateurId,
      },
    });

    return {
      success: true,

      message:
        "Utilisateur supprimé de la plateforme.",
    };
  }

  /**
   * ----------------------------------------------------------
   * CENTRE
   * ----------------------------------------------------------
   */

  const centreId =
    verifierCentreActif(
      context.centreId,
    );

  /**
   * ----------------------------------------------------------
   * PERMISSION
   * ----------------------------------------------------------
   */

  if (
    context.role !==
      Role.PROPRIETAIRE &&
    context.role !==
      Role.ADMINISTRATEUR
  ) {
    throw new Error(
      "Seul le propriétaire ou l'administrateur peut retirer un utilisateur.",
    );
  }

  /**
   * ----------------------------------------------------------
   * MEMBRE
   * ----------------------------------------------------------
   */

  const membre =
    await prisma.membre.findUnique({
      where: {
        utilisateurId_centreId: {
          utilisateurId,
          centreId,
        },
      },
    });

  if (!membre) {
    throw new Error(
      "Utilisateur introuvable dans votre centre.",
    );
  }

  /**
   * ----------------------------------------------------------
   * PROTECTION DU PROPRIÉTAIRE
   * ----------------------------------------------------------
   *
   * Même si l'administrateur peut gérer les utilisateurs,
   * il ne peut pas retirer le propriétaire.
   */

  if (
    membre.role ===
      Role.PROPRIETAIRE &&
    context.role !==
      Role.PROPRIETAIRE
  ) {
    throw new Error(
      "Seul le propriétaire peut retirer un propriétaire du centre.",
    );
  }

  /**
   * ----------------------------------------------------------
   * TRANSACTION
   * ----------------------------------------------------------
   */

  await prisma.$transaction(
    async (tx) => {
      /**
       * Retirer le membre du centre.
       */
      await tx.membre.delete({
        where: {
          id:
            membre.id,
        },
      });

      /**
       * Vérifier si l'utilisateur appartient
       * encore à d'autres centres.
       */
      const autresMembres =
        await tx.membre.count({
          where: {
            utilisateurId,
          },
        });

      /**
       * Si aucun autre rattachement,
       * supprimer également le compte global.
       */
      if (
        autresMembres === 0
      ) {
        await tx.utilisateur.delete({
          where: {
            id: utilisateurId,
          },
        });
      }
    },
  );

  return {
    success: true,

    message:
      "Utilisateur retiré du centre avec succès.",
  };
}

