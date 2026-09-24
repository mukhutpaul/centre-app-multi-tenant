
import { notFound } from "next/navigation";

import {
  getFactureById,
  getFactureFormData,
} from "@/actions/facture-actions";

import FactureEditForm from "@/components/factures/facture-edit-form";

export const dynamic = "force-dynamic";

/* =========================================================
   TYPES
========================================================= */

type Props = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================================================
   HELPERS
========================================================= */

function decimalToString(
  value:
    | string
    | number
    | {
        toString(): string;
      }
    | null
    | undefined,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "0";
  }

  return value.toString();
}

function dateToString(
  value: Date | string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date
    ? value.toISOString()
    : value;
}

/* =========================================================
   PAGE
========================================================= */

export default async function ModifierFacturePage({
  params,
}: Props) {
  const { id } = await params;

  const [
    facture,
    data,
  ] = await Promise.all([
    getFactureById(id),
    getFactureFormData(),
  ]);

  /* =======================================================
     FACTURE INTROUVABLE
  ====================================================== */

  if (!facture) {
    notFound();
  }

  /* =======================================================
     DONNÉES MINIMALES POUR LE CLIENT
  ====================================================== */

  const factureForm = {
    id: facture.id,

    inscriptionId:
      facture.inscriptionId ?? null,

    numero:
      facture.numero ?? null,

    dateEmission:
      dateToString(
        facture.dateEmission,
      ),

    dateEcheance:
      dateToString(
        facture.dateEcheance,
      ),

    remise:
      decimalToString(
        facture.remise,
      ),

    taxe:
      decimalToString(
        facture.taxe,
      ),

    statut:
      facture.statut,

    notes:
      facture.notes ?? null,

    lignes:
      facture.lignes.map(
        (ligne) => ({
          id: ligne.id,

          description:
            ligne.description,

          quantite:
            decimalToString(
              ligne.quantite,
            ),

          prixUnitaire:
            decimalToString(
              ligne.prixUnitaire,
            ),

          total:
            decimalToString(
              ligne.total,
            ),
        }),
      ),
  };

  /* =======================================================
     RENDER
  ====================================================== */

  return (
    <div className="w-full">
      <FactureEditForm
        facture={factureForm}
        data={data}
      />
    </div>
  );
}

