"use client"

import {
  useRef,
  useState,
  useTransition,
} from "react"

import { useRouter } from "next/navigation"
import Link from "next/link"

import Select, {
  type SingleValue,
} from "react-select"

import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  Receipt,
  UserRound,
  Wallet,
} from "lucide-react"

import { toast } from "sonner"

import {
  createPaiementRegulier,
  createReglementFacture,
  getTarifsForInscription,
  type ModePaiementInput,
} from "@/actions/paiement-actions"

import {
  getEcheancesForFacture,
} from "@/actions/paiement-form-actions"

/* =========================================================
TYPES
========================================================= */

type TypePaiement =
  | "PAIEMENT_REGULIER"
  | "REGLEMENT_FACTURE_CONVENTION"

type Inscription = {
  id: string
  numero: string

  apprenant: {
    id: string
    numero: string
    nom: string
    prenom: string
  }

  session: {
    formation: {
      id: string
      code: string
      nom: string
    }
  }
}

type Tarif = {
  id: string
  nom: string
  description: string | null
  montant: number
  montantPaye: number
  montantRestant: number
  devise: string
  actif: boolean
}

type Facture = {
  id: string
  numero: string
  total: number
  montantPaye: number
  montantDu: number

  convention: {
    id: string
    numero: string
    organisationNom: string
    montant: number
    devise: string
  }
}

type Echeance = {
  id: string
  numero: number
  dateEcheance: string
  montant: number
  montantPaye: number
  montantDu: number
  statut: string
}

type Props = {
  inscriptions: Inscription[]
  factures: Facture[]
}

/* =========================================================
REACT SELECT OPTIONS
========================================================= */

type SelectOption = {
  value: string
  label: string
}

/* =========================================================
STYLE REACT SELECT
========================================================= */

const selectStyles = {
  control: (
    base: any,
    state: any
  ) => ({
    ...base,

    minHeight: "48px",

    borderRadius: "12px",

    borderColor: state.isFocused
      ? "#3b82f6"
      : "#e2e8f0",

    boxShadow: state.isFocused
      ? "0 0 0 3px rgba(59,130,246,0.12)"
      : "none",

    backgroundColor: "white",

    "&:hover": {
      borderColor: "#3b82f6",
    },
  }),

  menu: (base: any) => ({
    ...base,

    zIndex: 50,

    borderRadius: "12px",

    overflow: "hidden",
  }),

  option: (
    base: any,
    state: any
  ) => ({
    ...base,

    cursor: "pointer",

    backgroundColor:
      state.isSelected
        ? "#2563eb"
        : state.isFocused
          ? "#eff6ff"
          : "white",

    color:
      state.isSelected
        ? "white"
        : "#0f172a",
  }),

  singleValue: (
    base: any
  ) => ({
    ...base,
    color: "#0f172a",
  }),

  placeholder: (
    base: any
  ) => ({
    ...base,
    color: "#94a3b8",
  }),

  input: (
    base: any
  ) => ({
    ...base,
    color: "#0f172a",
  }),

  menuPortal: (
    base: any
  ) => ({
    ...base,
    zIndex: 9999,
  }),
}

/* =========================================================
COMPOSANT
========================================================= */

export default function PaiementForm({
  inscriptions,
  factures,
}: Props) {
  const router = useRouter()

  const [
    isPending,
    startTransition,
  ] = useTransition()

  /* =======================================================
     REQUEST IDS

     Permet d'éviter qu'une ancienne requête
     écrase les données d'une nouvelle sélection.
  ======================================================= */

  const tarifsRequestId =
    useRef(0)

  const echeancesRequestId =
    useRef(0)

  /* =======================================================
     TYPE DE PAIEMENT
  ======================================================= */

  const [type, setType] =
    useState<TypePaiement>(
      "PAIEMENT_REGULIER"
    )

  /* =======================================================
     PAIEMENT RÉGULIER
  ======================================================= */

  const [
    inscriptionId,
    setInscriptionId,
  ] = useState("")

  const [
    tarifId,
    setTarifId,
  ] = useState("")

  const [
    tarifs,
    setTarifs,
  ] = useState<Tarif[]>([])

  const [
    loadingTarifs,
    setLoadingTarifs,
  ] = useState(false)

  /* =======================================================
     FACTURE CONVENTION
  ======================================================= */

  const [
    factureId,
    setFactureId,
  ] = useState("")

  const [
    echeanceId,
    setEcheanceId,
  ] = useState("")

  const [
    echeances,
    setEcheances,
  ] = useState<Echeance[]>([])

  const [
    loadingEcheances,
    setLoadingEcheances,
  ] = useState(false)

  /* =======================================================
     PAIEMENT
  ======================================================= */

  const [
    montant,
    setMontant,
  ] = useState("")

  const [
    mode,
    setMode,
  ] = useState<ModePaiementInput>(
    "ESPECES"
  )

  const [
    referenceTransaction,
    setReferenceTransaction,
  ] = useState("")

  const [
    notes,
    setNotes,
  ] = useState("")

  /* =========================================================
     ÉLÉMENTS SÉLECTIONNÉS
  ========================================================= */

  const selectedTarif =
    tarifs.find(
      (tarif) =>
        tarif.id === tarifId
    )

  const selectedFacture =
    factures.find(
      (facture) =>
        facture.id === factureId
    )

  const selectedEcheance =
    echeances.find(
      (echeance) =>
        echeance.id === echeanceId
    )

  /* =========================================================
     OPTIONS INSCRIPTIONS
  ========================================================= */

  const inscriptionOptions: SelectOption[] =
    inscriptions.map(
      (inscription) => ({
        value: inscription.id,

        label:
          `${inscription.apprenant.nom} ` +
          `${inscription.apprenant.prenom} — ` +
          `${inscription.session.formation.nom} — ` +
          `${inscription.numero}`,
      })
    )

  /* =========================================================
     OPTIONS TARIFS
  ========================================================= */

  const tarifOptions: SelectOption[] =
    tarifs.map(
      (tarif) => ({
        value: tarif.id,

        label:
          `${tarif.nom} — reste ` +
          `${tarif.montantRestant} ` +
          `${tarif.devise}`,
      })
    )

  /* =========================================================
     OPTIONS FACTURES
  ========================================================= */

  const factureOptions: SelectOption[] =
    factures
      .filter(
        (facture) =>
          facture.montantDu > 0
      )
      .map(
        (facture) => ({
          value: facture.id,

          label:
            `${facture.numero} — ` +
            `${facture.convention.organisationNom} — ` +
            `reste ${facture.montantDu} ` +
            `${facture.convention.devise}`,
        })
      )

  /* =========================================================
     OPTIONS ÉCHÉANCES
  ========================================================= */

  const echeanceOptions: SelectOption[] =
    echeances
      .filter(
        (echeance) =>
          echeance.montantDu > 0
      )
      .map(
        (echeance) => ({
          value: echeance.id,

          label:
            `Échéance ${echeance.numero} — reste ` +
            `${echeance.montantDu}`,
        })
      )

  /* =========================================================
     OPTIONS MODE PAIEMENT
  ========================================================= */

  const modeOptions: SelectOption[] = [
    {
      value: "ESPECES",
      label: "Espèces",
    },
    {
      value: "VIREMENT",
      label: "Virement bancaire",
    },
    {
      value: "MOBILE_MONEY",
      label: "Mobile Money",
    },
    {
      value: "CARTE",
      label: "Carte",
    },
    {
      value: "CHEQUE",
      label: "Chèque",
    },
    {
      value: "AUTRE",
      label: "Autre",
    },
  ]

  /* =========================================================
     CHARGEMENT TARIFS
  ========================================================= */

  async function loadTarifs(
    inscription: string,
    requestId: number
  ) {
    setLoadingTarifs(true)

    try {
      const result =
        await getTarifsForInscription(
          inscription
        )

      /*
       * Une nouvelle sélection a été faite.
       * On ignore cette ancienne réponse.
       */
      if (
        requestId !==
        tarifsRequestId.current
      ) {
        return
      }

      if (!result.success) {
        toast.error(
          result.message
        )

        setTarifs([])

        return
      }

      const tarifsRecus =
        result.data?.tarifs ?? []

      const tarifsFormates: Tarif[] =
        tarifsRecus.map(
          (tarif) => ({
            id: tarif.id,

            nom: tarif.nom,

            description:
              tarif.description,

            montant:
              Number(
                tarif.montant
              ),

            montantPaye:
              Number(
                tarif.montantPaye
              ),

            montantRestant:
              Number(
                tarif.montantRestant
              ),

            devise:
              tarif.devise,

            actif:
              tarif.actif,
          })
        )

      setTarifs(
        tarifsFormates
      )
    } catch (error) {
      if (
        requestId !==
        tarifsRequestId.current
      ) {
        return
      }

      console.error(
        "Chargement tarifs:",
        error
      )

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de charger les frais."
      )

      setTarifs([])
    } finally {
      if (
        requestId ===
        tarifsRequestId.current
      ) {
        setLoadingTarifs(false)
      }
    }
  }

  /* =========================================================
     CHARGEMENT ÉCHÉANCES
  ========================================================= */

  async function loadEcheances(
    facture: string,
    requestId: number
  ) {
    setLoadingEcheances(true)

    try {
      const data =
        await getEcheancesForFacture(
          facture
        )

      if (
        requestId !==
        echeancesRequestId.current
      ) {
        return
      }

      setEcheances(
        data.map(
          (item) => ({
            ...item,

            dateEcheance:
              item.dateEcheance.toString(),

            montant:
              Number(
                item.montant
              ),

            montantPaye:
              Number(
                item.montantPaye
              ),

            montantDu:
              Number(
                item.montantDu
              ),
          })
        )
      )
    } catch (error) {
      if (
        requestId !==
        echeancesRequestId.current
      ) {
        return
      }

      console.error(
        "Chargement échéances:",
        error
      )

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de charger les échéances."
      )

      setEcheances([])
    } finally {
      if (
        requestId ===
        echeancesRequestId.current
      ) {
        setLoadingEcheances(false)
      }
    }
  }

  /* =========================================================
     RESET FORMULAIRE
  ========================================================= */

  function resetFormForType(
    newType: TypePaiement
  ) {
    /*
     * Invalide les anciennes requêtes.
     */
    tarifsRequestId.current += 1
    echeancesRequestId.current += 1

    setType(newType)

    /* Paiement régulier */
    setInscriptionId("")
    setTarifId("")
    setTarifs([])
    setLoadingTarifs(false)

    /* Facture */
    setFactureId("")
    setEcheanceId("")
    setEcheances([])
    setLoadingEcheances(false)

    /* Commun */
    setMontant("")
    setReferenceTransaction("")
    setNotes("")
    setMode("ESPECES")
  }

  /* =========================================================
     CHANGEMENT D'INSCRIPTION
  ========================================================= */

  async function handleInscriptionChange(
    option: SingleValue<SelectOption>
  ) {
    const value =
      option?.value ?? ""

    const requestId =
      ++tarifsRequestId.current

    setInscriptionId(value)

    /*
     * Réinitialiser le frais
     * et le montant.
     */
    setTarifId("")
    setTarifs([])
    setMontant("")

    if (!value) {
      setLoadingTarifs(false)
      return
    }

    await loadTarifs(
      value,
      requestId
    )
  }

  /* =========================================================
     CHANGEMENT DE TARIF
  ========================================================= */

  function handleTarifChange(
    option: SingleValue<SelectOption>
  ) {
    const value =
      option?.value ?? ""

    setTarifId(value)

    const tarif =
      tarifs.find(
        (item) =>
          item.id === value
      )

    if (!tarif) {
      setMontant("")
      return
    }

    if (
      tarif.montantRestant <= 0
    ) {
      setMontant("")
      return
    }

    /*
     * Le reste complet est proposé
     * automatiquement.
     *
     * MAIS le champ reste totalement
     * modifiable pour permettre les
     * paiements progressifs.
     */
    setMontant(
      tarif.montantRestant.toString()
    )
  }

  /* =========================================================
     CHANGEMENT FACTURE
  ========================================================= */

  async function handleFactureChange(
    option: SingleValue<SelectOption>
  ) {
    const value =
      option?.value ?? ""

    const requestId =
      ++echeancesRequestId.current

    setFactureId(value)

    /*
     * Réinitialiser l'échéance
     * et le montant.
     */
    setEcheanceId("")
    setEcheances([])
    setMontant("")

    if (!value) {
      setLoadingEcheances(false)
      return
    }

    await loadEcheances(
      value,
      requestId
    )
  }

  /* =========================================================
     CHANGEMENT ÉCHÉANCE
  ========================================================= */

  function handleEcheanceChange(
    option: SingleValue<SelectOption>
  ) {
    const value =
      option?.value ?? ""

    setEcheanceId(value)

    const echeance =
      echeances.find(
        (item) =>
          item.id === value
      )

    if (!echeance) {
      setMontant("")
      return
    }

    if (
      echeance.montantDu <= 0
    ) {
      setMontant("")
      return
    }

    /*
     * Le reste est proposé par défaut,
     * mais reste modifiable.
     */
    setMontant(
      echeance.montantDu.toString()
    )
  }

  /* =========================================================
     CHANGEMENT MODE
  ========================================================= */

  function handleModeChange(
    option: SingleValue<SelectOption>
  ) {
    if (!option) {
      return
    }

    setMode(
      option.value as ModePaiementInput
    )
  }

  /* =========================================================
     SOUMISSION
  ========================================================= */

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (isPending) {
      return
    }

    const montantNumber =
      Number(montant)

    /* =======================================================
       VALIDATION MONTANT
    ======================================================= */

    if (
      !Number.isFinite(
        montantNumber
      ) ||
      montantNumber <= 0
    ) {
      toast.error(
        "Veuillez saisir un montant valide supérieur à zéro."
      )

      return
    }

    /* =======================================================
       PAIEMENT RÉGULIER
    ======================================================= */

    if (
      type ===
      "PAIEMENT_REGULIER"
    ) {
      if (!inscriptionId) {
        toast.error(
          "Veuillez sélectionner une inscription."
        )

        return
      }

      if (!tarifId) {
        toast.error(
          "Veuillez sélectionner un frais."
        )

        return
      }

      if (!selectedTarif) {
        toast.error(
          "Le frais sélectionné est introuvable."
        )

        return
      }

      if (
        selectedTarif.montantRestant <=
        0
      ) {
        toast.error(
          "Ce frais est déjà entièrement payé."
        )

        return
      }

      /*
       * Paiement progressif :
       *
       * reste = 500
       *
       * 100 -> accepté
       * 200 -> accepté
       * 150 -> accepté
       * 50  -> accepté
       *
       * total = 500
       *
       * 501 -> refusé
       */

      if (
        montantNumber >
        selectedTarif.montantRestant
      ) {
        toast.error(
          `Le montant ne peut pas dépasser ${selectedTarif.montantRestant} ${selectedTarif.devise}.`
        )

        return
      }
    }

    /* =======================================================
       RÈGLEMENT FACTURE
    ======================================================= */

    if (
      type ===
      "REGLEMENT_FACTURE_CONVENTION"
    ) {
      if (!factureId) {
        toast.error(
          "Veuillez sélectionner une facture."
        )

        return
      }

      if (!echeanceId) {
        toast.error(
          "Veuillez sélectionner une échéance."
        )

        return
      }

      if (!selectedFacture) {
        toast.error(
          "La facture sélectionnée est introuvable."
        )

        return
      }

      if (!selectedEcheance) {
        toast.error(
          "L'échéance sélectionnée est introuvable."
        )

        return
      }

      if (
        selectedFacture.montantDu <=
        0
      ) {
        toast.error(
          "Cette facture est déjà entièrement payée."
        )

        return
      }

      if (
        selectedEcheance.montantDu <=
        0
      ) {
        toast.error(
          "Cette échéance est déjà entièrement payée."
        )

        return
      }

      if (
        montantNumber >
        selectedEcheance.montantDu
      ) {
        toast.error(
          `Le montant ne peut pas dépasser ${selectedEcheance.montantDu} ${selectedFacture.convention.devise}.`
        )

        return
      }
    }

    /* =======================================================
       APPEL SERVER ACTION
    ======================================================= */

    startTransition(
      async () => {
        try {
          const datePaiement =
            new Date().toISOString()

          /* =================================================
             PAIEMENT RÉGULIER
          ================================================= */

          if (
            type ===
            "PAIEMENT_REGULIER"
          ) {
            const result =
              await createPaiementRegulier({
                type:
                  "PAIEMENT_REGULIER",

                inscriptionId,

                tarifFormationId:
                  tarifId,

                montant:
                  montantNumber,

                mode,

                datePaiement,

                referenceTransaction:
                  referenceTransaction.trim() ||
                  undefined,

                notes:
                  notes.trim() ||
                  undefined,
              })

            if (!result.success) {
              toast.error(
                result.message
              )

              return
            }

            toast.success(
              result.message ||
                "Paiement régulier enregistré avec succès."
            )
          }

          /* =================================================
             RÈGLEMENT FACTURE
          ================================================= */

          else {
            const result =
              await createReglementFacture({
                type:
                  "REGLEMENT_FACTURE_CONVENTION",

                factureId,

                echeanceId,

                montant:
                  montantNumber,

                mode,

                datePaiement,

                referenceTransaction:
                  referenceTransaction.trim() ||
                  undefined,

                notes:
                  notes.trim() ||
                  undefined,
              })

            if (!result.success) {
              toast.error(
                result.message
              )

              return
            }

            toast.success(
              result.message ||
                "Règlement de la facture enregistré avec succès."
            )
          }

          router.push(
            "/paiements"
          )

          router.refresh()
        } catch (error) {
          console.error(
            "handleSubmit paiement:",
            error
          )

          toast.error(
            error instanceof Error
              ? error.message
              : "Une erreur est survenue lors de l'enregistrement."
          )
        }
      }
    )
  }

  /* =========================================================
     OPTIONS SÉLECTIONNÉES
  ========================================================= */

  const selectedInscriptionOption =
    inscriptionOptions.find(
      (option) =>
        option.value ===
        inscriptionId
    ) ?? null

  const selectedTarifOption =
    tarifOptions.find(
      (option) =>
        option.value ===
        tarifId
    ) ?? null

  const selectedFactureOption =
    factureOptions.find(
      (option) =>
        option.value ===
        factureId
    ) ?? null

  const selectedEcheanceOption =
    echeanceOptions.find(
      (option) =>
        option.value ===
        echeanceId
    ) ?? null

  const selectedModeOption =
    modeOptions.find(
      (option) =>
        option.value === mode
    ) ?? null

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <Wallet className="h-4 w-4" />
            Paiements
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Nouveau paiement
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Enregistrez un paiement individuel
            ou un règlement de facture de
            convention.
          </p>
        </div>

        <Link
          href="/paiements"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
      </div>

      {/* =====================================================
          TYPE
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <CreditCard className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Type de paiement
            </h2>

            <p className="text-sm text-slate-500">
              Choisissez la nature du règlement.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              resetFormForType(
                "PAIEMENT_REGULIER"
              )
            }
            disabled={isPending}
            className={`rounded-2xl border p-5 text-left transition ${
              type ===
              "PAIEMENT_REGULIER"
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-500 dark:bg-blue-950/30 dark:ring-blue-900/40"
                : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <div className="mb-2 flex items-center gap-3">
              <UserRound className="h-5 w-5 text-blue-600" />

              <span className="font-semibold text-slate-900 dark:text-white">
                Paiement régulier
              </span>
            </div>

            <p className="text-sm leading-6 text-slate-500">
              Paiement direct d'un apprenant
              pour une formation, inscription,
              brevet, certification ou autre
              frais.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              resetFormForType(
                "REGLEMENT_FACTURE_CONVENTION"
              )
            }
            disabled={isPending}
            className={`rounded-2xl border p-5 text-left transition ${
              type ===
              "REGLEMENT_FACTURE_CONVENTION"
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-500 dark:bg-blue-950/30 dark:ring-blue-900/40"
                : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <div className="mb-2 flex items-center gap-3">
              <Receipt className="h-5 w-5 text-blue-600" />

              <span className="font-semibold text-slate-900 dark:text-white">
                Règlement facture convention
              </span>
            </div>

            <p className="text-sm leading-6 text-slate-500">
              Règlement d'une échéance liée
              à une facture créée à partir
              d'une convention.
            </p>
          </button>
        </div>
      </div>

      {/* =====================================================
          PAIEMENT RÉGULIER
      ===================================================== */}

      {type ===
        "PAIEMENT_REGULIER" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6">
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Paiement régulier
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Sélectionnez une inscription puis
              un frais restant à payer.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Inscription */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Inscription
              </label>

              <Select
                options={
                  inscriptionOptions
                }
                value={
                  selectedInscriptionOption
                }
                onChange={
                  handleInscriptionChange
                }
                isDisabled={isPending}
                isClearable
                isSearchable
                placeholder="Rechercher une inscription..."
                noOptionsMessage={() =>
                  "Aucune inscription trouvée"
                }
                loadingMessage={() =>
                  "Chargement..."
                }
                styles={
                  selectStyles
                }
                menuPortalTarget={
                  typeof document !==
                  "undefined"
                    ? document.body
                    : undefined
                }
              />
            </div>

            {/* Frais */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Frais
              </label>

              <Select
                options={tarifOptions}
                value={
                  selectedTarifOption
                }
                onChange={
                  handleTarifChange
                }
                isDisabled={
                  !inscriptionId ||
                  loadingTarifs ||
                  isPending
                }
                isClearable
                isSearchable
                isLoading={
                  loadingTarifs
                }
                placeholder={
                  loadingTarifs
                    ? "Chargement des frais..."
                    : inscriptionId
                      ? "Rechercher un frais..."
                      : "Sélectionnez d'abord une inscription"
                }
                noOptionsMessage={() =>
                  inscriptionId
                    ? "Aucun frais restant"
                    : "Sélectionnez une inscription"
                }
                styles={
                  selectStyles
                }
                menuPortalTarget={
                  typeof document !==
                  "undefined"
                    ? document.body
                    : undefined
                }
              />
            </div>
          </div>

          {/* DÉTAIL DU FRAIS */}

          {selectedTarif && (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <InfoCard
                label="Montant du frais"
                value={`${selectedTarif.montant} ${selectedTarif.devise}`}
              />

              <InfoCard
                label="Déjà payé"
                value={`${selectedTarif.montantPaye} ${selectedTarif.devise}`}
              />

              <InfoCard
                label="Reste à payer"
                value={`${selectedTarif.montantRestant} ${selectedTarif.devise}`}
                highlight
              />
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          FACTURE CONVENTION
      ===================================================== */}

      {type ===
        "REGLEMENT_FACTURE_CONVENTION" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6">
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Règlement de facture
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Sélectionnez une facture puis
              une échéance à régler.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Facture */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Facture
              </label>

              <Select
                options={
                  factureOptions
                }
                value={
                  selectedFactureOption
                }
                onChange={
                  handleFactureChange
                }
                isDisabled={isPending}
                isClearable
                isSearchable
                placeholder="Rechercher une facture..."
                noOptionsMessage={() =>
                  "Aucune facture impayée trouvée"
                }
                styles={
                  selectStyles
                }
                menuPortalTarget={
                  typeof document !==
                  "undefined"
                    ? document.body
                    : undefined
                }
              />
            </div>

            {/* Échéance */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Échéance
              </label>

              <Select
                options={
                  echeanceOptions
                }
                value={
                  selectedEcheanceOption
                }
                onChange={
                  handleEcheanceChange
                }
                isDisabled={
                  !factureId ||
                  loadingEcheances ||
                  isPending
                }
                isClearable
                isSearchable
                isLoading={
                  loadingEcheances
                }
                placeholder={
                  loadingEcheances
                    ? "Chargement des échéances..."
                    : factureId
                      ? "Rechercher une échéance..."
                      : "Sélectionnez d'abord une facture"
                }
                noOptionsMessage={() =>
                  "Aucune échéance restante"
                }
                styles={
                  selectStyles
                }
                menuPortalTarget={
                  typeof document !==
                  "undefined"
                    ? document.body
                    : undefined
                }
              />
            </div>
          </div>

          {/* FACTURE */}

          {selectedFacture && (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <InfoCard
                label="Facture"
                value={
                  selectedFacture.numero
                }
              />

              <InfoCard
                label="Total facture"
                value={`${selectedFacture.total} ${selectedFacture.convention.devise}`}
              />

              <InfoCard
                label="Reste facture"
                value={`${selectedFacture.montantDu} ${selectedFacture.convention.devise}`}
                highlight
              />
            </div>
          )}

          {/* ÉCHÉANCE */}

          {selectedEcheance && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
              <div className="grid gap-4 md:grid-cols-3">
                <InfoCard
                  label="Montant échéance"
                  value={`${selectedEcheance.montant} ${selectedFacture?.convention.devise ?? ""}`}
                />

                <InfoCard
                  label="Déjà payé"
                  value={`${selectedEcheance.montantPaye} ${selectedFacture?.convention.devise ?? ""}`}
                />

                <InfoCard
                  label="Reste échéance"
                  value={`${selectedEcheance.montantDu} ${selectedFacture?.convention.devise ?? ""}`}
                  highlight
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          INFORMATIONS RÈGLEMENT
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Informations du règlement
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Le montant correspond au versement
            effectué maintenant.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Montant */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Montant du versement
            </label>

            <input
              type="number"
              min="0.01"
              step="0.01"
              value={montant}
              onChange={(event) =>
                setMontant(
                  event.target.value
                )
              }
              placeholder="0.00"
              disabled={isPending}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
              required
            />

            {/* PAIEMENT RÉGULIER */}

            {type ===
              "PAIEMENT_REGULIER" &&
              selectedTarif && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-slate-500">
                    Le paiement peut être effectué
                    progressivement en plusieurs
                    versements.
                  </p>

                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    Reste maximum autorisé :{" "}
                    {
                      selectedTarif.montantRestant
                    }{" "}
                    {
                      selectedTarif.devise
                    }
                  </p>
                </div>
              )}

            {/* CONVENTION */}

            {type ===
              "REGLEMENT_FACTURE_CONVENTION" &&
              selectedEcheance && (
                <p className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                  Reste maximum de cette échéance :{" "}
                  {
                    selectedEcheance.montantDu
                  }{" "}
                  {
                    selectedFacture?.convention
                      .devise
                  }
                </p>
              )}
          </div>

          {/* Mode */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Mode de paiement
            </label>

            <Select
              options={modeOptions}
              value={
                selectedModeOption
              }
              onChange={
                handleModeChange
              }
              isDisabled={isPending}
              isSearchable={false}
              styles={
                selectStyles
              }
              menuPortalTarget={
                typeof document !==
                "undefined"
                  ? document.body
                  : undefined
              }
            />
          </div>

          {/* Référence */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Référence transaction
            </label>

            <input
              type="text"
              value={
                referenceTransaction
              }
              onChange={(event) =>
                setReferenceTransaction(
                  event.target.value
                )
              }
              placeholder="Ex. TXN-2026-00125"
              disabled={isPending}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          {/* Notes */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Notes
            </label>

            <input
              type="text"
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value
                )
              }
              placeholder="Observation éventuelle..."
              disabled={isPending}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          ACTION
      ===================================================== */}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={
            isPending ||
            loadingTarifs ||
            loadingEcheances ||
            (type ===
              "PAIEMENT_REGULIER" &&
              (!inscriptionId ||
                !tarifId ||
                !selectedTarif)) ||
            (type ===
              "REGLEMENT_FACTURE_CONVENTION" &&
              (!factureId ||
                !echeanceId ||
                !selectedFacture ||
                !selectedEcheance))
          }
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Enregistrer le paiement
            </>
          )}
        </button>
      </div>
    </form>
  )
}

/* =========================================================
INFO CARD
========================================================= */

function InfoCard({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20"
          : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  )
}