"use client"

import { useEffect, useMemo } from "react"

import {
  Controller,
  useForm,
} from "react-hook-form"

import { zodResolver } from "@hookform/resolvers/zod"

import Select from "react-select"

import {
  Building2,
  CalendarDays,
  FileText,
  Users,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  UserRound,
  Hash,
  Wallet,
} from "lucide-react"

import { toast } from "sonner"

import {
  conventionSchema,
  type ConventionFormValues,
} from "@/lib/validations/convention.schema"

import {
  createConvention,
  updateConvention,
} from "@/actions/convention.actions"

type InscriptionOption = {
  value: string
  label: string
}

type ConventionData = {
  id: string
  numero: string
  organisationNom: string
  organisationAdresse: string | null
  organisationEmail: string | null
  organisationTelephone: string | null
  organisationContact: string | null
  dateDebut: Date | string
  dateFin: Date | string
  montant: unknown
  devise: string
  statut:
    | "BROUILLON"
    | "EN_ATTENTE"
    | "SIGNEE"
    | "ACTIVE"
    | "TERMINEE"
    | "ANNULEE"
    | "EXPIREE"
  dateSignature: Date | string | null
  observations: string | null
  participants: {
    inscriptionId: string
  }[]
}

type ConventionFormProps = {
  convention?: ConventionData | null
  inscriptions?: InscriptionOption[]
  onSuccess?: () => void
  onCancel?: () => void
}

function formatDateForInput(
  value: Date | string | null | undefined
) {
  if (!value) return ""

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return date.toISOString().slice(0, 10)
}

export default function ConventionForm({
  convention,
  inscriptions = [],
  onSuccess,
  onCancel,
}: ConventionFormProps) {
  const isEditing = Boolean(convention)

  // =========================================================
  // VALEURS PAR DÉFAUT
  // =========================================================

  const defaultValues = useMemo<ConventionFormValues>(
    () => ({
      numero:
        convention?.numero ?? "",

      organisationNom:
        convention?.organisationNom ?? "",

      organisationAdresse:
        convention?.organisationAdresse ?? "",

      organisationEmail:
        convention?.organisationEmail ?? "",

      organisationTelephone:
        convention?.organisationTelephone ?? "",

      organisationContact:
        convention?.organisationContact ?? "",

      dateDebut:
        formatDateForInput(
          convention?.dateDebut
        ),

      dateFin:
        formatDateForInput(
          convention?.dateFin
        ),

      montant:
        convention?.montant !== undefined
          ? String(convention.montant)
          : "",

      devise:
        convention?.devise ?? "USD",

      statut:
        convention?.statut ?? "BROUILLON",

      dateSignature:
        formatDateForInput(
          convention?.dateSignature
        ),

      observations:
        convention?.observations ?? "",

      inscriptionIds:
        convention?.participants?.map(
          (item) => item.inscriptionId
        ) ?? [],
    }),
    [convention]
  )

  // =========================================================
  // FORMULAIRE
  // =========================================================

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<ConventionFormValues>({
    resolver:
      zodResolver(conventionSchema),
    defaultValues,
  })

  useEffect(() => {
    reset(defaultValues)
  }, [defaultValues, reset])

  // =========================================================
  // SUBMIT
  // =========================================================

  async function onSubmit(
    values: ConventionFormValues
  ) {
    try {
      const result = isEditing
        ? await updateConvention(
            convention!.id,
            values
          )
        : await createConvention(values)

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)

      onSuccess?.()
    } catch (error) {
      console.error(error)

      toast.error(
        "Une erreur inattendue est survenue."
      )
    }
  }

  // =========================================================
  // OPTIONS PARTICIPANTS
  // =========================================================

  const selectOptions = inscriptions

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
    >
      {/* ================================================= */}
      {/* ORGANISATION */}
      {/* ================================================= */}

      <FormSection
        icon={Building2}
        iconClassName="bg-blue-50 text-[#0f5da8] dark:bg-blue-500/10 dark:text-blue-400"
        title="Organisation"
        description="Informations de l'entreprise ou de l'organisation"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field
            label="Numéro de convention"
            required
            error={errors.numero?.message}
            icon={Hash}
          >
            <input
              {...register("numero")}
              placeholder="CONV-2026-001"
              className={inputClassName}
            />
          </Field>

          <Field
            label="Nom de l'organisation"
            required
            error={
              errors.organisationNom?.message
            }
            icon={Building2}
          >
            <input
              {...register(
                "organisationNom"
              )}
              placeholder="Ex. Société ABC"
              className={inputClassName}
            />
          </Field>

          <Field
            label="Adresse"
            error={
              errors.organisationAdresse
                ?.message
            }
            icon={MapPin}
          >
            <input
              {...register(
                "organisationAdresse"
              )}
              placeholder="Adresse de l'organisation"
              className={inputClassName}
            />
          </Field>

          <Field
            label="Personne de contact"
            error={
              errors.organisationContact
                ?.message
            }
            icon={UserRound}
          >
            <input
              {...register(
                "organisationContact"
              )}
              placeholder="Nom du responsable"
              className={inputClassName}
            />
          </Field>

          <Field
            label="Téléphone"
            error={
              errors.organisationTelephone
                ?.message
            }
            icon={Phone}
          >
            <input
              type="tel"
              {...register(
                "organisationTelephone"
              )}
              placeholder="+243 8XX XXX XXX"
              className={inputClassName}
            />
          </Field>

          <Field
            label="Adresse email"
            error={
              errors.organisationEmail
                ?.message
            }
            icon={Mail}
          >
            <input
              type="email"
              {...register(
                "organisationEmail"
              )}
              placeholder="contact@organisation.com"
              className={inputClassName}
            />
          </Field>
        </div>
      </FormSection>

      {/* ================================================= */}
      {/* PÉRIODE ET FINANCEMENT */}
      {/* ================================================= */}

      <FormSection
        icon={DollarSign}
        iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        title="Période et financement"
        description="Définissez la durée et les conditions financières"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Date de début"
            required
            error={
              errors.dateDebut?.message
            }
            icon={CalendarDays}
          >
            <input
              type="date"
              {...register("dateDebut")}
              className={inputClassName}
            />
          </Field>

          <Field
            label="Date de fin"
            required
            error={
              errors.dateFin?.message
            }
            icon={CalendarDays}
          >
            <input
              type="date"
              {...register("dateFin")}
              className={inputClassName}
            />
          </Field>

          <Field
            label="Montant"
            required
            error={
              errors.montant?.message
            }
            icon={Wallet}
          >
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                {...register("montant")}
                placeholder="0.00"
                className={`${inputClassName} pr-14`}
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                {convention?.devise ||
                  "USD"}
              </span>
            </div>
          </Field>

          <Field
            label="Devise"
            required
            error={
              errors.devise?.message
            }
            icon={DollarSign}
          >
            <select
              {...register("devise")}
              className={selectClassName}
            >
              <option value="USD">
                USD — Dollar américain
              </option>

              <option value="CDF">
                CDF — Franc congolais
              </option>

              <option value="EUR">
                EUR — Euro
              </option>
            </select>
          </Field>
        </div>
      </FormSection>

      {/* ================================================= */}
      {/* STATUT */}
      {/* ================================================= */}

      <FormSection
        icon={FileText}
        iconClassName="bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
        title="État de la convention"
        description="Informations administratives et statut du document"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field
            label="Statut"
            required
            error={
              errors.statut?.message
            }
          >
            <select
              {...register("statut")}
              className={selectClassName}
            >
              <option value="BROUILLON">
                Brouillon
              </option>

              <option value="EN_ATTENTE">
                En attente
              </option>

              <option value="SIGNEE">
                Signée
              </option>

              <option value="ACTIVE">
                Active
              </option>

              <option value="TERMINEE">
                Terminée
              </option>

              <option value="ANNULEE">
                Annulée
              </option>

              <option value="EXPIREE">
                Expirée
              </option>
            </select>
          </Field>

          <Field
            label="Date de signature"
            error={
              errors.dateSignature
                ?.message
            }
            icon={CalendarDays}
          >
            <input
              type="date"
              {...register(
                "dateSignature"
              )}
              className={inputClassName}
            />
          </Field>
        </div>
      </FormSection>

      {/* ================================================= */}
      {/* PARTICIPANTS */}
      {/* ================================================= */}

      <FormSection
        icon={Users}
        iconClassName="bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
        title="Participants"
        description="Sélectionnez les apprenants concernés par cette convention"
      >
        <Controller
          name="inscriptionIds"
          control={control}
          render={({ field }) => {
            const selected =
              selectOptions.filter(
                (option) =>
                  field.value?.includes(
                    option.value
                  )
              )

            return (
              <Select
                isMulti
                options={selectOptions}
                value={selected}
                onChange={(values) =>
                  field.onChange(
                    values.map(
                      (item) => item.value
                    )
                  )
                }
                placeholder="Rechercher et sélectionner les participants..."
                noOptionsMessage={() =>
                  "Aucune inscription disponible"
                }
                classNamePrefix="convention-select"
                styles={{
                  control: (
                    base,
                    state
                  ) => ({
                    ...base,
                    minHeight: "46px",
                    borderRadius: "12px",
                    borderColor:
                      state.isFocused
                        ? "#0f5da8"
                        : "#e2e8f0",
                    backgroundColor:
                      "white",
                    boxShadow:
                      state.isFocused
                        ? "0 0 0 4px rgba(15,93,168,0.10)"
                        : "0 1px 2px rgba(15,23,42,0.04)",
                    "&:hover": {
                      borderColor:
                        state.isFocused
                          ? "#0f5da8"
                          : "#cbd5e1",
                    },
                  }),

                  placeholder: (
                    base
                  ) => ({
                    ...base,
                    color: "#94a3b8",
                    fontSize:
                      "0.875rem",
                  }),

                  input: (
                    base
                  ) => ({
                    ...base,
                    color: "#0f172a",
                    fontSize:
                      "0.875rem",
                  }),

                  singleValue: (
                    base
                  ) => ({
                    ...base,
                    color: "#0f172a",
                  }),

                  multiValue: (
                    base
                  ) => ({
                    ...base,
                    borderRadius:
                      "8px",
                    backgroundColor:
                      "#eff6ff",
                  }),

                  multiValueLabel: (
                    base
                  ) => ({
                    ...base,
                    color: "#0f5da8",
                    fontWeight: 500,
                  }),

                  multiValueRemove: (
                    base
                  ) => ({
                    ...base,
                    color: "#0f5da8",
                    borderRadius:
                      "0 8px 8px 0",
                    ":hover": {
                      backgroundColor:
                        "#dbeafe",
                      color: "#1d4ed8",
                    },
                  }),

                  menu: (
                    base
                  ) => ({
                    ...base,
                    zIndex: 50,
                    borderRadius:
                      "12px",
                    overflow: "hidden",
                    boxShadow:
                      "0 20px 40px rgba(15,23,42,0.15)",
                  }),

                  option: (
                    base,
                    state
                  ) => ({
                    ...base,
                    fontSize:
                      "0.875rem",
                    padding:
                      "10px 12px",
                    backgroundColor:
                      state.isSelected
                        ? "#0f5da8"
                        : state.isFocused
                          ? "#eff6ff"
                          : "white",
                    color:
                      state.isSelected
                        ? "white"
                        : "#0f172a",
                  }),
                }}
              />
            )
          }}
        />

        {errors.inscriptionIds && (
          <p className="mt-2 text-xs font-medium text-red-500">
            {errors.inscriptionIds.message}
          </p>
        )}
      </FormSection>

      {/* ================================================= */}
      {/* OBSERVATIONS */}
      {/* ================================================= */}

      <FormSection
        icon={FileText}
        iconClassName="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        title="Observations"
        description="Ajoutez des informations complémentaires si nécessaire"
      >
        <Field
          label="Notes et observations"
          error={
            errors.observations
              ?.message
          }
        >
          <textarea
            {...register("observations")}
            rows={5}
            placeholder="Informations complémentaires concernant cette convention..."
            className={textareaClassName}
          />
        </Field>
      </FormSection>

      {/* ================================================= */}
      {/* ACTIONS */}
      {/* ================================================= */}

      <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:flex-row sm:justify-end sm:px-6 dark:border-slate-800 dark:bg-slate-950/95">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Annuler
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 rounded-xl bg-[#0f5da8] px-6 text-sm font-semibold text-white shadow-sm shadow-blue-900/10 transition hover:bg-[#0c4d8c] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Enregistrement..."
            : isEditing
              ? "Enregistrer les modifications"
              : "Créer la convention"}
        </button>
      </div>
    </form>
  )
}

/* ========================================================= */
/* CLASSES INPUT */
/* ========================================================= */

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0f5da8] focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/10"

const selectClassName =
  "h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all duration-200 hover:border-slate-300 focus:border-[#0f5da8] focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/10"

const textareaClassName =
  "w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium leading-6 text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0f5da8] focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/10"

/* ========================================================= */
/* FORM SECTION */
/* ========================================================= */

function FormSection({
  icon: Icon,
  iconClassName,
  title,
  description,
  children,
}: {
  icon: React.ElementType
  iconClassName: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {title}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  )
}

/* ========================================================= */
/* FIELD */
/* ========================================================= */

function Field({
  label,
  required,
  error,
  icon: Icon,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  icon?: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-300">
        {Icon && (
          <Icon className="h-3.5 w-3.5 text-slate-400" />
        )}

        <span>{label}</span>

        {required && (
          <span className="text-red-500">
            *
          </span>
        )}
      </label>

      {children}

      {error && (
        <p className="flex items-center gap-1 text-xs font-medium text-red-500">
          <span className="h-1 w-1 rounded-full bg-red-500" />
          {error}
        </p>
      )}
    </div>
  )
}