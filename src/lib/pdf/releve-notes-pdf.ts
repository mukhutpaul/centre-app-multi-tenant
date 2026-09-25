import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

type ReleveModule = {
  nom: string;
  code: string;
  note: number | null;
  noteMaximale: number | null;
  pourcentage: number | null;
  resultat: string;
};

type ReleveJury = {
  moyenne: number | null;
  contribution: number | null;
  nombreEvaluations: number;
};

export type ReleveNotesPdfData = {
  centre: {
    nom: string;
    code?: string | null;
    adresse?: string | null;
    ville?: string | null;
    pays?: string | null;
    telephone?: string | null;
    email?: string | null;
  };

  apprenant: {
    nom: string;
    prenom: string;
    numero?: string | null;
  };

  formation: {
    nom: string;
    code?: string | null;
  };

  session: {
    nom?: string | null;
    code: string;
    dateDebut?: Date | string | null;
    dateFin?: Date | string | null;
  };

  inscription?: {
    numero: string;
  };

  modules: ReleveModule[];

  resultat: {
    moyenneEvaluations: number | null;
    contributionEvaluations: number | null;

    moyenneJury: number | null;
    contributionJury: number | null;

    moyenneGenerale: number | null;

    resultat: string;
    resultatLabel: string;
    mention?: string | null;
  };

  jury?: ReleveJury;
};

function formatDate(value?: Date | string | null): string {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return value.toFixed(digits);
}

function getMentionLabel(mention?: string | null): string {
  if (!mention) return "-";

  const labels: Record<string, string> = {
    EXCELLENT: "Excellent",
    TRES_BIEN: "Très bien",
    BIEN: "Bien",
    ASSEZ_BIEN: "Assez bien",
    PASSABLE: "Passable",
  };

  return labels[mention] ?? mention;
}

export async function generateReleveNotesPdf(
  data: ReleveNotesPdfData
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();

  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);

  const margin = 40;

  let y = A4_HEIGHT - margin;

  const drawText = (
    text: string,
    x: number,
    yPosition: number,
    size = 10,
    bold = false
  ) => {
    page.drawText(text, {
      x,
      y: yPosition,
      size,
      font: bold ? boldFont : regularFont,
      color: rgb(0.1, 0.1, 0.1),
    });
  };

  const drawLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 0.7,
      color: rgb(0.75, 0.75, 0.75),
    });
  };

  // ============================================================
  // EN-TÊTE CENTRE
  // ============================================================

  drawText(
    data.centre.nom.toUpperCase(),
    margin,
    y,
    16,
    true
  );

  y -= 20;

  if (data.centre.code) {
    drawText(`Code : ${data.centre.code}`, margin, y, 9);
    y -= 14;
  }

  if (data.centre.adresse) {
    drawText(data.centre.adresse, margin, y, 9);
    y -= 14;
  }

  if (data.centre.ville || data.centre.pays) {
    drawText(
      [data.centre.ville, data.centre.pays]
        .filter(Boolean)
        .join(" - "),
      margin,
      y,
      9
    );

    y -= 14;
  }

  if (data.centre.telephone || data.centre.email) {
    drawText(
      [data.centre.telephone, data.centre.email]
        .filter(Boolean)
        .join(" | "),
      margin,
      y,
      9
    );

    y -= 14;
  }

  drawLine(margin, y, A4_WIDTH - margin, y);

  y -= 35;

  // ============================================================
  // TITRE
  // ============================================================

  const title = "RELEVÉ DE NOTES";

  const titleWidth = boldFont.widthOfTextAtSize(title, 18);

  drawText(
    title,
    (A4_WIDTH - titleWidth) / 2,
    y,
    18,
    true
  );

  y -= 35;

  // ============================================================
  // APPRENANT
  // ============================================================

  drawText("APPRENANT", margin, y, 10, true);

  y -= 18;

  drawText(
    `Nom complet : ${data.apprenant.prenom} ${data.apprenant.nom}`,
    margin,
    y,
    10
  );

  y -= 16;

  drawText(
    `Numéro apprenant : ${data.apprenant.numero ?? "-"}`,
    margin,
    y,
    10
  );

  y -= 16;

  drawText(
    `Numéro inscription : ${data.inscription?.numero ?? "-"}`,
    margin,
    y,
    10
  );

  y -= 25;

  // ============================================================
  // FORMATION
  // ============================================================

  drawText("FORMATION", margin, y, 10, true);

  y -= 18;

  drawText(
    `Formation : ${data.formation.nom}`,
    margin,
    y,
    10
  );

  y -= 16;

  drawText(
    `Code formation : ${data.formation.code ?? "-"}`,
    margin,
    y,
    10
  );

  y -= 16;

  drawText(
    `Session : ${
      data.session.nom
        ? `${data.session.nom} (${data.session.code})`
        : data.session.code
    }`,
    margin,
    y,
    10
  );

  y -= 16;

  drawText(
    `Période : ${formatDate(
      data.session.dateDebut
    )} - ${formatDate(data.session.dateFin)}`,
    margin,
    y,
    10
  );

  y -= 30;

  // ============================================================
  // TABLEAU DES NOTES
  // ============================================================

  drawText("DÉTAIL DES ÉVALUATIONS", margin, y, 10, true);

  y -= 20;

  const tableX = margin;
  const tableWidth = A4_WIDTH - margin * 2;

  const colModule = 210;
  const colNote = 75;
  const colMax = 75;
  const colPourcentage = 80;
  const colResultat = tableWidth - colModule - colNote - colMax - colPourcentage;

  const rowHeight = 24;

  page.drawRectangle({
    x: tableX,
    y: y - rowHeight + 4,
    width: tableWidth,
    height: rowHeight,
    color: rgb(0.93, 0.94, 0.96),
  });

  drawText("Module", tableX + 6, y - 14, 9, true);

  drawText(
    "Note",
    tableX + colModule + 6,
    y - 14,
    9,
    true
  );

  drawText(
    "Max.",
    tableX + colModule + colNote + 6,
    y - 14,
    9,
    true
  );

  drawText(
    "%",
    tableX + colModule + colNote + colMax + 6,
    y - 14,
    9,
    true
  );

  drawText(
    "Résultat",
    tableX +
      colModule +
      colNote +
      colMax +
      colPourcentage +
      6,
    y - 14,
    9,
    true
  );

  y -= rowHeight;

  for (const module of data.modules) {
    if (y < 150) {
      const newPage = pdf.addPage([A4_WIDTH, A4_HEIGHT]);

      y = A4_HEIGHT - margin;

      newPage.drawText("RELEVÉ DE NOTES — suite", {
        x: margin,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1),
      });

      y -= 30;
    }

    drawLine(tableX, y, tableX + tableWidth, y);

    drawText(
      module.nom.length > 34
        ? `${module.nom.substring(0, 31)}...`
        : module.nom,
      tableX + 6,
      y - 16,
      8
    );

    drawText(
      formatNumber(module.note),
      tableX + colModule + 6,
      y - 16,
      8
    );

    drawText(
      formatNumber(module.noteMaximale),
      tableX + colModule + colNote + 6,
      y - 16,
      8
    );

    drawText(
      module.pourcentage === null
        ? "-"
        : `${formatNumber(module.pourcentage)} %`,
      tableX + colModule + colNote + colMax + 6,
      y - 16,
      8
    );

    drawText(
      module.resultat,
      tableX +
        colModule +
        colNote +
        colMax +
        colPourcentage +
        6,
      y - 16,
      8
    );

    y -= rowHeight;
  }

  drawLine(tableX, y, tableX + tableWidth, y);

  y -= 35;

  // ============================================================
  // SYNTHÈSE 70 / 30
  // ============================================================

  drawText("SYNTHÈSE DU RÉSULTAT", margin, y, 11, true);

  y -= 22;

  const boxWidth = tableWidth;
  const boxHeight = 120;

  page.drawRectangle({
    x: margin,
    y: y - boxHeight,
    width: boxWidth,
    height: boxHeight,
    borderWidth: 1,
    borderColor: rgb(0.8, 0.8, 0.8),
  });

  const leftX = margin + 12;
  const rightX = A4_WIDTH - margin - 150;

  drawText(
    "Moyenne évaluations formation",
    leftX,
    y - 20,
    9,
    true
  );

  drawText(
    data.resultat.moyenneEvaluations === null
      ? "-"
      : `${formatNumber(data.resultat.moyenneEvaluations)} %`,
    rightX,
    y - 20,
    10,
    true
  );

  drawText(
    "Contribution des évaluations (70 %)",
    leftX,
    y - 42,
    9
  );

  drawText(
    data.resultat.contributionEvaluations === null
      ? "-"
      : `${formatNumber(
          data.resultat.contributionEvaluations
        )} pts`,
    rightX,
    y - 42,
    10,
    true
  );

  drawText(
    "Moyenne du jury",
    leftX,
    y - 64,
    9,
    true
  );

  drawText(
    data.resultat.moyenneJury === null
      ? "-"
      : `${formatNumber(data.resultat.moyenneJury)} %`,
    rightX,
    y - 64,
    10,
    true
  );

  drawText(
    "Contribution du jury (30 %)",
    leftX,
    y - 86,
    9
  );

  drawText(
    data.resultat.contributionJury === null
      ? "-"
      : `${formatNumber(
          data.resultat.contributionJury
        )} pts`,
    rightX,
    y - 86,
    10,
    true
  );

  y -= boxHeight + 20;

  // ============================================================
  // RÉSULTAT FINAL
  // ============================================================

  page.drawRectangle({
    x: margin,
    y: y - 70,
    width: tableWidth,
    height: 70,
    borderWidth: 1.5,
    borderColor: rgb(0.15, 0.15, 0.15),
  });

  drawText(
    "RÉSULTAT FINAL",
    margin + 15,
    y - 22,
    11,
    true
  );

  drawText(
    data.resultat.moyenneGenerale === null
      ? "En attente"
      : `${formatNumber(
          data.resultat.moyenneGenerale
        )} %`,
    margin + 190,
    y - 23,
    14,
    true
  );

  drawText(
    data.resultat.resultatLabel,
    margin + 390,
    y - 22,
    10,
    true
  );

  drawText(
    `Mention : ${getMentionLabel(data.resultat.mention)}`,
    margin + 15,
    y - 48,
    9
  );

  y -= 95;

  // ============================================================
  // JURY
  // ============================================================

  if (data.jury) {
    drawText("JURY", margin, y, 10, true);

    y -= 18;

    drawText(
      `Nombre d'évaluations du jury : ${data.jury.nombreEvaluations}`,
      margin,
      y,
      9
    );

    y -= 16;
  }

  // ============================================================
  // PIED DE PAGE
  // ============================================================

  drawLine(
    margin,
    55,
    A4_WIDTH - margin,
    55
  );

  drawText(
    `Document généré le ${formatDate(new Date())}`,
    margin,
    38,
    8
  );

  drawText(
    data.centre.nom,
    A4_WIDTH - margin - 150,
    38,
    8
  );

  return await pdf.save();
}