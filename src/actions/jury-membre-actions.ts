"use server";

import { prisma } from "@/lib/prisma";
import { requireCentreManager } from "@/lib/validations/centre-access";

/* ============================================================
   TYPES
============================================================ */

type RoleMembre =
  | "PRESIDENT"
  | "MEMBRE"
  | "OBSERVATEUR";

type DecisionJury =
  | "ADMIS"
  | "ADMIS_SOUS_CONDITION"
  | "AJOURNE"
  | "ECHEC";

type MembreInput = {
  prenom: string;
  nom: string;
  email?: string | null;
  telephone?: string | null;
  organisme?: string | null;
  role?: RoleMembre;
};

type EvaluationInput = {
  juryId: string;
  inscriptionId: string;
  apprenantId: string;
  membreJuryId: string;
  note?: number | null;
  decision?: DecisionJury | null;
  commentaire?: string | null;
};

/* ============================================================
   CENTRE
============================================================ */

async function getCentreId(): Promise<string> {
  const { centre } = await requireCentreManager();

  if (!centre?.id) {
    throw new Error(
      "Aucun centre n'est associé à votre compte.",
    );
  }

  return centre.id;
}

/* ============================================================
   UTILITAIRE
============================================================ */

function clean(
  value?: string | null,
): string | null {
  const result = value?.trim();

  return result || null;
}

/* ============================================================
   VERIFIER LE JURY
============================================================ */

async function getAuthorizedJury(
  juryId: string,
) {
  const centreId = await getCentreId();

  if (!juryId) {
    throw new Error(
      "Identifiant du jury manquant.",
    );
  }

  const jury =
    await prisma.jury.findFirst({
      where: {
        id: juryId,
        centreId,
      },

      select: {
        id: true,
        centreId: true,
        sessionId: true,
        nom: true,
        statut: true,
      },
    });

  if (!jury) {
    throw new Error(
      "Jury introuvable ou accès non autorisé.",
    );
  }

  return {
    centreId,
    jury,
  };
}

/* ============================================================
   ============================================================
   MEMBRES DU JURY
   ============================================================
============================================================ */

/* ============================================================
   GET MEMBRES
============================================================ */

export async function getMembresJury(
  juryId: string,
) {
  try {
    await getAuthorizedJury(juryId);

    const membres =
      await prisma.membreJury.findMany({
        where: {
          juryId,
        },

        orderBy: [
          {
            role: "asc",
          },
          {
            nom: "asc",
          },
          {
            prenom: "asc",
          },
        ],
      });

    return {
      success: true,
      data: membres,
    };
  } catch (error) {
    console.error(
      "GET MEMBRES JURY:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les membres du jury.",
      data: [],
    };
  }
}

/* ============================================================
   GET MEMBRE
============================================================ */

export async function getMembreJuryById(
  id: string,
) {
  try {
    const centreId = await getCentreId();

    const membre =
      await prisma.membreJury.findFirst({
        where: {
          id,

          jury: {
            centreId,
          },
        },

        include: {
          jury: {
            include: {
              session: {
                include: {
                  formation: true,
                },
              },
            },
          },
        },
      });

    if (!membre) {
      return {
        success: false,
        message:
          "Membre du jury introuvable.",
      };
    }

    return {
      success: true,
      data: membre,
    };
  } catch (error) {
    console.error(
      "GET MEMBRE JURY:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer le membre.",
    };
  }
}

/* ============================================================
   CREATE MEMBRE
============================================================ */

export async function createMembreJury(
  juryId: string,
  data: MembreInput,
) {
  try {
    await getAuthorizedJury(juryId);

    const prenom =
      data.prenom?.trim();

    const nom =
      data.nom?.trim();

    if (!prenom) {
      return {
        success: false,
        message:
          "Le prénom du membre est obligatoire.",
      };
    }

    if (!nom) {
      return {
        success: false,
        message:
          "Le nom du membre est obligatoire.",
      };
    }

    const email =
      clean(data.email);

    /*
     * On évite les doublons évidents
     * dans le même jury.
     */
    const existing =
      await prisma.membreJury.findFirst({
        where: {
          juryId,
          prenom,
          nom,
        },

        select: {
          id: true,
        },
      });

    if (existing) {
      return {
        success: false,
        message:
          "Ce membre est déjà présent dans ce jury.",
      };
    }

    /*
     * Un jury doit idéalement avoir
     * un seul président.
     */
    if (
      data.role === "PRESIDENT"
    ) {
      const president =
        await prisma.membreJury.findFirst({
          where: {
            juryId,
            role: "PRESIDENT",
          },

          select: {
            id: true,
          },
        });

      if (president) {
        return {
          success: false,
          message:
            "Ce jury possède déjà un président.",
        };
      }
    }

    const membre =
      await prisma.membreJury.create({
        data: {
          juryId,

          prenom,
          nom,

          email,

          telephone:
            clean(data.telephone),

          organisme:
            clean(data.organisme),

          role:
            data.role ?? "MEMBRE",
        },
      });

    return {
      success: true,
      message:
        "Membre ajouté au jury avec succès.",
      data: membre,
    };
  } catch (error) {
    console.error(
      "CREATE MEMBRE JURY:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible d'ajouter le membre.",
    };
  }
}

/* ============================================================
   UPDATE MEMBRE
============================================================ */

export async function updateMembreJury(
  id: string,
  data: MembreInput,
) {
  try {
    const centreId =
      await getCentreId();

    const membre =
      await prisma.membreJury.findFirst({
        where: {
          id,

          jury: {
            centreId,
          },
        },

        select: {
          id: true,
          juryId: true,
        },
      });

    if (!membre) {
      return {
        success: false,
        message:
          "Membre introuvable ou accès non autorisé.",
      };
    }

    const prenom =
      data.prenom?.trim();

    const nom =
      data.nom?.trim();

    if (!prenom || !nom) {
      return {
        success: false,
        message:
          "Le prénom et le nom sont obligatoires.",
      };
    }

    const duplicate =
      await prisma.membreJury.findFirst({
        where: {
          juryId: membre.juryId,
          prenom,
          nom,

          NOT: {
            id,
          },
        },

        select: {
          id: true,
        },
      });

    if (duplicate) {
      return {
        success: false,
        message:
          "Un autre membre porte déjà ce nom dans ce jury.",
      };
    }

    if (
      data.role === "PRESIDENT"
    ) {
      const president =
        await prisma.membreJury.findFirst({
          where: {
            juryId: membre.juryId,
            role: "PRESIDENT",

            NOT: {
              id,
            },
          },

          select: {
            id: true,
          },
        });

      if (president) {
        return {
          success: false,
          message:
            "Ce jury possède déjà un président.",
        };
      }
    }

    const updated =
      await prisma.membreJury.update({
        where: {
          id,
        },

        data: {
          prenom,
          nom,

          email:
            clean(data.email),

          telephone:
            clean(data.telephone),

          organisme:
            clean(data.organisme),

          role:
            data.role ?? "MEMBRE",
        },
      });

    return {
      success: true,
      message:
        "Membre du jury modifié avec succès.",
      data: updated,
    };
  } catch (error) {
    console.error(
      "UPDATE MEMBRE JURY:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de modifier le membre.",
    };
  }
}

/* ============================================================
   DELETE MEMBRE
============================================================ */

export async function deleteMembreJury(
  id: string,
) {
  try {
    const centreId =
      await getCentreId();

    const membre =
      await prisma.membreJury.findFirst({
        where: {
          id,

          jury: {
            centreId,
          },
        },

        include: {
          jury: {
            select: {
              id: true,
              statut: true,
            },
          },

          _count: {
            select: {
              evaluations: true,
            },
          },
        },
      });

    if (!membre) {
      return {
        success: false,
        message:
          "Membre introuvable ou accès non autorisé.",
      };
    }

    /*
     * Un membre qui possède déjà
     * des évaluations ne doit pas être
     * supprimé silencieusement.
     */
    if (
      membre._count.evaluations > 0
    ) {
      return {
        success: false,
        message:
          "Ce membre possède déjà des évaluations. Il ne peut pas être supprimé.",
      };
    }

    await prisma.membreJury.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      message:
        "Membre supprimé du jury.",
    };
  } catch (error) {
    console.error(
      "DELETE MEMBRE JURY:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de supprimer le membre.",
    };
  }
}

/* ============================================================
   ============================================================
   INSCRIPTIONS DISPONIBLES POUR LE JURY
   ============================================================
============================================================ */

export async function getJuryInscriptionOptions(
  juryId: string,
) {
  try {
    const { jury } =
      await getAuthorizedJury(
        juryId,
      );

    const inscriptions =
      await prisma.inscription.findMany({
        where: {
          sessionId:
            jury.sessionId,

          /*
           * On récupère les inscriptions
           * de la session du jury.
           */
          statut: {
            notIn: ["ANNULEE"],
          },
        },

        include: {
          apprenant: {
            select: {
              id: true,
              numero: true,
              prenom: true,
              nom: true,
              email: true,
              telephone: true,
            },
          },

          session: {
            include: {
              formation: {
                select: {
                  id: true,
                  code: true,
                  nom: true,
                },
              },
            },
          },
        },

        orderBy: {
          apprenant: {
            nom: "asc",
          },
        },
      });

    return {
      success: true,
      data: inscriptions,
    };
  } catch (error) {
    console.error(
      "GET JURY INSCRIPTION OPTIONS:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les candidats.",
      data: [],
    };
  }
}

/* ============================================================
   ============================================================
   EVALUATIONS DU JURY
   ============================================================
============================================================ */

/* ============================================================
   GET EVALUATIONS
============================================================ */

export async function getEvaluationsJury(
  juryId: string,
) {
  try {
    await getAuthorizedJury(juryId);

    const evaluations =
      await prisma.evaluationJury.findMany({
        where: {
          juryId,
        },

        include: {
          apprenant: {
            select: {
              id: true,
              numero: true,
              prenom: true,
              nom: true,
              email: true,
              telephone: true,
            },
          },

          inscription: {
            select: {
              id: true,
              numero: true,
              statut: true,
            },
          },

          membreJury: {
            select: {
              id: true,
              prenom: true,
              nom: true,
              role: true,
              organisme: true,
            },
          },
        },

        orderBy: {
          apprenant: {
            nom: "asc",
          },
        },
      });

    return {
      success: true,
      data: evaluations,
    };
  } catch (error) {
    console.error(
      "GET EVALUATIONS JURY:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les évaluations.",
      data: [],
    };
  }
}

/* ============================================================
   GET EVALUATION
============================================================ */

export async function getEvaluationJuryById(
  id: string,
) {
  try {
    const centreId =
      await getCentreId();

    const evaluation =
      await prisma.evaluationJury.findFirst({
        where: {
          id,

          jury: {
            centreId,
          },
        },

        include: {
          jury: {
            include: {
              session: {
                include: {
                  formation: true,
                },
              },
            },
          },

          apprenant: true,

          inscription: true,

          membreJury: true,
        },
      });

    if (!evaluation) {
      return {
        success: false,
        message:
          "Évaluation du jury introuvable.",
      };
    }

    return {
      success: true,
      data: evaluation,
    };
  } catch (error) {
    console.error(
      "GET EVALUATION JURY:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer l'évaluation.",
    };
  }
}

/* ============================================================
   CREATE EVALUATION JURY
============================================================ */

export async function createEvaluationJury(
  data: EvaluationInput,
) {
  try {
    const { jury } =
      await getAuthorizedJury(
        data.juryId,
      );

    if (!data.inscriptionId) {
      return {
        success: false,
        message:
          "L'inscription de l'apprenant est obligatoire.",
      };
    }

    if (!data.apprenantId) {
      return {
        success: false,
        message:
          "L'apprenant est obligatoire.",
      };
    }

    if (!data.membreJuryId) {
      return {
        success: false,
        message:
          "Le membre du jury est obligatoire.",
      };
    }

    /* ========================================================
       VERIFIER L'INSCRIPTION
    ======================================================== */

    const inscription =
      await prisma.inscription.findFirst({
        where: {
          id: data.inscriptionId,

          sessionId:
            jury.sessionId,

          apprenantId:
            data.apprenantId,
        },

        select: {
          id: true,
          apprenantId: true,
          sessionId: true,
        },
      });

    if (!inscription) {
      return {
        success: false,
        message:
          "L'inscription ne correspond pas à la session et à l'apprenant sélectionnés.",
      };
    }

    /* ========================================================
       VERIFIER LE MEMBRE
    ======================================================== */

    const membre =
      await prisma.membreJury.findFirst({
        where: {
          id: data.membreJuryId,
          juryId: data.juryId,
        },

        select: {
          id: true,
        },
      });

    if (!membre) {
      return {
        success: false,
        message:
          "Le membre sélectionné n'appartient pas à ce jury.",
      };
    }

    /* ========================================================
       NOTE
    ======================================================== */

    let note:
      | number
      | null =
      data.note ?? null;

    if (note !== null) {
      note = Number(note);

      if (
        !Number.isFinite(note) ||
        note < 0 ||
        note > 100
      ) {
        return {
          success: false,
          message:
            "La note doit être comprise entre 0 et 100.",
        };
      }
    }

    /* ========================================================
       DOUBLON
    ======================================================== */

    const existing =
      await prisma.evaluationJury.findFirst({
        where: {
          juryId: data.juryId,
          inscriptionId:
            data.inscriptionId,
          membreJuryId:
            data.membreJuryId,
        },

        select: {
          id: true,
        },
      });

    if (existing) {
      return {
        success: false,
        message:
          "Ce membre a déjà évalué cet apprenant dans ce jury.",
      };
    }

    /* ========================================================
       CREATE
    ======================================================== */

    const evaluation =
      await prisma.evaluationJury.create({
        data: {
          juryId:
            data.juryId,

          inscriptionId:
            data.inscriptionId,

          apprenantId:
            data.apprenantId,

          membreJuryId:
            data.membreJuryId,

          note,

          decision:
            data.decision ??
            null,

          commentaire:
            clean(
              data.commentaire,
            ),
        },

        include: {
          apprenant: true,
          membreJury: true,
        },
      });

    return {
      success: true,
      message:
        "Évaluation du jury enregistrée.",
      data: evaluation,
    };
  } catch (error) {
    console.error(
      "CREATE EVALUATION JURY:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer l'évaluation.",
    };
  }
}

/* ============================================================
   UPDATE EVALUATION JURY
============================================================ */

export async function updateEvaluationJury(
  id: string,
  data: EvaluationInput,
) {
  try {
    const centreId =
      await getCentreId();

    const existing =
      await prisma.evaluationJury.findFirst({
        where: {
          id,

          jury: {
            centreId,
          },
        },

        select: {
          id: true,
          juryId: true,
          inscriptionId: true,
          membreJuryId: true,
        },
      });

    if (!existing) {
      return {
        success: false,
        message:
          "Évaluation introuvable ou accès non autorisé.",
      };
    }

    const note =
      data.note === null ||
      data.note === undefined
        ? null
        : Number(data.note);

    if (
      note !== null &&
      (!Number.isFinite(note) ||
        note < 0 ||
        note > 100)
    ) {
      return {
        success: false,
        message:
          "La note doit être comprise entre 0 et 100.",
      };
    }

    const updated =
      await prisma.evaluationJury.update({
        where: {
          id,
        },

        data: {
          note,

          decision:
            data.decision ??
            null,

          commentaire:
            clean(
              data.commentaire,
            ),
        },

        include: {
          apprenant: true,
          membreJury: true,
        },
      });

    return {
      success: true,
      message:
        "Évaluation du jury modifiée.",
      data: updated,
    };
  } catch (error) {
    console.error(
      "UPDATE EVALUATION JURY:",
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
   DELETE EVALUATION JURY
============================================================ */

export async function deleteEvaluationJury(
  id: string,
) {
  try {
    const centreId =
      await getCentreId();

    const evaluation =
      await prisma.evaluationJury.findFirst({
        where: {
          id,

          jury: {
            centreId,
          },
        },

        select: {
          id: true,
          jury: {
            select: {
              statut: true,
            },
          },
        },
      });

    if (!evaluation) {
      return {
        success: false,
        message:
          "Évaluation introuvable ou accès non autorisé.",
      };
    }

    if (
      evaluation.jury.statut ===
      "TERMINE"
    ) {
      return {
        success: false,
        message:
          "Les évaluations d'un jury terminé ne peuvent plus être supprimées.",
      };
    }

    await prisma.evaluationJury.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      message:
        "Évaluation du jury supprimée.",
    };
  } catch (error) {
    console.error(
      "DELETE EVALUATION JURY:",
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
   RECALCULER LA DECISION D'UN APPRENANT
============================================================ */

export async function calculerDecisionJury(
  juryId: string,
  inscriptionId: string,
) {
  try {
    await getAuthorizedJury(
      juryId,
    );

    const evaluations =
      await prisma.evaluationJury.findMany({
        where: {
          juryId,
          inscriptionId,
          note: {
            not: null,
          },
        },

        select: {
          note: true,
        },
      });

    if (!evaluations.length) {
      return {
        success: false,
        message:
          "Aucune note disponible pour calculer la décision.",
      };
    }

    const notes = evaluations
      .map((item) =>
        Number(item.note),
      )
      .filter((note) =>
        Number.isFinite(note),
      );

    if (!notes.length) {
      return {
        success: false,
        message:
          "Aucune note valide disponible.",
      };
    }

    const moyenne =
      notes.reduce(
        (total, note) =>
          total + note,
        0,
      ) / notes.length;

    /*
     * Ici, 50% est utilisé comme
     * règle technique par défaut.
     *
     * Cette règle pourra ensuite être
     * remplacée par un paramètre du
     * centre ou du modèle de formation.
     */
    let decision:
      | DecisionJury;

    if (moyenne >= 50) {
      decision = "ADMIS";
    } else {
      decision = "AJOURNE";
    }

    return {
      success: true,
      data: {
        moyenne,
        decision,
        nombreEvaluations:
          notes.length,
      },
    };
  } catch (error) {
    console.error(
      "CALCULER DECISION JURY:",
      error,
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de calculer la décision.",
    };
  }
}