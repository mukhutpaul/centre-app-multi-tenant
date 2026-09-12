
import { z } from "zod";

import {
  StatutFormation,
  TypeFormation,
} from "@/generated/prisma/enums";

/**
 * ============================================================
 * SCHÉMA FORMATION
 * ============================================================
 */

export const formationSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Le code de la formation est obligatoire.")
    .max(50, "Le code ne peut pas dépasser 50 caractères.")
    .transform((value) => value.toUpperCase()),

  nom: z
    .string()
    .trim()
    .min(2, "Le nom de la formation est obligatoire.")
    .max(150, "Le nom ne peut pas dépasser 150 caractères."),

  description: z
    .string()
    .trim()
    .max(
      5000,
      "La description ne peut pas dépasser 5000 caractères."
    )
    .optional()
    .or(z.literal("")),

  objectifs: z
    .string()
    .trim()
    .max(
      5000,
      "Les objectifs ne peuvent pas dépasser 5000 caractères."
    )
    .optional()
    .or(z.literal("")),

  prerequis: z
    .string()
    .trim()
    .max(
      5000,
      "Les prérequis ne peuvent pas dépasser 5000 caractères."
    )
    .optional()
    .or(z.literal("")),

  type: z
    .nativeEnum(TypeFormation)
    .default(TypeFormation.PRESENTIEL),

  dureeHeures: z
    .union([
      z.number().finite().nonnegative(),
      z.string().trim(),
    ])
    .optional()
    .transform((value) => {
      if (value === undefined || value === "") {
        return null;
      }

      const nombre =
        typeof value === "number"
          ? value
          : Number(value);

      if (!Number.isFinite(nombre) || nombre < 0) {
        return null;
      }

      return nombre;
    }),

  statut: z
    .nativeEnum(StatutFormation)
    .default(StatutFormation.BROUILLON),
});

/**
 * ============================================================
 * TYPE
 * ============================================================
 */

export type FormationInput = z.infer<
  typeof formationSchema
>;
