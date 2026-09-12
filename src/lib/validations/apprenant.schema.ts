import { z } from "zod";

export const apprenantSchema = z.object({
  prenom: z
    .string()
    .trim()
    .min(2, "Le prénom doit contenir au moins 2 caractères.")
    .max(100, "Le prénom est trop long."),

  nom: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(100, "Le nom est trop long."),

  email: z
    .string()
    .trim()
    .email("L'adresse e-mail est invalide.")
    .max(150, "L'adresse e-mail est trop longue.")
    .optional()
    .or(z.literal("")),

  telephone: z
    .string()
    .trim()
    .max(30, "Le numéro de téléphone est trop long.")
    .optional()
    .or(z.literal("")),

  dateNaissance: z
    .string()
    .optional()
    .or(z.literal("")),

  lieuNaissance: z
    .string()
    .trim()
    .max(150, "Le lieu de naissance est trop long.")
    .optional()
    .or(z.literal("")),

  sexe: z
    .enum(["HOMME", "FEMME", "AUTRE"])
    .optional()
    .or(z.literal("")),

  nationalite: z
    .string()
    .trim()
    .max(100, "La nationalité est trop longue.")
    .optional()
    .or(z.literal("")),

  adresse: z
    .string()
    .trim()
    .max(255, "L'adresse est trop longue.")
    .optional()
    .or(z.literal("")),

  ville: z
    .string()
    .trim()
    .max(100, "La ville est trop longue.")
    .optional()
    .or(z.literal("")),

  pays: z
    .string()
    .trim()
    .max(100, "Le pays est trop long.")
    .optional()
    .or(z.literal("")),

  profession: z
    .string()
    .trim()
    .max(150, "La profession est trop longue.")
    .optional()
    .or(z.literal("")),

  contactUrgenceNom: z
    .string()
    .trim()
    .max(150, "Le nom du contact est trop long.")
    .optional()
    .or(z.literal("")),

  contactUrgenceTelephone: z
    .string()
    .trim()
    .max(30, "Le téléphone du contact est trop long.")
    .optional()
    .or(z.literal("")),

  statut: z.enum([
    "ACTIF",
    "INACTIF",
    "DIPLOME",
    "SUSPENDU",
    "ARCHIVE",
  ]),

  notes: z
    .string()
    .trim()
    .max(5000, "Les notes sont trop longues.")
    .optional()
    .or(z.literal("")),
});

export type ApprenantFormData = z.infer<
  typeof apprenantSchema
>;