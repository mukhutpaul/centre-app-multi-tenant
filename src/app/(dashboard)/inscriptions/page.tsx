import {
  getInscriptionFormData,
  getInscriptions,
} from "@/actions/inscription.actions";

import InscriptionsClient from "@/components/inscriptions/inscriptions-client";

export default async function InscriptionsPage() {
  const [inscriptions, formData] = await Promise.all([
    getInscriptions(),
    getInscriptionFormData(),
  ]);

  console.log("INSCRIPTIONS :", inscriptions);
  console.log("APPRENANTS :", formData.apprenants);
  console.log("SESSIONS :", formData.sessions);

  return (
    <div className="w-full min-w-0">
      <InscriptionsClient
        inscriptions={inscriptions}
        apprenants={formData.apprenants}
        sessions={formData.sessions}
      />
    </div>
  );
}