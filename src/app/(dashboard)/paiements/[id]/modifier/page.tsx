import {
  getPaiement,
  getPaiementFormData,
} from "@/actions/paiement-actions"
import PaiementEditForm from "@/components/paiements/paiement-edit-form"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function ModifierPaiementPage({
  params,
}: Props) {
  const { id } = await params

  const [
    paiementResult,
    formDataResult,
  ] = await Promise.all([
    getPaiement(id),
    getPaiementFormData(),
  ])

  // ============================================================
  // PAIEMENT
  // ============================================================

  if (
    !paiementResult.success ||
    !paiementResult.data
  ) {
    notFound()
  }

  // ============================================================
  // DONNÉES DU FORMULAIRE
  // ============================================================

  if (
    !formDataResult.success ||
    !formDataResult.data
  ) {
    throw new Error(
      formDataResult.message ||
        "Impossible de charger les données du formulaire."
    )
  }

  return (
    <div className="w-full">
      <PaiementEditForm
        paiement={paiementResult.data}
        data={formDataResult}
      />
    </div>
  )
}