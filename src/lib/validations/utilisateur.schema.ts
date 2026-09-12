import { z } from "zod";
import { Role } from "@/generated/prisma/enums";

export const utilisateurSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Adresse email invalide"),

  prenom: z
    .string()
    .trim()
    .min(2, "Le prénom doit contenir au moins 2 caractères")
    .max(100)
    .optional()
    .or(z.literal("")),

  nom: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100)
    .optional()
    .or(z.literal("")),

  telephone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("")),

  motDePasse: z
    .string()
    .min(
      8,
      "Le mot de passe doit contenir au moins 8 caractères",
    )
    .optional()
    .or(z.literal("")),

  role: z.enum([
    Role.PROPRIETAIRE,
    Role.ADMINISTRATEUR,
    Role.RESPONSABLE,
    Role.SECRETAIRE,
    Role.COMPTABLE,
    Role.FORMATEUR,
    Role.JURY,
    Role.APPRENANT,
  ]),
});

export type UtilisateurInput = z.infer<
  typeof utilisateurSchema
>;