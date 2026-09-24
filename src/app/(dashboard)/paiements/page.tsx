
import Link from "next/link"
import {
  CreditCard,
  Plus,
  Search,
  Receipt,
  UserRound,
  Wallet,
} from "lucide-react"
import type { ReactNode } from "react"

import { getPaiements } from "@/actions/paiement-actions"
import PaiementsTable from "@/components/paiements/paiements-table"

type SearchParams = Promise<{
  recherche?: string
  type?: string
  mode?: string
  statut?: string
}>

type PaiementPageData = {
  id: string
  reference: string
  type: string
  montant: number
  devise: string
  mode: string
  statut: string
  datePaiement: string | null
  referenceTransaction: string | null
  notes: string | null

  apprenant: {
    id: string
    nom: string
    prenom: string
  } | null

  inscription: {
    id: string
    numero: string
    formation: {
      id: string
      code: string
      nom: string
    }
  } | null

  tarifFormation: {
    id: string
    nom: string
    description: string | null
    montant: number
    devise: string
    actif: boolean
  } | null

  facture: {
    id: string
    numero: string
    total: number
    montantPaye: number
    montantDu: number
    statut: string
    convention: {
      id: string
      numero: string
      organisationNom: string
      montant: number
      devise: string
    } | null
  } | null

  echeance: {
    id: string
    numero: string
    dateEcheance: string
    montant: number
    montantPaye: number
    montantDu: number
    statut: string
  } | null
}

function dateToISOString(
  value: Date | string | null | undefined
): string | null {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString()
}

export default async function PaiementsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams

  /*
   * getPaiements() retourne un Result :
   *
   * {
   *   success: true,
   *   message: "...",
   *   data: [...]
   * }
   */
  const result = await getPaiements()

  if (!result.success) {
    throw new Error(result.message)
  }

  const paiements = result.data ?? []

  /*
   * On applique les filtres ici.
   *
   * Ton action getPaiements() actuelle ne reçoit pas encore
   * de paramètres de recherche.
   */
  const recherche =
    params.recherche?.trim().toLowerCase() ?? ""

  const type = params.type ?? "TOUS"
  const mode = params.mode ?? "TOUS"
  const statut = params.statut ?? "TOUS"

  const paiementsFiltres = paiements.filter(
    (paiement) => {
      const apprenantNom =
        paiement.apprenant
          ? `${paiement.apprenant.prenom} ${paiement.apprenant.nom}`
          : ""

      const inscriptionNumero =
        paiement.inscription?.numero ?? ""

      const factureNumero =
        paiement.facture?.numero ?? ""

      const reference =
        paiement.reference ?? ""

      const rechercheCorrespond =
        recherche === "" ||
        reference
          .toLowerCase()
          .includes(recherche) ||
        apprenantNom
          .toLowerCase()
          .includes(recherche) ||
        inscriptionNumero
          .toLowerCase()
          .includes(recherche) ||
        factureNumero
          .toLowerCase()
          .includes(recherche)

      const typeCorrespond =
        type === "TOUS" ||
        paiement.type === type

      const modeCorrespond =
        mode === "TOUS" ||
        paiement.mode === mode

      const statutCorrespond =
        statut === "TOUS" ||
        paiement.statut === statut

      return (
        rechercheCorrespond &&
        typeCorrespond &&
        modeCorrespond &&
        statutCorrespond
      )
    }
  )

  const serializedPaiements: PaiementPageData[] =
    paiementsFiltres.map((paiement) => ({
      id: paiement.id,

      reference: paiement.reference,

      type: paiement.type,

      montant: Number(paiement.montant),

      devise: paiement.devise,

      mode: paiement.mode,

      statut: paiement.statut,

      datePaiement: dateToISOString(
        paiement.datePaiement
      ),

      referenceTransaction:
        paiement.referenceTransaction,

      notes: paiement.notes,

      apprenant: paiement.apprenant
        ? {
            id: paiement.apprenant.id,
            nom: paiement.apprenant.nom,
            prenom: paiement.apprenant.prenom,
          }
        : null,

      inscription: paiement.inscription
        ? {
            id: paiement.inscription.id,
            numero: paiement.inscription.numero,

            formation:
              paiement.inscription.session
                .formation,
          }
        : null,

      /*
       * IMPORTANT :
       * TarifFormation n'a plus de champ "type".
       *
       * On utilise "nom" comme désignation du tarif.
       */
      tarifFormation:
        paiement.tarifFormation
          ? {
              id:
                paiement.tarifFormation.id,

              nom:
                paiement.tarifFormation.nom,

              description:
                paiement.tarifFormation
                  .description,

              montant: Number(
                paiement.tarifFormation
                  .montant
              ),

              devise:
                paiement.tarifFormation
                  .devise,

              actif:
                paiement.tarifFormation
                  .actif,
            }
          : null,

      facture: paiement.facture
        ? {
            id: paiement.facture.id,

            numero:
              paiement.facture.numero,

            total: Number(
              paiement.facture.total
            ),

            montantPaye: Number(
              paiement.facture
                .montantPaye
            ),

            montantDu: Number(
              paiement.facture
                .montantDu
            ),

            statut:
              paiement.facture.statut,

            convention:
              paiement.facture.convention
                ? {
                    id:
                      paiement.facture
                        .convention.id,

                    numero:
                      paiement.facture
                        .convention.numero,

                    organisationNom:
                      paiement.facture
                        .convention
                        .organisationNom,

                    montant: Number(
                      paiement.facture
                        .convention
                        .montant
                    ),

                    devise:
                      paiement.facture
                        .convention
                        .devise,
                  }
                : null,
          }
        : null,

      echeance: paiement.echeance
        ? {
            id:
              paiement.echeance.id,

            numero:
              paiement.echeance.numero,

            dateEcheance:
              dateToISOString(
                paiement.echeance
                  .dateEcheance
              ) ?? "",

            montant: Number(
              paiement.echeance
                .montant
            ),

            montantPaye: Number(
              paiement.echeance
                .montantPaye
            ),

            montantDu: Number(
              paiement.echeance
                .montantDu
            ),

            statut:
              paiement.echeance
                .statut,
          }
        : null,
    }))

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <Wallet className="h-4 w-4" />
            Finance
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Paiements
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Gérez les paiements réguliers et les
            règlements de factures de conventions.
          </p>
        </div>

        <Link
          href="/paiements/nouveau"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nouveau paiement
        </Link>
      </div>

      {/* STATS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={
            <CreditCard className="h-5 w-5" />
          }
          label="Paiements"
          value={paiements.length}
        />

        <StatCard
          icon={
            <UserRound className="h-5 w-5" />
          }
          label="Paiements réguliers"
          value={
            paiements.filter(
              (p) =>
                p.type ===
                "PAIEMENT_REGULIER"
            ).length
          }
        />

        <StatCard
          icon={
            <Receipt className="h-5 w-5" />
          }
          label="Règlements conventions"
          value={
            paiements.filter(
              (p) =>
                p.type ===
                "REGLEMENT_FACTURE_CONVENTION"
            ).length
          }
        />

        <StatCard
          icon={
            <Wallet className="h-5 w-5" />
          }
          label="Effectués"
          value={
            paiements.filter(
              (p) =>
                p.statut === "EFFECTUE"
            ).length
          }
        />
      </div>

      {/* FILTRES */}
      <form
        method="GET"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {/* RECHERCHE */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              name="recherche"
              defaultValue={
                params.recherche ?? ""
              }
              placeholder="Référence, apprenant, facture..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
            />
          </div>

          {/* TYPE */}
          <select
            name="type"
            defaultValue={
              params.type ?? "TOUS"
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="TOUS">
              Tous les types
            </option>

            <option value="PAIEMENT_REGULIER">
              Paiement régulier
            </option>

            <option value="REGLEMENT_FACTURE_CONVENTION">
              Règlement convention
            </option>
          </select>

          {/* MODE */}
          <select
            name="mode"
            defaultValue={
              params.mode ?? "TOUS"
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="TOUS">
              Tous les modes
            </option>

            <option value="ESPECES">
              Espèces
            </option>

            <option value="VIREMENT">
              Virement
            </option>

            <option value="MOBILE_MONEY">
              Mobile Money
            </option>

            <option value="CARTE">
              Carte
            </option>

            <option value="CHEQUE">
              Chèque
            </option>

            <option value="AUTRE">
              Autre
            </option>
          </select>

          {/* STATUT */}
          <select
            name="statut"
            defaultValue={
              params.statut ?? "TOUS"
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="TOUS">
              Tous les statuts
            </option>

            <option value="EFFECTUE">
              Effectué
            </option>

            <option value="EN_ATTENTE">
              En attente
            </option>

            <option value="ECHEC">
              Échec
            </option>

            <option value="ANNULE">
              Annulé
            </option>

            <option value="REMBOURSE">
              Remboursé
            </option>
          </select>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Rechercher
          </button>
        </div>
      </form>

      {/* RESULTAT */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {serializedPaiements.length} paiement
          {serializedPaiements.length > 1
            ? "s"
            : ""}{" "}
          trouvé
          {serializedPaiements.length > 1
            ? "s"
            : ""}
        </p>
      </div>

      {/* TABLE */}
      <PaiementsTable
        paiements={serializedPaiements}
      />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
        {icon}
      </div>

      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  )
}