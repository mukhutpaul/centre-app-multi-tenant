
"use server";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

import {
  Role,
  RoleSysteme,
  StatutFormateur,
  StatutMembre,
  StatutUtilisateur,
} from "@/generated/prisma/enums";

import {
  getCurrentCentreContext,
  requireCentreManager,
} from "@/lib/validations/centre-access";

import {
  formateurSchema,
  type FormateurInput,
} from "@/lib/validations/formateur.schema";

/* ============================================================
   CONSTANTES
============================================================ */

const FORMATEURS_PAGE_SIZE = 10;

/* ============================================================
   OUTILS
============================================================ */

function normaliserValeur(value?: string) {
  const resultat = value?.trim();

  return resultat ? resultat : null;
}

/**
 * Génère un mot de passe temporaire.
 *
 * Exemple :
 * Frm-X7kP92Qa
 */
function genererMotDePasseTemporaire() {
  const caracteres =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

  let resultat = "Frm-";

  for (let i = 0; i < 8; i++) {
    const index = Math.floor(
      Math.random() * caracteres.length,
    );

    resultat += caracteres[index];
  }

  return resultat;
}

/* ============================================================
   LISTE DES FORMATEURS
   AVEC PAGINATION
============================================================ */

export async function getFormateurs(params?: {
  search?: string;
  statut?: StatutFormateur | "TOUS";
  page?: number;
}) {
  const context = await getCurrentCentreContext();

  const search = params?.search?.trim() ?? "";

  const statut =
    params?.statut ?? "TOUS";

  const page =
    Math.max(
      1,
      Number(params?.page ?? 1),
    ) || 1;

  const where: any = {};

  /**
   * ----------------------------------------------------------
   * CENTRE
   * ----------------------------------------------------------
   */

  if (
    context.roleSysteme !==
    RoleSysteme.SUPER_ADMIN
  ) {
    if (!context.centreId) {
      throw new Error(
        "Centre introuvable.",
      );
    }

    where.centreId = context.centreId;
  }

  /**
   * ----------------------------------------------------------
   * RECHERCHE
   * ----------------------------------------------------------
   */

  if (search) {
    where.OR = [
      {
        prenom: {
          contains: search,
        },
      },
      {
        nom: {
          contains: search,
        },
      },
      {
        email: {
          contains: search,
        },
      },
      {
        telephone: {
          contains: search,
        },
      },
      {
        specialite: {
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
    statut &&
    statut !== "TOUS"
  ) {
    where.statut = statut;
  }

  /**
   * ----------------------------------------------------------
   * TOTAL
   * ----------------------------------------------------------
   */

  const total =
    await prisma.formateur.count({
      where,
    });

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
          FORMATEURS_PAGE_SIZE,
      ),
    );

  /**
   * Éviter une page supérieure au nombre
   * réel de pages.
   */
  const pageFinale =
    Math.min(
      page,
      totalPages,
    );

  const skip =
    (pageFinale - 1) *
    FORMATEURS_PAGE_SIZE;

  /**
   * ----------------------------------------------------------
   * FORMATEURS
   * ----------------------------------------------------------
   */

  const formateurs =
    await prisma.formateur.findMany({
      where,

      orderBy: [
        {
          nom: "asc",
        },
        {
          prenom: "asc",
        },
      ],

      skip,

      take: FORMATEURS_PAGE_SIZE,

      select: {
        id: true,
        centreId: true,
        utilisateurId: true,

        prenom: true,
        nom: true,

        email: true,
        telephone: true,

        specialite: true,
        biographie: true,

        statut: true,

        creeLe: true,
        modifieLe: true,

        utilisateur: {
          select: {
            id: true,
            email: true,
            prenom: true,
            nom: true,
            telephone: true,
            statut: true,
          },
        },

        _count: {
          select: {
            sessions: true,
            modules: true,
            evaluations: true,
          },
        },
      },
    });

  return {
    formateurs,

    total,

    page: pageFinale,

    totalPages,

    search,

    statut,
  };
}

/* ============================================================
   CRÉATION D'UN FORMATEUR
============================================================ */

export async function createFormateur(
  input: FormateurInput,
) {
  const context =
    await requireCentreManager();

  if (!context.centreId) {
    throw new Error(
      "Centre introuvable.",
    );
  }

  const validation =
    formateurSchema.safeParse(
      input,
    );

  if (!validation.success) {
    throw new Error(
      validation.error.issues[0]
        ?.message ??
        "Les données du formateur sont invalides.",
    );
  }

  const data = validation.data;

  const email =
    normaliserValeur(data.email);

  /**
   * Si un email est fourni, vérifier
   * qu'il n'est pas déjà utilisé comme
   * email de compte utilisateur.
   *
   * Le champ email du formateur n'est
   * pas forcément celui du compte.
   */
  if (email) {
    const utilisateurExistant =
      await prisma.utilisateur.findUnique({
        where: {
          email: email.toLowerCase(),
        },
      });

    /**
     * On ne bloque pas la création du
     * formateur ici car l'email professionnel
     * peut être différent du compte utilisateur.
     *
     * Le contrôle strict sera fait lors de
     * la création du compte.
     */
    void utilisateurExistant;
  }

  const formateur =
    await prisma.formateur.create({
      data: {
        centreId:
          context.centreId,

        prenom: data.prenom,
        nom: data.nom,

        email,

        telephone:
          normaliserValeur(
            data.telephone,
          ),

        specialite:
          normaliserValeur(
            data.specialite,
          ),

        biographie:
          normaliserValeur(
            data.biographie,
          ),

        statut: data.statut,
      },

      select: {
        id: true,

        centreId: true,

        utilisateurId: true,

        prenom: true,
        nom: true,

        email: true,
        telephone: true,

        specialite: true,
        biographie: true,

        statut: true,
      },
    });

  return {
    success: true,

    message:
      "Le formateur a été créé avec succès.",

    formateur,
  };
}

/* ============================================================
   MODIFICATION
============================================================ */

export async function updateFormateur(
  id: string,
  input: FormateurInput,
) {
  const context =
    await requireCentreManager();

  if (!context.centreId) {
    throw new Error(
      "Centre introuvable.",
    );
  }

  const validation =
    formateurSchema.safeParse(
      input,
    );

  if (!validation.success) {
    throw new Error(
      validation.error.issues[0]
        ?.message ??
        "Les données du formateur sont invalides.",
    );
  }

  const data = validation.data;

  const formateur =
    await prisma.formateur.findFirst({
      where: {
        id,
        centreId:
          context.centreId,
      },
    });

  if (!formateur) {
    throw new Error(
      "Formateur introuvable.",
    );
  }

  const updated =
    await prisma.formateur.update({
      where: {
        id: formateur.id,
      },

      data: {
        prenom: data.prenom,

        nom: data.nom,

        email:
          normaliserValeur(
            data.email,
          ),

        telephone:
          normaliserValeur(
            data.telephone,
          ),

        specialite:
          normaliserValeur(
            data.specialite,
          ),

        biographie:
          normaliserValeur(
            data.biographie,
          ),

        statut: data.statut,
      },

      select: {
        id: true,

        centreId: true,

        utilisateurId: true,

        prenom: true,
        nom: true,

        email: true,
        telephone: true,

        specialite: true,
        biographie: true,

        statut: true,
      },
    });

  return {
    success: true,

    message:
      "Le formateur a été modifié avec succès.",

    formateur: updated,
  };
}

/* ============================================================
   CHANGEMENT DE STATUT
============================================================ */

export async function updateFormateurStatut(
  id: string,
  statut: StatutFormateur,
) {
  const context =
    await requireCentreManager();

  if (!context.centreId) {
    throw new Error(
      "Centre introuvable.",
    );
  }

  const formateur =
    await prisma.formateur.findFirst({
      where: {
        id,
        centreId:
          context.centreId,
      },
    });

  if (!formateur) {
    throw new Error(
      "Formateur introuvable.",
    );
  }

  await prisma.formateur.update({
    where: {
      id: formateur.id,
    },

    data: {
      statut,
    },
  });

  return {
    success: true,

    message:
      `Le statut du formateur a été changé en « ${statut} ».`,
  };
}

/* ============================================================
   CRÉER LE COMPTE UTILISATEUR D'UN FORMATEUR
============================================================ */

export async function createFormateurUserAccount(
  formateurId: string,
  emailCompte?: string,
) {
  const context =
    await requireCentreManager();

  /**
   * ----------------------------------------------------------
   * CENTRE
   * ----------------------------------------------------------
   */

  if (!context.centreId) {
    throw new Error(
      "Centre introuvable.",
    );
  }

  /**
   * ----------------------------------------------------------
   * FORMATEUR
   * ----------------------------------------------------------
   */

  const formateur =
    await prisma.formateur.findFirst({
      where: {
        id: formateurId,

        centreId:
          context.centreId,
      },

      select: {
        id: true,

        centreId: true,

        utilisateurId: true,

        prenom: true,
        nom: true,

        email: true,
        telephone: true,
      },
    });

  if (!formateur) {
    throw new Error(
      "Formateur introuvable.",
    );
  }

  /**
   * ----------------------------------------------------------
   * VÉRIFIER SI LE FORMATEUR A DÉJÀ
   * UN COMPTE
   * ----------------------------------------------------------
   */

  if (formateur.utilisateurId) {
    throw new Error(
      "Ce formateur possède déjà un compte utilisateur.",
    );
  }

  /**
   * ----------------------------------------------------------
   * EMAIL DU COMPTE
   * ----------------------------------------------------------
   *
   * Priorité :
   *
   * 1. emailCompte fourni
   * 2. email du formateur
   *
   */

  const email =
    (
      emailCompte?.trim() ||
      formateur.email?.trim() ||
      ""
    ).toLowerCase();

  if (!email) {
    throw new Error(
      "Une adresse email est obligatoire pour créer le compte utilisateur.",
    );
  }

  /**
   * Validation simple.
   */

  if (
    !email.includes("@") ||
    !email.includes(".")
  ) {
    throw new Error(
      "L'adresse email du compte utilisateur est invalide.",
    );
  }

  /**
   * ----------------------------------------------------------
   * VÉRIFIER EMAIL GLOBAL
   * ----------------------------------------------------------
   */

  const utilisateurExistant =
    await prisma.utilisateur.findUnique({
      where: {
        email,
      },
    });

  if (utilisateurExistant) {
    /**
     * Si l'utilisateur existe déjà
     * dans ce centre.
     */

    const membreExistant =
      await prisma.membre.findUnique({
        where: {
          utilisateurId_centreId: {
            utilisateurId:
              utilisateurExistant.id,

            centreId:
              context.centreId,
          },
        },
      });

    if (membreExistant) {
      throw new Error(
        "Cet utilisateur appartient déjà à ce centre.",
      );
    }

    /**
     * Il existe globalement mais
     * n'appartient pas au centre.
     *
     * On ne rattache pas automatiquement
     * un compte existant.
     */
    throw new Error(
      "Cette adresse email est déjà utilisée par un autre compte utilisateur sur la plateforme.",
    );
  }

  /**
   * ----------------------------------------------------------
   * MOT DE PASSE TEMPORAIRE
   * ----------------------------------------------------------
   */

  const motDePasseTemporaire =
    genererMotDePasseTemporaire();

  const motDePasseHash =
    await bcrypt.hash(
      motDePasseTemporaire,
      12,
    );

  /**
   * ----------------------------------------------------------
   * TRANSACTION
   * ----------------------------------------------------------
   *
   * Création atomique :
   *
   * 1. Utilisateur
   * 2. Membre
   * 3. Liaison Formateur
   *
   */

  const resultat =
    await prisma.$transaction(
      async (tx) => {
        /**
         * 1. UTILISATEUR
         */

        const utilisateur =
          await tx.utilisateur.create({
            data: {
              email,

              motDePasse:
                motDePasseHash,

              prenom:
                formateur.prenom,

              nom:
                formateur.nom,

              telephone:
                formateur.telephone,

              roleSysteme:
                RoleSysteme.UTILISATEUR,

              statut:
                StatutUtilisateur.ACTIF,
            },

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

        /**
         * 2. MEMBRE
         *
         * Le rôle du compte dans le centre
         * est FORMATEUR.
         */

        await tx.membre.create({
          data: {
            utilisateurId:
              utilisateur.id,

            centreId:
              context.centreId!,

            role:
              Role.FORMATEUR,

            statut:
              StatutMembre.ACTIF,

            dateInvitation:
              new Date(),

            dateActivation:
              new Date(),
          },
        });

        /**
         * 3. LIAISON FORMATEUR
         */

        const formateurMisAJour =
          await tx.formateur.update({
            where: {
              id: formateur.id,
            },

            data: {
              utilisateurId:
                utilisateur.id,
            },

            select: {
              id: true,

              centreId: true,

              utilisateurId: true,

              prenom: true,

              nom: true,

              email: true,

              telephone: true,

              specialite: true,

              biographie: true,

              statut: true,

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
            },
          });

        return {
          utilisateur,
          formateur:
            formateurMisAJour,
        };
      },
    );

  /**
   * ----------------------------------------------------------
   * RÉSULTAT
   * ----------------------------------------------------------
   */

  return {
    success: true,

    message:
      "Le compte utilisateur du formateur a été créé avec succès.",

    formateur:
      resultat.formateur,

    utilisateur:
      resultat.utilisateur,

    motDePasseTemporaire,
  };
}

/* ============================================================
   SUPPRESSION
============================================================ */

export async function deleteFormateur(
  id: string,
) {
  const context =
    await requireCentreManager();

  if (!context.centreId) {
    throw new Error(
      "Centre introuvable.",
    );
  }

  const formateur =
    await prisma.formateur.findFirst({
      where: {
        id,

        centreId:
          context.centreId,
      },

      include: {
        _count: {
          select: {
            sessions: true,
            modules: true,
            evaluations: true,
          },
        },
      },
    });

  if (!formateur) {
    throw new Error(
      "Formateur introuvable.",
    );
  }

  const totalRelations =
    formateur._count.sessions +
    formateur._count.modules +
    formateur._count.evaluations;

  if (totalRelations > 0) {
    throw new Error(
      "Ce formateur ne peut pas être supprimé car il est déjà utilisé dans des sessions, des modules ou des évaluations. Archivez-le plutôt.",
    );
  }

  /**
   * ----------------------------------------------------------
   * SUPPRESSION
   * ----------------------------------------------------------
   *
   * Si le formateur possède un compte,
   * on supprime également le compte utilisateur.
   *
   * Mais uniquement si cet utilisateur
   * n'a pas d'autres membres.
   */

  await prisma.$transaction(
    async (tx) => {
      const utilisateurId =
        formateur.utilisateurId;

      /**
       * Supprimer le formateur.
       */

      await tx.formateur.delete({
        where: {
          id: formateur.id,
        },
      });

      /**
       * Si aucun compte associé,
       * terminé.
       */

      if (!utilisateurId) {
        return;
      }

      /**
       * Vérifier les autres appartenances
       * de l'utilisateur.
       */

      const autresMembres =
        await tx.membre.count({
          where: {
            utilisateurId,

            NOT: {
              centreId:
                context.centreId,
            },
          },
        });

      /**
       * Supprimer seulement si le compte
       * n'est pas utilisé ailleurs.
       */

      if (autresMembres === 0) {
        await tx.membre.deleteMany({
          where: {
            utilisateurId,
          },
        });

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
      "Le formateur a été supprimé avec succès.",
  };
}
