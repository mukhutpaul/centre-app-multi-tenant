import { z } from "zod";

import { StatutCentre } from "@/generated/prisma/enums";

export const centreSchema = z.object({
  nom: z
    .string()
    .min(2, "Le nom du centre est obligatoire."),

  code: z
    .string()
    .min(2, "Le code du centre est obligatoire."),

  slug: z
    .string()
    .min(2, "Le slug du centre est obligatoire."),

  statut: z.enum([
    StatutCentre.ESSAI,
    StatutCentre.ACTIF,
    StatutCentre.SUSPENDU,
    StatutCentre.RESILIE,
  ]),

  adresse: z
    .string()
    .optional(),

  ville: z
    .string()
    .optional(),

  pays: z
    .string()
    .optional(),

  codePostal: z
    .string()
    .optional(),

  telephone: z
    .string()
    .optional(),

  email: z
    .string()
    .email("Adresse email invalide.")
    .optional()
    .or(z.literal("")),

  siteWeb: z
    .string()
    .optional()
    .or(z.literal("")),

  logoUrl: z
    .string()
    .optional()
    .or(z.literal("")),

  devise: z
    .string()
    .min(1, "La devise est obligatoire."),

  fuseauHoraire: z
    .string()
    .min(1, "Le fuseau horaire est obligatoire."),
});

/**
 * Type utilisé par CentreForm.
 */
export type CentreFormData = z.infer<
  typeof centreSchema
>;