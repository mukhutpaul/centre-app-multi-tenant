import { notFound } from "next/navigation"
import Link from "next/link"

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  FileSignature,
  Mail,
  MapPin,
  Phone,
  Users,
  Wallet,
} from "lucide-react"

import type { LucideIcon } from "lucide-react"

import { prisma } from "@/lib/prisma"
import { getCurrentCentreContext } from "@/lib/validations/centre-access"
import ConventionDocumentsPanel from "@/components/conventions/ConventionDocumentsPanel"



export default async function ConventionDetailPage({
  params,
}: {
  params: Promise<{
    id: string
  }>
}) {
  const { id } = await params

  // ============================================================
  // CENTRE CONNECTÉ
  // ============================================================

  const context = await getCurrentCentreContext()

  const centreId = context.centreId

  if (!centreId) {
    notFound()
  }

  // ============================================================
  // CONVENTION
  // ============================================================

  const convention = await prisma.convention.findFirst({
    where: {
      id,
      centreId,
    },

    include: {
      participants: {
        include: {
          inscription: {
            include: {
              apprenant: true,

              session: {
                include: {
                  formation: true,
                },
              },
            },
          },
        },

        orderBy: {
          createdAt: "asc",
        },
      },

      documents: {
        orderBy: {
          creeLe: "desc",
        },
      },
    },
  })

  // ============================================================
  // NOT FOUND
  // ============================================================

  if (!convention) {
    notFound()
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {/* RETOUR */}

          <Link
            href="/conventions"
            aria-label="Retour aux conventions"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          {/* ICON */}

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0f5da8] dark:bg-blue-500/10 dark:text-blue-400">
            <FileSignature className="h-5 w-5" />
          </div>

          {/* TITRE */}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold text-slate-900 dark:text-white">
                {convention.numero}
              </h1>

              <StatusBadge status={convention.statut} />
            </div>

            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              {convention.organisationNom}
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================
          INFORMATIONS PRINCIPALES
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <InfoCard
          icon={Building2}
          label="Organisation"
          value={convention.organisationNom}
        />

        <InfoCard
          icon={CalendarDays}
          label="Période"
          value={`${formatDate(
            convention.dateDebut
          )} → ${formatDate(convention.dateFin)}`}
        />

        <InfoCard
          icon={Wallet}
          label="Montant"
          value={`${formatMoney(
            convention.montant
          )} ${convention.devise}`}
        />
      </div>

      {/* ======================================================
          INFORMATIONS ORGANISATION
      ====================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* SECTION HEADER */}

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <Building2 className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Informations de l'organisation
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Coordonnées et informations générales
            </p>
          </div>
        </div>

        {/* INFORMATIONS */}

        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          <InfoLine
            icon={Building2}
            label="Organisation"
            value={convention.organisationNom}
          />

          <InfoLine
            icon={Users}
            label="Contact"
            value={convention.organisationContact ?? "-"}
          />

          <InfoLine
            icon={Phone}
            label="Téléphone"
            value={convention.organisationTelephone ?? "-"}
          />

          <InfoLine
            icon={Mail}
            label="Email"
            value={convention.organisationEmail ?? "-"}
          />

          <InfoLine
            icon={MapPin}
            label="Adresse"
            value={convention.organisationAdresse ?? "-"}
          />

          <InfoLine
            icon={FileSignature}
            label="Statut"
            value={formatStatus(convention.statut)}
          />
        </div>
      </section>

      {/* ======================================================
          PARTICIPANTS
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* HEADER */}

        <div className="flex items-center gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
            <Users className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Participants
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              {convention.participants.length} participant
              {convention.participants.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* ==================================================
            PARTICIPANTS EXISTANTS
        ================================================== */}

        {convention.participants.length > 0 ? (
          <>
            {/* DESKTOP TABLE */}

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-950">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Apprenant
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Inscription
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Formation
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Session
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Montant
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {convention.participants.map((participant) => {
                    const inscription = participant.inscription
                    const apprenant = inscription.apprenant
                    const session = inscription.session
                    const formation = session.formation

                    return (
                      <tr
                        key={participant.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        {/* APPRENANT */}

                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {apprenant.prenom} {apprenant.nom}
                          </div>

                          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {apprenant.numero ?? "-"}
                          </div>
                        </td>

                        {/* INSCRIPTION */}

                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {inscription.numero}
                        </td>

                        {/* FORMATION */}

                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {formation.nom}
                        </td>

                        {/* SESSION */}

                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {session.nom ?? "-"}
                        </td>

                        {/* MONTANT */}

                        <td className="px-5 py-4 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                          {participant.montant != null
                            ? `${formatMoney(
                                participant.montant
                              )} ${convention.devise}`
                            : "-"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ==================================================
                MOBILE CARDS
            ================================================== */}

            <div className="space-y-3 p-4 md:hidden">
              {convention.participants.map((participant) => {
                const inscription = participant.inscription
                const apprenant = inscription.apprenant
                const session = inscription.session
                const formation = session.formation

                return (
                  <div
                    key={participant.id}
                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    {/* APPRENANT */}

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {apprenant.prenom} {apprenant.nom}
                        </p>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {apprenant.numero ?? "-"}
                        </p>
                      </div>

                      {participant.montant != null && (
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-slate-400">
                            Montant
                          </p>

                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {formatMoney(
                              participant.montant
                            )}{" "}
                            {convention.devise}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* DETAILS */}

                    <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <MobileInfo
                        label="Inscription"
                        value={inscription.numero}
                      />

                      <MobileInfo
                        label="Formation"
                        value={formation.nom}
                      />

                      <MobileInfo
                        label="Session"
                        value={session.nom ?? "-"}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          /* ====================================================
             EMPTY STATE
          ==================================================== */

          <div className="p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <Users className="h-5 w-5" />
            </div>

            <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
              Aucun participant
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Aucun participant n'est actuellement associé à
              cette convention.
            </p>
          </div>
        )}
      </section>

      {/* ======================================================
          OBSERVATIONS
      ====================================================== */}

      {convention.observations && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Observations
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Informations complémentaires liées à la convention
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-400">
              {convention.observations}
            </p>
          </div>
        </section>
      )}

      {/* ======================================================
          DOCUMENTS
      ====================================================== */}

      <ConventionDocumentsPanel
        conventionId={convention.id}
        documents={convention.documents.map((document) => ({
          id: document.id,
          nom: document.nom,
          type: String(document.type),
          urlFichier: document.urlFichier,
          typeMime: document.typeMime,
          taille: document.taille,
        }))}
      />
    </div>
  )
}

/* ============================================================
   INFO CARD
============================================================ */

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0f5da8] dark:bg-blue-500/10 dark:text-blue-400">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-1 truncate font-semibold text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   INFO LINE
============================================================ */

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm text-slate-700 dark:text-slate-300">
          {value}
        </p>
      </div>
    </div>
  )
}

/* ============================================================
   MOBILE INFO
============================================================ */

function MobileInfo({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
        {value}
      </p>
    </div>
  )
}

/* ============================================================
   STATUS BADGE
============================================================ */

function StatusBadge({
  status,
}: {
  status: string
}) {
  const styles: Record<string, string> = {
    BROUILLON:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",

    EN_ATTENTE:
      "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",

    SIGNEE:
      "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",

    ACTIVE:
      "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",

    TERMINEE:
      "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",

    ANNULEE:
      "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",

    EXPIREE:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] ??
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      {formatStatus(status)}
    </span>
  )
}

/* ============================================================
   FORMAT STATUS
============================================================ */

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    BROUILLON: "Brouillon",
    EN_ATTENTE: "En attente",
    SIGNEE: "Signée",
    ACTIVE: "Active",
    TERMINEE: "Terminée",
    ANNULEE: "Annulée",
    EXPIREE: "Expirée",
  }

  return labels[status] ?? status
}

/* ============================================================
   FORMAT DATE
============================================================ */

function formatDate(value: Date | string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

/* ============================================================
   FORMAT MONEY
============================================================ */

function formatMoney(value: unknown) {
  const number = Number(value)

  if (Number.isNaN(number)) {
    return "-"
  }

  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number)
}