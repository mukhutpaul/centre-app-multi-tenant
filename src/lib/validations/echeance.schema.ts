import { z } from "zod";

export const statutEcheanceSchema =
  z.enum([
    "EN_ATTENTE",
    "PARTIELLE",
    "PAYEE",
    "EN_RETARD",
    "ANNULEE",
  ]);

export const createEcheanceSchema =
  z.object({
    factureId: z
      .string()
      .trim()
      .min(
        1,
        "La facture est obligatoire.",
      ),

    dateEcheance: z.coerce.date(),

    montant: z.coerce
      .number()
      .positive(
        "Le montant doit être supérieur à 0.",
      ),

    notes: z
      .string()
      .trim()
      .nullable()
      .optional(),
  });

export type CreateEcheanceInput =
  z.infer<
    typeof createEcheanceSchema
  >;