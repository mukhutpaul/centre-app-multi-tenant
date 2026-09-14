import { prisma } from "@/lib/prisma";
import { getCurrentCentreContext } from "@/lib/validations/centre-access";
import CalendrierClient from "./calendrier-client";

export default async function CalendrierPage() {
  /**
   * ============================================================
   * CONTEXTE DU CENTRE COURANT
   * ============================================================
   *
   * Le centre ne vient PAS de l'URL.
   * Il est déterminé par le système central d'accès.
   */
  const context = await getCurrentCentreContext();

  if (!context) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <h2 className="text-lg font-semibold">
            Contexte utilisateur introuvable
          </h2>

          <p className="mt-2">
            Impossible de récupérer le contexte de votre compte.
          </p>
        </div>
      </div>
    );
  }

  /**
   * ============================================================
   * CENTRE COURANT
   * ============================================================
   */
  const centreId = context.centreId;

  if (!centreId) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <h2 className="text-lg font-semibold">Aucun centre actif</h2>

          <p className="mt-2">
            Aucun centre de formation n'est actuellement associé à votre
            contexte utilisateur.
          </p>
        </div>
      </div>
    );
  }

  /**
   * ============================================================
   * CHARGEMENT DES DONNÉES DU CENTRE
   * ============================================================
   *
   * Toutes les données sont filtrées par centreId.
   * Cela garantit l'isolation entre les centres.
   */
  const [centre, sessions, salles, plannings] = await Promise.all([
    /**
     * CENTRE
     */
    prisma.centreFormation.findUnique({
      where: {
        id: centreId,
      },
    }),

    /**
     * SESSIONS
     */
    prisma.sessionFormation.findMany({
      where: {
        centreId,
      },

      include: {
        formation: true,
      },

      orderBy: {
        dateDebut: "asc",
      },
    }),

    /**
     * SALLES
     */
    prisma.salle.findMany({
      where: {
        centreId,
      },

      orderBy: {
        nom: "asc",
      },
    }),

    /**
     * PLANNINGS
     */
    prisma.planning.findMany({
      where: {
        session: {
          centreId,
        },
      },

      include: {
        session: {
          include: {
            formation: true,
          },
        },

        salle: true,
      },

      orderBy: {
        debut: "asc",
      },
    }),
  ]);

  /**
   * ============================================================
   * VÉRIFICATION DU CENTRE
   * ============================================================
   */
  if (!centre) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <h2 className="text-lg font-semibold">
            Centre de formation introuvable
          </h2>

          <p className="mt-2">
            Le centre associé à votre contexte n'existe plus ou n'est plus
            accessible.
          </p>
        </div>
      </div>
    );
  }

  /**
   * ============================================================
   * CALENDRIER
   * ============================================================
   */
  return (
    <CalendrierClient
      centre={centre}
      sessions={sessions.map((session) => ({
        ...session,
        dateDebut: session.dateDebut.toISOString(),
        dateFin: session.dateFin.toISOString(),
        ouvertureInscriptions:
          session.ouvertureInscriptions?.toISOString() ?? null,
        fermetureInscriptions:
          session.fermetureInscriptions?.toISOString() ?? null,
      }))}
      salles={salles}
      plannings={plannings.map((planning) => ({
        ...planning,
        debut: planning.debut.toISOString(),
        fin: planning.fin.toISOString(),
        creeLe: planning.creeLe.toISOString(),
        modifieLe: planning.modifieLe.toISOString(),
      }))}
    />
  );
}
