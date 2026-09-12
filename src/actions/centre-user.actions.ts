"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import {
  Role,
  RoleSysteme,
  StatutCentre,
  StatutMembre,
  StatutUtilisateur,
} from "@/generated/prisma/enums";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/validations/centre-access";

/* ============================================================
   TYPES
============================================================ */

export interface CreateFirstCentreUserData {
  centreId: string;
  prenom: string;
  nom: string;
  email: string;
  motDePasse: string;
  confirmationMotDePasse: string;
}

export interface CreateFirstCentreUserResponse {
  success: boolean;
  message: string;
  data?: {
    utilisateurId: string;
    membreId: string;
  };
}

/* ============================================================
   CONSTANTES
============================================================ */

const MIN_PASSWORD_LENGTH = 8;

/* ============================================================
   NORMALISATION
============================================================ */

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/* ============================================================
   CRÉER LE PREMIER UTILISATEUR D'UN CENTRE
============================================================ */

export async function createFirstCentreUser(
  data: CreateFirstCentreUserData,
): Promise<CreateFirstCentreUserResponse> {
  try {
    /* ========================================================
       1. AUTORISATION
    ======================================================== */

    await requireSuperAdmin();

    /* ========================================================
       2. VALIDATION DE BASE
    ======================================================== */

    const centreId = data.centreId?.trim();
    const prenom = normalizeText(data.prenom ?? "");
    const nom = normalizeText(data.nom ?? "");
    const email = normalizeEmail(data.email ?? "");
    const motDePasse = data.motDePasse ?? "";
    const confirmationMotDePasse =
      data.confirmationMotDePasse ?? "";

    if (!centreId) {
      return {
        success: false,
        message: "Le centre est obligatoire.",
      };
    }

    if (!prenom) {
      return {
        success: false,
        message: "Le prénom est obligatoire.",
      };
    }

    if (prenom.length < 2) {
      return {
        success: false,
        message: "Le prénom doit contenir au moins 2 caractères.",
      };
    }

    if (!nom) {
      return {
        success: false,
        message: "Le nom est obligatoire.",
      };
    }

    if (nom.length < 2) {
      return {
        success: false,
        message: "Le nom doit contenir au moins 2 caractères.",
      };
    }

    if (!email) {
      return {
        success: false,
        message: "L'adresse e-mail est obligatoire.",
      };
    }

    const emailValide =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!emailValide) {
      return {
        success: false,
        message: "L'adresse e-mail n'est pas valide.",
      };
    }

    if (!motDePasse) {
      return {
        success: false,
        message: "Le mot de passe est obligatoire.",
      };
    }

    if (motDePasse.length < MIN_PASSWORD_LENGTH) {
      return {
        success: false,
        message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
      };
    }

    if (motDePasse !== confirmationMotDePasse) {
      return {
        success: false,
        message:
          "Les deux mots de passe ne correspondent pas.",
      };
    }

    /* ========================================================
       3. VÉRIFIER LE CENTRE
    ======================================================== */

    const centre = await prisma.centreFormation.findUnique({
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
      return {
        success: false,
        message: "Le centre sélectionné est introuvable.",
      };
    }

    /* ========================================================
       4. CENTRE RÉSILIÉ
    ======================================================== */

    if (centre.statut === StatutCentre.RESILIE) {
      return {
        success: false,
        message:
          "Un centre résilié ne peut pas recevoir de nouvel utilisateur.",
      };
    }

    /* ========================================================
       5. VÉRIFIER SI LE CENTRE POSSÈDE DÉJÀ UN MEMBRE
    ======================================================== */

    const nombreMembres = await prisma.membre.count({
      where: {
        centreId,
      },
    });

    if (nombreMembres > 0) {
      return {
        success: false,
        message:
          "Ce centre possède déjà un utilisateur. Utilisez la gestion des utilisateurs pour ajouter un autre compte.",
      };
    }

    /* ========================================================
       6. VÉRIFIER L'E-MAIL
    ======================================================== */

    const utilisateurExistant =
      await prisma.utilisateur.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          email: true,
        },
      });

    if (utilisateurExistant) {
      return {
        success: false,
        message:
          "Cette adresse e-mail est déjà utilisée par un utilisateur.",
      };
    }

    /* ========================================================
       7. HASH DU MOT DE PASSE
    ======================================================== */

    const motDePasseHash = await bcrypt.hash(
      motDePasse,
      12,
    );

    /* ========================================================
       8. TRANSACTION
    ======================================================== */

    const resultat = await prisma.$transaction(
      async (tx) => {
        /*
         * Création du compte global.
         *
         * IMPORTANT :
         * Le premier utilisateur du centre n'est PAS
         * SUPER_ADMIN.
         */

        const utilisateur =
          await tx.utilisateur.create({
            data: {
              prenom,
              nom,
              email,
              motDePasse: motDePasseHash,
              statut: StatutUtilisateur.ACTIF,
              roleSysteme: RoleSysteme.UTILISATEUR,
            },
          });

        /*
         * Rattachement au centre.
         *
         * Le premier utilisateur devient PROPRIETAIRE.
         */

        const membre = await tx.membre.create({
          data: {
            utilisateurId: utilisateur.id,
            centreId: centre.id,
            role: Role.PROPRIETAIRE,
            statut: StatutMembre.ACTIF,
            dateInvitation: new Date(),
            dateActivation: new Date(),
          },
        });

        return {
          utilisateurId: utilisateur.id,
          membreId: membre.id,
        };
      },
    );

    /* ========================================================
       9. RAFRAÎCHIR LES DONNÉES
    ======================================================== */

    revalidatePath("/centres");
    revalidatePath("/utilisateurs");
    revalidatePath("/dashboard");

    /* ========================================================
       10. RÉPONSE
    ======================================================== */

    return {
      success: true,
      message: `Le premier utilisateur du centre « ${centre.nom} » a été créé avec succès.`,
      data: resultat,
    };
  } catch (error) {
    console.error(
      "CREATE FIRST CENTRE USER:",
      error,
    );

    if (
      error instanceof Error &&
      error.message
    ) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: false,
      message:
        "Impossible de créer le premier utilisateur du centre.",
    };
  }
}