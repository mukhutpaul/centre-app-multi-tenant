import {
  getInscriptionFormData,
  getInscriptions,
} from "@/actions/inscription.actions";

import InscriptionsClient from "@/components/inscriptions/inscriptions-client";

export default async function InscriptionsPage() {
  const [inscriptions, formData] =
    await Promise.all([
      getInscriptions(),
      getInscriptionFormData(),
    ]);

  return (
    <InscriptionsClient
      inscriptions={inscriptions}
      apprenants={formData.apprenants}
      sessions={formData.sessions}
    />
  );
}