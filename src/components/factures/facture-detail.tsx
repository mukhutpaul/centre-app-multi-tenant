
"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  Landmark,
  Loader2,
  Pencil,
  Receipt,
  RefreshCw,
  Smartphone,
  Trash2,
  UserRound,
  Wallet,
  AlertTriangle,
  Banknote,
} from "lucide-react";

import { useRouter } from "next/navigation";

import Swal from "sweetalert2";

import {
  createPaiement,
} from "@/actions/paiement.actions";

import {
  generateEcheancier,
} from "@/actions/echeance.actions";

/**
 * ============================================================
 * TYPES
 * ============================================================
 *
 * Les valeurs Decimal provenant du serveur doivent idéalement
 * être sérialisées en string avant d'arriver dans ce composant.
 */

type LigneFacture = {
  id: string;
  description: string;
  quantite: string | number;
  prixUnitaire: string | number;
  total: string | number;
};

type Paiement = {
  id: string;
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
  datePaiement?: string | Date | null;
  referenceTransaction?: string | null;
  notes?: string | null;
};

type Echeance = {
  id: string;
  numero: number;
  dateEcheance: string | Date;
  montant: string | number;
  montantPaye: string | number;
  montantDu: string | number;
  statut:
    | "EN_ATTENTE"
    | "PARTIELLE"
    | "PAYEE"
    | "EN_RETARD"
    | "ANNULEE";
  notes?: string | null;

  paiements?: Paiement[];
};

type Apprenant = {
  id: string;
  prenom: string;
  nom: string;
  numero?: string | null;
  email?: string | null;
  telephone?: string | null;
};

type Formation = {
  id: string;
  nom: string;
  code?: string | null;
};

type Session = {
  id: string;
  code: string;
  nom?: string | null;
  dateDebut?: string | Date | null;
  dateFin?: string | Date | null;
  formation?: Formation | null;
};

type Inscription = {
  id: string;
  numero: string;
  montantConvenu: string | number;
  statut?: string;

  apprenant: Apprenant;

  session: Session;
};

type Centre = {
  id: string;
  nom: string;
  devise?: string | null;
};

type Facture = {
  id: string;
  numero: string;

  dateEmission: string | Date;
  dateEcheance?: string | Date | null;

  sousTotal: string | number;
  remise: string | number;
  taxe: string | number;

  total: string | number;
  montantPaye: string | number;
  montantDu: string | number;

  statut:
    | "BROUILLON"
    | "EMISE"
    | "PARTIELLEMENT_PAYEE"
    | "PAYEE"
    | "EN_RETARD"
    | "ANNULEE";

  notes?: string | null;

  centre?: Centre | null;

  inscription?: Inscription | null;

  lignes: LigneFacture[];

  paiements: Paiement[];

  echeances: Echeance[];
};

type Props = {
  facture: Facture;
};

/**
 * ============================================================
 * UTILITAIRES
 * ============================================================
 */

function toNumber(
  value: string | number | null | undefined,
) {
  const result = Number(value ?? 0);

  return Number.isFinite(result)
    ? result
    : 0;
}

function formatMontant(
  value: string | number | null | undefined,
  devise = "USD"
) {
  const amount = toNumber(value);

  return new Intl.NumberFormat(
    "fr-FR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  ).format(amount) +
    ` ${devise}`;
}

function formatDate(
  value: string | Date | null | undefined,
) {
  if (!value) {
    return "—";
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
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  ).format(date);
}

function formatDateCourt(
  value: string | Date | null | undefined,
) {
  if (!value) {
    return "—";
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
    return "—";
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

function getModeLabel(
  mode: Paiement["mode"],
) {
  const labels: Record<
    Paiement["mode"],
    string
  > = {
    ESPECES: "Espèces",
    VIREMENT: "Virement",
    MOBILE_MONEY: "Mobile Money",
    CARTE: "Carte bancaire",
    CHEQUE: "Chèque",
    AUTRE: "Autre",
  };

  return labels[mode] ?? mode;
}

function getStatutFactureLabel(
  statut: Facture["statut"],
) {
  const labels: Record<
    Facture["statut"],
    string
  > = {
    BROUILLON: "Brouillon",
    EMISE: "Émise",
    PARTIELLEMENT_PAYEE:
      "Partiellement payée",
    PAYEE: "Payée",
    EN_RETARD: "En retard",
    ANNULEE: "Annulée",
  };

  return labels[statut];
}

function getStatutEcheanceLabel(
  statut: Echeance["statut"],
) {
  const labels: Record<
    Echeance["statut"],
    string
  > = {
    EN_ATTENTE: "En attente",
    PARTIELLE: "Partiellement payée",
    PAYEE: "Payée",
    EN_RETARD: "En retard",
    ANNULEE: "Annulée",
  };

  return labels[statut];
}

function getStatutFactureClass(
  statut: Facture["statut"],
) {
  switch (statut) {
    case "PAYEE":
      return "badge-success";

    case "PARTIELLEMENT_PAYEE":
      return "badge-warning";

    case "EN_RETARD":
      return "badge-error";

    case "ANNULEE":
      return "badge-neutral";

    case "EMISE":
      return "badge-info";

    default:
      return "badge-ghost";
  }
}

function getStatutEcheanceClass(
  statut: Echeance["statut"],
) {
  switch (statut) {
    case "PAYEE":
      return "badge-success";

    case "PARTIELLE":
      return "badge-warning";

    case "EN_RETARD":
      return "badge-error";

    case "ANNULEE":
      return "badge-neutral";

    default:
      return "badge-info";
  }
}

function generatePaymentReference() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      now.getDate(),
    ).padStart(2, "0");

  const random =
    Math.floor(
      1000 +
        Math.random() *
          9000,
    );

  return `PAY-${year}${month}${day}-${random}`;
}

/**
 * ============================================================
 * COMPOSANT
 * ============================================================
 */

export default function FactureDetail({
  facture,
}: Props) {
  const router =
    useRouter();

  const [
    isGenerating,
    setIsGenerating,
  ] = useState(false);

  const [
    paiementLoading,
    setPaiementLoading,
  ] = useState(false);

  const [
    deletingEcheancier,
    setDeletingEcheancier,
  ] = useState(false);

  /**
   * ==========================================================
   * DONNEES FINANCIERES
   * ==========================================================
   */

  const devise =
    facture.centre?.devise ??
    "USD";

  const total =
    toNumber(
      facture.total,
    );

  const montantPaye =
    toNumber(
      facture.montantPaye,
    );

  const montantDu =
    Math.max(
      0,
      toNumber(
        facture.montantDu,
      ),
    );

  const progression =
    total > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (montantPaye /
              total) *
              100,
          ),
        )
      : 0;

  const progressionArrondie =
    Math.round(
      progression,
    );

  /**
   * ==========================================================
   * ECHEANCIER
   * ==========================================================
   */

  const echeances =
    facture.echeances ??
    [];

  const nombreEcheances =
    echeances.length;

  const echeancesPayees =
    echeances.filter(
      (echeance) =>
        echeance.statut ===
        "PAYEE",
    ).length;

  const echeancesEnRetard =
    echeances.filter(
      (echeance) =>
        echeance.statut ===
        "EN_RETARD",
    ).length;

  const totalEcheancier =
    echeances.reduce(
      (
        totalCourant,
        echeance,
      ) =>
        totalCourant +
        toNumber(
          echeance.montant,
        ),
      0,
    );

  const totalEcheancierPaye =
    echeances.reduce(
      (
        totalCourant,
        echeance,
      ) =>
        totalCourant +
        toNumber(
          echeance.montantPaye,
        ),
      0,
    );

  const hasEcheancier =
    nombreEcheances > 0;

  const canGenerateEcheancier =
    !hasEcheancier &&
    facture.statut !==
      "ANNULEE" &&
    total > 0;

  const canPay =
    facture.statut !==
      "ANNULEE" &&
    montantDu > 0;

  /**
   * ==========================================================
   * PAIEMENTS RECENTS
   * ==========================================================
   */

  const paiementsEffectues =
    (facture.paiements ??
      []).filter(
      (paiement) =>
        paiement.statut ===
        "EFFECTUE",
    );

  const paiementsRecents =
    [...paiementsEffectues]
      .sort(
        (
          a,
          b,
        ) => {
          const dateA =
            a.datePaiement
              ? new Date(
                  a.datePaiement,
                ).getTime()
              : 0;

          const dateB =
            b.datePaiement
              ? new Date(
                  b.datePaiement,
                ).getTime()
              : 0;

          return (
            dateB -
            dateA
          );
        },
      )
      .slice(0, 5);

  /**
   * ==========================================================
   * GENERER ECHEANCIER
   * ==========================================================
   */

  async function handleGenerateEcheancier() {
    if (
      !canGenerateEcheancier
    ) {
      return;
    }

    const result =
      await Swal.fire({
        title:
          "Générer l'échéancier",

        html: `
          <div style="text-align:left">
            <p style="
              margin-bottom:14px;
              color:#64748b;
              font-size:14px;
            ">
              Le montant total de la facture est
              <strong>
                ${formatMontant(
                  total,
                  devise,
                )}
              </strong>.
            </p>

            <label
              for="nombre-echeances"
              style="
                display:block;
                margin-bottom:7px;
                font-weight:600;
                font-size:14px;
              "
            >
              Nombre d'échéances
            </label>

            <select
              id="nombre-echeances"
              class="swal2-input"
              style="
                width:100%;
                margin:0;
              "
            >
              <option value="1">
                1 échéance
              </option>

              <option value="2">
                2 échéances
              </option>

              <option value="3" selected>
                3 échéances
              </option>

              <option value="4">
                4 échéances
              </option>

              <option value="6">
                6 échéances
              </option>

              <option value="8">
                8 échéances
              </option>

              <option value="12">
                12 échéances
              </option>
            </select>

            <p style="
              margin-top:12px;
              color:#94a3b8;
              font-size:12px;
            ">
              Les échéances seront espacées d'un mois.
              Le dernier montant absorbera automatiquement
              l'éventuel écart d'arrondi.
            </p>
          </div>
        `,

        icon: "question",

        showCancelButton: true,

        confirmButtonText:
          "Générer",

        cancelButtonText:
          "Annuler",

        confirmButtonColor:
          "#2563eb",

        cancelButtonColor:
          "#64748b",

        focusConfirm: false,

        preConfirm: () => {
          const input =
            document.getElementById(
              "nombre-echeances",
            ) as HTMLSelectElement | null;

          const nombre =
            Number(
              input?.value ?? 0,
            );

          if (
            !Number.isInteger(
              nombre,
            ) ||
            nombre < 1
          ) {
            Swal.showValidationMessage(
              "Veuillez sélectionner un nombre d'échéances valide.",
            );

            return false;
          }

          return nombre;
        },
      });

    if (
      !result.isConfirmed
    ) {
      return;
    }

    const nombre =
      Number(
        result.value,
      );

    setIsGenerating(
      true,
    );

    try {
      await generateEcheancier(
        facture.id,
        {
          nombreEcheances:
            nombre,
        },
      );

      await Swal.fire({
        icon: "success",

        title:
          "Échéancier généré",

        text: `${nombre} échéance${
          nombre > 1
            ? "s"
            : ""
        } créée${
          nombre > 1
            ? "s"
            : ""
        } avec succès.`,

        confirmButtonText:
          "Continuer",

        confirmButtonColor:
          "#16a34a",
      });

      router.refresh();
    } catch (error) {
      await Swal.fire({
        icon: "error",

        title:
          "Impossible de générer l'échéancier",

        text:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue.",

        confirmButtonText:
          "Fermer",

        confirmButtonColor:
          "#dc2626",
      });
    } finally {
      setIsGenerating(
        false,
      );
    }
  }

  /**
   * ==========================================================
   * PAIEMENT DIRECT
   * ==========================================================
   */

  async function handlePayment(
    echeance?: Echeance,
  ) {
    if (
      facture.statut ===
      "ANNULEE"
    ) {
      await Swal.fire({
        icon: "warning",

        title:
          "Facture annulée",

        text:
          "Cette facture ne peut plus recevoir de paiement.",

        confirmButtonText:
          "Fermer",
      });

      return;
    }

    const inscription =
      facture.inscription;

    if (!inscription) {
      await Swal.fire({
        icon: "warning",

        title:
          "Inscription manquante",

        text:
          "Cette facture n'est liée à aucune inscription. Le paiement direct ne peut pas être enregistré depuis cette fiche.",

        confirmButtonText:
          "Fermer",
      });

      return;
    }

    const resteDisponible =
      echeance
        ? toNumber(
            echeance.montantDu,
          )
        : montantDu;

    if (
      resteDisponible <=
      0
    ) {
      await Swal.fire({
        icon: "info",

        title:
          "Aucun montant restant",

        text:
          "Cette facture ou cette échéance est déjà entièrement payée.",

        confirmButtonText:
          "Fermer",
      });

      return;
    }

    const reference =
      generatePaymentReference();

    const optionsEcheances =
      echeances
        .filter(
          (item) =>
            toNumber(
              item.montantDu,
            ) > 0 &&
            item.statut !==
              "ANNULEE",
        )
        .map(
          (item) => `
            <option
              value="${item.id}"
              ${
                echeance?.id ===
                item.id
                  ? "selected"
                  : ""
              }
            >
              Échéance #${
                item.numero
              } — ${
                formatMontant(
                  item.montantDu,
                  devise,
                )
              }
            </option>
          `,
        )
        .join("");

    const hasEcheanceOptions =
      echeances.filter(
        (item) =>
          toNumber(
            item.montantDu,
          ) > 0 &&
          item.statut !==
            "ANNULEE",
      ).length > 0;

    const result =
      await Swal.fire({
        title:
          echeance
            ? `Paiement — échéance #${echeance.numero}`
            : "Enregistrer un paiement",

        width: 620,

        html: `
          <div
            style="
              text-align:left;
              display:flex;
              flex-direction:column;
              gap:14px;
            "
          >

            <div
              style="
                padding:14px;
                border-radius:12px;
                background:#f8fafc;
                border:1px solid #e2e8f0;
              "
            >
              <div
                style="
                  font-size:12px;
                  color:#64748b;
                  margin-bottom:4px;
                "
              >
                Apprenant
              </div>

              <strong
                style="
                  font-size:16px;
                  color:#0f172a;
                "
              >
                ${inscription.apprenant.prenom}
                ${inscription.apprenant.nom}
              </strong>

              <div
                style="
                  margin-top:4px;
                  font-size:12px;
                  color:#64748b;
                "
              >
                ${inscription.numero}
              </div>
            </div>

            <div
              style="
                display:grid;
                grid-template-columns:
                  repeat(2,minmax(0,1fr));
                gap:10px;
              "
            >

              <div
                style="
                  padding:12px;
                  border-radius:10px;
                  background:#eff6ff;
                "
              >
                <div
                  style="
                    font-size:11px;
                    color:#64748b;
                  "
                >
                  Total facture
                </div>

                <strong
                  style="
                    display:block;
                    margin-top:3px;
                    color:#1d4ed8;
                  "
                >
                  ${formatMontant(
                    total,
                    devise,
                  )}
                </strong>
              </div>

              <div
                style="
                  padding:12px;
                  border-radius:10px;
                  background:#fff7ed;
                "
              >
                <div
                  style="
                    font-size:11px;
                    color:#64748b;
                  "
                >
                  Reste à payer
                </div>

                <strong
                  style="
                    display:block;
                    margin-top:3px;
                    color:#c2410c;
                  "
                >
                  ${formatMontant(
                    resteDisponible,
                    devise,
                  )}
                </strong>
              </div>

            </div>

            ${
              hasEcheanceOptions &&
              !echeance
                ? `
                  <div>
                    <label
                      for="paiement-echeance"
                      style="
                        display:block;
                        margin-bottom:6px;
                        font-size:13px;
                        font-weight:600;
                        color:#334155;
                      "
                    >
                      Affecter à une échéance
                    </label>

                    <select
                      id="paiement-echeance"
                      class="swal2-input"
                      style="
                        width:100%;
                        margin:0;
                      "
                    >
                      <option value="">
                        Paiement global de la facture
                      </option>

                      ${optionsEcheances}
                    </select>
                  </div>
                `
                : ""
            }

            <div>
              <label
                for="paiement-montant"
                style="
                  display:block;
                  margin-bottom:6px;
                  font-size:13px;
                  font-weight:600;
                  color:#334155;
                "
              >
                Montant
              </label>

              <input
                id="paiement-montant"
                class="swal2-input"
                type="number"
                min="0.01"
                step="0.01"
                value="${resteDisponible}"
                max="${resteDisponible}"
                style="
                  width:100%;
                  margin:0;
                "
              />

              <div
                style="
                  margin-top:5px;
                  font-size:11px;
                  color:#64748b;
                "
              >
                Maximum autorisé :
                ${formatMontant(
                  resteDisponible,
                  devise,
                )}
              </div>
            </div>

            <div>
              <label
                for="paiement-mode"
                style="
                  display:block;
                  margin-bottom:6px;
                  font-size:13px;
                  font-weight:600;
                  color:#334155;
                "
              >
                Mode de paiement
              </label>

              <select
                id="paiement-mode"
                class="swal2-input"
                style="
                  width:100%;
                  margin:0;
                "
              >
                <option value="ESPECES">
                  Espèces
                </option>

                <option value="MOBILE_MONEY">
                  Mobile Money
                </option>

                <option value="VIREMENT">
                  Virement bancaire
                </option>

                <option value="CARTE">
                  Carte bancaire
                </option>

                <option value="CHEQUE">
                  Chèque
                </option>

                <option value="AUTRE">
                  Autre
                </option>
              </select>
            </div>

            <div>
              <label
                for="paiement-reference"
                style="
                  display:block;
                  margin-bottom:6px;
                  font-size:13px;
                  font-weight:600;
                  color:#334155;
                "
              >
                Référence
              </label>

              <input
                id="paiement-reference"
                class="swal2-input"
                type="text"
                value="${reference}"
                style="
                  width:100%;
                  margin:0;
                "
              />
            </div>

            <div>
              <label
                for="paiement-transaction"
                style="
                  display:block;
                  margin-bottom:6px;
                  font-size:13px;
                  font-weight:600;
                  color:#334155;
                "
              >
                Référence transaction
                <span
                  style="
                    font-weight:400;
                    color:#94a3b8;
                  "
                >
                  (optionnel)
                </span>
              </label>

              <input
                id="paiement-transaction"
                class="swal2-input"
                type="text"
                placeholder="Ex : TXN-123456"
                style="
                  width:100%;
                  margin:0;
                "
              />
            </div>

            <div>
              <label
                for="paiement-notes"
                style="
                  display:block;
                  margin-bottom:6px;
                  font-size:13px;
                  font-weight:600;
                  color:#334155;
                "
              >
                Note
                <span
                  style="
                    font-weight:400;
                    color:#94a3b8;
                  "
                >
                  (optionnel)
                </span>
              </label>

              <textarea
                id="paiement-notes"
                class="swal2-textarea"
                placeholder="Observation éventuelle..."
                style="
                  width:100%;
                  margin:0;
                  min-height:80px;
                "
              ></textarea>
            </div>

          </div>
        `,

        showCancelButton: true,

        confirmButtonText:
          "Enregistrer le paiement",

        cancelButtonText:
          "Annuler",

        confirmButtonColor:
          "#2563eb",

        cancelButtonColor:
          "#64748b",

        focusConfirm: false,

        preConfirm: () => {
          const montantInput =
            document.getElementById(
              "paiement-montant",
            ) as HTMLInputElement | null;

          const modeInput =
            document.getElementById(
              "paiement-mode",
            ) as HTMLSelectElement | null;

          const referenceInput =
            document.getElementById(
              "paiement-reference",
            ) as HTMLInputElement | null;

          const transactionInput =
            document.getElementById(
              "paiement-transaction",
            ) as HTMLInputElement | null;

          const notesInput =
            document.getElementById(
              "paiement-notes",
            ) as HTMLTextAreaElement | null;

          const echeanceInput =
            document.getElementById(
              "paiement-echeance",
            ) as HTMLSelectElement | null;

          const montant =
            Number(
              montantInput?.value ?? 0,
            );

          const mode =
            modeInput?.value ??
            "ESPECES";

          const paiementReference =
            referenceInput?.value
              ?.trim() ?? "";

          if (
            !Number.isFinite(
              montant,
            ) ||
            montant <= 0
          ) {
            Swal.showValidationMessage(
              "Le montant doit être supérieur à zéro.",
            );

            return false;
          }

          if (
            montant >
            resteDisponible +
              0.000001
          ) {
            Swal.showValidationMessage(
              `Le montant ne peut pas dépasser ${formatMontant(
                resteDisponible,
                devise,
              )}.`,
            );

            return false;
          }

          if (
            !paiementReference
          ) {
            Swal.showValidationMessage(
              "La référence du paiement est obligatoire.",
            );

            return false;
          }

          return {
            montant,
            mode,
            reference:
              paiementReference,
            referenceTransaction:
              transactionInput?.value?.trim() ||
              null,
            notes:
              notesInput?.value?.trim() ||
              null,
            echeanceId:
              echeance?.id ??
              echeanceInput?.value ??
              null,
          };
        },
      });

    if (
      !result.isConfirmed ||
      !result.value
    ) {
      return;
    }

    setPaiementLoading(
      true,
    );

    try {
      const data =
        result.value as {
          montant: number;
          mode:
            | "ESPECES"
            | "VIREMENT"
            | "MOBILE_MONEY"
            | "CARTE"
            | "CHEQUE"
            | "AUTRE";
          reference: string;
          referenceTransaction:
            | string
            | null;
          notes:
            | string
            | null;
          echeanceId:
            | string
            | null;
        };

      /**
       * ======================================================
       * CREATION PAIEMENT
       * ======================================================
       */

      await createPaiement({
        apprenantId:
          inscription.apprenant.id,

        inscriptionId:
          inscription.id,

        factureId:
          facture.id,

        echeanceId:
          data.echeanceId,

        reference:
          data.reference,

        montant:
          data.montant.toString(),

        mode:
          data.mode,

        statut:
          "EFFECTUE",

        datePaiement:
          new Date(),

        referenceTransaction:
          data.referenceTransaction,

        notes:
          data.notes,
      });

      await Swal.fire({
        icon: "success",

        title:
          "Paiement enregistré",

        html: `
          <div style="text-align:center">
            <p style="margin-bottom:8px">
              Le paiement a été enregistré avec succès.
            </p>

            <strong
              style="
                font-size:22px;
                color:#16a34a;
              "
            >
              ${formatMontant(
                data.montant,
                devise,
              )}
            </strong>

            <p
              style="
                margin-top:8px;
                font-size:13px;
                color:#64748b;
              "
            >
              Référence :
              ${data.reference}
            </p>
          </div>
        `,

        confirmButtonText:
          "Continuer",

        confirmButtonColor:
          "#16a34a",
      });

      router.refresh();
    } catch (error) {
      await Swal.fire({
        icon: "error",

        title:
          "Paiement impossible",

        text:
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer le paiement.",

        confirmButtonText:
          "Fermer",

        confirmButtonColor:
          "#dc2626",
      });
    } finally {
      setPaiementLoading(
        false,
      );
    }
  }

  /**
   * ==========================================================
   * SUPPRIMER ECHEANCIER
   * ==========================================================
   *
   * Cette fonction reste désactivée ici volontairement.
   * Le moteur serveur doit contrôler qu'aucun paiement
   * n'est attaché aux échéances.
   */

  async function handleDeleteEcheancier() {
    await Swal.fire({
      icon: "info",

      title:
        "Suppression de l'échéancier",

      text:
        "La suppression de l'échéancier sera disponible depuis la gestion avancée de la facture.",

      confirmButtonText:
        "Fermer",
    });
  }

  /**
   * ==========================================================
   * RENDU
   * ==========================================================
   */

  return (
    <div className="space-y-6 pb-10">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex items-start gap-3">

          <button
            type="button"
            className="
              btn
              btn-ghost
              btn-square
              cursor-pointer
            "
            onClick={() =>
              router.push(
                "/factures",
              )
            }
            title="Retour aux factures"
          >
            <ArrowLeft
              size={20}
            />
          </button>

          <div>

            <div className="flex flex-wrap items-center gap-2">

              <h1 className="text-2xl font-bold tracking-tight">
                Facture{" "}
                {facture.numero}
              </h1>

              <span
                className={`
                  badge
                  ${getStatutFactureClass(
                    facture.statut,
                  )}
                `}
              >
                {
                  getStatutFactureLabel(
                    facture.statut,
                  )
                }
              </span>

            </div>

            <p className="mt-1 text-sm text-base-content/60">
              Émise le{" "}
              {formatDate(
                facture.dateEmission,
              )}
            </p>

          </div>

        </div>

        <div className="flex flex-wrap gap-2">

          <button
            type="button"
            className="
              btn
              btn-outline
              btn-sm
              cursor-pointer
            "
            onClick={() =>
              router.push(
                `/factures/${facture.id}/modifier`,
              )
            }
          >
            <Pencil
              size={16}
            />

            Modifier
          </button>

          {canPay && (
            <button
              type="button"
              className="
                btn
                btn-primary
                btn-sm
                cursor-pointer
              "
              disabled={
                paiementLoading
              }
              onClick={() =>
                handlePayment()
              }
            >
              {paiementLoading ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <CircleDollarSign
                  size={16}
                />
              )}

              Enregistrer un paiement
            </button>
          )}

        </div>

      </div>

      {/* =====================================================
          APPRENANT
      ===================================================== */}

      {facture.inscription && (
        <div className="card border border-base-300 bg-base-100 shadow-sm">

          <div className="card-body">

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              <div className="flex items-center gap-4">

                <div className="
                  flex
                  h-14
                  w-14
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-primary/10
                  text-primary
                ">
                  <UserRound
                    size={25}
                  />
                </div>

                <div>

                  <p className="text-xs font-medium uppercase tracking-wide text-base-content/50">
                    Apprenant
                  </p>

                  <h2 className="text-lg font-bold">
                    {
                      facture.inscription
                        .apprenant
                        .prenom
                    }{" "}
                    {
                      facture.inscription
                        .apprenant
                        .nom
                    }
                  </h2>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-base-content/60">

                    <span>
                      Inscription :{" "}
                      <strong>
                        {
                          facture.inscription
                            .numero
                        }
                      </strong>
                    </span>

                    {facture.inscription.apprenant.numero && (
                      <span>
                        N° apprenant :{" "}
                        {
                          facture.inscription
                            .apprenant
                            .numero
                        }
                      </span>
                    )}

                  </div>

                </div>

              </div>

              <div className="text-left md:text-right">

                <p className="text-xs text-base-content/50">
                  Formation
                </p>

                <p className="font-semibold">
                  {
                    facture.inscription
                      .session
                      .formation
                      ?.nom ??
                    facture.inscription
                      .session
                      .nom ??
                    "—"
                  }
                </p>

                <p className="text-sm text-base-content/50">
                  Session{" "}
                  {
                    facture.inscription
                      .session
                      .code
                  }
                </p>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          PROGRESSION FINANCIERE
      ===================================================== */}

      <div className="grid gap-4 md:grid-cols-3">

        {/* TOTAL */}

        <div className="card border border-base-300 bg-base-100 shadow-sm">

          <div className="card-body">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-sm text-base-content/55">
                  Total facture
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {formatMontant(
                    total,
                    devise,
                  )}
                </p>

              </div>

              <div className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                bg-primary/10
                text-primary
              ">
                <Receipt
                  size={21}
                />
              </div>

            </div>

          </div>

        </div>

        {/* PAYE */}

        <div className="card border border-base-300 bg-base-100 shadow-sm">

          <div className="card-body">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-sm text-base-content/55">
                  Montant payé
                </p>

                <p className="mt-2 text-2xl font-bold text-success">
                  {formatMontant(
                    montantPaye,
                    devise,
                  )}
                </p>

              </div>

              <div className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                bg-success/10
                text-success
              ">
                <CheckCircle2
                  size={21}
                />
              </div>

            </div>

          </div>

        </div>

        {/* RESTE */}

        <div className="card border border-base-300 bg-base-100 shadow-sm">

          <div className="card-body">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-sm text-base-content/55">
                  Reste à payer
                </p>

                <p className={`
                  mt-2
                  text-2xl
                  font-bold
                  ${
                    montantDu > 0
                      ? "text-warning"
                      : "text-success"
                  }
                `}>
                  {formatMontant(
                    montantDu,
                    devise,
                  )}
                </p>

              </div>

              <div className={`
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                ${
                  montantDu > 0
                    ? "bg-warning/10 text-warning"
                    : "bg-success/10 text-success"
                }
              `}>
                <Wallet
                  size={21}
                />
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          BARRE DE PROGRESSION
      ===================================================== */}

      <div className="card border border-base-300 bg-base-100 shadow-sm">

        <div className="card-body">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <p className="text-sm font-medium text-base-content/60">
                Progression des paiements
              </p>

              <div className="mt-1 flex items-baseline gap-2">

                <span className="text-3xl font-bold">
                  {
                    progressionArrondie
                  }%
                </span>

                <span className="text-sm text-base-content/50">
                  de la facture réglée
                </span>

              </div>

            </div>

            <div className="text-left sm:text-right">

              <p className="text-sm text-base-content/55">
                {formatMontant(
                  montantPaye,
                  devise,
                )}{" "}
                sur{" "}
                {formatMontant(
                  total,
                  devise,
                )}
              </p>

            </div>

          </div>

          <div className="mt-4">

            <div className="
              h-4
              w-full
              overflow-hidden
              rounded-full
              bg-base-200
            ">

              <div
                className="
                  h-full
                  rounded-full
                  bg-success
                  transition-all
                  duration-700
                "
                style={{
                  width: `${progression}%`,
                }}
              />

            </div>

          </div>

          <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-base-content/50">

            <span>
              Déjà payé :{" "}
              <strong className="text-success">
                {formatMontant(
                  montantPaye,
                  devise,
                )}
              </strong>
            </span>

            <span>
              Reste :{" "}
              <strong className="text-warning">
                {formatMontant(
                  montantDu,
                  devise,
                )}
              </strong>
            </span>

          </div>

        </div>

      </div>

      {/* =====================================================
          CONTENU PRINCIPAL
      ===================================================== */}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">

        {/* ===================================================
            GAUCHE
        =================================================== */}

        <div className="space-y-6">

          {/* ================================================
              LIGNES FACTURE
          ================================================= */}

          <div className="card border border-base-300 bg-base-100 shadow-sm">

            <div className="card-body p-0">

              <div className="
                flex
                items-center
                justify-between
                border-b
                border-base-300
                px-5
                py-4
              ">

                <div className="flex items-center gap-2">

                  <FileText
                    size={19}
                    className="text-primary"
                  />

                  <h3 className="font-bold">
                    Détail de la facture
                  </h3>

                </div>

                <span className="text-sm text-base-content/50">
                  {
                    facture.lignes
                      .length
                  }{" "}
                  ligne
                  {facture.lignes
                    .length >
                  1
                    ? "s"
                    : ""}
                </span>

              </div>

              <div className="overflow-x-auto">

                <table className="table">

                  <thead>

                    <tr>

                      <th>
                        Description
                      </th>

                      <th className="text-right">
                        Qté
                      </th>

                      <th className="text-right">
                        Prix unitaire
                      </th>

                      <th className="text-right">
                        Total
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {facture.lignes.map(
                      (
                        ligne,
                      ) => (
                        <tr
                          key={
                            ligne.id
                          }
                        >

                          <td>
                            <span className="font-medium">
                              {
                                ligne.description
                              }
                            </span>
                          </td>

                          <td className="text-right">
                            {
                              ligne.quantite
                            }
                          </td>

                          <td className="text-right">
                            {formatMontant(
                              ligne.prixUnitaire,
                              devise,
                            )}
                          </td>

                          <td className="text-right font-semibold">
                            {formatMontant(
                              ligne.total,
                              devise,
                            )}
                          </td>

                        </tr>
                      ),
                    )}

                    {facture.lignes
                      .length ===
                      0 && (
                      <tr>

                        <td
                          colSpan={4}
                          className="
                            py-10
                            text-center
                            text-base-content/50
                          "
                        >
                          Aucune ligne de facture.
                        </td>

                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

              {/* TOTALS */}

              <div className="
                ml-auto
                w-full
                max-w-md
                space-y-2
                border-t
                border-base-300
                p-5
              ">

                <div className="flex justify-between gap-4 text-sm">

                  <span className="text-base-content/60">
                    Sous-total
                  </span>

                  <span className="font-medium">
                    {formatMontant(
                      facture.sousTotal,
                      devise,
                    )}
                  </span>

                </div>

                <div className="flex justify-between gap-4 text-sm">

                  <span className="text-base-content/60">
                    Remise
                  </span>

                  <span className="font-medium text-error">
                    -{" "}
                    {formatMontant(
                      facture.remise,
                      devise,
                    )}
                  </span>

                </div>

                <div className="flex justify-between gap-4 text-sm">

                  <span className="text-base-content/60">
                    Taxe
                  </span>

                  <span className="font-medium">
                    {formatMontant(
                      facture.taxe,
                      devise,
                    )}
                  </span>

                </div>

                <div className="
                  mt-3
                  flex
                  justify-between
                  gap-4
                  border-t
                  border-base-300
                  pt-3
                  text-lg
                ">

                  <span className="font-bold">
                    Total
                  </span>

                  <span className="font-bold">
                    {formatMontant(
                      total,
                      devise,
                    )}
                  </span>

                </div>

              </div>

            </div>

          </div>

          {/* ================================================
              ECHEANCIER
          ================================================= */}

          <div className="card border border-base-300 bg-base-100 shadow-sm">

            <div className="
              flex
              flex-col
              gap-3
              border-b
              border-base-300
              px-5
              py-4
              md:flex-row
              md:items-center
              md:justify-between
            ">

              <div className="flex items-center gap-3">

                <div className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-primary/10
                  text-primary
                ">
                  <CalendarDays
                    size={20}
                  />
                </div>

                <div>

                  <h3 className="font-bold">
                    Échéancier de paiement
                  </h3>

                  <p className="text-xs text-base-content/50">
                    {hasEcheancier
                      ? `${echeancesPayees}/${nombreEcheances} échéance${
                          nombreEcheances >
                          1
                            ? "s"
                            : ""
                        } payée${
                          echeancesPayees >
                          1
                            ? "s"
                            : ""
                        }`
                      : "Aucun échéancier généré"}
                  </p>

                </div>

              </div>

              <div className="flex flex-wrap gap-2">

                {hasEcheancier &&
                  echeancesEnRetard >
                    0 && (
                    <span className="badge badge-error gap-1">
                      <AlertTriangle
                        size={12}
                      />

                      {
                        echeancesEnRetard
                      }{" "}
                      en retard
                    </span>
                  )}

                {canGenerateEcheancier && (
                  <button
                    type="button"
                    className="
                      btn
                      btn-primary
                      btn-sm
                      cursor-pointer
                    "
                    disabled={
                      isGenerating
                    }
                    onClick={
                      handleGenerateEcheancier
                    }
                  >
                    {isGenerating ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <CalendarDays
                        size={16}
                      />
                    )}

                    Générer l'échéancier
                  </button>
                )}

              </div>

            </div>

            {hasEcheancier ? (
              <div className="p-4">

                {/* RESUME ECHEANCIER */}

                <div className="mb-4 grid gap-3 sm:grid-cols-3">

                  <div className="rounded-xl bg-base-200/60 p-3">

                    <p className="text-xs text-base-content/50">
                      Total échéancier
                    </p>

                    <p className="mt-1 font-bold">
                      {formatMontant(
                        totalEcheancier,
                        devise,
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-success/10 p-3">

                    <p className="text-xs text-base-content/50">
                      Déjà encaissé
                    </p>

                    <p className="mt-1 font-bold text-success">
                      {formatMontant(
                        totalEcheancierPaye,
                        devise,
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-warning/10 p-3">

                    <p className="text-xs text-base-content/50">
                      Reste échéancier
                    </p>

                    <p className="mt-1 font-bold text-warning">
                      {formatMontant(
                        Math.max(
                          0,
                          totalEcheancier -
                            totalEcheancierPaye,
                        ),
                        devise,
                      )}
                    </p>

                  </div>

                </div>

                {/* LISTE */}

                <div className="space-y-3">

                  {echeances.map(
                    (
                      echeance,
                    ) => {
                      const montant =
                        toNumber(
                          echeance.montant,
                        );

                      const paye =
                        toNumber(
                          echeance.montantPaye,
                        );

                      const reste =
                        Math.max(
                          0,
                          toNumber(
                            echeance.montantDu,
                          ),
                        );

                      const pct =
                        montant >
                        0
                          ? Math.min(
                              100,
                              (paye /
                                montant) *
                                100,
                            )
                          : 0;

                      return (
                        <div
                          key={
                            echeance.id
                          }
                          className="
                            rounded-2xl
                            border
                            border-base-300
                            bg-base-100
                            p-4
                            transition
                            hover:border-primary/30
                            hover:shadow-sm
                          "
                        >

                          <div className="
                            flex
                            flex-col
                            gap-4
                            lg:flex-row
                            lg:items-center
                            lg:justify-between
                          ">

                            <div className="flex items-start gap-3">

                              <div className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-base-200
                                font-bold
                              ">
                                #
                                {
                                  echeance.numero
                                }
                              </div>

                              <div>

                                <div className="flex flex-wrap items-center gap-2">

                                  <p className="font-semibold">
                                    Échéance{" "}
                                    {
                                      echeance.numero
                                    }
                                  </p>

                                  <span
                                    className={`
                                      badge
                                      badge-sm
                                      ${getStatutEcheanceClass(
                                        echeance.statut,
                                      )}
                                    `}
                                  >
                                    {
                                      getStatutEcheanceLabel(
                                        echeance.statut,
                                      )
                                    }
                                  </span>

                                </div>

                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-base-content/50">

                                  <span className="flex items-center gap-1">
                                    <CalendarDays
                                      size={13}
                                    />

                                    {
                                      formatDateCourt(
                                        echeance.dateEcheance,
                                      )
                                    }
                                  </span>

                                  <span>
                                    Prévu :{" "}
                                    <strong>
                                      {formatMontant(
                                        montant,
                                        devise,
                                      )}
                                    </strong>
                                  </span>

                                </div>

                              </div>

                            </div>

                            <div className="flex flex-col gap-3 lg:min-w-[280px]">

                              <div className="flex items-center justify-between gap-4">

                                <div>

                                  <p className="text-xs text-base-content/50">
                                    Payé
                                  </p>

                                  <p className="font-semibold text-success">
                                    {formatMontant(
                                      paye,
                                      devise,
                                    )}
                                  </p>

                                </div>

                                <div className="text-right">

                                  <p className="text-xs text-base-content/50">
                                    Reste
                                  </p>

                                  <p className={`
                                    font-semibold
                                    ${
                                      reste >
                                      0
                                        ? "text-warning"
                                        : "text-success"
                                    }
                                  `}>
                                    {formatMontant(
                                      reste,
                                      devise,
                                    )}
                                  </p>

                                </div>

                              </div>

                              <div className="
                                h-2
                                overflow-hidden
                                rounded-full
                                bg-base-200
                              ">

                                <div
                                  className="
                                    h-full
                                    rounded-full
                                    bg-success
                                    transition-all
                                  "
                                  style={{
                                    width: `${pct}%`,
                                  }}
                                />

                              </div>

                              {reste > 0 &&
                                facture.statut !==
                                  "ANNULEE" && (
                                  <button
                                    type="button"
                                    className="
                                      btn
                                      btn-outline
                                      btn-primary
                                      btn-sm
                                      w-full
                                      cursor-pointer
                                    "
                                    disabled={
                                      paiementLoading
                                    }
                                    onClick={() =>
                                      handlePayment(
                                        echeance,
                                      )
                                    }
                                  >
                                    {paiementLoading ? (
                                      <Loader2
                                        size={15}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <CircleDollarSign
                                        size={15}
                                      />
                                    )}

                                    Enregistrer un paiement
                                  </button>
                                )}

                            </div>

                          </div>

                          {/* PAIEMENTS DE L'ECHEANCE */}

                          {echeance
                            .paiements &&
                            echeance
                              .paiements
                              .length >
                              0 && (
                              <div className="
                                mt-4
                                border-t
                                border-base-200
                                pt-3
                              ">

                                <p className="
                                  mb-2
                                  text-xs
                                  font-semibold
                                  uppercase
                                  tracking-wide
                                  text-base-content/40
                                ">
                                  Paiements liés
                                </p>

                                <div className="space-y-2">

                                  {echeance.paiements.map(
                                    (
                                      paiement,
                                    ) => (
                                      <div
                                        key={
                                          paiement.id
                                        }
                                        className="
                                          flex
                                          flex-col
                                          gap-1
                                          rounded-lg
                                          bg-base-200/40
                                          px-3
                                          py-2
                                          sm:flex-row
                                          sm:items-center
                                          sm:justify-between
                                        "
                                      >

                                        <div>

                                          <p className="text-sm font-medium">
                                            {
                                              paiement.reference
                                            }
                                          </p>

                                          <p className="text-xs text-base-content/50">
                                            {formatDate(
                                              paiement.datePaiement,
                                            )}{" "}
                                            ·{" "}
                                            {
                                              getModeLabel(
                                                paiement.mode,
                                              )
                                            }
                                          </p>

                                        </div>

                                        <strong className="text-sm text-success">
                                          +
                                          {" "}
                                          {formatMontant(
                                            paiement.montant,
                                            devise,
                                          )}
                                        </strong>

                                      </div>
                                    ),
                                  )}

                                </div>

                              </div>
                            )}

                        </div>
                      );
                    },
                  )}

                </div>

              </div>
            ) : (
              <div className="
                flex
                flex-col
                items-center
                justify-center
                px-6
                py-12
                text-center
              ">

                <div className="
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-full
                  bg-base-200
                  text-base-content/40
                ">
                  <CalendarDays
                    size={27}
                  />
                </div>

                <h4 className="mt-4 font-bold">
                  Aucun échéancier
                </h4>

                <p className="
                  mt-1
                  max-w-md
                  text-sm
                  text-base-content/50
                ">
                  Vous pouvez répartir le montant
                  de cette facture sur plusieurs
                  échéances mensuelles.
                </p>

                {canGenerateEcheancier && (
                  <button
                    type="button"
                    className="
                      btn
                      btn-primary
                      mt-5
                      cursor-pointer
                    "
                    disabled={
                      isGenerating
                    }
                    onClick={
                      handleGenerateEcheancier
                    }
                  >
                    {isGenerating ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <CalendarDays
                        size={17}
                      />
                    )}

                    Générer l'échéancier
                  </button>
                )}

              </div>
            )}

          </div>

        </div>

        {/* ===================================================
            DROITE
        =================================================== */}

        <div className="space-y-6">

          {/* ================================================
              INFORMATIONS FACTURE
          ================================================= */}

          <div className="card border border-base-300 bg-base-100 shadow-sm">

            <div className="
              flex
              items-center
              gap-2
              border-b
              border-base-300
              px-5
              py-4
            ">

              <Receipt
                size={18}
                className="text-primary"
              />

              <h3 className="font-bold">
                Informations
              </h3>

            </div>

            <div className="card-body">

              <div className="space-y-4">

                <div className="flex items-start justify-between gap-4">

                  <span className="text-sm text-base-content/50">
                    Numéro
                  </span>

                  <strong className="text-right">
                    {
                      facture.numero
                    }
                  </strong>

                </div>

                <div className="flex items-start justify-between gap-4">

                  <span className="text-sm text-base-content/50">
                    Date d'émission
                  </span>

                  <strong className="text-right">
                    {formatDate(
                      facture.dateEmission,
                    )}
                  </strong>

                </div>

                <div className="flex items-start justify-between gap-4">

                  <span className="text-sm text-base-content/50">
                    Date d'échéance
                  </span>

                  <strong className="text-right">
                    {formatDate(
                      facture.dateEcheance,
                    )}
                  </strong>

                </div>

                <div className="flex items-start justify-between gap-4">

                  <span className="text-sm text-base-content/50">
                    Statut
                  </span>

                  <span
                    className={`
                      badge
                      ${getStatutFactureClass(
                        facture.statut,
                      )}
                    `}
                  >
                    {
                      getStatutFactureLabel(
                        facture.statut,
                      )
                    }
                  </span>

                </div>

              </div>

            </div>

          </div>

          {/* ================================================
              PAIEMENTS RECENTS
          ================================================= */}

          <div className="card border border-base-300 bg-base-100 shadow-sm">

            <div className="
              flex
              items-center
              justify-between
              border-b
              border-base-300
              px-5
              py-4
            ">

              <div className="flex items-center gap-2">

                <CreditCard
                  size={18}
                  className="text-success"
                />

                <h3 className="font-bold">
                  Paiements récents
                </h3>

              </div>

              <span className="badge badge-sm badge-ghost">
                {
                  paiementsEffectues.length
                }
              </span>

            </div>

            <div className="card-body p-0">

              {paiementsRecents.length >
              0 ? (
                <div className="divide-y divide-base-200">

                  {paiementsRecents.map(
                    (
                      paiement,
                    ) => (
                      <div
                        key={
                          paiement.id
                        }
                        className="
                          px-5
                          py-4
                        "
                      >

                        <div className="
                          flex
                          items-start
                          justify-between
                          gap-3
                        ">

                          <div className="min-w-0">

                            <p className="truncate font-semibold">
                              {
                                paiement.reference
                              }
                            </p>

                            <p className="mt-1 text-xs text-base-content/50">
                              {formatDate(
                                paiement.datePaiement,
                              )}
                            </p>

                            <p className="mt-1 text-xs text-base-content/50">
                              {
                                getModeLabel(
                                  paiement.mode,
                                )
                              }
                            </p>

                          </div>

                          <strong className="shrink-0 text-sm text-success">
                            +
                            {" "}
                            {formatMontant(
                              paiement.montant,
                              devise,
                            )}
                          </strong>

                        </div>

                      </div>
                    ),
                  )}

                </div>
              ) : (
                <div className="
                  px-5
                  py-10
                  text-center
                  text-sm
                  text-base-content/50
                ">
                  Aucun paiement enregistré.
                </div>
              )}

            </div>

          </div>

          {/* ================================================
              DATE LIMITE / ALERTE
          ================================================= */}

          {facture.dateEcheance &&
            facture.statut !==
              "PAYEE" &&
            facture.statut !==
              "ANNULEE" && (
              <div className={`
                card
                border
                shadow-sm
                ${
                  new Date(
                    facture.dateEcheance,
                  ).getTime() <
                  Date.now()
                    ? "border-error/30 bg-error/5"
                    : "border-warning/30 bg-warning/5"
                }
              `}>

                <div className="card-body">

                  <div className="flex items-start gap-3">

                    <div className={`
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      ${
                        new Date(
                          facture.dateEcheance,
                        ).getTime() <
                        Date.now()
                          ? "bg-error/10 text-error"
                          : "bg-warning/10 text-warning"
                      }
                    `}>

                      {new Date(
                        facture.dateEcheance,
                      ).getTime() <
                      Date.now() ? (
                        <AlertTriangle
                          size={20}
                        />
                      ) : (
                        <Clock3
                          size={20}
                        />
                      )}

                    </div>

                    <div>

                      <p className="font-semibold">
                        {new Date(
                          facture.dateEcheance,
                        ).getTime() <
                        Date.now()
                          ? "Facture arrivée à échéance"
                          : "Date limite de paiement"}
                      </p>

                      <p className="mt-1 text-sm text-base-content/60">
                        Échéance :
                        {" "}
                        <strong>
                          {formatDate(
                            facture.dateEcheance,
                          )}
                        </strong>
                      </p>

                      {montantDu >
                        0 && (
                        <p className="mt-1 text-sm text-base-content/60">
                          Reste :
                          {" "}
                          <strong>
                            {formatMontant(
                              montantDu,
                              devise,
                            )}
                          </strong>
                        </p>
                      )}

                    </div>

                  </div>

                </div>

              </div>
            )}

          {/* ================================================
              NOTE
          ================================================= */}

          {facture.notes && (
            <div className="card border border-base-300 bg-base-100 shadow-sm">

              <div className="card-body">

                <div className="flex items-center gap-2">

                  <FileText
                    size={18}
                    className="text-primary"
                  />

                  <h3 className="font-bold">
                    Notes
                  </h3>

                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-base-content/70">
                  {
                    facture.notes
                  }
                </p>

              </div>

            </div>
          )}

        </div>

      </div>

      {/* =====================================================
          ACTION RAPIDE MOBILE / BAS DE PAGE
      ===================================================== */}

      {canPay && (
        <div className="
          sticky
          bottom-4
          z-20
          flex
          justify-center
          lg:hidden
        ">

          <button
            type="button"
            className="
              btn
              btn-primary
              btn-lg
              w-full
              max-w-md
              cursor-pointer
              shadow-xl
            "
            disabled={
              paiementLoading
            }
            onClick={() =>
              handlePayment()
            }
          >

            {paiementLoading ? (
              <Loader2
                size={20}
                className="animate-spin"
              />
            ) : (
              <CircleDollarSign
                size={20}
              />
            )}

            Enregistrer un paiement
          </button>

        </div>
      )}

    </div>
  );
}
