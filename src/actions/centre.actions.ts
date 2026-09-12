"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { centreSchema } from "@/lib/validations/centre.schema";
import { requirePermission } from "@/lib/auth/tenant";
import { PERMISSIONS } from "@/lib/auth/permissions";

export type CentreActionState = {
success: boolean;
message: string;
errors?: Record<string, string[]>;
};

type CentreFormData = {
nom: unknown;
code: unknown;
slug: unknown;
adresse: unknown;
ville: unknown;
pays: unknown;
codePostal: unknown;
telephone: unknown;
email: unknown;
siteWeb: unknown;
logoUrl: unknown;
devise: unknown;
fuseauHoraire: unknown;
statut: unknown;
};

/**

* Génère un slug propre à partir d'une valeur.
  */
  function generateSlug(value: string): string {
  return value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
  }

/**

* Transforme le FormData en objet exploitable.
  */
  function formDataToObject(
  formData: FormData,
  ): CentreFormData {
  return {
  nom: formData.get("nom"),
  code: formData.get("code"),
  slug: formData.get("slug"),

  adresse: formData.get("adresse"),
  ville: formData.get("ville"),
  pays: formData.get("pays"),
  codePostal: formData.get("codePostal"),

  telephone: formData.get("telephone"),
  email: formData.get("email"),
  siteWeb: formData.get("siteWeb"),

  logoUrl: formData.get("logoUrl"),

  devise: formData.get("devise"),
  fuseauHoraire: formData.get("fuseauHoraire"),

  statut: formData.get("statut"),
  };
  }

/**

* Normalise les valeurs optionnelles.
  */
  function optionalString(
  value: unknown,
  ): string | null {
  if (typeof value !== "string") {
  return null;
  }

const cleaned = value.trim();

return cleaned || null;
}

/**

* =========================================================
* CRÉATION D'UN CENTRE
* =========================================================
  */
  export async function createCentre(
  formData: FormData,
  ): Promise<CentreActionState> {
  try {
  /**

  * La création d'un centre est une opération globale.
  *
  * Le Super Administrateur peut donc la réaliser.
    */
    await requirePermission(
    PERMISSIONS.CENTRE_CREER,
    );

  const rawData =
  formDataToObject(formData);

  const nom =
  typeof rawData.nom === "string"
  ? rawData.nom.trim()
  : "";

  const code =
  typeof rawData.code === "string"
  ? rawData.code.trim().toUpperCase()
  : "";

  /**

  * Génération automatique du slug.
    */
    const slug =
    typeof rawData.slug === "string" &&
    rawData.slug.trim()
    ? generateSlug(rawData.slug)
    : generateSlug(`${nom}-${code}`);

  const data = {
  ...rawData,
  nom,
  code,
  slug,
  statut:
  typeof rawData.statut === "string" &&
  rawData.statut.trim()
  ? rawData.statut
  : "ESSAI",
  };

  const validation =
  centreSchema.safeParse(data);

  if (!validation.success) {
  return {
  success: false,
  message:
  "Veuillez corriger les erreurs du formulaire.",
  errors:
  validation.error.flatten()
  .fieldErrors,
  };
  }

  /**

  * Vérification du code.
    */
    const existingCode =
    await prisma.centreFormation.findUnique({
    where: {
    code: validation.data.code,
    },
    select: {
    id: true,
    },
    });

  if (existingCode) {
  return {
  success: false,
  message:
  "Un centre utilise déjà ce code.",
  errors: {
  code: [
  "Ce code est déjà utilisé.",
  ],
  },
  };
  }

  /**

  * Vérification du slug.
    */
    const existingSlug =
    await prisma.centreFormation.findUnique({
    where: {
    slug: validation.data.slug,
    },
    select: {
    id: true,
    },
    });

  if (existingSlug) {
  return {
  success: false,
  message:
  "Un centre utilise déjà ce slug.",
  errors: {
  slug: [
  "Ce slug est déjà utilisé.",
  ],
  },
  };
  }

  /**

  * Création du centre.
    */
    const centre =
    await prisma.centreFormation.create({
    data: {
    nom: validation.data.nom,
    slug: validation.data.slug,
    code: validation.data.code,

    statut:
    validation.data.statut ??
    "ESSAI",

    adresse:
    optionalString(
    validation.data.adresse,
    ),

    ville:
    optionalString(
    validation.data.ville,
    ),

    pays:
    optionalString(
    validation.data.pays,
    ),

    codePostal:
    optionalString(
    validation.data.codePostal,
    ),

    telephone:
    optionalString(
    validation.data.telephone,
    ),

    email:
    optionalString(
    validation.data.email,
    ),

    siteWeb:
    optionalString(
    validation.data.siteWeb,
    ),

    logoUrl:
    optionalString(
    validation.data.logoUrl,
    ),

    devise:
    validation.data.devise ||
    "XAF",

    fuseauHoraire:
    validation.data.fuseauHoraire ||
    "Africa/Douala",
    },
    select: {
    id: true,
    nom: true,
    code: true,
    slug: true,
    statut: true,
    },
    });

  revalidatePath("/centres");
  revalidatePath("/utilisateurs");

  return {
  success: true,
  message:
  `Centre "${centre.nom}" créé avec succès.`,
  };
  } catch (error) {
  console.error(
  "CREATE CENTRE:",
  error,
  );

  if (
  error instanceof Error &&
  error.message ===
  "NON_AUTHENTIFIE"
  ) {
  return {
  success: false,
  message:
  "Vous devez être connecté.",
  };
  }

  if (
  error instanceof Error &&
  error.message ===
  "PERMISSION_REFUSEE"
  ) {
  return {
  success: false,
  message:
  "Vous n'avez pas la permission de créer un centre.",
  };
  }

  return {
  success: false,
  message:
  "Impossible de créer le centre.",
  };
  }
  }

/**

* =========================================================
* MODIFICATION D'UN CENTRE
* =========================================================
  */
  export async function updateCentre(
  id: string,
  formData: FormData,
  ): Promise<CentreActionState> {
  try {
  if (!id?.trim()) {
  return {
  success: false,
  message: "Identifiant du centre invalide.",
  };
  }

  /**

  * On récupère d'abord le centre.
    */
    const centre =
    await prisma.centreFormation.findUnique({
    where: { id },
    });

  if (!centre) {
  return {
  success: false,
  message: "Centre introuvable.",
  };
  }

  /**

  * IMPORTANT :
  * on transmet maintenant centre.id.
  *
  * Cela permet à requirePermission de vérifier
  * correctement le contexte du centre.
    */
    await requirePermission(
    PERMISSIONS.CENTRE_MODIFIER,
    );

  const rawData =
  formDataToObject(formData);

  const nom =
  typeof rawData.nom === "string"
  ? rawData.nom.trim()
  : centre.nom;

  const code =
  typeof rawData.code === "string"
  ? rawData.code.trim().toUpperCase()
  : centre.code;

  const slug =
  typeof rawData.slug === "string" &&
  rawData.slug.trim()
  ? generateSlug(rawData.slug)
  : centre.slug;

  const data = {
  ...rawData,
  nom,
  code,
  slug,
  statut:
  typeof rawData.statut === "string" &&
  rawData.statut.trim()
  ? rawData.statut
  : centre.statut,
  };

  const validation =
  centreSchema.safeParse(data);

  if (!validation.success) {
  return {
  success: false,
  message:
  "Veuillez corriger les erreurs.",
  errors:
  validation.error.flatten()
  .fieldErrors,
  };
  }

  /**

  * Vérification du code.
    */
    const codeExiste =
    await prisma.centreFormation.findFirst({
    where: {
    code: validation.data.code,
    NOT: {
    id,
    },
    },
    select: {
    id: true,
    },
    });

  if (codeExiste) {
  return {
  success: false,
  message:
  "Ce code est déjà utilisé.",
  errors: {
  code: [
  "Ce code est déjà utilisé.",
  ],
  },
  };
  }

  /**

  * Vérification du slug.
    */
    const slugExiste =
    await prisma.centreFormation.findFirst({
    where: {
    slug: validation.data.slug,
    NOT: {
    id,
    },
    },
    select: {
    id: true,
    },
    });

  if (slugExiste) {
  return {
  success: false,
  message:
  "Ce slug est déjà utilisé.",
  errors: {
  slug: [
  "Ce slug est déjà utilisé.",
  ],
  },
  };
  }

  await prisma.centreFormation.update({
  where: {
  id,
  },
  data: {
  nom: validation.data.nom,
  slug: validation.data.slug,
  code: validation.data.code,


   statut:
     validation.data.statut ??
     centre.statut,

   adresse:
     optionalString(
       validation.data.adresse,
     ),

   ville:
     optionalString(
       validation.data.ville,
     ),

   pays:
     optionalString(
       validation.data.pays,
     ),

   codePostal:
     optionalString(
       validation.data.codePostal,
     ),

   telephone:
     optionalString(
       validation.data.telephone,
     ),

   email:
     optionalString(
       validation.data.email,
     ),

   siteWeb:
     optionalString(
       validation.data.siteWeb,
     ),

   logoUrl:
     optionalString(
       validation.data.logoUrl,
     ),

   devise:
     validation.data.devise ||
     centre.devise,

   fuseauHoraire:
     validation.data.fuseauHoraire ||
     centre.fuseauHoraire,


  },
  });

  revalidatePath("/centres");
  revalidatePath(`/centres/${id}`);
  revalidatePath("/utilisateurs");

  return {
  success: true,
  message:
  "Centre modifié avec succès.",
  };
  } catch (error) {
  console.error(
  "UPDATE CENTRE:",
  error,
  );

  if (
  error instanceof Error &&
  error.message ===
  "NON_AUTHENTIFIE"
  ) {
  return {
  success: false,
  message:
  "Vous devez être connecté.",
  };
  }

  if (
  error instanceof Error &&
  error.message ===
  "PERMISSION_REFUSEE"
  ) {
  return {
  success: false,
  message:
  "Vous n'avez pas la permission de modifier ce centre.",
  };
  }

  return {
  success: false,
  message:
  "Impossible de modifier le centre.",
  };
  }
  }

/**

* =========================================================
* ACTIVATION / SUSPENSION D'UN CENTRE
* =========================================================
  */
  export async function toggleCentreStatus(
  id: string,
  ): Promise<CentreActionState> {
  try {
  if (!id?.trim()) {
  return {
  success: false,
  message:
  "Identifiant du centre invalide.",
  };
  }

  const centre =
  await prisma.centreFormation.findUnique({
  where: { id },
  select: {
  id: true,
  nom: true,
  statut: true,
  },
  });

  if (!centre) {
  return {
  success: false,
  message: "Centre introuvable.",
  };
  }

  await requirePermission(
  PERMISSIONS.CENTRE_DESACTIVER,
);

  const nouveauStatut =
  centre.statut === "ACTIF"
  ? "SUSPENDU"
  : "ACTIF";

  await prisma.centreFormation.update({
  where: {
  id: centre.id,
  },
  data: {
  statut: nouveauStatut,
  },
  });

  revalidatePath("/centres");
  revalidatePath(
  `/centres/${centre.id}`,
  );

  return {
  success: true,
  message:
  nouveauStatut === "ACTIF"
  ? `Le centre "${centre.nom}" est maintenant actif.`
  : `Le centre "${centre.nom}" est maintenant suspendu.`,
  };
  } catch (error) {
  console.error(
  "TOGGLE CENTRE STATUS:",
  error,
  );

  if (
  error instanceof Error &&
  error.message ===
  "NON_AUTHENTIFIE"
  ) {
  return {
  success: false,
  message:
  "Vous devez être connecté.",
  };
  }

  if (
  error instanceof Error &&
  error.message ===
  "PERMISSION_REFUSEE"
  ) {
  return {
  success: false,
  message:
  "Vous n'avez pas la permission de modifier le statut de ce centre.",
  };
  }

  return {
  success: false,
  message:
  "Impossible de modifier le statut du centre.",
  };
  }
  }

/**

* =========================================================
* ALIAS
* =========================================================
*
* Conservé pour compatibilité avec les composants
* existants qui utilisent toggleCentre().
  */
  export async function toggleCentre(
  id: string,
  ): Promise<CentreActionState> {
  return toggleCentreStatus(id);
  }

/**

* =========================================================
* RÉCUPÉRER UN CENTRE
* =========================================================
  */
  export async function getCentre(id: string) {
  try {
  if (!id?.trim()) {
  return {
  success: false,
  message:
  "Identifiant du centre invalide.",
  data: null,
  };
  }

  const centre =
  await prisma.centreFormation.findUnique({
  where: {
  id,
  },
  });

  if (!centre) {
  return {
  success: false,
  message: "Centre introuvable.",
  data: null,
  };
  }

  await requirePermission(
  PERMISSIONS.CENTRE_DESACTIVER,
);

  return {
  success: true,
  message:
  "Centre récupéré avec succès.",
  data: centre,
  };
  } catch (error) {
  console.error(
  "GET CENTRE:",
  error,
  );

  if (
  error instanceof Error &&
  error.message ===
  "NON_AUTHENTIFIE"
  ) {
  return {
  success: false,
  message:
  "Vous devez être connecté.",
  data: null,
  };
  }

  if (
  error instanceof Error &&
  error.message ===
  "PERMISSION_REFUSEE"
  ) {
  return {
  success: false,
  message:
  "Vous n'avez pas accès à ce centre.",
  data: null,
  };
  }

  return {
  success: false,
  message:
  "Impossible de récupérer le centre.",
  data: null,
  };
  }
  }

/**

* =========================================================
* LISTE DES CENTRES
* =========================================================
*
* Cette fonction est particulièrement importante pour
* le formulaire de création d'utilisateur.
*
* Le Super Administrateur pourra obtenir la liste des
* centres existants et sélectionner le centre auquel
* rattacher le nouvel utilisateur.
  */
  export async function getCentres() {
  try {
 await requirePermission(
  PERMISSIONS.CENTRE_DESACTIVER,
);

  const centres =
  await prisma.centreFormation.findMany({
  orderBy: {
  creeLe: "desc",
  },
  });

  return {
  success: true,
  message:
  "Centres récupérés avec succès.",
  data: centres,
  };
  } catch (error) {
  console.error(
  "GET CENTRES:",
  error,
  );

  return {
  success: false,
  message:
  "Impossible de récupérer les centres.",
  data: [],
  };
  }
  }

/**

* =========================================================
* CENTRES DISPONIBLES POUR AFFECTATION
* =========================================================
*
* Utilisée notamment lors de la création d'un utilisateur
* par le Super Administrateur.
*
* Exemple :
*
* Super Admin
* ```
  ↓
  ```
* Création utilisateur
* ```
  ↓
  ```
* Sélection du centre
* ```
  ↓
  ```
* Rôle PROPRIETAIRE / ADMINISTRATEUR / etc.
  */
  export async function getCentresPourAffectation() {
  try {
  await requirePermission(
  PERMISSIONS.CENTRE_VOIR,
  );

  const centres =
  await prisma.centreFormation.findMany({
  where: {
  statut: {
  in: [
  "ESSAI",
  "ACTIF",
  ],
  },
  },
  select: {
  id: true,
  nom: true,
  code: true,
  slug: true,
  statut: true,
  },
  orderBy: {
  nom: "asc",
  },
  });

  return {
  success: true,
  message:
  "Centres disponibles récupérés avec succès.",
  data: centres,
  };
  } catch (error) {
  console.error(
  "GET CENTRES POUR AFFECTATION:",
  error,
  );

  return {
  success: false,
  message:
  "Impossible de récupérer les centres disponibles.",
  data: [],
  };
  }
  }

/**

* =========================================================
* SUPPRESSION D'UN CENTRE
* =========================================================
*
* ATTENTION :
* La suppression peut entraîner la suppression en cascade
* des membres, apprenants et autres données liées selon
* le schéma Prisma.
  */
  export async function deleteCentre(
  id: string,
  ): Promise<CentreActionState> {
  try {
  if (!id?.trim()) {
  return {
  success: false,
  message:
  "Identifiant du centre invalide.",
  };
  }

  const centre =
  await prisma.centreFormation.findUnique({
  where: {
  id,
  },
  select: {
  id: true,
  nom: true,
  },
  });

  if (!centre) {
  return {
  success: false,
  message: "Centre introuvable.",
  };
  }

  await requirePermission(
  PERMISSIONS.CENTRE_MODIFIER,
);

  await prisma.centreFormation.delete({
  where: {
  id: centre.id,
  },
  });

  revalidatePath("/centres");
  revalidatePath("/utilisateurs");

  return {
  success: true,
  message:
  `Le centre "${centre.nom}" a été supprimé avec succès.`,
  };
  } catch (error) {
  console.error(
  "DELETE CENTRE:",
  error,
  );

  if (
  error instanceof Error &&
  error.message ===
  "NON_AUTHENTIFIE"
  ) {
  return {
  success: false,
  message:
  "Vous devez être connecté.",
  };
  }

  if (
  error instanceof Error &&
  error.message ===
  "PERMISSION_REFUSEE"
  ) {
  return {
  success: false,
  message:
  "Vous n'avez pas la permission de supprimer ce centre.",
  };
  }

  return {
  success: false,
  message:
  "Impossible de supprimer le centre. Vérifiez également les données liées à ce centre.",
  };
  }
  }
