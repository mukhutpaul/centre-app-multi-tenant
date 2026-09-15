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
  CreditCard,
  Save,
} from "lucide-react";

import { createPaiement } from "@/actions/paiement.actions";

type Echeance = {
  id: string;
  numero: number;
  dateEcheance: string | Date;
  montant: string;
  montantPaye: string;
  montantDu: string;
  statut: string;
};

type Facture = {
  id: string;
  numero: string;
  total: string;
  montantPaye: string;
  montantDu: string;
  statut: string;
  echeances: Echeance[];
};

type Inscription = {
  id: string;
  numero: string;
  montantConvenu: string;

  apprenant: {
    id: string;
    prenom: string;
    nom: string;
  };

  session: {
    id: string;
    code: string;
    nom: string | null;

    formation: {
      id: string;
      nom: string;
    };
  };

  factures: Facture[];
};

type Props = {
  data: {
    inscriptions: Inscription[];
  };
};

const modes = [
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

function numberValue(value: unknown) {
  const number = Number(
    String(value ?? "0"),
  );

  return Number.isFinite(number)
    ? number
    : 0;
}

function money(value: unknown) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(numberValue(value));
}

function formatDate(value: unknown) {
  const date = new Date(
    String(value),
  );

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
    },
  ).format(date);
}

export default function PaiementForm({
  data,
}: Props) {
  const router = useRouter();

  const {
    inscriptions = [],
  } = data;

  const [isPending, startTransition] =
    useTransition();

  const [inscriptionId, setInscriptionId] =
    useState("");

  const [factureId, setFactureId] =
    useState("");

  const [echeanceId, setEcheanceId] =
    useState("");

  const [montant, setMontant] =
    useState("");

  const [mode, setMode] =
    useState("ESPECES");

  const [reference, setReference] =
    useState("");

  const [datePaiement, setDatePaiement] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10),
    );

  const [
    referenceTransaction,
    setReferenceTransaction,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const selectedInscription =
    useMemo(
      () =>
        inscriptions.find(
          (item) =>
            item.id ===
            inscriptionId,
        ),
      [
        inscriptions,
        inscriptionId,
      ],
    );

  const factures =
    selectedInscription?.factures ??
    [];

  const selectedFacture =
    factures.find(
      (item) =>
        item.id === factureId,
    );

  const echeances =
    selectedFacture?.echeances ??
    [];

  const selectedEcheance =
    echeances.find(
      (item) =>
        item.id === echeanceId,
    );

  const inscriptionOptions =
    inscriptions.map(
      (item) => ({
        value: item.id,

        label: `${item.numero} — ${item.apprenant.prenom} ${item.apprenant.nom} — ${item.session.formation.nom}`,
      }),
    );

  const factureOptions =
    factures
      .filter(
        (facture) =>
          numberValue(
            facture.montantDu,
          ) > 0,
      )
      .map(
        (facture) => ({
          value: facture.id,

          label: `${facture.numero} — reste ${money(
            facture.montantDu,
          )} FCFA`,
        }),
      );

  const echeanceOptions =
    echeances
      .filter(
        (echeance) =>
          numberValue(
            echeance.montantDu,
          ) > 0 &&
          echeance.statut !==
            "ANNULEE",
      )
      .map(
        (echeance) => ({
          value: echeance.id,

          label: `Échéance #${echeance.numero} — ${formatDate(
            echeance.dateEcheance,
          )} — reste ${money(
            echeance.montantDu,
          )} FCFA`,
        }),
      );

  function handleInscriptionChange(
    option: {
      value: string;
      label: string;
    } | null,
  ) {
    const id =
      option?.value ?? "";

    setInscriptionId(id);

    setFactureId("");
    setEcheanceId("");
    setMontant("");

    if (!id) {
      return;
    }

    const inscription =
      inscriptions.find(
        (item) =>
          item.id === id,
      );

    if (!inscription) {
      return;
    }

    const facture =
      inscription.factures.find(
        (item) =>
          numberValue(
            item.montantDu,
          ) > 0,
      );

    if (!facture) {
      return;
    }

    setFactureId(
      facture.id,
    );

    const echeance =
      facture.echeances.find(
        (item) =>
          numberValue(
            item.montantDu,
          ) > 0 &&
          item.statut !==
            "ANNULEE",
      );

    if (echeance) {
      setEcheanceId(
        echeance.id,
      );

      setMontant(
        echeance.montantDu,
      );
    } else {
      setMontant(
        facture.montantDu,
      );
    }
  }

  function handleFactureChange(
    option: {
      value: string;
      label: string;
    } | null,
  ) {
    const id =
      option?.value ?? "";

    setFactureId(id);
    setEcheanceId("");
    setMontant("");

    if (!id) {
      return;
    }

    const facture =
      factures.find(
        (item) =>
          item.id === id,
      );

    if (!facture) {
      return;
    }

    const echeance =
      facture.echeances.find(
        (item) =>
          numberValue(
            item.montantDu,
          ) > 0 &&
          item.statut !==
            "ANNULEE",
      );

    if (echeance) {
      setEcheanceId(
        echeance.id,
      );

      setMontant(
        echeance.montantDu,
      );
    } else {
      setMontant(
        facture.montantDu,
      );
    }
  }

  function handleEcheanceChange(
    option: {
      value: string;
      label: string;
    } | null,
  ) {
    const id =
      option?.value ?? "";

    setEcheanceId(id);

    if (!id) {
      setMontant("");
      return;
    }

    const echeance =
      echeances.find(
        (item) =>
          item.id === id,
      );

    if (echeance) {
      setMontant(
        echeance.montantDu,
      );
    }
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!inscriptionId) {
      Swal.fire({
        icon: "warning",
        title:
          "Inscription obligatoire",
        text:
          "Sélectionnez l'inscription concernée.",
      });

      return;
    }

    if (!factureId) {
      Swal.fire({
        icon: "warning",
        title:
          "Facture obligatoire",
        text:
          "Sélectionnez la facture à régler.",
      });

      return;
    }

    if (
      !montant ||
      numberValue(montant) <= 0
    ) {
      Swal.fire({
        icon: "warning",
        title:
          "Montant invalide",
        text:
          "Le montant du paiement doit être supérieur à zéro.",
      });

      return;
    }

    if (!reference.trim()) {
      Swal.fire({
        icon: "warning",
        title:
          "Référence obligatoire",
        text:
          "Veuillez renseigner la référence du paiement.",
      });

      return;
    }

    if (
      selectedEcheance &&
      numberValue(montant) >
        numberValue(
          selectedEcheance.montantDu,
        )
    ) {
      Swal.fire({
        icon: "warning",
        title:
          "Montant trop élevé",
        text: `Le reste de cette échéance est de ${money(
          selectedEcheance.montantDu,
        )} FCFA.`,
      });

      return;
    }

    if (
      selectedFacture &&
      numberValue(montant) >
        numberValue(
          selectedFacture.montantDu,
        )
    ) {
      Swal.fire({
        icon: "warning",
        title:
          "Montant trop élevé",
        text: `Le reste de cette facture est de ${money(
          selectedFacture.montantDu,
        )} FCFA.`,
      });

      return;
    }

    startTransition(async () => {
      try {
        const result =
          await createPaiement({
            apprenantId:
              selectedInscription
                ?.apprenant.id ??
              null,

            inscriptionId,

            factureId,

            echeanceId:
              echeanceId ||
              null,

            reference:
              reference.trim(),

            montant:
              numberValue(montant),

            mode,

            statut:
              "EFFECTUE",

            datePaiement:
              datePaiement,

            referenceTransaction:
              referenceTransaction.trim() ||
              null,

            notes:
              notes.trim() ||
              null,
          });

        if (!result.success) {
          throw new Error(
            result.message,
          );
        }

        await Swal.fire({
          icon: "success",
          title:
            "Paiement enregistré",
          text: result.message,
          confirmButtonText:
            "Continuer",
        });

        router.push(
          "/paiements",
        );

        router.refresh();
      } catch (error) {
        console.error(
          "CREATE_PAIEMENT_CLIENT_ERROR",
          error,
        );

        await Swal.fire({
          icon: "error",
          title: "Erreur",
          text:
            error instanceof Error
              ? error.message
              : "Impossible d'enregistrer le paiement.",
        });
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* HEADER */}

      <div className="flex flex-col gap-4 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <CreditCard size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-bold">
              Nouveau paiement
            </h1>

            <p className="text-sm opacity-60">
              Enregistrez un règlement
              sur une facture ou une
              échéance.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push(
              "/paiements",
            )
          }
          className="btn btn-outline gap-2"
          disabled={isPending}
        >
          <ArrowLeft size={18} />
          Retour
        </button>
      </div>

      {/* DOCUMENT */}

      <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold">
          Document à régler
        </h2>

        <div className="space-y-5">
          {/* INSCRIPTION */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Inscription *
            </label>

            <Select
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
              isClearable
              isSearchable
              placeholder="Sélectionner une inscription..."
              noOptionsMessage={() =>
                "Aucune inscription trouvée"
              }
              menuPortalTarget={
                typeof document !==
                "undefined"
                  ? document.body
                  : undefined
              }
              styles={{
                menuPortal: (
                  base,
                ) => ({
                  ...base,
                  zIndex: 9999,
                }),
              }}
            />
          </div>

          {/* INFOS INSCRIPTION */}

          {selectedInscription && (
            <div className="rounded-xl bg-base-200 p-4 text-sm">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                        .apprenant
                        .nom
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
                    Nombre de factures ouvertes
                  </span>

                  <div className="font-semibold">
                    {
                      factureOptions.length
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FACTURE */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Facture *
            </label>

            <Select
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
              onChange={
                handleFactureChange
              }
              isClearable
              isSearchable
              isDisabled={
                !inscriptionId
              }
              placeholder={
                inscriptionId
                  ? "Sélectionner une facture..."
                  : "Sélectionnez d'abord une inscription"
              }
              noOptionsMessage={() =>
                "Aucune facture avec solde"
              }
              menuPortalTarget={
                typeof document !==
                "undefined"
                  ? document.body
                  : undefined
              }
              styles={{
                menuPortal: (
                  base,
                ) => ({
                  ...base,
                  zIndex: 9999,
                }),
              }}
            />
          </div>

          {/* INFOS FACTURE */}

          {selectedFacture && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <span className="text-sm opacity-50">
                    Facture
                  </span>

                  <div className="font-semibold">
                    {
                      selectedFacture
                        .numero
                    }
                  </div>
                </div>

                <div>
                  <span className="text-sm opacity-50">
                    Total
                  </span>

                  <div className="font-semibold">
                    {money(
                      selectedFacture.total,
                    )}{" "}
                    FCFA
                  </div>
                </div>

                <div>
                  <span className="text-sm opacity-50">
                    Reste
                  </span>

                  <div className="font-semibold text-error">
                    {money(
                      selectedFacture.montantDu,
                    )}{" "}
                    FCFA
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ECHEANCE */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Échéance
            </label>

            <Select
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
              onChange={
                handleEcheanceChange
              }
              isClearable
              isSearchable
              isDisabled={
                !factureId ||
                echeanceOptions.length ===
                  0
              }
              placeholder={
                !factureId
                  ? "Sélectionnez d'abord une facture"
                  : echeanceOptions.length
                    ? "Sélectionner une échéance..."
                    : "Aucune échéance avec solde"
              }
              noOptionsMessage={() =>
                "Aucune échéance disponible"
              }
              menuPortalTarget={
                typeof document !==
                "undefined"
                  ? document.body
                  : undefined
              }
              styles={{
                menuPortal: (
                  base,
                ) => ({
                  ...base,
                  zIndex: 9999,
                }),
              }}
            />
          </div>
        </div>
      </div>

      {/* PAIEMENT */}

      <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold">
          Informations du paiement
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* MONTANT */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Montant *
            </label>

            <input
              type="number"
              min="0.01"
              step="0.01"
              value={montant}
              onChange={(event) =>
                setMontant(
                  event.target.value,
                )
              }
              className="input input-bordered w-full"
              required
            />

            {selectedEcheance && (
              <p className="mt-2 text-xs opacity-60">
                Reste de l'échéance :{" "}
                <strong>
                  {money(
                    selectedEcheance.montantDu,
                  )}{" "}
                  FCFA
                </strong>
              </p>
            )}
          </div>

          {/* MODE */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Mode de paiement *
            </label>

            <select
              value={mode}
              onChange={(event) =>
                setMode(
                  event.target.value,
                )
              }
              className="select select-bordered w-full"
            >
              {modes.map(
                (item) => (
                  <option
                    key={
                      item.value
                    }
                    value={
                      item.value
                    }
                  >
                    {item.label}
                  </option>
                ),
              )}
            </select>
          </div>

          {/* REFERENCE */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Référence *
            </label>

            <input
              type="text"
              value={reference}
              onChange={(event) =>
                setReference(
                  event.target.value,
                )
              }
              placeholder="Ex. PAY-2026-0001"
              className="input input-bordered w-full"
              required
            />
          </div>

          {/* DATE */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Date du paiement *
            </label>

            <input
              type="date"
              value={datePaiement}
              onChange={(event) =>
                setDatePaiement(
                  event.target.value,
                )
              }
              className="input input-bordered w-full"
              required
            />
          </div>

          {/* REFERENCE TRANSACTION */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Référence transaction
            </label>

            <input
              type="text"
              value={
                referenceTransaction
              }
              onChange={(event) =>
                setReferenceTransaction(
                  event.target.value,
                )
              }
              placeholder="Mobile Money, banque..."
              className="input input-bordered w-full"
            />
          </div>

          {/* NOTES */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Notes
            </label>

            <input
              type="text"
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value,
                )
              }
              placeholder="Observation..."
              className="input input-bordered w-full"
            />
          </div>
        </div>
      </div>

      {/* RESUME */}

      {selectedFacture && (
        <div className="rounded-2xl border border-success/20 bg-success/5 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <span className="text-sm opacity-60">
                Total facture
              </span>

              <div className="text-lg font-bold">
                {money(
                  selectedFacture.total,
                )}{" "}
                FCFA
              </div>
            </div>

            <div>
              <span className="text-sm opacity-60">
                Déjà payé
              </span>

              <div className="text-lg font-bold text-success">
                {money(
                  selectedFacture.montantPaye,
                )}{" "}
                FCFA
              </div>
            </div>

            <div>
              <span className="text-sm opacity-60">
                Nouveau solde après paiement
              </span>

              <div className="text-lg font-bold text-primary">
                {money(
                  Math.max(
                    numberValue(
                      selectedFacture.montantDu,
                    ) -
                      numberValue(
                        montant,
                      ),
                    0,
                  ),
                )}{" "}
                FCFA
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIONS */}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() =>
            router.push(
              "/paiements",
            )
          }
          className="btn btn-outline"
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
              Enregistrement...
            </>
          ) : (
            <>
              <Save size={18} />
              Enregistrer le paiement
            </>
          )}
        </button>
      </div>
    </form>
  );
}