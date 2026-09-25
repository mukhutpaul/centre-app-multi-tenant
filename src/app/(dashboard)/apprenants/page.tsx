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

  const { centre } = await getCurrentCentre();

  const q = params.q?.trim() ?? "";

  const parsedPage = Number(params.page ?? 1);

  const page =
    Number.isFinite(parsedPage) && parsedPage > 0
      ? Math.floor(parsedPage)
      : 1;

  const normalizedStatut = params.statut?.toUpperCase();

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
          statut: statut as
            | "ACTIF"
            | "INACTIF"
            | "DIPLOME"
            | "SUSPENDU"
            | "ARCHIVE",
        }
      : {}),
  };

  const [apprenants, total] = await Promise.all([
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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const currentPage =
    totalPages > 0
      ? Math.min(page, totalPages)
      : 1;

  return (
    <main className="w-full min-w-0 space-y-6 pb-8">
      {/* =======================================================
          EN-TÊTE
      ======================================================= */}
      <section className="w-full">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            {/* GAUCHE */}
            <div className="min-w-0">
              {/* Breadcrumb */}
              <div className="breadcrumbs mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                <ul>
                  <li>
                    <span className="text-slate-400 dark:text-slate-500">
                      Gestion
                    </span>
                  </li>

                  <li>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Apprenants
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex items-start gap-4">
                {/* Icône */}
                <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm sm:flex dark:bg-white dark:text-slate-900">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                    />

                    <circle
                      cx="9"
                      cy="7"
                      r="4"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                    />
                  </svg>
                </div>

                <div className="min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                    Apprenants
                  </h1>

                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Gérez les apprenants inscrits dans votre centre,
                    consultez leurs informations et suivez leur statut.
                  </p>
                </div>
              </div>
            </div>

            {/* DROITE — STATISTIQUE */}
            <div className="flex shrink-0 items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-200">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                      />

                      <circle
                        cx="9"
                        cy="7"
                        r="4"
                      />

                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                      />
                    </svg>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Total apprenants
                    </p>

                    <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {total.toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BARRE INFÉRIEURE */}
          <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-800/30">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Gestion du centre</span>
              </div>

              <div className="hidden h-3 w-px bg-slate-300 sm:block dark:bg-slate-700" />

              <span>
                {total === 0
                  ? "Aucun apprenant enregistré"
                  : `${total.toLocaleString("fr-FR")} apprenant${
                      total > 1 ? "s" : ""
                    } enregistré${total > 1 ? "s" : ""}`}
              </span>

              {(q || statut) && (
                <>
                  <div className="hidden h-3 w-px bg-slate-300 sm:block dark:bg-slate-700" />

                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Filtres actifs
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =======================================================
          TABLEAU / GESTION
      ======================================================= */}
      <section className="w-full min-w-0">
        <div className="w-full min-w-0">
          <ApprenantTable
            apprenants={apprenants}
            total={total}
            page={currentPage}
            totalPages={totalPages}
            search={q}
            statut={statut}
          />
        </div>
      </section>
    </main>
  );
}