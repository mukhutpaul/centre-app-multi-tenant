"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Select from "react-select";
import Swal from "sweetalert2";

import { createSalle } from "@/actions/planing.actions";

// ============================================================
// TYPES
// ============================================================

interface Formation {
  id: string;
  code: string;
  nom: string;
}

interface SessionPlanning {
  id: string;
  code: string;
  nom: string | null;
  dateDebut: string;
  dateFin: string;
  statut: string;

  formation: Formation;
}

interface Salle {
  id: string;
  nom: string;
  code: string;
  capacite: number | null;
  localisation: string | null;
}

export interface PlanningFormState {
  id?: string;
  sessionId: string;
  salleId: string;
  titre: string;
  debut: string;
  fin: string;
  description: string;
}

interface Props {
  value: PlanningFormState;

  sessions: SessionPlanning[];

  salles: Salle[];

  isPending: boolean;

  onClose: () => void;

  onSubmit: (data: PlanningFormState) => void;

  onDelete?: (id: string) => void;
}

interface SelectOption {
  value: string;
  label: string;
}

// ============================================================
// COMPOSANT
// ============================================================

export default function PlanningForm({
  value,
  sessions,
  salles,
  isPending,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const [form, setForm] =
    useState<PlanningFormState>(value);

  const [localSalles, setLocalSalles] =
    useState<Salle[]>(salles);

  const [showSalleForm, setShowSalleForm] =
    useState(false);

  const [sallePending, setSallePending] =
    useState(false);

  const [nouvelleSalle, setNouvelleSalle] =
    useState({
      nom: "",
      code: "",
      capacite: "",
      localisation: "",
    });

  // ==========================================================
  // SYNCHRONISER LE FORMULAIRE
  // ==========================================================

  useEffect(() => {
    setForm(value);
  }, [value]);

  // ==========================================================
  // SYNCHRONISER LES SALLES
  // ==========================================================

  useEffect(() => {
    setLocalSalles(salles);
  }, [salles]);

  // ==========================================================
  // MODIFIER UN CHAMP
  // ==========================================================

  function updateField(
    field: keyof PlanningFormState,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // ==========================================================
  // OPTIONS SESSION
  // ==========================================================

  const sessionOptions: SelectOption[] =
    sessions.map((session) => ({
      value: session.id,
      label: `${session.formation.code} — ${session.formation.nom} — ${session.code}${
        session.nom
          ? ` — ${session.nom}`
          : ""
      }`,
    }));

  // ==========================================================
  // OPTIONS SALLE
  // ==========================================================

  const salleOptions: SelectOption[] =
    localSalles.map((salle) => ({
      value: salle.id,
      label: `${salle.nom} (${salle.code})${
        salle.capacite
          ? ` — ${salle.capacite} places`
          : ""
      }`,
    }));

  // ==========================================================
  // SESSION SÉLECTIONNÉE
  // ==========================================================

  const selectedSession =
    sessionOptions.find(
      (option) =>
        option.value === form.sessionId,
    ) ?? null;

  // ==========================================================
  // SALLE SÉLECTIONNÉE
  // ==========================================================

  const selectedSalle =
    salleOptions.find(
      (option) =>
        option.value === form.salleId,
    ) ?? null;

  // ==========================================================
  // CRÉER UNE SALLE
  // ==========================================================

  async function handleCreateSalle(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (sallePending) {
      return;
    }

    const nom =
      nouvelleSalle.nom.trim();

    const code =
      nouvelleSalle.code.trim();

    const localisation =
      nouvelleSalle.localisation.trim();

    if (!nom) {
      await Swal.fire({
        icon: "warning",
        title: "Nom obligatoire",
        text: "Veuillez saisir le nom de la salle.",
        confirmButtonText: "OK",
      });

      return;
    }

    if (!code) {
      await Swal.fire({
        icon: "warning",
        title: "Code obligatoire",
        text: "Veuillez saisir le code de la salle.",
        confirmButtonText: "OK",
      });

      return;
    }

    let capacite: number | null = null;

    if (nouvelleSalle.capacite.trim()) {
      capacite = Number(
        nouvelleSalle.capacite,
      );

      if (
        !Number.isInteger(capacite) ||
        capacite < 1
      ) {
        await Swal.fire({
          icon: "warning",
          title: "Capacité invalide",
          text: "La capacité doit être un nombre entier supérieur à 0.",
          confirmButtonText: "OK",
        });

        return;
      }
    }

    setSallePending(true);

    try {
      const result = await createSalle({
        nom,
        code,
        capacite,
        localisation:
          localisation || null,
      });

      if (!result.success || !result.salle) {
        await Swal.fire({
          icon: "error",
          title: "Création impossible",
          text:
            result.message ||
            "Impossible de créer la salle.",
          confirmButtonText: "OK",
        });

        return;
      }

      const salle = result.salle;

      // Ajouter immédiatement la salle
      setLocalSalles((current) => [
        ...current,
        salle,
      ]);

      // Sélectionner automatiquement
      updateField(
        "salleId",
        salle.id,
      );

      // Réinitialiser
      setNouvelleSalle({
        nom: "",
        code: "",
        capacite: "",
        localisation: "",
      });

      setShowSalleForm(false);

      await Swal.fire({
        icon: "success",
        title: "Salle créée",
        text: `${salle.nom} a été ajoutée avec succès.`,
        confirmButtonText: "Continuer",
        timer: 1800,
        timerProgressBar: true,
      });
    } catch (error) {
      console.error(
        "Erreur création salle :",
        error,
      );

      await Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Une erreur inattendue est survenue.",
        confirmButtonText: "OK",
      });
    } finally {
      setSallePending(false);
    }
  }

  // ==========================================================
  // SUBMIT PLANNING
  // ==========================================================

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">

      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-base-100 shadow-2xl">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-xl font-bold">
              {form.id
                ? "Modifier l'événement"
                : "Nouvel événement"}
            </h2>

            <p className="text-sm opacity-60">
              Planification d'une session de formation
            </p>
          </div>

          <button
            type="button"
            disabled={
              isPending ||
              sallePending
            }
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
          >
            ✕
          </button>
        </div>

        {/* ==================================================
            FORM
        ================================================== */}

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-5"
        >

          {/* =================================================
              SESSION
          ================================================= */}

          <div className="form-control">

            <label className="label">
              <span className="label-text font-semibold">
                Session *
              </span>
            </label>

            <Select<SelectOption>
              instanceId="planning-session"
              isDisabled={
                isPending ||
                sallePending
              }
              isSearchable
              isClearable={false}
              placeholder="Rechercher une session..."
              noOptionsMessage={() =>
                "Aucune session trouvée"
              }
              value={selectedSession}
              options={sessionOptions}
              onChange={(option) => {
                updateField(
                  "sessionId",
                  option?.value ?? "",
                );
              }}
              className="w-full"
              classNamePrefix="planning-select"
            />

          </div>

          {/* =================================================
              TITRE
          ================================================= */}

          <div className="form-control">

            <label className="label">
              <span className="label-text font-semibold">
                Titre
              </span>
            </label>

            <input
              type="text"
              disabled={
                isPending ||
                sallePending
              }
              value={form.titre}
              onChange={(event) =>
                updateField(
                  "titre",
                  event.target.value,
                )
              }
              placeholder="Ex. Cours de droit administratif"
              className="input input-bordered w-full"
            />

          </div>

          {/* =================================================
              SALLE
          ================================================= */}

          <div className="form-control">

            <div className="mb-2 flex items-center justify-between">

              <label className="label p-0">
                <span className="label-text font-semibold">
                  Salle
                </span>
              </label>

              <button
                type="button"
                disabled={
                  isPending ||
                  sallePending
                }
                onClick={() =>
                  setShowSalleForm(
                    (current) => !current,
                  )
                }
                className="btn btn-sm btn-outline btn-primary"
              >
                {showSalleForm
                  ? "Fermer"
                  : "+ Ajouter une salle"}
              </button>

            </div>

            <Select<SelectOption>
              instanceId="planning-salle"
              isDisabled={
                isPending ||
                sallePending
              }
              isSearchable
              isClearable
              placeholder="Rechercher une salle..."
              noOptionsMessage={() =>
                "Aucune salle trouvée"
              }
              value={selectedSalle}
              options={salleOptions}
              onChange={(option) => {
                updateField(
                  "salleId",
                  option?.value ?? "",
                );
              }}
              className="w-full"
              classNamePrefix="planning-select"
            />

            {/* =================================================
                FORMULAIRE NOUVELLE SALLE
            ================================================= */}

            {showSalleForm && (
              <div className="mt-4 rounded-xl border border-primary/20 bg-base-200 p-4">

                <div className="mb-4">
                  <h3 className="font-semibold">
                    Nouvelle salle
                  </h3>

                  <p className="text-sm opacity-60">
                    Créez une salle sans quitter le calendrier.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                  {/* NOM */}

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">
                        Nom *
                      </span>
                    </label>

                    <input
                      type="text"
                      required
                      disabled={sallePending}
                      value={
                        nouvelleSalle.nom
                      }
                      onChange={(event) =>
                        setNouvelleSalle(
                          (current) => ({
                            ...current,
                            nom: event.target.value,
                          }),
                        )
                      }
                      placeholder="Ex. Salle de conférence"
                      className="input input-bordered w-full bg-base-100"
                    />
                  </div>

                  {/* CODE */}

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">
                        Code *
                      </span>
                    </label>

                    <input
                      type="text"
                      required
                      disabled={sallePending}
                      value={
                        nouvelleSalle.code
                      }
                      onChange={(event) =>
                        setNouvelleSalle(
                          (current) => ({
                            ...current,
                            code: event.target.value.toUpperCase(),
                          }),
                        )
                      }
                      placeholder="Ex. SALLE-01"
                      className="input input-bordered w-full bg-base-100 uppercase"
                    />
                  </div>

                  {/* CAPACITÉ */}

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">
                        Capacité
                      </span>
                    </label>

                    <input
                      type="number"
                      min="1"
                      disabled={sallePending}
                      value={
                        nouvelleSalle.capacite
                      }
                      onChange={(event) =>
                        setNouvelleSalle(
                          (current) => ({
                            ...current,
                            capacite:
                              event.target.value,
                          }),
                        )
                      }
                      placeholder="Ex. 30"
                      className="input input-bordered w-full bg-base-100"
                    />
                  </div>

                  {/* LOCALISATION */}

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">
                        Localisation
                      </span>
                    </label>

                    <input
                      type="text"
                      disabled={sallePending}
                      value={
                        nouvelleSalle.localisation
                      }
                      onChange={(event) =>
                        setNouvelleSalle(
                          (current) => ({
                            ...current,
                            localisation:
                              event.target.value,
                          }),
                        )
                      }
                      placeholder="Ex. Bâtiment A, 2e étage"
                      className="input input-bordered w-full bg-base-100"
                    />
                  </div>

                </div>

                {/* ACTIONS SALLE */}

                <div className="mt-4 flex justify-end gap-3">

                  <button
                    type="button"
                    disabled={sallePending}
                    onClick={() =>
                      setShowSalleForm(
                        false,
                      )
                    }
                    className="btn btn-ghost"
                  >
                    Annuler
                  </button>

                  <button
                    type="button"
                    disabled={
                      sallePending ||
                      !nouvelleSalle.nom.trim() ||
                      !nouvelleSalle.code.trim()
                    }
                    onClick={() => {
                      const fakeEvent = {
                        preventDefault: () => {},
                      } as FormEvent<HTMLFormElement>;

                      handleCreateSalle(
                        fakeEvent,
                      );
                    }}
                    className="btn btn-primary"
                  >
                    {sallePending ? (
                      <>
                        <span className="loading loading-spinner loading-sm" />
                        Création...
                      </>
                    ) : (
                      "Créer la salle"
                    )}
                  </button>

                </div>

              </div>
            )}

          </div>

          {/* =================================================
              DATES
          ================================================= */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <div className="form-control">

              <label className="label">
                <span className="label-text font-semibold">
                  Début *
                </span>
              </label>

              <input
                type="datetime-local"
                required
                disabled={
                  isPending ||
                  sallePending
                }
                value={form.debut}
                onChange={(event) =>
                  updateField(
                    "debut",
                    event.target.value,
                  )
                }
                className="input input-bordered w-full"
              />

            </div>

            <div className="form-control">

              <label className="label">
                <span className="label-text font-semibold">
                  Fin *
                </span>
              </label>

              <input
                type="datetime-local"
                required
                disabled={
                  isPending ||
                  sallePending
                }
                value={form.fin}
                onChange={(event) =>
                  updateField(
                    "fin",
                    event.target.value,
                  )
                }
                className="input input-bordered w-full"
              />

            </div>

          </div>

          {/* =================================================
              DESCRIPTION
          ================================================= */}

          <div className="form-control">

            <label className="label">
              <span className="label-text font-semibold">
                Description
              </span>
            </label>

            <textarea
              disabled={
                isPending ||
                sallePending
              }
              value={form.description}
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value,
                )
              }
              placeholder="Informations complémentaires..."
              rows={4}
              className="textarea textarea-bordered w-full"
            />

          </div>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              {form.id &&
                onDelete && (
                  <button
                    type="button"
                    disabled={
                      isPending ||
                      sallePending
                    }
                    onClick={() =>
                      onDelete(
                        form.id!,
                      )
                    }
                    className="btn btn-error btn-outline"
                  >
                    Supprimer
                  </button>
                )}
            </div>

            <div className="flex gap-3">

              <button
                type="button"
                disabled={
                  isPending ||
                  sallePending
                }
                onClick={onClose}
                className="btn btn-ghost"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={
                  isPending ||
                  sallePending ||
                  !form.sessionId ||
                  !form.debut ||
                  !form.fin
                }
                className="btn btn-primary"
              >
                {isPending ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Enregistrement...
                  </>
                ) : form.id ? (
                  "Enregistrer les modifications"
                ) : (
                  "Ajouter au calendrier"
                )}
              </button>

            </div>

          </div>

        </form>
      </div>
    </div>
  );
}