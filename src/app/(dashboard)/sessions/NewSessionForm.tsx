"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  FileText,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import { createSession } from "@/actions/session.actions";

type Formation = {
  id: string;
  code: string;
  nom: string;
};

type Props = {
  formations?: Formation[];
};

type FormationOption = {
  value: string;
  label: string;
  code: string;
  nom: string;
};

const STATUTS = [
  {
    value: "PLANIFIEE",
    label: "Planifiée",
  },
  {
    value: "INSCRIPTIONS_OUVERTES",
    label: "Inscriptions ouvertes",
  },
  {
    value: "INSCRIPTIONS_FERMEES",
    label: "Inscriptions fermées",
  },
  {
    value: "EN_COURS",
    label: "En cours",
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

function isValidDate(value: string) {
  if (!value) return false;

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

export default function NewSessionForm({
  formations = [],
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [formationId, setFormationId] = useState("");
  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");

  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const [capacite, setCapacite] = useState("");

  const [statut, setStatut] = useState("PLANIFIEE");

  const [ouvertureInscriptions, setOuvertureInscriptions] =
    useState("");

  const [fermetureInscriptions, setFermetureInscriptions] =
    useState("");

  const [notes, setNotes] = useState("");

  /*
  |--------------------------------------------------------------------------
  | FORMATIONS
  |--------------------------------------------------------------------------
  */

  const formationOptions: FormationOption[] = formations.map(
    (formation) => ({
      value: formation.id,
      label: `${formation.code} — ${formation.nom}`,
      code: formation.code,
      nom: formation.nom,
    })
  );

  const selectedFormation =
    formationOptions.find(
      (option) => option.value === formationId
    ) ?? null;

  /*
  |--------------------------------------------------------------------------
  | VALIDATION
  |--------------------------------------------------------------------------
  */

  function validateForm() {
    if (!formationId) {
      toast.error("Veuillez sélectionner une formation.");
      return false;
    }

    if (!code.trim()) {
      toast.error(
        "Veuillez renseigner le code de la session."
      );
      return false;
    }

    if (code.trim().length < 2) {
      toast.error(
        "Le code de la session doit contenir au moins 2 caractères."
      );
      return false;
    }

    if (!dateDebut) {
      toast.error(
        "Veuillez renseigner la date de début."
      );
      return false;
    }

    if (!dateFin) {
      toast.error(
        "Veuillez renseigner la date de fin."
      );
      return false;
    }

    if (!isValidDate(dateDebut)) {
      toast.error(
        "La date de début est invalide."
      );
      return false;
    }

    if (!isValidDate(dateFin)) {
      toast.error(
        "La date de fin est invalide."
      );
      return false;
    }

    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);

    if (fin < debut) {
      toast.error(
        "La date de fin doit être supérieure ou égale à la date de début."
      );
      return false;
    }

    if (capacite.trim()) {
      const valeurCapacite = Number(capacite);

      if (
        !Number.isInteger(valeurCapacite) ||
        valeurCapacite <= 0
      ) {
        toast.error(
          "La capacité doit être un nombre entier supérieur à 0."
        );
        return false;
      }
    }

    if (
      ouvertureInscriptions &&
      !isValidDate(ouvertureInscriptions)
    ) {
      toast.error(
        "La date d'ouverture des inscriptions est invalide."
      );
      return false;
    }

    if (
      fermetureInscriptions &&
      !isValidDate(fermetureInscriptions)
    ) {
      toast.error(
        "La date de fermeture des inscriptions est invalide."
      );
      return false;
    }

    if (
      ouvertureInscriptions &&
      fermetureInscriptions
    ) {
      const ouverture =
        new Date(ouvertureInscriptions);

      const fermeture =
        new Date(fermetureInscriptions);

      if (fermeture < ouverture) {
        toast.error(
          "La fermeture des inscriptions doit être postérieure ou égale à leur ouverture."
        );
        return false;
      }
    }

    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | SUBMIT
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await createSession({
        formationId,

        code: code.trim(),

        nom: nom.trim() || null,

        dateDebut: new Date(dateDebut),

        dateFin: new Date(dateFin),

        capacite: capacite.trim()
          ? Number(capacite)
          : null,

        statut: statut as
          | "PLANIFIEE"
          | "INSCRIPTIONS_OUVERTES"
          | "INSCRIPTIONS_FERMEES"
          | "EN_COURS"
          | "TERMINEE"
          | "ANNULEE"
          | "SUSPENDUE",

        ouvertureInscriptions:
          ouvertureInscriptions
            ? new Date(ouvertureInscriptions)
            : null,

        fermetureInscriptions:
          fermetureInscriptions
            ? new Date(fermetureInscriptions)
            : null,

        notes: notes.trim() || null,
      });

      if (!result.success) {
        toast.error(
          result.message ||
            "Impossible de créer la session."
        );

        return;
      }

      toast.success(
        "Session créée avec succès."
      );

      router.push("/sessions");
      router.refresh();
    } catch (error) {
      console.error(
        "Erreur création session :",
        error
      );

      toast.error(
        "Une erreur est survenue lors de la création de la session."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* =====================================================
          INFORMATIONS PRINCIPALES
      ===================================================== */}

      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body">

          <div className="flex items-center gap-3 mb-5">

            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <FileText size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold">
                Informations générales
              </h2>

              <p className="text-sm text-base-content/60">
                Définissez la formation et
                l'identification de la session.
              </p>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* =================================================
                FORMATION
            ================================================= */}

            <div className="form-control md:col-span-2">

              <label className="label">
                <span className="label-text font-semibold">
                  Formation
                  <span className="text-error ml-1">
                    *
                  </span>
                </span>
              </label>

              <Select<FormationOption, false>
                instanceId="formation-session-select"
                options={formationOptions}
                value={selectedFormation}
                onChange={(option) => {
                  setFormationId(
                    option?.value ?? ""
                  );
                }}
                isDisabled={
                  loading ||
                  formationOptions.length === 0
                }
                isClearable
                isSearchable
                placeholder="Rechercher une formation..."
                noOptionsMessage={() =>
                  "Aucune formation disponible"
                }
                loadingMessage={() =>
                  "Chargement..."
                }
                formatOptionLabel={(option) => (
                  <div className="flex flex-col">
                    <span className="font-semibold">
                      {option.code}
                    </span>

                    <span className="text-sm text-base-content/60">
                      {option.nom}
                    </span>
                  </div>
                )}
                className="react-select-container"
                classNamePrefix="react-select"
              />

              {formationOptions.length === 0 && (
                <label className="label">
                  <span className="label-text-alt text-warning">
                    Aucune formation disponible.
                  </span>
                </label>
              )}

            </div>

            {/* =================================================
                CODE
            ================================================= */}

            <div className="form-control">

              <label className="label">
                <span className="label-text font-semibold">
                  Code de la session
                  <span className="text-error ml-1">
                    *
                  </span>
                </span>
              </label>

              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Ex. SESSION-2026-01"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value)
                }
                maxLength={50}
                required
                disabled={loading}
              />

              <label className="label">
                <span className="label-text-alt text-base-content/50">
                  Le code doit être unique dans votre centre.
                </span>
              </label>

            </div>

            {/* =================================================
                NOM
            ================================================= */}

            <div className="form-control">

              <label className="label">
                <span className="label-text font-semibold">
                  Nom de la session
                </span>
              </label>

              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Ex. Session de septembre 2026"
                value={nom}
                onChange={(event) =>
                  setNom(event.target.value)
                }
                disabled={loading}
              />

            </div>

          </div>

        </div>
      </div>

      {/* =====================================================
          DATES
      ===================================================== */}

      <div className="card bg-base-100 border border-base-300 shadow-sm">

        <div className="card-body">

          <div className="flex items-center gap-3 mb-5">

            <div className="p-3 rounded-xl bg-info/10 text-info">
              <CalendarDays size={22} />
            </div>

            <div>

              <h2 className="text-lg font-bold">
                Période de formation
              </h2>

              <p className="text-sm text-base-content/60">
                Définissez les dates de début et de fin.
              </p>

            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <div className="form-control">

              <label className="label">
                <span className="label-text font-semibold">
                  Date et heure de début
                  <span className="text-error ml-1">
                    *
                  </span>
                </span>
              </label>

              <input
                type="datetime-local"
                className="input input-bordered w-full"
                value={dateDebut}
                onChange={(event) =>
                  setDateDebut(event.target.value)
                }
                required
                disabled={loading}
              />

            </div>

            <div className="form-control">

              <label className="label">
                <span className="label-text font-semibold">
                  Date et heure de fin
                  <span className="text-error ml-1">
                    *
                  </span>
                </span>
              </label>

              <input
                type="datetime-local"
                className="input input-bordered w-full"
                value={dateFin}
                onChange={(event) =>
                  setDateFin(event.target.value)
                }
                required
                disabled={loading}
              />

            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          CAPACITE + STATUT
      ===================================================== */}

      <div className="card bg-base-100 border border-base-300 shadow-sm">

        <div className="card-body">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <div className="form-control">

              <label className="label">
                <span className="label-text font-semibold">
                  Capacité maximale
                </span>
              </label>

              <input
                type="number"
                min={1}
                step={1}
                className="input input-bordered w-full"
                placeholder="Ex. 30"
                value={capacite}
                onChange={(event) =>
                  setCapacite(event.target.value)
                }
                disabled={loading}
              />

              <label className="label">
                <span className="label-text-alt text-base-content/50">
                  Laissez vide pour une capacité illimitée.
                </span>
              </label>

            </div>

            <div className="form-control">

              <label className="label">
                <span className="label-text font-semibold">
                  Statut
                  <span className="text-error ml-1">
                    *
                  </span>
                </span>
              </label>

              <select
                className="select select-bordered w-full"
                value={statut}
                onChange={(event) =>
                  setStatut(event.target.value)
                }
                disabled={loading}
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

      </div>

      {/* =====================================================
          INSCRIPTIONS
      ===================================================== */}

      <div className="card bg-base-100 border border-base-300 shadow-sm">

        <div className="card-body">

          <div className="mb-5">

            <h2 className="text-lg font-bold">
              Inscriptions
            </h2>

            <p className="text-sm text-base-content/60">
              Définissez éventuellement la période pendant
              laquelle les apprenants pourront s'inscrire.
            </p>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <div className="form-control">

              <label className="label">
                <span className="label-text font-semibold">
                  Ouverture des inscriptions
                </span>
              </label>

              <input
                type="datetime-local"
                className="input input-bordered w-full"
                value={ouvertureInscriptions}
                onChange={(event) =>
                  setOuvertureInscriptions(
                    event.target.value
                  )
                }
                disabled={loading}
              />

            </div>

            <div className="form-control">

              <label className="label">
                <span className="label-text font-semibold">
                  Fermeture des inscriptions
                </span>
              </label>

              <input
                type="datetime-local"
                className="input input-bordered w-full"
                value={fermetureInscriptions}
                onChange={(event) =>
                  setFermetureInscriptions(
                    event.target.value
                  )
                }
                disabled={loading}
              />

            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          NOTES
      ===================================================== */}

      <div className="card bg-base-100 border border-base-300 shadow-sm">

        <div className="card-body">

          <div className="form-control">

            <label className="label">
              <span className="label-text font-semibold">
                Notes
              </span>
            </label>

            <textarea
              className="textarea textarea-bordered w-full min-h-32"
              placeholder="Informations complémentaires sur cette session..."
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              disabled={loading}
            />

          </div>

        </div>

      </div>

      {/* =====================================================
          ACTIONS
      ===================================================== */}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">

        <button
          type="button"
          className="btn btn-ghost gap-2"
          disabled={loading}
          onClick={() =>
            router.push("/sessions")
          }
        >
          <ArrowLeft size={18} />
          Annuler
        </button>

        <button
          type="submit"
          className="btn btn-primary gap-2 min-w-48"
          disabled={
            loading ||
            formationOptions.length === 0
          }
        >
          {loading ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Création...
            </>
          ) : (
            <>
              <Save size={18} />
              Créer la session
            </>
          )}
        </button>

      </div>

      {/* =====================================================
          INDICATION
      ===================================================== */}

      <div className="flex items-center gap-2 text-sm text-base-content/50">

        <Check
          size={16}
          className="text-success"
        />

        <span>
          Les champs marqués d'un astérisque sont obligatoires.
        </span>

      </div>

    </form>
  );
}