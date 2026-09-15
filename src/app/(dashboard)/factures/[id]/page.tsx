import { notFound } from "next/navigation";

import { getFactureById } from "@/actions/facture.actions";
import FactureDetail from "@/components/factures/facture-detail";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function FactureDetailPage({
  params,
}: Props) {
  const { id } = await params;

  const facture =
    await getFactureById(id);

  if (!facture) {
    notFound();
  }

  return (
    <div className="w-full">
      <FactureDetail
        facture={facture}
      />
    </div>
  );
}