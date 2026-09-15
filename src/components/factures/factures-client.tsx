"use client";

import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  Search,
  Trash2,
  Wallet,
  XCircle,
} from "lucide-react";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

import {
  deleteFacture,
} from "@/actions/facture.actions";

type Facture = any;

type Props = {
  factures: Facture[];
  devise?: string;
};

/* =========================================================
   LIBELLÉS DES STATUTS
========================================================= */

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon",
  EMISE: "Émise",
  PARTIELLEMENT_PAYEE: "Partiellement payée",
  PAYEE: "Payée",
  EN_RETARD: "En retard",
  ANNULEE: "Annulée",
};

/* =========================================================
   FORMATAGE MONÉTAIRE
========================================================= */

function formatMoney(value: unknown) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/* =========================================================
   FORMATAGE DATE
========================================================= */

function formatDate(value: unknown) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("fr-FR").format(
    new Date(value as string),
  );
}

/* =========================================================
   BADGE STATUT
========================================================= */

function StatusBadge({
  statut,
}: {
  statut: string;
}) {
  const config: Record<
    string,
    {
      className: string;
      icon: React.ReactNode;
    }
  > = {
    BROUILLON: {
      className: "badge badge-ghost gap-1",
      icon: <FileText size={13} />,
    },

    EMISE: {
      className: "badge badge-info gap-1",
      icon: <FileText size={13} />,
    },

    PARTIELLEMENT_PAYEE: {
      className: "badge badge-warning gap-1",
      icon: <Clock3 size={13} />,
    },

    PAYEE: {
      className: "badge badge-success gap-1",
      icon: <CheckCircle2 size={13} />,
    },

    EN_RETARD: {
      className: "badge badge-error gap-1",
      icon: <AlertCircle size={13} />,
    },

    ANNULEE: {
      className: "badge badge-error gap-1",
      icon: <XCircle size={13} />,
    },
  };

  const current =
    config[statut] ||
    config.BROUILLON;

  return (
    <span className={current.className}>
      {current.icon}

      {statutLabels[statut] || statut}
    </span>
  );
}

/* =========================================================
   CARTE STATISTIQUE
========================================================= */

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-300">
      <div className="card-body p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-60">
              {title}
            </p>

            <p className="text-2xl font-bold mt-1">
              {value}
            </p>

            <p className="text-xs opacity-50 mt-1">
              {description}
            </p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   COMPOSANT PRINCIPAL
========================================================= */

export default function FacturesClient({
  factures,
  devise = "USD",
}: Props) {
  const router = useRouter();

  const [
    isDeleting,
    startDelete,
  ] = useTransition();

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statutFilter,
    setStatutFilter,
  ] = useState("TOUS");

  /* =======================================================
     DEVise sécurisée
  ======================================================= */

  const deviseAffichee =
    devise?.trim() || "USD";

  /* =======================================================
     FILTRAGE
  ======================================================= */

  const filteredFactures = useMemo(() => {
    const term =
      search
        .trim()
        .toLowerCase();

    return factures.filter(
      (facture) => {
        const apprenant =
          facture.inscription
            ?.apprenant;

        const nom =
          `${apprenant?.nom || ""} ${
            apprenant?.prenom || ""
          }`.toLowerCase();

        const matchesSearch =
          !term ||
          facture.numero
            ?.toLowerCase()
            .includes(term) ||
          nom.includes(term);

        const matchesStatus =
          statutFilter === "TOUS" ||
          facture.statut ===
            statutFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      },
    );
  }, [
    factures,
    search,
    statutFilter,
  ]);

  /* =======================================================
     STATISTIQUES
  ======================================================= */

  const stats = useMemo(() => {
    let total = 0;
    let paye = 0;
    let du = 0;

    for (const facture of factures) {
      total += Number(
        facture.total || 0,
      );

      paye += Number(
        facture.montantPaye || 0,
      );

      du += Number(
        facture.montantDu || 0,
      );
    }

    return {
      total,
      paye,
      du,
    };
  }, [factures]);

  /* =======================================================
     SUPPRESSION FACTURE
  ======================================================= */

  const handleDelete = (
    id: string,
  ) => {
    startDelete(
      async () => {
        const confirmation =
          await Swal.fire({
            icon: "warning",
            title:
              "Supprimer cette facture ?",
            text:
              "Cette opération est irréversible.",
            showCancelButton: true,
            confirmButtonText:
              "Oui, supprimer",
            cancelButtonText:
              "Annuler",
            confirmButtonColor:
              "#dc2626",
            cancelButtonColor:
              "#64748b",
            reverseButtons: true,
          });

        if (
          !confirmation.isConfirmed
        ) {
          return;
        }

        try {
          await deleteFacture(id);

          await Swal.fire({
            icon: "success",
            title:
              "Facture supprimée",
            text:
              "La facture a été supprimée avec succès.",
            confirmButtonText:
              "OK",
          });

          router.refresh();
        } catch (error) {
          await Swal.fire({
            icon: "error",
            title:
              "Suppression impossible",
            text:
              error instanceof Error
                ? error.message
                : "Une erreur est survenue.",
            confirmButtonText:
              "Fermer",
          });
        }
      },
    );
  };

  return (
    <div className="space-y-6">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div>
          <div className="flex items-center gap-2">

            <FileText
              className="text-primary"
              size={28}
            />

            <h1 className="text-2xl md:text-3xl font-bold">
              Factures
            </h1>

          </div>

          <p className="text-sm opacity-60 mt-1">
            Gestion des factures,
            paiements et échéanciers.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary gap-2"
          onClick={() =>
            router.push(
              "/factures/nouveau",
            )
          }
        >
          <Plus size={18} />

          Nouvelle facture
        </button>

      </div>

      {/* ===================================================
          STATISTIQUES
      =================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

        <StatCard
          title="Total facturé"
          value={`${formatMoney(
            stats.total,
          )} ${deviseAffichee}`}
          description={`${factures.length} facture(s)`}
          icon={
            <FileText size={23} />
          }
        />

        <StatCard
          title="Total encaissé"
          value={`${formatMoney(
            stats.paye,
          )} ${deviseAffichee}`}
          description="Paiements effectués"
          icon={
            <Wallet size={23} />
          }
        />

        <StatCard
          title="Reste à recouvrer"
          value={`${formatMoney(
            stats.du,
          )} ${deviseAffichee}`}
          description="Montants encore dus"
          icon={
            <Clock3 size={23} />
          }
        />

      </div>

      {/* ===================================================
          FILTRES
      =================================================== */}

      <div className="card bg-base-100 border border-base-300 shadow-sm">

        <div className="card-body p-4">

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-3">

            <label className="input input-bordered flex items-center gap-2 w-full">

              <Search
                size={18}
                className="opacity-50"
              />

              <input
                type="text"
                placeholder="Rechercher par numéro ou apprenant..."
                className="grow"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value,
                  )
                }
              />

            </label>

            <select
              className="select select-bordered w-full"
              value={statutFilter}
              onChange={(e) =>
                setStatutFilter(
                  e.target.value,
                )
              }
            >

              <option value="TOUS">
                Tous les statuts
              </option>

              <option value="BROUILLON">
                Brouillon
              </option>

              <option value="EMISE">
                Émise
              </option>

              <option value="PARTIELLEMENT_PAYEE">
                Partiellement payée
              </option>

              <option value="PAYEE">
                Payée
              </option>

              <option value="EN_RETARD">
                En retard
              </option>

              <option value="ANNULEE">
                Annulée
              </option>

            </select>

          </div>

        </div>

      </div>

      {/* ===================================================
          TABLE DESKTOP
      =================================================== */}

      <div className="hidden md:block overflow-x-auto rounded-2xl border border-base-300 bg-base-100 shadow-sm">

        <table className="table table-zebra">

          <thead>

            <tr>
              <th>Facture</th>
              <th>Apprenant</th>
              <th>Formation</th>
              <th>Émission</th>
              <th>Total</th>
              <th>Payé</th>
              <th>Dû</th>
              <th>Statut</th>
              <th className="text-right">
                Actions
              </th>
            </tr>

          </thead>

          <tbody>

            {filteredFactures.length === 0 ? (

              <tr>

                <td
                  colSpan={9}
                  className="text-center py-16"
                >

                  <div className="flex flex-col items-center gap-3 opacity-60">

                    <FileText
                      size={42}
                    />

                    <p className="font-semibold">
                      Aucune facture
                    </p>

                    <p className="text-sm">
                      Aucun résultat ne
                      correspond à vos
                      critères.
                    </p>

                  </div>

                </td>

              </tr>

            ) : (

              filteredFactures.map(
                (facture) => {

                  const apprenant =
                    facture
                      .inscription
                      ?.apprenant;

                  const formation =
                    facture
                      .inscription
                      ?.session
                      ?.formation;

                  return (

                    <tr
                      key={
                        facture.id
                      }
                    >

                      <td>

                        <div className="font-bold">
                          {
                            facture.numero
                          }
                        </div>

                        <div className="text-xs opacity-50">
                          {
                            facture
                              .echeances
                              ?.length ||
                            0
                          } échéance(s)
                        </div>

                      </td>

                      <td>

                        <div className="font-medium">

                          {
                            apprenant
                              ?.nom
                          }{" "}

                          {
                            apprenant
                              ?.prenom
                          }

                        </div>

                        <div className="text-xs opacity-50">

                          {
                            facture
                              .inscription
                              ?.numero
                          }

                        </div>

                      </td>

                      <td>

                        {
                          formation
                            ?.nom ||
                          "—"
                        }

                      </td>

                      <td>

                        {formatDate(
                          facture.dateEmission,
                        )}

                      </td>

                      <td className="font-semibold">

                        {formatMoney(
                          facture.total,
                        )}{" "}

                        {deviseAffichee}

                      </td>

                      <td className="text-success font-medium">

                        {formatMoney(
                          facture.montantPaye,
                        )}{" "}

                        {deviseAffichee}

                      </td>

                      <td className="text-warning font-medium">

                        {formatMoney(
                          facture.montantDu,
                        )}{" "}

                        {deviseAffichee}

                      </td>

                      <td>

                        <StatusBadge
                          statut={
                            facture.statut
                          }
                        />

                      </td>

                      <td>

                        <div className="flex justify-end gap-1">

                          <button
                            type="button"
                            className="btn btn-sm btn-ghost gap-1"
                            onClick={() =>
                              router.push(
                                `/factures/${facture.id}`,
                              )
                            }
                          >

                            Voir

                            <ArrowRight
                              size={15}
                            />

                          </button>

                          {facture.statut !==
                            "ANNULEE" && (

                            <button
                              type="button"
                              className="btn btn-sm btn-ghost text-error"
                              disabled={
                                isDeleting
                              }
                              onClick={() =>
                                handleDelete(
                                  facture.id,
                                )
                              }
                            >

                              <Trash2
                                size={16}
                              />

                            </button>

                          )}

                        </div>

                      </td>

                    </tr>

                  );
                },
              )

            )}

          </tbody>

        </table>

      </div>

      {/* ===================================================
          MOBILE
      =================================================== */}

      <div className="md:hidden space-y-3">

        {filteredFactures.length === 0 ? (

          <div className="card bg-base-100 border border-base-300">

            <div className="card-body items-center text-center py-12">

              <FileText
                size={42}
                className="opacity-40"
              />

              <p className="font-semibold">
                Aucune facture
              </p>

            </div>

          </div>

        ) : (

          filteredFactures.map(
            (facture) => {

              const apprenant =
                facture.inscription
                  ?.apprenant;

              return (

                <div
                  key={facture.id}
                  className="card bg-base-100 border border-base-300 shadow-sm"
                >

                  <div className="card-body p-4">

                    <div className="flex justify-between gap-3">

                      <div>

                        <p className="font-bold">
                          {
                            facture.numero
                          }
                        </p>

                        <p className="text-sm opacity-60">

                          {
                            apprenant
                              ?.nom
                          }{" "}

                          {
                            apprenant
                              ?.prenom
                          }

                        </p>

                      </div>

                      <StatusBadge
                        statut={
                          facture.statut
                        }
                      />

                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">

                      <div>

                        <p className="text-xs opacity-50">
                          Total
                        </p>

                        <p className="font-semibold">

                          {formatMoney(
                            facture.total,
                          )}{" "}

                          {deviseAffichee}

                        </p>

                      </div>

                      <div>

                        <p className="text-xs opacity-50">
                          Dû
                        </p>

                        <p className="font-semibold text-warning">

                          {formatMoney(
                            facture.montantDu,
                          )}{" "}

                          {deviseAffichee}

                        </p>

                      </div>

                      <div>

                        <p className="text-xs opacity-50">
                          Émission
                        </p>

                        <p className="text-sm">

                          {formatDate(
                            facture.dateEmission,
                          )}

                        </p>

                      </div>

                      <div>

                        <p className="text-xs opacity-50">
                          Échéances
                        </p>

                        <p className="text-sm">

                          {
                            facture
                              .echeances
                              ?.length ||
                            0
                          }

                        </p>

                      </div>

                    </div>

                    <div className="card-actions justify-end mt-2">

                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() =>
                          router.push(
                            `/factures/${facture.id}`,
                          )
                        }
                      >

                        Voir la facture

                        <ArrowRight
                          size={15}
                        />

                      </button>

                    </div>

                  </div>

                </div>

              );
            },
          )

        )}

      </div>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <div className="text-sm opacity-50 flex items-center gap-2">

        <CalendarDays
          size={15}
        />

        {filteredFactures.length} facture(s)
        affichée(s)

      </div>

    </div>
  );
}