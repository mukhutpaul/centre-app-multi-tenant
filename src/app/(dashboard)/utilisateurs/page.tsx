import {
  getUtilisateurs,
} from "@/actions/utilisateur.actions";
import UtilisateursClient from "./utilisateurs-client";


export default async function UtilisateursPage() {
  const membres = await getUtilisateurs();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">
          Utilisateurs
        </h1>

        <p className="text-sm text-base-content/60">
          Gérez les utilisateurs, membres et rôles
          de votre centre.
        </p>
      </div>

      <UtilisateursClient membres={membres} />
    </div>
  );
}