-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Utilisateur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT,
    "prenom" TEXT,
    "nom" TEXT,
    "telephone" TEXT,
    "roleSysteme" TEXT NOT NULL DEFAULT 'UTILISATEUR',
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "avatarUrl" TEXT,
    "derniereConnexion" DATETIME,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL
);
INSERT INTO "new_Utilisateur" ("avatarUrl", "creeLe", "derniereConnexion", "email", "id", "modifieLe", "motDePasse", "nom", "prenom", "statut", "telephone") SELECT "avatarUrl", "creeLe", "derniereConnexion", "email", "id", "modifieLe", "motDePasse", "nom", "prenom", "statut", "telephone" FROM "Utilisateur";
DROP TABLE "Utilisateur";
ALTER TABLE "new_Utilisateur" RENAME TO "Utilisateur";
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
