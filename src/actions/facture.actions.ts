"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentCentreContext } from "@/lib/validations/centre-access";

import {
  createFactureSchema,
  updateFactureSchema,
  type CreateFactureInput,
  type UpdateFactureInput,
} from "@/lib/validations/facture.schema";

import { Prisma } from "@/generated/prisma/client";

/* ============================================================
   UTILITAIRES
============================================================ */

function toDecimal(value: number | string) {
  return new Prisma.Decimal(value);
}

/**
 * Transforme récursivement les Decimal Prisma en string
 * afin de pouvoir transmettre les données aux Client Components.
 *
 * Les Date restent des Date, car Next.js les supporte.
 */
function serializeForClient<T>(value: T): T {
  if (value instanceof Prisma.Decimal) {
    return value.toString() as T;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeForClient(item)) as T;
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(
      value as Record<string, unknown>,
    )) {
      result[key] = serializeForClient(item);
    }

    return result as T;
  }

  return value;
}

/* ============================================================
   NUMÉRO FACTURE
============================================================ */

async function generateFactureNumero(
  tx: Prisma.TransactionClient,
  centreId: string,
) {
  const parametre = await tx.parametreCentre.findUnique({
    where: {
      centreId,
    },
    select: {
      prefixeFacture: true,
    },
  });

  const prefixe = parametre?.prefixeFacture || "FAC";

  const annee = new Date().getFullYear();

  const factures = await tx.facture.findMany({
    where: {
      centreId,

      numero: {
        startsWith: `${prefixe}-${annee}-`,
      },
    },

    select: {
      numero: true,
    },

    orderBy: {
      numero: "desc",
    },
  });

  let numero = 1;

  for (const facture of factures) {
    const match = facture.numero.match(
      new RegExp(`^${prefixe}-${annee}-(\\d+)$`),
    );

    if (match) {
      numero = Math.max(numero, Number(match[1]) + 1);
    }
  }

  let resultat = `${prefixe}-${annee}-${String(numero).padStart(4, "0")}`;

  while (
    await tx.facture.findFirst({
      where: {
        centreId,
        numero: resultat,
      },

      select: {
        id: true,
      },
    })
  ) {
    numero++;

    resultat = `${prefixe}-${annee}-${String(numero).padStart(4, "0")}`;
  }

  return resultat;
}

/* ============================================================
   RECALCUL FACTURE
============================================================ */

export async function recalculerFacture(
  tx: Prisma.TransactionClient,
  factureId: string,
) {
  const facture = await tx.facture.findUnique({
    where: {
      id: factureId,
    },
  });

  if (!facture) {
    throw new Error("Facture introuvable.");
  }

  const lignes = await tx.ligneFacture.findMany({
    where: {
      factureId,
    },
  });

  let sousTotal = new Prisma.Decimal(0);

  for (const ligne of lignes) {
    const total = ligne.quantite.mul(ligne.prixUnitaire);

    sousTotal = sousTotal.add(total);

    await tx.ligneFacture.update({
      where: {
        id: ligne.id,
      },

      data: {
        total,
      },
    });
  }

  const remise = facture.remise || new Prisma.Decimal(0);

  const taxe = facture.taxe || new Prisma.Decimal(0);

  const base = sousTotal.sub(remise);

  const total = base.add(taxe);

  if (total.lt(0)) {
    throw new Error("Le total de la facture ne peut pas être négatif.");
  }

  const paiements = await tx.paiement.aggregate({
    where: {
      factureId,

      statut: "EFFECTUE",
    },

    _sum: {
      montant: true,
    },
  });

  const montantPaye = paiements._sum.montant || new Prisma.Decimal(0);

  const montantDu = total.sub(montantPaye).gt(0)
    ? total.sub(montantPaye)
    : new Prisma.Decimal(0);

  let statut = facture.statut;

  if (statut !== "ANNULEE") {
    if (total.gt(0) && montantPaye.gte(total)) {
      statut = "PAYEE";
    } else if (montantPaye.gt(0)) {
      statut = "PARTIELLEMENT_PAYEE";
    } else if (facture.dateEcheance && facture.dateEcheance < new Date()) {
      statut = "EN_RETARD";
    } else if (statut !== "BROUILLON") {
      statut = "EMISE";
    }
  }

  return tx.facture.update({
    where: {
      id: factureId,
    },

    data: {
      sousTotal,
      total,
      montantPaye,
      montantDu,
      statut,
    },
  });
}

/* ============================================================
   LISTE
============================================================ */

export async function getFactures() {
  const context = await getCurrentCentreContext();

  if (!context.centreId) {
    throw new Error("Aucun centre actif n'est associé à votre compte.");
  }

  const factures = await prisma.facture.findMany({
    where: {
      centreId: context.centreId,
    },

    include: {
      inscription: {
        include: {
          apprenant: true,

          session: {
            include: {
              formation: true,
            },
          },
        },
      },

      lignes: true,

      paiements: {
        where: {
          statut: "EFFECTUE",
        },
      },

      echeances: {
        orderBy: {
          numero: "asc",
        },
      },
    },

    orderBy: {
      dateEmission: "desc",
    },
  });

  return serializeForClient(factures);
}

/* ============================================================
   DÉTAIL
============================================================ */

export async function getFactureById(id: string) {
  const context = await getCurrentCentreContext();

  if (!context.centreId) {
    throw new Error("Aucun centre actif n'est associé à votre compte.");
  }

  const facture = await prisma.facture.findFirst({
    where: {
      id,

      centreId: context.centreId,
    },

    include: {
      centre: true,

      inscription: {
        include: {
          apprenant: true,

          session: {
            include: {
              formation: true,
            },
          },
        },
      },

      lignes: {
        orderBy: {
          id: "asc",
        },
      },

      paiements: {
        orderBy: {
          creeLe: "desc",
        },
      },

      echeances: {
        orderBy: {
          numero: "asc",
        },

        include: {
          paiements: true,
        },
      },
    },
  });

  if (!facture) {
    return null;
  }

  return serializeForClient(facture);
}

/* ============================================================
   DONNÉES FORMULAIRE
============================================================ */

export async function getFactureFormData() {
  const context = await getCurrentCentreContext();

  if (!context.centreId) {
    throw new Error("Aucun centre actif n'est associé à votre compte.");
  }

  const inscriptions = await prisma.inscription.findMany({
    where: {
      session: {
        centreId: context.centreId,
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

  /*
   * IMPORTANT :
   * On ne retourne pas directement les objets Prisma.
   *
   * Le Client Component n'a besoin que de ces champs.
   * Cela évite notamment de transmettre :
   *
   * formation.dureeHeures = Decimal
   */
  return {
    inscriptions: inscriptions.map((inscription) => ({
      id: inscription.id,

      numero: inscription.numero,

      montantConvenu: inscription.montantConvenu.toString(),

      apprenant: {
        prenom: inscription.apprenant.prenom,

        nom: inscription.apprenant.nom,
      },

      session: {
        code: inscription.session.code,

        nom: inscription.session.nom,

        formation: {
          nom: inscription.session.formation.nom,
        },
      },
    })),
  };
}

/* ============================================================
   CRÉATION
============================================================ */

/* ============================================================
   CRÉATION
============================================================ */

export async function createFacture(data: CreateFactureInput) {
  const context = await getCurrentCentreContext();

  if (!context.centreId) {
    throw new Error("Aucun centre actif n'est associé à votre compte.");
  }

  const parsed = createFactureSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Données invalides.");
  }

  try {
    const facture = await prisma.$transaction(async (tx) => {
      const {
        inscriptionId,
        numero,
        dateEmission,
        dateEcheance,
        remise,
        taxe,
        statut,
        notes,
        lignes,
      } = parsed.data;

      /* -----------------------------------------
             INSCRIPTION
          ----------------------------------------- */

      if (inscriptionId) {
        const inscription = await tx.inscription.findFirst({
          where: {
            id: inscriptionId,

            session: {
              centreId: context.centreId,
            },
          },

          select: {
            id: true,
          },
        });

        if (!inscription) {
          throw new Error(
            "L'inscription sélectionnée n'appartient pas à votre centre.",
          );
        }

        /* -----------------------------------------
               PROTECTION :
               UNE SEULE FACTURE PAR INSCRIPTION
            ----------------------------------------- */

        const factureExistante = await tx.facture.findFirst({
          where: {
            inscriptionId,

            centreId: context.centreId,
          },

          select: {
            id: true,
            numero: true,
            statut: true,
          },
        });

        if (factureExistante) {
          throw new Error(
            `Cette inscription possède déjà une facture (${factureExistante.numero}).`,
          );
        }
      }

      /* -----------------------------------------
             NUMÉRO
          ----------------------------------------- */

      let numeroFinal = numero?.trim() || "";

      if (!numeroFinal) {
        numeroFinal = await generateFactureNumero(tx, context.centreId);
      }

      /* -----------------------------------------
             DOUBLON NUMÉRO
          ----------------------------------------- */

      const doublon = await tx.facture.findFirst({
        where: {
          centreId: context.centreId,

          numero: numeroFinal,
        },

        select: {
          id: true,
        },
      });

      if (doublon) {
        throw new Error("Une facture avec ce numéro existe déjà.");
      }

      /* -----------------------------------------
             FACTURE
          ----------------------------------------- */

      const facture = await tx.facture.create({
        data: {
          centreId: context.centreId,

          inscriptionId: inscriptionId || null,

          numero: numeroFinal,

          dateEmission,

          dateEcheance: dateEcheance || null,

          sousTotal: toDecimal(0),

          remise: toDecimal(remise),

          taxe: toDecimal(taxe),

          total: toDecimal(0),

          montantPaye: toDecimal(0),

          montantDu: toDecimal(0),

          statut,

          notes: notes || null,
        },
      });

      /* -----------------------------------------
             LIGNES
          ----------------------------------------- */

      for (const ligne of lignes) {
        const quantite = toDecimal(ligne.quantite);

        const prixUnitaire = toDecimal(ligne.prixUnitaire);

        const total = quantite.mul(prixUnitaire);

        await tx.ligneFacture.create({
          data: {
            factureId: facture.id,

            description: ligne.description,

            quantite,

            prixUnitaire,

            total,
          },
        });
      }

      /* -----------------------------------------
             RECALCUL
          ----------------------------------------- */

      return recalculerFacture(tx, facture.id);
    });

    /* -----------------------------------------
       CACHE
    ----------------------------------------- */

    revalidatePath("/factures");

    revalidatePath(`/factures/${facture.id}`);

    /* -----------------------------------------
       RETOUR
    ----------------------------------------- */

    return {
      success: true,

      message: `La facture ${facture.numero} a été créée avec succès.`,

      data: serializeForClient({
        id: facture.id,
        numero: facture.numero,
        total: facture.total,
        montantPaye: facture.montantPaye,
        montantDu: facture.montantDu,
        statut: facture.statut,
      }),
    };
  } catch (error) {
    /* -----------------------------------------
       DOUBLON PRIS EN CHARGE PAR LA DB
    ----------------------------------------- */

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = Array.isArray(error.meta?.target) ? error.meta.target : [];

      if (target.includes("inscriptionId")) {
        throw new Error(
          "Cette inscription possède déjà une facture. Impossible d'en créer une deuxième.",
        );
      }

      if (target.includes("numero")) {
        throw new Error("Ce numéro de facture est déjà utilisé.");
      }

      throw new Error("Cette facture existe déjà.");
    }

    throw error;
  }
}

/* ============================================================
   MODIFICATION
============================================================ */

export async function updateFacture(id: string, data: UpdateFactureInput) {
  const context = await getCurrentCentreContext();

  if (!context.centreId) {
    throw new Error("Aucun centre actif n'est associé à votre compte.");
  }

  const parsed = updateFactureSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Données invalides.");
  }

  const facture = await prisma.facture.findFirst({
    where: {
      id,

      centreId: context.centreId,
    },
  });

  if (!facture) {
    throw new Error("Facture introuvable.");
  }

  if (facture.statut === "ANNULEE") {
    throw new Error("Une facture annulée ne peut pas être modifiée.");
  }

  if (facture.montantPaye.gt(0) && parsed.data.statut === "BROUILLON") {
    throw new Error(
      "Une facture ayant reçu un paiement ne peut pas revenir à l'état BROUILLON.",
    );
  }

  const resultat = await prisma.$transaction(async (tx) => {
    const {
      inscriptionId,
      numero,
      dateEmission,
      dateEcheance,
      remise,
      taxe,
      statut,
      notes,
      lignes,
    } = parsed.data;

    /* -----------------------------------------
           INSCRIPTION
        ----------------------------------------- */

    if (inscriptionId) {
      const inscription = await tx.inscription.findFirst({
        where: {
          id: inscriptionId,

          session: {
            centreId: context.centreId,
          },
        },
      });

      if (!inscription) {
        throw new Error("L'inscription sélectionnée est invalide.");
      }
    }

    /* -----------------------------------------
           NUMÉRO
        ----------------------------------------- */

    const numeroFinal = numero?.trim() || facture.numero;

    /* -----------------------------------------
           DOUBLON
        ----------------------------------------- */

    const doublon = await tx.facture.findFirst({
      where: {
        centreId: context.centreId,

        numero: numeroFinal,

        NOT: {
          id,
        },
      },
    });

    if (doublon) {
      throw new Error("Ce numéro de facture est déjà utilisé.");
    }

    /* -----------------------------------------
           FACTURE
        ----------------------------------------- */

    await tx.facture.update({
      where: {
        id,
      },

      data: {
        inscriptionId: inscriptionId || null,

        numero: numeroFinal,

        dateEmission,

        dateEcheance: dateEcheance || null,

        remise: toDecimal(remise),

        taxe: toDecimal(taxe),

        statut,

        notes: notes || null,
      },
    });

    /* -----------------------------------------
           LIGNES
        ----------------------------------------- */

    await tx.ligneFacture.deleteMany({
      where: {
        factureId: id,
      },
    });

    for (const ligne of lignes) {
      const quantite = toDecimal(ligne.quantite);

      const prixUnitaire = toDecimal(ligne.prixUnitaire);

      await tx.ligneFacture.create({
        data: {
          factureId: id,

          description: ligne.description,

          quantite,

          prixUnitaire,

          total: quantite.mul(prixUnitaire),
        },
      });
    }

    /* -----------------------------------------
           RECALCUL
        ----------------------------------------- */

    return recalculerFacture(tx, id);
  });

  revalidatePath("/factures");

  revalidatePath(`/factures/${id}`);

  revalidatePath(`/factures/${id}/modifier`);

  return {
    success: true,

    message: "La facture a été modifiée avec succès.",

    data: serializeForClient({
      id: resultat.id,
      numero: resultat.numero,
      total: resultat.total,
      montantPaye: resultat.montantPaye,
      montantDu: resultat.montantDu,
      statut: resultat.statut,
    }),
  };
}

/* ============================================================
   SUPPRESSION
============================================================ */

export async function deleteFacture(id: string) {
  const context = await getCurrentCentreContext();

  if (!context.centreId) {
    throw new Error("Aucun centre actif n'est associé à votre compte.");
  }

  const facture = await prisma.facture.findFirst({
    where: {
      id,

      centreId: context.centreId,
    },

    include: {
      paiements: {
        select: {
          id: true,
        },
      },

      echeances: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!facture) {
    throw new Error("Facture introuvable.");
  }

  if (facture.paiements.length) {
    throw new Error(
      "Cette facture possède déjà des paiements. Elle ne peut pas être supprimée.",
    );
  }

  if (facture.echeances.length) {
    throw new Error(
      "Cette facture possède déjà un échéancier. Supprimez d'abord les échéances.",
    );
  }

  await prisma.facture.delete({
    where: {
      id,
    },
  });

  revalidatePath("/factures");

  return {
    success: true,

    message: "La facture a été supprimée avec succès.",
  };
}
