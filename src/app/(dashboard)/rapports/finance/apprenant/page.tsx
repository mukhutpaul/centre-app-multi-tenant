import ApprenantFinanceCheck from "@/components/rapports/finance/apprenant-finance-check";

import { getCurrentCentreContext } from "@/lib/validations/centre-access";

export const dynamic = "force-dynamic";

export default async function FinanceApprenantPage() {
  const context =
    await getCurrentCentreContext();

  if (!context.centreId) {
    throw new Error(
      "Aucun centre actif n'est associé à votre compte.",
    );
  }

  /*
   * La devise sera idéalement récupérée
   * depuis le centre actif.
   *
   * Pour éviter de dépendre d'une nouvelle requête
   * ici, XAF reste la valeur par défaut.
   */

  return (
    <div className="w-full space-y-6 p-4 md:p-6 lg:p-8">
      {/* ======================================================
          EN-TÊTE
      ====================================================== */}

      <div>
        <div className="breadcrumbs mb-2 text-sm">
          <ul>
            <li>
              <a href="/rapports">
                Rapports
              </a>
            </li>

            <li>
              <a href="/rapports/finance">
                Finance
              </a>
            </li>

            <li>
              Apprenant
            </li>
          </ul>
        </div>

        <h1 className="text-2xl font-black md:text-3xl">
          Situation financière d'un apprenant
        </h1>

        <p className="mt-1 text-sm text-base-content/60">
          Vérifiez les paiements, factures,
          échéances et la dette restante pour une
          inscription précise.
        </p>
      </div>

      <ApprenantFinanceCheck
        devise="USD"
      />
    </div>
  );
}