
import { getCurrentCentreContext } from "@/lib/validations/centre-access";
import { getFormateurs } from "@/actions/formateur.actions";
import { StatutFormateur } from "@/generated/prisma/enums";

import FormateursClient from "./formateurs-client";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    statut?: string;
    page?: string;
  }>;
}

export default async function FormateursPage({
  searchParams,
}: PageProps) {
  // ============================================================
  // PARAMÈTRES URL
  // ============================================================

  const params = await searchParams;

  // ============================================================
  // CONTEXTE
  // ============================================================

  const context = await getCurrentCentreContext();

  // ============================================================
  // RECHERCHE
  // ============================================================

  const search = params.q?.trim() ?? "";

  // ============================================================
  // STATUT
  // ============================================================

  const statut =
    params.statut &&
    Object.values(StatutFormateur).includes(
      params.statut as StatutFormateur
    )
      ? (params.statut as StatutFormateur)
      : "TOUS";

  // ============================================================
  // PAGINATION
  // ============================================================

  const pageParam = Number.parseInt(params.page ?? "1", 10);

  const page =
    Number.isFinite(pageParam) && pageParam > 0
      ? pageParam
      : 1;

  // ============================================================
  // FORMATEURS
  // ============================================================

  const result = await getFormateurs({
    search,
    statut,
    page,
  });

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <FormateursClient
      formateurs={result.formateurs}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      search={search}
      statut={statut}
      currentRole={context.role}
      isSuperAdmin={
        context.roleSysteme === "SUPER_ADMIN"
      }
    />
  );
}
