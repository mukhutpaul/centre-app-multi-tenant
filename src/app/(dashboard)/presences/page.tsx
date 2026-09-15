
import { getPresencePlannings } from "@/actions/presence.actions";
import PresencesClient from "@/components/presences/presences-client";

export const dynamic = "force-dynamic";

export default async function PresencesPage() {
  const plannings = await getPresencePlannings();

  return (
    <div className="w-full">
      <PresencesClient
        plannings={plannings ?? []}
      />
    </div>
  );
}
