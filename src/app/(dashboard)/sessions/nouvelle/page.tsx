import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getFormationsForSession } from "@/actions/session.actions";
import NewSessionForm from "../NewSessionForm";


export default async function NewSessionPage() {
  const result = await getFormationsForSession();

  if (!result.success) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="alert alert-error">
            <span>
              {result.message ||
                "Impossible de charger les formations."}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* EN-TÊTE */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="breadcrumbs text-sm">
              <ul>
                <li>
                  <Link href="/formations">Formations</Link>
                </li>

                <li>
                  <Link href="/formations/sessions">
                    Sessions
                  </Link>
                </li>

                <li>Nouvelle session</li>
              </ul>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold mt-2">
              Nouvelle session
            </h1>

            <p className="text-base-content/60 mt-1">
              Créez une nouvelle session de formation.
            </p>
          </div>

          <Link
            href="/sessions"
            className="btn btn-outline gap-2"
          >
            <ArrowLeft size={18} />
            Retour
          </Link>
        </div>

        {/* FORMULAIRE */}
       <NewSessionForm formations={result.formations ?? []} />
      </div>
    </div>
  );
}