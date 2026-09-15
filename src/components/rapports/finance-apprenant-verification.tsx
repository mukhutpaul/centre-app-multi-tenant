
"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  getApprenantsFinanceOptions,
  getFormationsFinanceByApprenant,
  getSessionsFinanceByApprenantFormation,
  getSituationFinanciereApprenant,
  type ApprenantFinanceOption,
  type FormationFinanceOption,
  type SessionFinanceOption,
  type SituationFinanciereApprenant,
} from "@/actions/rapport-finance-apprenant.actions";

import Select, {
  type SingleValue,
  type StylesConfig,
} from "react-select";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  FileWarning,
  Loader2,
  RefreshCcw,
  UserRound,
  WalletCards,
} from "lucide-react";

import { toast } from "sonner";

/* ============================================================
   TYPES
============================================================ */

type Props = {
  devise: string;
};

type SelectOption = {
  value: string;
  label: string;
};

/* ============================================================
   HELPERS
============================================================ */

function money(
  value: string | number,
  devise: string,
) {
  const numericValue =
    Number(value) || 0;

  return `${new Intl.NumberFormat(
    "fr-FR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  ).format(numericValue)} ${devise}`;
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return date.toLocaleDateString(
    "fr-FR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function formatDateTime(
  value: string | null,
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return date.toLocaleString(
    "fr-FR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function statutPaiementLabel(
  statut: string,
) {
  const labels: Record<
    string,
    string
  > = {
    EN_ATTENTE: "En attente",
    EFFECTUE: "Effectué",
    ECHEC: "Échec",
    ANNULE: "Annulé",
    REMBOURSE: "Remboursé",
  };

  return (
    labels[statut] ??
    statut
  );
}

function statutFactureLabel(
  statut: string,
) {
  const labels: Record<
    string,
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

  return (
    labels[statut] ??
    statut
  );
}

function modePaiementLabel(
  mode: string,
) {
  const labels: Record<
    string,
    string
  > = {
    ESPECES: "Espèces",
    VIREMENT: "Virement",
    MOBILE_MONEY:
      "Mobile Money",
    CARTE: "Carte",
    CHEQUE: "Chèque",
    AUTRE: "Autre",
  };

  return (
    labels[mode] ??
    mode
  );
}

function statutInscriptionLabel(
  statut: string,
) {
  const labels: Record<
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

  return (
    labels[statut] ??
    statut
  );
}

/* ============================================================
   REACT SELECT STYLES
============================================================ */

const selectStyles: StylesConfig<
  SelectOption,
  false
> = {
  control: (
    base,
    state,
  ) => ({
    ...base,
    minHeight: "48px",
    borderRadius: "0.75rem",
    borderColor:
      state.isFocused
        ? "oklch(var(--p))"
        : "oklch(var(--b3))",
    backgroundColor:
      "oklch(var(--b1))",
    boxShadow:
      state.isFocused
        ? "0 0 0 1px oklch(var(--p))"
        : "none",
    cursor: "pointer",
    "&:hover": {
      borderColor:
        "oklch(var(--p))",
    },
  }),

  menu: (base) => ({
    ...base,
    zIndex: 9999,
    borderRadius: "0.75rem",
    overflow: "hidden",
  }),

  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),

  option: (
    base,
    state,
  ) => ({
    ...base,
    cursor: "pointer",
    backgroundColor:
      state.isSelected
        ? "oklch(var(--p))"
        : state.isFocused
          ? "oklch(var(--b2))"
          : "oklch(var(--b1))",
    color:
      state.isSelected
        ? "oklch(var(--pc))"
        : "oklch(var(--bc))",
  }),

  singleValue: (
    base,
  ) => ({
    ...base,
    color:
      "oklch(var(--bc))",
  }),

  input: (
    base,
  ) => ({
    ...base,
    color:
      "oklch(var(--bc))",
  }),

  placeholder: (
    base,
  ) => ({
    ...base,
    color:
      "oklch(var(--bc) / 0.5)",
  }),

  indicatorSeparator: (
    base,
  ) => ({
    ...base,
    backgroundColor:
      "oklch(var(--b3))",
  }),

  dropdownIndicator: (
    base,
  ) => ({
    ...base,
    color:
      "oklch(var(--bc) / 0.45)",
    "&:hover": {
      color:
        "oklch(var(--bc))",
    },
  }),

  clearIndicator: (
    base,
  ) => ({
    ...base,
    color:
      "oklch(var(--bc) / 0.45)",
    "&:hover": {
      color:
        "oklch(var(--er))",
    },
  }),

  noOptionsMessage: (
    base,
  ) => ({
    ...base,
    color:
      "oklch(var(--bc) / 0.55)",
  }),
};

/* ============================================================
   SMALL CARD
============================================================ */

function SummaryCard({
  title,
  value,
  description,
  type = "default",
}: {
  title: string;
  value: string;
  description: string;
  type?:
    | "default"
    | "success"
    | "warning"
    | "error";
}) {
  const classes = {
    default:
      "border-base-300 bg-base-100",
    success:
      "border-success/20 bg-success/5",
    warning:
      "border-warning/20 bg-warning/5",
    error:
      "border-error/20 bg-error/5",
  };

  const valueClasses = {
    default:
      "text-base-content",
    success:
      "text-success",
    warning:
      "text-warning",
    error:
      "text-error",
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${classes[type]}`}
    >
      <p className="text-xs font-medium text-base-content/60">
        {title}
      </p>

      <p
        className={`mt-2 text-xl font-black ${valueClasses[type]}`}
      >
        {value}
      </p>

      <p className="mt-1 text-[11px] text-base-content/50">
        {description}
      </p>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function FinanceApprenantVerification({
  devise,
}: Props) {
  const [
    apprenants,
    setApprenants,
  ] =
    useState<
      ApprenantFinanceOption[]
    >([]);

  const [
    formations,
    setFormations,
  ] =
    useState<
      FormationFinanceOption[]
    >([]);

  const [
    sessions,
    setSessions,
  ] =
    useState<
      SessionFinanceOption[]
    >([]);

  const [
    situation,
    setSituation,
  ] =
    useState<SituationFinanciereApprenant | null>(
      null,
    );

  const [
    apprenantId,
    setApprenantId,
  ] = useState("");

  const [
    formationId,
    setFormationId,
  ] = useState("");

  const [
    inscriptionId,
    setInscriptionId,
  ] = useState("");

  const [
    isLoadingApprenants,
    startLoadingApprenants,
  ] = useTransition();

  const [
    isLoadingFormations,
    startLoadingFormations,
  ] = useTransition();

  const [
    isLoadingSessions,
    startLoadingSessions,
  ] = useTransition();

  const [
    isLoadingSituation,
    startLoadingSituation,
  ] = useTransition();

  /* ==========================================================
     OPTIONS APPRENANTS
  ========================================================== */

  const apprenantOptions =
    useMemo<SelectOption[]>(
      () =>
        apprenants.map(
          (apprenant) => ({
            value: apprenant.id,
            label:
              apprenant.numero
                ? `${apprenant.nomComplet} — ${apprenant.numero}`
                : apprenant.nomComplet,
          }),
        ),
      [apprenants],
    );

  /* ==========================================================
     OPTIONS FORMATIONS
  ========================================================== */

  const formationOptions =
    useMemo<SelectOption[]>(
      () =>
        formations.map(
          (formation) => ({
            value: formation.id,
            label: `${formation.nom} — ${formation.code}`,
          }),
        ),
      [formations],
    );

  /* ==========================================================
     OPTIONS SESSIONS
  ========================================================== */

  const sessionOptions =
    useMemo<SelectOption[]>(
      () =>
        sessions.map(
          (session) => ({
            value:
              session.inscriptionId,
            label:
              `${session.sessionCode} — ${
                session.sessionNom ??
                "Session sans nom"
              } — inscription ${
                session.numeroInscription
              }`,
          }),
        ),
      [sessions],
    );

  /* ==========================================================
     VALEURS SÉLECTIONNÉES
  ========================================================== */

  const selectedApprenantOption =
    apprenantOptions.find(
      (option) =>
        option.value ===
        apprenantId,
    ) ?? null;

  const selectedFormationOption =
    formationOptions.find(
      (option) =>
        option.value ===
        formationId,
    ) ?? null;

  const selectedSessionOption =
    sessionOptions.find(
      (option) =>
        option.value ===
        inscriptionId,
    ) ?? null;

  /* ==========================================================
     CHARGER LES APPRENANTS
  ========================================================== */

  function chargerApprenants() {
    startLoadingApprenants(
      async () => {
        try {
          const result =
            await getApprenantsFinanceOptions();

          setApprenants(result);
        } catch (error) {
          console.error(error);

          toast.error(
            error instanceof Error
              ? error.message
              : "Impossible de charger les apprenants.",
          );
        }
      },
    );
  }

  useEffect(() => {
    chargerApprenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ==========================================================
     SÉLECTION APPRENANT
  ========================================================== */

  function handleApprenantChange(
    option: SingleValue<SelectOption>,
  ) {
    const value =
      option?.value ?? "";

    setApprenantId(value);

    setFormationId("");
    setInscriptionId("");

    setFormations([]);
    setSessions([]);
    setSituation(null);

    if (!value) {
      return;
    }

    startLoadingFormations(
      async () => {
        try {
          const result =
            await getFormationsFinanceByApprenant(
              value,
            );

          setFormations(result);
        } catch (error) {
          console.error(error);

          toast.error(
            error instanceof Error
              ? error.message
              : "Impossible de charger les formations.",
          );
        }
      },
    );
  }

  /* ==========================================================
     SÉLECTION FORMATION
  ========================================================== */

  function handleFormationChange(
    option: SingleValue<SelectOption>,
  ) {
    const value =
      option?.value ?? "";

    setFormationId(value);

    setInscriptionId("");

    setSessions([]);
    setSituation(null);

    if (
      !value ||
      !apprenantId
    ) {
      return;
    }

    startLoadingSessions(
      async () => {
        try {
          const result =
            await getSessionsFinanceByApprenantFormation(
              apprenantId,
              value,
            );

          setSessions(result);
        } catch (error) {
          console.error(error);

          toast.error(
            error instanceof Error
              ? error.message
              : "Impossible de charger les sessions.",
          );
        }
      },
    );
  }

  /* ==========================================================
     SÉLECTION SESSION
  ========================================================== */

  function handleSessionChange(
    option: SingleValue<SelectOption>,
  ) {
    const value =
      option?.value ?? "";

    setInscriptionId(value);

    setSituation(null);

    if (!value) {
      return;
    }

    startLoadingSituation(
      async () => {
        try {
          const result =
            await getSituationFinanciereApprenant(
              value,
            );

          setSituation(result);

          toast.success(
            "Situation financière chargée.",
          );
        } catch (error) {
          console.error(error);

          toast.error(
            error instanceof Error
              ? error.message
              : "Impossible de charger la situation financière.",
          );
        }
      },
    );
  }

  /* ==========================================================
     RESET
  ========================================================== */

  function reset() {
    setApprenantId("");
    setFormationId("");
    setInscriptionId("");

    setFormations([]);
    setSessions([]);
    setSituation(null);
  }

  /* ==========================================================
     SITUATION
  ========================================================== */

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body p-5 md:p-6">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound size={22} />
            </div>

            <div>
              <h2 className="font-bold">
                Vérification financière d’un apprenant
              </h2>

              <p className="mt-1 max-w-3xl text-xs text-base-content/50">
                Vérifiez les paiements,
                la formation, la session,
                les factures, les échéances
                et la dette restante d’un
                apprenant.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={reset}
          >
            <RefreshCcw size={15} />

            Réinitialiser
          </button>
        </div>

        {/* ====================================================
            FILTRES
        ==================================================== */}

        <div className="rounded-2xl border border-base-300 bg-base-200/30 p-4">
          <div className="grid gap-4 lg:grid-cols-3">

            {/* APPRENANT */}

            <div>
              <label className="label">
                <span className="label-text text-xs font-bold">
                  Apprenant
                </span>
              </label>

              <Select
                options={
                  apprenantOptions
                }
                value={
                  selectedApprenantOption
                }
                onChange={
                  handleApprenantChange
                }
                isClearable
                isSearchable
                isLoading={
                  isLoadingApprenants
                }
                isDisabled={
                  isLoadingApprenants
                }
                placeholder="Rechercher un apprenant..."
                noOptionsMessage={() =>
                  "Aucun apprenant trouvé"
                }
                loadingMessage={() =>
                  "Chargement des apprenants..."
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

            {/* FORMATION */}

            <div>
              <label className="label">
                <span className="label-text text-xs font-bold">
                  Formation
                </span>
              </label>

              <Select
                options={
                  formationOptions
                }
                value={
                  selectedFormationOption
                }
                onChange={
                  handleFormationChange
                }
                isClearable
                isSearchable
                isDisabled={
                  !apprenantId ||
                  isLoadingFormations
                }
                isLoading={
                  isLoadingFormations
                }
                placeholder={
                  !apprenantId
                    ? "Sélectionnez d’abord l’apprenant"
                    : "Sélectionner une formation..."
                }
                noOptionsMessage={() =>
                  "Aucune formation trouvée"
                }
                loadingMessage={() =>
                  "Chargement des formations..."
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

            {/* SESSION */}

            <div>
              <label className="label">
                <span className="label-text text-xs font-bold">
                  Session
                </span>
              </label>

              <Select
                options={
                  sessionOptions
                }
                value={
                  selectedSessionOption
                }
                onChange={
                  handleSessionChange
                }
                isClearable
                isSearchable
                isDisabled={
                  !formationId ||
                  isLoadingSessions
                }
                isLoading={
                  isLoadingSessions
                }
                placeholder={
                  !formationId
                    ? "Sélectionnez d’abord la formation"
                    : "Sélectionner une session..."
                }
                noOptionsMessage={() =>
                  "Aucune session trouvée"
                }
                loadingMessage={() =>
                  "Chargement des sessions..."
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
        </div>

        {/* ====================================================
            LOADING
        ==================================================== */}

        {(isLoadingFormations ||
          isLoadingSessions ||
          isLoadingSituation) && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            <Loader2
              size={17}
              className="animate-spin text-primary"
            />

            <span>
              {isLoadingFormations
                ? "Chargement des formations..."
                : isLoadingSessions
                  ? "Chargement des sessions..."
                  : "Analyse de la situation financière..."}
            </span>
          </div>
        )}

        {/* ====================================================
            SITUATION
        ==================================================== */}

        {situation && (
          <div className="mt-6 space-y-6">

            {/* ==================================================
                IDENTITÉ
            ================================================== */}

            <div className="rounded-2xl border border-base-300 bg-base-200/20 p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-content">
                    <UserRound size={25} />
                  </div>

                  <div>
                    <h3 className="text-lg font-black">
                      {
                        situation
                          .apprenant
                          .nomComplet
                      }
                    </h3>

                    <p className="mt-1 text-xs text-base-content/50">
                      {
                        situation
                          .apprenant
                          .numero ??
                        "Sans numéro"
                      }

                      {" · "}

                      {
                        situation
                          .apprenant
                          .telephone ??
                        "Téléphone non renseigné"
                      }
                    </p>

                    {situation
                      .apprenant
                      .email && (
                      <p className="mt-1 text-xs text-base-content/50">
                        {
                          situation
                            .apprenant
                            .email
                        }
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                    Inscription
                  </p>

                  <p className="mt-1 font-black">
                    {
                      situation
                        .inscription
                        .numero
                    }
                  </p>

                  <p className="mt-1 text-xs text-base-content/60">
                    {
                      statutInscriptionLabel(
                        situation
                          .inscription
                          .statut,
                      )
                    }
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-base-content/40">
                    Formation
                  </p>

                  <p className="mt-1 font-bold">
                    {
                      situation
                        .formation
                        .nom
                    }
                  </p>

                  <p className="text-xs text-base-content/50">
                    {
                      situation
                        .formation
                        .code
                    }
                  </p>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-base-content/40">
                    Session
                  </p>

                  <p className="mt-1 font-bold">
                    {
                      situation
                        .session
                        .nom ??
                      situation
                        .session
                        .code
                    }
                  </p>

                  <p className="text-xs text-base-content/50">
                    {
                      situation
                        .session
                        .code
                    }
                  </p>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-base-content/40">
                    Financement
                  </p>

                  <p className="mt-1 font-bold">
                    {
                      situation
                        .inscription
                        .typeFinancement
                    }
                  </p>

                  <p className="text-xs text-base-content/50">
                    Inscrit le{" "}
                    {formatDate(
                      situation
                        .inscription
                        .dateInscription,
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* ==================================================
                KPIs FINANCIERS
            ================================================== */}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

              <SummaryCard
                title="Montant convenu"
                value={money(
                  situation.resume
                    .montantConvenu,
                  devise,
                )}
                description="Montant prévu pour l'inscription"
              />

              <SummaryCard
                title="Total facturé"
                value={money(
                  situation.resume
                    .totalFacture,
                  devise,
                )}
                description={`${situation.resume.nombreFactures} facture(s)`}
              />

              <SummaryCard
                title="Total encaissé"
                value={money(
                  situation.resume
                    .totalEncaisse,
                  devise,
                )}
                description={`${situation.resume.nombrePaiementsEffectues} paiement(s) effectué(s)`}
                type="success"
              />

              <SummaryCard
                title="Dette restante"
                value={money(
                  situation.resume
                    .detteRestante,
                  devise,
                )}
                description="Montant restant à recouvrer"
                type={
                  situation.resume
                    .detteRestante >
                  0
                    ? "error"
                    : "success"
                }
              />

              <SummaryCard
                title="En retard"
                value={money(
                  situation.resume
                    .montantEnRetard,
                  devise,
                )}
                description={`${situation.resume.nombreEcheancesEnRetard} échéance(s) en retard`}
                type={
                  situation.resume
                    .montantEnRetard >
                  0
                    ? "warning"
                    : "success"
                }
              />
            </div>

            {/* ==================================================
                TAUX DE PAIEMENT
            ================================================== */}

            <div className="rounded-2xl border border-base-300 bg-base-100 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="text-sm font-bold">
                    Taux de paiement
                  </p>

                  <p className="mt-1 text-xs text-base-content/50">
                    Progression du règlement
                    de cette inscription.
                  </p>
                </div>

                <p className="text-3xl font-black text-success">
                  {situation.resume.tauxPaiement.toFixed(
                    1,
                  )}
                  %
                </p>
              </div>

              <progress
                className="progress progress-success mt-4 w-full"
                value={
                  situation.resume
                    .tauxPaiement
                }
                max="100"
              />

              <div className="mt-2 flex justify-between text-[11px] text-base-content/50">
                <span>
                  Encaissé :{" "}
                  {money(
                    situation.resume
                      .totalEncaisse,
                    devise,
                  )}
                </span>

                <span>
                  Base :{" "}
                  {money(
                    situation.resume
                      .totalFacture >
                    0
                      ? situation.resume
                          .totalFacture
                      : situation.resume
                          .montantConvenu,
                    devise,
                  )}
                </span>
              </div>
            </div>

            {/* ==================================================
                PAIEMENTS
            ================================================== */}

            <div className="rounded-2xl border border-base-300 bg-base-100">

              <div className="border-b border-base-300 p-5">
                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                    <CreditCard size={20} />
                  </div>

                  <div>
                    <h3 className="font-bold">
                      Historique des paiements
                    </h3>

                    <p className="mt-1 text-xs text-base-content/50">
                      Tous les paiements liés
                      à cette inscription,
                      sa facture ou ses
                      échéances.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table">

                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Date</th>
                      <th>Mode</th>
                      <th>Statut</th>
                      <th>Liaison</th>

                      <th className="text-right">
                        Montant
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    {situation.paiements.map(
                      (paiement) => (
                        <tr
                          key={
                            paiement.id
                          }
                          className="hover"
                        >
                          <td>
                            <p className="font-bold">
                              {
                                paiement.reference
                              }
                            </p>

                            {paiement.referenceTransaction && (
                              <p className="text-[11px] text-base-content/40">
                                {
                                  paiement.referenceTransaction
                                }
                              </p>
                            )}
                          </td>

                          <td className="text-sm">
                            {formatDateTime(
                              paiement.datePaiement,
                            )}
                          </td>

                          <td>
                            <span className="badge badge-ghost">
                              {modePaiementLabel(
                                paiement.mode,
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`badge ${
                                paiement.statut ===
                                "EFFECTUE"
                                  ? "badge-success"
                                  : paiement.statut ===
                                      "ECHEC"
                                    ? "badge-error"
                                    : "badge-warning"
                              } badge-outline`}
                            >
                              {statutPaiementLabel(
                                paiement.statut,
                              )}
                            </span>
                          </td>

                          <td>
                            <div className="space-y-1 text-xs">

                              {paiement.factureNumero && (
                                <p>
                                  Facture{" "}
                                  <strong>
                                    {
                                      paiement.factureNumero
                                    }
                                  </strong>
                                </p>
                              )}

                              {paiement.echeanceNumero !==
                                null && (
                                <p>
                                  Échéance #
                                  {
                                    paiement.echeanceNumero
                                  }
                                </p>
                              )}

                              {!paiement.factureNumero &&
                                paiement.echeanceNumero ===
                                  null && (
                                  <span className="text-base-content/40">
                                    Inscription
                                  </span>
                                )}
                            </div>
                          </td>

                          <td className="text-right font-black">
                            {money(
                              paiement.montant,
                              devise,
                            )}
                          </td>
                        </tr>
                      ),
                    )}

                    {!situation
                      .paiements
                      .length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-10 text-center"
                        >
                          <CreditCard
                            size={28}
                            className="mx-auto text-base-content/30"
                          />

                          <p className="mt-3 font-semibold">
                            Aucun paiement
                          </p>

                          <p className="mt-1 text-xs text-base-content/50">
                            Aucun règlement
                            n'est actuellement
                            rattaché à cette
                            inscription.
                          </p>
                        </td>
                      </tr>
                    )}

                  </tbody>
                </table>
              </div>
            </div>

            {/* ==================================================
                FACTURES
            ================================================== */}

            <div className="rounded-2xl border border-base-300 bg-base-100">

              <div className="border-b border-base-300 p-5">
                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileCheck2 size={20} />
                  </div>

                  <div>
                    <h3 className="font-bold">
                      Factures de l’inscription
                    </h3>

                    <p className="mt-1 text-xs text-base-content/50">
                      Les factures annulées et
                      brouillons ne sont pas
                      comptabilisées dans la
                      situation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table">

                  <thead>
                    <tr>
                      <th>Facture</th>
                      <th>Émission</th>
                      <th>Échéance</th>
                      <th>Statut</th>

                      <th className="text-right">
                        Total
                      </th>

                      <th className="text-right">
                        Payé
                      </th>

                      <th className="text-right">
                        Reste
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    {situation.factures.map(
                      (facture) => (
                        <tr
                          key={
                            facture.id
                          }
                          className="hover"
                        >
                          <td className="font-bold">
                            {
                              facture.numero
                            }
                          </td>

                          <td className="text-sm">
                            {formatDate(
                              facture.dateEmission,
                            )}
                          </td>

                          <td className="text-sm">
                            {formatDate(
                              facture.dateEcheance,
                            )}
                          </td>

                          <td>
                            <span className="badge badge-outline">
                              {statutFactureLabel(
                                facture.statut,
                              )}
                            </span>
                          </td>

                          <td className="text-right font-semibold">
                            {money(
                              facture.total,
                              devise,
                            )}
                          </td>

                          <td className="text-right font-semibold text-success">
                            {money(
                              facture.montantPaye,
                              devise,
                            )}
                          </td>

                          <td className="text-right font-black text-warning">
                            {money(
                              facture.montantDu,
                              devise,
                            )}
                          </td>
                        </tr>
                      ),
                    )}

                    {!situation
                      .factures
                      .length && (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-10 text-center text-sm text-base-content/50"
                        >
                          Aucune facture émise
                          pour cette
                          inscription.
                        </td>
                      </tr>
                    )}

                  </tbody>
                </table>
              </div>
            </div>

            {/* ==================================================
                ÉCHÉANCES
            ================================================== */}

            <div className="rounded-2xl border border-base-300 bg-base-100">

              <div className="border-b border-base-300 p-5">
                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
                    <CalendarClock size={20} />
                  </div>

                  <div>
                    <h3 className="font-bold">
                      Échéancier
                    </h3>

                    <p className="mt-1 text-xs text-base-content/50">
                      Suivi des montants prévus,
                      payés et encore dus.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table">

                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>

                      <th className="text-right">
                        Montant
                      </th>

                      <th className="text-right">
                        Payé
                      </th>

                      <th className="text-right">
                        Reste
                      </th>

                      <th>État</th>
                    </tr>
                  </thead>

                  <tbody>

                    {situation.echeances.map(
                      (echeance) => (
                        <tr
                          key={
                            echeance.id
                          }
                          className={
                            echeance.estEnRetard
                              ? "bg-error/5"
                              : "hover"
                          }
                        >
                          <td className="font-bold">
                            #
                            {
                              echeance.numero
                            }
                          </td>

                          <td>
                            {formatDate(
                              echeance.dateEcheance,
                            )}
                          </td>

                          <td className="text-right font-semibold">
                            {money(
                              echeance.montant,
                              devise,
                            )}
                          </td>

                          <td className="text-right font-semibold text-success">
                            {money(
                              echeance.montantPaye,
                              devise,
                            )}
                          </td>

                          <td className="text-right font-black text-warning">
                            {money(
                              echeance.montantDu,
                              devise,
                            )}
                          </td>

                          <td>
                            {echeance.estEnRetard ? (
                              <div>
                                <span className="badge badge-error badge-outline">
                                  <AlertTriangle
                                    size={12}
                                  />

                                  Retard
                                </span>

                                <p className="mt-1 text-[10px] text-error">
                                  {
                                    echeance.joursRetard
                                  }{" "}
                                  jour(s)
                                </p>
                              </div>
                            ) : echeance.montantDu <=
                              0 ? (
                              <span className="badge badge-success badge-outline">
                                <CheckCircle2
                                  size={12}
                                />

                                Payée
                              </span>
                            ) : (
                              <span className="badge badge-warning badge-outline">
                                À payer
                              </span>
                            )}
                          </td>
                        </tr>
                      ),
                    )}

                    {!situation
                      .echeances
                      .length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-10 text-center text-sm text-base-content/50"
                        >
                          Aucun échéancier
                          enregistré pour
                          cette inscription.
                        </td>
                      </tr>
                    )}

                  </tbody>
                </table>
              </div>
            </div>

            {/* ==================================================
                ALERTES / CONCLUSION
            ================================================== */}

            <div
              className={`rounded-2xl border p-5 ${
                situation.resume
                  .detteRestante >
                0
                  ? "border-warning/20 bg-warning/5"
                  : "border-success/20 bg-success/5"
              }`}
            >
              <div className="flex items-start gap-4">

                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    situation.resume
                      .detteRestante >
                    0
                      ? "bg-warning/10 text-warning"
                      : "bg-success/10 text-success"
                  }`}
                >
                  {situation.resume
                    .detteRestante >
                  0 ? (
                    <FileWarning
                      size={22}
                    />
                  ) : (
                    <CheckCircle2
                      size={22}
                    />
                  )}
                </div>

                <div className="min-w-0">

                  <p className="font-black">
                    {situation.resume
                      .detteRestante >
                    0
                      ? "Situation financière à régulariser"
                      : "Situation financière à jour"}
                  </p>

                  <p className="mt-1 text-sm text-base-content/60">
                    {situation.resume
                      .detteRestante >
                    0
                      ? `Il reste ${money(
                          situation.resume
                            .detteRestante,
                          devise,
                        )} à recouvrer pour cette inscription.`
                      : "Aucune dette restante n'est détectée pour cette inscription."}
                  </p>

                  {situation.resume
                    .montantEnRetard >
                    0 && (
                    <p className="mt-2 text-xs font-semibold text-error">
                      Attention :{" "}
                      {money(
                        situation.resume
                          .montantEnRetard,
                        devise,
                      )} est actuellement
                      en retard.
                    </p>
                  )}

                </div>
              </div>
            </div>

          </div>
        )}

        {/* ====================================================
            ÉTAT INITIAL
        ==================================================== */}

        {!situation &&
          !isLoadingSituation && (
            <div className="mt-6 rounded-2xl border border-dashed border-base-300 p-10 text-center">

              <WalletCards
                size={38}
                className="mx-auto text-base-content/20"
              />

              <h3 className="mt-4 font-bold">
                Vérifiez une situation financière
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-base-content/50">
                Sélectionnez un apprenant,
                sa formation puis sa session
                pour afficher les paiements,
                les factures, les échéances
                et la dette restante.
              </p>

            </div>
          )}

      </div>
    </section>
  );
}