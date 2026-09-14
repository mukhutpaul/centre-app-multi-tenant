"use server";

import { Prisma } from "@/generated/prisma/client";
import { StatutInscription, TypeFinancement } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getCurrentCentreContext } from "@/lib/validations/centre-access";


type InscriptionInput = {
  apprenantId: string;
  sessionId: string;
  statut: StatutInscription;
  typeFinancement: TypeFinancement;
  dateInscription: string;
  montantConvenu: string;
  notes?: string;
};

async function getCentreId() {
  const context = await getCurrentCentreContext();

  if (!context.centreId) {
    throw new Error(
      "Aucun centre actif n'est associé à votre compte.",
    );
  }

  return context.centreId;
}

/**
 * Vérifie qu'un apprenant appartient bien au centre.
 */
async function verifierApprenant(
  apprenantId: string,
  centreId: string,
) {
  const apprenant = await prisma.apprenant.findFirst({
    where: {
      id: apprenantId,
      centreId,
    },
  });

  if (!apprenant) {
    throw new Error(
      "L'apprenant sélectionné n'appartient pas à votre centre.",
    );
  }

  return apprenant;
}

/**
 * Vérifie qu'une session appartient bien au centre.
 */
async function verifierSession(
  sessionId: string,
  centreId: string,
) {
  const session = await prisma.sessionFormation.findFirst({
    where: {
      id: sessionId,
      centreId,
    },
    include: {
      formation: true,
    },
  });

  if (!session) {
    throw new Error(
      "La session sélectionnée n'appartient pas à votre centre.",
    );
  }

  return session;
}

/**
 * Génère un numéro d'inscription.
 *
 * Exemple :
 * INS-2026-0001
 * INS-2026-0002
 */
async function genererNumeroInscription(
  centreId: string,
) {
  const annee = new Date().getFullYear();

  const inscriptions = await prisma.inscription.findMany({
    where: {
      session: {
        centreId,
      },
      numero: {
        startsWith: `INS-${annee}-`,
      },
    },
    select: {
      numero: true,
    },
  });

  let maximum = 0;

  for (const inscription of inscriptions) {
    const partie = inscription.numero.split("-").pop();

    const numero = Number(partie);

    if (!Number.isNaN(numero) && numero > maximum) {
      maximum = numero;
    }
  }

  const suivant = maximum + 1;

  return `INS-${annee}-${String(suivant).padStart(4, "0")}`;
}

/**
 * LISTE
 */
export async function getInscriptions() {
  const centreId = await getCentreId();

  return prisma.inscription.findMany({
    where: {
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
    orderBy: {
      dateInscription: "desc",
    },
  });
}

/**
 * DONNÉES DU FORMULAIRE
 */
export async function getInscriptionFormData() {
  const centreId = await getCentreId();

  const [apprenants, sessions] = await Promise.all([
    prisma.apprenant.findMany({
      where: {
        centreId,
        statut: "ACTIF",
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

    prisma.sessionFormation.findMany({
      where: {
        centreId,
        statut: {
          notIn: ["TERMINEE", "ANNULEE"],
        },
      },
      include: {
        formation: true,
      },
      orderBy: {
        dateDebut: "asc",
      },
    }),
  ]);

  return {
    apprenants,
    sessions,
  };
}

/**
 * CRÉATION
 */
export async function createInscription(
  data: InscriptionInput,
) {
  const centreId = await getCentreId();

  if (!data.apprenantId) {
    throw new Error("Veuillez sélectionner un apprenant.");
  }

  if (!data.sessionId) {
    throw new Error("Veuillez sélectionner une session.");
  }

  await verifierApprenant(
    data.apprenantId,
    centreId,
  );

  const session = await verifierSession(
    data.sessionId,
    centreId,
  );

  /**
   * Vérification de capacité
   */
  if (session.capacite) {
    const nombreInscriptions =
      await prisma.inscription.count({
        where: {
          sessionId: data.sessionId,
          statut: {
            notIn: ["ANNULEE"],
          },
        },
      });

    if (nombreInscriptions >= session.capacite) {
      throw new Error(
        "La capacité maximale de cette session est atteinte.",
      );
    }
  }

  /**
   * Vérification doublon apprenant/session
   */
  const existante =
    await prisma.inscription.findUnique({
      where: {
        apprenantId_sessionId: {
          apprenantId: data.apprenantId,
          sessionId: data.sessionId,
        },
      },
    });

  if (existante) {
    throw new Error(
      "Cet apprenant est déjà inscrit à cette session.",
    );
  }

  const montant = Number(data.montantConvenu || 0);

  if (Number.isNaN(montant) || montant < 0) {
    throw new Error(
      "Le montant convenu est invalide.",
    );
  }

  const dateInscription = data.dateInscription
    ? new Date(data.dateInscription)
    : new Date();

  if (Number.isNaN(dateInscription.getTime())) {
    throw new Error(
      "La date d'inscription est invalide.",
    );
  }

  /**
   * Transaction pour sécuriser la création.
   */
  const inscription =
    await prisma.$transaction(async (tx) => {
      const numero =
        await genererNumeroInscription(centreId);

      return tx.inscription.create({
        data: {
          apprenantId: data.apprenantId,
          sessionId: data.sessionId,
          numero,
          statut: data.statut,
          typeFinancement: data.typeFinancement,
          dateInscription,
          montantConvenu: new Prisma.Decimal(
            montant,
          ),
          notes: data.notes?.trim() || null,
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
    });

  return {
    success: true,
    message: "Inscription créée avec succès.",
    inscription,
  };
}

/**
 * MODIFICATION
 */
export async function updateInscription(
  id: string,
  data: InscriptionInput,
) {
  const centreId = await getCentreId();

  const inscription =
    await prisma.inscription.findFirst({
      where: {
        id,
        session: {
          centreId,
        },
      },
    });

  if (!inscription) {
    throw new Error(
      "Inscription introuvable dans votre centre.",
    );
  }

  await verifierApprenant(
    data.apprenantId,
    centreId,
  );

  await verifierSession(
    data.sessionId,
    centreId,
  );

  /**
   * Vérification doublon.
   */
  const doublon =
    await prisma.inscription.findFirst({
      where: {
        apprenantId: data.apprenantId,
        sessionId: data.sessionId,
        id: {
          not: id,
        },
      },
    });

  if (doublon) {
    throw new Error(
      "Cet apprenant est déjà inscrit à cette session.",
    );
  }

  const montant = Number(data.montantConvenu || 0);

  if (Number.isNaN(montant) || montant < 0) {
    throw new Error(
      "Le montant convenu est invalide.",
    );
  }

  const dateInscription = new Date(
    data.dateInscription,
  );

  if (Number.isNaN(dateInscription.getTime())) {
    throw new Error(
      "La date d'inscription est invalide.",
    );
  }

  const updated =
    await prisma.inscription.update({
      where: {
        id,
      },
      data: {
        apprenantId: data.apprenantId,
        sessionId: data.sessionId,
        statut: data.statut,
        typeFinancement: data.typeFinancement,
        dateInscription,
        montantConvenu: new Prisma.Decimal(
          montant,
        ),
        notes: data.notes?.trim() || null,
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

  return {
    success: true,
    message: "Inscription modifiée avec succès.",
    inscription: updated,
  };
}

/**
 * SUPPRESSION
 */
export async function deleteInscription(
  id: string,
) {
  const centreId = await getCentreId();

  const inscription =
    await prisma.inscription.findFirst({
      where: {
        id,
        session: {
          centreId,
        },
      },
      include: {
        _count: {
          select: {
            factures: true,
            paiements: true,
            echeances: true,
            presences: true,
            evaluations: true,
            evaluationsJury: true,
          },
        },
      },
    });

  if (!inscription) {
    throw new Error(
      "Inscription introuvable dans votre centre.",
    );
  }

  const dependances =
    inscription._count.factures +
    inscription._count.paiements +
    inscription._count.echeances +
    inscription._count.presences +
    inscription._count.evaluations +
    inscription._count.evaluationsJury;

  if (dependances > 0) {
    throw new Error(
      "Cette inscription ne peut pas être supprimée car elle possède déjà des données liées (factures, paiements, présences ou évaluations).",
    );
  }

  await prisma.inscription.delete({
    where: {
      id,
    },
  });

  return {
    success: true,
    message: "Inscription supprimée avec succès.",
  };
}

export async function getInscriptionById(
  id: string,
) {
  const centreId = await getCentreId();

  const inscription =
    await prisma.inscription.findFirst({
      where: {
        id,
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

        _count: {
          select: {
            factures: true,
            paiements: true,
            echeances: true,
            presences: true,
            evaluations: true,
            evaluationsJury: true,
          },
        },
      },
    });

  if (!inscription) {
    throw new Error(
      "Inscription introuvable dans votre centre.",
    );
  }

  return inscription;
}