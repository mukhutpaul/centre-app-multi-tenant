import { getPaiementFormData } from "@/actions/paiement.actions";
import PaiementForm from "@/components/paiements/paiement-form";

export const dynamic = "force-dynamic";

export default async function NouveauPaiementPage() {
  const data = await getPaiementFormData();

  return (
    <div className="w-full">
      <PaiementForm data={data} />
    </div>
  );
}