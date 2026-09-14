"use client";

import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Pencil,
  Phone,
  User,
  Users,
} from "lucide-react";

import { useRouter } from "next/navigation";

type Props = {
  inscription: any;
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
  ENTREPRISE: "Entreprise",
  ETAT: "État",
  PARTENAIRE: "Partenaire",
  BOURSE: "Bourse",
  AUTRE: "Autre",
};

function formatDate(
  value: string | Date | null | undefined,
) {
  if (!value) {
    return "—";
  }

  return new Date(
    value,
  ).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateLong(
  value: string | Date | null | undefined,
) {
  if (!value) {
    return "—";
  }

  return new Date(
    value,
  ).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatMontant(value: any) {
  return Number(
    value || 0,
  ).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-gray-500">
          {label}
        </p>

        <p className="mt-0.5 break-words font-medium text-gray-900">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            {label}
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {description}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function InscriptionDetailClient({
  inscription,
}: Props) {
  const router = useRouter();

  const apprenant =
    inscription.apprenant;

  const session =
    inscription.session;

  const formation =
    session?.formation;

  const counts =
    inscription._count || {};

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* =====================================================
          BARRE SUPÉRIEURE
      ====================================================== */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/inscriptions",
              )
            }
            title="Retour aux inscriptions"
            className="cursor-pointer rounded-lg border bg-white p-2.5 text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {inscription.numero}
              </h1>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  statutClasses[
                    inscription.statut
                  ] ||
                  "bg-gray-100 text-gray-700"
                }`}
              >
                {statutLabels[
                  inscription.statut
                ] ||
                  inscription.statut}
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              Détail de l'inscription
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push(
              `/inscriptions/${inscription.id}/modifier`,
            )
          }
          className="cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
        >
          <span className="flex items-center justify-center gap-2">
            <Pencil className="h-4 w-4" />
            Modifier
          </span>
        </button>
      </div>

      {/* =====================================================
          RÉSUMÉ
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CreditCard}
          label="Montant convenu"
          value={`${formatMontant(
            inscription.montantConvenu,
          )}`}
          description={
            financementLabels[
              inscription.typeFinancement
            ] ||
            inscription.typeFinancement
          }
        />

        <StatCard
          icon={FileText}
          label="Factures"
          value={counts.factures ?? 0}
          description="Facture(s) liée(s)"
        />

        <StatCard
          icon={CreditCard}
          label="Paiements"
          value={counts.paiements ?? 0}
          description="Paiement(s) enregistré(s)"
        />

        <StatCard
          icon={ClipboardList}
          label="Présences"
          value={counts.presences ?? 0}
          description="Présence(s) enregistrée(s)"
        />
      </div>

      {/* =====================================================
          APPRENANT + INSCRIPTION
      ====================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* APPRENANT */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <User className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">
                Informations de l'apprenant
              </h2>

              <p className="text-xs text-gray-500">
                Identité et coordonnées
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
            <InfoItem
              icon={User}
              label="Nom complet"
              value={`${apprenant?.nom || ""} ${
                apprenant?.prenom || ""
              }`}
            />

            <InfoItem
              icon={ClipboardList}
              label="Numéro apprenant"
              value={
                apprenant?.numero ||
                "—"
              }
            />

            <InfoItem
              icon={Phone}
              label="Téléphone"
              value={
                apprenant?.telephone
              }
            />

            <InfoItem
              icon={Mail}
              label="Email"
              value={
                apprenant?.email
              }
            />

            <InfoItem
              icon={CalendarDays}
              label="Date de naissance"
              value={formatDate(
                apprenant?.dateNaissance,
              )}
            />

            <InfoItem
              icon={Users}
              label="Sexe"
              value={
                apprenant?.sexe ||
                "—"
              }
            />

            <InfoItem
              icon={MapPin}
              label="Ville"
              value={
                apprenant?.ville
              }
            />

            <InfoItem
              icon={MapPin}
              label="Adresse"
              value={
                apprenant?.adresse
              }
            />
          </div>
        </div>

        {/* INSCRIPTION */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <ClipboardList className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">
                Informations de l'inscription
              </h2>

              <p className="text-xs text-gray-500">
                Données administratives
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
            <InfoItem
              icon={ClipboardList}
              label="Numéro"
              value={
                inscription.numero
              }
            />

            <InfoItem
              icon={CalendarDays}
              label="Date d'inscription"
              value={formatDateLong(
                inscription.dateInscription,
              )}
            />

            <InfoItem
              icon={Users}
              label="Statut"
              value={
                statutLabels[
                  inscription.statut
                ] ||
                inscription.statut
              }
            />

            <InfoItem
              icon={CreditCard}
              label="Financement"
              value={
                financementLabels[
                  inscription
                    .typeFinancement
                ] ||
                inscription.typeFinancement
              }
            />

            <InfoItem
              icon={CreditCard}
              label="Montant convenu"
              value={`${formatMontant(
                inscription.montantConvenu,
              )}`}
            />

            <InfoItem
              icon={CalendarDays}
              label="Créée le"
              value={formatDateLong(
                inscription.creeLe,
              )}
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          FORMATION
      ====================================================== */}

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
            <GraduationCap className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">
              Formation
            </h2>

            <p className="text-xs text-gray-500">
              Formation et session concernées
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem
            icon={GraduationCap}
            label="Formation"
            value={
              formation?.nom
            }
          />

          <InfoItem
            icon={ClipboardList}
            label="Code formation"
            value={
              formation?.code
            }
          />

          <InfoItem
            icon={Users}
            label="Session"
            value={
              session?.nom ||
              session?.code
            }
          />

          <InfoItem
            icon={CalendarDays}
            label="Début"
            value={formatDate(
              session?.dateDebut,
            )}
          />

          <InfoItem
            icon={CalendarDays}
            label="Fin"
            value={formatDate(
              session?.dateFin,
            )}
          />

          <InfoItem
            icon={Users}
            label="Capacité"
            value={
              session?.capacite ??
              "Illimitée"
            }
          />

          <InfoItem
            icon={ClipboardList}
            label="Code session"
            value={
              session?.code
            }
          />

          <InfoItem
            icon={Users}
            label="Statut session"
            value={
              session?.statut
            }
          />
        </div>
      </div>

      {/* =====================================================
          NOTES
      ====================================================== */}

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
            <FileText className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">
              Notes
            </h2>

            <p className="text-xs text-gray-500">
              Informations complémentaires
            </p>
          </div>
        </div>

        <div className="p-5">
          {inscription.notes ? (
            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
              {inscription.notes}
            </p>
          ) : (
            <p className="text-sm italic text-gray-400">
              Aucune note pour cette
              inscription.
            </p>
          )}
        </div>
      </div>

      {/* =====================================================
          MODULES À VENIR
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-dashed bg-gray-50 p-5">
          <FileText className="mb-3 h-5 w-5 text-gray-500" />

          <h3 className="font-semibold">
            Facturation
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {counts.factures ?? 0} facture(s)
          </p>
        </div>

        <div className="rounded-xl border border-dashed bg-gray-50 p-5">
          <CreditCard className="mb-3 h-5 w-5 text-gray-500" />

          <h3 className="font-semibold">
            Paiements
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {counts.paiements ?? 0} paiement(s)
          </p>
        </div>

        <div className="rounded-xl border border-dashed bg-gray-50 p-5">
          <CalendarDays className="mb-3 h-5 w-5 text-gray-500" />

          <h3 className="font-semibold">
            Présences
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {counts.presences ?? 0} présence(s)
          </p>
        </div>

        <div className="rounded-xl border border-dashed bg-gray-50 p-5">
          <GraduationCap className="mb-3 h-5 w-5 text-gray-500" />

          <h3 className="font-semibold">
            Évaluations
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {counts.evaluations ?? 0} évaluation(s)
          </p>
        </div>
      </div>
    </div>
  );
}