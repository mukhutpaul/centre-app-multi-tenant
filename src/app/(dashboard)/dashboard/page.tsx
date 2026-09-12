import {
  Building2,
  CalendarDays,
  GraduationCap,
  TrendingUp,
  Users,
} from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
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
          Vue générale de l'activité de la formation professionnelle.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Apprenants"
          value="2 458"
          description="+12,5 % ce mois"
          icon={GraduationCap}
          color="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Centres"
          value="86"
          description="Centres actifs"
          icon={Building2}
          color="bg-indigo-50 text-indigo-600"
        />

        <StatCard
          title="Sessions"
          value="142"
          description="Sessions en cours"
          icon={CalendarDays}
          color="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="Taux de présence"
          value="91,4 %"
          description="+3,2 % ce mois"
          icon={TrendingUp}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Évolution des inscriptions
              </h2>
              <p className="text-sm text-slate-500">
                Suivi des inscriptions sur les six derniers mois
              </p>
            </div>

            <select className="select select-bordered select-sm">
              <option>6 derniers mois</option>
              <option>Cette année</option>
            </select>
          </div>

          <div className="mt-8 flex h-64 items-center justify-center rounded-xl bg-slate-50">
            <p className="text-sm text-slate-400">
              Graphique — nous connecterons les données réelles ici.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="font-semibold text-slate-900">
              Sessions à venir
            </h2>

            <p className="text-sm text-slate-500">
              Prochaines sessions programmées
            </p>
          </div>

          <div className="space-y-4">
            {[
              ["Développement Web", "12 septembre", "24 apprenants"],
              ["Gestion de projet", "15 septembre", "18 apprenants"],
              ["Comptabilité", "18 septembre", "31 apprenants"],
              ["Maintenance informatique", "22 septembre", "20 apprenants"],
            ].map(([formation, date, participants]) => (
              <div
                key={formation}
                className="flex gap-3 rounded-xl border border-slate-100 p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <CalendarDays size={18} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {formation}
                  </p>

                  <p className="text-xs text-slate-500">
                    {date} · {participants}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="font-semibold text-slate-900">
              Activités récentes
            </h2>

            <p className="text-sm text-slate-500">
              Dernières opérations effectuées sur la plateforme
            </p>
          </div>

          <button className="btn btn-ghost btn-sm">
            Voir tout
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {[
            "Nouvelle inscription enregistrée",
            "Session de développement Web créée",
            "Paiement reçu",
            "Évaluation de module publiée",
          ].map((activity, index) => (
            <div
              key={activity}
              className="flex items-center gap-4 px-5 py-4"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Users size={17} />
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">
                  {activity}
                </p>

                <p className="text-xs text-slate-400">
                  Il y a {index + 1} heure(s)
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
