"use client";

import Link from "next/link";
import {
  Eye,
  Pencil,
  Printer,
  Receipt,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { deletePaiement } from "@/actions/paiement-actions";

type Paiement = {
  id: string;
  reference: string;
  type: string;
  montant: number;
  devise: string;
  mode: string;
  statut: string;
  datePaiement: string | null;
  referenceTransaction: string | null;
  notes: string | null;

  apprenant: {
    id: string;
    numero: string;
    nom: string;
    prenom: string;
  } | null;

  inscription: {
    id: string;
    numero: string;
    formation: {
      id: string;
      code: string;
      nom: string;
    };
  } | null;

  tarifFormation: {
    id: string;
    nom: string;
    description: string | null;
    montant: number;
    devise: string;
    actif: boolean;
  } | null;

  facture: {
    id: string;
    numero: string;
    total: number;
    montantPaye: number;
    montantDu: number;
    convention: {
      id: string;
      numero: string;
      organisationNom: string;
      montant: number;
      devise: string;
    } | null;
  } | null;

  echeance: {
    id: string;
    numero: string;
    dateEcheance: string;
    montant: number;
    montantPaye: number;
    montantDu: number;
    statut: string;
  } | null;
};

export default function PaiementsTable({
  paiements,
}: {
  paiements: Paiement[];
}) {
  const [isPending, startTransition] = useTransition();

  // ============================================================
  // SUPPRIMER
  // ============================================================

  function handleDelete(paiement: Paiement) {
    if (paiement.statut === "EFFECTUE") {
      toast.error("Un paiement effectué ne peut pas être supprimé.");
      return;
    }

    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer le paiement "${paiement.reference}" ?`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await deletePaiement(paiement.id);

        if (result && typeof result === "object" && "success" in result) {
          if (!result.success) {
            throw new Error(
              result.message || "Impossible de supprimer le paiement.",
            );
          }
        }

        toast.success(
          `Le paiement ${paiement.reference} a été supprimé avec succès.`,
        );

        window.location.reload();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de supprimer le paiement.",
        );
      }
    });
  }

  // ============================================================
  // IMPRIMER LE REÇU
  // ============================================================

  function handlePrint(paiementId: string) {
    const url = `/api/paiements/${paiementId}/recu`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ============================================================
  // AUCUN PAIEMENT
  // ============================================================

  if (!paiements.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
        <Wallet className="mx-auto h-10 w-10 text-slate-400" />

        <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
          Aucun paiement
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Aucun paiement ne correspond aux critères sélectionnés.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-left text-sm">
          {/* =====================================================
              HEADER
          ====================================================== */}

          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
            <tr>
              <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-200">
                Référence
              </th>

              <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-200">
                Type
              </th>

              <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-200">
                Objet
              </th>

              <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-200">
                Montant
              </th>

              <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-200">
                Mode
              </th>

              <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-200">
                Statut
              </th>

              <th className="px-5 py-4 text-right font-semibold text-slate-700 dark:text-slate-200">
                Actions
              </th>
            </tr>
          </thead>

          {/* =====================================================
              BODY
          ====================================================== */}

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paiements.map((paiement) => {
              const estEffectue = paiement.statut === "EFFECTUE";

              const estRegulier = paiement.type === "PAIEMENT_REGULIER";

              const convention = paiement.facture?.convention;

              return (
                <tr
                  key={paiement.id}
                  className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  {/* =================================================
                      RÉFÉRENCE
                  ================================================== */}

                  <td className="px-5 py-4">
                    <Link
                      href={`/paiements/${paiement.id}`}
                      className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {paiement.reference}
                    </Link>

                    {paiement.datePaiement && (
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(paiement.datePaiement)}
                      </p>
                    )}
                  </td>

                  {/* =================================================
                      TYPE
                  ================================================== */}

                  <td className="px-5 py-4">
                    <TypeBadge type={paiement.type} />
                  </td>

                  {/* =================================================
                      OBJET
                  ================================================== */}

                  <td className="px-5 py-4">
                    {estRegulier ? (
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {paiement.tarifFormation?.nom ??
                            "Frais non renseigné"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {paiement.apprenant
                            ? `${paiement.apprenant.nom} ${paiement.apprenant.prenom}`
                            : "Apprenant non renseigné"}
                        </p>

                        {paiement.inscription?.formation && (
                          <p className="mt-1 text-xs text-slate-400">
                            {paiement.inscription.formation.nom}
                          </p>
                        )}

                        {paiement.inscription?.numero && (
                          <p className="mt-1 text-xs text-slate-400">
                            Inscription : {paiement.inscription.numero}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          Convention {convention?.numero ?? "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {convention?.organisationNom ??
                            "Organisation non renseignée"}
                        </p>

                        {paiement.facture?.numero && (
                          <p className="mt-1 text-xs text-slate-400">
                            Facture {paiement.facture.numero}
                          </p>
                        )}

                        {paiement.echeance?.numero && (
                          <p className="mt-1 text-xs text-slate-400">
                            Échéance {paiement.echeance.numero}
                          </p>
                        )}
                      </div>
                    )}
                  </td>

                  {/* =================================================
                      MONTANT
                  ================================================== */}

                  <td className="px-5 py-4">
                    <div className="flex items-baseline">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {paiement.montant.toLocaleString("fr-FR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>

                      <span className="ml-1 text-xs font-medium text-slate-500">
                        {paiement.devise ||
                          (estRegulier
                            ? paiement.tarifFormation?.devise
                            : convention?.devise) ||
                          ""}
                      </span>
                    </div>
                  </td>

                  {/* =================================================
                      MODE
                  ================================================== */}

                  <td className="px-5 py-4">
                    <span className="text-slate-700 dark:text-slate-300">
                      {formatMode(paiement.mode)}
                    </span>
                  </td>

                  {/* =================================================
                      STATUT
                  ================================================== */}

                  <td className="px-5 py-4">
                    <StatusBadge status={paiement.statut} />
                  </td>

                  {/* =================================================
                      ACTIONS
                  ================================================== */}
                  {/* =================================================
    ACTIONS
================================================== */}

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {/* VOIR */}
                      <Link
                        href={`/paiements/${paiement.id}`}
                        className="cursor-pointer rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        title="Voir le paiement"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>

                      {/* MODIFIER */}
                      <Link
                        href={`/paiements/${paiement.id}/modifier`}
                        className="cursor-pointer rounded-lg border border-blue-200 p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 dark:border-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-950/40"
                        title="Modifier le paiement"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>

                      {/* IMPRIMER */}
                      <button
                        type="button"
                        onClick={() => handlePrint(paiement.id)}
                        className="cursor-pointer rounded-lg border border-emerald-200 p-2 text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                        title="Imprimer le reçu"
                      >
                        <Printer className="h-4 w-4" />
                      </button>

                      {/* SUPPRIMER */}
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(paiement)}
                        className="cursor-pointer rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
                        title="Supprimer le paiement"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   TYPE BADGE
============================================================ */

function TypeBadge({ type }: { type: string }) {
  if (type === "PAIEMENT_REGULIER") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        <UserRound className="h-3.5 w-3.5" />
        Régulier
      </span>
    );
  }

  if (type === "REGLEMENT_FACTURE_CONVENTION") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
        <Receipt className="h-3.5 w-3.5" />
        Convention
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {type}
    </span>
  );
}

/* ============================================================
   STATUT BADGE
============================================================ */

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    EFFECTUE:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",

    EN_ATTENTE:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",

    ECHEC: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",

    ANNULE: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",

    REMBOURSE:
      "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        styles[status] ??
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

/* ============================================================
   FORMAT STATUT
============================================================ */

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    EFFECTUE: "Effectué",
    EN_ATTENTE: "En attente",
    ECHEC: "Échec",
    ANNULE: "Annulé",
    REMBOURSE: "Remboursé",
  };

  return labels[status] ?? status;
}

/* ============================================================
   FORMAT MODE
============================================================ */

function formatMode(mode: string) {
  const labels: Record<string, string> = {
    ESPECES: "Espèces",
    VIREMENT: "Virement",
    MOBILE_MONEY: "Mobile Money",
    CARTE: "Carte",
    CHEQUE: "Chèque",
    AUTRE: "Autre",
  };

  return labels[mode] ?? mode;
}

/* ============================================================
   FORMAT DATE
============================================================ */

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
