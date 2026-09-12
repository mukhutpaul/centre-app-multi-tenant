"use client";

import { useEffect, useMemo } from "react";

import {
  useForm,
} from "react-hook-form";

import {
  zodResolver,
} from "@hookform/resolvers/zod";

import {
  UserRound,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  BriefcaseBusiness,
  HeartPulse,
  Loader2,
  FileText,
} from "lucide-react";

import { toast } from "sonner";

import {
  apprenantSchema,
  type ApprenantFormData,
} from "@/lib/validations/apprenant.schema";

import {
  createApprenant,
  updateApprenant,
} from "@/actions/apprenant.actions";

interface ApprenantFormProps {
  apprenant?: {
    id: string;
    numero: string | null;

    prenom: string;
    nom: string;

    email: string | null;
    telephone: string | null;

    dateNaissance: Date | null;
    lieuNaissance: string | null;

    sexe: string | null;
    nationalite: string | null;

    adresse: string | null;
    ville: string | null;
    pays: string | null;

    profession: string | null;

    contactUrgenceNom: string | null;
    contactUrgenceTelephone: string | null;

    statut: string;
    notes: string | null;
  } | null;

  onSuccess: () => void;
}

function formatDateForInput(
  date: Date | null | undefined,
) {
  if (!date) {
    return "";
  }

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return d.toISOString().split("T")[0];
}

export function ApprenantForm({
  apprenant = null,
  onSuccess,
}: ApprenantFormProps) {
  const editing = Boolean(apprenant);

  const defaultValues =
    useMemo<ApprenantFormData>(
      () => ({
        prenom:
          apprenant?.prenom ?? "",

        nom:
          apprenant?.nom ?? "",

        email:
          apprenant?.email ?? "",

        telephone:
          apprenant?.telephone ?? "",

        dateNaissance:
          formatDateForInput(
            apprenant?.dateNaissance,
          ),

        lieuNaissance:
          apprenant?.lieuNaissance ?? "",

        sexe:
          (apprenant?.sexe as ApprenantFormData["sexe"]) ??
          "",

        nationalite:
          apprenant?.nationalite ?? "",

        adresse:
          apprenant?.adresse ?? "",

        ville:
          apprenant?.ville ?? "",

        pays:
          apprenant?.pays ?? "RDC",

        profession:
          apprenant?.profession ?? "",

        contactUrgenceNom:
          apprenant?.contactUrgenceNom ?? "",

        contactUrgenceTelephone:
          apprenant?.contactUrgenceTelephone ?? "",

        statut:
          (apprenant?.statut as ApprenantFormData["statut"]) ??
          "ACTIF",

        notes:
          apprenant?.notes ?? "",
      }),
      [apprenant],
    );

  const {
    register,
    handleSubmit,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<ApprenantFormData>({
    resolver: zodResolver(
      apprenantSchema,
    ),

    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [
    defaultValues,
    reset,
  ]);

  const onSubmit = async (
    data: ApprenantFormData,
  ) => {
    try {
      const formData = new FormData();

      Object.entries(data).forEach(
        ([key, value]) => {
          formData.append(
            key,
            value == null ? "" : String(value),
          );
        },
      );

      const result = editing
        ? await updateApprenant(
            apprenant!.id,
            formData,
          )
        : await createApprenant(
            formData,
          );

      if (!result.success) {
        if (result.errors) {
          Object.entries(
            result.errors,
          ).forEach(
            ([field, messages]) => {
              toast.error(
                `${field}: ${messages.join(", ")}`,
              );
            },
          );
        } else {
          toast.error(
            result.message,
          );
        }

        return;
      }

      toast.success(
        result.message,
      );

      onSuccess();
    } catch (error) {
      console.error(
        "APPRENANT FORM:",
        error,
      );

      toast.error(
        "Une erreur est survenue lors de l'enregistrement.",
      );
    }
  };

  const inputClass = (
    error?: string,
  ) =>
    `input input-bordered w-full ${
      error
        ? "input-error"
        : "focus:border-[#0f5da8]"
    }`;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8"
    >
      {/* ==================================================
          IDENTITÉ
      =================================================== */}

      <section>
        <div className="mb-4 flex items-center gap-2">
          <UserRound
            size={19}
            className="text-[#0f5da8]"
          />

          <h3 className="font-semibold text-slate-900 dark:text-white">
            Informations personnelles
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">
              <span className="label-text">
                Prénom *
              </span>
            </label>

            <input
              {...register("prenom")}
              className={inputClass(
                errors.prenom?.message,
              )}
              placeholder="Jean"
            />

            {errors.prenom && (
              <p className="mt-1 text-xs text-error">
                {errors.prenom.message}
              </p>
            )}
          </div>

          <div>
            <label className="label">
              <span className="label-text">
                Nom *
              </span>
            </label>

            <input
              {...register("nom")}
              className={inputClass(
                errors.nom?.message,
              )}
              placeholder="Mukendi"
            />

            {errors.nom && (
              <p className="mt-1 text-xs text-error">
                {errors.nom.message}
              </p>
            )}
          </div>

          <div>
            <label className="label">
              <span className="label-text">
                Date de naissance
              </span>
            </label>

            <input
              type="date"
              {...register(
                "dateNaissance",
              )}
              className="input input-bordered w-full"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">
                Lieu de naissance
              </span>
            </label>

            <input
              {...register(
                "lieuNaissance",
              )}
              className="input input-bordered w-full"
              placeholder="Kinshasa"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">
                Sexe
              </span>
            </label>

            <select
              {...register("sexe")}
              className="select select-bordered w-full"
            >
              <option value="">
                Sélectionner
              </option>

              <option value="HOMME">
                Homme
              </option>

              <option value="FEMME">
                Femme
              </option>

              <option value="AUTRE">
                Autre
              </option>
            </select>
          </div>

          <div>
            <label className="label">
              <span className="label-text">
                Nationalité
              </span>
            </label>

            <input
              {...register(
                "nationalite",
              )}
              className="input input-bordered w-full"
              placeholder="Congolaise"
            />
          </div>
        </div>
      </section>

      {/* ==================================================
          CONTACT
      =================================================== */}

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Phone
            size={19}
            className="text-[#0f5da8]"
          />

          <h3 className="font-semibold text-slate-900 dark:text-white">
            Coordonnées
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">
              <span className="label-text">
                Téléphone
              </span>
            </label>

            <input
              {...register(
                "telephone",
              )}
              className="input input-bordered w-full"
              placeholder="+243..."
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">
                E-mail
              </span>
            </label>

            <input
              type="email"
              {...register("email")}
              className={inputClass(
                errors.email?.message,
              )}
              placeholder="jean@email.com"
            />

            {errors.email && (
              <p className="mt-1 text-xs text-error">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ==================================================
          ADRESSE
      =================================================== */}

      <section>
        <div className="mb-4 flex items-center gap-2">
          <MapPin
            size={19}
            className="text-[#0f5da8]"
          />

          <h3 className="font-semibold text-slate-900 dark:text-white">
            Adresse
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="label">
              <span className="label-text">
                Adresse
              </span>
            </label>

            <input
              {...register("adresse")}
              className="input input-bordered w-full"
              placeholder="Adresse complète"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">
                Ville
              </span>
            </label>

            <input
              {...register("ville")}
              className="input input-bordered w-full"
              placeholder="Kinshasa"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">
                Pays
              </span>
            </label>

            <input
              {...register("pays")}
              className="input input-bordered w-full"
              placeholder="RDC"
            />
          </div>
        </div>
      </section>

      {/* ==================================================
          PROFESSION
      =================================================== */}

      <section>
        <div className="mb-4 flex items-center gap-2">
          <BriefcaseBusiness
            size={19}
            className="text-[#0f5da8]"
          />

          <h3 className="font-semibold text-slate-900 dark:text-white">
            Situation professionnelle
          </h3>
        </div>

        <input
          {...register("profession")}
          className="input input-bordered w-full"
          placeholder="Profession actuelle"
        />
      </section>

      {/* ==================================================
          CONTACT URGENCE
      =================================================== */}

      <section>
        <div className="mb-4 flex items-center gap-2">
          <HeartPulse
            size={19}
            className="text-[#0f5da8]"
          />

          <h3 className="font-semibold text-slate-900 dark:text-white">
            Contact d'urgence
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">
              <span className="label-text">
                Nom
              </span>
            </label>

            <input
              {...register(
                "contactUrgenceNom",
              )}
              className="input input-bordered w-full"
              placeholder="Nom du contact"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">
                Téléphone
              </span>
            </label>

            <input
              {...register(
                "contactUrgenceTelephone",
              )}
              className="input input-bordered w-full"
              placeholder="+243..."
            />
          </div>
        </div>
      </section>

      {/* ==================================================
          STATUT + NOTES
      =================================================== */}

      <section>
        <div className="mb-4 flex items-center gap-2">
          <FileText
            size={19}
            className="text-[#0f5da8]"
          />

          <h3 className="font-semibold text-slate-900 dark:text-white">
            Statut et observations
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text">
                Statut
              </span>
            </label>

            <select
              {...register("statut")}
              className="select select-bordered w-full"
            >
              <option value="ACTIF">
                Actif
              </option>

              <option value="INACTIF">
                Inactif
              </option>

              <option value="DIPLOME">
                Diplômé
              </option>

              <option value="SUSPENDU">
                Suspendu
              </option>

              <option value="ARCHIVE">
                Archivé
              </option>
            </select>
          </div>

          <div>
            <label className="label">
              <span className="label-text">
                Notes
              </span>
            </label>

            <textarea
              {...register("notes")}
              className="textarea textarea-bordered min-h-28 w-full"
              placeholder="Observations concernant l'apprenant..."
            />
          </div>
        </div>
      </section>

      {/* ==================================================
          ACTION
      =================================================== */}

      <div className="border-t border-slate-200 pt-5 dark:border-slate-700">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn w-full border-0 bg-[#0f5da8] text-white hover:bg-[#0c4d8c] disabled:bg-slate-400"
        >
          {isSubmitting ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
              />

              Enregistrement...
            </>
          ) : editing ? (
            "Enregistrer les modifications"
          ) : (
            "Créer l'apprenant"
          )}
        </button>
      </div>
    </form>
  );
}