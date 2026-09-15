
import { z } from "zod";

/**
 * ============================================================
 * MODES DE PAIEMENT
 * ============================================================
 */

export const modePaiementSchema = z.enum([
  "ESPECES",
  "VIREMENT",
  "MOBILE_MONEY",
  "CARTE",
  "CHEQUE",
  "AUTRE",
]);

/**
 * ============================================================
 * STATUTS DE PAIEMENT
 * ============================================================
 */

export const statutPaiementSchema = z.enum([
  "EN_ATTENTE",
  "EFFECTUE",
  "ECHEC",
  "ANNULE",
  "REMBOURSE",
]);

/**
 * ============================================================
 * CREATION
 * ============================================================
 */

export const createPaiementSchema = z.object({
  apprenantId: z
    .string()
    .min(1, "L'apprenant est obligatoire."),

  inscriptionId: z
    .string()
    .min(1, "L'inscription est obligatoire."),

  factureId: z
    .string()
    .optional()
    .nullable(),

  echeanceId: z
    .string()
    .optional()
    .nullable(),

  reference: z
    .string()
    .trim()
    .min(1, "La référence du paiement est obligatoire.")
    .max(100, "La référence est trop longue."),

  montant: z
    .coerce
    .number()
    .positive("Le montant doit être supérieur à 0."),

  mode: modePaiementSchema,

  statut: statutPaiementSchema
    .default("EFFECTUE"),

  datePaiement: z
    .coerce
    .date()
    .optional()
    .nullable(),

  referenceTransaction: z
    .string()
    .trim()
    .max(150, "La référence de transaction est trop longue.")
    .optional()
    .nullable(),

  notes: z
    .string()
    .trim()
    .max(1000, "Les notes sont trop longues.")
    .optional()
    .nullable(),
});

/**
 * ============================================================
 * MODIFICATION
 * ============================================================
 */

export const updatePaiementSchema =
  createPaiementSchema.partial();

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

export type CreatePaiementInput =
  z.infer<typeof createPaiementSchema>;

export type UpdatePaiementInput =
  z.infer<typeof updatePaiementSchema>;

