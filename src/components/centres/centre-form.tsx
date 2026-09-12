"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  Mail,
  MapPin,
  Phone,
  Hash,
  Loader2,
  Globe,
  Map,
  Coins,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

import {
  centreSchema,
  type CentreFormData,
} from "@/lib/validations/centre.schema";

import {
  createCentre,
  updateCentre,
} from "@/actions/centre.actions";

import { StatutCentre } from "@/generated/prisma/enums";

interface CentreFormProps {
  centre?: {
    id: string;
    nom: string;
    slug: string;
    code: string;
    statut: StatutCentre;
    adresse: string | null;
    ville: string | null;
    pays: string | null;
    codePostal: string | null;
    telephone: string | null;
    email: string | null;
    siteWeb: string | null;
    logoUrl: string | null;
    devise: string;
    fuseauHoraire: string;
  } | null;

  onSuccess: () => void;
}

/**
 * Génère un slug propre.
 */
function generateSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Génère un code automatique.
 *
 * Exemple :
 * Centre de Formation Professionnelle
 * => CFP-001
 *
 * Le numéro sera remplacé côté serveur
 * si nécessaire pour garantir l'unicité.
 */
function generateBaseCode(nom: string): string {
  const words = nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "CF";
  }

  if (words.length === 1) {
    return words[0].slice(0, 3);
  }

  const initials = words
    .slice(0, 4)
    .map((word) => word.charAt(0))
    .join("");

  return initials || "CF";
}

/**
 * Transforme le nom en code lisible.
 */
function generateCode(nom: string): string {
  const base = generateBaseCode(nom);

  return `${base}-001`;
}

export function CentreForm({
  centre,
  onSuccess,
}: CentreFormProps) {
  const editing = Boolean(centre);

  /**
   * Valeurs par défaut du formulaire.
   */
  const defaultValues = useMemo<CentreFormData>(
    () => ({
      nom: centre?.nom ?? "",
      slug: centre?.slug ?? "",
      code: centre?.code ?? "",

      adresse: centre?.adresse ?? "",
      ville: centre?.ville ?? "",
      pays: centre?.pays ?? "RDC",
      codePostal: centre?.codePostal ?? "",
      telephone: centre?.telephone ?? "",
      email: centre?.email ?? "",
      siteWeb: centre?.siteWeb ?? "",
      logoUrl: centre?.logoUrl ?? "",

      devise: centre?.devise ?? "XAF",
      fuseauHoraire:
        centre?.fuseauHoraire ?? "Africa/Kinshasa",

      statut:
        centre?.statut ?? StatutCentre.ESSAI,
    }),
    [centre],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<CentreFormData>({
    resolver: zodResolver(centreSchema),
    defaultValues,
  });

  const nom = watch("nom");
  const code = watch("code");

  /**
   * Recharge les données lorsqu'on passe
   * d'une création à une modification.
   */
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  /**
   * Génération automatique du code et du slug.
   *
   * En création uniquement.
   * En modification, les valeurs existantes
   * ne sont jamais écrasées.
   */
  useEffect(() => {
    if (editing) {
      return;
    }

    if (!nom?.trim()) {
      setValue("code", "");
      setValue("slug", "");
      return;
    }

    const generatedCode = generateCode(nom);
    const generatedSlug = generateSlug(nom);

    setValue("code", generatedCode, {
      shouldValidate: true,
    });

    setValue("slug", generatedSlug, {
      shouldValidate: true,
    });
  }, [nom, editing, setValue]);

  /**
   * Soumission du formulaire.
   */
  const onSubmit = async (
    data: CentreFormData,
  ) => {
    try {
      const formData = new FormData();

      formData.append("nom", data.nom);
      formData.append("code", data.code);
      formData.append("slug", data.slug);

      formData.append(
        "adresse",
        data.adresse ?? "",
      );

      formData.append(
        "ville",
        data.ville ?? "",
      );

      formData.append(
        "pays",
        data.pays ?? "",
      );

      formData.append(
        "codePostal",
        data.codePostal ?? "",
      );

      formData.append(
        "telephone",
        data.telephone ?? "",
      );

      formData.append(
        "email",
        data.email ?? "",
      );

      formData.append(
        "siteWeb",
        data.siteWeb ?? "",
      );

      formData.append(
        "logoUrl",
        data.logoUrl ?? "",
      );

      formData.append(
        "devise",
        data.devise ?? "XAF",
      );

      formData.append(
        "fuseauHoraire",
        data.fuseauHoraire ??
          "Africa/Kinshasa",
      );

      /**
       * Important :
       * data.statut est maintenant correctement
       * typé avec l'enum StatutCentre.
       */
      formData.append(
        "statut",
        data.statut,
      );

      const result = editing
        ? await updateCentre(
            centre!.id,
            formData,
          )
        : await createCentre(formData);

      if (!result.success) {
        /**
         * Affiche les erreurs de validation
         * renvoyées par le serveur.
         */
        if (result.errors) {
          Object.entries(result.errors).forEach(
            ([field, messages]) => {
              toast.error(
                `${field}: ${messages.join(", ")}`,
              );
            },
          );
        } else {
          toast.error(result.message);
        }

        return;
      }

      toast.success(result.message);

      onSuccess();
    } catch (error) {
      console.error(
        "CENTRE FORM SUBMIT:",
        error,
      );

      toast.error(
        "Une erreur est survenue lors de l'enregistrement.",
      );
    }
  };

  /**
   * Classe des inputs.
   */
  const inputClass = (
    fieldError?: string,
  ) =>
    `input input-bordered w-full ${
      fieldError
        ? "input-error"
        : "focus:border-[#0f5da8]"
    }`;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      {/* =====================================================
          INFORMATIONS PRINCIPALES
      ====================================================== */}
      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
          Informations principales
        </h3>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Nom */}
          <div className="form-control md:col-span-2">
            <label className="label">
              <span className="label-text font-semibold">
                Nom du centre *
              </span>
            </label>

            <label
              className={inputClass(
                errors.nom?.message,
              )}
            >
              <Building2
                size={18}
                className="text-slate-400"
              />

              <input
                {...register("nom")}
                className="grow"
                placeholder="Centre de formation professionnelle"
                autoComplete="organization"
              />
            </label>

            {errors.nom && (
              <p className="mt-1 text-xs text-error">
                {errors.nom.message}
              </p>
            )}
          </div>

          {/* Code */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                Code
              </span>
            </label>

            <label
              className={inputClass(
                errors.code?.message,
              )}
            >
              <Hash
                size={18}
                className="text-slate-400"
              />

              <input
                {...register("code")}
                className="grow uppercase"
                placeholder="CFP-001"
                readOnly={!editing}
              />
            </label>

            {!editing && (
              <p className="mt-1 text-xs text-slate-500">
                Généré automatiquement à partir
                du nom du centre.
              </p>
            )}

            {errors.code && (
              <p className="mt-1 text-xs text-error">
                {errors.code.message}
              </p>
            )}
          </div>

          {/* Slug */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                Identifiant URL
              </span>
            </label>

            <input
              {...register("slug")}
              className={inputClass(
                errors.slug?.message,
              )}
              placeholder="centre-formation"
              readOnly={!editing}
            />

            {!editing && (
              <p className="mt-1 text-xs text-slate-500">
                Généré automatiquement.
              </p>
            )}

            {errors.slug && (
              <p className="mt-1 text-xs text-error">
                {errors.slug.message}
              </p>
            )}
          </div>

          {/* Adresse */}
          <div className="form-control md:col-span-2">
            <label className="label">
              <span className="label-text font-semibold">
                Adresse
              </span>
            </label>

            <input
              {...register("adresse")}
              className={inputClass(
                errors.adresse?.message,
              )}
              placeholder="Adresse complète du centre"
              autoComplete="street-address"
            />

            {errors.adresse && (
              <p className="mt-1 text-xs text-error">
                {errors.adresse.message}
              </p>
            )}
          </div>

          {/* Ville */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                Ville
              </span>
            </label>

            <label
              className={inputClass(
                errors.ville?.message,
              )}
            >
              <MapPin
                size={18}
                className="text-slate-400"
              />

              <input
                {...register("ville")}
                className="grow"
                placeholder="Kinshasa"
                autoComplete="address-level2"
              />
            </label>

            {errors.ville && (
              <p className="mt-1 text-xs text-error">
                {errors.ville.message}
              </p>
            )}
          </div>

          {/* Pays */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                Pays
              </span>
            </label>

            <label
              className={inputClass(
                errors.pays?.message,
              )}
            >
              <Map
                size={18}
                className="text-slate-400"
              />

              <input
                {...register("pays")}
                className="grow"
                placeholder="RDC"
                autoComplete="country"
              />
            </label>

            {errors.pays && (
              <p className="mt-1 text-xs text-error">
                {errors.pays.message}
              </p>
            )}
          </div>

          {/* Code postal */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                Code postal
              </span>
            </label>

            <input
              {...register("codePostal")}
              className={inputClass(
                errors.codePostal?.message,
              )}
              placeholder="00000"
              autoComplete="postal-code"
            />

            {errors.codePostal && (
              <p className="mt-1 text-xs text-error">
                {errors.codePostal.message}
              </p>
            )}
          </div>

          {/* Téléphone */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                Téléphone
              </span>
            </label>

            <label
              className={inputClass(
                errors.telephone?.message,
              )}
            >
              <Phone
                size={18}
                className="text-slate-400"
              />

              <input
                {...register("telephone")}
                className="grow"
                placeholder="+243..."
                autoComplete="tel"
              />
            </label>

            {errors.telephone && (
              <p className="mt-1 text-xs text-error">
                {errors.telephone.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                E-mail
              </span>
            </label>

            <label
              className={inputClass(
                errors.email?.message,
              )}
            >
              <Mail
                size={18}
                className="text-slate-400"
              />

              <input
                {...register("email")}
                type="email"
                className="grow"
                placeholder="centre@formation.cd"
                autoComplete="email"
              />
            </label>

            {errors.email && (
              <p className="mt-1 text-xs text-error">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Site web */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                Site web
              </span>
            </label>

            <label
              className={inputClass(
                errors.siteWeb?.message,
              )}
            >
              <Globe
                size={18}
                className="text-slate-400"
              />

              <input
                {...register("siteWeb")}
                type="url"
                className="grow"
                placeholder="https://..."
              />
            </label>

            {errors.siteWeb && (
              <p className="mt-1 text-xs text-error">
                {errors.siteWeb.message}
              </p>
            )}
          </div>

          {/* Logo */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                URL du logo
              </span>
            </label>

            <input
              {...register("logoUrl")}
              type="url"
              className={inputClass(
                errors.logoUrl?.message,
              )}
              placeholder="https://..."
            />

            {errors.logoUrl && (
              <p className="mt-1 text-xs text-error">
                {errors.logoUrl.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          CONFIGURATION
      ====================================================== */}
      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
          Configuration
        </h3>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Devise */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                Devise
              </span>
            </label>

            <label
              className={inputClass(
                errors.devise?.message,
              )}
            >
              <Coins
                size={18}
                className="text-slate-400"
              />

              <input
                {...register("devise")}
                className="grow uppercase"
                placeholder="XAF"
              />
            </label>

            {errors.devise && (
              <p className="mt-1 text-xs text-error">
                {errors.devise.message}
              </p>
            )}
          </div>

          {/* Fuseau horaire */}
          <div className="form-control md:col-span-2">
            <label className="label">
              <span className="label-text font-semibold">
                Fuseau horaire
              </span>
            </label>

            <label
              className={inputClass(
                errors.fuseauHoraire?.message,
              )}
            >
              <Clock
                size={18}
                className="text-slate-400"
              />

              <input
                {...register("fuseauHoraire")}
                className="grow"
                placeholder="Africa/Kinshasa"
              />
            </label>

            {errors.fuseauHoraire && (
              <p className="mt-1 text-xs text-error">
                {errors.fuseauHoraire.message}
              </p>
            )}
          </div>

          {/* Statut */}
          <div className="form-control md:col-span-3">
            <label className="label">
              <span className="label-text font-semibold">
                Statut
              </span>
            </label>

            <select
              {...register("statut")}
              className={`select select-bordered w-full ${
                errors.statut
                  ? "select-error"
                  : "focus:border-[#0f5da8]"
              }`}
            >
              <option value={StatutCentre.ESSAI}>
                Essai
              </option>

              <option value={StatutCentre.ACTIF}>
                Actif
              </option>

              <option value={StatutCentre.SUSPENDU}>
                Suspendu
              </option>

              <option value={StatutCentre.RESILIE}>
                Résilié
              </option>
            </select>

            {errors.statut && (
              <p className="mt-1 text-xs text-error">
                {errors.statut.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          BOUTON
      ====================================================== */}
      <div className="border-t border-slate-200 pt-5 dark:border-slate-700">
        <button
          type="submit"
          disabled={
            isSubmitting ||
            !nom?.trim() ||
            !code?.trim()
          }
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
            "Créer le centre"
          )}
        </button>
      </div>
    </form>
  );
}