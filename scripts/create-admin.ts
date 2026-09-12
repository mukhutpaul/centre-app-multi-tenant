
import "dotenv/config";

import bcrypt from "bcryptjs";

import { prisma } from "../src/lib/prisma";

async function main() {
  console.log(
    "DATABASE_URL =",
    process.env.DATABASE_URL,
  );

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL n'est pas défini dans le fichier .env",
    );
  }

  /* ==========================================================
     SUPER ADMIN
  ========================================================== */

  const email = "admin@formation.cd";
  const password = "Admin@123456";

  const motDePasse =
    await bcrypt.hash(password, 12);

  const superAdmin =
    await prisma.utilisateur.upsert({
      where: {
        email,
      },

      update: {
        motDePasse,
        prenom: "Système",
        nom: "Administrateur",
        statut: "ACTIF",
        roleSysteme: "SUPER_ADMIN",
      },

      create: {
        prenom: "Système",
        nom: "Administrateur",
        email,
        motDePasse,
        statut: "ACTIF",
        roleSysteme: "SUPER_ADMIN",
      },
    });

  /* ==========================================================
     VÉRIFICATION
     
     Le SUPER_ADMIN est un utilisateur global.
     Il n'a PAS besoin d'être créé comme Membre d'un centre.
  ========================================================== */

  console.log("");
  console.log(
    "======================================",
  );
  console.log(
    " SUPER ADMIN CRÉÉ / MIS À JOUR",
  );
  console.log(
    "======================================",
  );
  console.log(
    "Nom          :",
    `${superAdmin.prenom ?? ""} ${superAdmin.nom ?? ""}`.trim(),
  );
  console.log(
    "Email        :",
    superAdmin.email,
  );
  console.log(
    "Rôle système :",
    superAdmin.roleSysteme,
  );
  console.log(
    "Statut       :",
    superAdmin.statut,
  );
  console.log(
    "Mot de passe :",
    password,
  );
  console.log(
    "ID           :",
    superAdmin.id,
  );
  console.log(
    "======================================",
  );
  console.log("");
}

main()
  .catch((error) => {
    console.error(
      "Erreur lors du seed :",
      error,
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
