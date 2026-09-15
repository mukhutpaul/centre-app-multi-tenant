"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentCentreContext } from "@/lib/validations/centre-access";

const PRESENCES_PATH = "/presences";

const STATUTS_PRESENCE = [
  "PRESENT",
  "ABSENT",
  "RETARD",
  "EXCUSE",
] as const;

type StatutPresence =
  (typeof STATUTS_PRESENCE)[number];

/* =========================================================
   CENTRE COURANT
========================================================= */

async function getCentreId() {
  const context =
    await getCurrentCentreContext();

  if (!context.centreId) {
    throw new Error(
      "Aucun centre actif n'est associé à votre compte.",
    );
  }

  return context.centreId;
}

/* =========================================================
   TYPES
========================================================= */

type PresenceInput = {
  planningId: string;
  inscriptionId: string;
  statut: StatutPresence;
  heureArrivee?: string | null;
  heureDepart?: string | null;
  minutesRetard?: number | null;
  motif?: string | null;
  commentaire?: string | null;
};

/* =========================================================
   PLANNINGS
========================================================= */

export async function getPresencePlannings() {
  const centreId =
    await getCentreId();

  return prisma.planning.findMany({
    where: {
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

      salle: true,

      _count: {
        select: {
          presences: true,
        },
      },
    },

    orderBy: {
      debut: "desc",
    },
  });
}

/* =========================================================
   TABLE DE PRESENCE
========================================================= */

export async function getPresenceTable(
  planningId: string,
) {
  const centreId =
    await getCentreId();

  if (!planningId) {
    throw new Error(
      "Planning manquant.",
    );
  }

  const planning =
    await prisma.planning.findFirst({
      where: {
        id: planningId,

        session: {
          centreId,
        },
      },

      include: {
        session: {
          include: {
            formation: true,
            centre: true,
          },
        },

        salle: true,
      },
    });

  if (!planning) {
    throw new Error(
      "Planning introuvable dans votre centre.",
    );
  }

  const inscriptions =
    await prisma.inscription.findMany({
      where: {
        sessionId:
          planning.sessionId,

        statut: {
          in: [
            "CONFIRMEE",
            "ACTIVE",
            "TERMINEE",
          ],
        },
      },

      include: {
        apprenant: true,

        presences: {
          where: {
            planningId,
          },
        },
      },

      orderBy: [
        {
          apprenant: {
            nom: "asc",
          },
        },
        {
          apprenant: {
            prenom: "asc",
          },
        },
      ],
    });

  const rows =
    inscriptions.map(
      (inscription) => ({
        inscription,
        presence:
          inscription.presences[0] ??
          null,
      }),
    );

  const statistiques = {
    total: rows.length,

    presents: rows.filter(
      (row) =>
        row.presence?.statut ===
        "PRESENT",
    ).length,

    retards: rows.filter(
      (row) =>
        row.presence?.statut ===
        "RETARD",
    ).length,

    absents: rows.filter(
      (row) =>
        row.presence?.statut ===
        "ABSENT",
    ).length,

    excuses: rows.filter(
      (row) =>
        row.presence?.statut ===
        "EXCUSE",
    ).length,

    nonMarques: rows.filter(
      (row) =>
        !row.presence,
    ).length,
  };

  return {
    planning,
    rows,
    statistiques,
  };
}

/* =========================================================
   PRESENCE PAR ID
========================================================= */

export async function getPresenceById(
  id: string,
) {
  const centreId =
    await getCentreId();

  const presence =
    await prisma.presence.findFirst({
      where: {
        id,

        planning: {
          session: {
            centreId,
          },
        },
      },

      include: {
        planning: {
          include: {
            session: {
              include: {
                formation: true,
              },
            },

            salle: true,
          },
        },

        inscription: {
          include: {
            apprenant: true,
          },
        },
      },
    });

  if (!presence) {
    throw new Error(
      "Présence introuvable dans votre centre.",
    );
  }

  return presence;
}

/* =========================================================
   CALCUL RETARD
========================================================= */

function calculerMinutesRetard(
  debut: Date,
  arrivee: Date,
) {
  const difference =
    arrivee.getTime() -
    debut.getTime();

  if (difference <= 0) {
    return 0;
  }

  return Math.floor(
    difference / 60000,
  );
}

/* =========================================================
   CREATION MANUELLE
========================================================= */

export async function createPresence(
  data: PresenceInput,
) {
  try {
    const centreId =
      await getCentreId();

    if (
      !data.planningId ||
      !data.inscriptionId
    ) {
      return {
        success: false,
        message:
          "Le planning et l'inscription sont obligatoires.",
      };
    }

    if (
      !STATUTS_PRESENCE.includes(
        data.statut,
      )
    ) {
      return {
        success: false,
        message:
          "Statut de présence invalide.",
      };
    }

    const planning =
      await prisma.planning.findFirst({
        where: {
          id: data.planningId,

          session: {
            centreId,
          },
        },
      });

    if (!planning) {
      return {
        success: false,
        message:
          "Planning introuvable dans votre centre.",
      };
    }

    const inscription =
      await prisma.inscription.findFirst({
        where: {
          id: data.inscriptionId,

          session: {
            id: planning.sessionId,
            centreId,
          },
        },

        include: {
          apprenant: true,
        },
      });

    if (!inscription) {
      return {
        success: false,
        message:
          "Inscription introuvable dans ce planning.",
      };
    }

    const existing =
      await prisma.presence.findUnique({
        where: {
          planningId_inscriptionId: {
            planningId:
              data.planningId,

            inscriptionId:
              data.inscriptionId,
          },
        },
      });

    if (existing) {
      return {
        success: false,
        message:
          "La présence de cet apprenant existe déjà.",
      };
    }

    const heureArrivee =
      data.heureArrivee
        ? new Date(
            data.heureArrivee,
          )
        : data.statut === "PRESENT" ||
            data.statut === "RETARD"
          ? new Date()
          : null;

    let minutesRetard =
      data.minutesRetard ??
      null;

    if (
      heureArrivee &&
      (data.statut === "PRESENT" ||
        data.statut === "RETARD")
    ) {
      minutesRetard =
        calculerMinutesRetard(
          planning.debut,
          heureArrivee,
        );
    }

    const presence =
      await prisma.presence.create({
        data: {
          planningId:
            data.planningId,

          inscriptionId:
            data.inscriptionId,

          statut:
            data.statut,

          heureArrivee,

          heureDepart:
            data.heureDepart
              ? new Date(
                  data.heureDepart,
                )
              : null,

          minutesRetard,

          motif:
            data.motif?.trim() ||
            null,

          commentaire:
            data.commentaire?.trim() ||
            null,
        },

        include: {
          inscription: {
            include: {
              apprenant: true,
            },
          },
        },
      });

    revalidatePath(
      PRESENCES_PATH,
    );

    return {
      success: true,

      message: `Présence enregistrée pour ${presence.inscription.apprenant.prenom} ${presence.inscription.apprenant.nom}.`,

      presence,
    };
  } catch (error) {
    console.error(
      "CREATE PRESENCE:",
      error,
    );

    return {
      success: false,
      message:
        "Impossible d'enregistrer la présence.",
    };
  }
}

/* =========================================================
   QR CODE
========================================================= */

export async function enregistrerPresenceParQr(
  qrValue: string,
) {
  try {
    const centreId =
      await getCentreId();

    const value =
      qrValue.trim();

    if (!value) {
      return {
        success: false,
        type: "ERROR",
        message:
          "QR Code vide.",
      };
    }

    /* -----------------------------------------------------
       FORMAT ATTENDU
       CF-INS:<inscriptionId>
    ----------------------------------------------------- */

    if (
      !value.startsWith(
        "CF-INS:",
      )
    ) {
      return {
        success: false,
        type: "ERROR",
        message:
          "Ce QR Code n'est pas un badge apprenant valide.",
      };
    }

    const inscriptionId =
      value
        .substring(
          "CF-INS:".length,
        )
        .trim();

    if (!inscriptionId) {
      return {
        success: false,
        type: "ERROR",
        message:
          "Identifiant d'inscription absent du QR Code.",
      };
    }

    /* -----------------------------------------------------
       INSCRIPTION + CENTRE
    ----------------------------------------------------- */

    const inscription =
      await prisma.inscription.findFirst({
        where: {
          id: inscriptionId,

          session: {
            centreId,
          },
        },

        include: {
          apprenant: true,

          session: {
            include: {
              formation: true,
            },
          },
        },
      });

    if (!inscription) {
      return {
        success: false,
        type: "ERROR",
        message:
          "Ce badge n'appartient pas à votre centre.",
      };
    }

    /* -----------------------------------------------------
       VERIFICATION STATUT INSCRIPTION
    ----------------------------------------------------- */

    if (
      ![
        "CONFIRMEE",
        "ACTIVE",
      ].includes(
        inscription.statut,
      )
    ) {
      return {
        success: false,
        type: "WARNING",
        message:
          "Cette inscription n'est pas active pour le contrôle des présences.",
      };
    }

    /* -----------------------------------------------------
       RECHERCHE DU COURS ACTUEL
    ----------------------------------------------------- */

    const maintenant =
      new Date();

    const plannings =
      await prisma.planning.findMany({
        where: {
          sessionId:
            inscription.sessionId,

          debut: {
            lte: maintenant,
          },

          fin: {
            gte: maintenant,
          },
        },

        include: {
          session: {
            include: {
              formation: true,
            },
          },

          salle: true,
        },

        orderBy: {
          debut: "asc",
        },
      });

    /* -----------------------------------------------------
       AUCUN COURS EN COURS
    ----------------------------------------------------- */

    if (plannings.length === 0) {
      return {
        success: false,
        type: "WARNING",
        message:
          "Aucun cours n'est actuellement en cours pour cette session.",
      };
    }

    /* -----------------------------------------------------
       PLUSIEURS COURS EN MEME TEMPS
    ----------------------------------------------------- */

    if (plannings.length > 1) {
      return {
        success: false,
        type: "WARNING",
        message:
          "Plusieurs cours sont actuellement en cours pour cette session. Impossible de déterminer le planning.",
      };
    }

    const planning =
      plannings[0];

    /* -----------------------------------------------------
       VERIFICATION DOUBLE SCAN
    ----------------------------------------------------- */

    const existing =
      await prisma.presence.findUnique({
        where: {
          planningId_inscriptionId: {
            planningId:
              planning.id,

            inscriptionId:
              inscription.id,
          },
        },

        include: {
          planning: true,
        },
      });

    if (existing) {
      const nom =
        [
          inscription.apprenant.prenom,
          inscription.apprenant.nom,
        ]
          .filter(Boolean)
          .join(" ");

      return {
        success: false,

        type: "DUPLICATE",

        message: `${nom} a déjà été enregistré(e) pour ce cours.`,

        presence: existing,
      };
    }

    /* -----------------------------------------------------
       CALCUL RETARD
    ----------------------------------------------------- */

    const minutesRetard =
      calculerMinutesRetard(
        planning.debut,
        maintenant,
      );

    const statut =
      minutesRetard > 0
        ? "RETARD"
        : "PRESENT";

    /* -----------------------------------------------------
       CREATION
    ----------------------------------------------------- */

    const presence =
      await prisma.presence.create({
        data: {
          planningId:
            planning.id,

          inscriptionId:
            inscription.id,

          statut,

          heureArrivee:
            maintenant,

          minutesRetard:
            minutesRetard > 0
              ? minutesRetard
              : 0,
        },

        include: {
          inscription: {
            include: {
              apprenant: true,
            },
          },

          planning: {
            include: {
              session: {
                include: {
                  formation: true,
                },
              },

              salle: true,
            },
          },
        },
      });

    revalidatePath(
      PRESENCES_PATH,
    );

    return {
      success: true,

      type:
        statut === "RETARD"
          ? "RETARD"
          : "PRESENT",

      message:
        statut === "RETARD"
          ? `Retard enregistré : ${minutesRetard} minute(s).`
          : "Présence enregistrée avec succès.",

      presence,

      apprenant: {
        id:
          inscription
            .apprenant.id,

        nom:
          inscription
            .apprenant.nom,

        prenom:
          inscription
            .apprenant.prenom,
      },

      formation:
        inscription.session
          .formation,

      session:
        inscription.session,

      planning,
    };
  } catch (error) {
    console.error(
      "QR PRESENCE:",
      error,
    );

    return {
      success: false,
      type: "ERROR",
      message:
        "Impossible d'enregistrer la présence via le QR Code.",
    };
  }
}

/* =========================================================
   MODIFICATION
========================================================= */

export async function updatePresence(
  id: string,
  data: Omit<
    PresenceInput,
    "planningId" | "inscriptionId"
  >,
) {
  try {
    const centreId =
      await getCentreId();

    const existing =
      await prisma.presence.findFirst({
        where: {
          id,

          planning: {
            session: {
              centreId,
            },
          },
        },

        include: {
          planning: true,
        },
      });

    if (!existing) {
      return {
        success: false,
        message:
          "Présence introuvable dans votre centre.",
      };
    }

    const heureArrivee =
      data.heureArrivee
        ? new Date(
            data.heureArrivee,
          )
        : data.heureArrivee === null
          ? null
          : existing.heureArrivee;

    let minutesRetard =
      data.minutesRetard ??
      null;

    if (
      heureArrivee &&
      (data.statut === "PRESENT" ||
        data.statut === "RETARD")
    ) {
      minutesRetard =
        calculerMinutesRetard(
          existing.planning.debut,
          heureArrivee,
        );
    }

    await prisma.presence.update({
      where: {
        id,
      },

      data: {
        statut:
          data.statut,

        heureArrivee,

        heureDepart:
          data.heureDepart
            ? new Date(
                data.heureDepart,
              )
            : data.heureDepart === null
              ? null
              : existing.heureDepart,

        minutesRetard,

        motif:
          data.motif?.trim() ||
          null,

        commentaire:
          data.commentaire?.trim() ||
          null,
      },
    });

    revalidatePath(
      PRESENCES_PATH,
    );

    return {
      success: true,
      message:
        "Présence modifiée avec succès.",
    };
  } catch (error) {
    console.error(
      "UPDATE PRESENCE:",
      error,
    );

    return {
      success: false,
      message:
        "Impossible de modifier la présence.",
    };
  }
}

/* =========================================================
   SUPPRESSION
========================================================= */

export async function deletePresence(
  id: string,
) {
  try {
    const centreId =
      await getCentreId();

    const presence =
      await prisma.presence.findFirst({
        where: {
          id,

          planning: {
            session: {
              centreId,
            },
          },
        },
      });

    if (!presence) {
      return {
        success: false,
        message:
          "Présence introuvable dans votre centre.",
      };
    }

    await prisma.presence.delete({
      where: {
        id,
      },
    });

    revalidatePath(
      PRESENCES_PATH,
    );

    return {
      success: true,
      message:
        "Présence supprimée avec succès.",
    };
  } catch (error) {
    console.error(
      "DELETE PRESENCE:",
      error,
    );

    return {
      success: false,
      message:
        "Impossible de supprimer la présence.",
    };
  }
}