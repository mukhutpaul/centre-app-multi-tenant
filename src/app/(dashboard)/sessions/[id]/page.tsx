
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
    getSessionById,
    getSessionModules,
} from "@/actions/session.actions";

import SessionDetailClient from "./SessionDetailClient";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export default async function SessionDetailPage({ params }: Props) {
    const { id } = await params;

    const [sessionResult, modulesResult] = await Promise.all([
        getSessionById(id),
        getSessionModules(id),
    ]);

    // ==========================================================
    // ERREUR : SESSION INTROUVABLE
    // ==========================================================

    if (!sessionResult.success) {
        return (
            <div className="p-4 md:p-6">
                <div className="max-w-6xl mx-auto space-y-5">

                    <Link
                        href="/formations/sessions"
                        className="btn btn-ghost gap-2"
                    >
                        <ArrowLeft size={18} />
                        Retour aux sessions
                    </Link>

                    <div className="alert alert-error">
                        <span>
                            {sessionResult.error ||
                                "Session introuvable."}
                        </span>
                    </div>

                </div>
            </div>
        );
    }

    // ==========================================================
    // ERREUR : MODULES
    // ==========================================================

    if (!modulesResult.success) {
        return (
            <div className="p-4 md:p-6">
                <div className="max-w-6xl mx-auto space-y-5">

                    <Link
                        href="/formations/sessions"
                        className="btn btn-ghost gap-2"
                    >
                        <ArrowLeft size={18} />
                        Retour aux sessions
                    </Link>

                    <div className="alert alert-error">
                        <span>
                            {modulesResult.error ||
                                "Impossible de charger les modules."}
                        </span>
                    </div>

                </div>
            </div>
        );
    }

    // ==========================================================
    // AFFICHAGE DU DÉTAIL
    // ==========================================================

    return (
        <SessionDetailClient
            session={sessionResult.session}
            modules={modulesResult.modules ?? []}
        />
    );
}
