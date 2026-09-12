import { z } from "zod";
import { StatutFormateur } from "@/generated/prisma/enums";

export const formateurSchema = z.object({
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

  specialite: z
    .string()
    .trim()
    .max(150, "La spécialité est trop longue.")
    .optional()
    .or(z.literal("")),

  biographie: z
    .string()
    .trim()
    .max(3000, "La biographie est trop longue.")
    .optional()
    .or(z.literal("")),

  statut: z.nativeEnum(StatutFormateur),
});

export type FormateurInput = z.infer<typeof formateurSchema>;