"use server";

import { prisma } from "@/lib/prisma";
import { requireCentreManager } from "@/lib/validations/centre-access";

import { generateBrevetPdf } from "@/lib/pdf/brevet-pdf";
import { generateReleveNotesPdf } from "@/lib/pdf/releve-notes-pdf";

/* ============================================================
   TYPES
============================================================ */

type ActionResponse<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
};

type ModuleResultat = {
  id: string;
  code: string;
  nom: string;
  position: number;

  note: number;
  noteMaximale: number;
  pourcentage: number;

  statut: string;
  resultat: string;
  commentaire: string | null;
};

type CentreResultat = {
  id: string;
  nom: string;
  code: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  ville: string | null;
  pays: string | null;
  codePostal: string | null;
  siteWeb: string | null;
  logoUrl: string | null;

  initiales: string;
};

type ApprenantResultat = {
  id: string;
  nom: string;
  prenom: string;
  numero: string | null;

  email: string | null;
  telephone: string | null;

  sexe: string | null;

  dateNaissance: Date | null;
  lieuNaissance: string | null;

  nationalite: string | null;

  adresse: string | null;
  ville: string | null;
  pays: string | null;

  profession: string | null;

  contactUrgenceNom: string | null;
  contactUrgenceTelephone: string | null;

  initiales: string;
};

type ResultatItem = {
  /*
   * IMPORTANT :
   * id = inscription.id
   *
   * Le résultat est volontairement identifié
   * par l'inscription.
   */

  id: string;

  inscriptionId: string;

  centre: CentreResultat;

  apprenant: ApprenantResultat;

  formation: {
    id: string;
    code: string | null;
    nom: string;
  };

  session: {
    id: string;
    code: string;
    nom: string | null;
    dateDebut: Date;
    dateFin: Date;
  };

  inscription: {
    id: string;
    numero: string;
  };

  modules: ModuleResultat[];

  /*
   * Moyenne brute des évaluations.
   * Sur 100.
   */
  moyenneEvaluations: number | null;

  /*
   * Contribution des évaluations.
   * 70 %.
   */
  contributionEvaluations: number | null;

  /*
   * Moyenne brute du jury.
   * Sur 100.
   */
  moyenneJury: number | null;

  /*
   * Contribution du jury.
   * 30 %.
   */
  contributionJury: number | null;

  /*
   * Résultat final.
   * Sur 100.
   */
  moyenneGenerale: number | null;

  /*
   * Taux de présence.
   */
  tauxPresence: number | null;

  nombrePresences: number;
  presencesPresentes: number;
  presencesAbsentes: number;
  presencesRetard: number;
  presencesExcusees: number;

  nombreModules: number;
  modulesReussis: number;
  modulesEchoues: number;

  resultat: string;
  resultatLabel: string;
  mention: string;

  commentaire: string | null;

  certification: {
    id: string;
    numero: string;
    intitule: string;
    dateObtention: Date | null;
    statut: string;
    mention: string | null;
    observations: string | null;
  } | null;
};

/* ============================================================
   HELPERS
============================================================ */

function toNumber(
  value: unknown,
  fallback = 0,
): number {
  const number =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

/* ============================================================
   ARRONDIR
============================================================ */

function round2(
  value: number,
): number {
  return (
    Math.round(value * 100) /
    100
  );
}

/* ============================================================
   POURCENTAGE
============================================================ */

function clampPercentage(
  value: number,
): number {
  return Math.min(
    100,
    Math.max(0, value),
  );
}

/* ============================================================
   INITIALES
============================================================ */

function getInitiales(
  prenom?: string | null,
  nom?: string | null,
): string {
  const firstName =
    prenom?.trim() ?? "";

  const lastName =
    nom?.trim() ?? "";

  const first =
    firstName
      .charAt(0)
      .toUpperCase();

  const last =
    lastName
      .charAt(0)
      .toUpperCase();

  const initiales =
    `${first}${last}`.trim();

  if (initiales) {
    return initiales;
  }

  const fallback =
    `${firstName} ${lastName}`
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((mot) =>
        mot
          .charAt(0)
          .toUpperCase(),
      )
      .join("");

  return fallback || "?";
}

/* ============================================================
   INITIALES CENTRE
============================================================ */

function getInitialesCentre(
  nom?: string | null,
  code?: string | null,
): string {
  /*
   * Si le code du centre est exploitable,
   * on l'utilise en priorité.
   *
   * Exemple :
   * CEF → CEF
   */

  const codeNormalise =
    code
      ?.trim()
      .replace(
        /\s+/g,
        "",
      )
      .toUpperCase() ?? "";

  if (
    codeNormalise.length >= 2 &&
    codeNormalise.length <= 4
  ) {
    return codeNormalise;
  }

  /*
   * Sinon on prend les premières
   * lettres du nom.
   *
   * Exemple :
   * Centre de Formation Professionnelle
   * → CFP
   */

  const mots =
    nom
      ?.trim()
      .split(/\s+/)
      .filter(Boolean) ?? [];

  const sansArticles =
    mots.filter(
      (mot) =>
        ![
          "de",
          "du",
          "des",
          "la",
          "le",
          "les",
          "et",
          "d'",
        ].includes(
          mot.toLowerCase(),
        ),
    );

  const source =
    sansArticles.length > 0
      ? sansArticles
      : mots;

  const initiales =
    source
      .slice(0, 3)
      .map((mot) =>
        mot
          .charAt(0)
          .toUpperCase(),
      )
      .join("");

  return (
    initiales ||
    nom
      ?.trim()
      .charAt(0)
      .toUpperCase() ||
    "C"
  );
}

/* ============================================================
   MENTION
============================================================ */

function getMention(
  moyenne: number | null,
): string {
  if (moyenne === null) {
    return "Non évalué";
  }

  if (moyenne >= 80) {
    return "Très bien";
  }

  if (moyenne >= 70) {
    return "Bien";
  }

  if (moyenne >= 60) {
    return "Assez bien";
  }

  if (moyenne >= 50) {
    return "Passable";
  }

  return "Insuffisant";
}

/* ============================================================
   LABEL RESULTAT
============================================================ */

function getResultatLabel(
  resultat: string,
): string {
  switch (resultat) {
    case "REUSSITE":
      return "Admis";

    case "ECHEC":
      return "Échec";

    case "NON_EVALUE":
      return "Non évalué";

    default:
      return resultat;
  }
}

/* ============================================================
   MOYENNE DES EVALUATIONS
============================================================ */

function calculerMoyenneEvaluations(
  evaluations: Array<{
    note: unknown;
    noteMaximale: unknown;
    statut?: string | null;
  }>,
): number | null {
  if (
    !Array.isArray(
      evaluations,
    ) ||
    evaluations.length === 0
  ) {
    return null;
  }

  const evaluationsValides =
    evaluations.filter(
      (evaluation) => {
        const note =
          evaluation.note;

        const max =
          toNumber(
            evaluation.noteMaximale,
            0,
          );

        const statutValide =
          evaluation.statut ===
            undefined ||
          evaluation.statut ===
            null ||
          evaluation.statut ===
            "VALIDEE";

        return (
          note !== null &&
          note !== undefined &&
          max > 0 &&
          statutValide
        );
      },
    );

  if (
    evaluationsValides.length ===
    0
  ) {
    return null;
  }

  const pourcentages =
    evaluationsValides.map(
      (evaluation) => {
        const note =
          toNumber(
            evaluation.note,
          );

        const noteMaximale =
          toNumber(
            evaluation.noteMaximale,
          );

        return clampPercentage(
          (note /
            noteMaximale) *
            100,
        );
      },
    );

  const moyenne =
    pourcentages.reduce(
      (
        total,
        valeur,
      ) =>
        total + valeur,
      0,
    ) /
    pourcentages.length;

  return round2(moyenne);
}

/* ============================================================
   MOYENNE DU JURY
============================================================ */

function calculerMoyenneJury(
  evaluationsJury: Array<{
    note: unknown;
  }>,
): number | null {
  if (
    !Array.isArray(
      evaluationsJury,
    ) ||
    evaluationsJury.length === 0
  ) {
    return null;
  }

  const notes =
    evaluationsJury
      .filter(
        (evaluation) =>
          evaluation.note !==
            null &&
          evaluation.note !==
            undefined,
      )
      .map(
        (evaluation) =>
          clampPercentage(
            toNumber(
              evaluation.note,
            ),
          ),
      );

  if (notes.length === 0) {
    return null;
  }

  const moyenne =
    notes.reduce(
      (
        total,
        note,
      ) =>
        total + note,
      0,
    ) / notes.length;

  return round2(moyenne);
}

/* ============================================================
   PRESENCES
============================================================ */

/**
 * Les présences sont directement liées à l'inscription
 * via :
 *
 * Presence.inscriptionId
 *
 * PRESENT et RETARD comptent comme présence.
 *
 * EXCUSE et ABSENT ne comptent pas comme présence.
 */
function calculerPresence(
  presences: Array<{
    statut: string;
  }>,
) {
  if (
    !Array.isArray(
      presences,
    ) ||
    presences.length === 0
  ) {
    return {
      tauxPresence: null,

      nombrePresences: 0,

      presencesPresentes: 0,

      presencesAbsentes: 0,

      presencesRetard: 0,

      presencesExcusees: 0,
    };
  }

  const presencesPresentes =
    presences.filter(
      (presence) =>
        presence.statut ===
        "PRESENT",
    ).length;

  const presencesRetard =
    presences.filter(
      (presence) =>
        presence.statut ===
        "RETARD",
    ).length;

  const presencesAbsentes =
    presences.filter(
      (presence) =>
        presence.statut ===
        "ABSENT",
    ).length;

  const presencesExcusees =
    presences.filter(
      (presence) =>
        presence.statut ===
        "EXCUSE",
    ).length;

  const nombrePresences =
    presences.length;

  /*
   * PRESENT + RETARD = présence effective.
   */
  const presenceEffective =
    presencesPresentes +
    presencesRetard;

  const tauxPresence =
    nombrePresences > 0
      ? round2(
          (presenceEffective /
            nombrePresences) *
            100,
        )
      : null;

  return {
    tauxPresence,

    nombrePresences,

    presencesPresentes,

    presencesAbsentes,

    presencesRetard,

    presencesExcusees,
  };
}

/* ============================================================
   CALCUL FINAL 70 / 30
============================================================ */

function calculerResultatFinal(
  moyenneEvaluations:
    | number
    | null,
  moyenneJury:
    | number
    | null,
) {
  /*
   * Si une composante manque,
   * le résultat final reste NON_EVALUE.
   */

  if (
    moyenneEvaluations === null ||
    moyenneJury === null
  ) {
    return {
      contributionEvaluations:
        moyenneEvaluations !== null
          ? round2(
              moyenneEvaluations *
                0.7,
            )
          : null,

      contributionJury:
        moyenneJury !== null
          ? round2(
              moyenneJury *
                0.3,
            )
          : null,

      moyenneGenerale:
        null,

      resultat:
        "NON_EVALUE",

      resultatLabel:
        "Non évalué",

      mention:
        "Non évalué",
    };
  }

  /*
   * 70 % évaluations.
   */

  const contributionEvaluations =
    round2(
      moyenneEvaluations *
        0.7,
    );

  /*
   * 30 % jury.
   */

  const contributionJury =
    round2(
      moyenneJury *
        0.3,
    );

  /*
   * Résultat final.
   */

  const moyenneGenerale =
    round2(
      contributionEvaluations +
        contributionJury,
    );

  /*
   * Seuil de réussite : 50/100.
   */

  const resultat =
    moyenneGenerale >= 50
      ? "REUSSITE"
      : "ECHEC";

  return {
    contributionEvaluations,

    contributionJury,

    moyenneGenerale,

    resultat,

    resultatLabel:
      getResultatLabel(
        resultat,
      ),

    mention:
      getMention(
        moyenneGenerale,
      ),
  };
}

/* ============================================================
   CONSTRUCTION D'UN RESULTAT
============================================================ */

async function construireResultat(
  inscription: any,
): Promise<ResultatItem> {
  if (!inscription) {
    throw new Error(
      "Inscription invalide.",
    );
  }

  if (!inscription.apprenant) {
    throw new Error(
      "L'apprenant de l'inscription est introuvable.",
    );
  }

  if (!inscription.session) {
    throw new Error(
      "La session de l'inscription est introuvable.",
    );
  }

  if (
    !inscription.session
      .formation
  ) {
    throw new Error(
      "La formation de la session est introuvable.",
    );
  }

  /*
   * ==========================================================
   * EVALUATIONS
   * ==========================================================
   */

  const evaluations =
    Array.isArray(
      inscription.evaluations,
    )
      ? inscription.evaluations
      : [];

  /*
   * ==========================================================
   * JURY
   * ==========================================================
   */

  const evaluationsJury =
    Array.isArray(
      inscription.evaluationsJury,
    )
      ? inscription.evaluationsJury
      : [];

  /*
   * ==========================================================
   * PRESENCES
   * ==========================================================
   */

  const presences =
    Array.isArray(
      inscription.presences,
    )
      ? inscription.presences
      : [];

  /*
   * ==========================================================
   * MOYENNES
   * ==========================================================
   */

  const moyenneEvaluations =
    calculerMoyenneEvaluations(
      evaluations,
    );

  const moyenneJury =
    calculerMoyenneJury(
      evaluationsJury,
    );

  /*
   * ==========================================================
   * RESULTAT 70 / 30
   * ==========================================================
   */

  const calcul =
    calculerResultatFinal(
      moyenneEvaluations,
      moyenneJury,
    );

  /*
   * ==========================================================
   * PRESENCE
   * ==========================================================
   */

  const presence =
    calculerPresence(
      presences,
    );

  /*
   * ==========================================================
   * MODULES
   * ==========================================================
   */

  const modulesSession =
    Array.isArray(
      inscription.session
        ?.modules,
    )
      ? inscription.session
          .modules
      : [];

  const modules: ModuleResultat[] =
    modulesSession.map(
      (
        moduleSession: any,
      ) => {
        const evaluation =
          evaluations.find(
            (item: any) =>
              item.moduleSessionId ===
              moduleSession.id,
          );

        const note =
          evaluation
            ? toNumber(
                evaluation.note,
              )
            : 0;

        const noteMaximale =
          evaluation
            ? toNumber(
                evaluation.noteMaximale,
                20,
              )
            : 20;

        const pourcentage =
          evaluation &&
          noteMaximale > 0
            ? clampPercentage(
                (note /
                  noteMaximale) *
                  100,
              )
            : 0;

        return {
          id:
            moduleSession.id,

          code:
            moduleSession
              .module?.code ??
            "",

          nom:
            moduleSession
              .module?.nom ??
            "Module",

          position:
            toNumber(
              moduleSession.position,
            ),

          note:
            round2(note),

          noteMaximale:
            round2(
              noteMaximale,
            ),

          pourcentage:
            round2(
              pourcentage,
            ),

          statut:
            evaluation
              ?.statut ??
            "NON_EVALUE",

          resultat:
            evaluation
              ?.resultat ??
            "NON_EVALUE",

          commentaire:
            evaluation
              ?.commentaire ??
            null,
        };
      },
    );

  /*
   * ==========================================================
   * STATISTIQUES MODULES
   * ==========================================================
   */

  const modulesAvecEvaluation =
    modules.filter(
      (module) =>
        module.statut ===
        "VALIDEE",
    );

  const modulesReussis =
    modulesAvecEvaluation.filter(
      (module) =>
        module.pourcentage >=
        50,
    ).length;

  const modulesEchoues =
    modulesAvecEvaluation.filter(
      (module) =>
        module.pourcentage < 50,
    ).length;

  /*
   * ==========================================================
   * RESULTAT PERSISTANT
   * ==========================================================
   */

  const resultatPersistant =
    inscription.resultatFormation ??
    null;

  /*
   * ==========================================================
   * CERTIFICATION
   * ==========================================================
   */

  const certification =
    resultatPersistant?.certification
      ? {
          id:
            resultatPersistant
              .certification.id,

          numero:
            resultatPersistant
              .certification
              .numero,

          intitule:
            resultatPersistant
              .certification
              .intitule,

          dateObtention:
            resultatPersistant
              .certification
              .dateObtention ??
            null,

          statut:
            resultatPersistant
              .certification
              .statut,

          mention:
            resultatPersistant
              .certification
              .mention ??
            null,

          observations:
            resultatPersistant
              .certification
              .observations ??
            null,
        }
      : null;

  /*
   * ==========================================================
   * CENTRE
   * ==========================================================
   */

  const centre =
    inscription.apprenant
      ?.centre ?? null;

  if (!centre) {
    throw new Error(
      "Le centre de l'apprenant est introuvable.",
    );
  }

  /*
   * ==========================================================
   * RESULTAT
   * ==========================================================
   */

  return {
    id:
      inscription.id,

    inscriptionId:
      inscription.id,

    centre: {
      id:
        centre.id,

      nom:
        centre.nom ?? "",

      code:
        centre.code ?? "",

      telephone:
        centre.telephone ??
        null,

      email:
        centre.email ??
        null,

      adresse:
        centre.adresse ??
        null,

      ville:
        centre.ville ??
        null,

      pays:
        centre.pays ??
        null,

      codePostal:
        centre.codePostal ??
        null,

      siteWeb:
        centre.siteWeb ??
        null,

      logoUrl:
        centre.logoUrl ??
        null,

      initiales:
        getInitialesCentre(
          centre.nom,
          centre.code,
        ),
    },

    /*
     * ========================================================
     * APPRENANT
     * ========================================================
     */

    apprenant: {
      id:
        inscription
          .apprenant.id,

      nom:
        inscription
          .apprenant.nom ??
        "",

      prenom:
        inscription
          .apprenant.prenom ??
        "",

      numero:
        inscription
          .apprenant.numero ??
        null,

      email:
        inscription
          .apprenant.email ??
        null,

      telephone:
        inscription
          .apprenant.telephone ??
        null,

      sexe:
        inscription
          .apprenant.sexe ??
        null,

      dateNaissance:
        inscription
          .apprenant
          .dateNaissance ??
        null,

      lieuNaissance:
        inscription
          .apprenant
          .lieuNaissance ??
        null,

      nationalite:
        inscription
          .apprenant
          .nationalite ??
        null,

      adresse:
        inscription
          .apprenant
          .adresse ??
        null,

      ville:
        inscription
          .apprenant
          .ville ??
        null,

      pays:
        inscription
          .apprenant
          .pays ??
        null,

      profession:
        inscription
          .apprenant
          .profession ??
        null,

      contactUrgenceNom:
        inscription
          .apprenant
          .contactUrgenceNom ??
        null,

      contactUrgenceTelephone:
        inscription
          .apprenant
          .contactUrgenceTelephone ??
        null,

      initiales:
        getInitiales(
          inscription
            .apprenant
            .prenom,

          inscription
            .apprenant
            .nom,
        ),
    },

    formation: {
      id:
        inscription
          .session
          .formation.id,

      code:
        inscription
          .session
          .formation
          .code ??
        null,

      nom:
        inscription
          .session
          .formation
          .nom ??
        "Formation inconnue",
    },

    session: {
      id:
        inscription
          .session.id,

      code:
        inscription
          .session.code ??
        "",

      nom:
        inscription
          .session.nom ??
        null,

      dateDebut:
        inscription
          .session.dateDebut,

      dateFin:
        inscription
          .session.dateFin,
    },

    inscription: {
      id:
        inscription.id,

      numero:
        inscription.numero ??
        "",
    },

    modules,

    moyenneEvaluations,

    contributionEvaluations:
      calcul
        .contributionEvaluations,

    moyenneJury,

    contributionJury:
      calcul
        .contributionJury,

    moyenneGenerale:
      calcul
        .moyenneGenerale,

    tauxPresence:
      presence.tauxPresence,

    nombrePresences:
      presence.nombrePresences,

    presencesPresentes:
      presence.presencesPresentes,

    presencesAbsentes:
      presence.presencesAbsentes,

    presencesRetard:
      presence.presencesRetard,

    presencesExcusees:
      presence.presencesExcusees,

    nombreModules:
      modules.length,

    modulesReussis,

    modulesEchoues,

    resultat:
      calcul.resultat,

    resultatLabel:
      calcul.resultatLabel,

    mention:
      calcul.mention,

    commentaire:
      resultatPersistant
        ?.commentaire ??
      null,

    certification,
  };
}

/* ============================================================
   INCLUDE PRISMA
============================================================ */

const resultatInclude = {
  /*
   * IMPORTANT :
   * On récupère maintenant le centre
   * de l'apprenant.
   */

  apprenant: {
    include: {
      centre: true,
    },
  },

  /*
   * SESSION
   */

  session: {
    include: {
      formation: true,

      modules: {
        include: {
          module: true,
        },

        orderBy: {
          position: "asc",
        },
      },
    },
  },

  /*
   * EVALUATIONS MODULES
   */

  evaluations: true,

  /*
   * EVALUATIONS JURY
   */

  evaluationsJury: true,

  /*
   * PRESENCES
   *
   * C'est ici que les présences
   * de l'inscription sont récupérées.
   *
   * Presence.inscriptionId
   * → Inscription.presences
   */

  presences: true,

  /*
   * RESULTAT FORMATION
   */

  resultatFormation: {
    include: {
      certification: true,
    },
  },
} as const;

/* ============================================================
   RECUPERER UN RESULTAT PAR ID
============================================================ */

export async function getResultatById(
  resultatId: string,
): Promise<
  ActionResponse<ResultatItem>
> {
  try {
    const { centre } =
      await requireCentreManager();

    if (!centre?.id) {
      return {
        success: false,
        message:
          "Aucun centre n'est associé à votre compte.",
      };
    }

    if (!resultatId) {
      return {
        success: false,
        message:
          "Identifiant du résultat manquant.",
      };
    }

    /*
     * ========================================================
     * 1. RECHERCHE PAR INSCRIPTION
     * ========================================================
     */

    const inscription =
      await prisma.inscription.findFirst(
        {
          where: {
            id:
              resultatId,

            session: {
              centreId:
                centre.id,
            },
          },

          include:
            resultatInclude,
        },
      );

    if (inscription) {
      const data =
        await construireResultat(
          inscription,
        );

      return {
        success: true,
        data,
      };
    }

    /*
     * ========================================================
     * 2. COMPATIBILITE ResultatFormation.id
     * ========================================================
     */

    const resultatFormation =
      await prisma.resultatFormation.findFirst(
        {
          where: {
            id:
              resultatId,

            session: {
              centreId:
                centre.id,
            },
          },

          include: {
            inscription: {
              include:
                resultatInclude,
            },
          },
        },
      );

    if (
      resultatFormation
        ?.inscription
    ) {
      const data =
        await construireResultat(
          resultatFormation
            .inscription,
        );

      return {
        success: true,
        data,
      };
    }

    return {
      success: false,
      message:
        "Aucun résultat trouvé pour cet apprenant.",
    };
  } catch (error) {
    console.error(
      "getResultatById:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer le résultat.",
    };
  }
}

/* ============================================================
   RECUPERER TOUS LES RESULTATS
============================================================ */

export async function getResultats(): Promise<
  ActionResponse<ResultatItem[]>
> {
  try {
    const { centre } =
      await requireCentreManager();

    if (!centre?.id) {
      return {
        success: false,
        message:
          "Aucun centre n'est associé à cette opération.",
      };
    }

    const centreId =
      centre.id;

    const inscriptions =
      await prisma.inscription.findMany(
        {
          where: {
            session: {
              centreId,
            },
          },

          include: {
            /*
             * APPRENANT + CENTRE
             */

            apprenant: {
              include: {
                centre: true,
              },
            },

            /*
             * SESSION
             */

            session: {
              include: {
                formation: true,

                modules: {
                  include: {
                    module: true,
                  },

                  orderBy: {
                    position:
                      "asc",
                  },
                },
              },
            },

            /*
             * EVALUATIONS
             */

            evaluations: true,

            /*
             * JURY
             */

            evaluationsJury: true,

            /*
             * PRESENCES
             */

            presences: true,

            /*
             * RESULTAT PERSISTANT
             */

            resultatFormation: {
              include: {
                certification: true,
              },
            },
          },

          orderBy: {
            dateInscription:
              "desc",
          },
        },
      );

    const resultats =
      await Promise.all(
        inscriptions.map(
          (inscription) =>
            construireResultat(
              inscription,
            ),
        ),
      );

    return {
      success: true,
      data: resultats,
    };
  } catch (error) {
    console.error(
      "================================================",
    );

    console.error(
      "ERREUR getResultats",
    );

    console.error(
      "================================================",
    );

    console.error(error);

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les résultats.",
    };
  }
}

/* ============================================================
   SYNCHRONISER RESULTAT FORMATION
============================================================ */

export async function synchroniserResultatFormation(
  inscriptionId: string,
): Promise<
  ActionResponse<ResultatItem>
> {
  try {
    const { centre } =
      await requireCentreManager();

    if (!centre?.id) {
      return {
        success: false,
        message:
          "Aucun centre n'est associé à votre compte.",
      };
    }

    const inscription =
      await prisma.inscription.findFirst(
        {
          where: {
            id:
              inscriptionId,

            session: {
              centreId:
                centre.id,
            },
          },

          include:
            resultatInclude,
        },
      );

    if (!inscription) {
      return {
        success: false,
        message:
          "Inscription introuvable.",
      };
    }

    const resultat =
      await construireResultat(
        inscription,
      );

    if (
      resultat.moyenneGenerale ===
      null
    ) {
      return {
        success: false,

        message:
          "Le résultat final ne peut pas encore être calculé : les évaluations des modules et le jury doivent être disponibles.",
      };
    }

    await prisma.resultatFormation.upsert(
      {
        where: {
          inscriptionId:
            inscription.id,
        },

        create: {
          apprenantId:
            inscription
              .apprenantId,

          sessionId:
            inscription
              .sessionId,

          inscriptionId:
            inscription.id,

          moyenneGenerale:
            resultat
              .moyenneGenerale,

          tauxPresence:
            resultat
              .tauxPresence,

          nombreModules:
            resultat
              .nombreModules,

          modulesReussis:
            resultat
              .modulesReussis,

          modulesEchoues:
            resultat
              .modulesEchoues,

          resultat:
            resultat.resultat,

          commentaire:
            resultat.commentaire,

          dateCalcul:
            new Date(),
        },

        update: {
          moyenneGenerale:
            resultat
              .moyenneGenerale,

          tauxPresence:
            resultat
              .tauxPresence,

          nombreModules:
            resultat
              .nombreModules,

          modulesReussis:
            resultat
              .modulesReussis,

          modulesEchoues:
            resultat
              .modulesEchoues,

          resultat:
            resultat.resultat,

          commentaire:
            resultat.commentaire,

          dateCalcul:
            new Date(),
        },
      },
    );

    return {
      success: true,

      message:
        "Résultat synchronisé avec succès.",

      data: {
        ...resultat,

        id:
          inscription.id,

        inscriptionId:
          inscription.id,
      },
    };
  } catch (error) {
    console.error(
      "synchroniserResultatFormation:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de synchroniser le résultat.",
    };
  }
}

/* ============================================================
   CREER CERTIFICATION
============================================================ */

export async function createCertification(
  inscriptionId: string,
): Promise<ActionResponse> {
  try {
    const { centre } =
      await requireCentreManager();

    if (!centre?.id) {
      return {
        success: false,
        message:
          "Aucun centre n'est associé à votre compte.",
      };
    }

    const inscription =
      await prisma.inscription.findFirst(
        {
          where: {
            id:
              inscriptionId,

            session: {
              centreId:
                centre.id,
            },
          },

          include:
            resultatInclude,
        },
      );

    if (!inscription) {
      return {
        success: false,
        message:
          "Inscription introuvable.",
      };
    }

    const resultat =
      await construireResultat(
        inscription,
      );

    if (
      resultat.moyenneGenerale ===
      null
    ) {
      return {
        success: false,

        message:
          "Impossible de créer la certification : le résultat final 70/30 n'est pas encore disponible.",
      };
    }

    if (
      resultat.resultat !==
      "REUSSITE"
    ) {
      return {
        success: false,

        message:
          "La certification ne peut être créée que pour un résultat de réussite.",
      };
    }

    /*
     * RESULTAT FORMATION
     */

    const resultatFormation =
      await prisma.resultatFormation.upsert(
        {
          where: {
            inscriptionId:
              inscription.id,
          },

          create: {
            apprenantId:
              inscription
                .apprenantId,

            sessionId:
              inscription
                .sessionId,

            inscriptionId:
              inscription.id,

            moyenneGenerale:
              resultat
                .moyenneGenerale!,

            tauxPresence:
              resultat
                .tauxPresence,

            nombreModules:
              resultat
                .nombreModules,

            modulesReussis:
              resultat
                .modulesReussis,

            modulesEchoues:
              resultat
                .modulesEchoues,

            resultat:
              resultat.resultat,

            commentaire:
              resultat.commentaire,

            dateCalcul:
              new Date(),
          },

          update: {
            moyenneGenerale:
              resultat
                .moyenneGenerale!,

            tauxPresence:
              resultat
                .tauxPresence,

            nombreModules:
              resultat
                .nombreModules,

            modulesReussis:
              resultat
                .modulesReussis,

            modulesEchoues:
              resultat
                .modulesEchoues,

            resultat:
              resultat.resultat,

            commentaire:
              resultat.commentaire,

            dateCalcul:
              new Date(),
          },
        },
      );

    /*
     * EVITER LES DOUBLONS
     */

    const certificationExistante =
      await prisma.certification.findFirst(
        {
          where: {
            resultatFormationId:
              resultatFormation.id,

            centreId:
              centre.id,
          },
        },
      );

    if (
      certificationExistante
    ) {
      return {
        success: true,

        message:
          "La certification existe déjà.",

        data:
          certificationExistante,
      };
    }

    /*
     * NUMERO CERTIFICATION
     */

    const annee =
      new Date()
        .getFullYear();

    const numeroBase =
      (
        inscription.numero ??
        inscription.id
      )
        .replace(
          /[^A-Za-z0-9]/g,
          "",
        )
        .toUpperCase();

    const numero =
      `CERT-${annee}-${numeroBase}`;

    /*
     * CREATION
     */

    const certification =
      await prisma.certification.create(
        {
          data: {
            centreId:
              centre.id,

            apprenantId:
              inscription
                .apprenantId,

            formationId:
              inscription
                .session
                .formationId,

            resultatFormationId:
              resultatFormation.id,

            numero,

            intitule:
              `Certificat de ${inscription.session.formation.nom}`,

            dateObtention:
              new Date(),

            statut:
              "PRETE",

            mention:
              resultat.mention,
          },
        },
      );

    return {
      success: true,

      message:
        "Certification créée avec succès.",

      data:
        certification,
    };
  } catch (error) {
    console.error(
      "createCertification:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de créer la certification.",
    };
  }
}

/* ============================================================
   DELIVRER CERTIFICATION
============================================================ */

export async function delivrerCertification(
  certificationId: string,
): Promise<ActionResponse> {
  try {
    const { centre } =
      await requireCentreManager();

    if (!centre?.id) {
      return {
        success: false,
        message:
          "Aucun centre n'est associé à votre compte.",
      };
    }

    const certification =
      await prisma.certification.findFirst(
        {
          where: {
            id:
              certificationId,

            centreId:
              centre.id,
          },
        },
      );

    if (!certification) {
      return {
        success: false,
        message:
          "Certification introuvable.",
      };
    }

    const updated =
      await prisma.certification.update(
        {
          where: {
            id:
              certification.id,
          },

          data: {
            statut:
              "DELIVREE",
          },
        },
      );

    return {
      success: true,

      message:
        "Certification délivrée avec succès.",

      data:
        updated,
    };
  } catch (error) {
    console.error(
      "delivrerCertification:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de délivrer la certification.",
    };
  }
}

/* ============================================================
   PDF — BREVET
============================================================ */

export async function downloadBrevetPdf(
  inscriptionId: string,
): Promise<
  ActionResponse<{
    base64: string;
    filename: string;
  }>
> {
  try {
    const { centre } =
      await requireCentreManager();

    if (!centre?.id) {
      return {
        success: false,

        message:
          "Aucun centre n'est associé à votre compte.",
      };
    }

    const inscription =
      await prisma.inscription.findFirst(
        {
          where: {
            id:
              inscriptionId,

            session: {
              centreId:
                centre.id,
            },
          },

          include:
            resultatInclude,
        },
      );

    if (!inscription) {
      return {
        success: false,

        message:
          "Inscription introuvable.",
      };
    }

    const resultat =
      await construireResultat(
        inscription,
      );

    if (
      resultat.moyenneGenerale ===
      null
    ) {
      return {
        success: false,

        message:
          "Le brevet ne peut pas être généré : le résultat 70/30 n'est pas encore complet.",
      };
    }

    if (
      resultat.resultat !==
      "REUSSITE"
    ) {
      return {
        success: false,

        message:
          "Le brevet ne peut pas être généré pour un résultat qui n'est pas une réussite.",
      };
    }

    /*
     * CERTIFICATION
     */

    let certification =
      resultat.certification;

    if (!certification) {
      const response =
        await createCertification(
          inscriptionId,
        );

      if (!response.success) {
        return {
          success: false,

          message:
            response.message ??
            "Impossible de créer la certification.",
        };
      }

      const resultatRecharge =
        await prisma.resultatFormation.findUnique(
          {
            where: {
              inscriptionId:
                inscription.id,
            },

            include: {
              certification:
                true,
            },
          },
        );

      certification =
        resultatRecharge
          ?.certification
          ? {
              id:
                resultatRecharge
                  .certification.id,

              numero:
                resultatRecharge
                  .certification
                  .numero,

              intitule:
                resultatRecharge
                  .certification
                  .intitule,

              dateObtention:
                resultatRecharge
                  .certification
                  .dateObtention ??
                null,

              statut:
                resultatRecharge
                  .certification
                  .statut,

              mention:
                resultatRecharge
                  .certification
                  .mention ??
                null,

              observations:
                resultatRecharge
                  .certification
                  .observations ??
                null,
            }
          : null;
    }

    if (!certification) {
      return {
        success: false,

        message:
          "La certification n'a pas pu être récupérée.",
      };
    }

    /*
     * GENERATION PDF
     */

    const pdf =
      await generateBrevetPdf({
        centre: {
          nom:
            centre.nom,

          code:
            centre.code,
        },

        apprenant:
          resultat.apprenant,

        formation:
          resultat.formation,

        session:
          resultat.session,

        resultat: {
          moyenneGenerale:
            resultat
              .moyenneGenerale!,

          moyenneEvaluations:
            resultat
              .moyenneEvaluations,

          moyenneJury:
            resultat
              .moyenneJury,

          contributionEvaluations:
            resultat
              .contributionEvaluations,

          contributionJury:
            resultat
              .contributionJury,

          resultat:
            resultat.resultat,

          resultatLabel:
            resultat
              .resultatLabel,

          mention:
            resultat.mention,
        },

        certification,
      });

    const base64 =
      Buffer.from(
        pdf,
      ).toString(
        "base64",
      );

    const filename =
      `brevet-${resultat.apprenant.nom}-${resultat.apprenant.prenom}.pdf`
        .replace(
          /[^a-zA-Z0-9À-ÿ._-]/g,
          "_",
        );

    return {
      success: true,

      data: {
        base64,

        filename,
      },
    };
  } catch (error) {
    console.error(
      "downloadBrevetPdf:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de générer le brevet.",
    };
  }
}

/* ============================================================
   PDF — RELEVE DE NOTES
============================================================ */

export async function downloadReleveNotesPdf(
  inscriptionId: string,
): Promise<
  ActionResponse<{
    base64: string;
    filename: string;
  }>
> {
  try {
    const { centre } =
      await requireCentreManager();

    if (!centre?.id) {
      return {
        success: false,

        message:
          "Aucun centre n'est associé à votre compte.",
      };
    }

    const inscription =
      await prisma.inscription.findFirst(
        {
          where: {
            id:
              inscriptionId,

            session: {
              centreId:
                centre.id,
            },
          },

          include:
            resultatInclude,
        },
      );

    if (!inscription) {
      return {
        success: false,

        message:
          "Inscription introuvable.",
      };
    }

    const resultat =
      await construireResultat(
        inscription,
      );

    /*
     * Le relevé peut être généré
     * même si le jury n'est pas encore disponible.
     */

    const pdf =
      await generateReleveNotesPdf({
        centre: {
          nom:
            centre.nom,

          code:
            centre.code,
        },

        apprenant:
          resultat.apprenant,

        formation:
          resultat.formation,

        session:
          resultat.session,

        resultat: {
          moyenneEvaluations:
            resultat
              .moyenneEvaluations,

          moyenneJury:
            resultat
              .moyenneJury,

          contributionEvaluations:
            resultat
              .contributionEvaluations,

          contributionJury:
            resultat
              .contributionJury,

          moyenneGenerale:
            resultat
              .moyenneGenerale,

          tauxPresence:
            resultat
              .tauxPresence,

          nombreModules:
            resultat
              .nombreModules,

          modulesReussis:
            resultat
              .modulesReussis,

          modulesEchoues:
            resultat
              .modulesEchoues,

          resultat:
            resultat.resultat,

          resultatLabel:
            resultat
              .resultatLabel,

          mention:
            resultat.mention,

          commentaire:
            resultat.commentaire,
        },

        modules:
          resultat.modules,

        jury: {
          nombreEvaluations:
            inscription
              .evaluationsJury
              ?.filter(
                (evaluation: any) =>
                  evaluation.note !==
                    null &&
                  evaluation.note !==
                    undefined,
              )
              .length ?? 0,
        },
      });

    const base64 =
      Buffer.from(
        pdf,
      ).toString(
        "base64",
      );

    const filename =
      `releve-${resultat.apprenant.nom}-${resultat.apprenant.prenom}.pdf`
        .replace(
          /[^a-zA-Z0-9À-ÿ._-]/g,
          "_",
        );

    return {
      success: true,

      data: {
        base64,

        filename,
      },
    };
  } catch (error) {
    console.error(
      "downloadReleveNotesPdf:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de générer le relevé de notes.",
    };
  }
}