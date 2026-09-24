
import { NextResponse } from "next/server"
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib"
import { getFacture } from "@/actions/facture-actions"
import { getCurrentCentreContext } from "@/lib/validations/centre-access"


type RouteContext = {
  params: Promise<{
    id: string
  }>
}

/**
 * Nettoie les caractères Unicode incompatibles
 * avec les polices PDF standard de pdf-lib.
 */
function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\u202F/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u2026/g, "...")
}

/**
 * Format monétaire compatible WinAnsi.
 */
function formatMoney(
  value: unknown,
  devise = "USD"
): string {
  const amount = Number(value ?? 0)

  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(Number.isFinite(amount) ? amount : 0)
    .replace(/\u202F/g, " ")
    .replace(/\u00A0/g, " ")

  return `${formatted} ${cleanText(devise)}`
}

/**
 * Format date.
 */
function formatDate(value: unknown): string {
  if (!value) return "-"

  const date = new Date(String(value))

  if (Number.isNaN(date.getTime())) {
    return cleanText(value)
  }

  return date
    .toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\u202F/g, " ")
    .replace(/\u00A0/g, " ")
}

/**
 * Statut facture.
 */
function statutFacture(statut: string): string {
  switch (statut) {
    case "BROUILLON":
      return "Brouillon"

    case "EMISE":
      return "Emise"

    case "PARTIELLEMENT_PAYEE":
      return "Partiellement payee"

    case "PAYEE":
      return "Payee"

    case "EN_RETARD":
      return "En retard"

    case "ANNULEE":
      return "Annulee"

    default:
      return cleanText(statut)
  }
}

/**
 * Statut échéance.
 */
function statutEcheance(statut: string): string {
  switch (statut) {
    case "EN_ATTENTE":
      return "En attente"

    case "PARTIELLEMENT_PAYEE":
      return "Partiellement payee"

    case "PAYEE":
      return "Payee"

    case "EN_RETARD":
      return "En retard"

    case "ANNULEE":
      return "Annulee"

    default:
      return cleanText(statut)
  }
}

/**
 * Statut paiement.
 */
function statutPaiement(statut: string): string {
  switch (statut) {
    case "EFFECTUE":
      return "Effectue"

    case "ANNULE":
      return "Annule"

    case "EN_ATTENTE":
      return "En attente"

    default:
      return cleanText(statut)
  }
}

/**
 * Récupération sécurisée d'une propriété.
 */
function getString(
  object: Record<string, unknown> | null | undefined,
  key: string
): string {
  if (!object) return ""

  return cleanText(object[key])
}

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Identifiant de facture manquant.",
        },
        {
          status: 400,
        }
      )
    }

    // =========================================================
    // 1. CENTRE COURANT
    // =========================================================

    const centreContext = await getCurrentCentreContext()

    if (!centreContext) {
      return NextResponse.json(
        {
          success: false,
          message: "Aucun centre courant n'a ete trouve.",
        },
        {
          status: 403,
        }
      )
    }

    /**
     * Selon ton helper, le centre peut être directement
     * dans "centre" ou exposé par le contexte.
     */
    const centre =
      (centreContext as any).centre ??
      centreContext

    // =========================================================
    // 2. FACTURE
    // =========================================================

    const result = await getFacture(id)

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          message:
            result.message ||
            "Facture introuvable.",
        },
        {
          status: 404,
        }
      )
    }

    const facture = result.data as any

    // =========================================================
    // 3. DONNEES
    // =========================================================

    const convention =
      facture.convention ?? null

    const lignes = Array.isArray(
      facture.lignes
    )
      ? facture.lignes
      : []

    const echeances = Array.isArray(
      facture.echeances
    )
      ? facture.echeances
      : []

    const paiements = Array.isArray(
      facture.paiements
    )
      ? facture.paiements
      : []

    const devise = cleanText(
      convention?.devise ||
        facture.devise ||
        centre?.devise ||
        "USD"
    )

    const factureNumero = cleanText(
      facture.numero || "FACTURE"
    )

    // =========================================================
    // 4. CREATION PDF
    // =========================================================

    const pdfDoc =
      await PDFDocument.create()

    const regularFont =
      await pdfDoc.embedFont(
        StandardFonts.Helvetica
      )

    const boldFont =
      await pdfDoc.embedFont(
        StandardFonts.HelveticaBold
      )

    let page = pdfDoc.addPage([
      595.28,
      841.89,
    ])

    const pageWidth = page.getWidth()
    const pageHeight = page.getHeight()

    const marginLeft = 45
    const marginRight = 45

    let y = pageHeight - 40

    const black = rgb(
      0.08,
      0.08,
      0.08
    )

    const gray = rgb(
      0.35,
      0.35,
      0.35
    )

    const lightGray = rgb(
      0.93,
      0.93,
      0.93
    )

    const borderGray = rgb(
      0.78,
      0.78,
      0.78
    )

    // =========================================================
    // 5. FONCTIONS PDF
    // =========================================================

    function drawText(
      text: unknown,
      x: number,
      yPosition: number,
      options?: {
        size?: number
        font?: typeof regularFont
        color?: ReturnType<typeof rgb>
      }
    ) {
      page.drawText(cleanText(text), {
        x,
        y: yPosition,
        size: options?.size ?? 9,
        font:
          options?.font ??
          regularFont,
        color:
          options?.color ??
          black,
      })
    }

    function drawLine(
      x1: number,
      y1: number,
      x2: number,
      y2: number
    ) {
      page.drawLine({
        start: {
          x: x1,
          y: y1,
        },
        end: {
          x: x2,
          y: y2,
        },
        thickness: 0.7,
        color: borderGray,
      })
    }

    function ensureSpace(
      requiredHeight: number
    ) {
      if (
        y - requiredHeight <
        50
      ) {
        page = pdfDoc.addPage([
          595.28,
          841.89,
        ])

        y = pageHeight - 45
      }
    }

    function drawSectionTitle(
      title: string
    ) {
      ensureSpace(35)

      page.drawRectangle({
        x: marginLeft,
        y: y - 20,
        width:
          pageWidth -
          marginLeft -
          marginRight,
        height: 22,
        color: lightGray,
      })

      drawText(
        title,
        marginLeft + 8,
        y - 13,
        {
          size: 10,
          font: boldFont,
        }
      )

      y -= 35
    }

    // =========================================================
    // 6. EN-TETE DU CENTRE
    // =========================================================

    const centreNom = cleanText(
      centre?.nom ||
        centre?.name ||
        centreContext?.nom ||
        "Centre de formation"
    )

    const centreAdresse = cleanText(
      centre?.adresse ||
        centre?.address ||
        ""
    )

    const centreVille = cleanText(
      centre?.ville ||
        ""
    )

    const centrePays = cleanText(
      centre?.pays ||
        ""
    )

    const centreTelephone = cleanText(
      centre?.telephone ||
        ""
    )

    const centreEmail = cleanText(
      centre?.email ||
        ""
    )

    const centreSiteWeb = cleanText(
      centre?.siteWeb ||
        ""
    )

    // ---------------------------------------------------------
    // Nom du centre
    // ---------------------------------------------------------

    drawText(
      centreNom,
      marginLeft,
      y,
      {
        size: 18,
        font: boldFont,
      }
    )

    // ---------------------------------------------------------
    // Adresse
    // ---------------------------------------------------------

    y -= 20

    const adresseComplete = [
      centreAdresse,
      centreVille,
      centrePays,
    ]
      .filter(Boolean)
      .join(" - ")

    if (adresseComplete) {
      drawText(
        adresseComplete,
        marginLeft,
        y,
        {
          size: 8,
          color: gray,
        }
      )

      y -= 14
    }

    // ---------------------------------------------------------
    // Téléphone / Email
    // ---------------------------------------------------------

    const contactCentre = [
      centreTelephone
        ? `Tel: ${centreTelephone}`
        : "",
      centreEmail
        ? `Email: ${centreEmail}`
        : "",
    ]
      .filter(Boolean)
      .join("    |    ")

    if (contactCentre) {
      drawText(
        contactCentre,
        marginLeft,
        y,
        {
          size: 8,
          color: gray,
        }
      )

      y -= 14
    }

    // ---------------------------------------------------------
    // Site web
    // ---------------------------------------------------------

    if (centreSiteWeb) {
      drawText(
        centreSiteWeb,
        marginLeft,
        y,
        {
          size: 8,
          color: gray,
        }
      )

      y -= 14
    }

    y -= 8

    drawLine(
      marginLeft,
      y,
      pageWidth - marginRight,
      y
    )

    y -= 28

    // =========================================================
    // 7. TITRE FACTURE
    // =========================================================

    drawText(
      "FACTURE",
      marginLeft,
      y,
      {
        size: 20,
        font: boldFont,
      }
    )

    drawText(
      `N° ${factureNumero}`,
      pageWidth -
        marginRight -
        150,
      y + 1,
      {
        size: 11,
        font: boldFont,
      }
    )

    y -= 28

    // =========================================================
    // 8. INFORMATIONS FACTURE
    // =========================================================

    drawText(
      "Date d'emission :",
      marginLeft,
      y,
      {
        font: boldFont,
        size: 9,
      }
    )

    drawText(
      formatDate(
        facture.dateEmission
      ),
      marginLeft + 90,
      y
    )

    drawText(
      "Date d'echeance :",
      330,
      y,
      {
        font: boldFont,
        size: 9,
      }
    )

    drawText(
      formatDate(
        facture.dateEcheance
      ),
      425,
      y
    )

    y -= 18

    drawText(
      "Statut :",
      marginLeft,
      y,
      {
        font: boldFont,
        size: 9,
      }
    )

    drawText(
      statutFacture(
        cleanText(
          facture.statut
        )
      ),
      marginLeft + 90,
      y
    )

    y -= 30

    // =========================================================
    // 9. CLIENT
    // =========================================================

    drawSectionTitle(
      "CLIENT / ORGANISATION"
    )

    drawText(
      getString(
        convention,
        "organisationNom"
      ),
      marginLeft,
      y,
      {
        size: 11,
        font: boldFont,
      }
    )

    y -= 18

    if (
      convention?.organisationContact
    ) {
      drawText(
        `Contact : ${getString(
          convention,
          "organisationContact"
        )}`,
        marginLeft,
        y
      )

      y -= 16
    }

    if (
      convention?.organisationAdresse
    ) {
      drawText(
        `Adresse : ${getString(
          convention,
          "organisationAdresse"
        )}`,
        marginLeft,
        y
      )

      y -= 16
    }

    if (
      convention?.organisationTelephone
    ) {
      drawText(
        `Telephone : ${getString(
          convention,
          "organisationTelephone"
        )}`,
        marginLeft,
        y
      )

      y -= 16
    }

    if (
      convention?.organisationEmail
    ) {
      drawText(
        `Email : ${getString(
          convention,
          "organisationEmail"
        )}`,
        marginLeft,
        y
      )

      y -= 16
    }

    if (convention?.numero) {
      drawText(
        `Convention : ${getString(
          convention,
          "numero"
        )}`,
        marginLeft,
        y
      )

      y -= 16
    }

    y -= 12

    // =========================================================
    // 10. DETAILS FACTURE
    // =========================================================

    drawSectionTitle(
      "DETAILS DE LA FACTURE"
    )

    const colDescription =
      marginLeft + 5

    const colQte = 345
    const colPrix = 405
    const colTotal = 490

    page.drawRectangle({
      x: marginLeft,
      y: y - 17,
      width:
        pageWidth -
        marginLeft -
        marginRight,
      height: 20,
      color: lightGray,
    })

    drawText(
      "Description",
      colDescription,
      y - 12,
      {
        font: boldFont,
        size: 8,
      }
    )

    drawText(
      "Qte",
      colQte,
      y - 12,
      {
        font: boldFont,
        size: 8,
      }
    )

    drawText(
      "Prix",
      colPrix,
      y - 12,
      {
        font: boldFont,
        size: 8,
      }
    )

    drawText(
      "Total",
      colTotal,
      y - 12,
      {
        font: boldFont,
        size: 8,
      }
    )

    y -= 28

    if (lignes.length === 0) {
      drawText(
        "Aucune ligne de facture.",
        colDescription,
        y
      )

      y -= 20
    } else {
      for (
        const ligne of lignes
      ) {
        ensureSpace(30)

        const description =
          cleanText(
            ligne.description ||
              ligne.libelle ||
              ligne.designation ||
              ligne.nom ||
              "-"
          )

        const quantite =
          Number(
            ligne.quantite ?? 0
          )

        const prixUnitaire =
          Number(
            ligne.prixUnitaire ?? 0
          )

        const totalLigne =
          Number(
            ligne.total ??
              quantite *
                prixUnitaire
          )

        drawText(
          description.length > 50
            ? `${description.substring(
                0,
                47
              )}...`
            : description,
          colDescription,
          y,
          {
            size: 8,
          }
        )

        drawText(
          String(quantite),
          colQte,
          y,
          {
            size: 8,
          }
        )

        drawText(
          formatMoney(
            prixUnitaire,
            devise
          ),
          colPrix,
          y,
          {
            size: 8,
          }
        )

        drawText(
          formatMoney(
            totalLigne,
            devise
          ),
          colTotal,
          y,
          {
            size: 8,
          }
        )

        y -= 19

        drawLine(
          marginLeft,
          y + 5,
          pageWidth -
            marginRight,
          y + 5
        )
      }
    }

    y -= 10

    // =========================================================
    // 11. TOTAUX
    // =========================================================

    ensureSpace(120)

    const totalX = 390
    const valueX = 490

    drawText(
      "Sous-total :",
      totalX,
      y,
      {
        font: boldFont,
        size: 9,
      }
    )

    drawText(
      formatMoney(
        facture.sousTotal,
        devise
      ),
      valueX,
      y
    )

    y -= 18

    drawText(
      "Remise :",
      totalX,
      y,
      {
        font: boldFont,
        size: 9,
      }
    )

    drawText(
      formatMoney(
        facture.remise,
        devise
      ),
      valueX,
      y
    )

    y -= 18

    drawText(
      "Taxe :",
      totalX,
      y,
      {
        font: boldFont,
        size: 9,
      }
    )

    drawText(
      formatMoney(
        facture.taxe,
        devise
      ),
      valueX,
      y
    )

    y -= 22

    drawLine(
      totalX,
      y + 8,
      pageWidth - marginRight,
      y + 8
    )

    drawText(
      "TOTAL :",
      totalX,
      y - 8,
      {
        size: 12,
        font: boldFont,
      }
    )

    drawText(
      formatMoney(
        facture.total,
        devise
      ),
      valueX,
      y - 8,
      {
        size: 11,
        font: boldFont,
      }
    )

    y -= 40

    // =========================================================
    // 12. SITUATION PAIEMENTS
    // =========================================================

    drawSectionTitle(
      "SITUATION DES PAIEMENTS"
    )

    drawText(
      "Montant total :",
      marginLeft,
      y,
      {
        font: boldFont,
        size: 9,
      }
    )

    drawText(
      formatMoney(
        facture.total,
        devise
      ),
      180,
      y
    )

    drawText(
      "Montant paye :",
      310,
      y,
      {
        font: boldFont,
        size: 9,
      }
    )

    drawText(
      formatMoney(
        facture.montantPaye,
        devise
      ),
      400,
      y
    )

    y -= 20

    drawText(
      "Montant restant :",
      marginLeft,
      y,
      {
        font: boldFont,
        size: 9,
      }
    )

    drawText(
      formatMoney(
        facture.montantDu,
        devise
      ),
      180,
      y
    )

    y -= 30

    // =========================================================
    // 13. ECHEANCIER
    // =========================================================

    drawSectionTitle(
      "ECHEANCIER DE PAIEMENT"
    )

    if (echeances.length === 0) {
      drawText(
        "Aucune echeance de paiement n'est enregistree.",
        marginLeft,
        y,
        {
          size: 9,
          color: gray,
        }
      )

      y -= 25
    } else {
      const echeanceNumeroX =
        marginLeft + 5

      const echeanceDateX = 115
      const echeanceMontantX = 235
      const echeancePayeX = 350
      const echeanceDuX = 440

      page.drawRectangle({
        x: marginLeft,
        y: y - 17,
        width:
          pageWidth -
          marginLeft -
          marginRight,
        height: 20,
        color: lightGray,
      })

      drawText(
        "Echeance",
        echeanceNumeroX,
        y - 12,
        {
          font: boldFont,
          size: 8,
        }
      )

      drawText(
        "Date",
        echeanceDateX,
        y - 12,
        {
          font: boldFont,
          size: 8,
        }
      )

      drawText(
        "Montant",
        echeanceMontantX,
        y - 12,
        {
          font: boldFont,
          size: 8,
        }
      )

      drawText(
        "Paye",
        echeancePayeX,
        y - 12,
        {
          font: boldFont,
          size: 8,
        }
      )

      drawText(
        "Reste",
        echeanceDuX,
        y - 12,
        {
          font: boldFont,
          size: 8,
        }
      )

      y -= 28

      for (
        const echeance of echeances
      ) {
        ensureSpace(35)

        drawText(
          `Echeance ${cleanText(
            echeance.numero ?? ""
          )}`,
          echeanceNumeroX,
          y,
          {
            size: 8,
          }
        )

        drawText(
          formatDate(
            echeance.dateEcheance
          ),
          echeanceDateX,
          y,
          {
            size: 8,
          }
        )

        drawText(
          formatMoney(
            echeance.montant,
            devise
          ),
          echeanceMontantX,
          y,
          {
            size: 8,
          }
        )

        drawText(
          formatMoney(
            echeance.montantPaye,
            devise
          ),
          echeancePayeX,
          y,
          {
            size: 8,
          }
        )

        drawText(
          formatMoney(
            echeance.montantDu,
            devise
          ),
          echeanceDuX,
          y,
          {
            size: 8,
          }
        )

        y -= 17

        drawText(
          `Statut : ${statutEcheance(
            cleanText(
              echeance.statut
            )
          )}`,
          echeanceNumeroX,
          y,
          {
            size: 7,
            color: gray,
          }
        )

        y -= 14

        drawLine(
          marginLeft,
          y + 5,
          pageWidth -
            marginRight,
          y + 5
        )
      }
    }

    // =========================================================
    // 14. PAIEMENTS ENREGISTRES
    // =========================================================

    if (paiements.length > 0) {
      drawSectionTitle(
        "PAIEMENTS ENREGISTRES"
      )

      const paiementDateX =
        marginLeft + 5

      const paiementReferenceX = 125
      const paiementModeX = 280
      const paiementMontantX = 400

      page.drawRectangle({
        x: marginLeft,
        y: y - 17,
        width:
          pageWidth -
          marginLeft -
          marginRight,
        height: 20,
        color: lightGray,
      })

      drawText(
        "Date",
        paiementDateX,
        y - 12,
        {
          font: boldFont,
          size: 8,
        }
      )

      drawText(
        "Reference",
        paiementReferenceX,
        y - 12,
        {
          font: boldFont,
          size: 8,
        }
      )

      drawText(
        "Mode",
        paiementModeX,
        y - 12,
        {
          font: boldFont,
          size: 8,
        }
      )

      drawText(
        "Montant",
        paiementMontantX,
        y - 12,
        {
          font: boldFont,
          size: 8,
        }
      )

      y -= 28

      for (
        const paiement of paiements
      ) {
        ensureSpace(35)

        drawText(
          formatDate(
            paiement.datePaiement ||
              paiement.creeLe
          ),
          paiementDateX,
          y,
          {
            size: 8,
          }
        )

        drawText(
          cleanText(
            paiement.reference ||
              "-"
          ),
          paiementReferenceX,
          y,
          {
            size: 8,
          }
        )

        drawText(
          cleanText(
            paiement.mode ||
              "-"
          ),
          paiementModeX,
          y,
          {
            size: 8,
          }
        )

        drawText(
          formatMoney(
            paiement.montant,
            paiement.devise ||
              devise
          ),
          paiementMontantX,
          y,
          {
            size: 8,
          }
        )

        y -= 17

        drawText(
          `Statut : ${statutPaiement(
            cleanText(
              paiement.statut
            )
          )}`,
          paiementDateX,
          y,
          {
            size: 7,
            color: gray,
          }
        )

        y -= 14

        drawLine(
          marginLeft,
          y + 5,
          pageWidth -
            marginRight,
          y + 5
        )
      }
    }

    // =========================================================
    // 15. NOTES
    // =========================================================

    if (facture.notes) {
      drawSectionTitle("NOTES")

      drawText(
        cleanText(
          facture.notes
        ),
        marginLeft,
        y,
        {
          size: 9,
        }
      )

      y -= 30
    }

    // =========================================================
    // 16. PIED DE PAGE
    // =========================================================

    const pages =
      pdfDoc.getPages()

    pages.forEach(
      (currentPage, index) => {
        currentPage.drawLine({
          start: {
            x: marginLeft,
            y: 35,
          },
          end: {
            x:
              pageWidth -
              marginRight,
            y: 35,
          },
          thickness: 0.6,
          color: borderGray,
        })

        currentPage.drawText(
          cleanText(
            `Facture ${factureNumero} - Page ${
              index + 1
            }/${pages.length}`
          ),
          {
            x: marginLeft,
            y: 22,
            size: 7,
            font: regularFont,
            color: gray,
          }
        )

        currentPage.drawText(
          cleanText(
            centreNom
          ),
          {
            x:
              pageWidth -
              marginRight -
              145,
            y: 22,
            size: 7,
            font: regularFont,
            color: gray,
          }
        )
      }
    )

    // =========================================================
    // 17. GENERATION PDF
    // =========================================================

    const pdfBytes =
      await pdfDoc.save()

    return new NextResponse(
      Buffer.from(pdfBytes),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `inline; filename="facture-${factureNumero}.pdf"`,

          "Cache-Control":
            "no-store",
        },
      }
    )
  } catch (error) {
    console.error(
      "Erreur impression facture :",
      error
    )

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erreur lors de la generation du PDF.",
      },
      {
        status: 500,
      }
    )
  }
}