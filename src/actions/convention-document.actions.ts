"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { getCurrentCentreContext } from "@/lib/validations/centre-access"
import { Prisma } from "@/generated/prisma/client"

type Result = {
success: boolean
message: string
data?: unknown
}

/* =========================================================
HELPERS
========================================================= */

/**

* Récupère l'ID du centre actuellement actif.
*
* IMPORTANT :
* getCurrentCentreContext() retourne un objet de contexte.
* Il faut donc récupérer context.centreId.
  */
  async function getCentreId(): Promise<string> {
  const context =
  await getCurrentCentreContext()

if (!context.centreId) {
throw new Error(
"Aucun centre actif n'est associé à votre compte."
)
}

return context.centreId
}

/**

* Sérialise les données Prisma avant de les
* transmettre à un Client Component.
  */
  function serializeForClient<T>(value: T): T {
  if (value instanceof Prisma.Decimal) {
  return value.toString() as T
  }

if (value instanceof Date) {
return value
}

if (Array.isArray(value)) {
return value.map((item) =>
serializeForClient(item)
) as T
}

if (
value !== null &&
typeof value === "object"
) {
const result: Record<string, unknown> = {}


for (const [key, item] of Object.entries(
  value as Record<string, unknown>
)) {
  result[key] =
    serializeForClient(item)
}

return result as T


}

return value
}

/* =========================================================
AJOUTER DOCUMENT
========================================================= */

export async function addConventionDocument(
conventionId: string,
data: {
nom: string
type: string
url: string
mimeType?: string
taille?: number
}
): Promise<Result> {
try {
/* -----------------------------------------
CENTRE ACTIF
----------------------------------------- */


const centreId =
  await getCentreId()

/* -----------------------------------------
   VALIDATION DONNÉES
----------------------------------------- */

const nom =
  data.nom?.trim() ?? ""

const type =
  data.type?.trim() ?? ""

const url =
  data.url?.trim() ?? ""

const mimeType =
  data.mimeType?.trim() || null

if (!nom) {
  return {
    success: false,
    message:
      "Le nom du document est obligatoire.",
  }
}

if (!type) {
  return {
    success: false,
    message:
      "Le type du document est obligatoire.",
  }
}

if (!url) {
  return {
    success: false,
    message:
      "L'URL du document est obligatoire.",
  }
}

if (
  data.taille !== undefined &&
  (!Number.isInteger(data.taille) ||
    data.taille < 0)
) {
  return {
    success: false,
    message:
      "La taille du document est invalide.",
  }
}

/* -----------------------------------------
   VÉRIFICATION CONVENTION
----------------------------------------- */

const convention =
  await prisma.convention.findFirst({
    where: {
      id: conventionId,
      centreId,
    },

    select: {
      id: true,
    },
  })

if (!convention) {
  return {
    success: false,
    message:
      "Convention introuvable.",
  }
}

/* -----------------------------------------
   CRÉATION DOCUMENT
----------------------------------------- */

const document =
  await prisma.document.create({
    data: {
      centreId,

      conventionId,

      nom,

      type: type as any,

      urlFichier: url,

      typeMime: mimeType,

      taille:
        data.taille ?? null,
    },
  })

/* -----------------------------------------
   CACHE
----------------------------------------- */

revalidatePath(
  `/conventions/${conventionId}`
)

revalidatePath(
  "/conventions"
)

/* -----------------------------------------
   RETOUR
----------------------------------------- */

return {
  success: true,

  message:
    "Document ajouté avec succès.",

  data:
    serializeForClient(
      document
    ),
}


} catch (error) {
console.error(
"addConventionDocument:",
error
)


return {
  success: false,

  message:
    error instanceof Error
      ? error.message
      : "Impossible d'ajouter le document.",
}


}
}

/* =========================================================
SUPPRIMER DOCUMENT
========================================================= */

export async function deleteConventionDocument(
documentId: string
): Promise<Result> {
try {
/* -----------------------------------------
CENTRE ACTIF
----------------------------------------- */


const centreId =
  await getCentreId()

/* -----------------------------------------
   DOCUMENT
----------------------------------------- */

const document =
  await prisma.document.findFirst({
    where: {
      id: documentId,

      centreId,

      /*
       * Protection supplémentaire :
       * on s'assure que ce document est bien
       * rattaché à une convention.
       */
      conventionId: {
        not: null,
      },
    },

    select: {
      id: true,
      conventionId: true,
    },
  })

if (!document) {
  return {
    success: false,
    message:
      "Document introuvable.",
  }
}

/* -----------------------------------------
   SUPPRESSION
----------------------------------------- */

await prisma.document.delete({
  where: {
    id: documentId,
  },
})

/* -----------------------------------------
   CACHE
----------------------------------------- */

if (document.conventionId) {
  revalidatePath(
    `/conventions/${document.conventionId}`
  )
}

revalidatePath(
  "/conventions"
)

/* -----------------------------------------
   RETOUR
----------------------------------------- */

return {
  success: true,

  message:
    "Document supprimé.",
}


} catch (error) {
console.error(
"deleteConventionDocument:",
error
)


return {
  success: false,

  message:
    error instanceof Error
      ? error.message
      : "Impossible de supprimer le document.",
}


}
}
