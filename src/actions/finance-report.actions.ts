"use server";

import {
  ModePaiement,
  Role,
  StatutEcheance,
  StatutFacture,
  StatutPaiement,
} from "@/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

import { getCurrentCentreContext } from "@/lib/validations/centre-access";

/* ============================================================
   TYPES
============================================================ */

export type FinanceReportParams = {
  dateDebut?: string;
  dateFin?: string;
};

type Money = string;

type FinanceReport = {
  periode: {
    dateDebut: string;
    dateFin: string;
    dateDebutPrecedente: string;
    dateFinPrecedente: string;
  };

  centre: {
    id: string;
    nom: string;
    code: string;
    devise: string;
    fuseauHoraire: string;
    logoUrl: string | null;
  };

  resume: {
    totalFacture: Money;
    totalEncaisse: Money;
    totalRembourse: Money;
    totalNetEncaisse: Money;
    totalCreance: Money;
    totalEnRetard: Money;

    nombreFactures: number;
    nombreFacturesPayees: number;
    nombreFacturesPartielles: number;
    nombreFacturesEnRetard: number;

    nombrePaiements: number;
    nombrePaiementsEffectues: number;

    nombreEcheances: number;
    nombreEcheancesPayees: number;
    nombreEcheancesEnRetard: number;

    tauxRecouvrement: number;
    panierMoyenPaiement: Money;
  };

  comparaison: {
    facture: {
      courant: Money;
      precedent: Money;
      variation: number;
    };

    encaissement: {
      courant: Money;
      precedent: Money;
      variation: number;
    };

    paiements: {
      courant: number;
      precedent: number;
      variation: number;
    };
  };

  evolution: Array<{
    periode: string;
    libelle: string;
    facture: Money;
    encaisse: Money;
    rembourse: Money;
  }>;

  facturesParStatut: Array<{
    statut: string;
    nombre: number;
    montant: Money;
  }>;

  paiementsParMode: Array<{
    mode: string;
    nombre: number;
    montant: Money;
  }>;

  paiementsParStatut: Array<{
    statut: string;
    nombre: number;
    montant: Money;
  }>;

  formations: Array<{
    id: string;
    nom: string;
    code: string;
    facture: Money;
    encaisse: Money;
    creance: Money;
    nombreFactures: number;
  }>;

  debiteurs: Array<{
    apprenantId: string | null;
    nom: string;
    inscriptionId: string | null;
    numeroInscription: string | null;
    formation: string | null;
    totalDu: Money;
    nombreFactures: number;
    nombreEcheances: number;
    plusAncienneEcheance: string | null;
  }>;

  echeancesEnRetard: Array<{
    id: string;
    numero: number;
    dateEcheance: string;
    montant: Money;
    montantPaye: Money;
    montantDu: Money;
    joursRetard: number;

    apprenant: string;
    inscription: string | null;
    formation: string | null;
    facture: string | null;
  }>;

  prochainesEcheances: Array<{
    id: string;
    numero: number;
    dateEcheance: string;
    montant: Money;
    montantPaye: Money;
    montantDu: Money;
    joursAvantEcheance: number;

    apprenant: string;
    inscription: string | null;
    formation: string | null;
    facture: string | null;
  }>;

  controle: {
    paiementsNonAffectes: {
      nombre: number;
      montant: Money;
    };

    facturesIncoherentes: {
      nombre: number;
      ecart: Money;
    };

    echeancesIncoherentes: {
      nombre: number;
      ecart: Money;
    };
  };
};

/* ============================================================
   UTILITAIRES
============================================================ */

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function money(value: unknown): Money {
  return toNumber(value).toFixed(2);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function percentage(
  current: number,
  previous: number,
): number {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }

  return roundMoney(
    ((current - previous) / previous) * 100,
  );
}

function parseDate(
  value: string | undefined,
  fallback: Date,
) {
  if (!value) {
    return fallback;
  }

  const date = new Date(
    `${value}T00:00:00.000Z`,
  );

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date;
}

function startOfCurrentMonth() {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1,
      0,
      0,
      0,
      0,
    ),
  );
}

function endOfCurrentMonth() {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    ),
  );
}

function startOfDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

function endOfDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function previousPeriod(
  dateDebut: Date,
  dateFin: Date,
) {
  const duree =
    dateFin.getTime() -
    dateDebut.getTime() +
    1;

  const previousFin =
    new Date(
      dateDebut.getTime() - 1,
    );

  const previousDebut =
    new Date(
      previousFin.getTime() - duree + 1,
    );

  return {
    dateDebut: previousDebut,
    dateFin: previousFin,
  };
}

function formatDateISO(
  date: Date | null | undefined,
) {
  if (!date) return null;

  return date.toISOString();
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] =
    key.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, 1),
  );

  return date.toLocaleDateString(
    "fr-FR",
    {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    },
  );
}

function differenceInDays(
  from: Date,
  to: Date,
) {
  const ms =
    startOfDay(to).getTime() -
    startOfDay(from).getTime();

  return Math.max(
    0,
    Math.floor(
      ms / (1000 * 60 * 60 * 24),
    ),
  );
}

function fullName(
  prenom?: string | null,
  nom?: string | null,
) {
  return [prenom, nom]
    .filter(Boolean)
    .join(" ")
    .trim() || "Apprenant inconnu";
}

/* ============================================================
   ACCÈS
============================================================ */

async function getFinanceContext() {
  const context =
    await getCurrentCentreContext();

  if (!context.centreId) {
    throw new Error(
      "Aucun centre actif n'est associé à votre compte.",
    );
  }

  if (
    context.roleSysteme !== "SUPER_ADMIN" &&
    context.role &&
    ![
      Role.PROPRIETAIRE,
      Role.ADMINISTRATEUR,
      Role.RESPONSABLE,
      Role.COMPTABLE,
    ].includes(context.role)
  ) {
    throw new Error(
      "Vous n'avez pas les permissions nécessaires pour consulter les rapports financiers.",
    );
  }

  return context;
}

/* ============================================================
   RAPPORT FINANCIER
============================================================ */

export async function getFinanceReport(
  params: FinanceReportParams = {},
): Promise<FinanceReport> {
  const context =
    await getFinanceContext();

  const dateDebut =
    parseDate(
      params.dateDebut,
      startOfCurrentMonth(),
    );

  const dateFin =
    parseDate(
      params.dateFin,
      endOfCurrentMonth(),
    );

  if (
    dateDebut.getTime() >
    dateFin.getTime()
  ) {
    throw new Error(
      "La date de début doit être antérieure à la date de fin.",
    );
  }

  const previous =
    previousPeriod(
      dateDebut,
      dateFin,
    );

  const now = new Date();

  /* ==========================================================
     CENTRE
  ========================================================== */

  const centre =
    await prisma.centreFormation.findUnique({
      where: {
        id: context.centreId,
      },

      select: {
        id: true,
        nom: true,
        code: true,
        devise: true,
        fuseauHoraire: true,
        logoUrl: true,
      },
    });

  if (!centre) {
    throw new Error(
      "Centre introuvable.",
    );
  }

  /* ==========================================================
     REQUÊTES PRINCIPALES
  ========================================================== */

  const [
    facturesPeriode,
    facturesPeriodePrecedente,
    paiementsPeriode,
    paiementsPeriodePrecedente,
    facturesCourantes,
    echeances,
  ] = await Promise.all([
    prisma.facture.findMany({
      where: {
        centreId: context.centreId,

        dateEmission: {
          gte: dateDebut,
          lte: dateFin,
        },

        statut: {
          not: StatutFacture.ANNULEE,
        },
      },

      select: {
        id: true,
        numero: true,
        dateEmission: true,
        total: true,
        montantPaye: true,
        montantDu: true,
        statut: true,

        inscription: {
          select: {
            id: true,
            numero: true,

            apprenant: {
              select: {
                id: true,
                prenom: true,
                nom: true,
              },
            },

            session: {
              select: {
                id: true,
                nom: true,
                code: true,

                formation: {
                  select: {
                    id: true,
                    nom: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
      },

      orderBy: {
        dateEmission: "asc",
      },
    }),

    prisma.facture.findMany({
      where: {
        centreId: context.centreId,

        dateEmission: {
          gte: previous.dateDebut,
          lte: previous.dateFin,
        },

        statut: {
          not: StatutFacture.ANNULEE,
        },
      },

      select: {
        total: true,
      },
    }),

    prisma.paiement.findMany({
      where: {
        centreId: context.centreId,

        datePaiement: {
          gte: dateDebut,
          lte: dateFin,
        },
      },

      select: {
        id: true,
        montant: true,
        mode: true,
        statut: true,
        datePaiement: true,
        factureId: true,
        echeanceId: true,
      },

      orderBy: {
        datePaiement: "asc",
      },
    }),

    prisma.paiement.findMany({
      where: {
        centreId: context.centreId,

        datePaiement: {
          gte: previous.dateDebut,
          lte: previous.dateFin,
        },
      },

      select: {
        montant: true,
        statut: true,
      },
    }),

    prisma.facture.findMany({
      where: {
        centreId: context.centreId,

        statut: {
          not: StatutFacture.ANNULEE,
        },

        OR: [
          {
            montantDu: {
              gt: 0,
            },
          },
          {
            montantPaye: {
              gt: 0,
            },
          },
        ],
      },

      select: {
        id: true,
        numero: true,
        dateEmission: true,
        dateEcheance: true,

        total: true,
        montantPaye: true,
        montantDu: true,

        statut: true,

        inscription: {
          select: {
            id: true,
            numero: true,

            apprenant: {
              select: {
                id: true,
                prenom: true,
                nom: true,
              },
            },

            session: {
              select: {
                id: true,
                nom: true,
                code: true,

                formation: {
                  select: {
                    id: true,
                    nom: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    }),

    prisma.echeancePaiement.findMany({
      where: {
        centreId: context.centreId,

        OR: [
          {
            montantDu: {
              gt: 0,
            },
          },
          {
            montantPaye: {
              gt: 0,
            },
          },
        ],
      },

      select: {
        id: true,
        numero: true,
        dateEcheance: true,

        montant: true,
        montantPaye: true,
        montantDu: true,

        statut: true,

        inscription: {
          select: {
            id: true,
            numero: true,

            apprenant: {
              select: {
                id: true,
                prenom: true,
                nom: true,
              },
            },

            session: {
              select: {
                nom: true,
                code: true,

                formation: {
                  select: {
                    id: true,
                    nom: true,
                  },
                },
              },
            },
          },
        },

        facture: {
          select: {
            id: true,
            numero: true,
          },
        },
      },

      orderBy: {
        dateEcheance: "asc",
      },
    }),
  ]);

  /* ==========================================================
     RÉSUMÉ FACTURES
  ========================================================== */

  let totalFacture = 0;
  let totalFacturePaye = 0;
  let totalFactureDu = 0;

  let nombreFacturesPayees = 0;
  let nombreFacturesPartielles = 0;
  let nombreFacturesEnRetard = 0;

  for (const facture of facturesPeriode) {
    const total =
      toNumber(facture.total);

    const paye =
      toNumber(facture.montantPaye);

    const du =
      toNumber(facture.montantDu);

    totalFacture += total;
    totalFacturePaye += paye;
    totalFactureDu += du;

    if (
      facture.statut ===
      StatutFacture.PAYEE
    ) {
      nombreFacturesPayees++;
    }

    if (
      facture.statut ===
      StatutFacture.PARTIELLEMENT_PAYEE
    ) {
      nombreFacturesPartielles++;
    }

    if (
      facture.statut ===
      StatutFacture.EN_RETARD
    ) {
      nombreFacturesEnRetard++;
    }
  }

  /* ==========================================================
     PAIEMENTS
  ========================================================== */

  let totalEncaisse = 0;
  let totalRembourse = 0;
  let nombrePaiementsEffectues = 0;

  const paiementsParModeMap =
    new Map<
      string,
      {
        nombre: number;
        montant: number;
      }
    >();

  const paiementsParStatutMap =
    new Map<
      string,
      {
        nombre: number;
        montant: number;
      }
    >();

  for (const paiement of paiementsPeriode) {
    const montant =
      toNumber(paiement.montant);

    if (
      paiement.statut ===
      StatutPaiement.EFFECTUE
    ) {
      totalEncaisse += montant;
      nombrePaiementsEffectues++;
    }

    if (
      paiement.statut ===
      StatutPaiement.REMBOURSE
    ) {
      totalRembourse += montant;
    }

    const mode =
      paiement.mode;

    const currentMode =
      paiementsParModeMap.get(mode) ?? {
        nombre: 0,
        montant: 0,
      };

    currentMode.nombre++;
    currentMode.montant += montant;

    paiementsParModeMap.set(
      mode,
      currentMode,
    );

    const statut =
      paiement.statut;

    const currentStatut =
      paiementsParStatutMap.get(
        statut,
      ) ?? {
        nombre: 0,
        montant: 0,
      };

    currentStatut.nombre++;
    currentStatut.montant += montant;

    paiementsParStatutMap.set(
      statut,
      currentStatut,
    );
  }

  /* ==========================================================
     CRÉANCES ACTUELLES
  ========================================================== */

  let totalCreance = 0;

  for (const facture of facturesCourantes) {
    totalCreance += toNumber(
      facture.montantDu,
    );
  }

  /* ==========================================================
     ÉCHÉANCES
  ========================================================== */

  let totalEnRetard = 0;
  let nombreEcheancesPayees = 0;
  let nombreEcheancesEnRetard = 0;

  const echeancesEnRetard =
    echeances
      .filter((echeance) => {
        const du =
          toNumber(echeance.montantDu);

        return (
          du > 0 &&
          echeance.dateEcheance <
            now &&
          echeance.statut !==
            StatutEcheance.ANNULEE
        );
      })
      .map((echeance) => {
        const du =
          toNumber(echeance.montantDu);

        totalEnRetard += du;
        nombreEcheancesEnRetard++;

        return {
          id: echeance.id,
          numero: echeance.numero,

          dateEcheance:
            echeance.dateEcheance.toISOString(),

          montant:
            money(echeance.montant),

          montantPaye:
            money(echeance.montantPaye),

          montantDu:
            money(echeance.montantDu),

          joursRetard:
            differenceInDays(
              echeance.dateEcheance,
              now,
            ),

          apprenant:
            fullName(
              echeance.inscription
                ?.apprenant.prenom,
              echeance.inscription
                ?.apprenant.nom,
            ),

          inscription:
            echeance.inscription
              ?.numero ?? null,

          formation:
            echeance.inscription
              ?.session.formation
              .nom ?? null,

          facture:
            echeance.facture
              ?.numero ?? null,
        };
      })
      .sort(
        (a, b) =>
          Number(b.montantDu) -
          Number(a.montantDu),
      )
      .slice(0, 15);

  for (const echeance of echeances) {
    if (
      echeance.statut ===
      StatutEcheance.PAYEE
    ) {
      nombreEcheancesPayees++;
    }
  }

  /* ==========================================================
     PROCHAINES ÉCHÉANCES
  ========================================================== */

  const prochainesEcheances =
    echeances
      .filter((echeance) => {
        const du =
          toNumber(echeance.montantDu);

        return (
          du > 0 &&
          echeance.dateEcheance >=
            now &&
          echeance.statut !==
            StatutEcheance.ANNULEE
        );
      })
      .map((echeance) => ({
        id: echeance.id,
        numero: echeance.numero,

        dateEcheance:
          echeance.dateEcheance.toISOString(),

        montant:
          money(echeance.montant),

        montantPaye:
          money(echeance.montantPaye),

        montantDu:
          money(echeance.montantDu),

        joursAvantEcheance:
          differenceInDays(
            now,
            echeance.dateEcheance,
          ),

        apprenant:
          fullName(
            echeance.inscription
              ?.apprenant.prenom,
            echeance.inscription
              ?.apprenant.nom,
          ),

        inscription:
          echeance.inscription
            ?.numero ?? null,

        formation:
          echeance.inscription
            ?.session.formation.nom ??
          null,

        facture:
          echeance.facture
            ?.numero ?? null,
      }))
      .slice(0, 15);

  /* ==========================================================
     FORMATIONS
  ========================================================== */

  const formationsMap =
    new Map<
      string,
      {
        id: string;
        nom: string;
        code: string;
        facture: number;
        encaisse: number;
        creance: number;
        nombreFactures: number;
      }
    >();

  for (const facture of facturesPeriode) {
    const formation =
      facture.inscription
        ?.session.formation;

    if (!formation) {
      continue;
    }

    const current =
      formationsMap.get(
        formation.id,
      ) ?? {
        id: formation.id,
        nom: formation.nom,
        code: formation.code,
        facture: 0,
        encaisse: 0,
        creance: 0,
        nombreFactures: 0,
      };

    current.facture +=
      toNumber(facture.total);

    current.encaisse +=
      toNumber(
        facture.montantPaye,
      );

    current.creance +=
      toNumber(
        facture.montantDu,
      );

    current.nombreFactures++;

    formationsMap.set(
      formation.id,
      current,
    );
  }

  const formations =
    Array.from(
      formationsMap.values(),
    )
      .sort(
        (a, b) =>
          b.facture - a.facture,
      )
      .map((formation) => ({
        id: formation.id,
        nom: formation.nom,
        code: formation.code,
        facture: money(
          formation.facture,
        ),
        encaisse: money(
          formation.encaisse,
        ),
        creance: money(
          formation.creance,
        ),
        nombreFactures:
          formation.nombreFactures,
      }));

  /* ==========================================================
     DÉBITEURS
  ========================================================== */

  type DebiteurAccumulator = {
    apprenantId: string | null;
    nom: string;
    inscriptionId: string | null;
    numeroInscription: string | null;
    formation: string | null;
    totalDu: number;
    nombreFactures: number;
    nombreEcheances: number;
    plusAncienneEcheance: Date | null;
  };

  const debiteursMap =
    new Map<
      string,
      DebiteurAccumulator
    >();

  for (const facture of facturesCourantes) {
    const du =
      toNumber(facture.montantDu);

    if (du <= 0) {
      continue;
    }

    const apprenant =
      facture.inscription
        ?.apprenant;

    const inscription =
      facture.inscription;

    const key =
      inscription?.id ??
      `facture:${facture.id}`;

    const current =
      debiteursMap.get(key) ?? {
        apprenantId:
          apprenant?.id ?? null,

        nom: fullName(
          apprenant?.prenom,
          apprenant?.nom,
        ),

        inscriptionId:
          inscription?.id ?? null,

        numeroInscription:
          inscription?.numero ?? null,

        formation:
          inscription
            ?.session.formation.nom ??
          null,

        totalDu: 0,
        nombreFactures: 0,
        nombreEcheances: 0,
        plusAncienneEcheance: null,
      };

    current.totalDu += du;
    current.nombreFactures++;

    debiteursMap.set(
      key,
      current,
    );
  }

  for (const echeance of echeances) {
    const du =
      toNumber(echeance.montantDu);

    if (du <= 0) {
      continue;
    }

    const inscription =
      echeance.inscription;

    const apprenant =
      inscription?.apprenant;

    const key =
      inscription?.id ??
      `echeance:${echeance.id}`;

    const current =
      debiteursMap.get(key) ?? {
        apprenantId:
          apprenant?.id ?? null,

        nom: fullName(
          apprenant?.prenom,
          apprenant?.nom,
        ),

        inscriptionId:
          inscription?.id ?? null,

        numeroInscription:
          inscription?.numero ?? null,

        formation:
          inscription
            ?.session.formation.nom ??
          null,

        totalDu: 0,
        nombreFactures: 0,
        nombreEcheances: 0,
        plusAncienneEcheance: null,
      };

    current.nombreEcheances++;

    if (
      !current.plusAncienneEcheance ||
      echeance.dateEcheance <
        current.plusAncienneEcheance
    ) {
      current.plusAncienneEcheance =
        echeance.dateEcheance;
    }

    debiteursMap.set(
      key,
      current,
    );
  }

  const debiteurs =
    Array.from(
      debiteursMap.values(),
    )
      .filter(
        (debiteur) =>
          debiteur.totalDu > 0,
      )
      .sort(
        (a, b) =>
          b.totalDu - a.totalDu,
      )
      .slice(0, 15)
      .map((debiteur) => ({
        apprenantId:
          debiteur.apprenantId,

        nom: debiteur.nom,

        inscriptionId:
          debiteur.inscriptionId,

        numeroInscription:
          debiteur.numeroInscription,

        formation:
          debiteur.formation,

        totalDu:
          money(debiteur.totalDu),

        nombreFactures:
          debiteur.nombreFactures,

        nombreEcheances:
          debiteur.nombreEcheances,

        plusAncienneEcheance:
          formatDateISO(
            debiteur.plusAncienneEcheance,
          ),
      }));

  /* ==========================================================
     ÉVOLUTION MENSUELLE
  ========================================================== */

  const evolutionMap =
    new Map<
      string,
      {
        facture: number;
        encaisse: number;
        rembourse: number;
      }
    >();

  const cursor =
    new Date(
      Date.UTC(
        dateDebut.getUTCFullYear(),
        dateDebut.getUTCMonth(),
        1,
      ),
    );

  const endMonth =
    new Date(
      Date.UTC(
        dateFin.getUTCFullYear(),
        dateFin.getUTCMonth(),
        1,
      ),
    );

  while (
    cursor.getTime() <=
    endMonth.getTime()
  ) {
    evolutionMap.set(
      monthKey(cursor),
      {
        facture: 0,
        encaisse: 0,
        rembourse: 0,
      },
    );

    cursor.setUTCMonth(
      cursor.getUTCMonth() + 1,
    );
  }

  for (const facture of facturesPeriode) {
    const key =
      monthKey(
        facture.dateEmission,
      );

    const current =
      evolutionMap.get(key);

    if (current) {
      current.facture +=
        toNumber(facture.total);
    }
  }

  for (const paiement of paiementsPeriode) {
    if (!paiement.datePaiement) {
      continue;
    }

    const key =
      monthKey(
        paiement.datePaiement,
      );

    const current =
      evolutionMap.get(key);

    if (!current) {
      continue;
    }

    const montant =
      toNumber(paiement.montant);

    if (
      paiement.statut ===
      StatutPaiement.EFFECTUE
    ) {
      current.encaisse += montant;
    }

    if (
      paiement.statut ===
      StatutPaiement.REMBOURSE
    ) {
      current.rembourse += montant;
    }
  }

  const evolution =
    Array.from(
      evolutionMap.entries(),
    ).map(
      ([periode, values]) => ({
        periode,
        libelle:
          monthLabel(periode),
        facture:
          money(values.facture),
        encaisse:
          money(values.encaisse),
        rembourse:
          money(values.rembourse),
      }),
    );

  /* ==========================================================
     FACTURES PAR STATUT
  ========================================================== */

  const facturesParStatutMap =
    new Map<
      string,
      {
        nombre: number;
        montant: number;
      }
    >();

  for (const facture of facturesPeriode) {
    const current =
      facturesParStatutMap.get(
        facture.statut,
      ) ?? {
        nombre: 0,
        montant: 0,
      };

    current.nombre++;

    current.montant +=
      toNumber(facture.total);

    facturesParStatutMap.set(
      facture.statut,
      current,
    );
  }

  const facturesParStatut =
    Array.from(
      facturesParStatutMap.entries(),
    ).map(
      ([statut, value]) => ({
        statut,
        nombre: value.nombre,
        montant:
          money(value.montant),
      }),
    );

  /* ==========================================================
     PAIEMENTS PAR MODE
  ========================================================== */

  const paiementsParMode =
    Array.from(
      paiementsParModeMap.entries(),
    ).map(
      ([mode, value]) => ({
        mode,
        nombre: value.nombre,
        montant:
          money(value.montant),
      }),
    );

  /* ==========================================================
     PAIEMENTS PAR STATUT
  ========================================================== */

  const paiementsParStatut =
    Array.from(
      paiementsParStatutMap.entries(),
    ).map(
      ([statut, value]) => ({
        statut,
        nombre: value.nombre,
        montant:
          money(value.montant),
      }),
    );

  /* ==========================================================
     COMPARAISON
  ========================================================== */

  const totalFacturePrecedent =
    facturesPeriodePrecedente.reduce(
      (sum, facture) =>
        sum +
        toNumber(facture.total),
      0,
    );

  const totalEncaissePrecedent =
    paiementsPeriodePrecedente
      .filter(
        (paiement) =>
          paiement.statut ===
          StatutPaiement.EFFECTUE,
      )
      .reduce(
        (sum, paiement) =>
          sum +
          toNumber(paiement.montant),
        0,
      );

  /* ==========================================================
     CONTRÔLE DES DONNÉES
  ========================================================== */

  let nombreFacturesIncoherentes = 0;
  let ecartFactures = 0;

  for (const facture of facturesCourantes) {
    const total =
      toNumber(facture.total);

    const paye =
      toNumber(facture.montantPaye);

    const du =
      toNumber(facture.montantDu);

    const ecart =
      Math.abs(
        total - paye - du,
      );

    if (
      ecart > 0.01 ||
      paye > total + 0.01 ||
      du < -0.01
    ) {
      nombreFacturesIncoherentes++;

      ecartFactures += ecart;
    }
  }

  let nombreEcheancesIncoherentes = 0;
  let ecartEcheances = 0;

  for (const echeance of echeances) {
    const montant =
      toNumber(echeance.montant);

    const paye =
      toNumber(echeance.montantPaye);

    const du =
      toNumber(echeance.montantDu);

    const ecart =
      Math.abs(
        montant - paye - du,
      );

    if (
      ecart > 0.01 ||
      paye > montant + 0.01 ||
      du < -0.01
    ) {
      nombreEcheancesIncoherentes++;

      ecartEcheances += ecart;
    }
  }

  /* ==========================================================
     PAIEMENTS NON AFFECTÉS
  ========================================================== */

  const paiementsNonAffectes =
    paiementsPeriode.filter(
      (paiement) =>
        paiement.statut ===
          StatutPaiement.EFFECTUE &&
        !paiement.factureId &&
        !paiement.echeanceId,
    );

  const montantPaiementsNonAffectes =
    paiementsNonAffectes.reduce(
      (sum, paiement) =>
        sum +
        toNumber(paiement.montant),
      0,
    );

  /* ==========================================================
     TAUX DE RECOUVREMENT
  ========================================================== */

  const tauxRecouvrement =
    totalFacture > 0
      ? roundMoney(
          (totalFacturePaye /
            totalFacture) *
            100,
        )
      : 0;

  const panierMoyenPaiement =
    nombrePaiementsEffectues > 0
      ? totalEncaisse /
        nombrePaiementsEffectues
      : 0;

  /* ==========================================================
     RETOUR
  ========================================================== */

  return {
    periode: {
      dateDebut:
        dateDebut.toISOString(),

      dateFin:
        dateFin.toISOString(),

      dateDebutPrecedente:
        previous.dateDebut.toISOString(),

      dateFinPrecedente:
        previous.dateFin.toISOString(),
    },

    centre,

    resume: {
      totalFacture:
        money(totalFacture),

      totalEncaisse:
        money(totalEncaisse),

      totalRembourse:
        money(totalRembourse),

      totalNetEncaisse:
        money(
          totalEncaisse -
            totalRembourse,
        ),

      totalCreance:
        money(totalCreance),

      totalEnRetard:
        money(totalEnRetard),

      nombreFactures:
        facturesPeriode.length,

      nombreFacturesPayees,

      nombreFacturesPartielles,

      nombreFacturesEnRetard,

      nombrePaiements:
        paiementsPeriode.length,

      nombrePaiementsEffectues,

      nombreEcheances:
        echeances.length,

      nombreEcheancesPayees,

      nombreEcheancesEnRetard,

      tauxRecouvrement,

      panierMoyenPaiement:
        money(
          panierMoyenPaiement,
        ),
    },

    comparaison: {
      facture: {
        courant:
          money(totalFacture),

        precedent:
          money(
            totalFacturePrecedent,
          ),

        variation:
          percentage(
            totalFacture,
            totalFacturePrecedent,
          ),
      },

      encaissement: {
        courant:
          money(totalEncaisse),

        precedent:
          money(
            totalEncaissePrecedent,
          ),

        variation:
          percentage(
            totalEncaisse,
            totalEncaissePrecedent,
          ),
      },

      paiements: {
        courant:
          paiementsPeriode.length,

        precedent:
          paiementsPeriodePrecedente.length,

        variation:
          percentage(
            paiementsPeriode.length,
            paiementsPeriodePrecedente.length,
          ),
      },
    },

    evolution,

    facturesParStatut,

    paiementsParMode,

    paiementsParStatut,

    formations,

    debiteurs,

    echeancesEnRetard,

    prochainesEcheances,

    controle: {
      paiementsNonAffectes: {
        nombre:
          paiementsNonAffectes.length,

        montant:
          money(
            montantPaiementsNonAffectes,
          ),
      },

      facturesIncoherentes: {
        nombre:
          nombreFacturesIncoherentes,

        ecart:
          money(ecartFactures),
      },

      echeancesIncoherentes: {
        nombre:
          nombreEcheancesIncoherentes,

        ecart:
          money(ecartEcheances),
      },
    },
  };
}