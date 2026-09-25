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
  message: string;
  data?: T;
  pdfBase64?: string;
  filename?: string;
};

/* ============================================================
   HELPERS
============================================================ */

function toNumber(value: unknown): number {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function clampPercentage(value: number): number {
  return Math.min(
    100,
    Math.max(0, value),
  );
}

function getMention(
  pourcentage: number,
): string {
  if (pourcentage >= 90) {
    return "EXCELLENT";
  }

  if (pourcentage >= 80) {
    return "TRÈS BIEN";
  }

  if (pourcentage >= 70) {
    return "BIEN";
  }

  if (pourcentage >= 60) {
    return "ASSEZ BIEN";
  }

  if (pourcentage >= 50) {
    return "SATISFAISANT";
  }

  return "INSUFFISANT";
}

function getResultatLabel(
  resultat: string,
): string {
  switch (resultat) {
    case "REUSSITE":
      return "ADMIS";

    case "REUSSITE_SOUS_CONDITION":
      return "ADMIS SOUS CONDITION";

    case "ECHEC":
      return "ÉCHEC";

    default:
      return "NON ÉVALUÉ";
  }
}

function createSafeFilename(
  nom: string | null | undefined,
  prenom: string | null | undefined,
): string {
  return `${nom ?? ""}-${prenom ?? ""}`
    .replace(
      /[^a-zA-Z0-9À-ÿ_-]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    )
    .toLowerCase();
}

/* ============================================================
   DETAIL D'UN RESULTAT
============================================================ */

export async function getResultatById(
  resultatId: string,
): Promise<ActionResponse> {
  try {
    if (!resultatId) {
      return {
        success: false,
        message: "Résultat introuvable.",
      };
    }

    const { centre } =
      await requireCentreManager();

    if (!centre?.id) {
      return {
        success: false,
        message:
          "Aucun centre n'est associé à votre compte.",
      };
    }

    const centreId = centre.id;

    /* ----------------------------------------------------------
       RESULTAT
    ---------------------------------------------------------- */

    const resultat =
      await prisma.resultatFormation.findFirst({
        where: {
          id: resultatId,

          session: {
            centreId,
          },
        },

        include: {
          apprenant: true,

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

          inscription: true,

          certification: true,
        },
      });

    if (!resultat) {
      return {
        success: false,
        message:
          "Résultat introuvable ou inaccessible.",
      };
    }

    /* ----------------------------------------------------------
       EVALUATIONS
    ---------------------------------------------------------- */

    const evaluations =
      await prisma.evaluationResultat.findMany({
        where: {
          inscriptionId:
            resultat.inscriptionId,

          moduleSession: {
            sessionId:
              resultat.sessionId,
          },
        },

        include: {
          moduleSession: {
            include: {
              module: true,
            },
          },

          modele: true,
        },

        orderBy: {
          dateEvaluation: "asc",
        },
      });

    /* ----------------------------------------------------------
       INDEX DES EVALUATIONS
    ---------------------------------------------------------- */

    const evaluationsParModule =
      new Map<
        string,
        (typeof evaluations)[number]
      >();

    for (const evaluation of evaluations) {
      evaluationsParModule.set(
        evaluation.moduleSessionId,
        evaluation,
      );
    }

    /* ----------------------------------------------------------
       MODULES
    ---------------------------------------------------------- */

    const modules =
      resultat.session.modules.map(
        (moduleSession) => {
          const evaluation =
            evaluationsParModule.get(
              moduleSession.id,
            );

          const note = evaluation
            ? toNumber(
                evaluation.note,
              )
            : 0;

          const noteMaximale =
            evaluation
              ? toNumber(
                  evaluation.noteMaximale,
                ) ||
                toNumber(
                  evaluation.modele
                    ?.noteMaximale,
                ) ||
                20
              : 20;

          const pourcentage =
            noteMaximale > 0
              ? clampPercentage(
                  (note /
                    noteMaximale) *
                    100,
                )
              : 0;

          return {
            id:
              evaluation?.id ??
              moduleSession.id,

            moduleSessionId:
              moduleSession.id,

            code:
              moduleSession.module.code,

            nom:
              moduleSession.module.nom,

            position:
              moduleSession.position,

            note,

            noteMaximale,

            pourcentage:
              Number(
                pourcentage.toFixed(2),
              ),

            statut:
              evaluation?.statut ??
              "NON_EVALUE",

            resultat:
              evaluation?.resultat ??
              null,

            commentaire:
              evaluation?.commentaire ??
              null,

            dateEvaluation:
              evaluation?.dateEvaluation ??
              null,
          };
        },
      );

    /* ----------------------------------------------------------
       MOYENNE GENERALE
    ---------------------------------------------------------- */

    const moyenneGenerale =
      clampPercentage(
        toNumber(
          resultat.moyenneGenerale,
        ),
      );

    /* ----------------------------------------------------------
       TAUX DE PRESENCE
    ---------------------------------------------------------- */

    const tauxPresence =
      resultat.tauxPresence === null ||
      resultat.tauxPresence === undefined
        ? null
        : clampPercentage(
            toNumber(
              resultat.tauxPresence,
            ),
          );

    /* ----------------------------------------------------------
       RETOUR
    ---------------------------------------------------------- */

    return {
      success: true,

      message:
        "Résultat récupéré avec succès.",

      data: {
        id: resultat.id,

        centre: {
          id: centre.id,
          nom: centre.nom,
          code: centre.code,
          slug: centre.slug,
        },

        apprenant: {
          id:
            resultat.apprenant.id,

          numero:
            resultat.apprenant.numero,

          prenom:
            resultat.apprenant.prenom,

          nom:
            resultat.apprenant.nom,

          email:
            resultat.apprenant.email,

          telephone:
            resultat.apprenant.telephone,

          dateNaissance:
            resultat.apprenant.dateNaissance,

          lieuNaissance:
            resultat.apprenant.lieuNaissance,

          sexe:
            resultat.apprenant.sexe,

          nationalite:
            resultat.apprenant.nationalite,
        },

        inscription: {
          id:
            resultat.inscription.id,

          numero:
            resultat.inscription.numero,

          statut:
            resultat.inscription.statut,
        },

        session: {
          id:
            resultat.session.id,

          code:
            resultat.session.code,

          nom:
            resultat.session.nom,

          dateDebut:
            resultat.session.dateDebut,

          dateFin:
            resultat.session.dateFin,
        },

        formation: {
          id:
            resultat.session
              .formation.id,

          code:
            resultat.session
              .formation.code,

          nom:
            resultat.session
              .formation.nom,

          description:
            resultat.session
              .formation.description,
        },

        moyenneGenerale,

        tauxPresence,

        nombreModules:
          resultat.nombreModules,

        modulesReussis:
          resultat.modulesReussis,

        modulesEchoues:
          resultat.modulesEchoues,

        resultat:
          resultat.resultat,

        resultatLabel:
          getResultatLabel(
            resultat.resultat,
          ),

        mention:
          resultat.resultat ===
            "REUSSITE" ||
          resultat.resultat ===
            "REUSSITE_SOUS_CONDITION"
            ? getMention(
                moyenneGenerale,
              )
            : "INSUFFISANT",

        commentaire:
          resultat.commentaire,

        dateCalcul:
          resultat.dateCalcul,

        certification:
          resultat.certification
            ? {
                id:
                  resultat
                    .certification.id,

                numero:
                  resultat
                    .certification.numero,

                intitule:
                  resultat
                    .certification.intitule,

                dateObtention:
                  resultat
                    .certification
                    .dateObtention,

                statut:
                  resultat
                    .certification
                    .statut,

                mention:
                  resultat
                    .certification
                    .mention,

                observations:
                  resultat
                    .certification
                    .observations,
              }
            : null,

        modules,
      },
    };
  } catch (error) {
    console.error(
      "GET RESULTAT BY ID:",
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
   LISTE DES RESULTATS
============================================================ */

export async function getResultats() {
  try {
    const { centre } =
      await requireCentreManager();

    if (!centre?.id) {
      return {
        success: false,

        message:
          "Aucun centre n'est associé à votre compte.",

        data: [],
      };
    }

    const centreId = centre.id;

    const resultats =
      await prisma.resultatFormation.findMany({
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

          certification: true,
        },

        orderBy: {
          dateCalcul: "desc",
        },
      });

    return {
      success: true,

      message:
        "Résultats récupérés avec succès.",

      data: resultats.map(
        (item) => {
          const moyenne =
            clampPercentage(
              toNumber(
                item.moyenneGenerale,
              ),
            );

          return {
            id: item.id,

            apprenant: {
              id:
                item.apprenant.id,

              nom:
                item.apprenant.nom,

              prenom:
                item.apprenant.prenom,

              numero:
                item.apprenant.numero,
            },

            formation: {
              id:
                item.session
                  .formation.id,

              code:
                item.session
                  .formation.code,

              nom:
                item.session
                  .formation.nom,
            },

            session: {
              id:
                item.session.id,

              code:
                item.session.code,

              nom:
                item.session.nom,

              dateDebut:
                item.session.dateDebut,

              dateFin:
                item.session.dateFin,
            },

            moyenneGenerale:
              moyenne,

            tauxPresence:
              item.tauxPresence === null
                ? null
                : clampPercentage(
                    toNumber(
                      item.tauxPresence,
                    ),
                  ),

            nombreModules:
              item.nombreModules,

            modulesReussis:
              item.modulesReussis,

            modulesEchoues:
              item.modulesEchoues,

            resultat:
              item.resultat,

            resultatLabel:
              getResultatLabel(
                item.resultat,
              ),

            mention:
              getMention(
                moyenne,
              ),

            certification:
              item.certification
                ? {
                    id:
                      item
                        .certification
                        .id,

                    numero:
                      item
                        .certification
                        .numero,

                    statut:
                      item
                        .certification
                        .statut,
                  }
                : null,

            dateCalcul:
              item.dateCalcul,
          };
        },
      ),
    };
  } catch (error) {
    console.error(
      "GET RESULTATS:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les résultats.",

      data: [],
    };
  }
}

/* ============================================================
   CREATION DE LA CERTIFICATION
============================================================ */

export async function createCertification(
  resultatId: string,
): Promise<ActionResponse> {
  try {
    if (!resultatId) {
      return {
        success: false,

        message:
          "Résultat introuvable.",
      };
    }

    const { centre } =
      await requireCentreManager();

    if (!centre?.id) {
      return {
        success: false,

        message:
          "Aucun centre n'est associé à votre compte.",
      };
    }

    const centreId = centre.id;

    const resultat =
      await prisma.resultatFormation.findFirst({
        where: {
          id: resultatId,

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

          certification: true,
        },
      });

    if (!resultat) {
      return {
        success: false,

        message:
          "Résultat introuvable.",
      };
    }

    if (
      resultat.resultat !==
      "REUSSITE"
    ) {
      return {
        success: false,

        message:
          "Le brevet ne peut être délivré que pour un résultat REUSSITE.",
      };
    }

    if (resultat.certification) {
      return {
        success: true,

        message:
          "Une certification existe déjà.",

        data: {
          id:
            resultat
              .certification.id,

          numero:
            resultat
              .certification.numero,
        },
      };
    }

    /* ----------------------------------------------------------
       NUMERO
    ---------------------------------------------------------- */

    const numeroBase =
      resultat.apprenant.numero ||
      resultat.inscriptionId
        .slice(-8)
        .toUpperCase();

    const annee =
      new Date().getFullYear();

    const numero =
      `CERT-${annee}-${numeroBase}`;

    /* ----------------------------------------------------------
       MENTION
    ---------------------------------------------------------- */

    const moyenne =
      clampPercentage(
        toNumber(
          resultat.moyenneGenerale,
        ),
      );

    const mention =
      getMention(moyenne);

    /* ----------------------------------------------------------
       CREATION
    ---------------------------------------------------------- */

    const certification =
      await prisma.certification.create({
        data: {
          centreId,

          apprenantId:
            resultat.apprenantId,

          formationId:
            resultat.session
              .formationId,

          resultatFormationId:
            resultat.id,

          numero,

          intitule:
            resultat.session
              .formation.nom,

          dateObtention:
            new Date(),

          statut: "PRETE",

          mention,

          observations:
            "Certification préparée à partir du résultat de formation.",
        },
      });

    return {
      success: true,

      message:
        "Certification préparée avec succès.",

      data: {
        id:
          certification.id,

        numero:
          certification.numero,
      },
    };
  } catch (error) {
    console.error(
      "CREATE CERTIFICATION:",
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
   DELIVRER LA CERTIFICATION
============================================================ */

export async function delivrerCertification(
  resultatId: string,
): Promise<ActionResponse> {
  try {
    if (!resultatId) {
      return {
        success: false,

        message:
          "Résultat introuvable.",
      };
    }

    const { centre } =
      await requireCentreManager();

    if (!centre?.id) {
      return {
        success: false,

        message:
          "Aucun centre n'est associé à votre compte.",
      };
    }

    const centreId = centre.id;

    const resultat =
      await prisma.resultatFormation.findFirst({
        where: {
          id: resultatId,

          session: {
            centreId,
          },
        },

        include: {
          certification: true,
        },
      });

    if (!resultat) {
      return {
        success: false,

        message:
          "Résultat introuvable.",
      };
    }

    if (!resultat.certification) {
      return {
        success: false,

        message:
          "Aucune certification n'est associée à ce résultat.",
      };
    }

    const certification =
      await prisma.certification.update({
        where: {
          id:
            resultat.certification.id,
        },

        data: {
          statut: "DELIVREE",

          dateObtention:
            resultat
              .certification
              .dateObtention ??
            new Date(),
        },
      });

    return {
      success: true,

      message:
        "Certification délivrée avec succès.",

      data: {
        id:
          certification.id,

        numero:
          certification.numero,

        statut:
          certification.statut,
      },
    };
  } catch (error) {
    console.error(
      "DELIVRER CERTIFICATION:",
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
  resultatId: string,
): Promise<ActionResponse> {
  try {
    if (!resultatId) {
      return {
        success: false,

        message:
          "Résultat introuvable.",
      };
    }

    const { centre } =
      await requireCentreManager();

    if (!centre?.id) {
      return {
        success: false,

        message:
          "Aucun centre n'est associé à votre compte.",
      };
    }

    const centreId = centre.id;

    /* ----------------------------------------------------------
       RESULTAT
    ---------------------------------------------------------- */

    const detail =
      await getResultatById(
        resultatId,
      );

    if (
      !detail.success ||
      !detail.data
    ) {
      return {
        success: false,

        message:
          detail.message,
      };
    }

    const data =
      detail.data as any;

    /* ----------------------------------------------------------
       SECURITE TENANT
    ---------------------------------------------------------- */

    if (
      data.centre?.id !==
      centreId
    ) {
      return {
        success: false,

        message:
          "Accès au résultat refusé.",
      };
    }

    /* ----------------------------------------------------------
       VERIFICATION ADMISSION
    ---------------------------------------------------------- */

    if (
      data.resultat !==
      "REUSSITE"
    ) {
      return {
        success: false,

        message:
          "Le brevet ne peut être imprimé que pour un apprenant admis.",
      };
    }

    /* ----------------------------------------------------------
       CERTIFICATION
    ---------------------------------------------------------- */

    let certification =
      data.certification;

    if (!certification) {
      const creation =
        await createCertification(
          resultatId,
        );

      if (!creation.success) {
        return {
          success: false,

          message:
            creation.message,
        };
      }

      const refreshed =
        await getResultatById(
          resultatId,
        );

      if (
        !refreshed.success ||
        !refreshed.data
      ) {
        return {
          success: false,

          message:
            "Impossible de récupérer la certification créée.",
        };
      }

      certification =
        (refreshed.data as any)
          .certification;
    }

    if (!certification) {
      return {
        success: false,

        message:
          "Impossible de récupérer la certification.",
      };
    }

    /* ----------------------------------------------------------
       GENERATION PDF
    ---------------------------------------------------------- */

    const pdfBytes =
      await generateBrevetPdf({
        centre: {
          id: centre.id,
          nom: centre.nom,
          code: centre.code,
        },

        apprenant:
          data.apprenant,

        formation:
          data.formation,

        session:
          data.session,

        resultat: {
          moyenneGenerale:
            data.moyenneGenerale,

          resultat:
            data.resultat,

          resultatLabel:
            data.resultatLabel,

          mention:
            data.mention,
        },

        certification,
      });

    /* ----------------------------------------------------------
       BASE64
    ---------------------------------------------------------- */

    const base64 =
      Buffer.from(
        pdfBytes,
      ).toString("base64");

    const safeName =
      createSafeFilename(
        data.apprenant.nom,
        data.apprenant.prenom,
      );

    return {
      success: true,

      message:
        "Brevet généré avec succès.",

      pdfBase64:
        base64,

      filename:
        `brevet-${safeName || "apprenant"}.pdf`,
    };
  } catch (error) {
    console.error(
      "DOWNLOAD BREVET PDF:",
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
  resultatId: string,
): Promise<ActionResponse> {
  try {
    if (!resultatId) {
      return {
        success: false,

        message:
          "Résultat introuvable.",
      };
    }

    const { centre } =
      await requireCentreManager();

    if (!centre?.id) {
      return {
        success: false,

        message:
          "Aucun centre n'est associé à votre compte.",
      };
    }

    const centreId = centre.id;

    /* ----------------------------------------------------------
       RESULTAT
    ---------------------------------------------------------- */

    const detail =
      await getResultatById(
        resultatId,
      );

    if (
      !detail.success ||
      !detail.data
    ) {
      return {
        success: false,

        message:
          detail.message,
      };
    }

    const data =
      detail.data as any;

    /* ----------------------------------------------------------
       SECURITE TENANT
    ---------------------------------------------------------- */

    if (
      data.centre?.id !==
      centreId
    ) {
      return {
        success: false,

        message:
          "Accès au résultat refusé.",
      };
    }

    /* ----------------------------------------------------------
       GENERATION PDF
    ---------------------------------------------------------- */

    const pdfBytes =
      await generateReleveNotesPdf({
        centre: {
          id: centre.id,
          nom: centre.nom,
          code: centre.code,
        },

        apprenant:
          data.apprenant,

        formation:
          data.formation,

        session:
          data.session,

        resultat: {
          moyenneGenerale:
            data.moyenneGenerale,

          tauxPresence:
            data.tauxPresence,

          nombreModules:
            data.nombreModules,

          modulesReussis:
            data.modulesReussis,

          modulesEchoues:
            data.modulesEchoues,

          resultat:
            data.resultat,

          resultatLabel:
            data.resultatLabel,

          mention:
            data.mention,

          commentaire:
            data.commentaire,
        },

        modules:
          data.modules,
      });

    /* ----------------------------------------------------------
       BASE64
    ---------------------------------------------------------- */

    const base64 =
      Buffer.from(
        pdfBytes,
      ).toString("base64");

    const safeName =
      createSafeFilename(
        data.apprenant.nom,
        data.apprenant.prenom,
      );

    return {
      success: true,

      message:
        "Relevé de notes généré avec succès.",

      pdfBase64:
        base64,

      filename:
        `releve-notes-${safeName || "apprenant"}.pdf`,
    };
  } catch (error) {
    console.error(
      "DOWNLOAD RELEVE NOTES PDF:",
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