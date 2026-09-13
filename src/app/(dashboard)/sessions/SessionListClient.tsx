
"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import Link from "next/link";

import {
    usePathname,
    useRouter,
    useSearchParams,
} from "next/navigation";

import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Eye,
    FileText,
    Pencil,
    Plus,
    Search,
    Trash2,
    Users,
    X,
} from "lucide-react";

import Swal from "sweetalert2";
import { toast } from "sonner";

import {
    deleteSession,
} from "@/actions/session.actions";

/* ============================================================
   TYPES
============================================================ */

type Session = {
    id: string;
    code: string;
    nom: string | null;

    dateDebut: Date | string;
    dateFin: Date | string;

    capacite: number | null;

    statut: string;

    formation: {
        id: string;
        code: string;
        nom: string;
    };

    _count?: {
        inscriptions: number;
        modules: number;
        formateurs: number;
        planning?: number;
        jurys?: number;
    };
};

type Formation = {
    id: string;
    code: string;
    nom: string;
};

type Pagination = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

type Stats = {
    total: number;
    planifiees: number;
    inscriptionsOuvertes: number;
    inscriptionsFermees: number;
    enCours: number;
    terminees: number;
    annulees: number;
    suspendues: number;
};

type Props = {
    sessions: Session[];

    formations: Formation[];

    pagination: Pagination;

    stats: Stats;

    filters: {
        query: string;
        statut: string;
        formationId: string;
    };
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

/* ============================================================
   INFORMATIONS STATUT
============================================================ */

function getStatusInfo(status: string) {
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

    return new Intl.DateTimeFormat(
        "fr-FR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }
    ).format(date);
}

/* ============================================================
   COMPOSANT
============================================================ */

export default function SessionListClient({
    sessions,
    formations,
    pagination,
    stats,
    filters,
}: Props) {
    const router = useRouter();

    const pathname = usePathname();

    const searchParams =
        useSearchParams();

    const searchTimeoutRef =
        useRef<ReturnType<
            typeof setTimeout
        > | null>(null);

    const [search, setSearch] =
        useState(filters.query);

    const [
        deletingSessionId,
        setDeletingSessionId,
    ] = useState<string | null>(null);

    /* ========================================================
       SYNCHRONISER LA RECHERCHE
    ======================================================== */

    useEffect(() => {
        setSearch(filters.query);
    }, [filters.query]);

    /* ========================================================
       NETTOYER LE TIMEOUT
    ======================================================== */

    useEffect(() => {
        return () => {
            if (
                searchTimeoutRef.current
            ) {
                clearTimeout(
                    searchTimeoutRef.current
                );
            }
        };
    }, []);

    /* ========================================================
       CONSTRUIRE URL
    ======================================================== */

    function createUrl(
        changes: Record<
            string,
            string | null
        >
    ) {
        const params =
            new URLSearchParams(
                searchParams.toString()
            );

        Object.entries(changes).forEach(
            ([key, value]) => {
                if (
                    value === null ||
                    value === ""
                ) {
                    params.delete(key);
                } else {
                    params.set(
                        key,
                        value
                    );
                }
            }
        );

        const queryString =
            params.toString();

        return queryString
            ? `${pathname}?${queryString}`
            : pathname;
    }

    /* ========================================================
       RECHERCHE
    ======================================================== */

    function handleSearch(
        value: string
    ) {
        setSearch(value);

        if (
            searchTimeoutRef.current
        ) {
            clearTimeout(
                searchTimeoutRef.current
            );
        }

        searchTimeoutRef.current =
            setTimeout(() => {
                router.push(
                    createUrl({
                        query:
                            value.trim() ||
                            null,

                        page: "1",
                    })
                );
            }, 400);
    }

    /* ========================================================
       FILTRE STATUT
    ======================================================== */

    function handleStatusChange(
        value: string
    ) {
        router.push(
            createUrl({
                statut:
                    value || null,

                page: "1",
            })
        );
    }

    /* ========================================================
       FILTRE FORMATION
    ======================================================== */

    function handleFormationChange(
        value: string
    ) {
        router.push(
            createUrl({
                formationId:
                    value || null,

                page: "1",
            })
        );
    }

    /* ========================================================
       RESET FILTRES
    ======================================================== */

    function resetFilters() {
        setSearch("");

        if (
            searchTimeoutRef.current
        ) {
            clearTimeout(
                searchTimeoutRef.current
            );
        }

        router.push(pathname);
    }

    /* ========================================================
       PAGINATION
    ======================================================== */

    function goToPage(
        page: number
    ) {
        if (
            page < 1 ||
            page >
                pagination.totalPages
        ) {
            return;
        }

        router.push(
            createUrl({
                page: String(page),
            })
        );
    }

    /* ========================================================
       SUPPRESSION
    ======================================================== */

    async function handleDelete(
        session: Session
    ) {
        const confirmation =
            await Swal.fire({
                title:
                    "Supprimer cette session ?",

                html: `
                    <div class="text-sm">
                        <p>
                            Vous êtes sur le point de supprimer :
                        </p>

                        <p class="font-bold mt-2">
                            ${session.code}
                        </p>

                        <p class="mt-1">
                            ${
                                session.nom ||
                                session.formation.nom
                            }
                        </p>

                        <p class="text-error mt-4">
                            Cette opération ne pourra pas être annulée.
                        </p>
                    </div>
                `,

                icon: "warning",

                showCancelButton: true,

                confirmButtonText:
                    "Oui, supprimer",

                cancelButtonText:
                    "Annuler",

                reverseButtons: true,

                buttonsStyling: false,

                customClass: {
                    confirmButton:
                        "btn btn-error ml-2",

                    cancelButton:
                        "btn btn-ghost",
                },
            });

        if (
            !confirmation.isConfirmed
        ) {
            return;
        }

        setDeletingSessionId(
            session.id
        );

        try {
            const result =
                await deleteSession(
                    session.id
                );

            if (!result.success) {
                toast.error(
                    result.message ||
                        "Impossible de supprimer la session."
                );

                return;
            }

            toast.success(
                result.message ||
                    "Session supprimée avec succès."
            );

            router.refresh();
        } catch (error) {
            console.error(
                "Erreur suppression session :",
                error
            );

            toast.error(
                "Une erreur est survenue lors de la suppression."
            );
        } finally {
            setDeletingSessionId(
                null
            );
        }
    }

    /* ========================================================
       FILTRES ACTIFS
    ======================================================== */

    const hasFilters =
        Boolean(
            filters.query ||
                filters.statut ||
                filters.formationId
        );

    /* ========================================================
       PAGINATION INFO
    ======================================================== */

    const start =
        pagination.total === 0
            ? 0
            : (pagination.page - 1) *
                    pagination.limit +
                1;

    const end = Math.min(
        pagination.page *
            pagination.limit,
        pagination.total
    );

    /* ========================================================
       AFFICHAGE
    ======================================================== */

    return (
        <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                    <div>

                        <div className="breadcrumbs text-sm">
                            <ul>

                                <li>
                                    <Link
                                        href="/formations"
                                    >
                                        Formations
                                    </Link>
                                </li>

                                <li>
                                    Sessions
                                </li>

                            </ul>
                        </div>

                        <div className="mt-2">

                            <h1 className="text-2xl md:text-3xl font-bold">
                                Sessions de formation
                            </h1>

                            <p className="text-base-content/60 mt-1">
                                Gérez les sessions,
                                leurs inscriptions,
                                modules et
                                planifications.
                            </p>

                        </div>

                    </div>

                    <Link
                        href="/sessions/nouvelle"
                        className="btn btn-primary gap-2"
                    >
                        <Plus size={18} />

                        Nouvelle session
                    </Link>

                </div>

                {/* ==================================================
                    STATISTIQUES
                ================================================== */}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* TOTAL */}

                    <div className="card bg-base-100 border border-base-300 shadow-sm">

                        <div className="card-body p-4">

                            <div className="flex items-center justify-between">

                                <div>

                                    <p className="text-sm text-base-content/60">
                                        Total sessions
                                    </p>

                                    <p className="text-2xl font-bold mt-1">
                                        {stats.total}
                                    </p>

                                </div>

                                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                    <CalendarDays
                                        size={21}
                                    />
                                </div>

                            </div>

                        </div>

                    </div>

                    {/* PLANIFIÉES */}

                    <div className="card bg-base-100 border border-base-300 shadow-sm">

                        <div className="card-body p-4">

                            <div className="flex items-center justify-between">

                                <div>

                                    <p className="text-sm text-base-content/60">
                                        Planifiées
                                    </p>

                                    <p className="text-2xl font-bold mt-1">
                                        {
                                            stats.planifiees
                                        }
                                    </p>

                                </div>

                                <span className="badge badge-info">
                                    Planifiées
                                </span>

                            </div>

                        </div>

                    </div>

                    {/* EN COURS */}

                    <div className="card bg-base-100 border border-base-300 shadow-sm">

                        <div className="card-body p-4">

                            <div className="flex items-center justify-between">

                                <div>

                                    <p className="text-sm text-base-content/60">
                                        En cours
                                    </p>

                                    <p className="text-2xl font-bold mt-1">
                                        {stats.enCours}
                                    </p>

                                </div>

                                <span className="badge badge-primary">
                                    En cours
                                </span>

                            </div>

                        </div>

                    </div>

                    {/* TERMINÉES */}

                    <div className="card bg-base-100 border border-base-300 shadow-sm">

                        <div className="card-body p-4">

                            <div className="flex items-center justify-between">

                                <div>

                                    <p className="text-sm text-base-content/60">
                                        Terminées
                                    </p>

                                    <p className="text-2xl font-bold mt-1">
                                        {stats.terminees}
                                    </p>

                                </div>

                                <span className="badge badge-neutral">
                                    Terminées
                                </span>

                            </div>

                        </div>

                    </div>

                </div>

                {/* ==================================================
                    RECHERCHE + FILTRES
                ================================================== */}

                <div className="card bg-base-100 border border-base-300 shadow-sm">

                    <div className="card-body">

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            {/* RECHERCHE */}

                            <div className="form-control">

                                <label className="label">
                                    <span className="label-text font-medium">
                                        Rechercher
                                    </span>
                                </label>

                                <label className="input input-bordered flex items-center gap-2">

                                    <Search
                                        size={18}
                                        className="opacity-50"
                                    />

                                    <input
                                        type="text"
                                        value={
                                            search
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            handleSearch(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="Code, nom, formation..."
                                        className="grow"
                                    />

                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleSearch(
                                                    ""
                                                )
                                            }
                                            className="btn btn-ghost btn-xs"
                                            title="Effacer"
                                        >
                                            <X
                                                size={
                                                    15
                                                }
                                            />
                                        </button>
                                    )}

                                </label>

                            </div>

                            {/* STATUT */}

                            <div className="form-control">

                                <label className="label">
                                    <span className="label-text font-medium">
                                        Statut
                                    </span>
                                </label>

                                <select
                                    className="select select-bordered w-full"
                                    value={
                                        filters.statut
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleStatusChange(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                >

                                    <option value="">
                                        Tous les statuts
                                    </option>

                                    {Object.entries(
                                        STATUTS
                                    ).map(
                                        ([
                                            value,
                                            info,
                                        ]) => (
                                            <option
                                                key={
                                                    value
                                                }
                                                value={
                                                    value
                                                }
                                            >
                                                {
                                                    info.label
                                                }
                                            </option>
                                        )
                                    )}

                                </select>

                            </div>

                            {/* FORMATION */}

                            <div className="form-control">

                                <label className="label">
                                    <span className="label-text font-medium">
                                        Formation
                                    </span>
                                </label>

                                <select
                                    className="select select-bordered w-full"
                                    value={
                                        filters.formationId
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleFormationChange(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                >

                                    <option value="">
                                        Toutes les formations
                                    </option>

                                    {formations.map(
                                        (
                                            formation
                                        ) => (
                                            <option
                                                key={
                                                    formation.id
                                                }
                                                value={
                                                    formation.id
                                                }
                                            >
                                                {
                                                    formation.code
                                                }{" "}
                                                —{" "}
                                                {
                                                    formation.nom
                                                }
                                            </option>
                                        )
                                    )}

                                </select>

                            </div>

                        </div>

                        {hasFilters && (
                            <div className="mt-4 flex justify-end">

                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm gap-2"
                                    onClick={
                                        resetFilters
                                    }
                                >
                                    <X
                                        size={16}
                                    />

                                    Réinitialiser les
                                    filtres
                                </button>

                            </div>
                        )}

                    </div>

                </div>

                {/* ==================================================
                    TABLEAU
                ================================================== */}

                <div className="card bg-base-100 border border-base-300 shadow-sm">

                    <div className="card-body p-0">

                        <div className="overflow-x-auto">

                            <table className="table table-zebra">

                                <thead>

                                    <tr>

                                        <th>
                                            Session
                                        </th>

                                        <th>
                                            Formation
                                        </th>

                                        <th>
                                            Période
                                        </th>

                                        <th>
                                            Participants
                                        </th>

                                        <th>
                                            Modules
                                        </th>

                                        <th>
                                            Statut
                                        </th>

                                        <th className="text-right">
                                            Actions
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {sessions.length ===
                                    0 ? (
                                        <tr>

                                            <td
                                                colSpan={
                                                    7
                                                }
                                                className="py-16"
                                            >

                                                <div className="text-center">

                                                    <CalendarDays
                                                        size={
                                                            42
                                                        }
                                                        className="mx-auto opacity-30"
                                                    />

                                                    <h3 className="font-semibold mt-3">
                                                        Aucune
                                                        session
                                                        trouvée
                                                    </h3>

                                                    <p className="text-sm text-base-content/60 mt-1">
                                                        {hasFilters
                                                            ? "Aucune session ne correspond aux filtres sélectionnés."
                                                            : "Commencez par créer une nouvelle session."}
                                                    </p>

                                                    {!hasFilters && (
                                                        <Link
                                                            href="/sessions/nouvelle"
                                                            className="btn btn-primary btn-sm mt-5 gap-2"
                                                        >
                                                            <Plus
                                                                size={
                                                                    16
                                                                }
                                                            />

                                                            Nouvelle
                                                            session
                                                        </Link>
                                                    )}

                                                </div>

                                            </td>

                                        </tr>
                                    ) : (
                                        sessions.map(
                                            (
                                                session
                                            ) => {
                                                const statusInfo =
                                                    getStatusInfo(
                                                        session.statut
                                                    );

                                                const inscriptions =
                                                    session
                                                        ._count
                                                        ?.inscriptions ??
                                                    0;

                                                const modules =
                                                    session
                                                        ._count
                                                        ?.modules ??
                                                    0;

                                                const isDeleting =
                                                    deletingSessionId ===
                                                    session.id;

                                                return (
                                                    <tr
                                                        key={
                                                            session.id
                                                        }
                                                        className="hover"
                                                    >

                                                        {/* SESSION */}

                                                        <td>

                                                            <div>

                                                                <Link
                                                                    href={`/sessions/${session.id}`}
                                                                    className="font-bold link link-hover"
                                                                >
                                                                    {
                                                                        session.code
                                                                    }
                                                                </Link>

                                                                {session.nom && (
                                                                    <p className="text-sm text-base-content/60">
                                                                        {
                                                                            session.nom
                                                                        }
                                                                    </p>
                                                                )}

                                                            </div>

                                                        </td>

                                                        {/* FORMATION */}

                                                        <td>

                                                            <div>

                                                                <p className="font-medium">
                                                                    {
                                                                        session
                                                                            .formation
                                                                            .code
                                                                    }
                                                                </p>

                                                                <p className="text-sm text-base-content/60 max-w-56 truncate">
                                                                    {
                                                                        session
                                                                            .formation
                                                                            .nom
                                                                    }
                                                                </p>

                                                            </div>

                                                        </td>

                                                        {/* PÉRIODE */}

                                                        <td>

                                                            <div className="text-sm">

                                                                <p>

                                                                    <span className="text-base-content/50">
                                                                        Du :
                                                                    </span>{" "}

                                                                    {formatDate(
                                                                        session.dateDebut
                                                                    )}

                                                                </p>

                                                                <p className="mt-1">

                                                                    <span className="text-base-content/50">
                                                                        Au :
                                                                    </span>{" "}

                                                                    {formatDate(
                                                                        session.dateFin
                                                                    )}

                                                                </p>

                                                            </div>

                                                        </td>

                                                        {/* PARTICIPANTS */}

                                                        <td>

                                                            <div className="flex items-center gap-2">

                                                                <Users
                                                                    size={
                                                                        16
                                                                    }
                                                                    className="text-base-content/50"
                                                                />

                                                                <span className="font-medium">
                                                                    {
                                                                        inscriptions
                                                                    }
                                                                </span>

                                                                {session.capacite !==
                                                                    null && (
                                                                    <span className="text-base-content/50">
                                                                        /
                                                                        {
                                                                            session.capacite
                                                                        }
                                                                    </span>
                                                                )}

                                                            </div>

                                                        </td>

                                                        {/* MODULES */}

                                                        <td>

                                                            <div className="flex items-center gap-2">

                                                                <FileText
                                                                    size={
                                                                        16
                                                                    }
                                                                    className="text-base-content/50"
                                                                />

                                                                <span>
                                                                    {
                                                                        modules
                                                                    }
                                                                </span>

                                                            </div>

                                                        </td>

                                                        {/* STATUT */}

                                                        <td>

                                                            <span
                                                                className={`badge ${statusInfo.className}`}
                                                            >
                                                                {
                                                                    statusInfo.label
                                                                }
                                                            </span>

                                                        </td>

                                                        {/* ACTIONS */}

                                                        <td>

                                                            <div className="flex justify-end gap-1">

                                                                {/* VOIR */}

                                                                <Link
                                                                    href={`/sessions/${session.id}`}
                                                                    className="btn btn-ghost btn-sm"
                                                                    title="Voir"
                                                                >
                                                                    <Eye
                                                                        size={
                                                                            17
                                                                        }
                                                                    />
                                                                </Link>

                                                                {/* MODIFIER */}

                                                                <Link
                                                                    href={`/sessions/${session.id}/modifier`}
                                                                    className="btn btn-ghost btn-sm"
                                                                    title="Modifier"
                                                                >
                                                                    <Pencil
                                                                        size={
                                                                            17
                                                                        }
                                                                    />
                                                                </Link>

                                                                {/* SUPPRIMER */}

                                                                <button
                                                                    type="button"
                                                                    className="btn btn-ghost btn-sm text-error"
                                                                    title="Supprimer"
                                                                    disabled={
                                                                        isDeleting
                                                                    }
                                                                    onClick={() =>
                                                                        handleDelete(
                                                                            session
                                                                        )
                                                                    }
                                                                >

                                                                    {isDeleting ? (
                                                                        <span className="loading loading-spinner loading-sm" />
                                                                    ) : (
                                                                        <Trash2
                                                                            size={
                                                                                17
                                                                            }
                                                                        />
                                                                    )}

                                                                </button>

                                                            </div>

                                                        </td>

                                                    </tr>
                                                );
                                            }
                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                        {/* ==================================================
                            PAGINATION
                        ================================================== */}

                        {pagination.total >
                            0 && (
                            <div className="flex flex-col gap-4 border-t border-base-300 p-4 sm:flex-row sm:items-center sm:justify-between">

                                <p className="text-sm text-base-content/60">

                                    Affichage{" "}

                                    <span className="font-medium text-base-content">
                                        {
                                            start
                                        }
                                    </span>{" "}

                                    à{" "}

                                    <span className="font-medium text-base-content">
                                        {
                                            end
                                        }
                                    </span>{" "}

                                    sur{" "}

                                    <span className="font-medium text-base-content">
                                        {
                                            pagination.total
                                        }
                                    </span>{" "}

                                    session
                                    {pagination.total >
                                    1
                                        ? "s"
                                        : ""}

                                </p>

                                {pagination.totalPages >
                                    1 && (
                                    <div className="join">

                                        <button
                                            type="button"
                                            className="join-item btn btn-sm"
                                            disabled={
                                                pagination.page <=
                                                1
                                            }
                                            onClick={() =>
                                                goToPage(
                                                    pagination.page -
                                                        1
                                                )
                                            }
                                        >
                                            <ChevronLeft
                                                size={
                                                    17
                                                }
                                            />
                                        </button>

                                        {Array.from(
                                            {
                                                length: pagination.totalPages,
                                            },
                                            (
                                                _,
                                                index
                                            ) =>
                                                index +
                                                1
                                        )
                                            .filter(
                                                (
                                                    page
                                                ) =>
                                                    page ===
                                                        1 ||
                                                    page ===
                                                        pagination.totalPages ||
                                                    Math.abs(
                                                        page -
                                                            pagination.page
                                                    ) <=
                                                        1
                                            )
                                            .map(
                                                (
                                                    page
                                                ) => (
                                                    <button
                                                        key={
                                                            page
                                                        }
                                                        type="button"
                                                        className={`join-item btn btn-sm ${
                                                            page ===
                                                            pagination.page
                                                                ? "btn-primary"
                                                                : ""
                                                        }`}
                                                        onClick={() =>
                                                            goToPage(
                                                                page
                                                            )
                                                        }
                                                    >
                                                        {
                                                            page
                                                        }
                                                    </button>
                                                )
                                            )}

                                        <button
                                            type="button"
                                            className="join-item btn btn-sm"
                                            disabled={
                                                pagination.page >=
                                                pagination.totalPages
                                            }
                                            onClick={() =>
                                                goToPage(
                                                    pagination.page +
                                                        1
                                                )
                                            }
                                        >
                                            <ChevronRight
                                                size={
                                                    17
                                                }
                                            />
                                        </button>

                                    </div>
                                )}

                            </div>
                        )}

                    </div>

                </div>

            </div>
        </div>
    );
}
