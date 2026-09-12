
"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  BookOpen,
  Clock3,
  Hash,
  Layers3,
  Save,
  X,
} from "lucide-react";

import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  createModuleFormation,
  updateModuleFormation,
} from "@/actions/module-formation.actions";

interface ModuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formationId: string;
  module?: any | null;
}

export default function ModuleModal({
  open,
  onOpenChange,
  formationId,
  module,
}: ModuleModalProps) {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [description, setDescription] =
    useState("");
  const [position, setPosition] =
    useState("1");
  const [dureeHeures, setDureeHeures] =
    useState("");
  const [coefficient, setCoefficient] =
    useState("1");

  const [loading, setLoading] =
    useState(false);

  const editing = Boolean(module);

  /**
   * ============================================================
   * INITIALISATION DU FORMULAIRE
   * ============================================================
   */

  useEffect(() => {
    if (!open) return;

    setCode(module?.code ?? "");
    setNom(module?.nom ?? "");
    setDescription(
      module?.description ?? "",
    );

    setPosition(
      module?.position !== null &&
        module?.position !== undefined
        ? String(module.position)
        : "1",
    );

    setDureeHeures(
      module?.dureeHeures !== null &&
        module?.dureeHeures !== undefined
        ? String(module.dureeHeures)
        : "",
    );

    setCoefficient(
      module?.coefficient !== null &&
        module?.coefficient !== undefined
        ? String(module.coefficient)
        : "1",
    );
  }, [open, module]);

  /**
   * ============================================================
   * TOUCHE ESCAPE
   * ============================================================
   */

  useEffect(() => {
    if (!open) return;

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape" &&
        !loading
      ) {
        onOpenChange(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    open,
    loading,
    onOpenChange,
  ]);

  /**
   * ============================================================
   * SOUMISSION
   * ============================================================
   */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    /**
     * ----------------------------------------------------------
     * VALIDATIONS FRONTEND
     * ----------------------------------------------------------
     */

    if (!code.trim()) {
      toast.error(
        "Le code du module est obligatoire.",
        {
          duration: 5000,
        },
      );

      return;
    }

    if (!nom.trim()) {
      toast.error(
        "Le nom du module est obligatoire.",
        {
          duration: 5000,
        },
      );

      return;
    }

    const positionNombre =
      Number(position);

    if (
      !Number.isInteger(positionNombre) ||
      positionNombre < 1
    ) {
      toast.error(
        "La position doit être un entier supérieur ou égal à 1.",
        {
          duration: 5000,
        },
      );

      return;
    }

    if (
      dureeHeures.trim() !== "" &&
      Number(dureeHeures) < 0
    ) {
      toast.error(
        "La durée ne peut pas être négative.",
        {
          duration: 5000,
        },
      );

      return;
    }

    if (
      coefficient.trim() !== "" &&
      Number(coefficient) <= 0
    ) {
      toast.error(
        "Le coefficient doit être supérieur à 0.",
        {
          duration: 5000,
        },
      );

      return;
    }

    setLoading(true);

    try {
      const input = {
        code: code.trim().toUpperCase(),
        nom: nom.trim(),
        description: description.trim(),
        position: positionNombre,
        dureeHeures:
          dureeHeures.trim(),
        coefficient:
          coefficient.trim() || "1",
      };

      /**
       * --------------------------------------------------------
       * MODIFICATION
       * --------------------------------------------------------
       */

      if (editing) {
        await updateModuleFormation(
          module.id,
          input,
        );
      }

      /**
       * --------------------------------------------------------
       * CRÉATION
       * --------------------------------------------------------
       */

      else {
        await createModuleFormation(
          formationId,
          input,
        );
      }

      /**
       * --------------------------------------------------------
       * TOAST
       * --------------------------------------------------------
       *
       * 5 secondes pour laisser le temps de lire
       * correctement le message.
       */

      toast.success(
        editing
          ? "Module modifié avec succès."
          : "Module ajouté avec succès.",
        {
          duration: 5000,
        },
      );

      /**
       * Fermer le modal.
       */
      onOpenChange(false);

      /**
       * Rafraîchir les données du Server Component
       * sans recharger toute la page.
       */
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de l'enregistrement.",
        {
          duration: 6000,
        },
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * ============================================================
   * MODAL FERMÉ
   * ============================================================
   */

  if (!open) {
    return null;
  }

  /**
   * ============================================================
   * RENDU
   * ============================================================
   */

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        /**
         * Fermer uniquement si on clique directement
         * sur l'arrière-plan.
         */
        if (
          event.target ===
          event.currentTarget
        ) {
          if (!loading) {
            onOpenChange(false);
          }
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="module-modal-title"
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-2xl"
      >
        {/* ====================================================
            EN-TÊTE
        ===================================================== */}

        <div className="flex items-start justify-between border-b border-base-300 bg-base-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>

            <div>
              <h2
                id="module-modal-title"
                className="text-lg font-bold"
              >
                {editing
                  ? "Modifier le module"
                  : "Ajouter un module"}
              </h2>

              <p className="mt-0.5 text-sm text-base-content/60">
                {editing
                  ? "Modifiez les informations de ce module."
                  : "Ajoutez un nouveau module à cette formation."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              !loading &&
              onOpenChange(false)
            }
            className="btn btn-sm btn-circle btn-ghost"
            disabled={loading}
            title="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ====================================================
            FORMULAIRE
        ===================================================== */}

        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(100vh-160px)] overflow-y-auto"
        >
          <div className="space-y-6 p-5">
            {/* ==================================================
                INFORMATIONS PRINCIPALES
            =================================================== */}

            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-5 w-1 rounded-full bg-primary" />

                <h3 className="font-semibold">
                  Informations du module
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* CODE */}

                <div>
                  <label
                    htmlFor="module-code"
                    className="label"
                  >
                    <span className="label-text flex items-center gap-1.5 font-medium">
                      <Hash className="h-3.5 w-3.5 text-primary" />
                      Code *
                    </span>
                  </label>

                  <input
                    id="module-code"
                    type="text"
                    value={code}
                    onChange={(event) =>
                      setCode(
                        event.target.value.toUpperCase(),
                      )
                    }
                    className="input input-bordered w-full font-mono"
                    placeholder="MOD-001"
                    disabled={loading}
                    autoComplete="off"
                  />
                </div>

                {/* NOM */}

                <div>
                  <label
                    htmlFor="module-nom"
                    className="label"
                  >
                    <span className="label-text flex items-center gap-1.5 font-medium">
                      <BookOpen className="h-3.5 w-3.5 text-primary" />
                      Nom du module *
                    </span>
                  </label>

                  <input
                    id="module-nom"
                    type="text"
                    value={nom}
                    onChange={(event) =>
                      setNom(
                        event.target.value,
                      )
                    }
                    className="input input-bordered w-full"
                    placeholder="Introduction à la gestion"
                    disabled={loading}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            {/* ==================================================
                PARAMÈTRES
            =================================================== */}

            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-5 w-1 rounded-full bg-primary" />

                <h3 className="font-semibold">
                  Paramètres pédagogiques
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* POSITION */}

                <div>
                  <label
                    htmlFor="module-position"
                    className="label"
                  >
                    <span className="label-text flex items-center gap-1.5 font-medium">
                      <Layers3 className="h-3.5 w-3.5 text-primary" />
                      Position *
                    </span>
                  </label>

                  <input
                    id="module-position"
                    type="number"
                    min="1"
                    step="1"
                    value={position}
                    onChange={(event) =>
                      setPosition(
                        event.target.value,
                      )
                    }
                    className="input input-bordered w-full"
                    disabled={loading}
                  />

                  <p className="mt-1 text-xs text-base-content/50">
                    Ordre du module.
                  </p>
                </div>

                {/* DURÉE */}

                <div>
                  <label
                    htmlFor="module-duree"
                    className="label"
                  >
                    <span className="label-text flex items-center gap-1.5 font-medium">
                      <Clock3 className="h-3.5 w-3.5 text-primary" />
                      Durée
                    </span>
                  </label>

                  <div className="join w-full">
                    <input
                      id="module-duree"
                      type="number"
                      min="0"
                      step="0.01"
                      value={dureeHeures}
                      onChange={(event) =>
                        setDureeHeures(
                          event.target.value,
                        )
                      }
                      className="input input-bordered join-item w-full"
                      placeholder="10"
                      disabled={loading}
                    />

                    <span className="btn join-item no-animation cursor-default">
                      h
                    </span>
                  </div>
                </div>

                {/* COEFFICIENT */}

                <div>
                  <label
                    htmlFor="module-coefficient"
                    className="label"
                  >
                    <span className="label-text font-medium">
                      Coefficient
                    </span>
                  </label>

                  <input
                    id="module-coefficient"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={coefficient}
                    onChange={(event) =>
                      setCoefficient(
                        event.target.value,
                      )
                    }
                    className="input input-bordered w-full"
                    placeholder="1"
                    disabled={loading}
                  />

                  <p className="mt-1 text-xs text-base-content/50">
                    Valeur par défaut : 1.
                  </p>
                </div>
              </div>
            </div>

            {/* ==================================================
                DESCRIPTION
            =================================================== */}

            <div>
              <label
                htmlFor="module-description"
                className="label"
              >
                <span className="label-text font-medium">
                  Description
                </span>
              </label>

              <textarea
                id="module-description"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                className="textarea textarea-bordered min-h-32 w-full resize-y"
                placeholder="Décrivez le contenu et les éléments principaux de ce module..."
                disabled={loading}
              />

              <div className="mt-1 flex justify-end">
                <span className="text-xs text-base-content/40">
                  {description.length} caractères
                </span>
              </div>
            </div>
          </div>

          {/* ====================================================
              PIED DU MODAL
          ===================================================== */}

          <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-base-300 bg-base-100 px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() =>
                onOpenChange(false)
              }
              className="btn btn-ghost"
              disabled={loading}
            >
              Annuler
            </button>

            <button
              type="submit"
              className="btn btn-primary min-w-40"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />

                  {editing
                    ? "Enregistrer"
                    : "Ajouter le module"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
