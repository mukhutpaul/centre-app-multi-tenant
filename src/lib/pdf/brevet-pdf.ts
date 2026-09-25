import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

type BrevetPdfData = {
  centre: {
    nom: string;
    code?: string;
  };

  apprenant: {
    nom: string;
    prenom: string;
    numero?: string | null;
    sexe?: string | null;
    dateNaissance?: Date | string | null;
    lieuNaissance?: string | null;
  };

  formation: {
    code?: string | null;
    nom: string;
  };

  session: {
    code: string;
    nom?: string | null;
    dateDebut: Date | string;
    dateFin: Date | string;
  };

  resultat: {
    moyenneGenerale: number;
    resultat: string;
    resultatLabel: string;
    mention: string;
  };

  certification: {
    id?: string;
    numero: string;
    intitule: string;
    dateObtention?: Date | string | null;
    statut?: string;
    mention?: string | null;
    observations?: string | null;
  };
};

/* ============================================================
   DIMENSIONS A4
============================================================ */

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

/* ============================================================
   HELPERS
============================================================ */

function formatDate(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateShort(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = rgb(0, 0, 0),
) {
  const width =
    font.widthOfTextAtSize(
      text,
      size,
    );

  const pageWidth =
    page.getWidth();

  page.drawText(text, {
    x:
      (pageWidth - width) / 2,
    y,
    size,
    font,
    color,
  });
}

function drawLine(
  page: PDFPage,
  y: number,
  thickness = 1,
  color = rgb(
    0.75,
    0.62,
    0.20,
  ),
) {
  page.drawLine({
    start: {
      x: 55,
      y,
    },

    end: {
      x:
        page.getWidth() - 55,
      y,
    },

    thickness,
    color,
  });
}

/* ============================================================
   GENERATION DU CERTIFICAT
============================================================ */

export async function generateBrevetPdf(
  data: BrevetPdfData,
): Promise<Uint8Array> {
  const pdf =
    await PDFDocument.create();

  /*
   * IMPORTANT :
   * pdf-lib n'accepte pas "A4" comme argument de addPage().
   * Il faut fournir [largeur, hauteur].
   */
  const page =
    pdf.addPage([
      A4_WIDTH,
      A4_HEIGHT,
    ]);

  const width =
    page.getWidth();

  const height =
    page.getHeight();

  /* ========================================================
     POLICES
  ======================================================== */

  const regular =
    await pdf.embedFont(
      StandardFonts.TimesRoman,
    );

  const bold =
    await pdf.embedFont(
      StandardFonts.TimesRomanBold,
    );

  const italic =
    await pdf.embedFont(
      StandardFonts.TimesRomanItalic,
    );

  /* ========================================================
     COULEURS
  ======================================================== */

  const green =
    rgb(
      0.08,
      0.32,
      0.20,
    );

  const gold =
    rgb(
      0.76,
      0.60,
      0.20,
    );

  const dark =
    rgb(
      0.12,
      0.12,
      0.12,
    );

  const gray =
    rgb(
      0.40,
      0.40,
      0.40,
    );

  /* ========================================================
     CADRE EXTERIEUR
  ======================================================== */

  page.drawRectangle({
    x: 25,
    y: 25,
    width:
      width - 50,
    height:
      height - 50,
    borderColor: gold,
    borderWidth: 3,
  });

  page.drawRectangle({
    x: 35,
    y: 35,
    width:
      width - 70,
    height:
      height - 70,
    borderColor: green,
    borderWidth: 1,
  });

  /* ========================================================
     EN-TETE
  ======================================================== */

  let y = height - 75;

  drawCenteredText(
    page,
    data.centre.nom.toUpperCase(),
    y,
    bold,
    19,
    green,
  );

  y -= 25;

  drawCenteredText(
    page,
    "CENTRE DE FORMATION PROFESSIONNELLE",
    y,
    bold,
    11,
    dark,
  );

  y -= 18;

  drawCenteredText(
    page,
    "ET DES MÉTIERS",
    y,
    bold,
    11,
    dark,
  );

  y -= 28;

  drawLine(
    page,
    y,
    2,
    gold,
  );

  /* ========================================================
     TITRE
  ======================================================== */

  y -= 55;

  drawCenteredText(
    page,
    "CERTIFICAT",
    y,
    bold,
    25,
    green,
  );

  y -= 30;

  drawCenteredText(
    page,
    "DE FORMATION PROFESSIONNELLE",
    y,
    bold,
    15,
    dark,
  );

  y -= 50;

  drawCenteredText(
    page,
    "Le présent certificat est décerné à",
    y,
    italic,
    12,
    gray,
  );

  /* ========================================================
     NOM APPRENANT
  ======================================================== */

  y -= 42;

  const fullName =
    `${data.apprenant.prenom} ${data.apprenant.nom}`
      .toUpperCase();

  drawCenteredText(
    page,
    fullName,
    y,
    bold,
    23,
    green,
  );

  y -= 22;

  drawCenteredText(
    page,
    "pour avoir suivi avec succès une formation en",
    y,
    regular,
    11,
    dark,
  );

  /* ========================================================
     FORMATION
  ======================================================== */

  y -= 38;

  drawCenteredText(
    page,
    data.formation.nom,
    y,
    bold,
    17,
    dark,
  );

  if (data.formation.code) {
    y -= 20;

    drawCenteredText(
      page,
      `Code formation : ${data.formation.code}`,
      y,
      regular,
      10,
      gray,
    );
  }

  /* ========================================================
     SESSION
  ======================================================== */

  y -= 42;

  const sessionText =
    data.session.nom
      ? `${data.session.nom} — ${data.session.code}`
      : data.session.code;

  drawCenteredText(
    page,
    `Session : ${sessionText}`,
    y,
    regular,
    11,
    dark,
  );

  y -= 18;

  drawCenteredText(
    page,
    `Du ${formatDateShort(
      data.session.dateDebut,
    )} au ${formatDateShort(
      data.session.dateFin,
    )}`,
    y,
    regular,
    10,
    gray,
  );

  /* ========================================================
     RESULTAT
  ======================================================== */

  y -= 50;

  page.drawRectangle({
    x: 100,
    y: y - 62,
    width:
      width - 200,
    height: 75,
    color:
      rgb(
        0.96,
        0.97,
        0.96,
      ),
    borderColor: green,
    borderWidth: 1.5,
  });

  drawCenteredText(
    page,
    `RÉSULTAT : ${data.resultat.resultatLabel}`,
    y - 18,
    bold,
    13,
    green,
  );

  drawCenteredText(
    page,
    `Moyenne générale : ${Number(
      data.resultat.moyenneGenerale,
    ).toFixed(2)} %`,
    y - 38,
    bold,
    12,
    dark,
  );

  drawCenteredText(
    page,
    `Mention : ${data.resultat.mention}`,
    y - 56,
    bold,
    11,
    gold,
  );

  /* ========================================================
     NUMERO CERTIFICAT
  ======================================================== */

  y -= 105;

  drawCenteredText(
    page,
    `N° CERTIFICAT : ${data.certification.numero}`,
    y,
    bold,
    11,
    dark,
  );

  /* ========================================================
     DATE
  ======================================================== */

  y -= 50;

  drawCenteredText(
    page,
    `Fait le ${formatDate(
      data.certification.dateObtention,
    )}`,
    y,
    regular,
    11,
    dark,
  );

  /* ========================================================
     SIGNATURES
  ======================================================== */

  const signatureY = 105;

  page.drawLine({
    start: {
      x: 95,
      y: signatureY,
    },

    end: {
      x: 215,
      y: signatureY,
    },

    thickness: 1,
    color: dark,
  });

  page.drawLine({
    start: {
      x: width - 215,
      y: signatureY,
    },

    end: {
      x: width - 95,
      y: signatureY,
    },

    thickness: 1,
    color: dark,
  });

  page.drawText(
    "Le Responsable",
    {
      x: 112,
      y: signatureY - 20,
      size: 10,
      font: bold,
      color: dark,
    },
  );

  const directeur =
    "Le Directeur";

  const directeurWidth =
    bold.widthOfTextAtSize(
      directeur,
      10,
    );

  page.drawText(
    directeur,
    {
      x:
        width -
        155 -
        directeurWidth / 2,
      y: signatureY - 20,
      size: 10,
      font: bold,
      color: dark,
    },
  );

  /* ========================================================
     FOOTER
  ======================================================== */

  drawCenteredText(
    page,
    data.centre.code
      ? `Code centre : ${data.centre.code}`
      : "Document officiel de formation",
    55,
    regular,
    8,
    gray,
  );

  /* ========================================================
     SAUVEGARDE
  ======================================================== */

  return pdf.save();
}