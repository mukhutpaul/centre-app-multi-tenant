"use client";

import {
  updatePaiement,
} from "@/actions/paiement.actions";
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
    typeof import("@/actions/paiement.actions").getPaiementFormData
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

function toInputDate(value: unknown) {
  if (!value) {
    return "";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export default function PaiementEditForm({
  paiement,
  data,
}: Props) {
  const router = useRouter();

  const [isPending, startTransition] =
    useTransition();

  const rawData = data as any;

  const apprenants = Array.isArray(
    rawData?.apprenants,
  )
    ? rawData.apprenants
    : [];

  const inscriptions = Array.isArray(
    rawData?.inscriptions,
  )
    ? rawData.inscriptions
    : [];

  const factures = Array.isArray(
    rawData?.factures,
  )
    ? rawData.factures
    : [];

  const echeances = Array.isArray(
    rawData?.echeances,
  )
    ? rawData.echeances
    : [];

  const [apprenantId, setApprenantId] =
    useState(
      getString(paiement?.apprenantId),
    );

  const [inscriptionId, setInscriptionId] =
    useState(
      getString(
        paiement?.inscriptionId,
      ),
    );

  const [factureId, setFactureId] =
    useState(
      getString(
        paiement?.factureId,
      ),
    );

  const [echeanceId, setEcheanceId] =
    useState(
      getString(
        paiement?.echeanceId,
      ),
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
    useState(getString(
      paiement?.mode,
    ) || "ESPECES");

  const [statut, setStatut] =
    useState(getString(
      paiement?.statut,
    ) || "EFFECTUE");

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

  const apprenantOptions =
    useMemo<SelectOption[]>(
      () =>
        apprenants.map((item: any) => ({
          value: getString(item.id),
          label:
            `${getString(item.prenom)} ${getString(item.nom)}`.trim(),
        })),
      [apprenants],
    );

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
                  item.session?.formation?.nom,
                ),
                getString(
                  item.session?.nom,
                ),
              ]
                .filter(Boolean)
                .join(" — ") ||
              getString(item.id),
          })),
      [inscriptions, apprenantId],
    );

  const factureOptions =
    useMemo<SelectOption[]>(
      () =>
        factures
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
              getString(item.numero) ||
              `Facture ${getString(item.id)}`,
          })),
      [factures, inscriptionId],
    );

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
                getString(item.numero) ||
                getString(item.id)
              }`,
          })),
      [echeances, inscriptionId],
    );

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
      Number.isNaN(montantNumber) ||
      montantNumber <= 0
    ) {
      toast.error(
        "Veuillez saisir un montant valide.",
      );
      return;
    }

    startTransition(async () => {
      try {
        await updatePaiement(
          paiement.id,
          {
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

            mode: mode as any,
            statut: statut as any,

            datePaiement:
              datePaiement || null,

            referenceTransaction:
              referenceTransaction.trim() ||
              null,

            notes:
              notes.trim() || null,
          },
        );

        await Swal.fire({
          icon: "success",
          title: "Paiement modifié",
          text: "Les modifications ont été enregistrées.",
          confirmButtonText: "Continuer",
          confirmButtonColor:
            "#2563eb",
        });

        router.push(
          `/paiements/${paiement.id}`,
        );

        router.refresh();
      } catch (error) {
        console.error(
          error,
        );

        Swal.fire({
          icon: "error",
          title: "Modification impossible",
          text:
            error instanceof Error
              ? error.message
              : "Une erreur est survenue.",
          confirmButtonText: "Fermer",
          confirmButtonColor:
            "#dc2626",
        });
      }
    });
  };

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
                {reference}
              </span>
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* BÉNÉFICIAIRE */}
        <div className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body">
            <SectionTitle
              icon={UserRound}
              title="Bénéficiaire"
              description="Apprenant et inscription concernés."
            />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
                    apprenantOptions.find(
                      (option) =>
                        option.value ===
                        apprenantId,
                    ) ?? null
                  }
                  onChange={(option) => {
                    setApprenantId(
                      option?.value ?? "",
                    );

                    setInscriptionId(
                      "",
                    );

                    setFactureId(
                      "",
                    );

                    setEcheanceId(
                      "",
                    );
                  }}
                  isSearchable
                  isClearable
                  styles={
                    selectStyles
                  }
                />
              </div>

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
                    inscriptionOptions.find(
                      (option) =>
                        option.value ===
                        inscriptionId,
                    ) ?? null
                  }
                  onChange={(option) =>
                    setInscriptionId(
                      option?.value ?? "",
                    )
                  }
                  isSearchable
                  isClearable
                  isDisabled={
                    !apprenantId
                  }
                  styles={
                    selectStyles
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* FINANCES */}
        <div className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body">
            <SectionTitle
              icon={WalletCards}
              title="Informations financières"
            />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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
                    onChange={(event) =>
                      setReference(
                        event.target.value,
                      )
                    }
                    className="grow"
                    disabled={
                      isPending
                    }
                  />
                </label>
              </div>

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
                    onChange={(event) =>
                      setMontant(
                        event.target.value,
                      )
                    }
                    className="grow"
                    disabled={
                      isPending
                    }
                  />
                </label>
              </div>

              <div>
                <FieldLabel>
                  Date
                </FieldLabel>

                <label className="input input-bordered flex h-[46px] items-center gap-2 rounded-xl">
                  <CalendarDays size={18} />

                  <input
                    type="date"
                    value={
                      datePaiement
                    }
                    onChange={(event) =>
                      setDatePaiement(
                        event.target.value,
                      )
                    }
                    className="grow"
                    disabled={
                      isPending
                    }
                  />
                </label>
              </div>

              <div>
                <FieldLabel>
                  Mode
                </FieldLabel>

                <Select<SelectOption>
                  instanceId="edit-paiement-mode"
                  options={[
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
                  ]}
                  value={{
                    value: mode,
                    label:
                      mode ===
                      "ESPECES"
                        ? "Espèces"
                        : mode ===
                            "VIREMENT"
                          ? "Virement bancaire"
                          : mode ===
                              "MOBILE_MONEY"
                            ? "Mobile Money"
                            : mode ===
                                "CARTE"
                              ? "Carte bancaire"
                              : mode ===
                                  "CHEQUE"
                                ? "Chèque"
                                : "Autre",
                  }}
                  onChange={(option) =>
                    setMode(
                      option?.value ??
                        "ESPECES",
                    )
                  }
                  isSearchable={
                    false
                  }
                  styles={
                    selectStyles
                  }
                />
              </div>

              <div>
                <FieldLabel>
                  Statut
                </FieldLabel>

                <Select<SelectOption>
                  instanceId="edit-paiement-statut"
                  options={[
                    {
                      value:
                        "EFFECTUE",
                      label:
                        "Effectué",
                    },
                    {
                      value:
                        "EN_ATTENTE",
                      label:
                        "En attente",
                    },
                    {
                      value: "ECHEC",
                      label: "Échec",
                    },
                    {
                      value:
                        "ANNULE",
                      label:
                        "Annulé",
                    },
                    {
                      value:
                        "REMBOURSE",
                      label:
                        "Remboursé",
                    },
                  ]}
                  value={{
                    value: statut,
                    label:
                      statut ===
                      "EFFECTUE"
                        ? "Effectué"
                        : statut ===
                            "EN_ATTENTE"
                          ? "En attente"
                          : statut ===
                              "ECHEC"
                            ? "Échec"
                            : statut ===
                                "ANNULE"
                              ? "Annulé"
                              : "Remboursé",
                  }}
                  onChange={(option) =>
                    setStatut(
                      option?.value ??
                        "EFFECTUE",
                    )
                  }
                  isSearchable={
                    false
                  }
                  styles={
                    selectStyles
                  }
                />
              </div>

              <div>
                <FieldLabel>
                  Référence transaction
                </FieldLabel>

                <label className="input input-bordered flex h-[46px] items-center gap-2 rounded-xl">
                  <CreditCard size={18} />

                  <input
                    value={
                      referenceTransaction
                    }
                    onChange={(event) =>
                      setReferenceTransaction(
                        event.target.value,
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

        {/* RATTACHEMENTS */}
        <div className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body">
            <SectionTitle
              icon={FileText}
              title="Rattachements financiers"
            />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
                    factureOptions.find(
                      (option) =>
                        option.value ===
                        factureId,
                    ) ?? null
                  }
                  onChange={(option) =>
                    setFactureId(
                      option?.value ??
                        "",
                    )
                  }
                  isClearable
                  isSearchable
                  styles={
                    selectStyles
                  }
                />
              </div>

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
                    echeanceOptions.find(
                      (option) =>
                        option.value ===
                        echeanceId,
                    ) ?? null
                  }
                  onChange={(option) =>
                    setEcheanceId(
                      option?.value ??
                        "",
                    )
                  }
                  isClearable
                  isSearchable
                  styles={
                    selectStyles
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* NOTES */}
        <div className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body">
            <SectionTitle
              icon={MessageSquare}
              title="Notes"
            />

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value,
                )
              }
              className="textarea textarea-bordered min-h-[120px] rounded-xl"
              disabled={
                isPending
              }
            />
          </div>
        </div>

        {/* ACTIONS */}
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