
"use client";

import {
  useEffect,
  useState,
  useTransition,
} from "react";

import {
  StatutFormation,
  TypeFormation,
} from "@/generated/prisma/enums";

import {
  createFormation,
  updateFormation,
} from "@/actions/formation.actions";

import { toast } from "sonner";

import {
  X,
  Save,
  Loader2,
  BookOpen,
  FileText,
  Target,
  ClipboardList,
  Clock3,
} from "lucide-react";

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

interface FormationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formation?: any | null;
}

/**
 * ============================================================
 * VALEUR DU FORMULAIRE
 * ============================================================
 */

interface FormationFormData {
  code: string;
  nom: string;
  description: string;
  objectifs: string;
  prerequis: string;
  type: TypeFormation;
  dureeHeures: string;
  statut: StatutFormation;
}

/**
 * ============================================================
 * VALEURS PAR DÉFAUT
 * ============================================================
 */

const defaultFormData: FormationFormData = {
  code: "",
  nom: "",
  description: "",
  objectifs: "",
  prerequis: "",
  type: TypeFormation.PRESENTIEL,
  dureeHeures: "",
  statut: StatutFormation.BROUILLON,
};

/**
 * ============================================================
 * LABELS
 * ============================================================
 */

const typeLabels: Record<
  TypeFormation,
  string
> = {
  PRESENTIEL: "Présentiel",
  DISTANCIEL: "Distanciel",
  HYBRIDE: "Hybride",
};

const statutLabels: Record<
  StatutFormation,
  string
> = {
  BROUILLON: "Brouillon",
  ACTIVE: "Active",
  ARCHIVEE: "Archivée",
};

/**
 * ============================================================
 * COMPOSANT
 * ============================================================
 */

export default function FormationModal({
  open,
  onOpenChange,
  formation,
}: FormationModalProps) {
  const [isPending, startTransition] =
    useTransition();

  const [formData, setFormData] =
    useState<FormationFormData>(
      defaultFormData
    );

  const isEditing =
    Boolean(formation);

  /**
   * ----------------------------------------------------------
   * INITIALISATION DU FORMULAIRE
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (!open) return;

    if (formation) {
      setFormData({
        code:
          formation.code ?? "",

        nom:
          formation.nom ?? "",

        description:
          formation.description ?? "",

        objectifs:
          formation.objectifs ?? "",

        prerequis:
          formation.prerequis ?? "",

        type:
          formation.type ??
          TypeFormation.PRESENTIEL,

        dureeHeures:
          formation.dureeHeures
            ? String(
                formation.dureeHeures
              )
            : "",

        statut:
          formation.statut ??
          StatutFormation.BROUILLON,
      });
    } else {
      setFormData(
        defaultFormData
      );
    }
  }, [open, formation]);

  /**
   * ----------------------------------------------------------
   * FERMETURE AVEC ESC
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape" &&
        !isPending
      ) {
        onOpenChange(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    open,
    isPending,
    onOpenChange,
  ]);

  /**
   * ----------------------------------------------------------
   * MODIFICATION D'UN CHAMP
   * ----------------------------------------------------------
   */

  function handleChange(
    field: keyof FormationFormData,
    value: string
  ) {
    setFormData(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );
  }

  /**
   * ----------------------------------------------------------
   * SOUMISSION
   * ----------------------------------------------------------
   */

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isPending) return;

    startTransition(async () => {
      try {
        const input = {
          code: formData.code,
          nom: formData.nom,
          description:
            formData.description,
          objectifs:
            formData.objectifs,
          prerequis:
            formData.prerequis,
          type: formData.type,
          dureeHeures:
            formData.dureeHeures,
          statut: formData.statut,
        };

        if (formation?.id) {
          await updateFormation(
            formation.id,
            input
          );

          toast.success(
            "Formation modifiée avec succès."
          );
        } else {
          await createFormation(
            input
          );

          toast.success(
            "Formation créée avec succès."
          );
        }

        onOpenChange(false);

        /**
         * Le parent pourra récupérer
         * les nouvelles données.
         */
        window.location.reload();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Une erreur est survenue.";

        toast.error(message);
      }
    });
  }

  /**
   * ----------------------------------------------------------
   * SI LE MODAL EST FERMÉ
   * ----------------------------------------------------------
   */

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !isPending
        ) {
          onOpenChange(false);
        }
      }}
    >
      <div
        className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="formation-modal-title"
      >
        {/* ================================================== */}
        {/* EN-TÊTE */}
        {/* ================================================== */}

        <div className="flex items-center justify-between border-b border-base-300 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen
                className="h-5 w-5"
              />
            </div>

            <div>
              <h2
                id="formation-modal-title"
                className="text-lg font-bold"
              >
                {isEditing
                  ? "Modifier la formation"
                  : "Nouvelle formation"}
              </h2>

              <p className="text-sm text-base-content/60">
                {isEditing
                  ? "Modifiez les informations de la formation."
                  : "Enregistrez une nouvelle formation dans votre centre."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onOpenChange(false)
            }
            disabled={isPending}
            className="btn btn-sm btn-circle btn-ghost"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ================================================== */}
        {/* CONTENU */}
        {/* ================================================== */}

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="overflow-y-auto px-5 py-5 sm:px-6">
            <div className="space-y-6">

              {/* ============================================ */}
              {/* INFORMATIONS PRINCIPALES */}
              {/* ============================================ */}

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />

                  <h3 className="font-semibold">
                    Informations générales
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                  {/* CODE */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Code
                        <span className="ml-1 text-error">
                          *
                        </span>
                      </span>
                    </label>

                    <input
                      type="text"
                      value={
                        formData.code
                      }
                      onChange={(event) =>
                        handleChange(
                          "code",
                          event.target.value.toUpperCase()
                        )
                      }
                      placeholder="Ex. INFO-2026"
                      maxLength={50}
                      required
                      disabled={isPending}
                      className="input input-bordered w-full uppercase"
                    />

                    <label className="label">
                      <span className="label-text-alt text-base-content/50">
                        Code unique dans le centre
                      </span>
                    </label>
                  </div>

                  {/* NOM */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Nom de la formation
                        <span className="ml-1 text-error">
                          *
                        </span>
                      </span>
                    </label>

                    <input
                      type="text"
                      value={
                        formData.nom
                      }
                      onChange={(event) =>
                        handleChange(
                          "nom",
                          event.target.value
                        )
                      }
                      placeholder="Ex. Développement Web Full Stack"
                      maxLength={150}
                      required
                      disabled={isPending}
                      className="input input-bordered w-full"
                    />
                  </div>

                  {/* TYPE */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Type de formation
                      </span>
                    </label>

                    <select
                      value={
                        formData.type
                      }
                      onChange={(event) =>
                        handleChange(
                          "type",
                          event.target.value
                        )
                      }
                      disabled={isPending}
                      className="select select-bordered w-full"
                    >
                      {Object.values(
                        TypeFormation
                      ).map(
                        (type) => (
                          <option
                            key={type}
                            value={type}
                          >
                            {
                              typeLabels[
                                type
                              ]
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* DURÉE */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Durée
                      </span>
                    </label>

                    <div className="relative">
                      <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40" />

                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={
                          formData.dureeHeures
                        }
                        onChange={(
                          event
                        ) =>
                          handleChange(
                            "dureeHeures",
                            event.target.value
                          )
                        }
                        placeholder="Ex. 40"
                        disabled={
                          isPending
                        }
                        className="input input-bordered w-full pl-10 pr-20"
                      />

                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-base-content/50">
                        heures
                      </span>
                    </div>
                  </div>

                  {/* STATUT */}
                  <div className="form-control md:col-span-2">
                    <label className="label">
                      <span className="label-text font-medium">
                        Statut
                      </span>
                    </label>

                    <select
                      value={
                        formData.statut
                      }
                      onChange={(event) =>
                        handleChange(
                          "statut",
                          event.target.value
                        )
                      }
                      disabled={isPending}
                      className="select select-bordered w-full"
                    >
                      {Object.values(
                        StatutFormation
                      ).map(
                        (statut) => (
                          <option
                            key={statut}
                            value={statut}
                          >
                            {
                              statutLabels[
                                statut
                              ]
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
              </section>

              {/* ============================================ */}
              {/* DESCRIPTION */}
              {/* ============================================ */}

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />

                  <h3 className="font-semibold">
                    Description
                  </h3>
                </div>

                <textarea
                  value={
                    formData.description
                  }
                  onChange={(event) =>
                    handleChange(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="Décrivez brièvement la formation..."
                  maxLength={5000}
                  disabled={isPending}
                  rows={4}
                  className="textarea textarea-bordered w-full resize-none"
                />

                <div className="mt-1 text-right text-xs text-base-content/40">
                  {
                    formData
                      .description
                      .length
                  }{" "}
                  / 5000
                </div>
              </section>

              {/* ============================================ */}
              {/* OBJECTIFS */}
              {/* ============================================ */}

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />

                  <h3 className="font-semibold">
                    Objectifs
                  </h3>
                </div>

                <textarea
                  value={
                    formData.objectifs
                  }
                  onChange={(event) =>
                    handleChange(
                      "objectifs",
                      event.target.value
                    )
                  }
                  placeholder="Indiquez les objectifs pédagogiques de la formation..."
                  maxLength={5000}
                  disabled={isPending}
                  rows={4}
                  className="textarea textarea-bordered w-full resize-none"
                />

                <div className="mt-1 text-right text-xs text-base-content/40">
                  {
                    formData
                      .objectifs
                      .length
                  }{" "}
                  / 5000
                </div>
              </section>

              {/* ============================================ */}
              {/* PRÉREQUIS */}
              {/* ============================================ */}

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />

                  <h3 className="font-semibold">
                    Prérequis
                  </h3>
                </div>

                <textarea
                  value={
                    formData.prerequis
                  }
                  onChange={(event) =>
                    handleChange(
                      "prerequis",
                      event.target.value
                    )
                  }
                  placeholder="Indiquez les prérequis nécessaires pour suivre cette formation..."
                  maxLength={5000}
                  disabled={isPending}
                  rows={4}
                  className="textarea textarea-bordered w-full resize-none"
                />

                <div className="mt-1 text-right text-xs text-base-content/40">
                  {
                    formData
                      .prerequis
                      .length
                  }{" "}
                  / 5000
                </div>
              </section>

              {/* ============================================ */}
              {/* INFORMATION MODULES */}
              {/* ============================================ */}

              <div className="rounded-xl border border-info/20 bg-info/5 p-4">
                <div className="flex gap-3">
                  <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-info" />

                  <div>
                    <p className="text-sm font-semibold">
                      Gestion des modules
                    </p>

                    <p className="mt-1 text-sm text-base-content/60">
                      Les modules seront ajoutés
                      après la création de la
                      formation. Le nombre de
                      modules sera automatiquement
                      calculé à partir des modules
                      réellement associés à cette
                      formation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================== */}
          {/* FOOTER */}
          {/* ================================================== */}

          <div className="flex flex-col-reverse gap-2 border-t border-base-300 bg-base-200/40 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={() =>
                onOpenChange(false)
              }
              disabled={isPending}
              className="btn btn-ghost"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary min-w-40"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />

                  {isEditing
                    ? "Enregistrer les modifications"
                    : "Créer la formation"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
