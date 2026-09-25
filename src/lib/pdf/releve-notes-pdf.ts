import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

type ModulePdf = {
  id: string;
  code: string;
  nom: string;
  position: number;
  note: number;
  noteMaximale: number;
  pourcentage: number;
  statut: string;
  resultat: string;
  commentaire?: string | null;
};

type ReleveNotesPdfData = {
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
    tauxPresence?: number | null;

    nombreModules: number;
    modulesReussis: number;
    modulesEchoues: number;

    resultat: string;
    resultatLabel: string;
    mention: string;

    commentaire?: string | null;
  };

  modules: ModulePdf[];
};

/* ============================================================
   DIMENSIONS A4
============================================================ */

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

/* ============================================================
   HELPERS
============================================================ */

function toNumber(
  value: unknown,
  fallback = 0,
): number {
  const number =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function formatDate(
  value?: Date | string | null,
) {
  if (!value) return "";

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = rgb(0, 0, 0),
) {
  const textWidth =
    font.widthOfTextAtSize(
      text,
      size,
    );

  page.drawText(text, {
    x:
      (page.getWidth() -
        textWidth) /
      2,
    y,
    size,
    font,
    color,
  });
}

function drawCellText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  size: number,
  align:
    | "left"
    | "center"
    | "right" = "left",
  color = rgb(0, 0, 0),
) {
  const textWidth =
    font.widthOfTextAtSize(
      text,
      size,
    );

  let textX = x + 5;

  if (align === "center") {
    textX =
      x +
      (width - textWidth) /
        2;
  }

  if (align === "right") {
    textX =
      x +
      width -
      textWidth -
      5;
  }

  page.drawText(text, {
    x: textX,
    y,
    size,
    font,
    color,
  });
}

/* ============================================================
   GENERATION DU RELEVE
============================================================ */

export async function generateReleveNotesPdf(
  data: ReleveNotesPdfData,
): Promise<Uint8Array> {
  const pdf =
    await PDFDocument.create();

  /* ========================================================
     POLICES
  ======================================================== */

  const regular =
    await pdf.embedFont(
      StandardFonts.Helvetica,
    );

  const bold =
    await pdf.embedFont(
      StandardFonts.HelveticaBold,
    );

  /* ========================================================
     PAGE A4
     
     IMPORTANT :
     pdf-lib n'accepte pas "A4" comme
     argument de addPage().
  ======================================================== */

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

  const lightGreen =
    rgb(
      0.94,
      0.97,
      0.95,
    );

  const gray =
    rgb(
      0.40,
      0.40,
      0.40,
    );

  const border =
    rgb(
      0.78,
      0.78,
      0.78,
    );

  const dark =
    rgb(
      0.15,
      0.15,
      0.15,
    );

  const red =
    rgb(
      0.65,
      0.15,
      0.15,
    );

  /* ========================================================
     HEADER
  ======================================================== */

  let y =
    height - 50;

  drawCenteredText(
    page,
    data.centre.nom.toUpperCase(),
    y,
    bold,
    16,
    green,
  );

  y -= 20;

  drawCenteredText(
    page,
    "CENTRE DE FORMATION PROFESSIONNELLE ET DES MÉTIERS",
    y,
    bold,
    9,
    dark,
  );

  y -= 18;

  page.drawLine({
    start: {
      x: 45,
      y,
    },

    end: {
      x:
        width - 45,
      y,
    },

    thickness: 2,
    color: gold,
  });

  /* ========================================================
     TITRE
  ======================================================== */

  y -= 38;

  drawCenteredText(
    page,
    "RELEVÉ DE NOTES",
    y,
    bold,
    19,
    green,
  );

  y -= 32;

  drawCenteredText(
    page,
    "Document officiel de formation",
    y,
    regular,
    9,
    gray,
  );

  /* ========================================================
     INFORMATIONS APPRENANT
  ======================================================== */

  y -= 40;

  const infoX = 45;

  const infoWidth =
    width - 90;

  const infoHeight = 78;

  page.drawRectangle({
    x: infoX,
    y:
      y -
      infoHeight,
    width: infoWidth,
    height: infoHeight,
    color: rgb(
      0.98,
      0.98,
      0.98,
    ),
    borderColor: border,
    borderWidth: 1,
  });

  const fullName =
    `${data.apprenant.prenom} ${data.apprenant.nom}`;

  page.drawText(
    `Apprenant : ${fullName}`,
    {
      x: infoX + 12,
      y: y - 20,
      size: 10,
      font: bold,
      color: dark,
    },
  );

  page.drawText(
    `Matricule : ${
      data.apprenant.numero ||
      "N/A"
    }`,
    {
      x: infoX + 12,
      y: y - 40,
      size: 9,
      font: regular,
      color: dark,
    },
  );

  page.drawText(
    `Formation : ${data.formation.nom}`,
    {
      x:
        infoX +
        infoWidth / 2,
      y: y - 20,
      size: 10,
      font: bold,
      color: dark,
    },
  );

  page.drawText(
    `Code : ${
      data.formation.code ||
      "N/A"
    }`,
    {
      x:
        infoX +
        infoWidth / 2,
      y: y - 40,
      size: 9,
      font: regular,
      color: dark,
    },
  );

  page.drawText(
    `Session : ${
      data.session.nom ||
      data.session.code
    }`,
    {
      x: infoX + 12,
      y: y - 60,
      size: 9,
      font: regular,
      color: dark,
    },
  );

  page.drawText(
    `Période : ${formatDate(
      data.session.dateDebut,
    )} - ${formatDate(
      data.session.dateFin,
    )}`,
    {
      x:
        infoX +
        infoWidth / 2,
      y: y - 60,
      size: 9,
      font: regular,
      color: dark,
    },
  );

  y -=
    infoHeight +
    25;

  /* ========================================================
     TABLEAU DES NOTES
  ======================================================== */

  const tableX = 45;

  const tableWidth =
    width - 90;

  const colModule = 180;

  const colNote = 75;

  const colMax = 75;

  const colPercent =
    tableWidth -
    colModule -
    colNote -
    colMax;

  const headerHeight = 28;

  page.drawRectangle({
    x: tableX,
    y:
      y -
      headerHeight,
    width: tableWidth,
    height: headerHeight,
    color: green,
  });

  let x = tableX;

  drawCellText(
    page,
    "Module",
    x,
    y - 18,
    colModule,
    bold,
    9,
    "left",
    rgb(1, 1, 1),
  );

  x += colModule;

  drawCellText(
    page,
    "Note",
    x,
    y - 18,
    colNote,
    bold,
    9,
    "center",
    rgb(1, 1, 1),
  );

  x += colNote;

  drawCellText(
    page,
    "Maximum",
    x,
    y - 18,
    colMax,
    bold,
    9,
    "center",
    rgb(1, 1, 1),
  );

  x += colMax;

  drawCellText(
    page,
    "%",
    x,
    y - 18,
    colPercent,
    bold,
    9,
    "center",
    rgb(1, 1, 1),
  );

  y -= headerHeight;

  const rowHeight = 27;

  /*
   * Protection contre un tableau modules
   * absent ou invalide.
   */
  const modules =
    Array.isArray(data.modules)
      ? data.modules
      : [];

  modules.forEach(
    (module, index) => {
      const background =
        index % 2 === 0
          ? rgb(
              1,
              1,
              1,
            )
          : rgb(
              0.97,
              0.97,
              0.97,
            );

      page.drawRectangle({
        x: tableX,
        y:
          y -
          rowHeight,
        width: tableWidth,
        height: rowHeight,
        color: background,
        borderColor: border,
        borderWidth: 0.5,
      });

      let currentX =
        tableX;

      const moduleName =
        module.code
          ? `${module.code} — ${module.nom}`
          : module.nom;

      drawCellText(
        page,
        moduleName,
        currentX,
        y - 18,
        colModule,
        regular,
        8,
        "left",
      );

      currentX += colModule;

      const note =
        toNumber(module.note);

      drawCellText(
        page,
        note.toFixed(2),
        currentX,
        y - 18,
        colNote,
        regular,
        8,
        "center",
      );

      currentX += colNote;

      const noteMaximale =
        toNumber(
          module.noteMaximale,
        );

      drawCellText(
        page,
        noteMaximale.toFixed(2),
        currentX,
        y - 18,
        colMax,
        regular,
        8,
        "center",
      );

      currentX += colMax;

      const pourcentage =
        toNumber(
          module.pourcentage,
        );

      drawCellText(
        page,
        `${pourcentage.toFixed(
          2,
        )} %`,
        currentX,
        y - 18,
        colPercent,
        bold,
        8,
        "center",
        pourcentage >= 50
          ? green
          : red,
      );

      y -= rowHeight;
    },
  );

  /* ========================================================
     RESULTAT GLOBAL
  ======================================================== */

  y -= 28;

  const resultHeight =
    100;

  page.drawRectangle({
    x: 45,
    y:
      y -
      resultHeight,
    width:
      width - 90,
    height: resultHeight,
    color: lightGreen,
    borderColor: green,
    borderWidth: 1.2,
  });

  const moyenneGenerale =
    toNumber(
      data.resultat
        .moyenneGenerale,
    );

  page.drawText(
    "RÉSULTAT GLOBAL",
    {
      x: 58,
      y: y - 22,
      size: 11,
      font: bold,
      color: green,
    },
  );

  page.drawText(
    `Moyenne générale : ${moyenneGenerale.toFixed(
      2,
    )} %`,
    {
      x: 58,
      y: y - 45,
      size: 11,
      font: bold,
      color: dark,
    },
  );

  page.drawText(
    `Résultat : ${
      data.resultat.resultatLabel
    }`,
    {
      x:
        width / 2,
      y: y - 45,
      size: 10,
      font: bold,
      color: dark,
    },
  );

  page.drawText(
    `Mention : ${
      data.resultat.mention
    }`,
    {
      x: 58,
      y: y - 68,
      size: 10,
      font: bold,
      color: dark,
    },
  );

  if (
    data.resultat.tauxPresence !==
      null &&
    data.resultat.tauxPresence !==
      undefined
  ) {
    const tauxPresence =
      toNumber(
        data.resultat
          .tauxPresence,
      );

    page.drawText(
      `Taux de présence : ${tauxPresence.toFixed(
        2,
      )} %`,
      {
        x:
          width / 2,
        y: y - 68,
        size: 10,
        font: regular,
        color: dark,
      },
    );
  }

  y -=
    resultHeight +
    20;

  /* ========================================================
     STATISTIQUES MODULES
  ======================================================== */

  const nombreModules =
    toNumber(
      data.resultat
        .nombreModules,
    );

  const modulesReussis =
    toNumber(
      data.resultat
        .modulesReussis,
    );

  const modulesEchoues =
    toNumber(
      data.resultat
        .modulesEchoues,
    );

  page.drawText(
    `Modules : ${nombreModules}`,
    {
      x: 50,
      y,
      size: 9,
      font: regular,
      color: gray,
    },
  );

  page.drawText(
    `Réussis : ${modulesReussis}`,
    {
      x: 190,
      y,
      size: 9,
      font: regular,
      color: green,
    },
  );

  page.drawText(
    `Échoués : ${modulesEchoues}`,
    {
      x: 300,
      y,
      size: 9,
      font: regular,
      color:
        modulesEchoues > 0
          ? red
          : gray,
    },
  );

  /* ========================================================
     COMMENTAIRE
  ======================================================== */

  if (
    data.resultat
      .commentaire
  ) {
    y -= 25;

    page.drawText(
      "Observation :",
      {
        x: 50,
        y,
        size: 9,
        font: bold,
        color: dark,
      },
    );

    const commentaire =
      data.resultat
        .commentaire
        .replace(
          /\s+/g,
          " ",
        )
        .slice(0, 120);

    page.drawText(
      commentaire,
      {
        x: 120,
        y,
        size: 8,
        font: regular,
        color: gray,
      },
    );
  }

  /* ========================================================
     SIGNATURE
  ======================================================== */

  page.drawText(
    `Fait le ${formatDate(
      new Date(),
    )}`,
    {
      x:
        width - 190,
      y: 95,
      size: 9,
      font: regular,
      color: gray,
    },
  );

  page.drawLine({
    start: {
      x:
        width - 190,
      y: 72,
    },

    end: {
      x:
        width - 70,
      y: 72,
    },

    thickness: 1,
    color: rgb(
      0.2,
      0.2,
      0.2,
    ),
  });

  page.drawText(
    "Le Directeur",
    {
      x:
        width - 160,
      y: 55,
      size: 9,
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
      : "Document officiel",
    32,
    regular,
    7,
    gray,
  );

  /* ========================================================
     GENERATION
  ======================================================== */

  return pdf.save();
}