
import { NextResponse } from "next/server"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "—"

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatMoney(value: unknown, devise: string) {
  const amount = Number(value ?? 0)

  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace(/\u202f/g, " ")
    .replace(/\u00a0/g, " ")

  return `${formatted} ${devise}`
}

function textOrDash(value: string | null | undefined) {
  return value?.trim() || "—"
}

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params

    const convention = await prisma.convention.findUnique({
      where: {
        id,
      },
      include: {
        centre: true,
        participants: {
          include: {
            inscription: {
              include: {
                apprenant: true,
                session: {
                  include: {
                    formation: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    })

    if (!convention) {
      return NextResponse.json(
        {
          error: "Convention introuvable.",
        },
        {
          status: 404,
        }
      )
    }

    const pdfDoc = await PDFDocument.create()

    const page = pdfDoc.addPage([595.28, 841.89])

    const { width, height } = page.getSize()

    const regularFont = await pdfDoc.embedFont(
      StandardFonts.Helvetica
    )

    const boldFont = await pdfDoc.embedFont(
      StandardFonts.HelveticaBold
    )

    const margin = 45

    const dark = rgb(0.12, 0.16, 0.22)
    const gray = rgb(0.42, 0.46, 0.52)
    const lightGray = rgb(0.94, 0.95, 0.97)
    const border = rgb(0.82, 0.84, 0.87)
    const green = rgb(0.06, 0.55, 0.35)

    let y = height - 45

    // =========================================================
    // EN-TÊTE CENTRE
    // =========================================================

    page.drawText(
      convention.centre.nom,
      {
        x: margin,
        y,
        size: 18,
        font: boldFont,
        color: dark,
      }
    )

    y -= 22

    const centreInfos = [
      convention.centre.adresse,
      convention.centre.ville,
      convention.centre.telephone,
      convention.centre.email,
    ]
      .filter(Boolean)
      .join(" • ")

    if (centreInfos) {
      page.drawText(
        centreInfos,
        {
          x: margin,
          y,
          size: 8.5,
          font: regularFont,
          color: gray,
          maxWidth: width - margin * 2,
        }
      )

      y -= 18
    }

    // Ligne
    page.drawLine({
      start: {
        x: margin,
        y,
      },
      end: {
        x: width - margin,
        y,
      },
      thickness: 1,
      color: border,
    })

    y -= 35

    // =========================================================
    // TITRE
    // =========================================================

    const title = "CONVENTION DE FORMATION"

    const titleWidth = boldFont.widthOfTextAtSize(
      title,
      20
    )

    page.drawText(title, {
      x: (width - titleWidth) / 2,
      y,
      size: 20,
      font: boldFont,
      color: dark,
    })

    y -= 25

    const numeroText = `N° ${convention.numero}`

    const numeroWidth = regularFont.widthOfTextAtSize(
      numeroText,
      10
    )

    page.drawText(numeroText, {
      x: (width - numeroWidth) / 2,
      y,
      size: 10,
      font: regularFont,
      color: gray,
    })

    y -= 35

    // =========================================================
    // INFORMATIONS GENERALES
    // =========================================================

    page.drawRectangle({
      x: margin,
      y: y - 105,
      width: width - margin * 2,
      height: 105,
      color: lightGray,
    })

    let infoY = y - 22

    page.drawText("ORGANISATION", {
      x: margin + 15,
      y: infoY,
      size: 8,
      font: boldFont,
      color: gray,
    })

    infoY -= 15

    page.drawText(
      textOrDash(convention.organisationNom),
      {
        x: margin + 15,
        y: infoY,
        size: 11,
        font: boldFont,
        color: dark,
      }
    )

    infoY -= 16

    page.drawText(
      `Contact : ${textOrDash(convention.organisationContact)}`,
      {
        x: margin + 15,
        y: infoY,
        size: 8.5,
        font: regularFont,
        color: dark,
      }
    )

    infoY -= 13

    page.drawText(
      `Téléphone : ${textOrDash(convention.organisationTelephone)}`,
      {
        x: margin + 15,
        y: infoY,
        size: 8.5,
        font: regularFont,
        color: dark,
      }
    )

    infoY -= 13

    page.drawText(
      `Email : ${textOrDash(convention.organisationEmail)}`,
      {
        x: margin + 15,
        y: infoY,
        size: 8.5,
        font: regularFont,
        color: dark,
      }
    )

    const rightX = width / 2 + 10

    let rightY = y - 22

    page.drawText("PÉRIODE DE LA CONVENTION", {
      x: rightX,
      y: rightY,
      size: 8,
      font: boldFont,
      color: gray,
    })

    rightY -= 17

    page.drawText(
      `Du ${formatDate(convention.dateDebut)}`,
      {
        x: rightX,
        y: rightY,
        size: 9,
        font: regularFont,
        color: dark,
      }
    )

    rightY -= 15

    page.drawText(
      `Au ${formatDate(convention.dateFin)}`,
      {
        x: rightX,
        y: rightY,
        size: 9,
        font: regularFont,
        color: dark,
      }
    )

    rightY -= 22

    page.drawText("MONTANT", {
      x: rightX,
      y: rightY,
      size: 8,
      font: boldFont,
      color: gray,
    })

    rightY -= 16

    page.drawText(
      formatMoney(
        convention.montant,
        convention.devise
      ),
      {
        x: rightX,
        y: rightY,
        size: 12,
        font: boldFont,
        color: green,
      }
    )

    rightY -= 22

    page.drawText("STATUT", {
      x: rightX,
      y: rightY,
      size: 8,
      font: boldFont,
      color: gray,
    })

    rightY -= 15

    page.drawText(
      convention.statut.replaceAll("_", " "),
      {
        x: rightX,
        y: rightY,
        size: 9,
        font: boldFont,
        color: dark,
      }
    )

    y -= 135

    // =========================================================
    // PARTICIPANTS
    // =========================================================

    page.drawText("PARTICIPANTS", {
      x: margin,
      y,
      size: 12,
      font: boldFont,
      color: dark,
    })

    y -= 20

    const tableX = margin
    const tableWidth = width - margin * 2

    const colNumero = 35
    const colNom = 180
    const colInscription = 110
    const colFormation = tableWidth - colNumero - colNom - colInscription

    const rowHeight = 25

    // Header
    page.drawRectangle({
      x: tableX,
      y: y - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: dark,
    })

    page.drawText("N°", {
      x: tableX + 8,
      y: y - 17,
      size: 8,
      font: boldFont,
      color: rgb(1, 1, 1),
    })

    page.drawText("APPRENANT", {
      x: tableX + colNumero + 8,
      y: y - 17,
      size: 8,
      font: boldFont,
      color: rgb(1, 1, 1),
    })

    page.drawText("INSCRIPTION", {
      x:
        tableX +
        colNumero +
        colNom +
        8,
      y: y - 17,
      size: 8,
      font: boldFont,
      color: rgb(1, 1, 1),
    })

    page.drawText("FORMATION", {
      x:
        tableX +
        colNumero +
        colNom +
        colInscription +
        8,
      y: y - 17,
      size: 8,
      font: boldFont,
      color: rgb(1, 1, 1),
    })

    y -= rowHeight

    if (convention.participants.length === 0) {
      page.drawRectangle({
        x: tableX,
        y: y - rowHeight,
        width: tableWidth,
        height: rowHeight,
        borderWidth: 1,
        borderColor: border,
      })

      page.drawText(
        "Aucun participant enregistré.",
        {
          x: tableX + 8,
          y: y - 17,
          size: 8.5,
          font: regularFont,
          color: gray,
        }
      )

      y -= rowHeight
    } else {
      convention.participants.forEach(
        (participant, index) => {
          const apprenant =
            participant.inscription.apprenant

          const formation =
            participant.inscription.session
              ?.formation

          const nomComplet =
            `${apprenant.prenom} ${apprenant.nom}`

          page.drawRectangle({
            x: tableX,
            y: y - rowHeight,
            width: tableWidth,
            height: rowHeight,
            borderWidth: 0.7,
            borderColor: border,
          })

          page.drawText(
            String(index + 1),
            {
              x: tableX + 8,
              y: y - 17,
              size: 8,
              font: regularFont,
              color: dark,
            }
          )

          page.drawText(
            nomComplet,
            {
              x:
                tableX +
                colNumero +
                8,
              y: y - 17,
              size: 8,
              font: regularFont,
              color: dark,
              maxWidth: colNom - 15,
            }
          )

          page.drawText(
            participant.inscription.numero,
            {
              x:
                tableX +
                colNumero +
                colNom +
                8,
              y: y - 17,
              size: 8,
              font: regularFont,
              color: dark,
              maxWidth:
                colInscription - 15,
            }
          )

          page.drawText(
            textOrDash(formation?.nom),
            {
              x:
                tableX +
                colNumero +
                colNom +
                colInscription +
                8,
              y: y - 17,
              size: 8,
              font: regularFont,
              color: dark,
              maxWidth:
                colFormation - 15,
            }
          )

          y -= rowHeight
        }
      )
    }

    // =========================================================
    // OBSERVATIONS
    // =========================================================

    y -= 25

    page.drawText("OBSERVATIONS", {
      x: margin,
      y,
      size: 11,
      font: boldFont,
      color: dark,
    })

    y -= 18

    const observations =
      textOrDash(convention.observations)

    page.drawText(observations, {
      x: margin,
      y,
      size: 9,
      font: regularFont,
      color: dark,
      maxWidth: width - margin * 2,
      lineHeight: 13,
    })

    // =========================================================
    // SIGNATURE
    // =========================================================

    y -= 55

    page.drawText("SIGNATURES", {
      x: margin,
      y,
      size: 11,
      font: boldFont,
      color: dark,
    })

    y -= 35

    page.drawText(
      "Pour le centre de formation",
      {
        x: margin,
        y,
        size: 9,
        font: boldFont,
        color: dark,
      }
    )

    page.drawText(
      "Pour l'organisation",
      {
        x: width / 2 + 10,
        y,
        size: 9,
        font: boldFont,
        color: dark,
      }
    )

    y -= 55

    page.drawLine({
      start: {
        x: margin,
        y,
      },
      end: {
        x: width / 2 - 40,
        y,
      },
      thickness: 0.8,
      color: border,
    })

    page.drawLine({
      start: {
        x: width / 2 + 10,
        y,
      },
      end: {
        x: width - margin,
        y,
      },
      thickness: 0.8,
      color: border,
    })

    // =========================================================
    // DATE DE SIGNATURE
    // =========================================================

    if (convention.dateSignature) {
      y -= 25

      page.drawText(
        `Date de signature : ${formatDate(
          convention.dateSignature
        )}`,
        {
          x: margin,
          y,
          size: 8,
          font: regularFont,
          color: gray,
        }
      )
    }

    // =========================================================
    // PIED DE PAGE
    // =========================================================

    const footerText =
      `${convention.centre.nom} • Convention ${convention.numero}`

    const footerWidth =
      regularFont.widthOfTextAtSize(
        footerText,
        7
      )

    page.drawText(footerText, {
      x: (width - footerWidth) / 2,
      y: 22,
      size: 7,
      font: regularFont,
      color: gray,
    })

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(pdfBytes as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="convention-${convention.numero}.pdf"`,
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
      },
    })
  } catch (error) {
    console.error(
      "Erreur génération PDF convention:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Impossible de générer le PDF de la convention.",
      },
      {
        status: 500,
      }
    )
  }
}

