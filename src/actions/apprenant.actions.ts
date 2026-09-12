
"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import {
  apprenantSchema,
  type ApprenantFormData,
} from "@/lib/validations/apprenant.schema";

import { requireCentreManager } from "@/lib/validations/centre-access";

type ActionResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  data?: unknown;
};

/* ============================================================
   UTILITAIRES
============================================================ */

function emptyToNull(
  value: string | undefined,
): string | null {
  const cleaned = value?.trim();

  return cleaned ? cleaned : null;
}

function parseDate(
  value: string | undefined,
): Date | null {
  if (!value?.trim()) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      "La date de naissance est invalide.",
    );
  }

  return date;
}

/**
 * Vérifie que le contexte possède bien un centre.
 *
 * Important :
 * Un SUPER_ADMIN est global et n'a pas forcément de Membre.
 * Il ne peut donc pas être utilisé ici sans centre explicite.
 */
function requireCentreId(
  centre: {
    id: string;
    nom: string;
    statut: string;
    slug: string;
    code: string;
  } | null,
): string {
  if (!centre?.id) {
    throw new Error(
      "Aucun centre n'est associé à cette opération. Connectez-vous avec un compte rattaché à un centre actif.",
    );
  }

  return centre.id;
}

/**
 * Lecture et normalisation du formulaire.
 */
function getApprenantFormData(
  formData: FormData,
): ApprenantFormData {
  return {
    prenom: String(
      formData.get("prenom") ?? "",
    ),

    nom: String(
      formData.get("nom") ?? "",
    ),

    email: String(
      formData.get("email") ?? "",
    ),

    telephone: String(
      formData.get("telephone") ?? "",
    ),

    dateNaissance: String(
      formData.get("dateNaissance") ?? "",
    ),

    lieuNaissance: String(
      formData.get("lieuNaissance") ?? "",
    ),

    sexe: String(
      formData.get("sexe") ?? "",
    ) as ApprenantFormData["sexe"],

    nationalite: String(
      formData.get("nationalite") ?? "",
    ),

    adresse: String(
      formData.get("adresse") ?? "",
    ),

    ville: String(
      formData.get("ville") ?? "",
    ),

    pays: String(
      formData.get("pays") ?? "",
    ),

    profession: String(
      formData.get("profession") ?? "",
    ),

    contactUrgenceNom: String(
      formData.get("contactUrgenceNom") ?? "",
    ),

    contactUrgenceTelephone: String(
      formData.get(
        "contactUrgenceTelephone",
      ) ?? "",
    ),

    statut: String(
      formData.get("statut") ?? "ACTIF",
    ) as ApprenantFormData["statut"],

    notes: String(
      formData.get("notes") ?? "",
    ),
  };
}

/**
 * Validation du formulaire.
 */
function validateApprenant(
  formData: FormData,
) {
  const rawData =
    getApprenantFormData(formData);

  return apprenantSchema.safeParse(rawData);
}

/* ============================================================
   NUMÉRO APPRENANT
============================================================ */

/**
 * Génération du numéro apprenant.
 *
 * Exemple :
 * APP-000001
 * APP-000002
 *
 * IMPORTANT :
 * Le numéro est toujours calculé à l'intérieur du centre.
 */
async function generateNumeroApprenant(
  centreId: string,
): Promise<string> {
  const parametres =
    await prisma.parametreCentre.findUnique({
      where: {
        centreId,
      },
      select: {
        prefixeApprenant: true,
      },
    });

  const prefixe =
    parametres?.prefixeApprenant?.trim() ||
    "APP";

  const total =
    await prisma.apprenant.count({
      where: {
        centreId,
      },
    });

  return `${prefixe}-${String(
    total + 1,
  ).padStart(6, "0")}`;
}

/* ============================================================
   CREATE
============================================================ */

export async function createApprenant(
  formData: FormData,
): Promise<ActionResult> {
  try {
    /**
     * Le centre est déterminé côté serveur.
     * Le client ne peut pas choisir arbitrairement un centre.
     */
    const { centre } =
      await requireCentreManager();

    const centreId =
      requireCentreId(centre);

    /* --------------------------------------------------------
       VALIDATION
    -------------------------------------------------------- */

    const validation =
      validateApprenant(formData);

    if (!validation.success) {
      return {
        success: false,
        message:
          "Veuillez corriger les erreurs du formulaire.",
        errors:
          validation.error.flatten()
            .fieldErrors as Record<
            string,
            string[]
          >,
      };
    }

    const data = validation.data;

    /* --------------------------------------------------------
       NUMÉRO
    -------------------------------------------------------- */

    const numero =
      await generateNumeroApprenant(
        centreId,
      );

    /* --------------------------------------------------------
       CRÉATION
    -------------------------------------------------------- */

    const apprenant =
      await prisma.apprenant.create({
        data: {
          centreId,

          numero,

          prenom: data.prenom.trim(),

          nom: data.nom.trim(),

          email: emptyToNull(
            data.email,
          ),

          telephone: emptyToNull(
            data.telephone,
          ),

          dateNaissance:
            parseDate(
              data.dateNaissance,
            ),

          lieuNaissance:
            emptyToNull(
              data.lieuNaissance,
            ),

          sexe:
            data.sexe === ""
              ? null
              : data.sexe,

          nationalite:
            emptyToNull(
              data.nationalite,
            ),

          adresse:
            emptyToNull(
              data.adresse,
            ),

          ville:
            emptyToNull(
              data.ville,
            ),

          pays:
            emptyToNull(
              data.pays,
            ),

          profession:
            emptyToNull(
              data.profession,
            ),

          contactUrgenceNom:
            emptyToNull(
              data.contactUrgenceNom,
            ),

          contactUrgenceTelephone:
            emptyToNull(
              data.contactUrgenceTelephone,
            ),

          statut:
            data.statut,

          notes:
            emptyToNull(
              data.notes,
            ),
        },
      });

    revalidatePath(
      "/apprenants",
    );

    return {
      success: true,
      message:
        "L'apprenant a été créé avec succès.",
      data: {
        id: apprenant.id,
      },
    };
  } catch (error) {
    console.error(
      "CREATE APPRENANT:",
      error,
    );

    /* --------------------------------------------------------
       ERREURS PRISMA
    -------------------------------------------------------- */

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2002") {
        return {
          success: false,
          message:
            "Le numéro de l'apprenant existe déjà.",
        };
      }

      if (error.code === "P2003") {
        return {
          success: false,
          message:
            "Le centre associé à l'apprenant est invalide.",
        };
      }
    }

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de créer l'apprenant.",
    };
  }
}

/* ============================================================
   UPDATE
============================================================ */

export async function updateApprenant(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    if (!id?.trim()) {
      return {
        success: false,
        message:
          "Identifiant de l'apprenant invalide.",
      };
    }

    const { centre } =
      await requireCentreManager();

    const centreId =
      requireCentreId(centre);

    /* --------------------------------------------------------
       VÉRIFICATION MULTI-TENANT
    -------------------------------------------------------- */

    const existing =
      await prisma.apprenant.findFirst({
        where: {
          id,
          centreId,
        },
        select: {
          id: true,
          centreId: true,
        },
      });

    if (!existing) {
      return {
        success: false,
        message:
          "Apprenant introuvable.",
      };
    }

    /* --------------------------------------------------------
       VALIDATION
    -------------------------------------------------------- */

    const validation =
      validateApprenant(formData);

    if (!validation.success) {
      return {
        success: false,
        message:
          "Veuillez corriger les erreurs du formulaire.",
        errors:
          validation.error.flatten()
            .fieldErrors as Record<
            string,
            string[]
          >,
      };
    }

    const data = validation.data;

    /* --------------------------------------------------------
       MISE À JOUR
    -------------------------------------------------------- */

    await prisma.apprenant.update({
      where: {
        id: existing.id,
      },

      data: {
        prenom:
          data.prenom.trim(),

        nom:
          data.nom.trim(),

        email:
          emptyToNull(
            data.email,
          ),

        telephone:
          emptyToNull(
            data.telephone,
          ),

        dateNaissance:
          parseDate(
            data.dateNaissance,
          ),

        lieuNaissance:
          emptyToNull(
            data.lieuNaissance,
          ),

        sexe:
          data.sexe === ""
            ? null
            : data.sexe,

        nationalite:
          emptyToNull(
            data.nationalite,
          ),

        adresse:
          emptyToNull(
            data.adresse,
          ),

        ville:
          emptyToNull(
            data.ville,
          ),

        pays:
          emptyToNull(
            data.pays,
          ),

        profession:
          emptyToNull(
            data.profession,
          ),

        contactUrgenceNom:
          emptyToNull(
            data.contactUrgenceNom,
          ),

        contactUrgenceTelephone:
          emptyToNull(
            data.contactUrgenceTelephone,
          ),

        statut:
          data.statut,

        notes:
          emptyToNull(
            data.notes,
          ),
      },
    });

    revalidatePath(
      "/apprenants",
    );

    return {
      success: true,
      message:
        "L'apprenant a été modifié avec succès.",
    };
  } catch (error) {
    console.error(
      "UPDATE APPRENANT:",
      error,
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2002") {
        return {
          success: false,
          message:
            "Une donnée unique de cet apprenant existe déjà.",
        };
      }

      if (error.code === "P2003") {
        return {
          success: false,
          message:
            "Une relation associée à cet apprenant est invalide.",
        };
      }
    }

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de modifier l'apprenant.",
    };
  }
}

/* ============================================================
   DELETE
============================================================ */

/**
 * Suppression physique.
 *
 * On interdit la suppression si l'apprenant possède
 * déjà des données métier.
 *
 * Dans ce cas :
 * → utiliser ARCHIVE.
 */
export async function deleteApprenant(
  id: string,
): Promise<ActionResult> {
  try {
    if (!id?.trim()) {
      return {
        success: false,
        message:
          "Identifiant de l'apprenant invalide.",
      };
    }

    const { centre } =
      await requireCentreManager();

    const centreId =
      requireCentreId(centre);

    /* --------------------------------------------------------
       RÉCUPÉRATION + CONTRÔLE CENTRE
    -------------------------------------------------------- */

    const apprenant =
      await prisma.apprenant.findFirst({
        where: {
          id,
          centreId,
        },

        include: {
          _count: {
            select: {
              inscriptions: true,
              paiements: true,
              evaluations: true,
              evaluationsJury: true,
              certifications: true,
              documents: true,
              resultatsFormations: true,
            },
          },
        },
      });

    if (!apprenant) {
      return {
        success: false,
        message:
          "Apprenant introuvable.",
      };
    }

    /* --------------------------------------------------------
       VÉRIFICATION DES DONNÉES MÉTIER
    -------------------------------------------------------- */

    const totalRelations =
      apprenant._count
        .inscriptions +
      apprenant._count
        .paiements +
      apprenant._count
        .evaluations +
      apprenant._count
        .evaluationsJury +
      apprenant._count
        .certifications +
      apprenant._count
        .documents +
      apprenant._count
        .resultatsFormations;

    if (totalRelations > 0) {
      return {
        success: false,
        message:
          "Cet apprenant possède déjà des données liées. Il ne peut pas être supprimé. Utilisez plutôt le statut ARCHIVE.",
      };
    }

    /* --------------------------------------------------------
       SUPPRESSION
    -------------------------------------------------------- */

    await prisma.apprenant.delete({
      where: {
        id: apprenant.id,
      },
    });

    revalidatePath(
      "/apprenants",
    );

    return {
      success: true,
      message:
        "L'apprenant a été supprimé.",
    };
  } catch (error) {
    console.error(
      "DELETE APPRENANT:",
      error,
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2003") {
        return {
          success: false,
          message:
            "Impossible de supprimer cet apprenant car il possède encore des données liées.",
        };
      }
    }

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de supprimer l'apprenant.",
    };
  }
}

/* ============================================================
   ARCHIVE
============================================================ */

export async function archiveApprenant(
  id: string,
): Promise<ActionResult> {
  try {
    if (!id?.trim()) {
      return {
        success: false,
        message:
          "Identifiant de l'apprenant invalide.",
      };
    }

    const { centre } =
      await requireCentreManager();

    const centreId =
      requireCentreId(centre);

    /* --------------------------------------------------------
       CONTRÔLE MULTI-TENANT
    -------------------------------------------------------- */

    const existing =
      await prisma.apprenant.findFirst({
        where: {
          id,
          centreId,
        },
        select: {
          id: true,
          statut: true,
        },
      });

    if (!existing) {
      return {
        success: false,
        message:
          "Apprenant introuvable.",
      };
    }

    /* --------------------------------------------------------
       DÉJÀ ARCHIVÉ
    -------------------------------------------------------- */

    if (
      existing.statut ===
      "ARCHIVE"
    ) {
      return {
        success: false,
        message:
          "Cet apprenant est déjà archivé.",
      };
    }

    /* --------------------------------------------------------
       ARCHIVAGE
    -------------------------------------------------------- */

    await prisma.apprenant.update({
      where: {
        id: existing.id,
      },

      data: {
        statut: "ARCHIVE",
      },
    });

    revalidatePath(
      "/apprenants",
    );

    return {
      success: true,
      message:
        "L'apprenant a été archivé.",
    };
  } catch (error) {
    console.error(
      "ARCHIVE APPRENANT:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible d'archiver l'apprenant.",
    };
  }
}