import {
  StatutFormation,
  TypeFormation,
} from "@/generated/prisma/enums";

import {
  getCurrentCentreContext,
} from "@/lib/validations/centre-access";

import {
  getFormations,
} from "@/actions/formation.actions";

import FormationsClient from "./formations-client";

/**
 * ============================================================
 * PARAMÈTRES DE PAGE
 * ============================================================
 */

interface PageProps {
  searchParams: Promise<{
    q?: string;
    statut?: string;
    type?: string;
    page?: string;
  }>;
}

/**
 * ============================================================
 * PAGE FORMATIONS
 * ============================================================
 */

export default async function FormationsPage({
  searchParams,
}: PageProps) {
  /**
   * ----------------------------------------------------------
   * PARAMÈTRES URL
   * ----------------------------------------------------------
   */

  const params = await searchParams;

  /**
   * ----------------------------------------------------------
   * CONTEXTE UTILISATEUR
   * ----------------------------------------------------------
   */

  const context = await getCurrentCentreContext();

  /**
   * ----------------------------------------------------------
   * RECHERCHE
   * ----------------------------------------------------------
   */

  const search = params.q?.trim() ?? "";

  /**
   * ----------------------------------------------------------
   * STATUT
   * ----------------------------------------------------------
   */

  const statut =
    params.statut &&
    Object.values(StatutFormation).includes(
      params.statut as StatutFormation,
    )
      ? (params.statut as StatutFormation)
      : "TOUS";

  /**
   * ----------------------------------------------------------
   * TYPE
   * ----------------------------------------------------------
   */

  const type =
    params.type &&
    Object.values(TypeFormation).includes(
      params.type as TypeFormation,
    )
      ? (params.type as TypeFormation)
      : "TOUS";

  /**
   * ----------------------------------------------------------
   * PAGE
   * ----------------------------------------------------------
   */

  const pageParam = Number.parseInt(
    params.page ?? "1",
    10,
  );

  const page =
    Number.isFinite(pageParam) && pageParam > 0
      ? pageParam
      : 1;

  /**
   * ----------------------------------------------------------
   * RÉCUPÉRATION DES FORMATIONS
   * ----------------------------------------------------------
   */

  const result = await getFormations({
    search,
    statut,
    type,
    page,
  });

  const total = result.total ?? 0;

  const currentPage = result.page ?? page;

  const totalPages = result.totalPages ?? 0;

  const hasActiveFilters =
    Boolean(search) ||
    statut !== "TOUS" ||
    type !== "TOUS";

  /**
   * ----------------------------------------------------------
   * RENDU
   * ----------------------------------------------------------
   */

  return (
    <main className="w-full min-w-0 space-y-6 pb-8">
      {/* =====================================================
          EN-TÊTE
      ===================================================== */}

      <section className="w-full">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            {/* -------------------------------------------------
                GAUCHE
            ------------------------------------------------- */}

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
                      Formations
                    </span>
                  </li>
                </ul>
              </div>

              {/* Titre */}

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
                      d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 6h8M8 10h8M8 14h5"
                    />
                  </svg>
                </div>

                <div className="min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                    Formations
                  </h1>

                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Gérez le catalogue des formations de votre
                    centre, leurs types, leurs statuts et leur
                    organisation pédagogique.
                  </p>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------
                STATISTIQUE
            ------------------------------------------------- */}

            <div className="flex shrink-0 items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex items-center gap-3">
                  {/* Icône */}

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
                        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                      />

                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"
                      />
                    </svg>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Total formations
                    </p>

                    <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {total.toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              BARRE D'INFORMATIONS
          ================================================= */}

          <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-800/30">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
              {/* Centre */}

              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                <span>
                  Catalogue des formations
                </span>
              </div>

              <div className="hidden h-3 w-px bg-slate-300 sm:block dark:bg-slate-700" />

              {/* Nombre */}

              <span>
                {total === 0
                  ? "Aucune formation enregistrée"
                  : `${total.toLocaleString("fr-FR")} formation${
                      total > 1 ? "s" : ""
                    } enregistrée${
                      total > 1 ? "s" : ""
                    }`}
              </span>

              {/* Filtres */}

              {hasActiveFilters && (
                <>
                  <div className="hidden h-3 w-px bg-slate-300 sm:block dark:bg-slate-700" />

                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Filtres actifs
                  </span>
                </>
              )}

              {/* Page */}

              {totalPages > 0 && (
                <>
                  <div className="hidden h-3 w-px bg-slate-300 sm:block dark:bg-slate-700" />

                  <span>
                    Page {currentPage} sur{" "}
                    {totalPages}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          CONTENU PRINCIPAL
      ===================================================== */}

      <section className="w-full min-w-0">
        <div className="w-full min-w-0">
          <FormationsClient
            formations={result.formations}
            total={total}
            page={currentPage}
            totalPages={totalPages}
            search={search}
            statut={statut}
            type={type}
            currentRole={context.role}
            isSuperAdmin={
              context.roleSysteme ===
              "SUPER_ADMIN"
            }
          />
        </div>
      </section>
    </main>
  );
}