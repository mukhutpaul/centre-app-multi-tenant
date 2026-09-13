import {
    getFormationsForSession,
    getSessionStats,
    getSessions,
} from "@/actions/session.actions";
import SessionListClient from "./SessionListClient";




interface SessionsPageProps {
    searchParams: Promise<{
        query?: string;
        statut?: string;
        formationId?: string;
        page?: string;
    }>;
}

export default async function SessionsPage({
    searchParams,
}: SessionsPageProps) {
    const params = await searchParams;

    const query = params.query?.trim() || "";
    const statut = params.statut || "";
    const formationId = params.formationId || "";

    const pageNumber = Number(params.page);

    const page =
        Number.isInteger(pageNumber) && pageNumber > 0
            ? pageNumber
            : 1;

    // ============================================================
    // CHARGEMENT DES DONNÉES
    // ============================================================

    const [
        sessionsResult,
        formationsResult,
        statsResult,
    ] = await Promise.all([
        getSessions({
            search: query,
            statut: statut as any,
            formationId,
            page,
            limit: 10,
        }),

        getFormationsForSession(),

        getSessionStats(),
    ]);

    // ============================================================
    // ERREUR SESSIONS
    // ============================================================

    if (!sessionsResult.success) {
        return (
            <div className="p-6">
                <div className="alert alert-error">
                    <span>
                        {sessionsResult.error ||
                            "Impossible de charger les sessions."}
                    </span>
                </div>
            </div>
        );
    }

    // ============================================================
    // ERREUR FORMATIONS
    // ============================================================

    if (!formationsResult.success) {
        return (
            <div className="p-6">
                <div className="alert alert-error">
                    <span>
                        {formationsResult.error ||
                            "Impossible de charger les formations."}
                    </span>
                </div>
            </div>
        );
    }

    // ============================================================
    // DONNÉES
    // ============================================================

    const sessions = sessionsResult.data ?? [];

    const formations =
        formationsResult.formations ?? [];

    const pagination = {
        page: sessionsResult.page ?? page,
        limit: sessionsResult.limit ?? 10,
        total: sessionsResult.total ?? 0,
        totalPages: sessionsResult.pages ?? 0,
    };

    const stats = statsResult.stats ?? {
        total: 0,
        planifiees: 0,
        inscriptionsOuvertes: 0,
        inscriptionsFermees: 0,
        enCours: 0,
        terminees: 0,
        annulees: 0,
        suspendues: 0,
    };

    // ============================================================
    // AFFICHAGE
    // ============================================================

    return (
        <SessionListClient
            sessions={sessions}
            formations={formations}
            pagination={pagination}
            stats={stats}
            filters={{
                query,
                statut,
                formationId,
            }}
        />
    );
}