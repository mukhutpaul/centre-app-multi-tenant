import { z } from "zod";

export const statutFactureSchema = z.enum([
  "BROUILLON",
  "EMISE",
  "PARTIELLEMENT_PAYEE",
  "PAYEE",
  "EN_RETARD",
  "ANNULEE",
]);

export const ligneFactureSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "La description est obligatoire."),

  quantite: z.coerce
    .number()
    .positive("La quantité doit être supérieure à 0."),

  prixUnitaire: z.coerce
    .number()
    .min(0, "Le prix unitaire ne peut pas être négatif."),
});

export const createFactureSchema = z.object({
  inscriptionId: z
    .string()
    .trim()
    .nullable()
    .optional(),

  numero: z
    .string()
    .trim()
    .optional()
    .default(""),

  dateEmission: z.coerce.date(),

  dateEcheance: z
    .coerce
    .date()
    .nullable()
    .optional(),

  remise: z.coerce
    .number()
    .min(0, "La remise ne peut pas être négative.")
    .default(0),

  taxe: z.coerce
    .number()
    .min(0, "La taxe ne peut pas être négative.")
    .default(0),

  statut: statutFactureSchema
    .default("BROUILLON"),

  notes: z
    .string()
    .trim()
    .nullable()
    .optional(),

  lignes: z
    .array(ligneFactureSchema)
    .min(1, "Ajoutez au moins une ligne à la facture."),
});

export const updateFactureSchema =
  createFactureSchema;

export type CreateFactureInput =
  z.infer<typeof createFactureSchema>;

export type UpdateFactureInput =
  z.infer<typeof updateFactureSchema>;