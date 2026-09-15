"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Swal from "sweetalert2";

import {
  deleteInscription,
} from "@/actions/inscription.actions";

import InscriptionForm from "./inscription-form";

import {
  Eye,
  Pencil,
  Printer,
  Trash2,
} from "lucide-react";

type Props = {
  inscriptions: any[];
  apprenants: any[];
  sessions: any[];
};

const statutLabels: Record<
  string,
  string
> = {
  BROUILLON: "Brouillon",
  EN_ATTENTE: "En attente",
  CONFIRMEE: "Confirmée",
  ACTIVE: "Active",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
  SUSPENDUE: "Suspendue",
};

const statutClasses: Record<
  string,
  string
> = {
  BROUILLON:
    "bg-gray-100 text-gray-700",

  EN_ATTENTE:
    "bg-yellow-100 text-yellow-700",

  CONFIRMEE:
    "bg-blue-100 text-blue-700",

  ACTIVE:
    "bg-green-100 text-green-700",

  TERMINEE:
    "bg-purple-100 text-purple-700",

  ANNULEE:
    "bg-red-100 text-red-700",

  SUSPENDUE:
    "bg-orange-100 text-orange-700",
};

const financementLabels: Record<
  string,
  string
> = {
  AUTO_FINANCEMENT:
    "Auto-financement",

  ENTREPRISE:
    "Entreprise",

  ETAT:
    "État",

  PARTENAIRE:
    "Partenaire",

  BOURSE:
    "Bourse",

  AUTRE:
    "Autre",
};

export default function InscriptionsClient({
  inscriptions,
  apprenants,
  sessions,
}: Props) {
  const router = useRouter();

  const [showForm, setShowForm] =
    useState(false);

  const [
    editingInscription,
    setEditingInscription,
  ] = useState<any>(null);

  const [search, setSearch] =
    useState("");

  const [
    statutFilter,
    setStatutFilter,
  ] = useState("TOUS");

  /**
   * =========================================================
   * FILTRAGE
   * =========================================================
   */
  const filteredInscriptions =
    useMemo(() => {
      const terme =
        search.trim().toLowerCase();

      return inscriptions.filter(
        (inscription) => {
          const apprenant =
            inscription.apprenant;

          const session =
            inscription.session;

          const texte = [
            inscription.numero,

            apprenant?.nom,
            apprenant?.prenom,
            apprenant?.numero,

            session?.code,
            session?.nom,

            session?.formation?.nom,
            session?.formation?.code,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchSearch =
            !terme ||
            texte.includes(terme);

          const matchStatut =
            statutFilter === "TOUS" ||
            inscription.statut ===
              statutFilter;

          return (
            matchSearch &&
            matchStatut
          );
        },
      );
    }, [
      inscriptions,
      search,
      statutFilter,
    ]);

  /**
   * =========================================================
   * NOUVELLE INSCRIPTION
   * =========================================================
   */
  function handleCreate() {
    setEditingInscription(null);
    setShowForm(true);
  }

  /**
   * =========================================================
   * MODIFIER
   * =========================================================
   */
  function handleEdit(
    inscription: any,
  ) {
    setEditingInscription(
      inscription,
    );

    setShowForm(true);
  }

  /**
   * =========================================================
   * VOIR LE DÉTAIL
   * =========================================================
   */
  function handleView(
    inscription: any,
  ) {
    router.push(
      `/inscriptions/${inscription.id}`,
    );
  }

  /**
   * =========================================================
   * IMPRIMER LE BADGE QR
   * =========================================================
   */
  function handlePrintBadge(
    inscription: any,
  ) {
    router.push(
      `/inscriptions/${inscription.id}/badge`,
    );
  }

  /**
   * =========================================================
   * SUPPRIMER
   * =========================================================
   */
  async function handleDelete(
    inscription: any,
  ) {
    const result =
      await Swal.fire({
        icon: "warning",

        title:
          "Supprimer l'inscription ?",

        html: `
          <div>
            Vous êtes sur le point de supprimer
            <strong>${inscription.numero}</strong>.
          </div>

          <div class="mt-2">
            Cette opération est irréversible.
          </div>
        `,

        showCancelButton: true,

        confirmButtonText:
          "Oui, supprimer",

        cancelButtonText:
          "Annuler",

        confirmButtonColor:
          "#dc2626",

        cancelButtonColor:
          "#6b7280",

        reverseButtons: true,
      });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await deleteInscription(
        inscription.id,
      );

      await Swal.fire({
        icon: "success",

        title: "Supprimée",

        text:
          "L'inscription a été supprimée.",

        timer: 1500,

        showConfirmButton: false,
      });

      window.location.reload();
    } catch (error: any) {
      await Swal.fire({
        icon: "error",

        title:
          "Suppression impossible",

        text:
          error?.message ||
          "Une erreur est survenue.",
      });
    }
  }

  /**
   * =========================================================
   * SUCCÈS FORMULAIRE
   * =========================================================
   */
  function handleSuccess() {
    window.location.reload();
  }

  /**
   * =========================================================
   * DATE
   * =========================================================
   */
  function formatDate(
    value:
      | string
      | Date
      | null
      | undefined,
  ) {
    if (!value) {
      return "—";
    }

    return new Date(
      value,
    ).toLocaleDateString(
      "fr-FR",
    );
  }

  /**
   * =========================================================
   * MONTANT
   * =========================================================
   */
  function formatMontant(
    value: any,
  ) {
    return Number(
      value || 0,
    ).toLocaleString(
      "fr-FR",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>
          <h1 className="text-2xl font-bold">
            Inscriptions
          </h1>

          <p className="text-sm text-gray-500">
            Gestion des inscriptions aux
            sessions de formation.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="cursor-pointer rounded-lg bg-primary px-5 py-2.5 font-medium text-white shadow-sm transition hover:opacity-90"
        >
          + Nouvelle inscription
        </button>

      </div>

      {/* =====================================================
          FORMULAIRE
      ====================================================== */}

      {showForm && (
        <div className="rounded-xl border bg-white p-5 shadow-sm">

          <div className="mb-5">

            <h2 className="text-xl font-semibold">
              {editingInscription
                ? "Modifier l'inscription"
                : "Nouvelle inscription"}
            </h2>

            {editingInscription && (
              <p className="mt-1 text-sm text-gray-500">
                Numéro :{" "}
                <strong>
                  {
                    editingInscription.numero
                  }
                </strong>
              </p>
            )}

          </div>

          <InscriptionForm
            inscription={
              editingInscription
            }
            apprenants={apprenants}
            sessions={sessions}
            onSuccess={handleSuccess}
            onCancel={() =>
              setShowForm(false)
            }
          />

        </div>
      )}

      {/* =====================================================
          FILTRES
      ====================================================== */}

      <div className="rounded-xl border bg-white p-4 shadow-sm">

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px]">

          {/* RECHERCHE */}

          <div>

            <label className="mb-2 block text-sm font-medium">
              Rechercher
            </label>

            <input
              type="search"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value,
                )
              }
              placeholder="Numéro, apprenant, session, formation..."
              className="w-full rounded-lg border px-4 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />

          </div>

          {/* STATUT */}

          <div>

            <label className="mb-2 block text-sm font-medium">
              Statut
            </label>

            <select
              value={statutFilter}
              onChange={(e) =>
                setStatutFilter(
                  e.target.value,
                )
              }
              className="w-full cursor-pointer rounded-lg border px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >

              <option value="TOUS">
                Tous les statuts
              </option>

              {Object.entries(
                statutLabels,
              ).map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                ),
              )}

            </select>

          </div>

        </div>

      </div>

      {/* =====================================================
          TABLE
      ====================================================== */}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">

        <div className="overflow-x-auto">

          <table className="min-w-full text-sm">

            <thead className="border-b bg-gray-50">

              <tr>

                <th className="px-4 py-3 text-left font-semibold">
                  N°
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Apprenant
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Formation
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Session
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Date
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Financement
                </th>

                <th className="px-4 py-3 text-right font-semibold">
                  Montant
                </th>

                <th className="px-4 py-3 text-center font-semibold">
                  Statut
                </th>

                <th className="px-4 py-3 text-right font-semibold">
                  Actions
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredInscriptions.length ===
              0 ? (

                <tr>

                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    Aucune inscription
                    trouvée.
                  </td>

                </tr>

              ) : (

                filteredInscriptions.map(
                  (inscription) => (

                    <tr
                      key={
                        inscription.id
                      }
                      className="border-b last:border-0 hover:bg-gray-50"
                    >

                      {/* NUMÉRO */}

                      <td className="px-4 py-3 font-medium">
                        {
                          inscription.numero
                        }
                      </td>

                      {/* APPRENANT */}

                      <td className="px-4 py-3">

                        <div className="font-medium">
                          {
                            inscription
                              .apprenant
                              ?.nom
                          }{" "}
                          {
                            inscription
                              .apprenant
                              ?.prenom
                          }
                        </div>

                        {inscription
                          .apprenant
                          ?.numero && (

                          <div className="text-xs text-gray-500">
                            {
                              inscription
                                .apprenant
                                .numero
                            }
                          </div>

                        )}

                      </td>

                      {/* FORMATION */}

                      <td className="px-4 py-3">
                        {
                          inscription
                            .session
                            ?.formation
                            ?.nom
                        }
                      </td>

                      {/* SESSION */}

                      <td className="px-4 py-3">
                        {
                          inscription
                            .session
                            ?.nom ||
                          inscription
                            .session
                            ?.code
                        }
                      </td>

                      {/* DATE */}

                      <td className="px-4 py-3">
                        {formatDate(
                          inscription.dateInscription,
                        )}
                      </td>

                      {/* FINANCEMENT */}

                      <td className="px-4 py-3">
                        {
                          financementLabels[
                            inscription
                              .typeFinancement
                          ] ||
                          inscription
                            .typeFinancement
                        }
                      </td>

                      {/* MONTANT */}

                      <td className="px-4 py-3 text-right font-medium">
                        {formatMontant(
                          inscription.montantConvenu,
                        )}
                      </td>

                      {/* STATUT */}

                      <td className="px-4 py-3 text-center">

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            statutClasses[
                              inscription
                                .statut
                            ] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {
                            statutLabels[
                              inscription
                                .statut
                            ] ||
                            inscription.statut
                          }
                        </span>

                      </td>

                      {/* ACTIONS */}

                      <td className="px-4 py-3">

                        <div className="flex justify-end gap-2">

                          {/* VOIR */}

                          <button
                            type="button"
                            onClick={() =>
                              handleView(
                                inscription,
                              )
                            }
                            title="Voir le détail"
                            className="cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-gray-50"
                          >
                            <span className="flex items-center gap-1.5">
                              <Eye className="h-4 w-4" />
                              Voir
                            </span>
                          </button>

                          {/* MODIFIER */}

                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                inscription,
                              )
                            }
                            title="Modifier"
                            className="cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-gray-50"
                          >
                            <span className="flex items-center gap-1.5">
                              <Pencil className="h-4 w-4" />
                              Modifier
                            </span>
                          </button>

                          {/* BADGE QR */}

                          <button
                            type="button"
                            onClick={() =>
                              handlePrintBadge(
                                inscription,
                              )
                            }
                            title="Imprimer le badge QR"
                            className="cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                          >
                            <span className="flex items-center gap-1.5">
                              <Printer className="h-4 w-4" />
                              QR
                            </span>
                          </button>

                          {/* SUPPRIMER */}

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                inscription,
                              )
                            }
                            title="Supprimer"
                            className="cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
                          >
                            <span className="flex items-center gap-1.5">
                              <Trash2 className="h-4 w-4" />
                              Supprimer
                            </span>
                          </button>

                        </div>

                      </td>

                    </tr>

                  ),
                )

              )}

            </tbody>

          </table>

        </div>

        {/* FOOTER TABLE */}

        <div className="border-t bg-gray-50 px-4 py-3 text-sm text-gray-500">

          {filteredInscriptions.length}{" "}

          inscription
          {filteredInscriptions.length !==
          1
            ? "s"
            : ""}{" "}

          affichée
          {filteredInscriptions.length !==
          1
            ? "s"
            : ""}

        </div>

      </div>

    </div>
  );
}