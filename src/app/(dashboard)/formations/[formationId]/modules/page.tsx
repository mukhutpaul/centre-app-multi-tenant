import {
  Role,
} from "@/generated/prisma/enums";

import {
  getCurrentCentreContext,
} from "@/lib/validations/centre-access";

import {
  getFormationAvecModules,
  getModulesFormation,
} from "@/actions/module-formation.actions";

import ModulesClient from "./modules-client";

interface PageProps {
  params: Promise<{
    formationId: string;
  }>;

  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
}

export default async function ModulesPage({
  params,
  searchParams,
}: PageProps) {
  const { formationId } = await params;
  const query = await searchParams;

  const context =
    await getCurrentCentreContext();

  const search =
    query.q?.trim() ?? "";

  const pageParam = Number.parseInt(
    query.page ?? "1",
    10,
  );

  const page =
    Number.isFinite(pageParam) &&
    pageParam > 0
      ? pageParam
      : 1;

  const formation =
    await getFormationAvecModules(
      formationId,
    );

  if (!formation) {
    throw new Error(
      "Formation introuvable.",
    );
  }

  const result =
    await getModulesFormation({
      formationId,
      search,
      page,
    });

  return (
    <ModulesClient
      formation={formation}
      modules={result.modules}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      search={search}
      currentRole={
        context.role as Role | null
      }
      isSuperAdmin={
        context.roleSysteme ===
        "SUPER_ADMIN"
      }
    />
  );
}