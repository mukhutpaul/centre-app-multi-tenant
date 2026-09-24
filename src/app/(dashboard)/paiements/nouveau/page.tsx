import { getInscriptionsForPaiement, getFacturesForReglement } from "@/actions/paiement-form-actions"
import PaiementForm from "@/components/paiements/paiement-form"

export default async function NouveauPaiementPage() {
  const [inscriptions, factures] = await Promise.all([
    getInscriptionsForPaiement(),
    getFacturesForReglement(),
  ])

  const serializedInscriptions = inscriptions.map(
    (inscription) => ({
      id: inscription.id,
      numero: inscription.numero,
      apprenant: inscription.apprenant,
      session: {
        formation: inscription.session.formation,
      },
    })
  )

  const serializedFactures = factures.map(
    (facture) => ({
      id: facture.id,
      numero: facture.numero,
      total: Number(facture.total),
      montantPaye: Number(facture.montantPaye),
      montantDu: Number(facture.montantDu),
      convention: {
        id: facture.convention.id,
        numero: facture.convention.numero,
        organisationNom:
          facture.convention.organisationNom,
        montant: Number(facture.convention.montant),
        devise: facture.convention.devise,
      },
    })
  )

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PaiementForm
        inscriptions={serializedInscriptions}
        factures={serializedFactures}
      />
    </div>
  )
}