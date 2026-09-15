
"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  Calculator,
  Plus,
  Save,
  Trash2,
  ReceiptText,
} from "lucide-react";

import { updateFacture } from "@/actions/facture.actions";

/* =========================================================
   TYPES
========================================================= */

type InscriptionOption = {
  id: string;
  numero: string;
  montantConvenu: string;

  apprenant: {
    prenom: string;
    nom: string;
  };

  session: {
    code: string;
    nom: string | null;

    formation: {
      nom: string;
    };
  };
};

type LigneFacture = {
  id: string;
  description: string;
  quantite: string;
  prixUnitaire: string;
};

type FactureData = {
  id: string;

  inscriptionId?: string | null;

  numero?: string | null;

  dateEmission?: string | Date | null;

  dateEcheance?: string | Date | null;

  remise?: string | number | null;

  taxe?: string | number | null;

  statut?:
    | "BROUILLON"
    | "EMISE"
    | "PARTIELLEMENT_PAYEE"
    | "PAYEE"
    | "EN_RETARD"
    | "ANNULEE";

  notes?: string | null;

  lignes?: Array<{
    id?: string;
    description: string;
    quantite: string | number;
    prixUnitaire: string | number;
    total?: string | number | null;
  }>;
};

type Props = {
  data: {
    inscriptions: InscriptionOption[];
  };

  facture: FactureData;
};

type InscriptionSelectOption = {
  value: string;
  label: string;
  inscription: InscriptionOption;
};

/* =========================================================
   STATUTS
========================================================= */

const STATUTS = [
  {
    value: "BROUILLON",
    label: "Brouillon",
  },
  {
    value: "EMISE",
    label: "Émise",
  },
  {
    value: "EN_RETARD",
    label: "En retard",
  },
] as const;

/* =========================================================
   HELPERS
========================================================= */

function newLine(): LigneFacture {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantite: "1",
    prixUnitaire: "0",
  };
}

function toNumber(
  value: string | number | null | undefined,
): number {
  const number = Number(value ?? 0);

  return Number.isFinite(number) ? number : 0;
}

function money(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateForInput(
  value: string | Date | null | undefined,
): string {
  if (!value) {
    return "";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

/* =========================================================
   COMPONENT
========================================================= */

export default function FactureEditForm({
  data,
  facture,
}: Props) {
  const router = useRouter();

  const [isPending, startTransition] =
    useTransition();

  const {
    inscriptions = [],
  } = data;

  /* =======================================================
     INITIALISATION
  ====================================================== */

  const initialLignes: LigneFacture[] =
    facture.lignes &&
    facture.lignes.length > 0
      ? facture.lignes.map((ligne) => ({
          id:
            ligne.id ??
            crypto.randomUUID(),

          description:
            ligne.description ?? "",

          quantite: String(
            ligne.quantite ?? 1,
          ),

          prixUnitaire: String(
            ligne.prixUnitaire ?? 0,
          ),
        }))
      : [newLine()];

  const [inscriptionId, setInscriptionId] =
    useState<string | null>(
      facture.inscriptionId ?? null,
    );

  const [lignes, setLignes] =
    useState<LigneFacture[]>(
      initialLignes,
    );

  const [remise, setRemise] =
    useState(
      String(facture.remise ?? 0),
    );

  const [taxe, setTaxe] =
    useState(
      String(facture.taxe ?? 0),
    );

  const [dateEmission, setDateEmission] =
    useState(
      formatDateForInput(
        facture.dateEmission,
      ),
    );

  const [dateEcheance, setDateEcheance] =
    useState(
      formatDateForInput(
        facture.dateEcheance,
      ),
    );

  const [statut, setStatut] =
    useState<
      "BROUILLON" | "EMISE" | "EN_RETARD"
    >(
      facture.statut === "EN_RETARD"
        ? "EN_RETARD"
        : facture.statut === "EMISE"
          ? "EMISE"
          : "BROUILLON",
    );

  const [notes, setNotes] =
    useState(facture.notes ?? "");

  /* =======================================================
     OPTIONS INSCRIPTION
  ====================================================== */

  const inscriptionOptions = useMemo<
    InscriptionSelectOption[]
  >(
    () =>
      inscriptions.map((inscription) => ({
        value: inscription.id,

        label: `${inscription.numero} — ${inscription.apprenant.prenom} ${inscription.apprenant.nom} — ${inscription.session.formation.nom}`,

        inscription,
      })),
    [inscriptions],
  );

  /* =======================================================
     INSCRIPTION SELECTIONNEE
  ====================================================== */

  const selectedInscription = useMemo(
    () =>
      inscriptions.find(
        (item) =>
          item.id === inscriptionId,
      ),

    [inscriptions, inscriptionId],
  );

  /* =======================================================
     CALCULS
  ====================================================== */

  const sousTotal = useMemo(
    () =>
      lignes.reduce(
        (total, ligne) =>
          total +
          toNumber(ligne.quantite) *
            toNumber(
              ligne.prixUnitaire,
            ),
        0,
      ),
    [lignes],
  );

  const total = Math.max(
    sousTotal -
      toNumber(remise) +
      toNumber(taxe),
    0,
  );

  /* =======================================================
     LIGNES
  ====================================================== */

  function updateLine(
    id: string,
    field: keyof LigneFacture,
    value: string,
  ) {
    setLignes((current) =>
      current.map((ligne) =>
        ligne.id === id
          ? {
              ...ligne,
              [field]: value,
            }
          : ligne,
      ),
    );
  }

  function addLine() {
    setLignes((current) => [
      ...current,
      newLine(),
    ]);
  }

  function removeLine(id: string) {
    if (lignes.length === 1) {
      return;
    }

    setLignes((current) =>
      current.filter(
        (ligne) =>
          ligne.id !== id,
      ),
    );
  }

  /* =======================================================
     INSCRIPTION
  ====================================================== */

  function handleInscriptionChange(
    option: InscriptionSelectOption | null,
  ) {
    const id = option?.value ?? null;

    setInscriptionId(id);

    if (!id) {
      return;
    }

    const inscription =
      inscriptions.find(
        (item) => item.id === id,
      );

    if (!inscription) {
      return;
    }

    /*
     * Pour une modification, on ne remplace pas
     * automatiquement les lignes existantes.
     *
     * On propose seulement le montant convenu
     * si la facture ne possède qu'une ligne vide.
     */

    const montant = toNumber(
      inscription.montantConvenu,
    );

    if (
      montant > 0 &&
      lignes.length === 1 &&
      lignes[0].description.trim() === "" &&
      toNumber(
        lignes[0].prixUnitaire,
      ) === 0
    ) {
      setLignes([
        {
          ...lignes[0],

          description:
            `Formation — ${inscription.session.formation.nom}`,

          prixUnitaire:
            inscription.montantConvenu,
        },
      ]);
    }
  }

  /* =======================================================
     VALIDATION
  ====================================================== */

  function validate(): boolean {
    if (!inscriptionId) {
      Swal.fire({
        icon: "warning",
        title: "Inscription obligatoire",
        text:
          "Veuillez sélectionner l'inscription concernée par cette facture.",
      });

      return false;
    }

    const validLines =
      lignes.filter(
        (ligne) =>
          ligne.description.trim() !== "" &&
          toNumber(ligne.quantite) > 0 &&
          toNumber(
            ligne.prixUnitaire,
          ) >= 0,
      );

    if (validLines.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Lignes manquantes",
        text:
          "Ajoutez au moins une ligne valide à la facture.",
      });

      return false;
    }

    if (total <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Montant invalide",
        text:
          "Le montant total de la facture doit être supérieur à zéro.",
      });

      return false;
    }

    if (
      dateEcheance &&
      dateEmission &&
      dateEcheance < dateEmission
    ) {
      Swal.fire({
        icon: "warning",
        title: "Date invalide",
        text:
          "La date d'échéance ne peut pas être antérieure à la date d'émission.",
      });

      return false;
    }

    if (toNumber(remise) < 0) {
      Swal.fire({
        icon: "warning",
        title: "Remise invalide",
        text:
          "La remise ne peut pas être négative.",
      });

      return false;
    }

    if (toNumber(taxe) < 0) {
      Swal.fire({
        icon: "warning",
        title: "Taxe invalide",
        text:
          "La taxe ne peut pas être négative.",
      });

      return false;
    }

    return true;
  }

  /* =======================================================
     SUBMIT
  ====================================================== */

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const lignesPayload = lignes
      .filter(
        (ligne) =>
          ligne.description.trim() !== "",
      )
      .map((ligne) => ({
        description:
          ligne.description.trim(),

        quantite:
          toNumber(ligne.quantite),

        prixUnitaire:
          toNumber(
            ligne.prixUnitaire,
          ),
      }));

    startTransition(async () => {
      try {
        const result =
          await updateFacture(
            facture.id,
            {
              inscriptionId,

              dateEmission:
                new Date(
                  `${dateEmission}T00:00:00`,
                ),

              dateEcheance:
                dateEcheance
                  ? new Date(
                      `${dateEcheance}T00:00:00`,
                    )
                  : null,

              remise:
                toNumber(remise),

              taxe:
                toNumber(taxe),

              statut,

              notes:
                notes.trim() || null,

              lignes:
                lignesPayload,
            },
          );

        if (!result?.success) {
          throw new Error(
            result?.message ||
              "Impossible de modifier la facture.",
          );
        }

        await Swal.fire({
          icon: "success",
          title: "Facture modifiée",
          text:
            result.message ||
            "La facture a été modifiée avec succès.",
          confirmButtonText:
            "Continuer",
        });

        router.push(
          `/factures/${facture.id}`,
        );

        router.refresh();
      } catch (error) {
        console.error(
          "UPDATE_FACTURE_ERROR",
          error,
        );

        await Swal.fire({
          icon: "error",
          title: "Erreur",
          text:
            error instanceof Error
              ? error.message
              : "Une erreur est survenue lors de la modification de la facture.",
        });
      }
    });
  }

  /* =======================================================
     RENDER
  ====================================================== */

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* ===================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col gap-4 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <ReceiptText size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Modifier la facture
              </h1>

              <p className="text-sm opacity-60">
                Facture{" "}
                <span className="font-semibold">
                  {facture.numero ??
                    facture.id}
                </span>
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push(
              `/factures/${facture.id}`,
            )
          }
          className="btn btn-outline gap-2"
          disabled={isPending}
        >
          <ArrowLeft size={18} />

          Retour
        </button>
      </div>

      {/* ===================================================
          INFORMATIONS
      ================================================== */}

      <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">
            Informations de la facture
          </h2>

          <p className="text-sm opacity-60">
            Modifiez les informations
            principales de la facture.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* INSCRIPTION */}

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium">
              Inscription *
            </label>

            <Select<
              InscriptionSelectOption,
              false
            >
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
              onChange={
                handleInscriptionChange
              }
              placeholder="Rechercher une inscription..."
              isClearable
              isSearchable
              menuPortalTarget={
                typeof document !==
                "undefined"
                  ? document.body
                  : undefined
              }
              styles={{
                menuPortal: (base) => ({
                  ...base,
                  zIndex: 9999,
                }),
              }}
              noOptionsMessage={() =>
                "Aucune inscription trouvée"
              }
            />

            {selectedInscription && (
              <div className="mt-3 rounded-xl bg-base-200 p-4 text-sm">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div>
                    <span className="opacity-50">
                      Apprenant
                    </span>

                    <div className="font-semibold">
                      {
                        selectedInscription
                          .apprenant
                          .prenom
                      }{" "}
                      {
                        selectedInscription
                          .apprenant.nom
                      }
                    </div>
                  </div>

                  <div>
                    <span className="opacity-50">
                      Formation
                    </span>

                    <div className="font-semibold">
                      {
                        selectedInscription
                          .session
                          .formation
                          .nom
                      }
                    </div>
                  </div>

                  <div>
                    <span className="opacity-50">
                      Montant convenu
                    </span>

                    <div className="font-semibold">
                      {money(
                        toNumber(
                          selectedInscription
                            .montantConvenu,
                        ),
                      )}{" "}
                      FCFA
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DATE EMISSION */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Date d'émission *
            </label>

            <input
              type="date"
              value={dateEmission}
              onChange={(event) =>
                setDateEmission(
                  event.target.value,
                )
              }
              className="input input-bordered w-full"
              required
            />
          </div>

          {/* DATE ECHEANCE */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Date d'échéance
            </label>

            <input
              type="date"
              value={dateEcheance}
              min={dateEmission}
              onChange={(event) =>
                setDateEcheance(
                  event.target.value,
                )
              }
              className="input input-bordered w-full"
            />
          </div>

          {/* STATUT */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Statut
            </label>

            <select
              value={statut}
              onChange={(event) =>
                setStatut(
                  event.target.value as
                    | "BROUILLON"
                    | "EMISE"
                    | "EN_RETARD",
                )
              }
              className="select select-bordered w-full"
            >
              {STATUTS.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ===================================================
          LIGNES
      ================================================== */}

      <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Lignes de facturation
            </h2>

            <p className="text-sm opacity-60">
              Modifiez les prestations ou
              frais facturés.
            </p>
          </div>

          <button
            type="button"
            onClick={addLine}
            className="btn btn-primary gap-2"
            disabled={isPending}
          >
            <Plus size={18} />

            Ajouter une ligne
          </button>
        </div>

        <div className="space-y-4">
          {lignes.map(
            (ligne, index) => {
              const lineTotal =
                toNumber(
                  ligne.quantite,
                ) *
                toNumber(
                  ligne.prixUnitaire,
                );

              return (
                <div
                  key={ligne.id}
                  className="rounded-xl border border-base-300 bg-base-200/40 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-semibold">
                      Ligne{" "}
                      {index + 1}
                    </span>

                    {lignes.length >
                      1 && (
                      <button
                        type="button"
                        onClick={() =>
                          removeLine(
                            ligne.id,
                          )
                        }
                        className="btn btn-sm btn-error btn-outline gap-2"
                        disabled={
                          isPending
                        }
                      >
                        <Trash2
                          size={16}
                        />

                        Supprimer
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                    {/* DESCRIPTION */}

                    <div className="md:col-span-6">
                      <label className="mb-2 block text-sm font-medium">
                        Description *
                      </label>

                      <input
                        type="text"
                        value={
                          ligne.description
                        }
                        onChange={(
                          event,
                        ) =>
                          updateLine(
                            ligne.id,
                            "description",
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="Ex. Frais de formation"
                        className="input input-bordered w-full"
                        disabled={
                          isPending
                        }
                      />
                    </div>

                    {/* QUANTITE */}

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium">
                        Quantité *
                      </label>

                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={
                          ligne.quantite
                        }
                        onChange={(
                          event,
                        ) =>
                          updateLine(
                            ligne.id,
                            "quantite",
                            event
                              .target
                              .value,
                          )
                        }
                        className="input input-bordered w-full"
                        disabled={
                          isPending
                        }
                      />
                    </div>

                    {/* PRIX */}

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium">
                        Prix unitaire *
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          ligne.prixUnitaire
                        }
                        onChange={(
                          event,
                        ) =>
                          updateLine(
                            ligne.id,
                            "prixUnitaire",
                            event
                              .target
                              .value,
                          )
                        }
                        className="input input-bordered w-full"
                        disabled={
                          isPending
                        }
                      />
                    </div>

                    {/* TOTAL LIGNE */}

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium">
                        Total
                      </label>

                      <div className="input input-bordered flex items-center bg-base-200 font-semibold">
                        {money(
                          lineTotal,
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* ===================================================
          TOTAUX
      ================================================== */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* AJUSTEMENTS */}

        <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <Calculator
              size={22}
              className="text-primary"
            />

            <div>
              <h2 className="text-lg font-semibold">
                Ajustements
              </h2>

              <p className="text-sm opacity-60">
                Remise et taxe
                éventuelles.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* REMISE */}

            <div>
              <label className="mb-2 block text-sm font-medium">
                Remise
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={remise}
                onChange={(event) =>
                  setRemise(
                    event.target
                      .value,
                  )
                }
                className="input input-bordered w-full"
                disabled={isPending}
              />
            </div>

            {/* TAXE */}

            <div>
              <label className="mb-2 block text-sm font-medium">
                Taxe
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={taxe}
                onChange={(event) =>
                  setTaxe(
                    event.target
                      .value,
                  )
                }
                className="input input-bordered w-full"
                disabled={isPending}
              />
            </div>
          </div>

          {/* NOTES */}

          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium">
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value,
                )
              }
              rows={5}
              placeholder="Notes internes ou conditions particulières..."
              className="textarea textarea-bordered w-full"
              disabled={isPending}
            />
          </div>
        </div>

        {/* RECAPITULATIF */}

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold">
            Récapitulatif
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="opacity-60">
                Sous-total
              </span>

              <strong>
                {money(
                  sousTotal,
                )}{" "}
                FCFA
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="opacity-60">
                Remise
              </span>

              <strong>
                -{" "}
                {money(
                  toNumber(
                    remise,
                  ),
                )}{" "}
                FCFA
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="opacity-60">
                Taxe
              </span>

              <strong>
                +{" "}
                {money(
                  toNumber(
                    taxe,
                  ),
                )}{" "}
                FCFA
              </strong>
            </div>

            <div className="divider" />

            <div className="flex items-center justify-between text-xl">
              <span className="font-bold">
                TOTAL
              </span>

              <strong className="text-primary">
                {money(total)}{" "}
                FCFA
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================
          ACTIONS
      ================================================== */}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() =>
            router.push(
              `/factures/${facture.id}`,
            )
          }
          className="btn btn-outline gap-2"
          disabled={isPending}
        >
          Annuler
        </button>

        <button
          type="submit"
          className="btn btn-primary gap-2"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <span className="loading loading-spinner loading-sm" />

              Modification...
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
  );
}
