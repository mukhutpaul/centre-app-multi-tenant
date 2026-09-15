import {
  getPaiements,
} from "@/actions/paiement.actions";

import PaiementsClient from "@/components/paiements/paiements-client";

export const dynamic = "force-dynamic";

/**
 * ============================================================
 * PAGE PAIEMENTS
 * ============================================================
 *
 * Les données provenant de Prisma peuvent contenir des Decimal.
 * On les transforme ici en valeurs sérialisables avant de les
 * transmettre au composant Client.
 */

function serializeValue(
  value: unknown,
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof (
      value as {
        toString?: unknown;
      }
    ).toString === "function"
  ) {
    const constructorName =
      (
        value as {
          constructor?: {
            name?: string;
          };
        }
      ).constructor?.name;

    if (
      constructorName === "Decimal"
    ) {
      return value.toString();
    }
  }

  if (Array.isArray(value)) {
    return value.map(
      serializeValue,
    );
  }

  if (
    typeof value === "object"
  ) {
    const result: Record<
      string,
      unknown
    > = {};

    for (const [
      key,
      item,
    ] of Object.entries(
      value as Record<
        string,
        unknown
      >,
    )) {
      result[key] =
        serializeValue(item);
    }

    return result;
  }

  return value;
}

export default async function PaiementsPage() {
  const paiements =
    await getPaiements();

  const paiementsSerialises =
    serializeValue(
      paiements ?? [],
    ) as any[];

  return (
    <div className="w-full">
      <PaiementsClient
        paiements={
          paiementsSerialises
        }
      />
    </div>
  );
}