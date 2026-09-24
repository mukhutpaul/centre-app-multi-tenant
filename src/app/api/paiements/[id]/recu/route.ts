import { NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
  type PDFImage,
} from "pdf-lib";

import { prisma } from "@/lib/prisma";
import { getCurrentCentreContext } from "@/lib/validations/centre-access";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

/* ============================================================
   FORMAT REÇU
   52 mm × 140 mm
   Reçu thermique long et lisible
   ============================================================ */

const MM = 72 / 25.4;

const PAGE_WIDTH = 52 * MM;
const PAGE_HEIGHT = 140 * MM;

const MARGIN = 3.5 * MM;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/* ============================================================
   COULEURS
   ============================================================ */

const BLACK = rgb(0.05, 0.05, 0.06);
const DARK = rgb(0.15, 0.15, 0.17);
const GRAY = rgb(0.40, 0.40, 0.43);
const MID_GRAY = rgb(0.60, 0.60, 0.63);
const LIGHT_GRAY = rgb(0.82, 0.82, 0.84);
const VERY_LIGHT = rgb(0.965, 0.965, 0.975);
const WHITE = rgb(1, 1, 1);

const SUCCESS = rgb(0.05, 0.40, 0.20);
const WARNING = rgb(0.68, 0.40, 0.04);
const ERROR = rgb(0.67, 0.08, 0.08);

/* ============================================================
   UTILITAIRES
   ============================================================ */

function safeText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function cleanPdfText(value: unknown): string {
  return safeText(value)
    .replace(/\s+/g, " ")
    .replace(/[•●]/g, "-");
}

function truncate(
  value: string,
  maxLength: number,
): string {
  const text = cleanPdfText(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3)}...`;
}

function formatAmount(
  value: unknown,
  devise = "USD",
): string {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return `0,00 ${devise}`;
  }

  return `${amount.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${devise}`;
}

function formatDate(
  value: Date | null,
  fuseauHoraire = "Africa/Douala",
): string {
  if (!value) {
    return "Non renseignée";
  }

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: fuseauHoraire,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(value);
  } catch {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(value);
  }
}

function formatMode(mode: string): string {
  switch (mode) {
    case "ESPECES":
      return "Espèces";

    case "VIREMENT":
      return "Virement";

    case "MOBILE_MONEY":
      return "Mobile Money";

    case "CARTE":
      return "Carte";

    case "CHEQUE":
      return "Chèque";

    case "AUTRE":
      return "Autre";

    default:
      return cleanPdfText(mode).replaceAll("_", " ");
  }
}

function formatStatut(statut: string): string {
  switch (statut) {
    case "EFFECTUE":
      return "Effectué";

    case "EN_ATTENTE":
      return "En attente";

    case "ECHEC":
      return "Échec";

    case "ANNULE":
      return "Annulé";

    case "REMBOURSE":
      return "Remboursé";

    default:
      return cleanPdfText(statut).replaceAll("_", " ");
  }
}

function getStatusColor(statut: string) {
  switch (statut) {
    case "EFFECTUE":
      return SUCCESS;

    case "EN_ATTENTE":
      return WARNING;

    case "ECHEC":
    case "ANNULE":
      return ERROR;

    default:
      return DARK;
  }
}

/* ============================================================
   TYPE DE PAIEMENT
   ============================================================ */

function formatTypePaiement(type: string): string {
  switch (type) {
    case "PAIEMENT_REGULIER":
      return "Paiement régulier";

    case "REGLEMENT_FACTURE_CONVENTION":
      return "Règlement convention";

    default:
      return cleanPdfText(type).replaceAll("_", " ");
  }
}

/* ============================================================
   TEXTE CENTRÉ
   ============================================================ */

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = BLACK,
) {
  const value = cleanPdfText(text);

  const width =
    font.widthOfTextAtSize(
      value,
      size,
    );

  page.drawText(value, {
    x: (PAGE_WIDTH - width) / 2,
    y,
    size,
    font,
    color,
  });
}

/* ============================================================
   TEXTE ALIGNÉ À DROITE
   ============================================================ */

function drawRight(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color = BLACK,
) {
  const value = cleanPdfText(text);

  const width =
    font.widthOfTextAtSize(
      value,
      size,
    );

  page.drawText(value, {
    x: rightX - width,
    y,
    size,
    font,
    color,
  });
}

/* ============================================================
   LIGNE D'INFORMATION
   ============================================================ */

function drawInfoRow(
  page: PDFPage,
  label: string,
  value: string,
  y: number,
  regularFont: PDFFont,
  boldFont: PDFFont,
) {
  const labelSize = 5.2;
  const valueSize = 6.2;

  const safeValue = truncate(
    value || "—",
    28,
  );

  page.drawText(
    cleanPdfText(label).toUpperCase(),
    {
      x: MARGIN,
      y,
      size: labelSize,
      font: regularFont,
      color: GRAY,
    },
  );

  drawRight(
    page,
    safeValue,
    PAGE_WIDTH - MARGIN,
    y,
    boldFont,
    valueSize,
    BLACK,
  );
}

/* ============================================================
   LOGO
   ============================================================ */

async function loadLogo(
  pdf: PDFDocument,
  logoUrl: string,
): Promise<PDFImage | null> {
  try {
    const value = safeText(logoUrl);

    if (!value) {
      return null;
    }

    let url: URL;

    try {
      url = new URL(value);
    } catch {
      return null;
    }

    const response = await fetch(
      url.toString(),
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    const contentType =
      response.headers.get(
        "content-type",
      ) ?? "";

    const bytes =
      await response.arrayBuffer();

    const lowerUrl =
      value.toLowerCase();

    if (
      contentType.includes("png") ||
      lowerUrl.endsWith(".png")
    ) {
      return await pdf.embedPng(bytes);
    }

    if (
      contentType.includes("jpeg") ||
      contentType.includes("jpg") ||
      lowerUrl.endsWith(".jpg") ||
      lowerUrl.endsWith(".jpeg")
    ) {
      return await pdf.embedJpg(bytes);
    }

    return null;
  } catch (error) {
    console.error(
      "Impossible de charger le logo du centre :",
      error,
    );

    return null;
  }
}

/* ============================================================
   ROUTE
   ============================================================ */

export async function GET(
  _request: Request,
  { params }: RouteProps,
) {
  try {
    /* ========================================================
       PARAMÈTRE
       ======================================================== */

    const { id } = await params;

    if (!id) {
      return new NextResponse(
        "Paiement introuvable.",
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       CENTRE COURANT
       ======================================================== */

    const context =
      await getCurrentCentreContext();

    if (!context.centreId) {
      return new NextResponse(
        "Aucun centre actif n'est associé à votre compte.",
        {
          status: 403,
        },
      );
    }

    /* ========================================================
       PAIEMENT
       ======================================================== */

    const paiement =
      await prisma.paiement.findFirst({
        where: {
          id,
          centreId: context.centreId,
        },

        select: {
          id: true,
          centreId: true,

          apprenantId: true,
          inscriptionId: true,
          factureId: true,
          echeanceId: true,

          devise: true,

          type: true,
          reference: true,
          montant: true,
          mode: true,
          statut: true,

          datePaiement: true,
          referenceTransaction: true,
          notes: true,

          apprenant: {
            select: {
              id: true,
              prenom: true,
              nom: true,
            },
          },

          inscription: {
            select: {
              id: true,
              numero: true,
              montantConvenu: true,
              statut: true,

              apprenant: {
                select: {
                  id: true,
                  prenom: true,
                  nom: true,
                },
              },

              session: {
                select: {
                  id: true,
                  nom: true,
                  code: true,

                  formation: {
                    select: {
                      id: true,
                      code: true,
                      nom: true,
                    },
                  },
                },
              },
            },
          },

          tarifFormation: {
            select: {
              id: true,
              nom: true,
              description: true,
              montant: true,
              devise: true,
              actif: true,
            },
          },

          facture: {
            select: {
              id: true,
              numero: true,
              total: true,
              montantPaye: true,
              montantDu: true,

              convention: {
                select: {
                  id: true,
                  numero: true,
                  organisationNom: true,
                  montant: true,
                  devise: true,
                },
              },
            },
          },

          echeance: {
            select: {
              id: true,
              numero: true,
              montant: true,
              montantPaye: true,
              montantDu: true,
              statut: true,
            },
          },
        },
      });

    if (!paiement) {
      return new NextResponse(
        "Paiement introuvable.",
        {
          status: 404,
        },
      );
    }

    /* ========================================================
       CENTRE
       ======================================================== */

    const centre =
      await prisma.centreFormation.findUnique({
        where: {
          id: context.centreId,
        },

        select: {
          id: true,
          nom: true,

          email: true,
          telephone: true,

          adresse: true,
          ville: true,
          pays: true,
          codePostal: true,

          logoUrl: true,

          devise: true,
          fuseauHoraire: true,
        },
      });

    if (!centre) {
      return new NextResponse(
        "Centre introuvable.",
        {
          status: 404,
        },
      );
    }

    /* ========================================================
       DONNÉES
       ======================================================== */

    const apprenant =
      paiement.apprenant ??
      paiement.inscription?.apprenant ??
      null;

    const nomApprenant =
      apprenant
        ? `${safeText(apprenant.prenom)} ${safeText(
            apprenant.nom,
          )}`.trim()
        : "Apprenant non renseigné";

    const session =
      paiement.inscription?.session;

    const formation =
      session?.formation;

    const nomFormation =
      formation?.nom ||
      session?.nom ||
      "Formation non renseignée";

    const typePaiement =
      safeText(paiement.type);

    const estPaiementRegulier =
      typePaiement ===
      "PAIEMENT_REGULIER";

    const estConvention =
      typePaiement ===
      "REGLEMENT_FACTURE_CONVENTION";

    const nomFrais =
      paiement.tarifFormation?.nom ||
      "";

    const convention =
      paiement.facture?.convention ??
      null;

    const numeroConvention =
      convention?.numero || "";

    const organisationConvention =
      convention?.organisationNom || "";

    const reference =
      safeText(paiement.reference) ||
      paiement.id;

    const devise =
      safeText(paiement.devise) ||
      safeText(
        paiement.tarifFormation?.devise,
      ) ||
      safeText(convention?.devise) ||
      safeText(centre.devise) ||
      "USD";

    const statut =
      safeText(paiement.statut);

    /* ========================================================
       PDF
       ======================================================== */

    const pdf =
      await PDFDocument.create();

    pdf.setTitle(
      `Reçu de paiement - ${reference}`,
    );

    pdf.setSubject(
      `Reçu de paiement - ${safeText(
        centre.nom,
      )}`,
    );

    pdf.setAuthor(
      safeText(centre.nom) ||
        "Centre de formation",
    );

    pdf.setCreator(
      "Centre Formation",
    );

    const page =
      pdf.addPage([
        PAGE_WIDTH,
        PAGE_HEIGHT,
      ]);

    const regularFont =
      await pdf.embedFont(
        StandardFonts.Helvetica,
      );

    const boldFont =
      await pdf.embedFont(
        StandardFonts.HelveticaBold,
      );

    let y =
      PAGE_HEIGHT - MARGIN;

    /* ========================================================
       LOGO
       ======================================================== */

    const logo =
      centre.logoUrl
        ? await loadLogo(
            pdf,
            centre.logoUrl,
          )
        : null;

    if (logo) {
      const maxWidth = 12 * MM;
      const maxHeight = 11 * MM;

      const scale =
        Math.min(
          maxWidth / logo.width,
          maxHeight / logo.height,
        );

      const logoWidth =
        logo.width * scale;

      const logoHeight =
        logo.height * scale;

      page.drawImage(
        logo,
        {
          x:
            (PAGE_WIDTH -
              logoWidth) /
            2,

          y:
            y -
            logoHeight,

          width:
            logoWidth,

          height:
            logoHeight,
        },
      );

      y -=
        logoHeight +
        2.5 * MM;
    }

    /* ========================================================
       CENTRE
       ======================================================== */

    drawCentered(
      page,
      truncate(
        centre.nom ||
          "CENTRE DE FORMATION",
        32,
      ),
      y,
      boldFont,
      10.5,
      BLACK,
    );

    y -= 4 * MM;

    /* ========================================================
       CONTACT
       ======================================================== */

    const contact =
      [
        centre.telephone,
        centre.email,
      ]
        .filter(Boolean)
        .map(cleanPdfText)
        .join(" - ");

    if (contact) {
      drawCentered(
        page,
        truncate(contact, 44),
        y,
        regularFont,
        5.1,
        GRAY,
      );

      y -= 3 * MM;
    }

    /* ========================================================
       ADRESSE
       ======================================================== */

    const address =
      [
        centre.adresse,
        centre.ville,
        centre.pays,
      ]
        .filter(Boolean)
        .map(cleanPdfText)
        .join(", ");

    if (address) {
      drawCentered(
        page,
        truncate(address, 46),
        y,
        regularFont,
        4.8,
        MID_GRAY,
      );

      y -= 3 * MM;
    }

    /* ========================================================
       LIGNE
       ======================================================== */

    page.drawLine({
      start: {
        x: MARGIN,
        y,
      },

      end: {
        x:
          PAGE_WIDTH - MARGIN,
        y,
      },

      thickness: 0.8,
      color: BLACK,
    });

    y -= 5 * MM;

    /* ========================================================
       TITRE
       ======================================================== */

    drawCentered(
      page,
      "REÇU DE PAIEMENT",
      y,
      boldFont,
      9.5,
      BLACK,
    );

    y -= 4 * MM;

    /* ========================================================
       RÉFÉRENCE
       ======================================================== */

    drawCentered(
      page,
      `REF. ${truncate(reference, 24)}`,
      y,
      boldFont,
      6.2,
      DARK,
    );

    y -= 6 * MM;

    /* ========================================================
       APPRENANT
       ======================================================== */

    const learnerHeight =
      13 * MM;

    page.drawRectangle({
      x: MARGIN,
      y:
        y -
        learnerHeight,
      width: CONTENT_WIDTH,
      height: learnerHeight,
      color: VERY_LIGHT,
      borderColor: LIGHT_GRAY,
      borderWidth: 0.7,
    });

    page.drawText(
      "APPRENANT",
      {
        x:
          MARGIN +
          2.5 * MM,

        y:
          y -
          3.8 * MM,

        size: 5,

        font:
          boldFont,

        color:
          GRAY,
      },
    );

    page.drawText(
      truncate(
        nomApprenant,
        32,
      ),
      {
        x:
          MARGIN +
          2.5 * MM,

        y:
          y -
          8.8 * MM,

        size: 8,

        font:
          boldFont,

        color:
          BLACK,
      },
    );

    y -=
      learnerHeight +
      5 * MM;

    /* ========================================================
       TYPE
       ======================================================== */

    drawInfoRow(
      page,
      "Type",
      formatTypePaiement(
        typePaiement,
      ),
      y,
      regularFont,
      boldFont,
    );

    y -= 4.5 * MM;

    /* ========================================================
       PAIEMENT RÉGULIER
       ======================================================== */

    if (estPaiementRegulier) {
      drawInfoRow(
        page,
        "Frais",
        nomFrais || "—",
        y,
        regularFont,
        boldFont,
      );

      y -= 4.5 * MM;

      drawInfoRow(
        page,
        "Inscription",
        paiement.inscription?.numero ||
          "—",
        y,
        regularFont,
        boldFont,
      );

      y -= 4.5 * MM;

      drawInfoRow(
        page,
        "Formation",
        nomFormation,
        y,
        regularFont,
        boldFont,
      );

      y -= 4.5 * MM;

      if (session?.code) {
        drawInfoRow(
          page,
          "Session",
          session.code,
          y,
          regularFont,
          boldFont,
        );

        y -= 4.5 * MM;
      }
    }

    /* ========================================================
       CONVENTION
       ======================================================== */

    if (estConvention) {
      drawInfoRow(
        page,
        "Convention",
        numeroConvention ||
          "—",
        y,
        regularFont,
        boldFont,
      );

      y -= 4.5 * MM;

      drawInfoRow(
        page,
        "Organisation",
        organisationConvention ||
          "—",
        y,
        regularFont,
        boldFont,
      );

      y -= 4.5 * MM;

      drawInfoRow(
        page,
        "Facture",
        paiement.facture
          ?.numero || "—",
        y,
        regularFont,
        boldFont,
      );

      y -= 4.5 * MM;

      if (paiement.echeance?.numero) {
        drawInfoRow(
          page,
          "Échéance",
          paiement.echeance.numero,
          y,
          regularFont,
          boldFont,
        );

        y -= 4.5 * MM;
      }
    }

    /* ========================================================
       MODE
       ======================================================== */

    drawInfoRow(
      page,
      "Mode",
      formatMode(
        safeText(
          paiement.mode,
        ),
      ),
      y,
      regularFont,
      boldFont,
    );

    y -= 4.5 * MM;

    /* ========================================================
       DATE
       ======================================================== */

    drawInfoRow(
      page,
      "Date",
      formatDate(
        paiement.datePaiement,
        centre.fuseauHoraire,
      ),
      y,
      regularFont,
      boldFont,
    );

    /* ========================================================
       TRANSACTION
       ======================================================== */

    if (
      paiement.referenceTransaction
    ) {
      y -= 4.5 * MM;

      drawInfoRow(
        page,
        "Transaction",
        paiement.referenceTransaction,
        y,
        regularFont,
        boldFont,
      );
    }

    /* ========================================================
       NOTES
       ======================================================== */

    if (paiement.notes) {
      y -= 4.5 * MM;

      drawInfoRow(
        page,
        "Note",
        paiement.notes,
        y,
        regularFont,
        boldFont,
      );
    }

    y -= 6 * MM;

    /* ========================================================
       MONTANT
       ======================================================== */

    const amountHeight =
      20 * MM;

    page.drawRectangle({
      x: MARGIN,

      y:
        y -
        amountHeight,

      width:
        CONTENT_WIDTH,

      height:
        amountHeight,

      color:
        VERY_LIGHT,

      borderColor:
        BLACK,

      borderWidth:
        1,
    });

    drawCentered(
      page,
      "MONTANT PAYÉ",
      y -
        5 * MM,
      regularFont,
      5.8,
      GRAY,
    );

    drawCentered(
      page,
      formatAmount(
        paiement.montant,
        devise,
      ),
      y -
        13 * MM,
      boldFont,
      14.5,
      BLACK,
    );

    y -=
      amountHeight +
      6 * MM;

    /* ========================================================
       STATUT
       ======================================================== */

    const statusText =
      formatStatut(statut);

    const statusColor =
      getStatusColor(statut);

    const statusFontSize =
      6;

    const statusWidth =
      boldFont.widthOfTextAtSize(
        statusText.toUpperCase(),
        statusFontSize,
      ) +
      9 * MM;

    const statusHeight =
      6.5 * MM;

    page.drawRectangle({
      x:
        (PAGE_WIDTH -
          statusWidth) /
        2,

      y:
        y -
        statusHeight,

      width:
        statusWidth,

      height:
        statusHeight,

      color:
        statusColor,
    });

    drawCentered(
      page,
      statusText.toUpperCase(),
      y -
        4.3 * MM,
      boldFont,
      statusFontSize,
      WHITE,
    );

    y -=
      statusHeight +
      7 * MM;

    /* ========================================================
       PIED DE PAGE
       ======================================================== */

    page.drawLine({
      start: {
        x: MARGIN,
        y,
      },

      end: {
        x:
          PAGE_WIDTH - MARGIN,
        y,
      },

      thickness: 0.5,

      color:
        LIGHT_GRAY,
    });

    y -= 4 * MM;

    drawCentered(
      page,
      "Merci pour votre paiement.",
      y,
      boldFont,
      5.2,
      DARK,
    );

    y -= 3.5 * MM;

    drawCentered(
      page,
      "Reçu officiel",
      y,
      regularFont,
      4,
      GRAY,
    );

    /* ========================================================
       GÉNÉRATION PDF
       ======================================================== */

    const pdfBytes =
      await pdf.save({
        useObjectStreams: true,
      });

    const safeReference =
      reference
        .replace(
          /[^a-zA-Z0-9_-]/g,
          "-",
        )
        .substring(
          0,
          60,
        );

    return new NextResponse(
      Buffer.from(pdfBytes),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `inline; filename="recu-${safeReference}.pdf"`,

          "Cache-Control":
            "private, no-store, max-age=0",

          "X-Content-Type-Options":
            "nosniff",
        },
      },
    );
  } catch (error) {
    console.error(
      "ERREUR GENERATION RECU PDF A8 :",
      error,
    );

    return new NextResponse(
      "Impossible de générer le reçu PDF.",
      {
        status: 500,
      },
    );
  }
}