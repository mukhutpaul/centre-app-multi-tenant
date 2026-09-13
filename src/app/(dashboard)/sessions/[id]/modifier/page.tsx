import { notFound } from "next/navigation";

import {
  getFormationsForSession,
  getSessionById,
} from "@/actions/session.actions";
import EditSessionForm from "../../EditSessionForm";



interface EditSessionPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditSessionPage({
  params,
}: EditSessionPageProps) {
  const { id } = await params;

  const [sessionResult, formationsResult] = await Promise.all([
    getSessionById(id),
    getFormationsForSession(),
  ]);

  if (!sessionResult.success || !sessionResult.session) {
    notFound();
  }

  if (!formationsResult.success) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>
            Impossible de charger les formations disponibles.
          </span>
        </div>
      </div>
    );
  }

  return (
    <EditSessionForm
      session={sessionResult.session}
      formations={formationsResult.formations ?? []}
    />
  );
}