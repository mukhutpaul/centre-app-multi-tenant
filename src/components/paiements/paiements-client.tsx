
"use client";

import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  Filter,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Search,
  Trash2,
  WalletCards,
  XCircle,
} from "lucide-react";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import Select from "react-select";
import Swal from "sweetalert2";
import { toast } from "sonner";

import { deletePaiement } from "@/actions/paiement-actions";

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

type PaiementData = {
  id: string;

  centreId: string;

  apprenantId: string | null;

  inscriptionId: string | null;

  factureId: string | null;

  echeanceId: string | null;

  reference: string;

  montant: string | number;

  mode:
    | "ESPECES"
    | "VIREMENT"
    | "MOBILE_MONEY"
    | "CARTE"
    | "CHEQUE"
    | "AUTRE";

  statut:
    | "EN_ATTENTE"
    | "EFFECTUE"
    | "ECHEC"
    | "ANNULE"
    | "REMBOURSE";

  datePaiement: string | Date | null;

  referenceTransaction: string | null;

  notes: string | null;

  apprenant: {
    id: string;
    prenom: string;
    nom: string;
  } | null;

  inscription: {
    id: string;
    numero: string;

    montantConvenu: string | number;

    statut: string;

    apprenant: {
      id: string;
      prenom: string;
      nom: string;
    } | null;

    session: {
      id: string;

      nom: string | null;

      code: string;

      formation: {
        id: string;
        nom: string;
      } | null;
    } | null;
  } | null;

  facture: {
    id: string;
    numero: string;
    total: string | number;
    montantPaye: string | number;
    montantDu: string | number;
  } | null;

  echeance: {
    id: string;
    numero: number;
    montant: string | number;
    montantPaye: string | number;
    montantDu: string | number;
    statut: string;
  } | null;
};

type Props = {
  paiements: PaiementData[];
};

/**
 * ============================================================
 * OPTIONS
 * ============================================================
 */

const statutOptions = [
  {
    value: "ALL",
    label: "Tous les statuts",
  },
  {
    value: "EN_ATTENTE",
    label: "En attente",
  },
  {
    value: "EFFECTUE",
    label: "Effectué",
  },
  {
    value: "ECHEC",
    label: "Échec",
  },
  {
    value: "ANNULE",
    label: "Annulé",
  },
  {
    value: "REMBOURSE",
    label: "Remboursé",
  },
];

const modeOptions = [
  {
    value: "ALL",
    label: "Tous les modes",
  },
  {
    value: "ESPECES",
    label: "Espèces",
  },
  {
    value: "VIREMENT",
    label: "Virement",
  },
  {
    value: "MOBILE_MONEY",
    label: "Mobile Money",
  },
  {
    value: "CARTE",
    label: "Carte bancaire",
  },
  {
    value: "CHEQUE",
    label: "Chèque",
  },
  {
    value: "AUTRE",
    label: "Autre",
  },
];

/**
 * ============================================================
 * UTILITAIRES
 * ============================================================
 */

function numberValue(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value) || 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value
  ) {
    return Number(String(value)) || 0;
  }

  return 0;
}

function formatAmount(value: unknown) {
  return numberValue(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: Date | string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatMode(mode: PaiementData["mode"]) {
  switch (mode) {
    case "ESPECES":
      return "Espèces";

    case "VIREMENT":
      return "Virement";

    case "MOBILE_MONEY":
      return "Mobile Money";

    case "CARTE":
      return "Carte bancaire";

    case "CHEQUE":
      return "Chèque";

    default:
      return "Autre";
  }
}

function formatStatut(statut: PaiementData["statut"]) {
  switch (statut) {
    case "EN_ATTENTE":
      return "En attente";

    case "EFFECTUE":
      return "Effectué";

    case "ECHEC":
      return "Échec";

    case "ANNULE":
      return "Annulé";

    case "REMBOURSE":
      return "Remboursé";

    default:
      return statut;
  }
}

/**
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export default function PaiementsClient({
  paiements,
}: Props) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");

  const [statutFilter, setStatutFilter] =
    useState("ALL");

  const [modeFilter, setModeFilter] =
    useState("ALL");

  /**
   * ==========================================================
   * FILTRAGE
   * ==========================================================
   */

  const filteredPaiements = useMemo(() => {
    const query = search.trim().toLowerCase();

    return paiements.filter((paiement) => {
      const apprenant = paiement.apprenant
        ? `${paiement.apprenant.prenom} ${paiement.apprenant.nom}`.toLowerCase()
        : "";

      const reference =
        paiement.reference?.toLowerCase() ?? "";

      const inscription =
        paiement.inscription?.numero?.toLowerCase() ?? "";

      const formation =
        paiement.inscription?.session?.formation?.nom?.toLowerCase() ??
        "";

      const matchesSearch =
        !query ||
        apprenant.includes(query) ||
        reference.includes(query) ||
        inscription.includes(query) ||
        formation.includes(query);

      const matchesStatut =
        statutFilter === "ALL" ||
        paiement.statut === statutFilter;

      const matchesMode =
        modeFilter === "ALL" ||
        paiement.mode === modeFilter;

      return (
        matchesSearch &&
        matchesStatut &&
        matchesMode
      );
    });
  }, [
    paiements,
    search,
    statutFilter,
    modeFilter,
  ]);

  /**
   * ==========================================================
   * STATISTIQUES
   * ==========================================================
   */

  const statistiques = useMemo(() => {
    const effectues = paiements.filter(
      (p) => p.statut === "EFFECTUE",
    );

    const enAttente = paiements.filter(
      (p) => p.statut === "EN_ATTENTE",
    );

    const annules = paiements.filter(
      (p) => p.statut === "ANNULE",
    );

    const totalEffectue = effectues.reduce(
      (total, paiement) =>
        total + numberValue(paiement.montant),
      0,
    );

    const totalAttente = enAttente.reduce(
      (total, paiement) =>
        total + numberValue(paiement.montant),
      0,
    );

    return {
      total: paiements.length,

      effectues: effectues.length,

      enAttente: enAttente.length,

      annules: annules.length,

      totalEffectue,

      totalAttente,
    };
  }, [paiements]);

  /**
   * ==========================================================
   * SUPPRESSION
   * ==========================================================
   */

  function handleDelete(
    paiement: PaiementData,
  ) {
    startTransition(async () => {
      const result = await Swal.fire({
        title: "Supprimer ce paiement ?",

        html: `
          <div style="font-size:14px">
            <p>
              Référence :
              <strong>
                ${paiement.reference}
              </strong>
            </p>

            <p>
              Montant :
              <strong>
                ${formatAmount(paiement.montant)}
              </strong>
            </p>
          </div>
        `,

        icon: "warning",

        showCancelButton: true,

        confirmButtonText:
          "Oui, supprimer",

        cancelButtonText:
          "Annuler",

        reverseButtons: true,

        confirmButtonColor:
          "#dc2626",

        cancelButtonColor:
          "#64748b",
      });

      if (!result.isConfirmed) {
        return;
      }

      const response =
        await deletePaiement(
          paiement.id,
        );

      if (!response.success) {
        await Swal.fire({
          title: "Erreur",

          text: response.message,

          icon: "error",

          confirmButtonText:
            "Fermer",
        });

        return;
      }

      toast.success(
        response.message,
      );

      router.refresh();
    });
  }

  /**
   * ==========================================================
   * IMPRESSION DU REÇU
   * ==========================================================
   */

  function handlePrintReceipt(
    paiement: PaiementData,
  ) {
    if (isPending) {
      return;
    }

    /**
     * La page du reçu contient :
     *
     * @page {
     *   size: A8;
     *   margin: 0;
     * }
     *
     * et lance automatiquement :
     *
     * window.print()
     */

    router.push(
      `/paiements/${paiement.id}/recu`,
    );
  }

  /**
   * ==========================================================
   * NOUVEAU PAIEMENT
   * ==========================================================
   */

  function handleCreate() {
    router.push(
      "/paiements/nouveau",
    );
  }

  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="w-full space-y-6">

      {/* =====================================================
          EN-TETE
      ====================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <WalletCards size={26} />
            </div>

            <div>

              <h1 className="text-2xl font-bold">
                Paiements
              </h1>

              <p className="text-sm opacity-60">
                Gestion des paiements et encaissements
              </p>

            </div>

          </div>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="btn btn-primary gap-2 rounded-xl"
        >
          <Plus size={18} />
          Nouveau paiement
        </button>

      </div>

      {/* =====================================================
          STATISTIQUES
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Paiements"
          value={statistiques.total}
          icon={
            <Receipt size={21} />
          }
        />

        <StatCard
          title="Effectués"
          value={statistiques.effectues}
          subtitle={`${formatAmount(
            statistiques.totalEffectue,
          )}`}
          icon={
            <CheckCircle2 size={21} />
          }
          tone="success"
        />

        <StatCard
          title="En attente"
          value={statistiques.enAttente}
          subtitle={`${formatAmount(
            statistiques.totalAttente,
          )}`}
          icon={
            <Clock3 size={21} />
          }
          tone="warning"
        />

        <StatCard
          title="Annulés"
          value={statistiques.annules}
          icon={
            <XCircle size={21} />
          }
          tone="danger"
        />

      </div>

      {/* =====================================================
          FILTRES
      ====================================================== */}

      <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">

        <div className="mb-4 flex items-center gap-2 font-semibold">
          <Filter size={18} />
          Filtres
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* RECHERCHE */}

          <div>

            <label className="mb-2 block text-sm font-medium">
              Rechercher
            </label>

            <div className="relative">

              <Search
                size={18}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 opacity-50"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Nom, référence, inscription..."
                className="input input-bordered w-full rounded-xl pl-10"
              />

            </div>

          </div>

          {/* STATUT */}

          <div>

            <label className="mb-2 block text-sm font-medium">
              Statut
            </label>

            <Select
              options={statutOptions}
              value={
                statutOptions.find(
                  (option) =>
                    option.value ===
                    statutFilter,
                ) ?? null
              }
              onChange={(option) =>
                setStatutFilter(
                  option?.value ?? "ALL",
                )
              }
              isSearchable={false}
              classNamePrefix="paiement-select"
              placeholder="Statut"
              styles={selectStyles}
            />

          </div>

          {/* MODE */}

          <div>

            <label className="mb-2 block text-sm font-medium">
              Mode de paiement
            </label>

            <Select
              options={modeOptions}
              value={
                modeOptions.find(
                  (option) =>
                    option.value ===
                    modeFilter,
                ) ?? null
              }
              onChange={(option) =>
                setModeFilter(
                  option?.value ?? "ALL",
                )
              }
              isSearchable={false}
              classNamePrefix="paiement-select"
              placeholder="Mode"
              styles={selectStyles}
            />

          </div>

        </div>

      </div>

      {/* =====================================================
          TABLEAU
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">

        <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">

          <div>

            <h2 className="font-semibold">
              Liste des paiements
            </h2>

            <p className="text-sm opacity-60">
              {filteredPaiements.length} paiement
              {filteredPaiements.length > 1
                ? "s"
                : ""}
            </p>

          </div>

        </div>

        {/* ===================================================
            DESKTOP
        ==================================================== */}

        <div className="hidden overflow-x-auto md:block">

          <table className="table w-full">

            <thead>

              <tr>

                <th>Paiement</th>

                <th>Apprenant</th>

                <th>Formation</th>

                <th>Montant</th>

                <th>Mode</th>

                <th>Statut</th>

                <th>Date</th>

                <th className="text-right">
                  Actions
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredPaiements.length ===
              0 ? (

                <tr>

                  <td
                    colSpan={8}
                    className="py-16 text-center"
                  >

                    <div className="flex flex-col items-center gap-3 opacity-60">

                      <WalletCards size={42} />

                      <p className="font-semibold">
                        Aucun paiement trouvé
                      </p>

                      <p className="text-sm">
                        Aucun paiement ne correspond aux critères.
                      </p>

                    </div>

                  </td>

                </tr>

              ) : (

                filteredPaiements.map(
                  (paiement) => (

                    <tr
                      key={paiement.id}
                      className="hover:bg-base-200/50"
                    >

                      {/* PAIEMENT */}

                      <td>

                        <div>

                          <p className="font-semibold">
                            {paiement.reference}
                          </p>

                          <p className="text-xs opacity-50">
                            {paiement.inscription?.numero ??
                              "Sans inscription"}
                          </p>

                        </div>

                      </td>

                      {/* APPRENANT */}

                      <td>

                        <div>

                          <p className="font-medium">

                            {paiement.apprenant
                              ? `${paiement.apprenant.prenom} ${paiement.apprenant.nom}`
                              : "—"}

                          </p>

                        </div>

                      </td>

                      {/* FORMATION */}

                      <td>

                        <div>

                          <p className="font-medium">

                            {paiement.inscription
                              ?.session
                              ?.formation
                              ?.nom ??
                              "—"}

                          </p>

                          <p className="text-xs opacity-50">

                            {paiement.inscription
                              ?.session
                              ?.code ??
                              "—"}

                          </p>

                        </div>

                      </td>

                      {/* MONTANT */}

                      <td>

                        <p className="font-bold">
                          {formatAmount(
                            paiement.montant,
                          )}
                        </p>

                      </td>

                      {/* MODE */}

                      <td>

                        <span className="badge badge-ghost gap-1">

                          <CreditCard size={13} />

                          {formatMode(
                            paiement.mode,
                          )}

                        </span>

                      </td>

                      {/* STATUT */}

                      <td>

                        <StatusBadge
                          statut={
                            paiement.statut
                          }
                        />

                      </td>

                      {/* DATE */}

                      <td>

                        <span className="text-sm">
                          {formatDate(
                            paiement.datePaiement,
                          )}
                        </span>

                      </td>

                      {/* ACTIONS */}

                      <td>

                        <div className="flex justify-end gap-2">

                          {/* VOIR */}

                          <button
                            type="button"
                            title="Voir"
                            onClick={() =>
                              router.push(
                                `/paiements/${paiement.id}`,
                              )
                            }
                            className="btn btn-sm btn-ghost btn-square cursor-pointer"
                          >
                            <Eye size={17} />
                          </button>

                          {/* MODIFIER */}

                          <button
                            type="button"
                            title="Modifier"
                            onClick={() =>
                              router.push(
                                `/paiements/${paiement.id}/modifier`,
                              )
                            }
                            className="btn btn-sm btn-ghost btn-square cursor-pointer"
                          >
                            <Pencil size={17} />
                          </button>

                          {/* IMPRIMER */}

                          <button
                            type="button"
                            title="Imprimer le reçu A8"
                            disabled={
                              isPending
                            }
                            onClick={() =>
                              handlePrintReceipt(
                                paiement,
                              )
                            }
                            className="btn btn-sm btn-ghost btn-square cursor-pointer text-primary disabled:cursor-not-allowed"
                          >
                            <Printer size={17} />
                          </button>

                          {/* SUPPRIMER */}

                          <button
                            type="button"
                            title="Supprimer"
                            disabled={
                              isPending
                            }
                            onClick={() =>
                              handleDelete(
                                paiement,
                              )
                            }
                            className="btn btn-sm btn-ghost btn-square cursor-pointer text-error"
                          >
                            <Trash2 size={17} />
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

        {/* ===================================================
            MOBILE
        ==================================================== */}

        <div className="space-y-3 p-4 md:hidden">

          {filteredPaiements.length ===
          0 ? (

            <div className="flex flex-col items-center gap-3 py-12 text-center opacity-60">

              <WalletCards size={40} />

              <p className="font-semibold">
                Aucun paiement
              </p>

              <p className="text-sm">
                Aucun résultat trouvé.
              </p>

            </div>

          ) : (

            filteredPaiements.map(
              (paiement) => (

                <div
                  key={paiement.id}
                  className="rounded-2xl border border-base-300 p-4"
                >

                  <div className="mb-3 flex items-start justify-between gap-3">

                    <div>

                      <p className="font-bold">
                        {paiement.reference}
                      </p>

                      <p className="text-xs opacity-50">

                        {paiement.inscription
                          ?.numero ??
                          "Sans inscription"}

                      </p>

                    </div>

                    <StatusBadge
                      statut={
                        paiement.statut
                      }
                    />

                  </div>

                  <div className="space-y-2 text-sm">

                    <InfoRow
                      label="Apprenant"
                      value={
                        paiement.apprenant
                          ? `${paiement.apprenant.prenom} ${paiement.apprenant.nom}`
                          : "—"
                      }
                    />

                    <InfoRow
                      label="Formation"
                      value={
                        paiement.inscription
                          ?.session
                          ?.formation
                          ?.nom ??
                        "—"
                      }
                    />

                    <InfoRow
                      label="Montant"
                      value={`${formatAmount(
                        paiement.montant,
                      )}`}
                      strong
                    />

                    <InfoRow
                      label="Mode"
                      value={formatMode(
                        paiement.mode,
                      )}
                    />

                    <InfoRow
                      label="Date"
                      value={formatDate(
                        paiement.datePaiement,
                      )}
                    />

                  </div>

                  <div className="mt-4 flex gap-2 border-t border-base-300 pt-3">

                    {/* VOIR */}

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/paiements/${paiement.id}`,
                        )
                      }
                      className="btn btn-sm flex-1 gap-2 cursor-pointer"
                    >
                      <Eye size={15} />
                      Voir
                    </button>

                    {/* MODIFIER */}

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/paiements/${paiement.id}/modifier`,
                        )
                      }
                      className="btn btn-sm btn-primary flex-1 gap-2 cursor-pointer"
                    >
                      <Pencil size={15} />
                      Modifier
                    </button>

                    {/* IMPRIMER */}

                    <button
                      type="button"
                      title="Imprimer le reçu A8"
                      disabled={
                        isPending
                      }
                      onClick={() =>
                        handlePrintReceipt(
                          paiement,
                        )
                      }
                      className="btn btn-sm btn-square btn-info cursor-pointer"
                    >
                      <Printer size={15} />
                    </button>

                    {/* SUPPRIMER */}

                    <button
                      type="button"
                      disabled={
                        isPending
                      }
                      onClick={() =>
                        handleDelete(
                          paiement,
                        )
                      }
                      className="btn btn-sm btn-error btn-square cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>

                  </div>

                </div>

              ),
            )

          )}

        </div>

      </div>

    </div>
  );
}

/**
 * ============================================================
 * STAT CARD
 * ============================================================
 */

function StatCard({
  title,
  value,
  subtitle,
  icon,
  tone = "default",
}: {
  title: string;

  value: number;

  subtitle?: string;

  icon: React.ReactNode;

  tone?:
    | "default"
    | "success"
    | "warning"
    | "danger";
}) {
  const toneClasses = {
    default:
      "bg-primary/10 text-primary",

    success:
      "bg-success/10 text-success",

    warning:
      "bg-warning/10 text-warning",

    danger:
      "bg-error/10 text-error",
  };

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-sm opacity-60">
            {title}
          </p>

          <p className="mt-1 text-2xl font-bold">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs opacity-60">
              {subtitle}
            </p>
          )}

        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClasses[tone]}`}
        >
          {icon}
        </div>

      </div>

    </div>
  );
}

/**
 * ============================================================
 * STATUS BADGE
 * ============================================================
 */

function StatusBadge({
  statut,
}: {
  statut: PaiementData["statut"];
}) {
  const config = {
    EN_ATTENTE: {
      className: "badge-warning",
      icon: (
        <Clock3 size={13} />
      ),
    },

    EFFECTUE: {
      className: "badge-success",
      icon: (
        <CheckCircle2 size={13} />
      ),
    },

    ECHEC: {
      className: "badge-error",
      icon: (
        <XCircle size={13} />
      ),
    },

    ANNULE: {
      className: "badge-error",
      icon: (
        <XCircle size={13} />
      ),
    },

    REMBOURSE: {
      className: "badge-info",
      icon: (
        <WalletCards size={13} />
      ),
    },
  };

  const current =
    config[statut];

  return (
    <span
      className={`badge gap-1 ${current.className}`}
    >
      {current.icon}

      {formatStatut(statut)}
    </span>
  );
}

/**
 * ============================================================
 * INFO ROW
 * ============================================================
 */

function InfoRow({
  label,
  value,
  strong = false,
}: {
  label: string;

  value: string;

  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">

      <span className="opacity-50">
        {label}
      </span>

      <span
        className={
          strong
            ? "text-right font-bold"
            : "text-right"
        }
      >
        {value}
      </span>

    </div>
  );
}

/**
 * ============================================================
 * REACT SELECT
 * ============================================================
 */

const selectStyles = {
  control: (
    base: any,
    state: any,
  ) => ({
    ...base,

    minHeight: 44,

    borderRadius: 12,

    cursor: "pointer",

    borderColor:
      state.isFocused
        ? "#3b82f6"
        : "#d1d5db",

    boxShadow:
      state.isFocused
        ? "0 0 0 2px rgba(59,130,246,0.15)"
        : "none",

    backgroundColor:
      "var(--fallback-b1,oklch(var(--b1)))",

    "&:hover": {
      borderColor: "#3b82f6",
    },
  }),

  menu: (base: any) => ({
    ...base,

    zIndex: 100,

    borderRadius: 12,

    overflow: "hidden",
  }),

  option: (
    base: any,
    state: any,
  ) => ({
    ...base,

    cursor: "pointer",

    backgroundColor:
      state.isFocused
        ? "#eff6ff"
        : "white",

    color: "#0f172a",

    "&:active": {
      backgroundColor:
        "#dbeafe",
    },
  }),

  singleValue: (
    base: any,
  ) => ({
    ...base,

    color: "inherit",
  }),

  placeholder: (
    base: any,
  ) => ({
    ...base,

    color: "#94a3b8",
  }),
};
