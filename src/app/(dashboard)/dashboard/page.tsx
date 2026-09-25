import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";

import { getDashboardData } from "@/actions/dashboard-actions";
import { StatCard } from "@/components/dashboard/stat-card";

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateCourte(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(date)
    .replace(".", "");
}

function formatPeriode(value: string) {
  return value
    .replace(".", "")
    .replace(/^./, (char) => char.toUpperCase());
}

function getActivityIcon(type: string) {
  switch (type) {
    case "INSCRIPTION":
      return GraduationCap;

    case "SESSION":
      return CalendarDays;

    case "EVALUATION":
      return BookOpen;

    default:
      return Users;
  }
}

function getActivityStyle(type: string) {
  switch (type) {
    case "INSCRIPTION":
      return "bg-blue-50 text-blue-600";

    case "SESSION":
      return "bg-emerald-50 text-emerald-600";

    case "EVALUATION":
      return "bg-violet-50 text-violet-600";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getRelativeTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  const now = new Date();
  const difference = now.getTime() - date.getTime();

  const minutes = Math.floor(difference / 60000);
  const hours = Math.floor(difference / 3600000);
  const days = Math.floor(difference / 86400000);

  if (difference < 60000) {
    return "À l'instant";
  }

  if (minutes < 60) {
    return `Il y a ${minutes} min`;
  }

  if (hours < 24) {
    return `Il y a ${hours} h`;
  }

  if (days === 1) {
    return "Hier";
  }

  if (days < 30) {
    return `Il y a ${days} jours`;
  }

  return formatDateCourte(date);
}

export default async function DashboardPage() {
  const result = await getDashboardData();

  if (!result.success || !result.data) {
    return (
      <div className="mx-auto max-w-[1600px]">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <RefreshCw className="h-5 w-5" />
            </div>

            <div>
              <h1 className="font-semibold text-red-900">
                Impossible de charger le tableau de bord
              </h1>

              <p className="mt-1 text-sm text-red-700">
                {result.message ||
                  "Une erreur est survenue lors du chargement des données."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { centre, statistiques, evolutionInscriptions, sessionsAVenir, activitesRecentes } =
    result.data;

  const maxInscriptions = Math.max(
    ...evolutionInscriptions.map((item) => item.inscriptions),
    1,
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* =========================================================
          EN-TÊTE
      ========================================================= */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="breadcrumbs mb-2 text-sm text-slate-500">
            <ul>
              <li>Administration</li>
              <li>Tableau de bord</li>
            </ul>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Tableau de bord
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Vue générale de l&apos;activité de votre centre de formation.
          </p>
        </div>

        {/* Centre courant */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <BookOpen className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Centre courant
            </p>

            <p className="truncate text-sm font-semibold text-slate-800">
              {centre.nom}
            </p>

            <p className="text-xs text-slate-400">
              Code : {centre.code}
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================
          STATISTIQUES
      ========================================================= */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Apprenants"
          value={statistiques.apprenants.toLocaleString("fr-FR")}
          description="Apprenants inscrits dans ce centre"
          icon={GraduationCap}
          color="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Formations"
          value={statistiques.formations.toLocaleString("fr-FR")}
          description="Formations proposées"
          icon={BookOpen}
          color="bg-indigo-50 text-indigo-600"
        />

        <StatCard
          title="Sessions"
          value={statistiques.sessions.toLocaleString("fr-FR")}
          description={`${statistiques.sessionsEnCours} session${
            statistiques.sessionsEnCours > 1 ? "s" : ""
          } en cours`}
          icon={CalendarDays}
          color="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="Taux de présence"
          value={
            statistiques.tauxPresence === null
              ? "—"
              : `${statistiques.tauxPresence.toLocaleString("fr-FR", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })} %`
          }
          description="Présences et retards enregistrés"
          icon={TrendingUp}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      {/* =========================================================
          GRAPHIQUE + SESSIONS
      ========================================================= */}

      <div className="grid gap-6 xl:grid-cols-3">
        {/* ÉVOLUTION */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Évolution des inscriptions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Inscriptions enregistrées au cours des six derniers mois.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
              <TrendingUp className="h-4 w-4" />
              6 derniers mois
            </div>
          </div>

          <div className="mt-8">
            {evolutionInscriptions.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50">
                <div className="text-center">
                  <TrendingUp className="mx-auto h-8 w-8 text-slate-300" />

                  <p className="mt-3 text-sm font-medium text-slate-500">
                    Aucune donnée disponible
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Les inscriptions apparaîtront ici.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-64 items-end gap-3 rounded-xl bg-slate-50 px-4 pb-5 pt-6 sm:gap-5">
                {evolutionInscriptions.map((item) => {
                  const height =
                    item.inscriptions === 0
                      ? 4
                      : Math.max(
                          (item.inscriptions / maxInscriptions) * 100,
                          8,
                        );

                  return (
                    <div
                      key={item.periode}
                      className="flex h-full flex-1 flex-col justify-end"
                    >
                      <div className="mb-2 text-center">
                        <span className="text-xs font-semibold text-slate-600">
                          {item.inscriptions}
                        </span>
                      </div>

                      <div className="flex h-[180px] items-end justify-center">
                        <div
                          className="w-full max-w-12 rounded-t-lg bg-blue-500 transition-all"
                          style={{
                            height: `${height}%`,
                          }}
                          title={`${item.inscriptions} inscription${
                            item.inscriptions > 1 ? "s" : ""
                          }`}
                        />
                      </div>

                      <p className="mt-3 truncate text-center text-[11px] font-medium text-slate-500">
                        {formatPeriode(item.periode)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SESSIONS À VENIR */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Sessions à venir
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Prochaines sessions programmées.
                </p>
              </div>

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CalendarDays className="h-4 w-4" />
              </div>
            </div>
          </div>

          {sessionsAVenir.length === 0 ? (
            <div className="flex min-h-52 items-center justify-center rounded-xl bg-slate-50 p-5 text-center">
              <div>
                <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />

                <p className="mt-3 text-sm font-medium text-slate-500">
                  Aucune session à venir
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Les prochaines sessions apparaîtront ici.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sessionsAVenir.map((session) => (
                <div
                  key={session.id}
                  className="flex gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <CalendarDays className="h-[18px] w-[18px]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {session.formation}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {session.code}
                    </p>

                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-400">
                      <span>{formatDate(session.date)}</span>

                      <span>·</span>

                      <span>
                        {session.participants} apprenant
                        {session.participants > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================
          ACTIVITÉS RÉCENTES
      ========================================================= */}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-semibold text-slate-900">
              Activités récentes
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Dernières opérations enregistrées dans votre centre.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
            <RefreshCw className="h-3.5 w-3.5" />
            Données en temps réel
          </div>
        </div>

        {activitesRecentes.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center p-6 text-center">
            <div>
              <Users className="mx-auto h-8 w-8 text-slate-300" />

              <p className="mt-3 text-sm font-medium text-slate-500">
                Aucune activité récente
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Les nouvelles opérations apparaîtront ici.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activitesRecentes.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const iconStyle = getActivityStyle(activity.type);

              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50 sm:px-6"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconStyle}`}
                  >
                    <Icon className="h-[17px] w-[17px]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {activity.message}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {getRelativeTime(activity.date)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================
          INFORMATIONS DU CENTRE
      ========================================================= */}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Centre actif
              </p>

              <p className="font-semibold text-slate-800">
                {centre.nom}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs text-slate-400">
              Dernière actualisation
            </p>

            <p className="mt-1 text-sm font-medium text-slate-600">
              {formatDate(new Date())}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}