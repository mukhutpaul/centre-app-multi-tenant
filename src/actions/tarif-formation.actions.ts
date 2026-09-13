"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type ActionResult =
| {
success: true;
message: string;
}
| {
success: false;
message: string;
};

/**

* ============================================================
* CONTEXTE UTILISATEUR
* ============================================================
  */

async function getCentreContext() {
const session = await auth();

const utilisateurId = session?.user?.id;

if (!utilisateurId) {
throw new Error("Vous devez être connecté.");
}

const membre = await prisma.membre.findFirst({
where: {
utilisateurId,
statut: "ACTIF",
},
select: {
id: true,
centreId: true,
role: true,
},
});

if (!membre) {
throw new Error("Vous n'êtes membre d'aucun centre actif.");
}

return membre;
}

/**

* ============================================================
* VÉRIFIER L'ACCÈS À LA FORMATION
* ============================================================
  */

async function verifyFormation(
  formationId: string,
  centreId: string,
) {
  const formation = await prisma.formation.findFirst({
    where: {
      id: formationId,
      centreId,
    },
    select: {
      id: true,
      nom: true,
      code: true,
    },
  });

  if (!formation) {
    throw new Error("Formation introuvable.");
  }

  return formation;
}

/**

* ============================================================
* CRÉER UN TARIF
* ============================================================
  */

export async function createTarifFormation(data: {
formationId: string;
nom: string;
description?: string;
montant: string | number;
devise?: string;
}): Promise<ActionResult> {
try {
const membre = await getCentreContext();

const formation = await prisma.formation.findFirst({
  where: {
    id: data.formationId,
    centreId: membre.centreId,
  },
  select: {
    id: true,
    nom: true,
  },
});

if (!formation) {
  throw new Error("Formation introuvable.");
}

if (
  !["PROPRIETAIRE", "ADMINISTRATEUR", "RESPONSABLE"].includes(
    membre.role,
  )
) {
  throw new Error(
    "Vous n'avez pas l'autorisation de gérer les tarifs.",
  );
}

const nom = String(data.nom ?? "").trim();
const description = String(data.description ?? "").trim();
const devise = String(data.devise ?? "XAF").trim().toUpperCase();

if (!nom) {
  throw new Error("Le nom du tarif est obligatoire.");
}

if (!devise) {
  throw new Error("La devise est obligatoire.");
}

const montant = Number(data.montant);

if (!Number.isFinite(montant) || montant < 0) {
  throw new Error("Le montant doit être un nombre positif ou nul.");
}

await prisma.tarifFormation.create({
  data: {
    centreId: membre.centreId,
    formationId: formation.id,
    nom,
    description: description || null,
    montant,
    devise,
    actif: true,
  },
});

revalidatePath(`/formations/${formation.id}/tarifs`);
revalidatePath("/formations");

return {
  success: true,
  message: "Le tarif a été ajouté avec succès.",
};


} catch (error) {
console.error("createTarifFormation:", error);


return {
  success: false,
  message:
    error instanceof Error
      ? error.message
      : "Impossible d'ajouter le tarif.",
};


}
}

/**

* ============================================================
* MODIFIER UN TARIF
* ============================================================
  */

export async function updateTarifFormation(data: {
id: string;
formationId: string;
nom: string;
description?: string;
montant: string | number;
devise?: string;
}): Promise<ActionResult> {
try {
const membre = await getCentreContext();


if (
  !["PROPRIETAIRE", "ADMINISTRATEUR", "RESPONSABLE"].includes(
    membre.role,
  )
) {
  throw new Error(
    "Vous n'avez pas l'autorisation de modifier les tarifs.",
  );
}

const formation = await prisma.formation.findFirst({
  where: {
    id: data.formationId,
    centreId: membre.centreId,
  },
  select: {
    id: true,
  },
});

if (!formation) {
  throw new Error("Formation introuvable.");
}

const tarif = await prisma.tarifFormation.findFirst({
  where: {
    id: data.id,
    formationId: formation.id,
    centreId: membre.centreId,
  },
});

if (!tarif) {
  throw new Error("Tarif introuvable.");
}

const nom = String(data.nom ?? "").trim();
const description = String(data.description ?? "").trim();
const devise = String(data.devise ?? "XAF").trim().toUpperCase();

if (!nom) {
  throw new Error("Le nom du tarif est obligatoire.");
}

if (!devise) {
  throw new Error("La devise est obligatoire.");
}

const montant = Number(data.montant);

if (!Number.isFinite(montant) || montant < 0) {
  throw new Error("Le montant doit être un nombre positif ou nul.");
}

await prisma.tarifFormation.update({
  where: {
    id: tarif.id,
  },
  data: {
    nom,
    description: description || null,
    montant,
    devise,
  },
});

revalidatePath(`/formations/${formation.id}/tarifs`);

return {
  success: true,
  message: "Le tarif a été modifié avec succès.",
};


} catch (error) {
console.error("updateTarifFormation:", error);


return {
  success: false,
  message:
    error instanceof Error
      ? error.message
      : "Impossible de modifier le tarif.",
};


}
}

/**

* ============================================================
* ACTIVER / DÉSACTIVER
* ============================================================
  */

export async function toggleTarifFormation(
id: string,
formationId: string,
): Promise<ActionResult> {
try {
const membre = await getCentreContext();


if (
  !["PROPRIETAIRE", "ADMINISTRATEUR", "RESPONSABLE"].includes(
    membre.role,
  )
) {
  throw new Error(
    "Vous n'avez pas l'autorisation de modifier les tarifs.",
  );
}

const tarif = await prisma.tarifFormation.findFirst({
  where: {
    id,
    formationId,
    centreId: membre.centreId,
  },
});

if (!tarif) {
  throw new Error("Tarif introuvable.");
}

await prisma.tarifFormation.update({
  where: {
    id: tarif.id,
  },
  data: {
    actif: !tarif.actif,
  },
});

revalidatePath(`/formations/${formationId}/tarifs`);

return {
  success: true,
  message: tarif.actif
    ? "Le tarif a été désactivé."
    : "Le tarif a été activé.",
};


} catch (error) {
console.error("toggleTarifFormation:", error);


return {
  success: false,
  message:
    error instanceof Error
      ? error.message
      : "Impossible de modifier le statut du tarif.",
};


}
}

/**

* ============================================================
* SUPPRIMER UN TARIF
* ============================================================
  */

export async function deleteTarifFormation(
id: string,
formationId: string,
): Promise<ActionResult> {
try {
const membre = await getCentreContext();


if (
  !["PROPRIETAIRE", "ADMINISTRATEUR", "RESPONSABLE"].includes(
    membre.role,
  )
) {
  throw new Error(
    "Vous n'avez pas l'autorisation de supprimer les tarifs.",
  );
}

const tarif = await prisma.tarifFormation.findFirst({
  where: {
    id,
    formationId,
    centreId: membre.centreId,
  },
});

if (!tarif) {
  throw new Error("Tarif introuvable.");
}

await prisma.tarifFormation.delete({
  where: {
    id: tarif.id,
  },
});

revalidatePath(`/formations/${formationId}/tarifs`);

return {
  success: true,
  message: "Le tarif a été supprimé avec succès.",
};


} catch (error) {
console.error("deleteTarifFormation:", error);


return {
  success: false,
  message:
    error instanceof Error
      ? error.message
      : "Impossible de supprimer le tarif.",
};


}
}
