import { Role, StatutMembre } from "@/generated/prisma/enums";
import { z } from "zod";


export const membreSchema = z.object({
  utilisateurId: z
    .string()
    .min(1, "L'utilisateur est obligatoire"),

  role: z.nativeEnum(Role),

  statut: z.nativeEnum(StatutMembre),
});

export type MembreInput = z.infer<typeof membreSchema>;