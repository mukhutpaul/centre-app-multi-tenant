"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateSession } from "@/actions/session.actions";

type StatutSession =
  | "PLANIFIEE"
  | "INSCRIPTIONS_OUVERTES"
  | "INSCRIPTIONS_FERMEES"
  | "EN_COURS"
  | "TERMINEE"
  | "ANNULEE"
  | "SUSPENDUE";

interface FormationOption {
  id: string;
  code: string;
  nom: string;
}

interface SessionData {
  id: string;
  code: string;
  nom: string | null;
  dateDebut: Date | string;
  dateFin: Date | string;
  capacite: number | null;
  statut: StatutSession;
  ouvertureInscriptions: Date | string | null;
  fermetureInscriptions: Date | string | null;
  notes: string | null;
  formation: {
    id: string;
    code: string;
    nom: string;
  };
}

interface EditSessionFormProps {
  session: SessionData;
  formations: FormationOption[];
}

interface FormData {
  formationId: string;
  code: string;
  nom: string;
  dateDebut: string;
  dateFin: string;
  capacite: string;
  statut: StatutSession;
  ouvertureInscriptions: string;
  fermetureInscriptions: string;
  notes: string;
}

function formatDateTimeLocal(
  value: Date | string | null | undefined
): string {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toDateOrNull(value: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export default function EditSessionForm({
  session,
  formations,
}: EditSessionFormProps) {
  const router = useRouter();

  const initialData = useMemo<FormData>(
    () => ({
      formationId: session.formation.id,
      code: session.code,
      nom: session.nom ?? "",
      dateDebut: formatDateTimeLocal(session.dateDebut),
      dateFin: formatDateTimeLocal(session.dateFin),
      capacite:
        session.capacite !== null && session.capacite !== undefined
          ? String(session.capacite)
          : "",
      statut: session.statut,
      ouvertureInscriptions: formatDateTimeLocal(
        session.ouvertureInscriptions
      ),
      fermetureInscriptions: formatDateTimeLocal(
        session.fermetureInscriptions
      ),
      notes: session.notes ?? "",
    }),
    [session]
  );

  const [formData, setFormData] = useState<FormData>(initialData);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    field: keyof FormData,
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.formationId) {
      toast.error("Veuillez sélectionner une formation.");
      return false;
    }

    if (!formData.code.trim()) {
      toast.error("Le code de la session est obligatoire.");
      return false;
    }

    if (formData.code.trim().length < 2) {
      toast.error(
        "Le code de la session doit contenir au moins 2 caractères."
      );
      return false;
    }

    if (!formData.dateDebut) {
      toast.error("La date de début est obligatoire.");
      return false;
    }

    if (!formData.dateFin) {
      toast.error("La date de fin est obligatoire.");
      return false;
    }

    const dateDebut = new Date(formData.dateDebut);
    const dateFin = new Date(formData.dateFin);

    if (
      Number.isNaN(dateDebut.getTime()) ||
      Number.isNaN(dateFin.getTime())
    ) {
      toast.error("Les dates fournies sont invalides.");
      return false;
    }

    if (dateFin < dateDebut) {
      toast.error(
        "La date de fin doit être supérieure ou égale à la date de début."
      );
      return false;
    }

    if (formData.capacite.trim()) {
      const capacite = Number(formData.capacite);

      if (
        !Number.isInteger(capacite) ||
        capacite <= 0
      ) {
        toast.error(
          "La capacité doit être un nombre entier supérieur à 0."
        );
        return false;
      }
    }

    if (
      formData.ouvertureInscriptions &&
      formData.fermetureInscriptions
    ) {
      const ouverture = new Date(
        formData.ouvertureInscriptions
      );

      const fermeture = new Date(
        formData.fermetureInscriptions
      );

      if (
        Number.isNaN(ouverture.getTime()) ||
        Number.isNaN(fermeture.getTime())
      ) {
        toast.error(
          "La période d'inscription contient une date invalide."
        );
        return false;
      }

      if (fermeture < ouverture) {
        toast.error(
          "La fermeture des inscriptions doit être postérieure ou égale à l'ouverture."
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await updateSession(session.id, {
        formationId: formData.formationId,
        code: formData.code.trim(),
        nom: formData.nom.trim() || null,
        dateDebut: new Date(formData.dateDebut),
        dateFin: new Date(formData.dateFin),
        capacite: formData.capacite.trim()
          ? Number(formData.capacite)
          : null,
        statut: formData.statut,
        ouvertureInscriptions: toDateOrNull(
          formData.ouvertureInscriptions
        ),
        fermetureInscriptions: toDateOrNull(
          formData.fermetureInscriptions
        ),
        notes: formData.notes.trim() || null,
      });

      if (!result.success) {
        toast.error(
          result.message ||
            "Impossible de modifier la session."
        );
        return;
      }

      toast.success(
        result.message ||
          "Session modifiée avec succès."
      );

      router.push(
        `/sessions/${session.id}`
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Erreur modification session :",
        error
      );

      toast.error(
        "Une erreur inattendue est survenue."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-wrapper">
      {/* =====================================================
          EN-TÊTE
      ====================================================== */}

      <div className="mb-6">
        <div className="breadcrumbs text-sm">
          <ul>
            <li>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/sessions"
                  )
                }
                className="link link-hover"
              >
                Sessions
              </button>
            </li>

            <li>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/sessions/${session.id}`
                  )
                }
                className="link link-hover"
              >
                {session.code}
              </button>
            </li>

            <li>Modifier</li>
          </ul>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold">
            Modifier la session
          </h1>

          <p className="mt-1 text-base-content/60">
            Modifiez les informations de la session{" "}
            <strong>{session.code}</strong>.
          </p>
        </div>
      </div>

      {/* =====================================================
          FORMULAIRE
      ====================================================== */}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* =================================================
              INFORMATIONS PRINCIPALES
          ================================================== */}

          <div className="xl:col-span-2">
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h2 className="card-title mb-4">
                  Informations de la session
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Formation */}

                  <div className="form-control md:col-span-2">
                    <label className="label">
                      <span className="label-text font-medium">
                        Formation *
                      </span>
                    </label>

                    <select
                      value={formData.formationId}
                      onChange={(event) =>
                        handleChange(
                          "formationId",
                          event.target.value
                        )
                      }
                      className="select select-bordered w-full"
                      disabled={loading}
                    >
                      <option value="">
                        Sélectionner une formation
                      </option>

                      {formations.map(
                        (formation) => (
                          <option
                            key={formation.id}
                            value={formation.id}
                          >
                            {formation.code} —{" "}
                            {formation.nom}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Code */}

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Code *
                      </span>
                    </label>

                    <input
                      type="text"
                      value={formData.code}
                      onChange={(event) =>
                        handleChange(
                          "code",
                          event.target.value
                        )
                      }
                      placeholder="Ex : SESSION-2026-01"
                      className="input input-bordered w-full"
                      disabled={loading}
                      maxLength={50}
                    />
                  </div>

                  {/* Nom */}

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Nom de la session
                      </span>
                    </label>

                    <input
                      type="text"
                      value={formData.nom}
                      onChange={(event) =>
                        handleChange(
                          "nom",
                          event.target.value
                        )
                      }
                      placeholder="Ex : Session janvier 2026"
                      className="input input-bordered w-full"
                      disabled={loading}
                    />
                  </div>

                  {/* Date début */}

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Date de début *
                      </span>
                    </label>

                    <input
                      type="datetime-local"
                      value={formData.dateDebut}
                      onChange={(event) =>
                        handleChange(
                          "dateDebut",
                          event.target.value
                        )
                      }
                      className="input input-bordered w-full"
                      disabled={loading}
                    />
                  </div>

                  {/* Date fin */}

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Date de fin *
                      </span>
                    </label>

                    <input
                      type="datetime-local"
                      value={formData.dateFin}
                      onChange={(event) =>
                        handleChange(
                          "dateFin",
                          event.target.value
                        )
                      }
                      className="input input-bordered w-full"
                      disabled={loading}
                    />
                  </div>

                  {/* Capacité */}

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Capacité
                      </span>
                    </label>

                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={formData.capacite}
                      onChange={(event) =>
                        handleChange(
                          "capacite",
                          event.target.value
                        )
                      }
                      placeholder="Ex : 30"
                      className="input input-bordered w-full"
                      disabled={loading}
                    />
                  </div>

                  {/* Statut */}

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Statut *
                      </span>
                    </label>

                    <select
                      value={formData.statut}
                      onChange={(event) =>
                        handleChange(
                          "statut",
                          event.target
                            .value as StatutSession
                        )
                      }
                      className="select select-bordered w-full"
                      disabled={loading}
                    >
                      <option value="PLANIFIEE">
                        Planifiée
                      </option>

                      <option value="INSCRIPTIONS_OUVERTES">
                        Inscriptions ouvertes
                      </option>

                      <option value="INSCRIPTIONS_FERMEES">
                        Inscriptions fermées
                      </option>

                      <option value="EN_COURS">
                        En cours
                      </option>

                      <option value="TERMINEE">
                        Terminée
                      </option>

                      <option value="ANNULEE">
                        Annulée
                      </option>

                      <option value="SUSPENDUE">
                        Suspendue
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================
                INSCRIPTIONS
            ================================================== */}

            <div className="card mt-6 bg-base-100 shadow-sm">
              <div className="card-body">
                <h2 className="card-title mb-4">
                  Période des inscriptions
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Ouverture */}

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Ouverture des inscriptions
                      </span>
                    </label>

                    <input
                      type="datetime-local"
                      value={
                        formData.ouvertureInscriptions
                      }
                      onChange={(event) =>
                        handleChange(
                          "ouvertureInscriptions",
                          event.target.value
                        )
                      }
                      className="input input-bordered w-full"
                      disabled={loading}
                    />
                  </div>

                  {/* Fermeture */}

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Fermeture des inscriptions
                      </span>
                    </label>

                    <input
                      type="datetime-local"
                      value={
                        formData.fermetureInscriptions
                      }
                      onChange={(event) =>
                        handleChange(
                          "fermetureInscriptions",
                          event.target.value
                        )
                      }
                      className="input input-bordered w-full"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================
                NOTES
            ================================================== */}

            <div className="card mt-6 bg-base-100 shadow-sm">
              <div className="card-body">
                <h2 className="card-title mb-4">
                  Notes
                </h2>

                <textarea
                  value={formData.notes}
                  onChange={(event) =>
                    handleChange(
                      "notes",
                      event.target.value
                    )
                  }
                  placeholder="Informations complémentaires..."
                  className="textarea textarea-bordered min-h-32 w-full"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* =================================================
              RÉSUMÉ
          ================================================== */}

          <div>
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h2 className="card-title">
                  Résumé
                </h2>

                <div className="divider my-2" />

                <div>
                  <p className="text-xs uppercase text-base-content/50">
                    Session
                  </p>

                  <p className="mt-1 font-semibold">
                    {session.code}
                  </p>
                </div>

                <div className="mt-4">
                  <p className="text-xs uppercase text-base-content/50">
                    Formation actuelle
                  </p>

                  <p className="mt-1 font-medium">
                    {session.formation.code}
                  </p>

                  <p className="text-sm text-base-content/60">
                    {session.formation.nom}
                  </p>
                </div>

                <div className="mt-4">
                  <p className="text-xs uppercase text-base-content/50">
                    Statut actuel
                  </p>

                  <div className="mt-2">
                    <span className="badge badge-primary">
                      {session.statut}
                    </span>
                  </div>
                </div>

                {session.capacite !== null && (
                  <div className="mt-4">
                    <p className="text-xs uppercase text-base-content/50">
                      Capacité actuelle
                    </p>

                    <p className="mt-1 font-semibold">
                      {session.capacite} participants
                    </p>
                  </div>
                )}

                <div className="alert alert-info mt-6">
                  <span className="text-sm">
                    Les modifications sont vérifiées
                    côté serveur avant d'être
                    enregistrées.
                  </span>
                </div>
              </div>
            </div>

            {/* =================================================
                ACTIONS
            ================================================== */}

            <div className="card mt-6 bg-base-100 shadow-sm">
              <div className="card-body">
                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="loading loading-spinner loading-sm" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <span className="mdi mdi-content-save-outline" />
                        Enregistrer les modifications
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost w-full"
                    disabled={loading}
                    onClick={() =>
                      router.push(
                        `/sessions/${session.id}`
                      )
                    }
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}