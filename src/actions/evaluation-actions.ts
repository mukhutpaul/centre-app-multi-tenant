"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

import {
  ResultatEvaluation,
  StatutEvaluation,
} from "@/generated/prisma/enums";

import { requireCentreManager } from "@/lib/validations/centre-access";

/* ============================================================
   TYPES
============================================================ */

type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
};

/* ============================================================
   CENTRE
============================================================ */

/**
 * Récupère le centre courant exactement comme dans
 * les actions Apprenants.
 *
 * Le centre n'est jamais envoyé par le navigateur.
 */
async function getCurrentCentreId(): Promise<string> {
  const { centre } =
    await requireCentreManager();

  if (!centre?.id) {
    throw new Error(
      "Aucun centre n'est associé à cette opération. Connectez-vous avec un compte rattaché à un centre actif.",
    );
  }

  return centre.id;
}

/* ============================================================
   UTILITAIRES
============================================================ */

function n(v: unknown): number {
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : 0;
  }

  const x = Number(v);

  return Number.isFinite(x) ? x : 0;
}

function pct(
  note: number,
  max: number,
): number {
  if (max <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      (note / max) * 100,
    ),
  );
}

/* ============================================================
   SERIALIZATION
============================================================ */

function serialize(e: any) {
  const note = n(e.note);
  const max = n(e.noteMaximale);

  return {
    id: e.id,

    inscriptionId:
      e.inscriptionId,

    moduleSessionId:
      e.moduleSessionId,

    modeleId:
      e.modeleId,

    evaluateurId:
      e.evaluateurId,

    apprenantId:
      e.apprenantId,

    note,

    noteMaximale: max,

    /**
     * Résultat exprimé sur 100 %.
     *
     * Exemple :
     * 16 / 20 = 80 %
     */
    pourcentage: pct(
      note,
      max,
    ),

    statut:
      e.statut,

    resultat:
      e.resultat,

    commentaire:
      e.commentaire,

    dateEvaluation:
      e.dateEvaluation,

    apprenant:
      e.apprenant
        ? `${e.apprenant.prenom} ${e.apprenant.nom}`.trim()
        : "—",

    inscription:
      e.inscription
        ? {
            id: e.inscription.id,
            numero: e.inscription.numero,
          }
        : null,

    moduleSession:
      e.moduleSession
        ? {
            id: e.moduleSession.id,

            module:
              e.moduleSession.module?.nom ??
              "—",

            session:
              e.moduleSession.session?.nom ||
              e.moduleSession.session?.code ||
              "—",

            formation:
              e.moduleSession.session?.formation?.nom ??
              "—",
          }
        : null,

    modele:
      e.modele
        ? {
            id: e.modele.id,
            nom: e.modele.nom,
          }
        : null,

    evaluateur:
      e.evaluateur
        ? `${e.evaluateur.prenom} ${e.evaluateur.nom}`.trim()
        : "—",
  };
}

/* ============================================================
   INCLUDE PRISMA
============================================================ */

const include = {
  apprenant: true,

  inscription: true,

  modele: true,

  evaluateur: true,

  moduleSession: {
    include: {
      module: true,

      session: {
        include: {
          formation: true,
        },
      },
    },
  },
};

/* ============================================================
   GET EVALUATIONS
============================================================ */

export async function getEvaluations() {
  try {
    /**
     * Centre récupéré côté serveur.
     */
    const centreId =
      await getCurrentCentreId();

    const rows =
      await prisma.evaluationResultat.findMany(
        {
          where: {
            inscription: {
              session: {
                centreId,
              },
            },
          },

          include,

          orderBy: {
            creeLe: "desc",
          },
        },
      );

    return rows.map(
      serialize,
    );
  } catch (error) {
    console.error(
      "GET EVALUATIONS:",
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : "Impossible de récupérer les évaluations.",
    );
  }
}

/* ============================================================
   OPTIONS EVALUATIONS
============================================================ */

export async function getEvaluationOptions() {
  try {
    /**
     * Centre courant depuis Auth.js
     * via requireCentreManager().
     */
    const centreId =
      await getCurrentCentreId();

    const [
      inscriptions,
      modulesSessions,
      modeles,
      formateurs,
    ] = await Promise.all([
      /* ------------------------------------------------------
         INSCRIPTIONS
      ------------------------------------------------------ */

      prisma.inscription.findMany({
        where: {
          session: {
            centreId,
          },
        },

        select: {
          id: true,

          numero: true,

          apprenantId: true,

          apprenant: {
            select: {
              prenom: true,
              nom: true,
            },
          },

          session: {
            select: {
              id: true,
              code: true,
              nom: true,

              formation: {
                select: {
                  id: true,
                  nom: true,
                },
              },
            },
          },
        },

        orderBy: {
          creeLe: "desc",
        },
      }),

      /* ------------------------------------------------------
         MODULES DE SESSION
      ------------------------------------------------------ */

      prisma.moduleSession.findMany({
        where: {
          session: {
            centreId,
          },
        },

        select: {
          id: true,

          position: true,

          module: {
            select: {
              id: true,
              code: true,
              nom: true,
            },
          },

          session: {
            select: {
              id: true,
              code: true,
              nom: true,

              formation: {
                select: {
                  id: true,
                  nom: true,
                },
              },
            },
          },
        },

        orderBy: [
          {
            session: {
              dateDebut: "desc",
            },
          },
          {
            position: "asc",
          },
        ],
      }),

      /* ------------------------------------------------------
         MODELES D'EVALUATION
      ------------------------------------------------------ */

      prisma.modeleEvaluation.findMany({
        where: {
          centreId,
        },

        select: {
          id: true,

          nom: true,

          noteMaximale: true,

          notePassage: true,

          coefficient: true,

          actif: true,

          formationId: true,

          moduleId: true,
        },

        orderBy: {
          nom: "asc",
        },
      }),

      /* ------------------------------------------------------
         FORMATEURS
      ------------------------------------------------------ */

      prisma.formateur.findMany({
        where: {
          centreId,

          statut: "ACTIF",
        },

        select: {
          id: true,
          prenom: true,
          nom: true,
        },

        orderBy: [
          {
            nom: "asc",
          },
          {
            prenom: "asc",
          },
        ],
      }),
    ]);

    return {
      inscriptions:
        inscriptions.map(
          (x) => ({
            id: x.id,

            numero: x.numero,

            apprenantId:
              x.apprenantId,

            apprenant:
              `${x.apprenant.prenom} ${x.apprenant.nom}`.trim(),

            sessionId:
              x.session.id,

            session:
              x.session.nom ||
              x.session.code,

            formationId:
              x.session.formation.id,

            formation:
              x.session.formation.nom,
          }),
        ),

      modulesSessions:
        modulesSessions.map(
          (x) => ({
            id: x.id,

            moduleId:
              x.module.id,

            module:
              `${x.module.code} — ${x.module.nom}`,

            sessionId:
              x.session.id,

            session:
              x.session.nom ||
              x.session.code,

            formationId:
              x.session.formation.id,

            formation:
              x.session.formation.nom,
          }),
        ),

      modeles:
        modeles.map(
          (x) => ({
            id: x.id,

            nom: x.nom,

            noteMaximale:
              n(x.noteMaximale),

            notePassage:
              x.notePassage == null
                ? null
                : n(x.notePassage),

            coefficient:
              n(x.coefficient),

            actif:
              x.actif,

            formationId:
              x.formationId,

            moduleId:
              x.moduleId,
          }),
        ),

      formateurs:
        formateurs.map(
          (x) => ({
            id: x.id,

            nom:
              `${x.prenom} ${x.nom}`.trim(),
          }),
        ),
    };
  } catch (error) {
    console.error(
      "GET EVALUATION OPTIONS:",
      error,
    );

    throw new Error(
      error instanceof Error
        ? error.message
        : "Impossible de récupérer les options des évaluations.",
    );
  }
}

/* ============================================================
   RESOLVE CONTEXT
============================================================ */

async function resolveContext(
  centreId: string,
  inscriptionId: string,
  moduleSessionId: string,
) {
  const [
    inscription,
    moduleSession,
  ] = await Promise.all([
    prisma.inscription.findFirst({
      where: {
        id: inscriptionId,

        session: {
          centreId,
        },
      },

      include: {
        session: {
          include: {
            formation: true,
          },
        },
      },
    }),

    prisma.moduleSession.findFirst({
      where: {
        id: moduleSessionId,

        session: {
          centreId,
        },
      },

      include: {
        session: {
          include: {
            formation: true,
          },
        },

        module: true,
      },
    }),
  ]);

  if (!inscription) {
    throw new Error(
      "Inscription introuvable pour ce centre.",
    );
  }

  if (!moduleSession) {
    throw new Error(
      "Module de session introuvable pour ce centre.",
    );
  }

  if (
    inscription.sessionId !==
    moduleSession.sessionId
  ) {
    throw new Error(
      "L'inscription et le module doivent appartenir à la même session.",
    );
  }

  return {
    inscription,
    moduleSession,
  };
}

/* ============================================================
   CALCUL RESULTAT
============================================================ */

function computeResult(
  note: number,
  max: number,
  notePassage?: number | null,
) {
  if (
    max <= 0 ||
    note < 0
  ) {
    throw new Error(
      "Note invalide.",
    );
  }

  if (note > max) {
    throw new Error(
      `La note ne peut pas dépasser ${max}.`,
    );
  }

  const pourcentage =
    pct(note, max);

  /**
   * Si aucun seuil n'est défini,
   * on utilise 50 %.
   */
  const seuil =
    notePassage == null
      ? 50
      : notePassage;

  const resultat =
    pourcentage >= seuil
      ? ResultatEvaluation.REUSSITE
      : ResultatEvaluation.ECHEC;

  return {
    pourcentage,
    resultat,
  };
}

/* ============================================================
   CREATE
============================================================ */

export async function createEvaluation(
  input: {
    inscriptionId: string;

    moduleSessionId: string;

    modeleId?: string | null;

    evaluateurId?: string | null;

    apprenantId: string;

    note: number;

    noteMaximale?: number;

    statut?: StatutEvaluation;

    commentaire?: string | null;

    dateEvaluation?: string | null;
  },
): Promise<ActionResult> {
  try {
    /**
     * IMPORTANT :
     * Le centre vient du serveur.
     */
    const centreId =
      await getCurrentCentreId();

    /* --------------------------------------------------------
       CONTEXTE
    -------------------------------------------------------- */

    const {
      inscription,
      moduleSession,
    } =
      await resolveContext(
        centreId,
        input.inscriptionId,
        input.moduleSessionId,
      );

    /* --------------------------------------------------------
       APPRENANT
    -------------------------------------------------------- */

    if (
      input.apprenantId !==
      inscription.apprenantId
    ) {
      throw new Error(
        "L'apprenant ne correspond pas à l'inscription.",
      );
    }

    /* --------------------------------------------------------
       MODELE
    -------------------------------------------------------- */

    const modele =
      input.modeleId
        ? await prisma.modeleEvaluation.findFirst(
            {
              where: {
                id: input.modeleId,
                centreId,
              },
            },
          )
        : null;

    if (
      input.modeleId &&
      !modele
    ) {
      throw new Error(
        "Modèle d'évaluation introuvable.",
      );
    }

    /* --------------------------------------------------------
       NOTE MAXIMALE
    -------------------------------------------------------- */

    const noteMaximale =
      input.noteMaximale ??
      (modele
        ? n(modele.noteMaximale)
        : 20);

    /* --------------------------------------------------------
       CALCUL
    -------------------------------------------------------- */

    const {
      resultat,
    } =
      computeResult(
        n(input.note),
        noteMaximale,
        modele?.notePassage == null
          ? null
          : n(modele.notePassage),
      );

    /* --------------------------------------------------------
       DUPLICATION
    -------------------------------------------------------- */

    const duplicate =
      await prisma.evaluationResultat.findFirst(
        {
          where: {
            inscriptionId:
              input.inscriptionId,

            moduleSessionId:
              input.moduleSessionId,
          },

          select: {
            id: true,
          },
        },
      );

    if (duplicate) {
      throw new Error(
        "Une évaluation existe déjà pour cet apprenant et ce module.",
      );
    }

    /* --------------------------------------------------------
       EVALUATEUR
       Vérification supplémentaire du centre
    -------------------------------------------------------- */

    if (input.evaluateurId) {
      const evaluateur =
        await prisma.formateur.findFirst({
          where: {
            id: input.evaluateurId,
            centreId,
          },

          select: {
            id: true,
          },
        });

      if (!evaluateur) {
        throw new Error(
          "Le formateur sélectionné n'appartient pas au centre courant.",
        );
      }
    }

    /* --------------------------------------------------------
       CREATION
    -------------------------------------------------------- */

    const created =
      await prisma.evaluationResultat.create(
        {
          data: {
            inscriptionId:
              input.inscriptionId,

            moduleSessionId:
              input.moduleSessionId,

            modeleId:
              modele?.id ?? null,

            evaluateurId:
              input.evaluateurId || null,

            apprenantId:
              input.apprenantId,

            note:
              n(input.note),

            noteMaximale,

            statut:
              input.statut ??
              StatutEvaluation.BROUILLON,

            resultat,

            commentaire:
              input.commentaire?.trim() ||
              null,

            dateEvaluation:
              input.dateEvaluation
                ? new Date(
                    input.dateEvaluation,
                  )
                : new Date(),
          },

          include,
        },
      );

    revalidatePath(
      "/evaluations",
    );

    return {
      success: true,
      data: serialize(created),
    };
  } catch (error) {
    console.error(
      "CREATE EVALUATION:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de créer l'évaluation.",
    };
  }
}

/* ============================================================
   UPDATE
============================================================ */

export async function updateEvaluation(
  input: {
    id: string;

    inscriptionId: string;

    moduleSessionId: string;

    modeleId?: string | null;

    evaluateurId?: string | null;

    apprenantId: string;

    note: number;

    noteMaximale?: number;

    statut?: StatutEvaluation;

    commentaire?: string | null;

    dateEvaluation?: string | null;
  },
): Promise<ActionResult> {
  try {
    /**
     * Centre récupéré côté serveur.
     */
    const centreId =
      await getCurrentCentreId();

    /* --------------------------------------------------------
       EVALUATION EXISTANTE
    -------------------------------------------------------- */

    const existing =
      await prisma.evaluationResultat.findFirst(
        {
          where: {
            id: input.id,

            inscription: {
              session: {
                centreId,
              },
            },
          },
        },
      );

    if (!existing) {
      throw new Error(
        "Évaluation introuvable.",
      );
    }

    /* --------------------------------------------------------
       CONTEXTE
    -------------------------------------------------------- */

    const {
      inscription,
    } =
      await resolveContext(
        centreId,
        input.inscriptionId,
        input.moduleSessionId,
      );

    /* --------------------------------------------------------
       APPRENANT
    -------------------------------------------------------- */

    if (
      input.apprenantId !==
      inscription.apprenantId
    ) {
      throw new Error(
        "Apprenant invalide.",
      );
    }

    /* --------------------------------------------------------
       MODELE
    -------------------------------------------------------- */

    const modele =
      input.modeleId
        ? await prisma.modeleEvaluation.findFirst(
            {
              where: {
                id: input.modeleId,
                centreId,
              },
            },
          )
        : null;

    if (
      input.modeleId &&
      !modele
    ) {
      throw new Error(
        "Modèle d'évaluation introuvable.",
      );
    }

    /* --------------------------------------------------------
       NOTE MAXIMALE
    -------------------------------------------------------- */

    const noteMaximale =
      input.noteMaximale ??
      (modele
        ? n(modele.noteMaximale)
        : n(existing.noteMaximale));

    /* --------------------------------------------------------
       CALCUL
    -------------------------------------------------------- */

    const {
      resultat,
    } =
      computeResult(
        n(input.note),
        noteMaximale,
        modele?.notePassage == null
          ? null
          : n(modele.notePassage),
      );

    /* --------------------------------------------------------
       DUPLICATION
    -------------------------------------------------------- */

    const duplicate =
      await prisma.evaluationResultat.findFirst(
        {
          where: {
            inscriptionId:
              input.inscriptionId,

            moduleSessionId:
              input.moduleSessionId,

            NOT: {
              id: input.id,
            },
          },

          select: {
            id: true,
          },
        },
      );

    if (duplicate) {
      throw new Error(
        "Une autre évaluation existe déjà pour cet apprenant et ce module.",
      );
    }

    /* --------------------------------------------------------
       EVALUATEUR
    -------------------------------------------------------- */

    if (input.evaluateurId) {
      const evaluateur =
        await prisma.formateur.findFirst({
          where: {
            id: input.evaluateurId,
            centreId,
          },

          select: {
            id: true,
          },
        });

      if (!evaluateur) {
        throw new Error(
          "Le formateur sélectionné n'appartient pas au centre courant.",
        );
      }
    }

    /* --------------------------------------------------------
       UPDATE
    -------------------------------------------------------- */

    const updated =
      await prisma.evaluationResultat.update(
        {
          where: {
            id: input.id,
          },

          data: {
            inscriptionId:
              input.inscriptionId,

            moduleSessionId:
              input.moduleSessionId,

            modeleId:
              modele?.id ?? null,

            evaluateurId:
              input.evaluateurId || null,

            apprenantId:
              input.apprenantId,

            note:
              n(input.note),

            noteMaximale,

            statut:
              input.statut ??
              existing.statut,

            resultat,

            commentaire:
              input.commentaire?.trim() ||
              null,

            dateEvaluation:
              input.dateEvaluation
                ? new Date(
                    input.dateEvaluation,
                  )
                : existing.dateEvaluation,
          },

          include,
        },
      );

    revalidatePath(
      "/evaluations",
    );

    return {
      success: true,
      data: serialize(updated),
    };
  } catch (error) {
    console.error(
      "UPDATE EVALUATION:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de modifier l'évaluation.",
    };
  }
}

/* ============================================================
   DELETE
============================================================ */

export async function deleteEvaluation(
  id: string,
): Promise<ActionResult> {
  try {
    const centreId =
      await getCurrentCentreId();

    /* --------------------------------------------------------
       CONTROLE MULTI-TENANT
    -------------------------------------------------------- */

    const existing =
      await prisma.evaluationResultat.findFirst(
        {
          where: {
            id,

            inscription: {
              session: {
                centreId,
              },
            },
          },

          select: {
            id: true,
            statut: true,
          },
        },
      );

    if (!existing) {
      throw new Error(
        "Évaluation introuvable.",
      );
    }

    /* --------------------------------------------------------
       SUPPRESSION
    -------------------------------------------------------- */

    await prisma.evaluationResultat.delete(
      {
        where: {
          id: existing.id,
        },
      },
    );

    revalidatePath(
      "/evaluations",
    );

    return {
      success: true,
      message:
        "Évaluation supprimée avec succès.",
    };
  } catch (error) {
    console.error(
      "DELETE EVALUATION:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de supprimer l'évaluation.",
    };
  }
}

/* ============================================================
   VALIDATION
============================================================ */

export async function validerEvaluation(
  id: string,
): Promise<ActionResult> {
  try {
    const centreId =
      await getCurrentCentreId();

    /* --------------------------------------------------------
       RECUPERATION
    -------------------------------------------------------- */

    const existing =
      await prisma.evaluationResultat.findFirst(
        {
          where: {
            id,

            inscription: {
              session: {
                centreId,
              },
            },
          },

          include: {
            modele: true,
          },
        },
      );

    if (!existing) {
      throw new Error(
        "Évaluation introuvable.",
      );
    }

    /* --------------------------------------------------------
       CALCUL
    -------------------------------------------------------- */

    const note =
      n(existing.note);

    const max =
      n(existing.noteMaximale);

    const {
      resultat,
    } =
      computeResult(
        note,
        max,
        existing.modele?.notePassage == null
          ? null
          : n(
              existing.modele
                .notePassage,
            ),
      );

    /* --------------------------------------------------------
       VALIDATION
    -------------------------------------------------------- */

    const updated =
      await prisma.evaluationResultat.update(
        {
          where: {
            id,
          },

          data: {
            statut:
              StatutEvaluation.VALIDEE,

            resultat,

            dateEvaluation:
              existing.dateEvaluation ??
              new Date(),
          },

          include,
        },
      );

    revalidatePath(
      "/evaluations",
    );

    return {
      success: true,

      data:
        serialize(updated),
    };
  } catch (error) {
    console.error(
      "VALIDER EVALUATION:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de valider l'évaluation.",
    };
  }
}


/* ============================================================
   CREATION MODELE D'EVALUATION
============================================================ */

export async function createModeleEvaluation(data: {
  nom: string;
  description?: string | null;
  noteMaximale: number;
  notePassage?: number | null;
  coefficient?: number;
  actif?: boolean;
}) {
  try {
    /*
     * ==========================================================
     * CENTRE COURANT
     * ==========================================================
     *
     * Le centre est récupéré côté serveur.
     * Aucun centreId ne vient du navigateur.
     */
    const { centre } =
      await requireCentreManager();

    if (!centre?.id) {
      throw new Error(
        "Aucun centre n'est associé à votre compte.",
      );
    }

    const centreId = centre.id;

    /* ==========================================================
       VALIDATION NOM
    ========================================================== */

    const nom =
      data.nom?.trim();

    if (!nom) {
      return {
        success: false,
        message:
          "Le nom du modèle est obligatoire.",
      };
    }

    /* ==========================================================
       VALIDATION NOTE MAXIMALE
    ========================================================== */

    const noteMaximale =
      Number(data.noteMaximale);

    if (
      !Number.isFinite(
        noteMaximale,
      ) ||
      noteMaximale <= 0
    ) {
      return {
        success: false,
        message:
          "La note maximale doit être supérieure à zéro.",
      };
    }

    /* ==========================================================
       VALIDATION SEUIL
    ========================================================== */

    let notePassage =
      data.notePassage;

    if (
      notePassage !== null &&
      notePassage !== undefined
    ) {
      notePassage =
        Number(notePassage);

      if (
        !Number.isFinite(
          notePassage,
        ) ||
        notePassage < 0 ||
        notePassage >
          noteMaximale
      ) {
        return {
          success: false,
          message:
            `Le seuil de réussite doit être compris entre 0 et ${noteMaximale}.`,
        };
      }
    }

    /* ==========================================================
       VALIDATION COEFFICIENT
    ========================================================== */

    const coefficient =
      data.coefficient ===
      undefined
        ? 1
        : Number(
            data.coefficient,
          );

    if (
      !Number.isFinite(
        coefficient,
      ) ||
      coefficient <= 0
    ) {
      return {
        success: false,
        message:
          "Le coefficient doit être supérieur à zéro.",
      };
    }

    /* ==========================================================
       RECHERCHE DOUBLON
    ========================================================== */

    const existing =
      await prisma.modeleEvaluation.findFirst(
        {
          where: {
            centreId,
            nom,
          },

          select: {
            id: true,
          },
        },
      );

    if (existing) {
      return {
        success: false,
        message:
          "Un modèle d'évaluation portant ce nom existe déjà dans votre centre.",
      };
    }

    /* ==========================================================
       CREATION
    ========================================================== */

    const modele =
      await prisma.modeleEvaluation.create({
        data: {
          centreId,

          nom,

          description:
            data.description?.trim() ||
            null,

          noteMaximale,

          notePassage:
            notePassage ??
            null,

          coefficient,

          actif:
            data.actif ?? true,
        },
      });

    /* ==========================================================
       REPONSE
    ========================================================== */

    return {
      success: true,

      message:
        "Modèle d'évaluation créé avec succès.",

      data: {
        id: modele.id,

        nom: modele.nom,

        description:
          modele.description,

        noteMaximale:
          modele.noteMaximale,

        notePassage:
          modele.notePassage,

        coefficient:
          modele.coefficient,

        actif:
          modele.actif,
      },
    };
  } catch (error) {
    console.error(
      "CREATE MODELE EVALUATION:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de créer le modèle d'évaluation.",
    };
  }
}