import {
  getPaiementById,
  getPaiementFormData,
} from "@/actions/paiement.actions";
import PaiementEditForm from "@/components/paiements/paiement-edit-form";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ModifierPaiementPage({
  params,
}: Props) {
  const { id } = await params;

  const [paiement, data] =
    await Promise.all([
      getPaiementById(id),
      getPaiementFormData(),
    ]);

  if (!paiement) {
    notFound();
  }

  return (
    <div className="w-full">
      <PaiementEditForm
        paiement={paiement}
        data={data}
      />
    </div>
  );
}