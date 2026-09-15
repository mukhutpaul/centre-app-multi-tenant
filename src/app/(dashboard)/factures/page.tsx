import { getFactures } from "@/actions/facture.actions";
import FacturesClient from "@/components/factures/factures-client";

export const dynamic = "force-dynamic";

export default async function FacturesPage() {
  const factures = await getFactures();

  return (
    <div className="w-full">
      <FacturesClient
        factures={factures ?? []}
      />
    </div>
  );
}