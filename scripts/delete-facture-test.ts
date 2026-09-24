import "dotenv/config"

import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL n'est pas définie. Vérifie ton fichier .env."
  )
}

const adapter = new PrismaBetterSqlite3({
  url: databaseUrl,
})

const prisma = new PrismaClient({
  adapter,
})

async function main() {
  console.log("🔎 Recherche des factures...")

  const factures = await prisma.facture.findMany({
    select: {
      id: true,
      numero: true,
      total: true,
    },
  })

  console.log(`📄 Nombre de factures trouvées : ${factures.length}`)

  for (const facture of factures) {
    console.log(
      `   - ${facture.numero} | ID: ${facture.id} | Total: ${facture.total}`
    )
  }

  if (factures.length === 0) {
    console.log("✅ Aucune facture à supprimer.")
    return
  }

  if (factures.length > 1) {
    throw new Error(
      "⚠️ Plusieurs factures existent. Suppression annulée par sécurité."
    )
  }

  const facture = factures[0]

  console.log(`🗑️ Suppression de la facture : ${facture.numero}`)

  await prisma.facture.delete({
    where: {
      id: facture.id,
    },
  })

  console.log("✅ Facture supprimée avec succès.")
}

main()
  .catch((error) => {
    console.error("❌ Erreur :", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })