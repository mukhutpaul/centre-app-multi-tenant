"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  AlertCircle,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from "lucide-react";

import {
  getResultats,
} from "@/actions/resultat-actions";

type ResultatItem = {
  id: string;

  apprenant: {
    id: string;
    nom: string;
    prenom: string;
    numero: string | null;
  };

  formation: {
    id: string;
    code: string;
    nom: string;
  };

  session: {
    id: string;
    code: string;
    nom: string;
    dateDebut: Date | string | null;
    dateFin: Date | string | null;
  };

  moyenneGenerale: number;

  tauxPresence: number | null;

  nombreModules: number;

  modulesReussis: number;

  modulesEchoues: number;

  resultat: string;

  resultatLabel: string;

  mention: string;

  certification: {
    id: string;
    numero: string;
    statut: string;
  } | null;

  dateCalcul: Date | string | null;
};

function toDate(
  value:
    | Date
    | string
    | null
    | undefined,
) {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

function formatDate(
  value:
    | Date
    | string
    | null
    | undefined,
) {
  const date = toDate(value);

  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

function formatPercentage(
  value: number,
) {
  return `${value.toLocaleString(
    "fr-FR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}%`;
}

function getResultatClasses(
  resultat: string,
) {
  switch (resultat) {
    case "REUSSITE":
      return {
        badge:
          "bg-emerald-50 text-emerald-700 ring-emerald-200",
        icon:
          "text-emerald-600",
      };

    case "REUSSITE_SOUS_CONDITION":
      return {
        badge:
          "bg-amber-50 text-amber-700 ring-amber-200",
        icon:
          "text-amber-600",
      };

    case "ECHEC":
      return {
        badge:
          "bg-red-50 text-red-700 ring-red-200",
        icon:
          "text-red-600",
      };

    default:
      return {
        badge:
          "bg-slate-100 text-slate-600 ring-slate-200",
        icon:
          "text-slate-500",
      };
  }
}

function ResultatBadge({
  resultat,
  label,
}: {
  resultat: string;
  label: string;
}) {
  const classes =
    getResultatClasses(
      resultat,
    );

  const Icon =
    resultat === "REUSSITE"
      ? CheckCircle2
      : resultat ===
          "ECHEC"
        ? XCircle
        : AlertCircle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${classes.badge}`}
    >
      <Icon
        className={`h-3.5 w-3.5 ${classes.icon}`}
      />

      {label}
    </span>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {subtitle}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
    </div>
  );
}

export default function ResultatsPage() {
  const [
    resultats,
    setResultats,
  ] = useState<ResultatItem[]>(
    [],
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    recherche,
    setRecherche,
  ] = useState("");

  const [
    filtreResultat,
    setFiltreResultat,
  ] = useState("TOUS");

  const chargerResultats =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const response =
          await getResultats();

        if (!response.success) {
          setError(
            response.message ??
              "Impossible de charger les résultats.",
          );

          setResultats([]);
          return;
        }

        setResultats(
          (response.data ??
            []) as ResultatItem[],
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue.",
        );

        setResultats([]);
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    chargerResultats();
  }, [chargerResultats]);

  const resultatsFiltres =
    useMemo(() => {
      const terme =
        recherche
          .trim()
          .toLowerCase();

      return resultats.filter(
        (item) => {
          const correspondRecherche =
            !terme ||
            item.apprenant.nom
              .toLowerCase()
              .includes(terme) ||
            item.apprenant.prenom
              .toLowerCase()
              .includes(terme) ||
            (
              item.apprenant
                .numero ?? ""
            )
              .toLowerCase()
              .includes(terme) ||
            item.formation.nom
              .toLowerCase()
              .includes(terme) ||
            item.formation.code
              .toLowerCase()
              .includes(terme) ||
            item.session.nom
              .toLowerCase()
              .includes(terme) ||
            item.session.code
              .toLowerCase()
              .includes(terme);

          const correspondResultat =
            filtreResultat ===
              "TOUS" ||
            item.resultat ===
              filtreResultat;

          return (
            correspondRecherche &&
            correspondResultat
          );
        },
      );
    }, [
      resultats,
      recherche,
      filtreResultat,
    ]);

  const statistiques =
    useMemo(() => {
      const total =
        resultats.length;

      const admis =
        resultats.filter(
          (item) =>
            item.resultat ===
            "REUSSITE",
        ).length;

      const sousCondition =
        resultats.filter(
          (item) =>
            item.resultat ===
            "REUSSITE_SOUS_CONDITION",
        ).length;

      const echecs =
        resultats.filter(
          (item) =>
            item.resultat ===
            "ECHEC",
        ).length;

      const moyenne =
        total > 0
          ? resultats.reduce(
              (
                totalMoyenne,
                item,
              ) =>
                totalMoyenne +
                item.moyenneGenerale,
              0,
            ) / total
          : 0;

      return {
        total,
        admis,
        sousCondition,
        echecs,
        moyenne,
      };
    }, [resultats]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">

        {/* HEADER */}
        <div className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
          <div className="relative p-6 sm:p-8">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200">
                  <BarChart3 className="h-3.5 w-3.5" />

                  Suivi académique
                </div>

                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Résultats
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Consultez les résultats de formation,
                  les moyennes générales, les modules validés
                  et accédez aux documents académiques.
                </p>
              </div>

              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* STATISTIQUES */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            title="Résultats"
            value={String(
              statistiques.total,
            )}
            subtitle="Résultats enregistrés"
            icon={ClipboardList}
          />

          <MetricCard
            title="Admis"
            value={String(
              statistiques.admis,
            )}
            subtitle="Résultat REUSSITE"
            icon={CheckCircle2}
          />

          <MetricCard
            title="Sous condition"
            value={String(
              statistiques.sousCondition,
            )}
            subtitle="Admis sous condition"
            icon={AlertCircle}
          />

          <MetricCard
            title="Échecs"
            value={String(
              statistiques.echecs,
            )}
            subtitle="Résultats en échec"
            icon={XCircle}
          />

          <MetricCard
            title="Moyenne"
            value={formatPercentage(
              statistiques.moyenne,
            )}
            subtitle="Moyenne générale"
            icon={BarChart3}
          />
        </div>

        {/* FILTRES */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={recherche}
                onChange={(event) =>
                  setRecherche(
                    event.target.value,
                  )
                }
                placeholder="Rechercher un apprenant, une formation, une session..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                {
                  value: "TOUS",
                  label: "Tous",
                },
                {
                  value: "REUSSITE",
                  label: "Admis",
                },
                {
                  value:
                    "REUSSITE_SOUS_CONDITION",
                  label: "Sous condition",
                },
                {
                  value: "ECHEC",
                  label: "Échec",
                },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() =>
                    setFiltreResultat(
                      filter.value,
                    )
                  }
                  className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    filtreResultat ===
                    filter.value
                      ? "bg-slate-950 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}

              <button
                type="button"
                onClick={
                  chargerResultats
                }
                disabled={loading}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loading
                      ? "animate-spin"
                      : ""
                  }`}
                />

                Actualiser
              </button>
            </div>
          </div>
        </div>

        {/* ERREUR */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>

              <div>
                <h2 className="font-semibold text-red-900">
                  Impossible de charger les résultats
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={
                    chargerResultats
                  }
                  className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Réessayer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TABLEAU */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Liste des résultats
                </h2>

                <p className="text-sm text-slate-500">
                  {resultatsFiltres.length} résultat
                  {resultatsFiltres.length > 1
                    ? "s"
                    : ""}{" "}
                  affiché
                  {resultatsFiltres.length > 1
                    ? "s"
                    : ""}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 text-xs text-slate-400">
                <Users className="h-4 w-4" />
                {resultats.length} au total
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin" />

                <p className="text-sm">
                  Chargement des résultats...
                </p>
              </div>
            </div>
          ) : resultatsFiltres.length ===
            0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <FileText className="h-7 w-7 text-slate-400" />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                Aucun résultat trouvé
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                Aucun résultat ne correspond aux critères
                de recherche sélectionnés.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Apprenant
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Formation
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Session
                    </th>

                    <th className="px-5 py-4 text-center font-semibold text-slate-600">
                      Moyenne
                    </th>

                    <th className="px-5 py-4 text-center font-semibold text-slate-600">
                      Modules
                    </th>

                    <th className="px-5 py-4 text-center font-semibold text-slate-600">
                      Résultat
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Mention
                    </th>

                    <th className="px-5 py-4 text-right font-semibold text-slate-600">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {resultatsFiltres.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        {/* APPRENANT */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700">
                              {item.apprenant.prenom
                                .charAt(0)
                                .toUpperCase()}
                              {item.apprenant.nom
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">
                                {
                                  item
                                    .apprenant
                                    .prenom
                                }{" "}
                                {
                                  item
                                    .apprenant
                                    .nom
                                }
                              </p>

                              <p className="text-xs text-slate-400">
                                {item.apprenant
                                  .numero ||
                                  "Sans numéro"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* FORMATION */}
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-2">
                            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                            <div>
                              <p className="font-medium text-slate-900">
                                {
                                  item
                                    .formation
                                    .nom
                                }
                              </p>

                              <p className="text-xs text-slate-400">
                                {
                                  item
                                    .formation
                                    .code
                                }
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* SESSION */}
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800">
                            {
                              item.session
                                .nom
                            }
                          </p>

                          <p className="text-xs text-slate-400">
                            {
                              item.session
                                .code
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatDate(
                              item.session
                                .dateDebut,
                            )}{" "}
                            —{" "}
                            {formatDate(
                              item.session
                                .dateFin,
                            )}
                          </p>
                        </td>

                        {/* MOYENNE */}
                        <td className="px-5 py-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-lg font-bold text-slate-900">
                              {
                                formatPercentage(
                                  item.moyenneGenerale,
                                )
                              }
                            </span>

                            <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-slate-900"
                                style={{
                                  width: `${Math.min(
                                    item.moyenneGenerale,
                                    100,
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* MODULES */}
                        <td className="px-5 py-4 text-center">
                          <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2">
                            <span className="font-bold text-emerald-600">
                              {
                                item
                                  .modulesReussis
                              }
                            </span>

                            <span className="text-slate-400">
                              /
                            </span>

                            <span className="font-semibold text-slate-700">
                              {
                                item
                                  .nombreModules
                              }
                            </span>

                            {item.modulesEchoues >
                              0 && (
                              <span className="ml-1 text-xs font-medium text-red-500">
                                (
                                {
                                  item
                                    .modulesEchoues
                                }{" "}
                                échec
                                {item.modulesEchoues >
                                1
                                  ? "s"
                                  : ""}
                                )
                              </span>
                            )}
                          </div>
                        </td>

                        {/* RESULTAT */}
                        <td className="px-5 py-4 text-center">
                          <ResultatBadge
                            resultat={
                              item.resultat
                            }
                            label={
                              item.resultatLabel
                            }
                          />
                        </td>

                        {/* MENTION */}
                        <td className="px-5 py-4">
                          <span className="font-semibold text-slate-700">
                            {item.mention ||
                              "-"}
                          </span>

                          {item.certification && (
                            <p className="mt-1 text-xs text-emerald-600">
                              Brevet préparé
                            </p>
                          )}
                        </td>

                        {/* ACTION */}
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/resultats/${item.id}`}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            Voir
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}