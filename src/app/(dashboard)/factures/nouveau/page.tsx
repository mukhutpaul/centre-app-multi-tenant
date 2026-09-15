import { getFactureFormData } from "@/actions/facture.actions";
import FactureForm from "@/components/factures/facture-form";


export const dynamic = "force-dynamic";

export default async function NouvelleFacturePage() {
  const data =
    await getFactureFormData();

  return (
    <div className="w-full">
      <FactureForm data={data} />
    </div>
  );
}