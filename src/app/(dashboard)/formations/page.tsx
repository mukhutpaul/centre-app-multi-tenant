
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

  const params =
    await searchParams;

  /**
   * ----------------------------------------------------------
   * CONTEXTE UTILISATEUR
   * ----------------------------------------------------------
   */

  const context =
    await getCurrentCentreContext();

  /**
   * ----------------------------------------------------------
   * RECHERCHE
   * ----------------------------------------------------------
   */

  const search =
    params.q?.trim() ?? "";

  /**
   * ----------------------------------------------------------
   * STATUT
   * ----------------------------------------------------------
   */

  const statut =
    params.statut &&
    Object.values(
      StatutFormation
    ).includes(
      params.statut as StatutFormation
    )
      ? (
          params.statut as StatutFormation
        )
      : "TOUS";

  /**
   * ----------------------------------------------------------
   * TYPE
   * ----------------------------------------------------------
   */

  const type =
    params.type &&
    Object.values(
      TypeFormation
    ).includes(
      params.type as TypeFormation
    )
      ? (
          params.type as TypeFormation
        )
      : "TOUS";

  /**
   * ----------------------------------------------------------
   * PAGE
   * ----------------------------------------------------------
   */

  const pageParam =
    Number.parseInt(
      params.page ?? "1",
      10
    );

  const page =
    Number.isFinite(
      pageParam
    ) && pageParam > 0
      ? pageParam
      : 1;

  /**
   * ----------------------------------------------------------
   * RÉCUPÉRATION DES FORMATIONS
   * ----------------------------------------------------------
   */

  const result =
    await getFormations({
      search,
      statut,
      type,
      page,
    });

  /**
   * ----------------------------------------------------------
   * RENDU
   * ----------------------------------------------------------
   */

  return (
    <FormationsClient
      formations={
        result.formations
      }
      total={
        result.total
      }
      page={
        result.page
      }
      totalPages={
        result.totalPages
      }
      search={
        search
      }
      statut={
        statut
      }
      type={
        type
      }
      currentRole={
        context.role
      }
      isSuperAdmin={
        context.roleSysteme ===
        "SUPER_ADMIN"
      }
    />
  );
}
