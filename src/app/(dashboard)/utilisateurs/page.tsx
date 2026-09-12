
import {
  getUtilisateurs,
} from "@/actions/utilisateur.actions";

import {
  getCurrentCentreContext,
} from "@/lib/validations/centre-access";

import UtilisateursClient from "./utilisateurs-client";


export default async function UtilisateursPage() {
  /* ============================================================
     CONTEXTE DE L'UTILISATEUR CONNECTÉ
     
     Le rôle est déterminé côté serveur.
     Il ne doit jamais être fourni par le navigateur.
  ============================================================ */

  const context = await getCurrentCentreContext();

  /* ============================================================
     UTILISATEURS DU CENTRE
  ============================================================ */

  const membres = await getUtilisateurs();

  return (
    <div className="space-y-6 p-6">

      {/* ========================================================
          EN-TÊTE
      ========================================================= */}

      <div>
        <h1 className="text-2xl font-bold">
          Utilisateurs
        </h1>

        <p className="text-sm text-base-content/60">
          Gérez les utilisateurs, membres et rôles
          de votre centre.
        </p>
      </div>

      {/* ========================================================
          CLIENT
          
          IMPORTANT :
          On transmet le rôle déterminé côté serveur.
      ========================================================= */}

      <UtilisateursClient
        membres={membres}
        currentRole={context.role}
      />

    </div>
  );
}

