
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
    ArrowLeft,
    ArrowDown,
    ArrowUp,
    BookOpen,
    CalendarCheck,
    CalendarDays,
    Check,
    ClipboardList,
    Clock,
    FileText,
    Loader2,
    Pencil,
    Plus,
    Scale,
    Search,
    Trash2,
    UserRound,
    Users,
    X,
} from "lucide-react";

import Swal from "sweetalert2";
import { toast } from "sonner";

import {
    addModuleToSession,
    getSessionModules,
    moveSessionModuleDown,
    moveSessionModuleUp,
    removeModuleFromSession,
} from "@/actions/session.actions";

/* ============================================================
   TYPES
============================================================ */

type Formation = {
    id: string;
    code: string;
    nom: string;
    description?: string | null;
    type?: string | null;
    dureeHeures?: number | string | null;
};

type Session = {
    id: string;
    code: string;
    nom: string | null;
    dateDebut: Date | string;
    dateFin: Date | string;
    capacite: number | null;
    statut: string;

    ouvertureInscriptions?: Date | string | null;
    fermetureInscriptions?: Date | string | null;

    notes?: string | null;

    formation?: Formation | null;

    _count?: {
        inscriptions?: number;
        modules?: number;
        formateurs?: number;
        planning?: number;
        jurys?: number;
    };
};

/**
 * IMPORTANT :
 * getSessionModules() retourne des objets plats.
 */
type SessionModule = {
    id: string;
    code: string;
    nom: string;
    description: string | null;

    formationPosition: number;

    dureeHeures: number | null;
    coefficient: number | null;

    estDansSession: boolean;

    moduleSessionId: string | null;

    positionSession: number | null;

    dateDebut: Date | string | null;
    dateFin: Date | string | null;

    nombreFormateurs: number;
    nombreEvaluations: number;
};

type Props = {
    session?: Session | null;
    modules?: SessionModule[] | null;
};

/* ============================================================
   STATUTS
============================================================ */

const STATUTS: Record<
    string,
    {
        label: string;
        className: string;
    }
> = {
    PLANIFIEE: {
        label: "Planifiée",
        className: "badge-info",
    },

    INSCRIPTIONS_OUVERTES: {
        label: "Inscriptions ouvertes",
        className: "badge-success",
    },

    INSCRIPTIONS_FERMEES: {
        label: "Inscriptions fermées",
        className: "badge-warning",
    },

    EN_COURS: {
        label: "En cours",
        className: "badge-primary",
    },

    TERMINEE: {
        label: "Terminée",
        className: "badge-neutral",
    },

    ANNULEE: {
        label: "Annulée",
        className: "badge-error",
    },

    SUSPENDUE: {
        label: "Suspendue",
        className: "badge-warning",
    },
};

function getStatusInfo(status?: string | null) {
    if (!status) {
        return {
            label: "Inconnu",
            className: "badge-neutral",
        };
    }

    return (
        STATUTS[status] ?? {
            label: status,
            className: "badge-neutral",
        }
    );
}

/* ============================================================
   FORMAT DATE
============================================================ */

function formatDate(
    value: Date | string | null | undefined
) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

/* ============================================================
   FORMAT DATE + HEURE
============================================================ */

function formatDateTime(
    value: Date | string | null | undefined
) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

/* ============================================================
   FORMAT TYPE FORMATION
============================================================ */

function getFormationType(
    type?: string | null
) {
    switch (type) {
        case "PRESENTIEL":
            return "Présentiel";

        case "DISTANCIEL":
            return "Distanciel";

        case "HYBRIDE":
            return "Hybride";

        default:
            return type || "-";
    }
}

/* ============================================================
   COMPOSANT
============================================================ */

export default function SessionDetailClient({
    session,
    modules: modulesProp,
}: Props) {
    /* ========================================================
       ETATS
    ======================================================== */

    const [showAjouterModules, setShowAjouterModules] =
        useState(false);

    const [modules, setModules] =
        useState<SessionModule[]>(
            Array.isArray(modulesProp)
                ? modulesProp
                : []
        );

    const [searchModule, setSearchModule] =
        useState("");

    const [selectedModules, setSelectedModules] =
        useState<string[]>([]);

    const [loadingModules, setLoadingModules] =
        useState(false);

    const [addingModules, setAddingModules] =
        useState(false);

    const [processingModuleId, setProcessingModuleId] =
        useState<string | null>(null);

    /* ========================================================
       SYNCHRONISER LES MODULES AVEC LES PROPS
    ======================================================== */

    useEffect(() => {
        setModules(
            Array.isArray(modulesProp)
                ? modulesProp
                : []
        );
    }, [modulesProp]);

    /* ========================================================
       SESSION ABSENTE
    ======================================================== */

    if (!session) {
        return (
            <div className="p-4 md:p-6">
                <div className="max-w-6xl mx-auto space-y-5">

                    <Link
                        href="/sessions"
                        className="btn btn-ghost btn-sm gap-2"
                    >
                        <ArrowLeft size={17} />
                        Retour aux sessions
                    </Link>

                    <div className="card bg-base-100 border border-base-300 shadow-sm">
                        <div className="card-body">

                            <div className="alert alert-error">
                                <div>

                                    <h2 className="font-bold">
                                        Session introuvable
                                    </h2>

                                    <p className="text-sm mt-1">
                                        Les informations de cette
                                        session n'ont pas pu être
                                        récupérées.
                                    </p>

                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        );
    }

    /* ========================================================
       RECHARGER LES MODULES
    ======================================================== */

    async function reloadModules() {
        try {
            setLoadingModules(true);

            const result =
                await getSessionModules(session.id);

            if (!result.success) {
                toast.error(
                    result.error ||
                        "Impossible de récupérer les modules."
                );

                return false;
            }

            setModules(result.modules ?? []);

            return true;
        } catch (error) {
            console.error(
                "Erreur reloadModules :",
                error
            );

            toast.error(
                "Une erreur est survenue lors du chargement des modules."
            );

            return false;
        } finally {
            setLoadingModules(false);
        }
    }

    /* ========================================================
       OUVRIR LE MODAL AJOUT MODULES
    ======================================================== */

    async function openAjouterModules() {
        if (addingModules) {
            return;
        }

        setShowAjouterModules(true);
        setSelectedModules([]);
        setSearchModule("");

        /*
         * On recharge toujours les modules afin d'avoir
         * l'état le plus récent.
         */
        await reloadModules();
    }

    /* ========================================================
       FERMER LE MODAL
    ======================================================== */

    function closeAjouterModules() {
        if (addingModules) {
            return;
        }

        setShowAjouterModules(false);
        setSelectedModules([]);
        setSearchModule("");
    }

    /* ========================================================
       MODULES DANS LA SESSION
    ======================================================== */

    const modulesDansSession = useMemo(() => {
        return modules
            .filter(
                (module) =>
                    module.estDansSession
            )
            .slice()
            .sort(
                (a, b) =>
                    (a.positionSession ?? 0) -
                    (b.positionSession ?? 0)
            );
    }, [modules]);

    /* ========================================================
       MODULES DISPONIBLES
    ======================================================== */

    const modulesDisponibles = useMemo(() => {
        const search =
            searchModule.trim().toLowerCase();

        return modules.filter((module) => {
            if (module.estDansSession) {
                return false;
            }

            if (!search) {
                return true;
            }

            return (
                module.code
                    .toLowerCase()
                    .includes(search) ||
                module.nom
                    .toLowerCase()
                    .includes(search) ||
                (module.description ?? "")
                    .toLowerCase()
                    .includes(search)
            );
        });
    }, [modules, searchModule]);

    /* ========================================================
       MODULES DISPONIBLES TOTAL
    ======================================================== */

    const totalModulesDisponibles =
        modules.filter(
            (module) =>
                !module.estDansSession
        ).length;

    /* ========================================================
       SELECTIONNER / DESELECTIONNER UN MODULE
    ======================================================== */

    function toggleModule(moduleId: string) {
        setSelectedModules((current) => {
            if (current.includes(moduleId)) {
                return current.filter(
                    (id) => id !== moduleId
                );
            }

            return [
                ...current,
                moduleId,
            ];
        });
    }

    /* ========================================================
       SELECTIONNER TOUS LES MODULES VISIBLES
    ======================================================== */

    function selectAllModules() {
        const ids = modulesDisponibles.map(
            (module) => module.id
        );

        setSelectedModules(ids);
    }

    /* ========================================================
       DESELECTIONNER TOUS
    ======================================================== */

    function deselectAllModules() {
        setSelectedModules([]);
    }

    /* ========================================================
       AJOUTER LES MODULES
    ======================================================== */

    async function handleAddModules(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (selectedModules.length === 0) {
            toast.warning(
                "Veuillez sélectionner au moins un module."
            );

            return;
        }

        try {
            setAddingModules(true);

            let successCount = 0;
            let errorCount = 0;

            for (const moduleId of selectedModules) {
                const result =
                    await addModuleToSession(
                        session.id,
                        moduleId
                    );

                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;

                    console.error(
                        `Erreur ajout module ${moduleId}:`,
                        result.error
                    );
                }
            }

            /*
             * Recharger avant d'afficher le message final
             * permet de garder l'interface cohérente.
             */
            await reloadModules();

            if (
                successCount > 0 &&
                errorCount === 0
            ) {
                toast.success(
                    successCount === 1
                        ? "Le module a été ajouté à la session."
                        : `${successCount} modules ont été ajoutés à la session.`
                );
            } else if (
                successCount > 0 &&
                errorCount > 0
            ) {
                toast.warning(
                    `${successCount} module(s) ajouté(s), ${errorCount} module(s) non ajouté(s).`
                );
            } else {
                toast.error(
                    "Aucun module n'a pu être ajouté."
                );

                return;
            }

            setSelectedModules([]);
            setSearchModule("");
            setShowAjouterModules(false);
        } catch (error) {
            console.error(
                "Erreur handleAddModules :",
                error
            );

            toast.error(
                "Une erreur est survenue lors de l'ajout des modules."
            );
        } finally {
            setAddingModules(false);
        }
    }

    /* ========================================================
       RETIRER UN MODULE
    ======================================================== */

    async function handleRemoveModule(
        moduleId: string
    ) {
        const module = modules.find(
            (item) =>
                item.id === moduleId
        );

        if (!module) {
            return;
        }

        const confirmation =
            await Swal.fire({
                title: "Retirer ce module ?",
                text: `Le module "${module.nom}" sera retiré de cette session.`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText:
                    "Oui, retirer",
                cancelButtonText:
                    "Annuler",
                reverseButtons: true,
                buttonsStyling: true,
            });

        if (!confirmation.isConfirmed) {
            return;
        }

        try {
            setProcessingModuleId(moduleId);

            const result =
                await removeModuleFromSession(
                    session.id,
                    moduleId
                );

            if (!result.success) {
                toast.error(
                    result.error ||
                        "Impossible de retirer le module."
                );

                return;
            }

            toast.success(
                "Le module a été retiré de la session."
            );

            await reloadModules();
        } catch (error) {
            console.error(
                "Erreur retrait module :",
                error
            );

            toast.error(
                "Une erreur est survenue lors du retrait du module."
            );
        } finally {
            setProcessingModuleId(null);
        }
    }

    /* ========================================================
       MONTER UN MODULE
    ======================================================== */

    async function handleMoveUp(
        moduleId: string
    ) {
        try {
            setProcessingModuleId(moduleId);

            const result =
                await moveSessionModuleUp(
                    session.id,
                    moduleId
                );

            if (!result.success) {
                toast.error(
                    result.error ||
                        "Impossible de déplacer le module."
                );

                return;
            }

            await reloadModules();
        } catch (error) {
            console.error(
                "Erreur déplacement haut :",
                error
            );

            toast.error(
                "Impossible de déplacer le module."
            );
        } finally {
            setProcessingModuleId(null);
        }
    }

    /* ========================================================
       DESCENDRE UN MODULE
    ======================================================== */

    async function handleMoveDown(
        moduleId: string
    ) {
        try {
            setProcessingModuleId(moduleId);

            const result =
                await moveSessionModuleDown(
                    session.id,
                    moduleId
                );

            if (!result.success) {
                toast.error(
                    result.error ||
                        "Impossible de déplacer le module."
                );

                return;
            }

            await reloadModules();
        } catch (error) {
            console.error(
                "Erreur déplacement bas :",
                error
            );

            toast.error(
                "Impossible de déplacer le module."
            );
        } finally {
            setProcessingModuleId(null);
        }
    }

    /* ========================================================
       DONNÉES SESSION
    ======================================================== */

    const formation =
        session.formation;

    const statusInfo =
        getStatusInfo(
            session.statut
        );

    const inscriptions =
        session._count?.inscriptions ?? 0;

    /*
     * IMPORTANT :
     * On compte uniquement les modules réellement
     * associés à la session.
     */
    const nombreModules =
        modulesDansSession.length;

    const formateurs =
        session._count?.formateurs ?? 0;

    const planning =
        session._count?.planning ?? 0;

    const jurys =
        session._count?.jurys ?? 0;

    const capacite =
        session.capacite;

    const tauxOccupation =
        capacite &&
        capacite > 0
            ? Math.min(
                  Math.round(
                      (inscriptions /
                          capacite) *
                          100
                  ),
                  100
              )
            : null;

    /* ========================================================
       RENDU
    ======================================================== */

    return (
        <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* ==================================================
                    RETOUR
                ================================================== */}

                <Link
                    href="/sessions"
                    className="btn btn-ghost btn-sm gap-2"
                >
                    <ArrowLeft size={17} />
                    Retour aux sessions
                </Link>

                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="card bg-base-100 border border-base-300 shadow-sm">
                    <div className="card-body">

                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                            <div className="space-y-3">

                                <div className="flex flex-wrap items-center gap-2">

                                    <span className="badge badge-outline">
                                        {session.code}
                                    </span>

                                    <span
                                        className={`badge ${statusInfo.className}`}
                                    >
                                        {statusInfo.label}
                                    </span>

                                </div>

                                <div>

                                    <h1 className="text-2xl md:text-3xl font-bold">
                                        {session.nom ||
                                            formation?.nom ||
                                            "Session de formation"}
                                    </h1>

                                    <p className="text-base-content/60 mt-1">
                                        Détail de la session de
                                        formation
                                    </p>

                                </div>

                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-base-content/60">

                                    {formation?.code && (
                                        <span className="inline-flex items-center gap-2">
                                            <BookOpen size={16} />
                                            {formation.code}
                                        </span>
                                    )}

                                    <span className="inline-flex items-center gap-2">
                                        <CalendarDays size={16} />

                                        Du{" "}
                                        {formatDate(
                                            session.dateDebut
                                        )}{" "}
                                        au{" "}
                                        {formatDate(
                                            session.dateFin
                                        )}
                                    </span>

                                </div>

                            </div>

                            <div className="flex gap-2">

                                <Link
                                    href={`/sessions/${session.id}/modifier`}
                                    className="btn btn-primary gap-2"
                                >
                                    <Pencil size={17} />
                                    Modifier
                                </Link>

                            </div>

                        </div>

                    </div>
                </div>

                {/* ==================================================
                    STATISTIQUES
                ================================================== */}

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">

                    {/* PARTICIPANTS */}

                    <div className="card bg-base-100 border border-base-300 shadow-sm">
                        <div className="card-body p-4">

                            <div className="flex items-center justify-between">

                                <div>

                                    <p className="text-sm text-base-content/60">
                                        Participants
                                    </p>

                                    <p className="text-2xl font-bold mt-1">
                                        {inscriptions}

                                        {capacite !== null &&
                                            capacite !==
                                                undefined && (
                                                <span className="text-sm font-normal text-base-content/50">
                                                    {" "}
                                                    /{" "}
                                                    {capacite}
                                                </span>
                                            )}
                                    </p>

                                </div>

                                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                    <Users size={21} />
                                </div>

                            </div>

                            {tauxOccupation !== null && (
                                <div className="mt-3">

                                    <div className="flex justify-between text-xs mb-1">
                                        <span>
                                            Occupation
                                        </span>

                                        <span>
                                            {tauxOccupation}%
                                        </span>
                                    </div>

                                    <progress
                                        className="progress progress-primary w-full"
                                        value={
                                            tauxOccupation
                                        }
                                        max="100"
                                    />

                                </div>
                            )}

                        </div>
                    </div>

                    {/* MODULES */}

                    <div className="card bg-base-100 border border-base-300 shadow-sm">
                        <div className="card-body p-4">

                            <div className="flex items-center justify-between">

                                <div>

                                    <p className="text-sm text-base-content/60">
                                        Modules
                                    </p>

                                    <p className="text-2xl font-bold mt-1">
                                        {nombreModules}
                                    </p>

                                </div>

                                <div className="p-3 rounded-xl bg-info/10 text-info">
                                    <FileText size={21} />
                                </div>

                            </div>

                        </div>
                    </div>

                    {/* FORMATEURS */}

                    <div className="card bg-base-100 border border-base-300 shadow-sm">
                        <div className="card-body p-4">

                            <div className="flex items-center justify-between">

                                <div>

                                    <p className="text-sm text-base-content/60">
                                        Formateurs
                                    </p>

                                    <p className="text-2xl font-bold mt-1">
                                        {formateurs}
                                    </p>

                                </div>

                                <div className="p-3 rounded-xl bg-success/10 text-success">
                                    <UserRound size={21} />
                                </div>

                            </div>

                        </div>
                    </div>

                    {/* PLANNING */}

                    <div className="card bg-base-100 border border-base-300 shadow-sm">
                        <div className="card-body p-4">

                            <div className="flex items-center justify-between">

                                <div>

                                    <p className="text-sm text-base-content/60">
                                        Planifications
                                    </p>

                                    <p className="text-2xl font-bold mt-1">
                                        {planning}
                                    </p>

                                </div>

                                <div className="p-3 rounded-xl bg-warning/10 text-warning">
                                    <CalendarCheck size={21} />
                                </div>

                            </div>

                        </div>
                    </div>

                    {/* JURY */}

                    <div className="card bg-base-100 border border-base-300 shadow-sm">
                        <div className="card-body p-4">

                            <div className="flex items-center justify-between">

                                <div>

                                    <p className="text-sm text-base-content/60">
                                        Jurys
                                    </p>

                                    <p className="text-2xl font-bold mt-1">
                                        {jurys}
                                    </p>

                                </div>

                                <div className="p-3 rounded-xl bg-secondary/10 text-secondary">
                                    <Scale size={21} />
                                </div>

                            </div>

                        </div>
                    </div>

                </div>

                {/* ==================================================
                    INFORMATIONS SESSION + FORMATION
                ================================================== */}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* SESSION */}

                    <div className="card bg-base-100 border border-base-300 shadow-sm">
                        <div className="card-body">

                            <h2 className="card-title text-lg">
                                <CalendarDays size={20} />
                                Informations de la session
                            </h2>

                            <div className="divider my-1" />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                <div>
                                    <p className="text-xs uppercase tracking-wide text-base-content/50">
                                        Code
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {session.code}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs uppercase tracking-wide text-base-content/50">
                                        Statut
                                    </p>

                                    <span
                                        className={`badge ${statusInfo.className} mt-1`}
                                    >
                                        {statusInfo.label}
                                    </span>
                                </div>

                                <div>
                                    <p className="text-xs uppercase tracking-wide text-base-content/50">
                                        Date de début
                                    </p>

                                    <p className="font-medium mt-1">
                                        {formatDateTime(
                                            session.dateDebut
                                        )}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs uppercase tracking-wide text-base-content/50">
                                        Date de fin
                                    </p>

                                    <p className="font-medium mt-1">
                                        {formatDateTime(
                                            session.dateFin
                                        )}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs uppercase tracking-wide text-base-content/50">
                                        Capacité
                                    </p>

                                    <p className="font-medium mt-1">
                                        {capacite ??
                                            "Illimitée"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs uppercase tracking-wide text-base-content/50">
                                        Type
                                    </p>

                                    <p className="font-medium mt-1">
                                        {getFormationType(
                                            formation?.type
                                        )}
                                    </p>
                                </div>

                            </div>

                        </div>
                    </div>

                    {/* FORMATION */}

                    <div className="card bg-base-100 border border-base-300 shadow-sm">
                        <div className="card-body">

                            <h2 className="card-title text-lg">
                                <BookOpen size={20} />
                                Formation
                            </h2>

                            <div className="divider my-1" />

                            {!formation ? (
                                <div className="alert alert-warning">
                                    <span>
                                        Les informations de la
                                        formation associée ne sont
                                        pas disponibles.
                                    </span>
                                </div>
                            ) : (
                                <div className="space-y-4">

                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-base-content/50">
                                            Code
                                        </p>

                                        <Link
                                            href={`/formations/${formation.id}`}
                                            className="font-semibold link link-hover mt-1 inline-block"
                                        >
                                            {formation.code}
                                        </Link>
                                    </div>

                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-base-content/50">
                                            Nom
                                        </p>

                                        <p className="font-medium mt-1">
                                            {formation.nom}
                                        </p>
                                    </div>

                                    {formation.type && (
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-base-content/50">
                                                Modalité
                                            </p>

                                            <p className="font-medium mt-1">
                                                {getFormationType(
                                                    formation.type
                                                )}
                                            </p>
                                        </div>
                                    )}

                                    {formation.dureeHeures !==
                                        null &&
                                        formation.dureeHeures !==
                                            undefined && (
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-base-content/50">
                                                    Durée
                                                </p>

                                                <p className="font-medium mt-1">
                                                    {
                                                        formation.dureeHeures
                                                    }{" "}
                                                    heure
                                                    {Number(
                                                        formation.dureeHeures
                                                    ) > 1
                                                        ? "s"
                                                        : ""}
                                                </p>
                                            </div>
                                        )}

                                    {formation.description && (
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-base-content/50">
                                                Description
                                            </p>

                                            <p className="text-sm text-base-content/70 mt-1 leading-relaxed">
                                                {
                                                    formation.description
                                                }
                                            </p>
                                        </div>
                                    )}

                                </div>
                            )}

                        </div>
                    </div>

                </div>

                {/* ==================================================
                    INSCRIPTIONS
                ================================================== */}

                {(session.ouvertureInscriptions ||
                    session.fermetureInscriptions) && (
                    <div className="card bg-base-100 border border-base-300 shadow-sm">

                        <div className="card-body">

                            <h2 className="card-title text-lg">
                                <Users size={20} />
                                Période des inscriptions
                            </h2>

                            <div className="divider my-1" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                {session.ouvertureInscriptions && (
                                    <div className="flex items-start gap-3">

                                        <div className="p-2 rounded-lg bg-success/10 text-success">
                                            <CalendarCheck size={19} />
                                        </div>

                                        <div>
                                            <p className="text-sm text-base-content/60">
                                                Ouverture
                                            </p>

                                            <p className="font-medium mt-1">
                                                {formatDateTime(
                                                    session.ouvertureInscriptions
                                                )}
                                            </p>
                                        </div>

                                    </div>
                                )}

                                {session.fermetureInscriptions && (
                                    <div className="flex items-start gap-3">

                                        <div className="p-2 rounded-lg bg-warning/10 text-warning">
                                            <CalendarCheck size={19} />
                                        </div>

                                        <div>
                                            <p className="text-sm text-base-content/60">
                                                Fermeture
                                            </p>

                                            <p className="font-medium mt-1">
                                                {formatDateTime(
                                                    session.fermetureInscriptions
                                                )}
                                            </p>
                                        </div>

                                    </div>
                                )}

                            </div>

                        </div>

                    </div>
                )}

                {/* ==================================================
                    NOTES
                ================================================== */}

                {session.notes && (
                    <div className="card bg-base-100 border border-base-300 shadow-sm">

                        <div className="card-body">

                            <h2 className="card-title text-lg">
                                <ClipboardList size={20} />
                                Notes
                            </h2>

                            <div className="divider my-1" />

                            <div className="whitespace-pre-wrap text-base-content/80 leading-relaxed">
                                {session.notes}
                            </div>

                        </div>

                    </div>
                )}

                {/* ==================================================
                    MODULES
                ================================================== */}

                <div className="card bg-base-100 border border-base-300 shadow-sm">

                    <div className="card-body p-0">

                        {/* ==================================================
                            EN-TÊTE MODULES
                        ================================================== */}

                        <div className="p-5 border-b border-base-300">

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                <div>

                                    <h2 className="card-title text-lg">
                                        <FileText size={20} />
                                        Modules de la session
                                    </h2>

                                    <p className="text-sm text-base-content/60 mt-1">
                                        {nombreModules} module
                                        {nombreModules > 1
                                            ? "s"
                                            : ""}{" "}
                                        associé
                                        {nombreModules > 1
                                            ? "s"
                                            : ""}{" "}
                                        à cette session.
                                    </p>

                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        openAjouterModules
                                    }
                                    disabled={
                                        loadingModules ||
                                        addingModules
                                    }
                                    className="btn btn-primary btn-sm gap-2"
                                >
                                    {loadingModules ? (
                                        <>
                                            <Loader2
                                                size={16}
                                                className="animate-spin"
                                            />
                                            Chargement...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={16} />
                                            Ajouter des modules
                                        </>
                                    )}
                                </button>

                            </div>

                        </div>

                        {/* ==================================================
                            LISTE DES MODULES DE LA SESSION
                        ================================================== */}

                        {loadingModules &&
                        modulesDansSession.length === 0 ? (
                            <div className="py-14 text-center px-5">

                                <Loader2
                                    size={40}
                                    className="mx-auto animate-spin text-primary"
                                />

                                <p className="text-sm text-base-content/60 mt-3">
                                    Chargement des modules...
                                </p>

                            </div>
                        ) : modulesDansSession.length ===
                          0 ? (
                            <div className="py-14 text-center px-5">

                                <FileText
                                    size={42}
                                    className="mx-auto opacity-30"
                                />

                                <h3 className="font-semibold mt-3">
                                    Aucun module
                                </h3>

                                <p className="text-sm text-base-content/60 mt-1">
                                    Aucun module n'est encore
                                    associé à cette session.
                                </p>

                                <button
                                    type="button"
                                    onClick={
                                        openAjouterModules
                                    }
                                    disabled={
                                        loadingModules
                                    }
                                    className="btn btn-primary btn-sm mt-5 gap-2"
                                >
                                    <Plus size={16} />
                                    Ajouter des modules
                                </button>

                            </div>
                        ) : (
                            <div className="overflow-x-auto">

                                <table className="table">

                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Module</th>
                                            <th>Période</th>
                                            <th>Durée</th>
                                            <th>Formateurs</th>
                                            <th>Évaluations</th>
                                            <th className="text-right">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>

                                        {modulesDansSession.map(
                                            (
                                                module,
                                                index
                                            ) => {
                                                const processing =
                                                    processingModuleId ===
                                                    module.id;

                                                return (
                                                    <tr
                                                        key={
                                                            module.id
                                                        }
                                                        className="hover"
                                                    >

                                                        {/* POSITION */}

                                                        <td>

                                                            <div className="badge badge-ghost">
                                                                {module.positionSession ??
                                                                    index +
                                                                        1}
                                                            </div>

                                                        </td>

                                                        {/* MODULE */}

                                                        <td>

                                                            <div>

                                                                <p className="font-semibold">
                                                                    {
                                                                        module.code
                                                                    }
                                                                </p>

                                                                <p className="font-medium">
                                                                    {
                                                                        module.nom
                                                                    }
                                                                </p>

                                                                {module.description && (
                                                                    <p className="text-sm text-base-content/60 max-w-lg line-clamp-2">
                                                                        {
                                                                            module.description
                                                                        }
                                                                    </p>
                                                                )}

                                                                <div className="flex flex-wrap gap-2 mt-2">

                                                                    {module.coefficient !==
                                                                        null && (
                                                                        <span className="badge badge-sm badge-ghost">
                                                                            Coef.{" "}
                                                                            {
                                                                                module.coefficient
                                                                            }
                                                                        </span>
                                                                    )}

                                                                    <span className="badge badge-sm badge-outline">
                                                                        Module{" "}
                                                                        {
                                                                            module.formationPosition
                                                                        }
                                                                    </span>

                                                                </div>

                                                            </div>

                                                        </td>

                                                        {/* PÉRIODE */}

                                                        <td>

                                                            <div className="text-sm">

                                                                {module.dateDebut && (
                                                                    <p>
                                                                        <span className="text-base-content/50">
                                                                            Du{" "}
                                                                        </span>

                                                                        {formatDateTime(
                                                                            module.dateDebut
                                                                        )}
                                                                    </p>
                                                                )}

                                                                {module.dateFin && (
                                                                    <p className="mt-1">
                                                                        <span className="text-base-content/50">
                                                                            Au{" "}
                                                                        </span>

                                                                        {formatDateTime(
                                                                            module.dateFin
                                                                        )}
                                                                    </p>
                                                                )}

                                                                {!module.dateDebut &&
                                                                    !module.dateFin && (
                                                                        <span className="text-base-content/50">
                                                                            Non planifié
                                                                        </span>
                                                                    )}

                                                            </div>

                                                        </td>

                                                        {/* DURÉE */}

                                                        <td>

                                                            {module.dureeHeures !==
                                                            null
                                                                ? `${module.dureeHeures} h`
                                                                : "-"}

                                                        </td>

                                                        {/* FORMATEURS */}

                                                        <td>

                                                            <span className="badge badge-sm badge-ghost">
                                                                {
                                                                    module.nombreFormateurs
                                                                }
                                                            </span>

                                                        </td>

                                                        {/* ÉVALUATIONS */}

                                                        <td>

                                                            <span className="badge badge-sm badge-ghost">
                                                                {
                                                                    module.nombreEvaluations
                                                                }
                                                            </span>

                                                        </td>

                                                        {/* ACTIONS */}

                                                        <td>

                                                            <div className="flex justify-end gap-1">

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleMoveUp(
                                                                            module.id
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        processing ||
                                                                        index ===
                                                                            0
                                                                    }
                                                                    className="btn btn-ghost btn-xs btn-square"
                                                                    title="Monter"
                                                                >
                                                                    {processing ? (
                                                                        <Loader2
                                                                            size={
                                                                                14
                                                                            }
                                                                            className="animate-spin"
                                                                        />
                                                                    ) : (
                                                                        <ArrowUp
                                                                            size={
                                                                                15
                                                                            }
                                                                        />
                                                                    )}
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleMoveDown(
                                                                            module.id
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        processing ||
                                                                        index ===
                                                                            modulesDansSession.length -
                                                                                1
                                                                    }
                                                                    className="btn btn-ghost btn-xs btn-square"
                                                                    title="Descendre"
                                                                >
                                                                    {processing ? (
                                                                        <Loader2
                                                                            size={
                                                                                14
                                                                            }
                                                                            className="animate-spin"
                                                                        />
                                                                    ) : (
                                                                        <ArrowDown
                                                                            size={
                                                                                15
                                                                            }
                                                                        />
                                                                    )}
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleRemoveModule(
                                                                            module.id
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        processing
                                                                    }
                                                                    className="btn btn-ghost btn-xs btn-square text-error"
                                                                    title="Retirer"
                                                                >
                                                                    {processing ? (
                                                                        <Loader2
                                                                            size={
                                                                                14
                                                                            }
                                                                            className="animate-spin"
                                                                        />
                                                                    ) : (
                                                                        <Trash2
                                                                            size={
                                                                                15
                                                                            }
                                                                        />
                                                                    )}
                                                                </button>

                                                            </div>

                                                        </td>

                                                    </tr>
                                                );
                                            }
                                        )}

                                    </tbody>

                                </table>

                            </div>
                        )}

                    </div>

                </div>

                {/* ==================================================
                    RÉSUMÉ
                ================================================== */}

                <div className="card bg-base-100 border border-base-300 shadow-sm">

                    <div className="card-body">

                        <h2 className="card-title text-lg">
                            <Clock size={20} />
                            Résumé
                        </h2>

                        <div className="divider my-1" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                            <div className="flex items-center gap-3">

                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <CalendarDays size={19} />
                                </div>

                                <div>

                                    <p className="text-xs text-base-content/50">
                                        Début
                                    </p>

                                    <p className="text-sm font-medium">
                                        {formatDate(
                                            session.dateDebut
                                        )}
                                    </p>

                                </div>

                            </div>

                            <div className="flex items-center gap-3">

                                <div className="p-2 rounded-lg bg-info/10 text-info">
                                    <CalendarDays size={19} />
                                </div>

                                <div>

                                    <p className="text-xs text-base-content/50">
                                        Fin
                                    </p>

                                    <p className="text-sm font-medium">
                                        {formatDate(
                                            session.dateFin
                                        )}
                                    </p>

                                </div>

                            </div>

                            <div className="flex items-center gap-3">

                                <div className="p-2 rounded-lg bg-success/10 text-success">
                                    <Users size={19} />
                                </div>

                                <div>

                                    <p className="text-xs text-base-content/50">
                                        Participants
                                    </p>

                                    <p className="text-sm font-medium">
                                        {inscriptions}

                                        {capacite !== null &&
                                            capacite !==
                                                undefined &&
                                            ` / ${capacite}`}
                                    </p>

                                </div>

                            </div>

                            <div className="flex items-center gap-3">

                                <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                                    <FileText size={19} />
                                </div>

                                <div>

                                    <p className="text-xs text-base-content/50">
                                        Modules
                                    </p>

                                    <p className="text-sm font-medium">
                                        {nombreModules}
                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

                {/* ==================================================
                    RETOUR BAS DE PAGE
                ================================================== */}

                <div className="flex justify-between items-center pt-2">

                    <Link
                        href="/sessions"
                        className="btn btn-ghost gap-2"
                    >
                        <ArrowLeft size={17} />
                        Retour aux sessions
                    </Link>

                    <Link
                        href={`/sessions/${session.id}/modifier`}
                        className="btn btn-primary gap-2"
                    >
                        <Pencil size={17} />
                        Modifier la session
                    </Link>

                </div>

            </div>

            {/* ======================================================
                MODAL : AJOUTER DES MODULES
            ====================================================== */}

            {showAjouterModules && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                                event.currentTarget &&
                            !addingModules
                        ) {
                            closeAjouterModules();
                        }
                    }}
                >

                    <div
                        className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-base-100 shadow-2xl border border-base-300"
                        onMouseDown={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {/* ==================================================
                            HEADER MODAL
                        ================================================== */}

                        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-base-300 bg-base-100">

                            <div className="min-w-0">

                                <div className="flex items-center gap-3">

                                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                                        <BookOpen
                                            size={21}
                                        />
                                    </div>

                                    <div className="min-w-0">

                                        <h2 className="text-lg md:text-xl font-bold">
                                            Ajouter des modules
                                        </h2>

                                        <p className="text-sm text-base-content/60 mt-0.5 truncate">
                                            Session{" "}
                                            <strong>
                                                {
                                                    session.code
                                                }
                                            </strong>
                                        </p>

                                    </div>

                                </div>

                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeAjouterModules
                                }
                                disabled={
                                    addingModules
                                }
                                className="btn btn-ghost btn-sm btn-square shrink-0"
                                title="Fermer"
                            >
                                <X size={20} />
                            </button>

                        </div>

                        {/* ==================================================
                            CONTENU MODAL
                        ================================================== */}

                        <div className="flex-1 overflow-y-auto">

                            <form
                                id="ajouter-modules-form"
                                onSubmit={
                                    handleAddModules
                                }
                                className="p-5 space-y-5"
                            >

                                {/* FORMATION */}

                                <div className="rounded-xl border border-base-300 bg-base-200/30 p-4">

                                    <div className="flex items-start gap-3">

                                        <div className="p-2 rounded-lg bg-info/10 text-info shrink-0">
                                            <BookOpen
                                                size={19}
                                            />
                                        </div>

                                        <div className="min-w-0">

                                            <p className="text-xs uppercase tracking-wide text-base-content/50">
                                                Formation
                                            </p>

                                            <p className="font-semibold mt-1">
                                                {formation?.nom ??
                                                    "Formation associée"}
                                            </p>

                                            {formation?.code && (
                                                <p className="text-sm text-base-content/60 mt-0.5">
                                                    Code :{" "}
                                                    {
                                                        formation.code
                                                    }
                                                </p>
                                            )}

                                        </div>

                                    </div>

                                </div>

                                {/* RECHERCHE + ACTIONS */}

                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

                                    <div className="relative w-full lg:max-w-xl">

                                        <Search
                                            size={18}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
                                        />

                                        <input
                                            type="text"
                                            value={
                                                searchModule
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setSearchModule(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="Rechercher par code, nom ou description..."
                                            className="input input-bordered w-full pl-10"
                                            disabled={
                                                addingModules ||
                                                loadingModules
                                            }
                                        />

                                    </div>

                                    <div className="flex flex-wrap gap-2">

                                        <button
                                            type="button"
                                            onClick={
                                                selectAllModules
                                            }
                                            disabled={
                                                modulesDisponibles.length ===
                                                    0 ||
                                                addingModules ||
                                                loadingModules
                                            }
                                            className="btn btn-sm btn-outline"
                                        >
                                            Tout sélectionner
                                        </button>

                                        <button
                                            type="button"
                                            onClick={
                                                deselectAllModules
                                            }
                                            disabled={
                                                selectedModules.length ===
                                                    0 ||
                                                addingModules
                                            }
                                            className="btn btn-sm btn-ghost"
                                        >
                                            Tout désélectionner
                                        </button>

                                    </div>

                                </div>

                                {/* COMPTEURS */}

                                <div className="flex flex-wrap gap-2">

                                    <span className="badge badge-neutral">
                                        {
                                            totalModulesDisponibles
                                        }{" "}
                                        disponible
                                        {totalModulesDisponibles >
                                        1
                                            ? "s"
                                            : ""}
                                    </span>

                                    <span className="badge badge-success badge-outline">
                                        {
                                            modulesDansSession.length
                                        }{" "}
                                        déjà dans la session
                                    </span>

                                    <span className="badge badge-primary">
                                        {
                                            selectedModules.length
                                        }{" "}
                                        sélectionné
                                        {selectedModules.length >
                                        1
                                            ? "s"
                                            : ""}
                                    </span>

                                </div>

                                {/* LISTE */}

                                <div className="rounded-xl border border-base-300 bg-base-100 overflow-hidden">

                                    {loadingModules ? (
                                        <div className="min-h-[260px] flex items-center justify-center">

                                            <div className="flex flex-col items-center gap-3">

                                                <Loader2
                                                    size={
                                                        32
                                                    }
                                                    className="animate-spin text-primary"
                                                />

                                                <p className="text-sm text-base-content/60">
                                                    Chargement des modules...
                                                </p>

                                            </div>

                                        </div>
                                    ) : modulesDisponibles.length ===
                                      0 ? (
                                        <div className="min-h-[260px] flex flex-col items-center justify-center text-center px-5">

                                            <BookOpen
                                                size={
                                                    44
                                                }
                                                className="opacity-25"
                                            />

                                            <h3 className="font-semibold mt-3">
                                                Aucun module disponible
                                            </h3>

                                            <p className="text-sm text-base-content/60 mt-1 max-w-md">
                                                {searchModule
                                                    ? "Aucun module ne correspond à votre recherche."
                                                    : "Tous les modules de cette formation sont déjà associés à cette session."}
                                            </p>

                                        </div>
                                    ) : (
                                        <div className="max-h-[420px] overflow-y-auto divide-y divide-base-300">

                                            {modulesDisponibles.map(
                                                (
                                                    module
                                                ) => {
                                                    const selected =
                                                        selectedModules.includes(
                                                            module.id
                                                        );

                                                    return (
                                                        <label
                                                            key={
                                                                module.id
                                                            }
                                                            className={`
                                                                flex items-start gap-4 p-4 cursor-pointer transition
                                                                hover:bg-base-200/60
                                                                ${
                                                                    selected
                                                                        ? "bg-primary/5"
                                                                        : ""
                                                                }
                                                            `}
                                                        >

                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    selected
                                                                }
                                                                onChange={() =>
                                                                    toggleModule(
                                                                        module.id
                                                                    )
                                                                }
                                                                disabled={
                                                                    addingModules
                                                                }
                                                                className="checkbox checkbox-primary mt-1"
                                                            />

                                                            <div className="flex-1 min-w-0">

                                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                                                                    <div className="flex flex-wrap items-center gap-2">

                                                                        <span className="badge badge-primary badge-outline">
                                                                            {
                                                                                module.code
                                                                            }
                                                                        </span>

                                                                        <span className="font-semibold">
                                                                            {
                                                                                module.nom
                                                                            }
                                                                        </span>

                                                                    </div>

                                                                    <span className="text-xs text-base-content/50">
                                                                        Module #{" "}
                                                                        {
                                                                            module.formationPosition
                                                                        }
                                                                    </span>

                                                                </div>

                                                                {module.description && (
                                                                    <p className="text-sm text-base-content/60 mt-2 line-clamp-2">
                                                                        {
                                                                            module.description
                                                                        }
                                                                    </p>
                                                                )}

                                                                <div className="flex flex-wrap gap-2 mt-3">

                                                                    {module.dureeHeures !==
                                                                        null && (
                                                                        <span className="badge badge-sm badge-ghost">
                                                                            {
                                                                                module.dureeHeures
                                                                            }{" "}
                                                                            h
                                                                        </span>
                                                                    )}

                                                                    {module.coefficient !==
                                                                        null && (
                                                                        <span className="badge badge-sm badge-ghost">
                                                                            Coef.{" "}
                                                                            {
                                                                                module.coefficient
                                                                            }
                                                                        </span>
                                                                    )}

                                                                </div>

                                                            </div>

                                                            {selected && (
                                                                <div className="h-6 w-6 shrink-0 rounded-full bg-primary text-primary-content flex items-center justify-center">
                                                                    <Check
                                                                        size={
                                                                            15
                                                                        }
                                                                        strokeWidth={
                                                                            3
                                                                        }
                                                                    />
                                                                </div>
                                                            )}

                                                        </label>
                                                    );
                                                }
                                            )}

                                        </div>
                                    )}

                                </div>

                            </form>

                        </div>

                        {/* ==================================================
                            FOOTER MODAL
                        ================================================== */}

                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-t border-base-300 bg-base-200/30">

                            <p className="text-sm text-base-content/60">

                                {selectedModules.length >
                                0 ? (
                                    <>
                                        <strong className="text-base-content">
                                            {
                                                selectedModules.length
                                            }
                                        </strong>{" "}
                                        module
                                        {selectedModules.length >
                                        1
                                            ? "s"
                                            : ""}{" "}
                                        sélectionné
                                        {selectedModules.length >
                                        1
                                            ? "s"
                                            : ""}
                                    </>
                                ) : (
                                    "Sélectionnez les modules à ajouter."
                                )}

                            </p>

                            <div className="flex gap-2">

                                <button
                                    type="button"
                                    onClick={
                                        closeAjouterModules
                                    }
                                    disabled={
                                        addingModules
                                    }
                                    className="btn btn-ghost"
                                >
                                    Annuler
                                </button>

                                <button
                                    type="submit"
                                    form="ajouter-modules-form"
                                    disabled={
                                        addingModules ||
                                        loadingModules ||
                                        selectedModules.length ===
                                            0
                                    }
                                    className="btn btn-primary gap-2"
                                >

                                    {addingModules ? (
                                        <>
                                            <Loader2
                                                size={
                                                    18
                                                }
                                                className="animate-spin"
                                            />
                                            Ajout en cours...
                                        </>
                                    ) : (
                                        <>
                                            <Plus
                                                size={
                                                    18
                                                }
                                            />
                                            Ajouter les modules
                                        </>
                                    )}

                                </button>

                            </div>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}
