import { prisma } from "@/lib/prisma";
import { CentreTable } from "@/components/centres/centre-table";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    statut?: string;
  }>;
}

const PAGE_SIZE = 10;

export default async function CentresPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const q = params.q?.trim() ?? "";

  const page = Math.max(
    1,
    Number(params.page ?? 1),
  );

  const statut = params.statut;

  const actif =
    statut === "actif"
      ? true
      : statut === "inactif"
        ? false
        : undefined;

  const where = {
    ...(q
      ? {
          OR: [
            {
              nom: {
                contains: q,
              },
            },
            {
              code: {
                contains: q,
              },
            },
            {
              ville: {
                contains: q,
              },
            },
          ],
        }
      : {}),

    ...(actif !== undefined
      ? {
          actif,
        }
      : {}),
  };

  const [centres, total] =
    await Promise.all([
      prisma.centreFormation.findMany({
        where,
        orderBy: {
          nom: "asc",
        },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),

      prisma.centreFormation.count({
        where,
      }),
    ]);

  const totalPages = Math.ceil(
    total / PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="breadcrumbs text-sm">
          <ul>
            <li>Administration</li>
            <li>Gestion</li>
            <li>Centres</li>
          </ul>
        </div>

        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
          Centres de formation
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Gestion des établissements de formation
          professionnelle.
        </p>
      </div>

      <CentreTable
        centres={centres}
        total={total}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
