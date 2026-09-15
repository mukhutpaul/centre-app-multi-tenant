"use client";

import {
ArrowLeft,
Banknote,
CalendarDays,
CheckCircle2,
CreditCard,
Edit,
FileText,
Hash,
MessageSquare,
Receipt,
UserRound,
WalletCards,
XCircle,
Clock3,
RefreshCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
paiement: any;
devise?: string;
};

/* =========================================================
UTILITAIRES
========================================================= */

function getString(value: unknown): string {
if (value === null || value === undefined) {
return "";
}

return String(value);
}

function getNumber(value: unknown): number {
if (typeof value === "number") {
return value;
}

if (
typeof value === "object" &&
value !== null &&
"toString" in value
) {
return Number(String(value));
}

return Number(value ?? 0);
}

function formatMoney(value: unknown) {
return new Intl.NumberFormat("fr-FR", {
minimumFractionDigits: 0,
maximumFractionDigits: 2,
}).format(getNumber(value));
}

function formatDate(value: unknown) {
if (!value) {
return "—";
}

const date = new Date(String(value));

if (Number.isNaN(date.getTime())) {
return "—";
}

return new Intl.DateTimeFormat("fr-FR", {
day: "2-digit",
month: "long",
year: "numeric",
}).format(date);
}

/* =========================================================
MODE DE PAIEMENT
========================================================= */

function getModeLabel(mode: string) {
switch (mode) {
case "ESPECES":
return "Espèces";


case "VIREMENT":
  return "Virement bancaire";

case "MOBILE_MONEY":
  return "Mobile Money";

case "CARTE":
  return "Carte bancaire";

case "CHEQUE":
  return "Chèque";

case "AUTRE":
  return "Autre";

default:
  return mode || "—";


}
}

/* =========================================================
STATUT
========================================================= */

function getStatusConfig(statut: string) {
switch (statut) {
case "EFFECTUE":
return {
label: "Effectué",
className:
"bg-success/10 text-success",
icon: CheckCircle2,
};


case "EN_ATTENTE":
  return {
    label: "En attente",
    className:
      "bg-warning/10 text-warning",
    icon: Clock3,
  };

case "ECHEC":
  return {
    label: "Échec",
    className:
      "bg-error/10 text-error",
    icon: XCircle,
  };

case "ANNULE":
  return {
    label: "Annulé",
    className:
      "bg-base-content/10 text-base-content/70",
    icon: XCircle,
  };

case "REMBOURSE":
  return {
    label: "Remboursé",
    className:
      "bg-info/10 text-info",
    icon: RefreshCcw,
  };

default:
  return {
    label: statut || "—",
    className:
      "bg-base-content/10 text-base-content/70",
    icon: WalletCards,
  };


}
}

/* =========================================================
ITEM INFORMATION
========================================================= */

function InfoItem({
icon: Icon,
label,
value,
}: {
icon: React.ElementType;
label: string;
value: React.ReactNode;
}) {
return ( <div className="rounded-2xl border border-base-300 bg-base-100 p-4">


  <div className="mb-2 flex items-center gap-2 text-sm text-base-content/50">
    <Icon size={16} />
    <span>{label}</span>
  </div>

  <div className="break-words text-sm font-semibold text-base-content">
    {value || "—"}
  </div>

</div>


);
}

/* =========================================================
COMPOSANT PRINCIPAL
========================================================= */

export default function PaiementDetail({
paiement,
devise = "USD",
}: Props) {
const router = useRouter();

/* =======================================================
DEVISE DU CENTRE
USD par défaut
======================================================= */

const deviseAffichee =
devise?.trim() || "USD";

const apprenant =
paiement?.apprenant ?? null;

const inscription =
paiement?.inscription ?? null;

const facture =
paiement?.facture ?? null;

const echeance =
paiement?.echeance ?? null;

const statut = getString(
paiement?.statut,
);

const statusConfig =
getStatusConfig(statut);

const StatusIcon =
statusConfig.icon;

const apprenantNom = apprenant
? `${getString(apprenant.prenom)} ${getString(apprenant.nom)}`.trim()
: "—";

const inscriptionNumero =
getString(inscription?.numero);

const formationNom =
getString(
inscription?.session?.formation?.nom,
);

return ( <div className="min-h-full pb-10">


  {/* =====================================================
      HEADER
  ====================================================== */}

  <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

    <div className="flex items-start gap-3">

      <button
        type="button"
        onClick={() =>
          router.push("/paiements")
        }
        className="btn btn-ghost btn-sm mt-1 rounded-xl"
      >
        <ArrowLeft size={18} />
      </button>

      <div>

        <div className="mb-1 flex flex-wrap items-center gap-3">

          <h1 className="text-2xl font-bold sm:text-3xl">
            Paiement
          </h1>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${statusConfig.className}`}
          >
            <StatusIcon size={14} />
            {statusConfig.label}
          </span>

        </div>

        <p className="text-sm text-base-content/60">

          Référence :{" "}

          <span className="font-semibold text-base-content">
            {getString(
              paiement?.reference,
            )}
          </span>

        </p>

      </div>

    </div>

    <div>

      <button
        type="button"
        onClick={() =>
          router.push(
            `/paiements/${paiement.id}/modifier`,
          )
        }
        className="btn btn-primary rounded-xl"
      >
        <Edit size={17} />
        Modifier
      </button>

    </div>

  </div>

  {/* =====================================================
      MONTANT
  ====================================================== */}

  <div className="mb-6 rounded-3xl bg-primary p-6 text-primary-content shadow-lg">

    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

      <div>

        <p className="text-sm font-medium opacity-80">
          Montant du paiement
        </p>

        <p className="mt-1 text-3xl font-black sm:text-4xl">
          {formatMoney(
            paiement?.montant,
          )}{" "}
          {deviseAffichee}
        </p>

      </div>

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
        <Banknote size={28} />
      </div>

    </div>

  </div>

  {/* =====================================================
      INFORMATIONS PRINCIPALES
  ====================================================== */}

  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

    {/* ===================================================
        BÉNÉFICIAIRE
    ==================================================== */}

    <div className="card border border-base-300 bg-base-100 shadow-sm">

      <div className="card-body">

        <div className="mb-5 flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserRound size={19} />
          </div>

          <div>

            <h2 className="font-bold">
              Bénéficiaire
            </h2>

            <p className="text-sm text-base-content/50">
              Apprenant concerné
            </p>

          </div>

        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

          <InfoItem
            icon={UserRound}
            label="Apprenant"
            value={apprenantNom}
          />

          <InfoItem
            icon={Hash}
            label="ID apprenant"
            value={getString(
              paiement?.apprenantId,
            )}
          />

          <InfoItem
            icon={FileText}
            label="Inscription"
            value={
              inscriptionNumero ||
              getString(
                paiement?.inscriptionId,
              )
            }
          />

          <InfoItem
            icon={WalletCards}
            label="Formation"
            value={
              formationNom || "—"
            }
          />

        </div>

      </div>

    </div>

    {/* ===================================================
        PAIEMENT
    ==================================================== */}

    <div className="card border border-base-300 bg-base-100 shadow-sm">

      <div className="card-body">

        <div className="mb-5 flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
            <Receipt size={19} />
          </div>

          <div>

            <h2 className="font-bold">
              Informations du paiement
            </h2>

            <p className="text-sm text-base-content/50">
              Détails de l'opération
            </p>

          </div>

        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

          <InfoItem
            icon={Receipt}
            label="Référence"
            value={getString(
              paiement?.reference,
            )}
          />

          <InfoItem
            icon={WalletCards}
            label="Mode"
            value={getModeLabel(
              getString(
                paiement?.mode,
              ),
            )}
          />

          <InfoItem
            icon={CalendarDays}
            label="Date"
            value={formatDate(
              paiement?.datePaiement,
            )}
          />

          <InfoItem
            icon={CreditCard}
            label="Transaction"
            value={
              getString(
                paiement?.referenceTransaction,
              ) || "—"
            }
          />

        </div>

      </div>

    </div>

  </div>

  {/* =====================================================
      RATTACHEMENTS
  ====================================================== */}

  <div className="mt-6 card border border-base-300 bg-base-100 shadow-sm">

    <div className="card-body">

      <div className="mb-5 flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/10 text-info">
          <FileText size={19} />
        </div>

        <div>

          <h2 className="font-bold">
            Rattachements financiers
          </h2>

          <p className="text-sm text-base-content/50">
            Facture et échéance associées
          </p>

        </div>

      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

        <InfoItem
          icon={Receipt}
          label="Facture"
          value={
            facture
              ? getString(
                  facture.numero,
                ) ||
                getString(
                  paiement?.factureId,
                )
              : "Aucune facture"
          }
        />

        <InfoItem
          icon={CalendarDays}
          label="Échéance"
          value={
            echeance
              ? getString(
                  echeance.numero,
                ) ||
                getString(
                  paiement?.echeanceId,
                )
              : "Aucune échéance"
          }
        />

      </div>

    </div>

  </div>

  {/* =====================================================
      NOTES
  ====================================================== */}

  {paiement?.notes && (

    <div className="mt-6 card border border-base-300 bg-base-100 shadow-sm">

      <div className="card-body">

        <div className="mb-4 flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <MessageSquare size={19} />
          </div>

          <h2 className="font-bold">
            Notes
          </h2>

        </div>

        <div className="rounded-2xl bg-base-200 p-4 text-sm leading-7 text-base-content/80">
          {getString(
            paiement.notes,
          )}
        </div>

      </div>

    </div>

  )}

  {/* =====================================================
      FOOTER
  ====================================================== */}

  <div className="mt-6 flex justify-start">

    <button
      type="button"
      onClick={() =>
        router.push("/paiements")
      }
      className="btn btn-outline rounded-xl"
    >
      <ArrowLeft size={17} />
      Retour aux paiements
    </button>

  </div>

</div>


);
}
