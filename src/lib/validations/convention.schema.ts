import { z } from "zod"

export const conventionSchema = z
  .object({
    numero: z
      .string()
      .min(1, "Le numéro de convention est obligatoire")
      .max(100, "Le numéro est trop long"),

    organisationNom: z
      .string()
      .min(2, "Le nom de l'organisation est obligatoire")
      .max(200, "Le nom est trop long"),

    organisationAdresse: z
      .string()
      .max(300, "L'adresse est trop longue")
      .optional()
      .or(z.literal("")),

    organisationEmail: z
      .string()
      .email("Adresse email invalide")
      .optional()
      .or(z.literal("")),

    organisationTelephone: z
      .string()
      .max(50, "Le numéro est trop long")
      .optional()
      .or(z.literal("")),

    organisationContact: z
      .string()
      .max(150, "Le nom du contact est trop long")
      .optional()
      .or(z.literal("")),

    dateDebut: z
      .string()
      .min(1, "La date de début est obligatoire"),

    dateFin: z
      .string()
      .min(1, "La date de fin est obligatoire"),

    montant: z
      .string()
      .min(1, "Le montant est obligatoire")
      .refine(
        (value) => !Number.isNaN(Number(value)),
        "Le montant doit être numérique"
      )
      .refine(
        (value) => Number(value) >= 0,
        "Le montant ne peut pas être négatif"
      ),

    devise: z
      .string()
      .min(1, "La devise est obligatoire")
      .max(10, "La devise est invalide"),

    statut: z.enum([
      "BROUILLON",
      "EN_ATTENTE",
      "SIGNEE",
      "ACTIVE",
      "TERMINEE",
      "ANNULEE",
      "EXPIREE",
    ]),

    dateSignature: z
      .string()
      .optional()
      .or(z.literal("")),

    observations: z
      .string()
      .max(2000, "Les observations sont trop longues")
      .optional()
      .or(z.literal("")),

    inscriptionIds: z
      .array(z.string())
      .default([]),
  })
  .refine(
    (data) => {
      const debut = new Date(data.dateDebut)
      const fin = new Date(data.dateFin)

      return fin >= debut
    },
    {
      message:
        "La date de fin doit être supérieure ou égale à la date de début",
      path: ["dateFin"],
    }
  )

export type ConventionFormValues = z.infer<typeof conventionSchema>