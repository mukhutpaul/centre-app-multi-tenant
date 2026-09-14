import {
  getInscriptionById,
} from "@/actions/inscription.actions";

import InscriptionDetailClient from "@/components/inscriptions/inscription-detail-client";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InscriptionDetailPage({
  params,
}: Props) {
  const { id } = await params;

  const inscription =
    await getInscriptionById(id);

  return (
    <InscriptionDetailClient
      inscription={inscription}
    />
  );
}