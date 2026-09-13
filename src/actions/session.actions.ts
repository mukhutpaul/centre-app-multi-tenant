"use server";

// ============================================================
// CENTRE DE FORMATION SaaS
// ACTIONS SERVEUR — SESSIONS DE FORMATION
// Prisma 7
// ============================================================

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import { Prisma } from "@/generated/prisma/client";
import { StatutSession } from "@/generated/prisma/enums";

// ============================================================
// TYPES
// ============================================================

export interface SessionFormData {
    formationId: string;
    code: string;
    nom?: string;
    dateDebut: string | Date;
    dateFin: string | Date;
    capacite?: number | null;
    statut?: StatutSession;
    ouvertureInscriptions?: string | Date | null;
    fermetureInscriptions?: string | Date | null;
    notes?: string;
}

export interface SessionFilters {
    search?: string;
    statut?: StatutSession | "TOUS";
    formationId?: string;
    page?: number;
    limit?: number;
}

export interface SessionModuleData {
    sessionId: string;
    moduleId: string;
}

export interface SessionModulePositionData {
    sessionId: string;
    moduleSessionId: string;
    position: number;
}

// ============================================================
// TYPES INTERNES
// ============================================================

interface AuthenticatedUser {
    id: string;
    email: string;
    centreId: string;
    role: string;
}

// ============================================================
// AUTHENTIFICATION
// ============================================================

async function getAuthenticatedUser(): Promise<
    | {
          success: true;
          user: AuthenticatedUser;
      }
    | {
          success: false;
          error: string;
      }
> {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return {
                success: false,
                error: "Vous devez être connecté.",
            };
        }

        const utilisateur = await prisma.utilisateur.findUnique({
            where: {
                email: session.user.email,
            },
            include: {
                membres: {
                    where: {
                        statut: "ACTIF",
                    },
                    select: {
                        centreId: true,
                        role: true,
                    },
                    orderBy: {
                        creeLe: "asc",
                    },
                },
            },
        });

        if (!utilisateur) {
            return {
                success: false,
                error: "Utilisateur introuvable.",
            };
        }

        if (utilisateur.statut !== "ACTIF") {
            return {
                success: false,
                error: "Votre compte n'est pas actif.",
            };
        }

        const membre = utilisateur.membres[0];

        if (!membre) {
            return {
                success: false,
                error: "Vous n'êtes membre d'aucun centre actif.",
            };
        }

        return {
            success: true,
            user: {
                id: utilisateur.id,
                email: utilisateur.email,
                centreId: membre.centreId,
                role: membre.role,
            },
        };
    } catch (error) {
        console.error("Erreur getAuthenticatedUser():", error);

        return {
            success: false,
            error: "Erreur lors de l'authentification.",
        };
    }
}

// ============================================================
// AUTORISATION
// ============================================================

function canManageSessions(role: string): boolean {
    return [
        "PROPRIETAIRE",
        "ADMINISTRATEUR",
        "RESPONSABLE",
        "SECRETAIRE",
    ].includes(role);
}

// ============================================================
// VALIDATION DES DONNÉES
// ============================================================

function validateSessionData(data: SessionFormData) {
    const errors: Record<string, string> = {};

    if (!data.formationId?.trim()) {
        errors.formationId = "La formation est obligatoire.";
    }

    const code = data.code?.trim();

    if (!code) {
        errors.code = "Le code de la session est obligatoire.";
    } else if (code.length < 2) {
        errors.code = "Le code doit contenir au moins 2 caractères.";
    } else if (code.length > 50) {
        errors.code = "Le code ne peut pas dépasser 50 caractères.";
    }

    if (!data.dateDebut) {
        errors.dateDebut = "La date de début est obligatoire.";
    }

    if (!data.dateFin) {
        errors.dateFin = "La date de fin est obligatoire.";
    }

    let dateDebut: Date | null = null;
    let dateFin: Date | null = null;

    if (data.dateDebut) {
        dateDebut = new Date(data.dateDebut);

        if (isNaN(dateDebut.getTime())) {
            errors.dateDebut = "La date de début est invalide.";
        }
    }

    if (data.dateFin) {
        dateFin = new Date(data.dateFin);

        if (isNaN(dateFin.getTime())) {
            errors.dateFin = "La date de fin est invalide.";
        }
    }

    if (
        dateDebut &&
        dateFin &&
        !isNaN(dateDebut.getTime()) &&
        !isNaN(dateFin.getTime()) &&
        dateFin < dateDebut
    ) {
        errors.dateFin =
            "La date de fin doit être postérieure ou égale à la date de début.";
    }

    if (
        data.capacite !== undefined &&
        data.capacite !== null
    ) {
        const capacite = Number(data.capacite);

        if (!Number.isInteger(capacite) || capacite <= 0) {
            errors.capacite =
                "La capacité doit être un nombre entier supérieur à 0.";
        }
    }

    let ouverture: Date | null = null;
    let fermeture: Date | null = null;

    if (data.ouvertureInscriptions) {
        ouverture = new Date(data.ouvertureInscriptions);

        if (isNaN(ouverture.getTime())) {
            errors.ouvertureInscriptions =
                "La date d'ouverture des inscriptions est invalide.";
        }
    }

    if (data.fermetureInscriptions) {
        fermeture = new Date(data.fermetureInscriptions);

        if (isNaN(fermeture.getTime())) {
            errors.fermetureInscriptions =
                "La date de fermeture des inscriptions est invalide.";
        }
    }

    if (
        ouverture &&
        fermeture &&
        !isNaN(ouverture.getTime()) &&
        !isNaN(fermeture.getTime()) &&
        fermeture < ouverture
    ) {
        errors.fermetureInscriptions =
            "La fermeture des inscriptions doit être postérieure ou égale à leur ouverture.";
    }

    if (
        data.statut &&
        !Object.values(StatutSession).includes(data.statut)
    ) {
        errors.statut = "Le statut de la session est invalide.";
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
    };
}

// ============================================================
// GET SESSIONS
// ============================================================

export async function getSessions(
    filters: SessionFilters = {}
) {
    try {
        const authResult = await getAuthenticatedUser();

        if (!authResult.success) {
            return {
                success: false,
                error: authResult.error,
                data: [],
                total: 0,
                pages: 0,
            };
        }

        const { user } = authResult;

        const page = Math.max(
            1,
            Number(filters.page) || 1
        );

        const limit = Math.min(
            100,
            Math.max(
                1,
                Number(filters.limit) || 10
            )
        );

        const search = filters.search?.trim();

        const where: Prisma.SessionFormationWhereInput = {
            centreId: user.centreId,
        };

        // --------------------------------------------------------
        // FILTRE STATUT
        // --------------------------------------------------------

        if (
            filters.statut &&
            filters.statut !== "TOUS"
        ) {
            where.statut = filters.statut;
        }

        // --------------------------------------------------------
        // FILTRE FORMATION
        // --------------------------------------------------------

        if (filters.formationId) {
            where.formationId = filters.formationId;
        }

        // --------------------------------------------------------
        // RECHERCHE
        // --------------------------------------------------------

        if (search) {
            where.OR = [
                {
                    code: {
                        contains: search,
                    },
                },
                {
                    nom: {
                        contains: search,
                    },
                },
                {
                    notes: {
                        contains: search,
                    },
                },
                {
                    formation: {
                        code: {
                            contains: search,
                        },
                    },
                },
                {
                    formation: {
                        nom: {
                            contains: search,
                        },
                    },
                },
            ];
        }

        const [sessions, total] =
            await prisma.$transaction([
                prisma.sessionFormation.findMany({
                    where,

                    include: {
                        formation: {
                            select: {
                                id: true,
                                code: true,
                                nom: true,
                                type: true,
                                statut: true,
                            },
                        },

                        _count: {
                            select: {
                                modules: true,
                                formateurs: true,
                                inscriptions: true,
                                planning: true,
                                jurys: true,
                                resultatsFormations: true,
                            },
                        },
                    },

                    orderBy: [
                        {
                            dateDebut: "desc",
                        },
                        {
                            creeLe: "desc",
                        },
                    ],

                    skip: (page - 1) * limit,
                    take: limit,
                }),

                prisma.sessionFormation.count({
                    where,
                }),
            ]);

        return {
            success: true,
            data: sessions,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        };
    } catch (error) {
        console.error(
            "Erreur getSessions():",
            error
        );

        return {
            success: false,
            error: "Impossible de récupérer les sessions.",
            data: [],
            total: 0,
            pages: 0,
        };
    }
}

// ============================================================
// GET SESSION PAR ID
// ============================================================


// ============================================================
// GET SESSION PAR ID
// ============================================================

export async function getSessionById(id: string) {
    try {
        const authResult = await getAuthenticatedUser();

        if (!authResult.success) {
            return {
                success: false as const,
                error: authResult.error,
                session: null,
            };
        }

        const { user } = authResult;

        if (!id?.trim()) {
            return {
                success: false as const,
                error: "Identifiant de session invalide.",
                session: null,
            };
        }

        // --------------------------------------------------------
        // RÉCUPÉRER LA SESSION
        // --------------------------------------------------------

        const session = await prisma.sessionFormation.findFirst({
            where: {
                id: id.trim(),
                centreId: user.centreId,
            },

            include: {
                formation: {
                    select: {
                        id: true,
                        code: true,
                        nom: true,
                        description: true,
                        objectifs: true,
                        prerequis: true,
                        type: true,
                        dureeHeures: true,
                        nombreModules: true,
                        statut: true,
                    },
                },

                modules: {
                    orderBy: {
                        position: "asc",
                    },

                    include: {
                        module: {
                            select: {
                                id: true,
                                code: true,
                                nom: true,
                                description: true,
                                position: true,
                                dureeHeures: true,
                                coefficient: true,
                            },
                        },

                        _count: {
                            select: {
                                formateurs: true,
                                evaluations: true,
                            },
                        },
                    },
                },

                formateurs: {
                    include: {
                        formateur: true,
                    },
                },

                inscriptions: {
                    include: {
                        apprenant: true,
                    },

                    orderBy: {
                        dateInscription: "desc",
                    },
                },

                planning: {
                    include: {
                        salle: true,
                    },

                    orderBy: {
                        debut: "asc",
                    },
                },

                jurys: {
                    include: {
                        membres: true,
                        evaluations: true,
                    },

                    orderBy: {
                        datePrevue: "asc",
                    },
                },

                resultatsFormations: {
                    include: {
                        apprenant: true,
                        inscription: true,
                    },
                },

                _count: {
                    select: {
                        modules: true,
                        formateurs: true,
                        inscriptions: true,
                        planning: true,
                        jurys: true,
                        resultatsFormations: true,
                    },
                },
            },
        });

        // --------------------------------------------------------
        // SESSION INTROUVABLE
        // --------------------------------------------------------

        if (!session) {
            return {
                success: false as const,
                error:
                    "Session introuvable ou cette session n'appartient pas à votre centre.",
                session: null,
            };
        }

        // --------------------------------------------------------
        // SÉRIALISATION DES DECIMAL PRISMA
        // --------------------------------------------------------

        const sessionSerialisee = {
            ...session,

            formation: {
                ...session.formation,

                dureeHeures:
                    session.formation.dureeHeures !== null
                        ? Number(
                              session.formation.dureeHeures.toString()
                          )
                        : null,
            },

            modules: session.modules.map((moduleSession) => ({
                ...moduleSession,

                module: {
                    ...moduleSession.module,

                    dureeHeures:
                        moduleSession.module.dureeHeures !== null
                            ? Number(
                                  moduleSession.module.dureeHeures.toString()
                              )
                            : null,

                    coefficient:
                        moduleSession.module.coefficient !== null
                            ? Number(
                                  moduleSession.module.coefficient.toString()
                              )
                            : null,
                },
            })),
        };

        // --------------------------------------------------------
        // IMPORTANT :
        // La page attend sessionResult.session
        // --------------------------------------------------------

        return {
            success: true as const,
            session: sessionSerialisee,
        };
    } catch (error) {
        console.error("Erreur getSessionById():", error);

        return {
            success: false as const,
            error: "Impossible de récupérer la session.",
            session: null,
        };
    }
}


// ============================================================
// CRÉER UNE SESSION
// ============================================================

export async function createSession(
    data: SessionFormData
) {
    try {
        const authResult =
            await getAuthenticatedUser();

        if (!authResult.success) {
            return {
                success: false,
                error: authResult.error,
            };
        }

        const { user } = authResult;

        if (!canManageSessions(user.role)) {
            return {
                success: false,
                error:
                    "Vous n'avez pas l'autorisation de créer une session.",
            };
        }

        const validation =
            validateSessionData(data);

        if (!validation.valid) {
            return {
                success: false,
                error:
                    "Veuillez corriger les erreurs du formulaire.",
                errors: validation.errors,
            };
        }

        const code = data.code.trim();

        // --------------------------------------------------------
        // VÉRIFIER LA FORMATION
        // --------------------------------------------------------

        const formation =
            await prisma.formation.findFirst({
                where: {
                    id: data.formationId,
                    centreId: user.centreId,
                },

                select: {
                    id: true,
                    statut: true,
                },
            });

        if (!formation) {
            return {
                success: false,
                error:
                    "Formation introuvable ou non accessible.",
            };
        }

        // --------------------------------------------------------
        // CODE UNIQUE DANS LE CENTRE
        // --------------------------------------------------------

        const existing =
            await prisma.sessionFormation.findFirst({
                where: {
                    centreId: user.centreId,
                    code,
                },

                select: {
                    id: true,
                },
            });

        if (existing) {
            return {
                success: false,
                error:
                    `Le code de session "${code}" est déjà utilisé.`,
            };
        }

        // --------------------------------------------------------
        // CRÉATION
        // --------------------------------------------------------

        const session =
            await prisma.sessionFormation.create({
                data: {
                    centreId: user.centreId,
                    formationId: formation.id,

                    code,

                    nom:
                        data.nom?.trim() ||
                        null,

                    dateDebut:
                        new Date(data.dateDebut),

                    dateFin:
                        new Date(data.dateFin),

                    capacite:
                        data.capacite === null ||
                        data.capacite === undefined
                            ? null
                            : Number(data.capacite),

                    statut:
                        data.statut ||
                        StatutSession.PLANIFIEE,

                    ouvertureInscriptions:
                        data.ouvertureInscriptions
                            ? new Date(
                                  data.ouvertureInscriptions
                              )
                            : null,

                    fermetureInscriptions:
                        data.fermetureInscriptions
                            ? new Date(
                                  data.fermetureInscriptions
                              )
                            : null,

                    notes:
                        data.notes?.trim() ||
                        null,
                },

                include: {
                    formation: {
                        select: {
                            id: true,
                            code: true,
                            nom: true,
                        },
                    },
                },
            });

        revalidatePath(
            "/sessions"
        );

        return {
            success: true,
            message:
                "Session créée avec succès.",
            data: session,
        };
    } catch (error) {
        console.error(
            "Erreur createSession():",
            error
        );

        if (
            error instanceof
            Prisma.PrismaClientKnownRequestError
        ) {
            if (error.code === "P2002") {
                return {
                    success: false,
                    error:
                        "Une session avec ce code existe déjà dans ce centre.",
                };
            }
        }

        return {
            success: false,
            error:
                "Impossible de créer la session.",
        };
    }
}

// ============================================================
// MODIFIER UNE SESSION
// ============================================================

export async function updateSession(
    id: string,
    data: SessionFormData
) {
    try {
        const authResult =
            await getAuthenticatedUser();

        if (!authResult.success) {
            return {
                success: false,
                error: authResult.error,
            };
        }

        const { user } = authResult;

        if (!canManageSessions(user.role)) {
            return {
                success: false,
                error:
                    "Vous n'avez pas l'autorisation de modifier une session.",
            };
        }

        if (!id) {
            return {
                success: false,
                error:
                    "Identifiant de session invalide.",
            };
        }

        const validation =
            validateSessionData(data);

        if (!validation.valid) {
            return {
                success: false,
                error:
                    "Veuillez corriger les erreurs du formulaire.",
                errors: validation.errors,
            };
        }

        // --------------------------------------------------------
        // SESSION
        // --------------------------------------------------------

        const session =
            await prisma.sessionFormation.findFirst({
                where: {
                    id,
                    centreId: user.centreId,
                },

                select: {
                    id: true,
                    formationId: true,
                },
            });

        if (!session) {
            return {
                success: false,
                error: "Session introuvable.",
            };
        }

        // --------------------------------------------------------
        // FORMATION
        // --------------------------------------------------------

        const formation =
            await prisma.formation.findFirst({
                where: {
                    id: data.formationId,
                    centreId: user.centreId,
                },

                select: {
                    id: true,
                },
            });

        if (!formation) {
            return {
                success: false,
                error:
                    "Formation introuvable ou non accessible.",
            };
        }

        // --------------------------------------------------------
        // CAPACITÉ
        // --------------------------------------------------------

        if (
            data.capacite !== null &&
            data.capacite !== undefined
        ) {
            const nombreInscriptions =
                await prisma.inscription.count({
                    where: {
                        sessionId: id,

                        statut: {
                            notIn: [
                                "ANNULEE",
                            ],
                        },
                    },
                });

            if (
                Number(data.capacite) <
                nombreInscriptions
            ) {
                return {
                    success: false,
                    error:
                        `La capacité ne peut pas être inférieure au nombre ` +
                        `d'inscriptions actuelles (${nombreInscriptions}).`,
                };
            }
        }

        // --------------------------------------------------------
        // CODE UNIQUE
        // --------------------------------------------------------

        const code = data.code.trim();

        const existing =
            await prisma.sessionFormation.findFirst({
                where: {
                    centreId: user.centreId,
                    code,

                    NOT: {
                        id,
                    },
                },

                select: {
                    id: true,
                },
            });

        if (existing) {
            return {
                success: false,
                error:
                    `Le code de session "${code}" est déjà utilisé.`,
            };
        }

        // --------------------------------------------------------
        // MODIFICATION
        // --------------------------------------------------------

        const updated =
            await prisma.sessionFormation.update({
                where: {
                    id,
                },

                data: {
                    formationId: formation.id,

                    code,

                    nom:
                        data.nom?.trim() ||
                        null,

                    dateDebut:
                        new Date(data.dateDebut),

                    dateFin:
                        new Date(data.dateFin),

                    capacite:
                        data.capacite === null ||
                        data.capacite === undefined
                            ? null
                            : Number(data.capacite),

                    statut:
                        data.statut ||
                        StatutSession.PLANIFIEE,

                    ouvertureInscriptions:
                        data.ouvertureInscriptions
                            ? new Date(
                                  data.ouvertureInscriptions
                              )
                            : null,

                    fermetureInscriptions:
                        data.fermetureInscriptions
                            ? new Date(
                                  data.fermetureInscriptions
                              )
                            : null,

                    notes:
                        data.notes?.trim() ||
                        null,
                },

                include: {
                    formation: {
                        select: {
                            id: true,
                            code: true,
                            nom: true,
                        },
                    },
                },
            });

        revalidatePath(
            "/sessions"
        );

        revalidatePath(
            `/sessions/${id}`
        );

        return {
            success: true,
            message:
                "Session modifiée avec succès.",
            data: updated,
        };
    } catch (error) {
        console.error(
            "Erreur updateSession():",
            error
        );

        if (
            error instanceof
            Prisma.PrismaClientKnownRequestError
        ) {
            if (error.code === "P2002") {
                return {
                    success: false,
                    error:
                        "Une session avec ce code existe déjà dans ce centre.",
                };
            }
        }

        return {
            success: false,
            error:
                "Impossible de modifier la session.",
        };
    }
}

// ============================================================
// MODIFIER LE STATUT
// ============================================================

export async function updateSessionStatut(
    id: string,
    statut: StatutSession
) {
    try {
        const authResult =
            await getAuthenticatedUser();

        if (!authResult.success) {
            return {
                success: false,
                error: authResult.error,
            };
        }

        const { user } = authResult;

        if (!canManageSessions(user.role)) {
            return {
                success: false,
                error:
                    "Vous n'avez pas l'autorisation de modifier le statut d'une session.",
            };
        }

        if (!id) {
            return {
                success: false,
                error:
                    "Identifiant de session invalide.",
            };
        }

        if (
            !Object.values(StatutSession).includes(
                statut
            )
        ) {
            return {
                success: false,
                error:
                    "Statut de session invalide.",
            };
        }

        const session =
            await prisma.sessionFormation.findFirst({
                where: {
                    id,
                    centreId: user.centreId,
                },

                select: {
                    id: true,
                },
            });

        if (!session) {
            return {
                success: false,
                error: "Session introuvable.",
            };
        }

        const updated =
            await prisma.sessionFormation.update({
                where: {
                    id,
                },

                data: {
                    statut,
                },

                select: {
                    id: true,
                    statut: true,
                },
            });

        revalidatePath(
            "/sessions"
        );

        revalidatePath(
            `/sessions/${id}`
        );

        return {
            success: true,
            message:
                "Statut de la session mis à jour.",
            data: updated,
        };
    } catch (error) {
        console.error(
            "Erreur updateSessionStatut():",
            error
        );

        return {
            success: false,
            error:
                "Impossible de modifier le statut de la session.",
        };
    }
}

// ============================================================
// SUPPRIMER UNE SESSION
// ============================================================

export async function deleteSession(
    id: string
) {
    try {
        const authResult =
            await getAuthenticatedUser();

        if (!authResult.success) {
            return {
                success: false,
                error: authResult.error,
            };
        }

        const { user } = authResult;

        if (!canManageSessions(user.role)) {
            return {
                success: false,
                error:
                    "Vous n'avez pas l'autorisation de supprimer une session.",
            };
        }

        if (!id) {
            return {
                success: false,
                error:
                    "Identifiant de session invalide.",
            };
        }

        const session =
            await prisma.sessionFormation.findFirst({
                where: {
                    id,
                    centreId: user.centreId,
                },

                select: {
                    id: true,
                    code: true,
                },
            });

        if (!session) {
            return {
                success: false,
                error: "Session introuvable.",
            };
        }

        // --------------------------------------------------------
        // VÉRIFIER LES DONNÉES LIÉES
        // --------------------------------------------------------

        const [
            modulesCount,
            formateursCount,
            inscriptionsCount,
            planningCount,
            jurysCount,
            resultatsCount,
        ] = await Promise.all([
            prisma.moduleSession.count({
                where: {
                    sessionId: id,
                },
            }),

            prisma.formateurSession.count({
                where: {
                    sessionId: id,
                },
            }),

            prisma.inscription.count({
                where: {
                    sessionId: id,
                },
            }),

            prisma.planning.count({
                where: {
                    sessionId: id,
                },
            }),

            prisma.jury.count({
                where: {
                    sessionId: id,
                },
            }),

            prisma.resultatFormation.count({
                where: {
                    sessionId: id,
                },
            }),
        ]);

        const dependencies: string[] = [];

        if (modulesCount > 0) {
            dependencies.push(
                `${modulesCount} module(s)`
            );
        }

        if (formateursCount > 0) {
            dependencies.push(
                `${formateursCount} formateur(s)`
            );
        }

        if (inscriptionsCount > 0) {
            dependencies.push(
                `${inscriptionsCount} inscription(s)`
            );
        }

        if (planningCount > 0) {
            dependencies.push(
                `${planningCount} élément(s) de planning`
            );
        }

        if (jurysCount > 0) {
            dependencies.push(
                `${jurysCount} jury(s)`
            );
        }

        if (resultatsCount > 0) {
            dependencies.push(
                `${resultatsCount} résultat(s)`
            );
        }

        if (dependencies.length > 0) {
            return {
                success: false,
                error:
                    `Impossible de supprimer la session "${session.code}". ` +
                    `Elle contient encore : ${dependencies.join(", ")}.`,
            };
        }

        // --------------------------------------------------------
        // SUPPRESSION
        // --------------------------------------------------------

        await prisma.sessionFormation.delete({
            where: {
                id,
            },
        });

        revalidatePath(
            "/sessions"
        );

        return {
            success: true,
            message:
                "Session supprimée avec succès.",
        };
    } catch (error) {
        console.error(
            "Erreur deleteSession():",
            error
        );

        if (
            error instanceof
            Prisma.PrismaClientKnownRequestError
        ) {
            if (error.code === "P2003") {
                return {
                    success: false,
                    error:
                        "Impossible de supprimer cette session car elle est encore utilisée par d'autres données.",
                };
            }
        }

        return {
            success: false,
            error:
                "Impossible de supprimer la session.",
        };
    }
}

// ============================================================
// FORMATIONS DISPONIBLES POUR UNE SESSION
// ============================================================

// ============================================================
// FORMATIONS DISPONIBLES POUR UNE SESSION
// ============================================================

export async function getFormationsForSession() {
    try {
        const authResult = await getAuthenticatedUser();

        if (!authResult.success) {
            return {
                success: false,
                error: authResult.error,
                formations: [],
            };
        }

        const { user } = authResult;

        const formations = await prisma.formation.findMany({
            where: {
                centreId: user.centreId,
                statut: {
                    not: "ARCHIVEE",
                },
            },

            select: {
                id: true,
                code: true,
                nom: true,
                type: true,
                dureeHeures: true,
                nombreModules: true,
                statut: true,

                _count: {
                    select: {
                        modules: true,
                        sessions: true,
                    },
                },
            },

            orderBy: [
                {
                    nom: "asc",
                },
                {
                    code: "asc",
                },
            ],
        });

        /*
        ========================================================
        SÉRIALISATION DES DONNÉES PRISMA
        ========================================================
        */

        const formationsSerialisees = formations.map(
            (formation) => ({
                id: formation.id,
                code: formation.code,
                nom: formation.nom,
                type: formation.type,

                dureeHeures:
                    formation.dureeHeures !== null
                        ? Number(
                              formation.dureeHeures.toString()
                          )
                        : null,

                nombreModules: formation.nombreModules,
                statut: formation.statut,

                _count: {
                    modules: formation._count.modules,
                    sessions: formation._count.sessions,
                },
            })
        );

        return {
            success: true,
            formations: formationsSerialisees,
        };
    } catch (error) {
        console.error(
            "Erreur getFormationsForSession():",
            error
        );

        return {
            success: false,
            error: "Impossible de récupérer les formations.",
            formations: [],
        };
    }
}

// ============================================================
// GET MODULES D'UNE SESSION
// ============================================================
//
// ModuleFormation possède :
//
//     modulesSessions ModuleSession[]
//
// ============================================================


// ============================================================
// GET MODULES D'UNE SESSION
// ============================================================
//
// IMPORTANT :
// On récupère TOUS les modules appartenant à la formation
// de la session.
//
// Pour chaque module, on vérifie ensuite s'il est déjà ajouté
// à cette session.
//
// Cela permet d'afficher :
// - les modules déjà présents dans la session
// - les modules disponibles à ajouter
//
// ============================================================

export async function getSessionModules(
    sessionId: string
) {
    try {
        // --------------------------------------------------------
        // AUTHENTIFICATION
        // --------------------------------------------------------

        const authResult =
            await getAuthenticatedUser();

        if (!authResult.success) {
            return {
                success: false as const,
                error: authResult.error,
                modules: [],
            };
        }

        const { user } = authResult;

        // --------------------------------------------------------
        // VALIDATION
        // --------------------------------------------------------

        if (!sessionId?.trim()) {
            return {
                success: false as const,
                error:
                    "Identifiant de session invalide.",
                modules: [],
            };
        }

        const cleanSessionId =
            sessionId.trim();

        // --------------------------------------------------------
        // RÉCUPÉRER LA SESSION
        // --------------------------------------------------------
        //
        // On récupère uniquement la formationId.
        //
        // IMPORTANT :
        // La session est obligatoirement limitée au centre
        // de l'utilisateur connecté.
        //
        // --------------------------------------------------------

        const session =
            await prisma.sessionFormation.findFirst({
                where: {
                    id: cleanSessionId,
                    centreId: user.centreId,
                },

                select: {
                    id: true,
                    formationId: true,
                },
            });

        if (!session) {
            return {
                success: false as const,
                error: "Session introuvable.",
                modules: [],
            };
        }

        // --------------------------------------------------------
        // RÉCUPÉRER TOUS LES MODULES DE LA FORMATION
        // --------------------------------------------------------
        //
        // ATTENTION :
        //
        // Il ne faut PAS faire :
        //
        // where: {
        //     modulesSessions: {
        //         some: {
        //             sessionId: cleanSessionId
        //         }
        //     }
        // }
        //
        // car cette condition ne retournerait QUE les modules
        // déjà ajoutés à la session.
        //
        // Si la session contient 0 module, on obtiendrait donc
        // 0 résultat.
        //
        // Ici, on récupère TOUS les modules de la formation.
        //
        // Puis on vérifie pour chacun s'il existe un
        // ModuleSession correspondant à cette session.
        //
        // --------------------------------------------------------

        const modulesFormation =
            await prisma.moduleFormation.findMany({
                where: {
                    formationId:
                        session.formationId,
                },

                orderBy: {
                    position: "asc",
                },

                select: {
                    id: true,
                    code: true,
                    nom: true,
                    description: true,
                    position: true,
                    dureeHeures: true,
                    coefficient: true,

                    modulesSessions: {
                        where: {
                            sessionId:
                                cleanSessionId,
                        },

                        select: {
                            id: true,
                            sessionId: true,
                            moduleId: true,
                            position: true,
                            dateDebut: true,
                            dateFin: true,

                            _count: {
                                select: {
                                    formateurs: true,
                                    evaluations: true,
                                },
                            },
                        },

                        take: 1,
                    },
                },
            });

        // --------------------------------------------------------
        // TRANSFORMATION DES DONNÉES
        // --------------------------------------------------------
        //
        // On transforme les Decimal Prisma en number.
        //
        // On retourne un objet simple utilisable directement
        // par le composant React client.
        //
        // --------------------------------------------------------

        const modules =
            modulesFormation.map(
                (moduleFormation) => {
                    const moduleSession =
                        moduleFormation
                            .modulesSessions[0] ??
                        null;

                    return {
                        id: moduleFormation.id,

                        code: moduleFormation.code,

                        nom: moduleFormation.nom,

                        description:
                            moduleFormation.description,

                        // Position dans la formation
                        formationPosition:
                            moduleFormation.position,

                        // Decimal Prisma -> number
                        dureeHeures:
                            moduleFormation.dureeHeures !==
                            null
                                ? Number(
                                      moduleFormation.dureeHeures.toString()
                                  )
                                : null,

                        // Decimal Prisma -> number
                        coefficient:
                            moduleFormation.coefficient !==
                            null
                                ? Number(
                                      moduleFormation.coefficient.toString()
                                  )
                                : null,

                        // ------------------------------------------------
                        // INFORMATIONS DE LA SESSION
                        // ------------------------------------------------

                        estDansSession:
                            Boolean(
                                moduleSession
                            ),

                        moduleSessionId:
                            moduleSession?.id ??
                            null,

                        positionSession:
                            moduleSession?.position ??
                            null,

                        dateDebut:
                            moduleSession?.dateDebut ??
                            null,

                        dateFin:
                            moduleSession?.dateFin ??
                            null,

                        nombreFormateurs:
                            moduleSession?._count
                                .formateurs ?? 0,

                        nombreEvaluations:
                            moduleSession?._count
                                .evaluations ?? 0,
                    };
                }
            );

        // --------------------------------------------------------
        // RETOUR
        // --------------------------------------------------------
        //
        // IMPORTANT :
        // Le composant SessionDetailClient attend :
        //
        // result.modules
        //
        // et non :
        //
        // result.data
        //
        // --------------------------------------------------------

        return {
            success: true as const,
            modules,
        };
    } catch (error) {
        console.error(
            "Erreur getSessionModules():",
            error
        );

        return {
            success: false as const,
            error:
                "Impossible de récupérer les modules de la session.",
            modules: [],
        };
    }
}


// ============================================================
// AJOUTER UN MODULE À UNE SESSION
// ============================================================

export async function addModuleToSession(
    sessionId: string,
    moduleId: string
) {
    try {
        const authResult =
            await getAuthenticatedUser();

        if (!authResult.success) {
            return {
                success: false,
                error: authResult.error,
            };
        }

        const { user } = authResult;

        if (!canManageSessions(user.role)) {
            return {
                success: false,
                error:
                    "Vous n'avez pas l'autorisation de modifier les modules d'une session.",
            };
        }

        if (!sessionId || !moduleId) {
            return {
                success: false,
                error:
                    "Session ou module invalide.",
            };
        }

        // --------------------------------------------------------
        // SESSION DU CENTRE
        // --------------------------------------------------------

        const session =
            await prisma.sessionFormation.findFirst({
                where: {
                    id: sessionId,
                    centreId: user.centreId,
                },

                select: {
                    id: true,
                    formationId: true,
                },
            });

        if (!session) {
            return {
                success: false,
                error: "Session introuvable.",
            };
        }

        // --------------------------------------------------------
        // MODULE DE LA FORMATION
        // --------------------------------------------------------

        const moduleFormation =
            await prisma.moduleFormation.findFirst({
                where: {
                    id: moduleId,
                    formationId:
                        session.formationId,
                },

                select: {
                    id: true,
                    code: true,
                    nom: true,
                },
            });

        if (!moduleFormation) {
            return {
                success: false,
                error:
                    "Ce module n'appartient pas à la formation de cette session.",
            };
        }

        // --------------------------------------------------------
        // VÉRIFIER SI DÉJÀ AJOUTÉ
        // --------------------------------------------------------

        const existing =
            await prisma.moduleSession.findUnique({
                where: {
                    sessionId_moduleId: {
                        sessionId,
                        moduleId,
                    },
                },

                select: {
                    id: true,
                },
            });

        if (existing) {
            return {
                success: false,
                error:
                    "Ce module est déjà ajouté à cette session.",
            };
        }

        // --------------------------------------------------------
        // CALCULER LA PROCHAINE POSITION
        // --------------------------------------------------------

        const lastModule =
            await prisma.moduleSession.findFirst({
                where: {
                    sessionId,
                },

                orderBy: {
                    position: "desc",
                },

                select: {
                    position: true,
                },
            });

        const position =
            (lastModule?.position ?? 0) + 1;

        // --------------------------------------------------------
        // CRÉATION
        // --------------------------------------------------------

        const moduleSession =
            await prisma.moduleSession.create({
                data: {
                    sessionId,
                    moduleId,
                    position,
                },

                include: {
                    module: true,
                },
            });

        revalidatePath(
            `/sessions/${sessionId}`
        );

        revalidatePath(
            "/sessions"
        );

        return {
            success: true,
            message:
                `Le module "${moduleFormation.nom}" a été ajouté à la session.`,
            data: moduleSession,
        };
    } catch (error) {
        console.error(
            "Erreur addModuleToSession():",
            error
        );

        if (
            error instanceof
            Prisma.PrismaClientKnownRequestError
        ) {
            if (error.code === "P2002") {
                return {
                    success: false,
                    error:
                        "Ce module est déjà présent dans cette session.",
                };
            }
        }

        return {
            success: false,
            error:
                "Impossible d'ajouter le module à la session.",
        };
    }
}

// ============================================================
// RETIRER UN MODULE D'UNE SESSION
// ============================================================

export async function removeModuleFromSession(
    sessionId: string,
    moduleId: string
) {
    try {
        const authResult =
            await getAuthenticatedUser();

        if (!authResult.success) {
            return {
                success: false,
                error: authResult.error,
            };
        }

        const { user } = authResult;

        if (!canManageSessions(user.role)) {
            return {
                success: false,
                error:
                    "Vous n'avez pas l'autorisation de modifier les modules d'une session.",
            };
        }

        if (!sessionId || !moduleId) {
            return {
                success: false,
                error:
                    "Session ou module invalide.",
            };
        }

        // --------------------------------------------------------
        // SESSION
        // --------------------------------------------------------

        const session =
            await prisma.sessionFormation.findFirst({
                where: {
                    id: sessionId,
                    centreId: user.centreId,
                },

                select: {
                    id: true,
                },
            });

        if (!session) {
            return {
                success: false,
                error: "Session introuvable.",
            };
        }

        // --------------------------------------------------------
        // MODULE SESSION
        // --------------------------------------------------------

        const moduleSession =
            await prisma.moduleSession.findUnique({
                where: {
                    sessionId_moduleId: {
                        sessionId,
                        moduleId,
                    },
                },

                include: {
                    module: true,

                    _count: {
                        select: {
                            formateurs: true,
                            evaluations: true,
                        },
                    },
                },
            });

        if (!moduleSession) {
            return {
                success: false,
                error:
                    "Ce module n'est pas présent dans cette session.",
            };
        }

        // --------------------------------------------------------
        // PROTECTION DES DONNÉES MÉTIER
        // --------------------------------------------------------

        if (
            moduleSession._count.evaluations > 0 ||
            moduleSession._count.formateurs > 0
        ) {
            const raisons: string[] = [];

            if (
                moduleSession._count.formateurs > 0
            ) {
                raisons.push(
                    `${moduleSession._count.formateurs} formateur(s)`
                );
            }

            if (
                moduleSession._count.evaluations > 0
            ) {
                raisons.push(
                    `${moduleSession._count.evaluations} évaluation(s)`
                );
            }

            return {
                success: false,
                error:
                    `Impossible de retirer le module "${moduleSession.module.nom}". ` +
                    `Il est déjà utilisé par ${raisons.join(
                        " et "
                    )}.`,
            };
        }

        // --------------------------------------------------------
        // SUPPRESSION + RÉORDONNEMENT
        // --------------------------------------------------------

        await prisma.$transaction(
            async (tx) => {
                await tx.moduleSession.delete({
                    where: {
                        id: moduleSession.id,
                    },
                });

                const remaining =
                    await tx.moduleSession.findMany({
                        where: {
                            sessionId,
                        },

                        orderBy: {
                            position: "asc",
                        },

                        select: {
                            id: true,
                        },
                    });

                // Éviter les collisions de @@unique
                for (
                    let index = 0;
                    index < remaining.length;
                    index++
                ) {
                    await tx.moduleSession.update({
                        where: {
                            id: remaining[index].id,
                        },

                        data: {
                            position: -(index + 1),
                        },
                    });
                }

                for (
                    let index = 0;
                    index < remaining.length;
                    index++
                ) {
                    await tx.moduleSession.update({
                        where: {
                            id: remaining[index].id,
                        },

                        data: {
                            position: index + 1,
                        },
                    });
                }
            }
        );

        revalidatePath(
            `/sessions/${sessionId}`
        );

        return {
            success: true,
            message:
                `Le module "${moduleSession.module.nom}" a été retiré de la session.`,
        };
    } catch (error) {
        console.error(
            "Erreur removeModuleFromSession():",
            error
        );

        return {
            success: false,
            error:
                "Impossible de retirer le module de la session.",
        };
    }
}

// ============================================================
// MODIFIER LA POSITION D'UN MODULE
// ============================================================

export async function updateSessionModulePosition(
    sessionId: string,
    moduleSessionId: string,
    position: number
) {
    try {
        const authResult =
            await getAuthenticatedUser();

        if (!authResult.success) {
            return {
                success: false,
                error: authResult.error,
            };
        }

        const { user } = authResult;

        if (!canManageSessions(user.role)) {
            return {
                success: false,
                error:
                    "Vous n'avez pas l'autorisation de réordonner les modules.",
            };
        }

        if (!sessionId || !moduleSessionId) {
            return {
                success: false,
                error:
                    "Session ou module invalide.",
            };
        }

        if (
            !Number.isInteger(position) ||
            position < 1
        ) {
            return {
                success: false,
                error:
                    "La position doit être un entier supérieur ou égal à 1.",
            };
        }

        // --------------------------------------------------------
        // SESSION
        // --------------------------------------------------------

        const session =
            await prisma.sessionFormation.findFirst({
                where: {
                    id: sessionId,
                    centreId: user.centreId,
                },

                select: {
                    id: true,
                },
            });

        if (!session) {
            return {
                success: false,
                error: "Session introuvable.",
            };
        }

        // --------------------------------------------------------
        // MODULE
        // --------------------------------------------------------

        const current =
            await prisma.moduleSession.findFirst({
                where: {
                    id: moduleSessionId,
                    sessionId,
                },

                select: {
                    id: true,
                    position: true,
                },
            });

        if (!current) {
            return {
                success: false,
                error:
                    "Module introuvable dans cette session.",
            };
        }

        // --------------------------------------------------------
        // TOUS LES MODULES
        // --------------------------------------------------------

        const modules =
            await prisma.moduleSession.findMany({
                where: {
                    sessionId,
                },

                orderBy: {
                    position: "asc",
                },

                select: {
                    id: true,
                    position: true,
                },
            });

        const total = modules.length;

        if (position > total) {
            return {
                success: false,
                error:
                    `La position maximale est ${total}.`,
            };
        }

        if (
            position === current.position
        ) {
            return {
                success: true,
                message:
                    "La position du module est déjà correcte.",
            };
        }

        // --------------------------------------------------------
        // NOUVEL ORDRE
        // --------------------------------------------------------

        const reordered =
            modules.filter(
                (item) =>
                    item.id !==
                    moduleSessionId
            );

        reordered.splice(
            position - 1,
            0,
            {
                id: moduleSessionId,
                position: 0,
            }
        );

        // --------------------------------------------------------
        // TRANSACTION
        // --------------------------------------------------------

        await prisma.$transaction(
            async (tx) => {
                // Étape 1 :
                // positions temporaires négatives

                for (
                    let index = 0;
                    index < reordered.length;
                    index++
                ) {
                    await tx.moduleSession.update({
                        where: {
                            id: reordered[index].id,
                        },

                        data: {
                            position: -(index + 1),
                        },
                    });
                }

                // Étape 2 :
                // positions définitives

                for (
                    let index = 0;
                    index < reordered.length;
                    index++
                ) {
                    await tx.moduleSession.update({
                        where: {
                            id: reordered[index].id,
                        },

                        data: {
                            position: index + 1,
                        },
                    });
                }
            }
        );

        revalidatePath(
            `/sessions/${sessionId}`
        );

        return {
            success: true,
            message:
                "Ordre des modules mis à jour.",
        };
    } catch (error) {
        console.error(
            "Erreur updateSessionModulePosition():",
            error
        );

        return {
            success: false,
            error:
                "Impossible de réordonner les modules.",
        };
    }
}

// ============================================================
// DÉPLACER UN MODULE VERS LE HAUT
// ============================================================

export async function moveSessionModuleUp(
    sessionId: string,
    moduleSessionId: string
) {
    try {
        const authResult =
            await getAuthenticatedUser();

        if (!authResult.success) {
            return {
                success: false,
                error: authResult.error,
            };
        }

        if (
            !canManageSessions(
                authResult.user.role
            )
        ) {
            return {
                success: false,
                error:
                    "Vous n'avez pas l'autorisation de réordonner les modules.",
            };
        }

        const current =
            await prisma.moduleSession.findFirst({
                where: {
                    id: moduleSessionId,
                    sessionId,

                    session: {
                        centreId:
                            authResult.user
                                .centreId,
                    },
                },

                select: {
                    position: true,
                },
            });

        if (!current) {
            return {
                success: false,
                error:
                    "Module introuvable dans cette session.",
            };
        }

        if (current.position <= 1) {
            return {
                success: false,
                error:
                    "Le module est déjà en première position.",
            };
        }

        return updateSessionModulePosition(
            sessionId,
            moduleSessionId,
            current.position - 1
        );
    } catch (error) {
        console.error(
            "Erreur moveSessionModuleUp():",
            error
        );

        return {
            success: false,
            error:
                "Impossible de déplacer le module.",
        };
    }
}

// ============================================================
// DÉPLACER UN MODULE VERS LE BAS
// ============================================================

export async function moveSessionModuleDown(
    sessionId: string,
    moduleSessionId: string
) {
    try {
        const authResult =
            await getAuthenticatedUser();

        if (!authResult.success) {
            return {
                success: false,
                error: authResult.error,
            };
        }

        if (
            !canManageSessions(
                authResult.user.role
            )
        ) {
            return {
                success: false,
                error:
                    "Vous n'avez pas l'autorisation de réordonner les modules.",
            };
        }

        const current =
            await prisma.moduleSession.findFirst({
                where: {
                    id: moduleSessionId,
                    sessionId,

                    session: {
                        centreId:
                            authResult.user
                                .centreId,
                    },
                },

                select: {
                    position: true,
                },
            });

        if (!current) {
            return {
                success: false,
                error:
                    "Module introuvable dans cette session.",
            };
        }

        const total =
            await prisma.moduleSession.count({
                where: {
                    sessionId,
                },
            });

        if (current.position >= total) {
            return {
                success: false,
                error:
                    "Le module est déjà en dernière position.",
            };
        }

        return updateSessionModulePosition(
            sessionId,
            moduleSessionId,
            current.position + 1
        );
    } catch (error) {
        console.error(
            "Erreur moveSessionModuleDown():",
            error
        );

        return {
            success: false,
            error:
                "Impossible de déplacer le module.",
        };
    }
}

// ============================================================
// STATISTIQUES DES SESSIONS
// ============================================================

export async function getSessionStats() {
    try {
        const authResult = await getAuthenticatedUser();

        if (!authResult.success) {
            return {
                success: false,
                message: authResult.error,
                stats: null,
            };
        }

        const { user } = authResult;

        const canManage = canManageSessions(user.role);

        if (!canManage) {
            return {
                success: false,
                message:
                    "Vous n'avez pas les permissions nécessaires.",
                stats: null,
            };
        }

        const [
            total,
            planifiees,
            inscriptionsOuvertes,
            inscriptionsFermees,
            enCours,
            terminees,
            annulees,
            suspendues,
        ] = await Promise.all([
            prisma.sessionFormation.count({
                where: {
                    centreId: user.centreId,
                },
            }),

            prisma.sessionFormation.count({
                where: {
                    centreId: user.centreId,
                    statut: "PLANIFIEE",
                },
            }),

            prisma.sessionFormation.count({
                where: {
                    centreId: user.centreId,
                    statut: "INSCRIPTIONS_OUVERTES",
                },
            }),

            prisma.sessionFormation.count({
                where: {
                    centreId: user.centreId,
                    statut: "INSCRIPTIONS_FERMEES",
                },
            }),

            prisma.sessionFormation.count({
                where: {
                    centreId: user.centreId,
                    statut: "EN_COURS",
                },
            }),

            prisma.sessionFormation.count({
                where: {
                    centreId: user.centreId,
                    statut: "TERMINEE",
                },
            }),

            prisma.sessionFormation.count({
                where: {
                    centreId: user.centreId,
                    statut: "ANNULEE",
                },
            }),

            prisma.sessionFormation.count({
                where: {
                    centreId: user.centreId,
                    statut: "SUSPENDUE",
                },
            }),
        ]);

        return {
            success: true,

            stats: {
                total,
                planifiees,
                inscriptionsOuvertes,
                inscriptionsFermees,
                enCours,
                terminees,
                annulees,
                suspendues,
            },
        };
    } catch (error) {
        console.error(
            "Erreur getSessionStats():",
            error
        );

        return {
            success: false,
            message:
                "Impossible de récupérer les statistiques.",
            stats: null,
        };
    }
}