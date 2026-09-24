import Link from "next/link";
import {
ArrowLeft,
CalendarDays,
CheckCircle2,
CreditCard,
FileText,
GraduationCap,
Hash,
Receipt,
School,
Users,
UserRound,
Wallet,
} from "lucide-react";

import { getPaiement } from "@/actions/paiement-actions";

export const dynamic = "force-dynamic";

type Props = {
params: Promise<{
id: string;
}>;
};

export default async function PaiementDetailPage({
params,
}: Props) {
const { id } = await params;

const result = await getPaiement(id);

if (!result.success || !result.data) {
return ( <div className="mx-auto w-full max-w-4xl p-6"> <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/40 dark:bg-red-950/20"> <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"> <Receipt className="h-6 w-6" /> </div>


      <h1 className="mt-4 text-lg font-semibold text-red-900 dark:text-red-200">
        Paiement introuvable
      </h1>

      <p className="mt-2 text-sm text-red-700 dark:text-red-300">
        {result.message ||
          "Impossible de récupérer les informations de ce paiement."}
      </p>

      <Link
        href="/paiements"
        className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux paiements
      </Link>
    </div>
  </div>
);


}

const paiement = result.data;

const isRegular = paiement.type === "PAIEMENT_REGULIER";
const isConvention =
paiement.type === "REGLEMENT_FACTURE_CONVENTION";

const apprenant =
paiement.apprenant ??
paiement.inscription?.apprenant ??
null;

const inscription = paiement.inscription ?? null;
const session = inscription?.session ?? null;
const formation = session?.formation ?? null;
const tarif = paiement.tarifFormation ?? null;
const facture = paiement.facture ?? null;
const convention = facture?.convention ?? null;
const echeance = paiement.echeance ?? null;

const participants = convention?.participants ?? [];

const devise =
paiement.devise ||
tarif?.devise ||
convention?.devise ||
"USD";

const montant = Number(paiement.montant ?? 0);

const nomApprenant = apprenant
? `${apprenant.prenom ?? ""} ${apprenant.nom ?? ""}`.trim()
: "Apprenant non renseigné";

return ( <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950"> <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">


    {/* HEADER */}

    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <Link
          href="/paiements"
          className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux paiements
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Receipt className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Détail du paiement
            </h1>

            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Hash className="h-3.5 w-3.5" />
              {paiement.reference}
            </p>
          </div>
        </div>
      </div>

      <StatusBadge status={paiement.statut} />
    </div>

    {/* MONTANT */}

    <section className="overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 shadow-lg shadow-blue-900/10">
      <div className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-100">
              Montant du paiement
            </p>

            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                {formatNumber(montant)}
              </span>

              <span className="text-lg font-semibold text-blue-100">
                {devise}
              </span>
            </div>

            <p className="mt-2 text-sm text-blue-100/80">
              Référence : {paiement.reference}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur">
              <CreditCard className="h-4 w-4" />
              {formatMode(paiement.mode)}
            </span>

            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur">
              {isRegular ? (
                <UserRound className="h-4 w-4" />
              ) : (
                <Receipt className="h-4 w-4" />
              )}

              {formatType(paiement.type)}
            </span>
          </div>
        </div>
      </div>
    </section>

    {/* INFORMATIONS PRINCIPALES */}

    <div className="grid gap-6 lg:grid-cols-2">

      <Section
        title="Informations du paiement"
        description="Informations générales de l'opération"
        icon={<CreditCard className="h-5 w-5" />}
      >
        <Info
          label="Référence"
          value={paiement.reference}
          icon={<Hash className="h-4 w-4" />}
        />

        <Info
          label="Date du paiement"
          value={
            paiement.datePaiement
              ? formatDate(paiement.datePaiement)
              : "Non renseignée"
          }
          icon={<CalendarDays className="h-4 w-4" />}
        />

        <Info
          label="Mode de paiement"
          value={formatMode(paiement.mode)}
          icon={<Wallet className="h-4 w-4" />}
        />

        <Info
          label="Devise"
          value={devise}
          icon={<CreditCard className="h-4 w-4" />}
        />

        <Info
          label="Référence transaction"
          value={
            paiement.referenceTransaction ||
            "Aucune référence"
          }
          icon={<Hash className="h-4 w-4" />}
        />

        <Info
          label="Statut"
          value={formatStatus(paiement.statut)}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </Section>

      <Section
        title={
          isConvention
            ? "Informations du règlement"
            : "Apprenant"
        }
        description={
          isConvention
            ? "Informations générales du règlement de convention"
            : "Informations de la personne concernée"
        }
        icon={<UserRound className="h-5 w-5" />}
      >
        {!isConvention && (
          <>
            <Info
              label="Nom complet"
              value={nomApprenant}
              icon={<UserRound className="h-4 w-4" />}
            />

            <Info
              label="Numéro apprenant"
              value={
                apprenant?.numero
                  ? String(apprenant.numero)
                  : "—"
              }
              icon={<Hash className="h-4 w-4" />}
            />

            <Info
              label="Inscription"
              value={inscription?.numero || "—"}
              icon={<Receipt className="h-4 w-4" />}
            />

            <Info
              label="Formation"
              value={formation?.nom || "—"}
              icon={
                <GraduationCap className="h-4 w-4" />
              }
            />

            <Info
              label="Code formation"
              value={formation?.code || "—"}
              icon={<Hash className="h-4 w-4" />}
            />

            <Info
              label="Session"
              value={
                session?.nom ||
                session?.code ||
                "—"
              }
              icon={<School className="h-4 w-4" />}
            />
          </>
        )}

        {isConvention && (
          <>
            <Info
              label="Facture"
              value={facture?.numero || "—"}
              icon={<FileText className="h-4 w-4" />}
            />

            <Info
              label="Convention"
              value={convention?.numero || "—"}
              icon={<Receipt className="h-4 w-4" />}
            />

            <Info
              label="Organisation"
              value={
                convention?.organisationNom || "—"
              }
              icon={<School className="h-4 w-4" />}
            />

            <Info
              label="Nombre d'étudiants"
              value={String(participants.length)}
              icon={<Users className="h-4 w-4" />}
            />
          </>
        )}
      </Section>
    </div>

    {/* PAIEMENT RÉGULIER */}

    {isRegular && (
      <Section
        title="Détails des frais"
        description="Tarif utilisé pour ce paiement"
        icon={<Wallet className="h-5 w-5" />}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Frais"
            value={tarif?.nom || "—"}
          />

          <MetricCard
            label="Montant du tarif"
            value={
              tarif
                ? `${formatNumber(tarif.montant)} ${tarif.devise}`
                : "—"
            }
          />

          <MetricCard
            label="Statut du tarif"
            value={
              tarif?.actif
                ? "Actif"
                : "Inactif"
            }
          />
        </div>

        {tarif?.description && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Description
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
              {tarif.description}
            </p>
          </div>
        )}
      </Section>
    )}

    {/* CONVENTION */}

    {isConvention && (
      <>
        <Section
          title="Facture de convention"
          description="Informations liées au règlement de la convention"
          icon={<Receipt className="h-5 w-5" />}
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Facture"
              value={facture?.numero || "—"}
            />

            <MetricCard
              label="Convention"
              value={convention?.numero || "—"}
            />

            <MetricCard
              label="Organisation"
              value={
                convention?.organisationNom || "—"
              }
            />

            <MetricCard
              label="Échéance"
              value={
                echeance?.numero
                  ? `Échéance ${echeance.numero}`
                  : "—"
              }
            />
          </div>
        </Section>

        {/* ÉTUDIANTS DE LA CONVENTION */}

        <Section
          title="Étudiants liés à la convention"
          description="Tous les apprenants concernés par cette convention"
          icon={<Users className="h-5 w-5" />}
        >
          {participants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="px-4 py-4 text-left font-semibold text-slate-500">
                      #
                    </th>

                    <th className="px-4 py-4 text-left font-semibold text-slate-500">
                      Étudiant
                    </th>

                    <th className="px-4 py-4 text-left font-semibold text-slate-500">
                      N° apprenant
                    </th>

                    <th className="px-4 py-4 text-left font-semibold text-slate-500">
                      Inscription
                    </th>

                    <th className="px-4 py-4 text-left font-semibold text-slate-500">
                      Formation
                    </th>

                    <th className="px-4 py-4 text-left font-semibold text-slate-500">
                      Session
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {participants.map(
                    (participant, index) => {
                      const participantApprenant =
                        participant.apprenant;

                      const participantInscription =
                        participant.inscription;

                      const participantSession =
                        participantInscription?.session;

                      const participantFormation =
                        participantSession?.formation;

                      return (
                        <tr
                          key={participant.id}
                          className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-4 py-4 font-medium text-slate-400">
                            {index + 1}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                                <UserRound className="h-4 w-4" />
                              </div>

                              <p className="font-semibold text-slate-900 dark:text-white">
                                {participantApprenant?.prenom}{" "}
                                {participantApprenant?.nom}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                            {participantApprenant?.numero ||
                              "—"}
                          </td>

                          <td className="px-4 py-4 font-medium text-slate-700 dark:text-slate-200">
                            {participantInscription?.numero ||
                              "—"}
                          </td>

                          <td className="px-4 py-4">
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">
                                {participantFormation?.nom ||
                                  "—"}
                              </p>

                              {participantFormation?.code && (
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {participantFormation.code}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                            {participantSession?.nom ||
                              "—"}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                <Users className="h-6 w-6" />
              </div>

              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                Aucun étudiant associé
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Aucun apprenant n'est actuellement lié à cette convention.
              </p>
            </div>
          )}
        </Section>
      </>
    )}

    {/* SITUATION ÉCHÉANCE */}

    {isConvention && echeance && (
      <Section
        title="Situation de l'échéance"
        description="État financier de l'échéance concernée"
        icon={<CalendarDays className="h-5 w-5" />}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Montant échéance"
            value={`${formatNumber(
              echeance.montant,
            )} ${devise}`}
          />

          <MetricCard
            label="Déjà payé"
            value={`${formatNumber(
              echeance.montantPaye,
            )} ${devise}`}
          />

          <MetricCard
            label="Reste à payer"
            value={`${formatNumber(
              echeance.montantDu,
            )} ${devise}`}
            highlight
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-500">
            Statut de l'échéance :
          </span>

          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            {formatEcheanceStatus(echeance.statut)}
          </span>

          <span className="text-sm text-slate-500">
            Date :
          </span>

          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {echeance.dateEcheance
              ? formatDate(echeance.dateEcheance)
              : "—"}
          </span>
        </div>
      </Section>
    )}

    {/* SITUATION FACTURE */}

    {isConvention && facture && (
      <Section
        title="Situation de la facture"
        description="État financier de la facture"
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total facture"
            value={`${formatNumber(
              facture.total,
            )} ${devise}`}
          />

          <MetricCard
            label="Montant payé"
            value={`${formatNumber(
              facture.montantPaye,
            )} ${devise}`}
          />

          <MetricCard
            label="Montant dû"
            value={`${formatNumber(
              facture.montantDu,
            )} ${devise}`}
            highlight
          />
        </div>
      </Section>
    )}

    {/* NOTES */}

    {paiement.notes && (
      <Section
        title="Notes"
        description="Informations complémentaires"
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">
            {paiement.notes}
          </p>
        </div>
      </Section>
    )}

    {/* ACTIONS */}

    <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between dark:border-slate-800">
      <Link
        href="/paiements"
        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux paiements
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/paiements/${paiement.id}/modifier`}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Modifier le paiement
        </Link>

        <a
          href={`/api/paiements/${paiement.id}/recu`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
        >
          <Receipt className="h-4 w-4" />
          Imprimer le reçu
        </a>
      </div>
    </div>
  </div>
</div>


);
}

/* ============================================================
SECTION
============================================================ */

function Section({
title,
description,
icon,
children,
}: {
title: string;
description?: string;
icon: React.ReactNode;
children: React.ReactNode;
}) {
return ( <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"> <div className="border-b border-slate-100 px-5 py-5 sm:px-6 dark:border-slate-800"> <div className="flex items-center gap-3"> <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
{icon} </div>


      <div>
        <h2 className="font-semibold text-slate-900 dark:text-white">
          {title}
        </h2>

        {description && (
          <p className="mt-0.5 text-xs text-slate-500">
            {description}
          </p>
        )}
      </div>
    </div>
  </div>

  <div className="space-y-0 px-5 sm:px-6">
    {children}
  </div>
</section>


);
}

/* ============================================================
INFO
============================================================ */

function Info({
label,
value,
icon,
}: {
label: string;
value: string;
icon?: React.ReactNode;
}) {
return ( <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-0 dark:border-slate-800"> <div className="flex min-w-0 items-center gap-2.5">
{icon && ( <span className="shrink-0 text-slate-400">
{icon} </span>
)}


    <span className="text-sm text-slate-500 dark:text-slate-400">
      {label}
    </span>
  </div>

  <span className="max-w-[60%] text-right text-sm font-semibold text-slate-900 dark:text-white">
    {value}
  </span>
</div>


);
}

/* ============================================================
METRIC CARD
============================================================ */

function MetricCard({
label,
value,
highlight = false,
}: {
label: string;
value: string;
highlight?: boolean;
}) {
return (
<div
className={`rounded-xl border p-4 ${
        highlight
          ? "border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20"
          : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
      }`}
> <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
{label} </p>


  <p
    className={`mt-2 break-words text-sm font-bold ${
      highlight
        ? "text-blue-700 dark:text-blue-300"
        : "text-slate-900 dark:text-white"
    }`}
  >
    {value}
  </p>
</div>


);
}

/* ============================================================
STATUS BADGE
============================================================ */

function StatusBadge({
status,
}: {
status: string;
}) {
const classes: Record<string, string> = {
EFFECTUE:
"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",


EN_ATTENTE:
  "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",

ECHEC:
  "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",

ANNULE:
  "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",

REMBOURSE:
  "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",


};

return (
<span
className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
        classes[status] ??
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }`}
> <span className="h-2 w-2 rounded-full bg-current" />
{formatStatus(status)} </span>
);
}

/* ============================================================
TYPE
============================================================ */

function formatType(type: string) {
switch (type) {
case "PAIEMENT_REGULIER":
return "Paiement régulier";


case "REGLEMENT_FACTURE_CONVENTION":
  return "Règlement convention";

default:
  return type;


}
}

/* ============================================================
MODE
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
STATUT
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
STATUT ÉCHÉANCE
============================================================ */

function formatEcheanceStatus(status: string) {
const labels: Record<string, string> = {
EN_ATTENTE: "En attente",
PARTIELLE: "Partiellement payée",
PAYEE: "Payée",
EN_RETARD: "En retard",
ANNULEE: "Annulée",
};

return labels[status] ?? status;
}

/* ============================================================
DATE
============================================================ */

function formatDate(date: Date | string) {
return new Intl.DateTimeFormat("fr-FR", {
dateStyle: "medium",
timeStyle: "short",
}).format(new Date(date));
}

/* ============================================================
NOMBRE
============================================================ */

function formatNumber(value: unknown) {
return Number(value ?? 0).toLocaleString("fr-FR", {
minimumFractionDigits: 2,
maximumFractionDigits: 2,
});
}