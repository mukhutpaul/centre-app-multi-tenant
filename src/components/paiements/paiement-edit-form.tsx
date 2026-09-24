"use client";

import { updatePaiement } from "@/actions/paiement-actions";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CreditCard,
  FileText,
  Loader2,
  MessageSquare,
  Receipt,
  Save,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import Select from "react-select";
import Swal from "sweetalert2";
import { toast } from "sonner";

type PaiementFormData = Awaited<
  ReturnType<
    typeof import("@/actions/paiement-actions").getPaiementFormData
  >
>;

type Props = {
  paiement: any;
  data: PaiementFormData;
};

type SelectOption = {
  value: string;
  label: string;
};

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "46px",
    borderRadius: "12px",
    borderColor: state.isFocused
      ? "oklch(65% 0.2 250)"
      : "oklch(85% 0.02 250)",
    boxShadow: "none",
    "&:hover": {
      borderColor: "oklch(65% 0.2 250)",
    },
    backgroundColor: "white",
  }),

  menu: (base: any) => ({
    ...base,
    zIndex: 50,
    borderRadius: "12px",
    overflow: "hidden",
  }),

  option: (base: any, state: any) => ({
    ...base,
    cursor: "pointer",
    backgroundColor: state.isSelected
      ? "oklch(55% 0.2 250)"
      : state.isFocused
        ? "oklch(95% 0.03 250)"
        : "white",
    color: state.isSelected
      ? "white"
      : "oklch(25% 0.03 250)",
  }),
};

function getString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function toInputDate(value: unknown): string {
  if (!value) {
    return "";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-sm font-semibold">
      {children}

      {required && (
        <span className="ml-1 text-error">
          *
        </span>
      )}
    </label>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon size={19} />
      </div>

      <div>
        <h2 className="font-bold">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm text-base-content/60">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export default function PaiementEditForm({
  paiement,
  data,
}: Props) {
  const router = useRouter();

  const [isPending, startTransition] =
    useTransition();

  /*
   * IMPORTANT
   *
   * getPaiementFormData() retourne :
   *
   * {
   *   success,
   *   message,
   *   data: {
   *      apprenants,
   *      inscriptions,
   *      factures,
   *      echeances,
   *      modesPaiement
   *   }
   * }
   *
   * On récupère donc le vrai contenu ici.
   */
  const rawData = data?.data ?? {};

  const apprenants = Array.isArray(
    rawData.apprenants,
  )
    ? rawData.apprenants
    : [];

  const inscriptions = Array.isArray(
    rawData.inscriptions,
  )
    ? rawData.inscriptions
    : [];

  const factures = Array.isArray(
    rawData.factures,
  )
    ? rawData.factures
    : [];

  const echeances = Array.isArray(
    rawData.echeances,
  )
    ? rawData.echeances
    : [];

  const modesPaiement = Array.isArray(
    rawData.modesPaiement,
  )
    ? rawData.modesPaiement
    : [];

  /*
   * ---------------------------------------------------------
   * VALEURS INITIALES
   * ---------------------------------------------------------
   */

  /*
   * Certains paiements peuvent ne pas avoir directement
   * apprenantId.
   *
   * Dans ce cas on essaie de récupérer l'apprenant depuis
   * inscription.apprenantId.
   */
  const initialApprenantId =
    getString(
      paiement?.apprenantId,
    ) ||
    getString(
      paiement?.inscription?.apprenantId,
    ) ||
    getString(
      paiement?.inscription?.apprenant?.id,
    );

  const initialInscriptionId =
    getString(
      paiement?.inscriptionId,
    ) ||
    getString(
      paiement?.inscription?.id,
    );

  const initialFactureId =
    getString(
      paiement?.factureId,
    ) ||
    getString(
      paiement?.facture?.id,
    );

  const initialEcheanceId =
    getString(
      paiement?.echeanceId,
    ) ||
    getString(
      paiement?.echeance?.id,
    );

  const [apprenantId, setApprenantId] =
    useState(
      initialApprenantId,
    );

  const [inscriptionId, setInscriptionId] =
    useState(
      initialInscriptionId,
    );

  const [factureId, setFactureId] =
    useState(
      initialFactureId,
    );

  const [echeanceId, setEcheanceId] =
    useState(
      initialEcheanceId,
    );

  const [reference, setReference] =
    useState(
      getString(
        paiement?.reference,
      ),
    );

  const [montant, setMontant] =
    useState(
      getString(
        paiement?.montant,
      ),
    );

  const [mode, setMode] =
    useState(
      getString(
        paiement?.mode,
      ) || "ESPECES",
    );

  const [statut, setStatut] =
    useState(
      getString(
        paiement?.statut,
      ) || "EFFECTUE",
    );

  const [datePaiement, setDatePaiement] =
    useState(
      toInputDate(
        paiement?.datePaiement,
      ),
    );

  const [
    referenceTransaction,
    setReferenceTransaction,
  ] = useState(
    getString(
      paiement?.referenceTransaction,
    ),
  );

  const [notes, setNotes] =
    useState(
      getString(
        paiement?.notes,
      ),
    );

  /*
   * ---------------------------------------------------------
   * OPTIONS APPRENANTS
   * ---------------------------------------------------------
   */

  const apprenantOptions =
    useMemo<SelectOption[]>(
      () =>
        apprenants
          .map((item: any) => ({
            value: getString(item.id),

            label:
              [
                getString(item.prenom),
                getString(item.nom),
              ]
                .filter(Boolean)
                .join(" ")
                .trim() ||
              getString(item.id),
          }))
          .filter(
            (item: SelectOption) =>
              item.value,
          ),
      [apprenants],
    );

  /*
   * ---------------------------------------------------------
   * OPTIONS INSCRIPTIONS
   * ---------------------------------------------------------
   */

  const inscriptionOptions =
    useMemo<SelectOption[]>(
      () =>
        inscriptions
          .filter((item: any) => {
            if (!apprenantId) {
              return true;
            }

            return (
              getString(
                item.apprenantId,
              ) === apprenantId
            );
          })
          .map((item: any) => ({
            value: getString(item.id),

            label:
              [
                getString(item.numero),

                getString(
                  item.session?.formation
                    ?.nom,
                ),

                getString(
                  item.session?.nom,
                ),
              ]
                .filter(Boolean)
                .join(" — ") ||
              getString(item.id),
          }))
          .filter(
            (item: SelectOption) =>
              item.value,
          ),
      [
        inscriptions,
        apprenantId,
      ],
    );

  /*
   * ---------------------------------------------------------
   * OPTIONS FACTURES
   * ---------------------------------------------------------
   */

  const factureOptions =
    useMemo<SelectOption[]>(
      () =>
        factures
          .filter((item: any) => {
            if (!inscriptionId) {
              return true;
            }

            /*
             * On garde la facture si :
             *
             * - elle n'a pas d'inscriptionId
             * - ou elle correspond à l'inscription actuelle
             */
            return (
              !item.inscriptionId ||
              getString(
                item.inscriptionId,
              ) === inscriptionId
            );
          })
          .map((item: any) => ({
            value: getString(item.id),

            label:
              getString(
                item.numero,
              ) ||
              `Facture ${getString(
                item.id,
              )}`,
          }))
          .filter(
            (item: SelectOption) =>
              item.value,
          ),
      [
        factures,
        inscriptionId,
      ],
    );

  /*
   * ---------------------------------------------------------
   * OPTIONS ECHEANCES
   * ---------------------------------------------------------
   */

  const echeanceOptions =
    useMemo<SelectOption[]>(
      () =>
        echeances
          .filter((item: any) => {
            if (!inscriptionId) {
              return true;
            }

            return (
              !item.inscriptionId ||
              getString(
                item.inscriptionId,
              ) === inscriptionId
            );
          })
          .map((item: any) => ({
            value: getString(item.id),

            label:
              `Échéance ${
                getString(
                  item.numero,
                ) ||
                getString(item.id)
              }`,
          }))
          .filter(
            (item: SelectOption) =>
              item.value,
          ),
      [
        echeances,
        inscriptionId,
      ],
    );

  /*
   * ---------------------------------------------------------
   * OPTIONS MODE DE PAIEMENT
   * ---------------------------------------------------------
   */

  const modeOptions: SelectOption[] =
    modesPaiement.length > 0
      ? modesPaiement.map(
          (item: any) => ({
            value: getString(
              item.value,
            ),
            label:
              getString(
                item.label,
              ) ||
              getString(
                item.value,
              ),
          }),
        )
      : [
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

  /*
   * ---------------------------------------------------------
   * OPTIONS STATUT
   * ---------------------------------------------------------
   */

  const statutOptions: SelectOption[] =
    [
      {
        value: "EFFECTUE",
        label: "Effectué",
      },
      {
        value: "EN_ATTENTE",
        label: "En attente",
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

  /*
   * ---------------------------------------------------------
   * SUBMIT
   * ---------------------------------------------------------
   */

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!apprenantId) {
      toast.error(
        "Veuillez sélectionner un apprenant.",
      );
      return;
    }

    if (!inscriptionId) {
      toast.error(
        "Veuillez sélectionner une inscription.",
      );
      return;
    }

    if (!reference.trim()) {
      toast.error(
        "La référence est obligatoire.",
      );
      return;
    }

    const montantNumber =
      Number(montant);

    if (
      Number.isNaN(
        montantNumber,
      ) ||
      montantNumber <= 0
    ) {
      toast.error(
        "Veuillez saisir un montant valide.",
      );
      return;
    }

    startTransition(async () => {
      try {
        /*
         * IMPORTANT :
         *
         * Vérifie que updatePaiement() accepte bien
         * ces propriétés dans ton action serveur.
         *
         * Si ton action actuelle accepte seulement :
         * mode, referenceTransaction, notes,
         * il faudra adapter l'action serveur.
         */
        const result =
          await updatePaiement(
            paiement.id,
            {
              mode: mode as any,

              referenceTransaction:
                referenceTransaction.trim() ||
                null,

              notes:
                notes.trim() ||
                null,

              /*
               * Ces propriétés sont conservées ici
               * parce que ton formulaire les édite.
               */
              apprenantId,
              inscriptionId,

              factureId:
                factureId || null,

              echeanceId:
                echeanceId || null,

              reference:
                reference.trim(),

              montant:
                montantNumber,

              statut:
                statut as any,

              datePaiement:
                datePaiement || null,
            } as any,
          );

        /*
         * Si updatePaiement retourne un Result
         * au lieu de lancer une exception.
         */
        if (
          result &&
          typeof result === "object" &&
          "success" in result &&
          result.success === false
        ) {
          throw new Error(
            result.message ||
              "La modification du paiement a échoué.",
          );
        }

        await Swal.fire({
          icon: "success",
          title: "Paiement modifié",
          text:
            "Les modifications ont été enregistrées.",
          confirmButtonText:
            "Continuer",
          confirmButtonColor:
            "#2563eb",
        });

        router.push(
          `/paiements/${paiement.id}`,
        );

        router.refresh();
      } catch (error) {
        console.error(
          "Modification paiement:",
          error,
        );

        await Swal.fire({
          icon: "error",
          title:
            "Modification impossible",
          text:
            error instanceof Error
              ? error.message
              : "Une erreur est survenue.",
          confirmButtonText:
            "Fermer",
          confirmButtonColor:
            "#dc2626",
        });
      }
    });
  };

  /*
   * ---------------------------------------------------------
   * OPTIONS SELECTIONNEES
   * ---------------------------------------------------------
   */

  const selectedApprenant =
    apprenantOptions.find(
      (option) =>
        option.value ===
        apprenantId,
    ) ?? null;

  const selectedInscription =
    inscriptionOptions.find(
      (option) =>
        option.value ===
        inscriptionId,
    ) ?? null;

  const selectedFacture =
    factureOptions.find(
      (option) =>
        option.value ===
        factureId,
    ) ?? null;

  const selectedEcheance =
    echeanceOptions.find(
      (option) =>
        option.value ===
        echeanceId,
    ) ?? null;

  const selectedMode =
    modeOptions.find(
      (option) =>
        option.value === mode,
    ) ?? {
      value: mode,
      label: mode,
    };

  const selectedStatut =
    statutOptions.find(
      (option) =>
        option.value === statut,
    ) ?? {
      value: statut,
      label: statut,
    };

  /*
   * ---------------------------------------------------------
   * RENDU
   * ---------------------------------------------------------
   */

  return (
    <div className="min-h-full pb-10">
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/paiements/${paiement.id}`,
              )
            }
            className="btn btn-ghost btn-sm mt-1 rounded-xl"
            disabled={isPending}
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Modifier le paiement
            </h1>

            <p className="mt-1 text-sm text-base-content/60">
              Référence :{" "}
              <span className="font-semibold">
                {reference ||
                  paiement?.reference ||
                  "—"}
              </span>
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* =====================================================
            BENEFICIAIRE
        ====================================================== */}

        <div className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body">
            <SectionTitle
              icon={UserRound}
              title="Bénéficiaire"
              description="Apprenant et inscription concernés."
            />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* APPRENANT */}
              <div>
                <FieldLabel required>
                  Apprenant
                </FieldLabel>

                <Select<SelectOption>
                  instanceId="edit-paiement-apprenant"
                  options={
                    apprenantOptions
                  }
                  value={
                    selectedApprenant
                  }
                  onChange={(
                    option,
                  ) => {
                    setApprenantId(
                      option?.value ??
                        "",
                    );

                    /*
                     * Ne pas effacer automatiquement
                     * l'inscription actuelle si elle
                     * appartient déjà à cet apprenant.
                     */
                    const inscriptionExiste =
                      inscriptions.some(
                        (
                          item: any,
                        ) =>
                          getString(
                            item.id,
                          ) ===
                            inscriptionId &&
                          getString(
                            item.apprenantId,
                          ) ===
                            (option?.value ??
                              ""),
                      );

                    if (
                      !inscriptionExiste
                    ) {
                      setInscriptionId(
                        "",
                      );

                      setFactureId(
                        "",
                      );

                      setEcheanceId(
                        "",
                      );
                    }
                  }}
                  isSearchable
                  isClearable
                  isDisabled={
                    isPending
                  }
                  placeholder="Sélectionner un apprenant..."
                  noOptionsMessage={() =>
                    "Aucun apprenant trouvé"
                  }
                  styles={
                    selectStyles
                  }
                />
              </div>

              {/* INSCRIPTION */}
              <div>
                <FieldLabel required>
                  Inscription
                </FieldLabel>

                <Select<SelectOption>
                  instanceId="edit-paiement-inscription"
                  options={
                    inscriptionOptions
                  }
                  value={
                    selectedInscription
                  }
                  onChange={(
                    option,
                  ) => {
                    setInscriptionId(
                      option?.value ??
                        "",
                    );

                    /*
                     * Les factures et échéances
                     * seront automatiquement filtrées
                     * avec la nouvelle inscription.
                     */

                    if (
                      option?.value !==
                      inscriptionId
                    ) {
                      const factureExiste =
                        factures.some(
                          (
                            item: any,
                          ) =>
                            getString(
                              item.id,
                            ) ===
                              factureId &&
                            (
                              !item.inscriptionId ||
                              getString(
                                item.inscriptionId,
                              ) ===
                                option?.value
                            ),
                        );

                      const echeanceExiste =
                        echeances.some(
                          (
                            item: any,
                          ) =>
                            getString(
                              item.id,
                            ) ===
                              echeanceId &&
                            (
                              !item.inscriptionId ||
                              getString(
                                item.inscriptionId,
                              ) ===
                                option?.value
                            ),
                        );

                      if (
                        !factureExiste
                      ) {
                        setFactureId(
                          "",
                        );
                      }

                      if (
                        !echeanceExiste
                      ) {
                        setEcheanceId(
                          "",
                        );
                      }
                    }
                  }}
                  isSearchable
                  isClearable
                  isDisabled={
                    !apprenantId ||
                    isPending
                  }
                  placeholder="Sélectionner une inscription..."
                  noOptionsMessage={() =>
                    "Aucune inscription trouvée"
                  }
                  styles={
                    selectStyles
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            INFORMATIONS FINANCIERES
        ====================================================== */}

        <div className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body">
            <SectionTitle
              icon={WalletCards}
              title="Informations financières"
            />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {/* REFERENCE */}
              <div>
                <FieldLabel required>
                  Référence
                </FieldLabel>

                <label className="input input-bordered flex h-[46px] items-center gap-2 rounded-xl">
                  <Receipt size={18} />

                  <input
                    value={
                      reference
                    }
                    onChange={(
                      event,
                    ) =>
                      setReference(
                        event.target
                          .value,
                      )
                    }
                    className="grow"
                    disabled={
                      isPending
                    }
                  />
                </label>
              </div>

              {/* MONTANT */}
              <div>
                <FieldLabel required>
                  Montant
                </FieldLabel>

                <label className="input input-bordered flex h-[46px] items-center gap-2 rounded-xl">
                  <Banknote size={18} />

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      montant
                    }
                    onChange={(
                      event,
                    ) =>
                      setMontant(
                        event.target
                          .value,
                      )
                    }
                    className="grow"
                    disabled={
                      isPending
                    }
                  />
                </label>
              </div>

              {/* DATE */}
              <div>
                <FieldLabel>
                  Date
                </FieldLabel>

                <label className="input input-bordered flex h-[46px] items-center gap-2 rounded-xl">
                  <CalendarDays
                    size={18}
                  />

                  <input
                    type="date"
                    value={
                      datePaiement
                    }
                    onChange={(
                      event,
                    ) =>
                      setDatePaiement(
                        event.target
                          .value,
                      )
                    }
                    className="grow"
                    disabled={
                      isPending
                    }
                  />
                </label>
              </div>

              {/* MODE */}
              <div>
                <FieldLabel>
                  Mode
                </FieldLabel>

                <Select<SelectOption>
                  instanceId="edit-paiement-mode"
                  options={
                    modeOptions
                  }
                  value={
                    selectedMode
                  }
                  onChange={(
                    option,
                  ) =>
                    setMode(
                      option?.value ??
                        "ESPECES",
                    )
                  }
                  isSearchable={false}
                  isDisabled={
                    isPending
                  }
                  styles={
                    selectStyles
                  }
                />
              </div>

              {/* STATUT */}
              <div>
                <FieldLabel>
                  Statut
                </FieldLabel>

                <Select<SelectOption>
                  instanceId="edit-paiement-statut"
                  options={
                    statutOptions
                  }
                  value={
                    selectedStatut
                  }
                  onChange={(
                    option,
                  ) =>
                    setStatut(
                      option?.value ??
                        "EFFECTUE",
                    )
                  }
                  isSearchable={false}
                  isDisabled={
                    isPending
                  }
                  styles={
                    selectStyles
                  }
                />
              </div>

              {/* REFERENCE TRANSACTION */}
              <div>
                <FieldLabel>
                  Référence transaction
                </FieldLabel>

                <label className="input input-bordered flex h-[46px] items-center gap-2 rounded-xl">
                  <CreditCard
                    size={18}
                  />

                  <input
                    value={
                      referenceTransaction
                    }
                    onChange={(
                      event,
                    ) =>
                      setReferenceTransaction(
                        event.target
                          .value,
                      )
                    }
                    className="grow"
                    disabled={
                      isPending
                    }
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            RATTACHEMENTS
        ====================================================== */}

        <div className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body">
            <SectionTitle
              icon={FileText}
              title="Rattachements financiers"
              description="Facture et échéance associées au paiement."
            />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* FACTURE */}
              <div>
                <FieldLabel>
                  Facture
                </FieldLabel>

                <Select<SelectOption>
                  instanceId="edit-paiement-facture"
                  options={
                    factureOptions
                  }
                  value={
                    selectedFacture
                  }
                  onChange={(
                    option,
                  ) =>
                    setFactureId(
                      option?.value ??
                        "",
                    )
                  }
                  isClearable
                  isSearchable
                  isDisabled={
                    isPending
                  }
                  placeholder="Sélectionner une facture..."
                  noOptionsMessage={() =>
                    "Aucune facture trouvée"
                  }
                  styles={
                    selectStyles
                  }
                />
              </div>

              {/* ECHEANCE */}
              <div>
                <FieldLabel>
                  Échéance
                </FieldLabel>

                <Select<SelectOption>
                  instanceId="edit-paiement-echeance"
                  options={
                    echeanceOptions
                  }
                  value={
                    selectedEcheance
                  }
                  onChange={(
                    option,
                  ) =>
                    setEcheanceId(
                      option?.value ??
                        "",
                    )
                  }
                  isClearable
                  isSearchable
                  isDisabled={
                    isPending
                  }
                  placeholder="Sélectionner une échéance..."
                  noOptionsMessage={() =>
                    "Aucune échéance trouvée"
                  }
                  styles={
                    selectStyles
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            NOTES
        ====================================================== */}

        <div className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body">
            <SectionTitle
              icon={MessageSquare}
              title="Notes"
            />

            <textarea
              value={notes}
              onChange={(
                event,
              ) =>
                setNotes(
                  event.target
                    .value,
                )
              }
              className="textarea textarea-bordered min-h-[120px] rounded-xl"
              disabled={
                isPending
              }
              placeholder="Ajouter une note..."
            />
          </div>
        </div>

        {/* =====================================================
            ACTIONS
        ====================================================== */}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/paiements/${paiement.id}`,
              )
            }
            className="btn btn-outline rounded-xl"
            disabled={
              isPending
            }
          >
            Annuler
          </button>

          <button
            type="submit"
            className="btn btn-primary rounded-xl px-6"
            disabled={
              isPending
            }
          >
            {isPending ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Enregistrement...
              </>
            ) : (
              <>
                <Save size={18} />
                Enregistrer les modifications
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}