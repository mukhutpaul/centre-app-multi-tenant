"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Check,
    Loader2,
    Plus,
    Search,
    X,
    BookOpen,
} from "lucide-react";
import { toast } from "sonner";

import {
    addModuleToSession,
    getSessionModules,
} from "@/actions/session.actions";

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

type AjouterModulesFormProps = {
    sessionId: string;
    onClose?: () => void;
    onSuccess?: () => void;
};

export default function AjouterModulesForm({
    sessionId,
    onClose,
    onSuccess,
}: AjouterModulesFormProps) {
    const [modules, setModules] = useState<SessionModule[]>([]);
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    // ============================================================
    // CHARGER LES MODULES
    // ============================================================

    async function loadModules() {
        try {
            setLoading(true);

            const result = await getSessionModules(sessionId);

            if (!result.success) {
                toast.error(
                    result.error ||
                        "Impossible de récupérer les modules."
                );
                return;
            }

            setModules(result.modules ?? []);
        } catch (error) {
            console.error(error);

            toast.error(
                "Une erreur est survenue lors du chargement des modules."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadModules();
    }, [sessionId]);

    // ============================================================
    // MODULES DISPONIBLES
    // ============================================================

    const modulesDisponibles = useMemo(() => {
        const value = search.trim().toLowerCase();

        return modules.filter((module) => {
            // Ne pas afficher les modules déjà présents
            if (module.estDansSession) {
                return false;
            }

            if (!value) {
                return true;
            }

            return (
                module.code.toLowerCase().includes(value) ||
                module.nom.toLowerCase().includes(value) ||
                (module.description ?? "")
                    .toLowerCase()
                    .includes(value)
            );
        });
    }, [modules, search]);

    // ============================================================
    // SELECTIONNER / DESELECTIONNER
    // ============================================================

    function toggleModule(moduleId: string) {
        setSelectedModules((current) => {
            if (current.includes(moduleId)) {
                return current.filter((id) => id !== moduleId);
            }

            return [...current, moduleId];
        });
    }

    function selectAll() {
        setSelectedModules(
            modulesDisponibles.map((module) => module.id)
        );
    }

    function deselectAll() {
        setSelectedModules([]);
    }

    // ============================================================
    // AJOUTER LES MODULES
    // ============================================================

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (selectedModules.length === 0) {
            toast.warning(
                "Veuillez sélectionner au moins un module."
            );
            return;
        }

        try {
            setAdding(true);

            let successCount = 0;
            let errorCount = 0;

            for (const moduleId of selectedModules) {
                const result = await addModuleToSession(
                    sessionId,
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

            // ========================================================
            // RESULTAT
            // ========================================================

            if (successCount > 0 && errorCount === 0) {
                toast.success(
                    successCount === 1
                        ? "Le module a été ajouté à la session."
                        : `${successCount} modules ont été ajoutés à la session.`
                );

                setSelectedModules([]);

                await loadModules();

                onSuccess?.();

                return;
            }

            if (successCount > 0 && errorCount > 0) {
                toast.warning(
                    `${successCount} module(s) ajouté(s), ${errorCount} module(s) n'ont pas pu être ajoutés.`
                );

                setSelectedModules([]);

                await loadModules();

                onSuccess?.();

                return;
            }

            toast.error(
                "Aucun module n'a pu être ajouté."
            );
        } catch (error) {
            console.error(error);

            toast.error(
                "Une erreur est survenue lors de l'ajout des modules."
            );
        } finally {
            setAdding(false);
        }
    }

    // ============================================================
    // RENDU
    // ============================================================

    return (
        <div className="w-full">
            <div className="rounded-2xl border border-base-300 bg-base-100 shadow-xl overflow-hidden">

                {/* ================================================= */}
                {/* EN-TÊTE */}
                {/* ================================================= */}

                <div className="flex items-center justify-between gap-4 border-b border-base-300 px-5 py-4">

                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <BookOpen size={22} />
                        </div>

                        <div>
                            <h2 className="text-lg font-bold">
                                Ajouter des modules
                            </h2>

                            <p className="text-sm text-base-content/60">
                                Sélectionnez les modules à ajouter à cette session.
                            </p>
                        </div>
                    </div>

                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={adding}
                            className="btn btn-sm btn-circle btn-ghost"
                            title="Fermer"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* ================================================= */}
                {/* CORPS */}
                {/* ================================================= */}

                <form onSubmit={handleSubmit}>
                    <div className="p-5 space-y-5">

                        {/* ========================================= */}
                        {/* RECHERCHE */}
                        {/* ========================================= */}

                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                            <div className="relative w-full md:max-w-md">
                                <Search
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
                                />

                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) =>
                                        setSearch(e.target.value)
                                    }
                                    placeholder="Rechercher un module..."
                                    className="input input-bordered w-full pl-10"
                                    disabled={loading || adding}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={selectAll}
                                    disabled={
                                        loading ||
                                        adding ||
                                        modulesDisponibles.length === 0
                                    }
                                    className="btn btn-sm btn-outline"
                                >
                                    Tout sélectionner
                                </button>

                                <button
                                    type="button"
                                    onClick={deselectAll}
                                    disabled={
                                        loading ||
                                        adding ||
                                        selectedModules.length === 0
                                    }
                                    className="btn btn-sm btn-ghost"
                                >
                                    Désélectionner
                                </button>
                            </div>
                        </div>

                        {/* ========================================= */}
                        {/* COMPTEUR */}
                        {/* ========================================= */}

                        {!loading && (
                            <div className="flex flex-wrap items-center gap-2 text-sm">

                                <span className="badge badge-neutral">
                                    {modules.length} module
                                    {modules.length > 1 ? "s" : ""} au total
                                </span>

                                <span className="badge badge-success badge-outline">
                                    {
                                        modules.filter(
                                            (module) =>
                                                module.estDansSession
                                        ).length
                                    }{" "}
                                    déjà dans la session
                                </span>

                                <span className="badge badge-info badge-outline">
                                    {selectedModules.length} sélectionné
                                    {selectedModules.length > 1
                                        ? "s"
                                        : ""}
                                </span>
                            </div>
                        )}

                        {/* ========================================= */}
                        {/* LISTE */}
                        {/* ========================================= */}

                        <div className="rounded-xl border border-base-300 overflow-hidden">

                            {loading ? (
                                <div className="flex min-h-[250px] items-center justify-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <span className="loading loading-spinner loading-lg text-primary" />

                                        <span className="text-sm text-base-content/60">
                                            Chargement des modules...
                                        </span>
                                    </div>
                                </div>
                            ) : modulesDisponibles.length === 0 ? (
                                <div className="flex min-h-[250px] flex-col items-center justify-center px-5 text-center">

                                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-base-200">
                                        <BookOpen
                                            size={25}
                                            className="text-base-content/40"
                                        />
                                    </div>

                                    <h3 className="font-semibold">
                                        Aucun module disponible
                                    </h3>

                                    <p className="mt-1 max-w-md text-sm text-base-content/60">
                                        {search
                                            ? "Aucun module ne correspond à votre recherche."
                                            : "Tous les modules de cette formation sont déjà associés à cette session."}
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-base-300">

                                    {modulesDisponibles.map(
                                        (module) => {
                                            const selected =
                                                selectedModules.includes(
                                                    module.id
                                                );

                                            return (
                                                <label
                                                    key={module.id}
                                                    className={`
                                                        flex cursor-pointer
                                                        items-start gap-4
                                                        p-4 transition
                                                        hover:bg-base-200/50
                                                        ${
                                                            selected
                                                                ? "bg-primary/5"
                                                                : ""
                                                        }
                                                    `}
                                                >
                                                    {/* CHECKBOX */}

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
                                                        disabled={adding}
                                                        className="checkbox checkbox-primary mt-1"
                                                    />

                                                    {/* CONTENU */}

                                                    <div className="min-w-0 flex-1">

                                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                                                            <div className="flex items-center gap-2">

                                                                <span className="badge badge-primary badge-outline">
                                                                    {
                                                                        module.code
                                                                    }
                                                                </span>

                                                                <h3 className="font-semibold">
                                                                    {
                                                                        module.nom
                                                                    }
                                                                </h3>

                                                            </div>

                                                            <span className="text-xs text-base-content/50">
                                                                Module #
                                                                {
                                                                    module.formationPosition
                                                                }
                                                            </span>
                                                        </div>

                                                        {module.description && (
                                                            <p className="mt-2 line-clamp-2 text-sm text-base-content/60">
                                                                {
                                                                    module.description
                                                                }
                                                            </p>
                                                        )}

                                                        <div className="mt-3 flex flex-wrap gap-2">

                                                            {module.dureeHeures !==
                                                                null && (
                                                                <span className="badge badge-sm badge-ghost">
                                                                    {
                                                                        module.dureeHeures
                                                                    }{" "}
                                                                    heure
                                                                    {module.dureeHeures >
                                                                    1
                                                                        ? "s"
                                                                        : ""}
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

                                                    {/* INDICATEUR */}

                                                    {selected && (
                                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content">
                                                            <Check
                                                                size={15}
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
                    </div>

                    {/* ================================================= */}
                    {/* FOOTER */}
                    {/* ================================================= */}

                    <div className="flex flex-col-reverse gap-3 border-t border-base-300 bg-base-200/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                        <div className="text-sm text-base-content/60">
                            {selectedModules.length > 0 ? (
                                <>
                                    <strong className="text-base-content">
                                        {selectedModules.length}
                                    </strong>{" "}
                                    module
                                    {selectedModules.length > 1
                                        ? "s"
                                        : ""}{" "}
                                    seront ajoutés.
                                </>
                            ) : (
                                "Sélectionnez les modules à ajouter."
                            )}
                        </div>

                        <div className="flex gap-2">

                            {onClose && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={adding}
                                    className="btn btn-ghost"
                                >
                                    Annuler
                                </button>
                            )}

                            <button
                                type="submit"
                                disabled={
                                    adding ||
                                    loading ||
                                    selectedModules.length === 0
                                }
                                className="btn btn-primary gap-2"
                            >
                                {adding ? (
                                    <>
                                        <Loader2
                                            size={18}
                                            className="animate-spin"
                                        />
                                        Ajout en cours...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={18} />
                                        Ajouter les modules
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}