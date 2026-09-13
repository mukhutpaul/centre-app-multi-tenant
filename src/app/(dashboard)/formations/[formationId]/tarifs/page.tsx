import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TarifsClient from "./TarifsFormationClient";



interface PageProps {
params: Promise<{
formationId: string;
}>;
}

export default async function TarifsPage({
params,
}: PageProps) {
const { formationId } = await params;

/**

* ==========================================================
* AUTHENTIFICATION
* ==========================================================
  */

const session = await auth();

const utilisateurId = session?.user?.id;

if (!utilisateurId) {
redirect("/connexion");
}

/**

* ==========================================================
* MEMBRE / CENTRE
* ==========================================================
  */

const membre = await prisma.membre.findFirst({
where: {
utilisateurId,
statut: "ACTIF",
},
select: {
centreId: true,
role: true,
},
});

if (!membre) {
redirect("/formations");
}

/**

* ==========================================================
* FORMATION
* ==========================================================
  */

const formation = await prisma.formation.findFirst({
where: {
id: formationId,
centreId: membre.centreId,
},
select: {
id: true,
nom: true,
code: true,
},
});

if (!formation) {
notFound();
}

/**

* ==========================================================
* TARIFS
* ==========================================================
  */

const tarifs = await prisma.tarifFormation.findMany({
where: {
formationId: formation.id,
centreId: membre.centreId,
},


orderBy: [
  {
    actif: "desc",
  },
  {
    montant: "asc",
  },
  {
    nom: "asc",
  },
],

select: {
  id: true,
  nom: true,
  description: true,
  montant: true,
  devise: true,
  actif: true,
},


});

/**

* ==========================================================
* SERIALISATION
* ==========================================================
*
* Prisma Decimal n'est pas directement sérialisable
* vers un Client Component.
  */

const tarifsSerialises = tarifs.map((tarif) => ({
id: tarif.id,
nom: tarif.nom,
description: tarif.description,
montant: Number(tarif.montant),
devise: tarif.devise,
actif: tarif.actif,
}));

/**

* ==========================================================
* DROITS
* ==========================================================
  */

const canManage = [
"PROPRIETAIRE",
"ADMINISTRATEUR",
"RESPONSABLE",
].includes(membre.role);

return ( <TarifsClient
   formation={formation}
   tarifs={tarifsSerialises}
   canManage={canManage}
 />
);
}
