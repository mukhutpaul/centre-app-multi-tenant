import { prisma } from "@/lib/prisma";


import { ApprenantTable } from "@/components/apprenants/apprenant-table";
import { getCurrentCentre } from "@/lib/validations/centre-access";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    statut?: string;
  }>;
}

const PAGE_SIZE = 10;

const STATUTS = [
  "ACTIF",
  "INACTIF",
  "DIPLOME",
  "SUSPENDU",
  "ARCHIVE",
] as const;

export default async function ApprenantsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const { centre } =
    await getCurrentCentre();

  const q = params.q?.trim() ?? "";

  const parsedPage = Number(
    params.page ?? 1,
  );

  const page =
    Number.isFinite(parsedPage) &&
    parsedPage > 0
      ? Math.floor(parsedPage)
      : 1;

  const normalizedStatut =
    params.statut?.toUpperCase();

  const statut =
    normalizedStatut &&
    STATUTS.includes(
      normalizedStatut as (typeof STATUTS)[number],
    )
      ? normalizedStatut
      : undefined;

  const where = {
    centreId: centre.id,

    ...(q
      ? {
          OR: [
            {
              prenom: {
                contains: q,
              },
            },
            {
              nom: {
                contains: q,
              },
            },
            {
              numero: {
                contains: q,
              },
            },
            {
              email: {
                contains: q,
              },
            },
            {
              telephone: {
                contains: q,
              },
            },
          ],
        }
      : {}),

    ...(statut
      ? {
          statut:
            statut as
              | "ACTIF"
              | "INACTIF"
              | "DIPLOME"
              | "SUSPENDU"
              | "ARCHIVE",
        }
      : {}),
  };

  const [apprenants, total] =
    await Promise.all([
      prisma.apprenant.findMany({
        where,

        orderBy: [
          {
            nom: "asc",
          },
          {
            prenom: "asc",
          },
        ],

        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),

      prisma.apprenant.count({
        where,
      }),
    ]);

  const totalPages = Math.ceil(
    total / PAGE_SIZE,
  );

  const currentPage =
    totalPages > 0
      ? Math.min(page, totalPages)
      : 1;

  return (
    <div className="space-y-6">
      {/* EN-TÊTE */}

      <div>
        <div className="breadcrumbs text-sm">
          <ul>
            <li>Gestion</li>
            <li>Apprenants</li>
          </ul>
        </div>

        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
          Apprenants
        </h1>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Gestion des apprenants du centre.
        </p>
      </div>

      <ApprenantTable
        apprenants={apprenants}
        total={total}
        page={currentPage}
        totalPages={totalPages}
        search={q}
        statut={statut}
      />
    </div>
  );
}