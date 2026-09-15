import { NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";
import QRCode from "qrcode";

import { prisma } from "@/lib/prisma";
import { getCurrentCentreContext } from "@/lib/validations/centre-access";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const MM_TO_PT = 72 / 25.4;

const PAGE_WIDTH = 52 * MM_TO_PT;
const PAGE_HEIGHT = 74 * MM_TO_PT;

export async function GET(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Identifiant de l'inscription manquant.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * =========================================================
     * CENTRE COURANT
     * =========================================================
     */

    const context =
      await getCurrentCentreContext();

    if (!context.centreId) {
      return NextResponse.json(
        {
          error:
            "Aucun centre actif n'est associé à votre compte.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * =========================================================
     * RÉCUPÉRATION INSCRIPTION + CENTRE
     * =========================================================
     */

    const inscription =
      await prisma.inscription.findFirst({
        where: {
          id,

          session: {
            centreId: context.centreId,
          },
        },

        include: {
          apprenant: true,

          session: {
            include: {
              formation: true,

              centre: true,
            },
          },
        },
      });

    if (!inscription) {
      return NextResponse.json(
        {
          error:
            "Inscription introuvable dans votre centre.",
        },
        {
          status: 404,
        },
      );
    }

    const centre =
      inscription.session.centre;

    const apprenant =
      inscription.apprenant;

    const session =
      inscription.session;

    const formation =
      session.formation;

    /*
     * =========================================================
     * INFORMATIONS
     * =========================================================
     */

    const nomCentre =
      centre?.nom ||
      "Centre de formation";

    const nomComplet = [
      apprenant?.prenom,
      apprenant?.nom,
    ]
      .filter(Boolean)
      .join(" ");

    const numeroInscription =
      inscription.numero || "—";

    const nomFormation =
      formation?.nom || "—";

    const codeFormation =
      formation?.code || "";

    const nomSession =
      session?.nom ||
      session?.code ||
      "—";

    /*
     * =========================================================
     * PDF
     * =========================================================
     */

    const pdfDoc =
      await PDFDocument.create();

    const page =
      pdfDoc.addPage([
        PAGE_WIDTH,
        PAGE_HEIGHT,
      ]);

    const regularFont =
      await pdfDoc.embedFont(
        StandardFonts.Helvetica,
      );

    const boldFont =
      await pdfDoc.embedFont(
        StandardFonts.HelveticaBold,
      );

    /*
     * =========================================================
     * COULEURS
     * =========================================================
     */

    const black = rgb(
      0.08,
      0.08,
      0.08,
    );

    const darkGray = rgb(
      0.25,
      0.25,
      0.25,
    );

    const gray = rgb(
      0.45,
      0.45,
      0.45,
    );

    const lightGray = rgb(
      0.9,
      0.9,
      0.9,
    );

    const white = rgb(
      1,
      1,
      1,
    );

    /*
     * =========================================================
     * FOND
     * =========================================================
     */

    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: white,
    });

    /*
     * =========================================================
     * FONCTION TEXTE CENTRÉ
     * =========================================================
     */

    function drawCenteredText(
      text: string,
      y: number,
      size: number,
      font = regularFont,
      color = black,
    ) {
      const safeText =
        text || "—";

      const width =
        font.widthOfTextAtSize(
          safeText,
          size,
        );

      page.drawText(
        safeText,
        {
          x:
            (PAGE_WIDTH -
              width) /
            2,

          y,

          size,

          font,

          color,
        },
      );
    }

    /*
     * =========================================================
     * FONCTION TEXTE AVEC LARGEUR MAXIMALE
     * =========================================================
     */

    function drawCenteredFitText(
      text: string,
      y: number,
      maxWidth: number,
      initialSize: number,
      minSize = 4,
      font = regularFont,
      color = black,
    ) {
      let size = initialSize;

      const safeText =
        text || "—";

      while (
        size > minSize &&
        font.widthOfTextAtSize(
          safeText,
          size,
        ) > maxWidth
      ) {
        size -= 0.5;
      }

      const width =
        font.widthOfTextAtSize(
          safeText,
          size,
        );

      page.drawText(
        safeText,
        {
          x:
            (PAGE_WIDTH -
              width) /
            2,

          y,

          size,

          font,

          color,
        },
      );
    }

    /*
     * =========================================================
     * EN-TÊTE CENTRE
     * =========================================================
     */

    const headerHeight =
      14 * MM_TO_PT;

    const headerY =
      PAGE_HEIGHT -
      headerHeight;

    page.drawRectangle({
      x: 0,
      y: headerY,
      width: PAGE_WIDTH,
      height: headerHeight,
      color: black,
    });

    /*
     * NOM DU CENTRE
     *
     * On adapte automatiquement la taille
     * pour éviter que le nom soit coupé.
     */

    drawCenteredFitText(
        
      nomCentre.toUpperCase(),
      PAGE_HEIGHT -
        6.2 * MM_TO_PT,
      PAGE_WIDTH -
        6 * MM_TO_PT,
      8,
      4.5,
      boldFont,
      white,
    );

    drawCenteredText(
      "BADGE APPRENANT",
      PAGE_HEIGHT -
        11.2 * MM_TO_PT,
      6,
      boldFont,
      rgb(
        0.78,
        0.78,
        0.78,
      ),
    );

    /*
     * =========================================================
     * NOM APPRENANT
     * =========================================================
     */

    drawCenteredFitText(
      nomComplet.toUpperCase() ||
        "APPRENANT",
      PAGE_HEIGHT -
        18.5 * MM_TO_PT,
      PAGE_WIDTH -
        5 * MM_TO_PT,
      8,
      5,
      boldFont,
      black,
    );

    drawCenteredText(
      numeroInscription,
      PAGE_HEIGHT -
        22 * MM_TO_PT,
      5.2,
      regularFont,
      gray,
    );

    /*
     * =========================================================
     * FORMATION
     * =========================================================
     */

    drawCenteredFitText(
      nomFormation,
      PAGE_HEIGHT -
        26.5 * MM_TO_PT,
      PAGE_WIDTH -
        6 * MM_TO_PT,
      6,
      4,
      boldFont,
      darkGray,
    );

    if (codeFormation) {
      drawCenteredText(
        codeFormation,
        PAGE_HEIGHT -
          29.5 * MM_TO_PT,
        4.5,
        regularFont,
        gray,
      );
    }

    /*
     * =========================================================
     * TEXTE QR
     * =========================================================
     */

    drawCenteredText(
      "SCANNEZ POUR LA PRÉSENCE",
      PAGE_HEIGHT -
        34 * MM_TO_PT,
      5.2,
      boldFont,
      black,
    );

    /*
     * =========================================================
     * QR CODE
     * =========================================================
     */

    const qrValue =
      `CF-INS:${inscription.id}`;

    const qrDataUrl =
      await QRCode.toDataURL(
        qrValue,
        {
          errorCorrectionLevel:
            "H",

          margin: 1,

          width: 800,

          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        },
      );

    const base64 =
      qrDataUrl.split(",")[1];

    const qrBytes =
      Buffer.from(
        base64,
        "base64",
      );

    const qrImage =
      await pdfDoc.embedPng(
        qrBytes,
      );

    /*
     * QR de 31 mm.
     *
     * Il reste suffisamment d'espace
     * autour pour assurer la lisibilité.
     */

    const qrSize =
      31 * MM_TO_PT;

    const qrX =
      (PAGE_WIDTH -
        qrSize) /
      2;

    const qrY =
      13.5 * MM_TO_PT;

    page.drawImage(
      qrImage,
      {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
      },
    );

    /*
     * =========================================================
     * SESSION
     * =========================================================
     */

    drawCenteredFitText(
      `SESSION : ${nomSession}`,
      9.5 * MM_TO_PT,
      PAGE_WIDTH -
        6 * MM_TO_PT,
      5.5,
      4,
      boldFont,
      darkGray,
    );

    /*
     * =========================================================
     * NUMÉRO SOUS QR
     * =========================================================
     */

    drawCenteredText(
      numeroInscription,
      6 * MM_TO_PT,
      4.5,
      boldFont,
      gray,
    );

    /*
     * =========================================================
     * LIGNE BASSE
     * =========================================================
     */

    page.drawLine({
      start: {
        x: 4 * MM_TO_PT,
        y: 4 * MM_TO_PT,
      },

      end: {
        x:
          PAGE_WIDTH -
          4 * MM_TO_PT,

        y: 4 * MM_TO_PT,
      },

      thickness: 0.5,

      color: lightGray,
    });

    /*
     * =========================================================
     * PDF
     * =========================================================
     */

    const pdfBytes =
      await pdfDoc.save();

    return new NextResponse(
      Buffer.from(pdfBytes),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `inline; filename="badge-${numeroInscription}.pdf"`,

          "Content-Length":
            String(
              pdfBytes.length,
            ),

          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Erreur génération badge A8 :",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Impossible de générer le badge PDF.",
      },
      {
        status: 500,
      },
    );
  }
}