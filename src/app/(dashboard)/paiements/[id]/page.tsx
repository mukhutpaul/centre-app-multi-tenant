import { getPaiementById } from "@/actions/paiement.actions";
import PaiementDetail from "@/components/paiements/paiement-detail";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
params: Promise<{
id: string;
}>;
};

/* =========================================================
SÉRIALISATION DES DONNÉES PRISMA
Convertit notamment les Decimal et Date avant
transmission vers un Client Component.
========================================================= */

function serializeData<T>(value: T): T {
if (value === null || value === undefined) {
return value;
}

if (value instanceof Date) {
return value.toISOString() as T;
}

if (
typeof value === "object" &&
value !== null &&
"toNumber" in value &&
typeof (value as { toNumber?: unknown }).toNumber === "function"
) {
return (value as { toNumber: () => number }).toNumber() as T;
}

if (Array.isArray(value)) {
return value.map((item) =>
serializeData(item),
) as T;
}

if (typeof value === "object") {
const result: Record<string, unknown> = {};


for (const [key, item] of Object.entries(
  value as Record<string, unknown>,
)) {
  result[key] = serializeData(item);
}

return result as T;


}

return value;
}

/* =========================================================
PAGE
========================================================= */

export default async function PaiementDetailPage({
params,
}: Props) {
const { id } = await params;

const paiement = await getPaiementById(id);

if (!paiement) {
notFound();
}

const paiementSerialise = serializeData(
paiement,
);

return ( <div className="w-full"> <PaiementDetail
     paiement={paiementSerialise}
   /> </div>
);
}
