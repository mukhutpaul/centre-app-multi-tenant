"use client";

import { useState } from "react";
import Select from "react-select";

import {
  createInscription,
  updateInscription,
} from "@/actions/inscription.actions";

import Swal from "sweetalert2";

type Props = {
  inscription?: any;
  apprenants: any[];
  sessions: any[];
  onSuccess: () => void;
  onCancel: () => void;
};

const statutOptions = [
  {
    value: "BROUILLON",
    label: "Brouillon",
  },
  {
    value: "EN_ATTENTE",
    label: "En attente",
  },
  {
    value: "CONFIRMEE",
    label: "Confirmée",
  },
  {
    value: "ACTIVE",
    label: "Active",
  },
  {
    value: "TERMINEE",
    label: "Terminée",
  },
  {
    value: "ANNULEE",
    label: "Annulée",
  },
  {
    value: "SUSPENDUE",
    label: "Suspendue",
  },
];

const financementOptions = [
  {
    value: "AUTO_FINANCEMENT",
    label: "Auto-financement",
  },
  {
    value: "ENTREPRISE",
    label: "Entreprise",
  },
  {
    value: "ETAT",
    label: "État",
  },
  {
    value: "PARTENAIRE",
    label: "Partenaire",
  },
  {
    value: "BOURSE",
    label: "Bourse",
  },
  {
    value: "AUTRE",
    label: "Autre",
  },
];

export default function InscriptionForm({
  inscription,
  apprenants,
  sessions,
  onSuccess,
  onCancel,
}: Props) {
  const editing = Boolean(inscription);

  const [apprenantId, setApprenantId] =
    useState(
      inscription?.apprenantId || "",
    );

  const [sessionId, setSessionId] =
    useState(
      inscription?.sessionId || "",
    );

  const [statut, setStatut] =
    useState(
      inscription?.statut || "BROUILLON",
    );

  const [typeFinancement, setTypeFinancement] =
    useState(
      inscription?.typeFinancement ||
        "AUTO_FINANCEMENT",
    );

  const [dateInscription, setDateInscription] =
    useState(
      inscription?.dateInscription
        ? new Date(
            inscription.dateInscription,
          )
            .toISOString()
            .split("T")[0]
        : new Date()
            .toISOString()
            .split("T")[0],
    );

  const [montantConvenu, setMontantConvenu] =
    useState(
      inscription?.montantConvenu
        ? String(inscription.montantConvenu)
        : "0",
    );

  const [notes, setNotes] =
    useState(
      inscription?.notes || "",
    );

  const [loading, setLoading] =
    useState(false);

  const apprenantOptions = apprenants.map(
    (a) => ({
      value: a.id,
      label: `${a.nom} ${a.prenom}${
        a.numero
          ? ` — ${a.numero}`
          : ""
      }`,
    }),
  );

  const sessionOptions = sessions.map(
    (s) => ({
      value: s.id,
      label: `${s.formation.nom} — ${
        s.nom || s.code
      } (${new Date(
        s.dateDebut,
      ).toLocaleDateString("fr-FR")})`,
    }),
  );

  const selectedApprenant =
    apprenantOptions.find(
      (option) =>
        option.value === apprenantId,
    ) || null;

  const selectedSession =
    sessionOptions.find(
      (option) =>
        option.value === sessionId,
    ) || null;

  async function handleSubmit(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    if (!apprenantId) {
      Swal.fire(
        "Attention",
        "Veuillez sélectionner un apprenant.",
        "warning",
      );
      return;
    }

    if (!sessionId) {
      Swal.fire(
        "Attention",
        "Veuillez sélectionner une session.",
        "warning",
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        apprenantId,
        sessionId,
        statut,
        typeFinancement,
        dateInscription,
        montantConvenu,
        notes,
      };

      if (editing) {
        await updateInscription(
          inscription.id,
          payload as any,
        );
      } else {
        await createInscription(
          payload as any,
        );
      }

      await Swal.fire({
        icon: "success",
        title: "Succès",
        text: editing
          ? "Inscription modifiée avec succès."
          : "Inscription créée avec succès.",
        timer: 1800,
        showConfirmButton: false,
      });

      onSuccess();
    } catch (error: any) {
      await Swal.fire({
        icon: "error",
        title: "Erreur",
        text:
          error?.message ||
          "Une erreur est survenue.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* APPRENANT */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Apprenant
          </label>

          <Select
            options={apprenantOptions}
            value={selectedApprenant}
            onChange={(option) =>
              setApprenantId(
                option?.value || "",
              )
            }
            placeholder="Sélectionner un apprenant..."
            isSearchable
            noOptionsMessage={() =>
              "Aucun apprenant trouvé"
            }
          />
        </div>

        {/* SESSION */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Session
          </label>

          <Select
            options={sessionOptions}
            value={selectedSession}
            onChange={(option) =>
              setSessionId(
                option?.value || "",
              )
            }
            placeholder="Sélectionner une session..."
            isSearchable
            noOptionsMessage={() =>
              "Aucune session trouvée"
            }
          />
        </div>

        {/* STATUT */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Statut
          </label>

          <select
            value={statut}
            onChange={(e) =>
              setStatut(e.target.value)
            }
            className="w-full rounded-lg border px-3 py-2.5"
          >
            {statutOptions.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ),
            )}
          </select>
        </div>

        {/* FINANCEMENT */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Type de financement
          </label>

          <select
            value={typeFinancement}
            onChange={(e) =>
              setTypeFinancement(
                e.target.value,
              )
            }
            className="w-full rounded-lg border px-3 py-2.5"
          >
            {financementOptions.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ),
            )}
          </select>
        </div>

        {/* DATE */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Date d'inscription
          </label>

          <input
            type="date"
            value={dateInscription}
            onChange={(e) =>
              setDateInscription(
                e.target.value,
              )
            }
            className="w-full rounded-lg border px-3 py-2.5"
            required
          />
        </div>

        {/* MONTANT */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Montant convenu
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={montantConvenu}
            onChange={(e) =>
              setMontantConvenu(
                e.target.value,
              )
            }
            className="w-full rounded-lg border px-3 py-2.5"
          />
        </div>
      </div>

      {/* NOTES */}
      <div>
        <label className="mb-2 block text-sm font-medium">
          Notes
        </label>

        <textarea
          value={notes}
          onChange={(e) =>
            setNotes(e.target.value)
          }
          rows={4}
          className="w-full rounded-lg border px-3 py-2.5"
          placeholder="Notes éventuelles..."
        />
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end gap-3 border-t pt-5">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-lg border px-5 py-2.5"
        >
          Annuler
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-5 py-2.5 text-white disabled:opacity-50"
        >
          {loading
            ? "Enregistrement..."
            : editing
              ? "Modifier"
              : "Créer l'inscription"}
        </button>
      </div>
    </form>
  );
}