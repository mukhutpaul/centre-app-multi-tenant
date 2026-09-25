"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  Award,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileBadge,
  FileText,
  GraduationCap,
  Loader2,
  MapPin,
  Mail,
  Phone,
  Printer,
  ShieldCheck,
  TrendingUp,
  User,
  XCircle,
} from "lucide-react";

import Link from "next/link";
import { useParams } from "next/navigation";

import Swal from "sweetalert2";
import { toast } from "sonner";

import {
  createCertification,
  delivrerCertification,
  downloadBrevetPdf,
  downloadReleveNotesPdf,
  getResultatById,
} from "@/actions/resultat-actions";

/* =========================================================
   TYPES
========================================================= */

type ModuleResult = {
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

type CentreData = {
  id: string;
  nom: string;
  code: string;

  telephone?: string | null;
  email?: string | null;

  adresse?: string | null;
  ville?: string | null;
  pays?: string | null;

  codePostal?: string | null;
  siteWeb?: string | null;
  logoUrl?: string | null;

  initiales?: string;
};

type ApprenantData = {
  id: string;

  numero?: string | null;

  prenom: string;
  nom: string;

  email?: string | null;
  telephone?: string | null;

  sexe?: string | null;

  dateNaissance?: Date | string | null;
  lieuNaissance?: string | null;

  nationalite?: string | null;

  adresse?: string | null;
  ville?: string | null;
  pays?: string | null;

  profession?: string | null;

  contactUrgenceNom?: string | null;
  contactUrgenceTelephone?: string | null;

  initiales?: string;
};

type ResultatData = {
  id: string;

  inscriptionId?: string;

  centre?: CentreData | null;

  apprenant: ApprenantData;

  inscription: {
    id: string;
    numero: string;
    statut?: string;
  };

  formation: {
    id: string;
    code?: string | null;
    nom: string;
    description?: string | null;
  };

  session: {
    id: string;
    code: string;
    nom?: string | null;
    dateDebut: Date | string;
    dateFin: Date | string;
  };

  moyenneEvaluations: number | null;

  moyenneJury: number | null;

  contributionEvaluations:
    | number
    | null;

  contributionJury:
    | number
    | null;

  moyenneGenerale:
    | number
    | null;

  tauxPresence:
    | number
    | null;

  nombrePresences?: number;

  presencesPresentes?: number;

  presencesAbsentes?: number;

  presencesRetard?: number;

  presencesExcusees?: number;

  nombreModules: number;

  modulesReussis: number;

  modulesEchoues: number;

  resultat: string;

  resultatLabel: string;

  mention: string;

  commentaire?: string | null;

  dateCalcul?: Date | string | null;

  certification?: {
    id: string;
    numero: string;
    intitule: string;
    dateObtention?: Date | string | null;
    statut: string;
    mention?: string | null;
    observations?: string | null;
  } | null;

  modules: ModuleResult[];
};

/* =========================================================
   HELPERS
========================================================= */

function formatPourcentage(
  value: number | null | undefined,
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return `${value.toFixed(2)} %`;
}

function formatNote(
  value: number | null | undefined,
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toFixed(2);
}

function formatDate(
  value?: Date | string | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  ).format(date);
}

/* =========================================================
   RESULTAT COLORS
========================================================= */

function getResultColor(
  resultat: string,
) {
  switch (resultat) {
    case "REUSSITE":
      return "text-success";

    case "REUSSITE_SOUS_CONDITION":
      return "text-warning";

    case "ECHEC":
      return "text-error";

    default:
      return "text-base-content/50";
  }
}

function getResultBg(
  resultat: string,
) {
  switch (resultat) {
    case "REUSSITE":
      return "bg-success/10 border-success/20";

    case "REUSSITE_SOUS_CONDITION":
      return "bg-warning/10 border-warning/20";

    case "ECHEC":
      return "bg-error/10 border-error/20";

    default:
      return "bg-base-200 border-base-300";
  }
}

/* =========================================================
   MODULE COLORS
========================================================= */

function getModuleResultColor(
  pourcentage:
    | number
    | null
    | undefined,
) {
  if (
    pourcentage !== null &&
    pourcentage !== undefined &&
    pourcentage >= 50
  ) {
    return "text-success";
  }

  if (
    pourcentage !== null &&
    pourcentage !== undefined
  ) {
    return "text-error";
  }

  return "text-base-content/50";
}

/* =========================================================
   PDF
========================================================= */

function base64ToBlob(
  base64: string,
) {
  const byteCharacters =
    window.atob(base64);

  const byteNumbers =
    new Array(
      byteCharacters.length,
    );

  for (
    let i = 0;
    i < byteCharacters.length;
    i++
  ) {
    byteNumbers[i] =
      byteCharacters.charCodeAt(i);
  }

  const byteArray =
    new Uint8Array(
      byteNumbers,
    );

  return new Blob(
    [byteArray],
    {
      type: "application/pdf",
    },
  );
}

function openPdf(
  base64: string,
  filename: string,
) {
  const blob =
    base64ToBlob(base64);

  const url =
    URL.createObjectURL(blob);

  const opened =
    window.open(
      url,
      "_blank",
    );

  if (!opened) {
    const link =
      document.createElement(
        "a",
      );

    link.href = url;
    link.download = filename;

    document.body.appendChild(
      link,
    );

    link.click();

    link.remove();
  }

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        url,
      );
    },
    60_000,
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function ResultatDetailPage() {
  const params =
    useParams<{
      resultatId: string;
    }>();

  const resultatId =
    params.resultatId;

  const [data, setData] =
    useState<ResultatData | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [
    printingBrevet,
    setPrintingBrevet,
  ] = useState(false);

  const [
    printingReleve,
    setPrintingReleve,
  ] = useState(false);

  const [
    creatingCertification,
    setCreatingCertification,
  ] = useState(false);

  const [
    deliveringCertification,
    setDeliveringCertification,
  ] = useState(false);

  /* =======================================================
     CHARGEMENT
  ======================================================= */

  const loadData =
    useCallback(
      async () => {
        if (!resultatId) {
          return;
        }

        try {
          setLoading(true);

          const response =
            await getResultatById(
              resultatId,
            );

          if (
            !response.success ||
            !response.data
          ) {
            toast.error(
              response.message ||
                "Résultat introuvable.",
            );

            return;
          }

          setData(
            response.data as ResultatData,
          );
        } catch (error) {
          console.error(error);

          toast.error(
            "Impossible de charger le résultat.",
          );
        } finally {
          setLoading(false);
        }
      },
      [resultatId],
    );

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* =======================================================
     RELEVE
  ======================================================= */

  const handlePrintReleve =
    async () => {
      if (!data) {
        return;
      }

      try {
        setPrintingReleve(true);

        const response =
          await downloadReleveNotesPdf(
            data.id,
          );

        /*
         * IMPORTANT :
         *
         * L'action retourne :
         *
         * data: {
         *   base64,
         *   filename
         * }
         *
         * et non pdfBase64.
         */

        if (
          !response.success ||
          !response.data?.base64
        ) {
          throw new Error(
            response.message ||
              "Impossible de générer le relevé.",
          );
        }

        openPdf(
          response.data.base64,
          response.data.filename ||
            "releve-notes.pdf",
        );

        toast.success(
          "Relevé de notes généré.",
        );
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de générer le relevé.",
        );
      } finally {
        setPrintingReleve(
          false,
        );
      }
    };

  /* =======================================================
     BREVET
  ======================================================= */

  const handlePrintBrevet =
    async () => {
      if (!data) {
        return;
      }

      if (
        data.resultat !==
        "REUSSITE"
      ) {
        toast.error(
          "Le brevet est disponible uniquement pour un résultat admis.",
        );

        return;
      }

      try {
        setPrintingBrevet(true);

        const response =
          await downloadBrevetPdf(
            data.id,
          );

        if (
          !response.success ||
          !response.data?.base64
        ) {
          throw new Error(
            response.message ||
              "Impossible de générer le brevet.",
          );
        }

        openPdf(
          response.data.base64,
          response.data.filename ||
            "brevet.pdf",
        );

        toast.success(
          "Brevet généré.",
        );

        await loadData();
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de générer le brevet.",
        );
      } finally {
        setPrintingBrevet(
          false,
        );
      }
    };

  /* =======================================================
     CERTIFICATION
  ======================================================= */

  const handleCreateCertification =
    async () => {
      if (!data) {
        return;
      }

      const confirmation =
        await Swal.fire({
          title:
            "Préparer la certification ?",

          text:
            "Une certification sera créée pour cet apprenant.",

          icon: "question",

          showCancelButton: true,

          confirmButtonText:
            "Oui, préparer",

          cancelButtonText:
            "Annuler",

          buttonsStyling: false,

          customClass: {
            confirmButton:
              "btn btn-primary cursor-pointer mx-1",

            cancelButton:
              "btn btn-ghost cursor-pointer mx-1",
          },
        });

      if (
        !confirmation.isConfirmed
      ) {
        return;
      }

      try {
        setCreatingCertification(
          true,
        );

        const response =
          await createCertification(
            data.id,
          );

        if (!response.success) {
          throw new Error(
            response.message ||
              "Impossible de préparer la certification.",
          );
        }

        toast.success(
          response.message ||
            "Certification préparée.",
        );

        await loadData();
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de préparer la certification.",
        );
      } finally {
        setCreatingCertification(
          false,
        );
      }
    };

  /* =======================================================
     DELIVRER
  ======================================================= */

  const handleDeliverCertification =
    async () => {
      if (!data?.certification) {
        return;
      }

      const confirmation =
        await Swal.fire({
          title:
            "Délivrer la certification ?",

          text:
            "La certification sera marquée comme délivrée.",

          icon: "warning",

          showCancelButton: true,

          confirmButtonText:
            "Oui, délivrer",

          cancelButtonText:
            "Annuler",

          buttonsStyling: false,

          customClass: {
            confirmButton:
              "btn btn-success cursor-pointer mx-1",

            cancelButton:
              "btn btn-ghost cursor-pointer mx-1",
          },
        });

      if (
        !confirmation.isConfirmed
      ) {
        return;
      }

      try {
        setDeliveringCertification(
          true,
        );

        const response =
          await delivrerCertification(
            data.certification.id,
          );

        if (!response.success) {
          throw new Error(
            response.message ||
              "Impossible de délivrer la certification.",
          );
        }

        toast.success(
          response.message ||
            "Certification délivrée.",
        );

        await loadData();
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de délivrer la certification.",
        );
      } finally {
        setDeliveringCertification(
          false,
        );
      }
    };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />

          <p className="text-sm text-base-content/60">
            Chargement du résultat...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (!data) {
    return (
      <div className="min-h-screen bg-base-200 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="alert alert-error">
            <XCircle className="h-5 w-5" />

            <span>
              Résultat introuvable.
            </span>
          </div>

          <Link
            href="/resultats"
            className="btn btn-primary cursor-pointer mt-5"
          >
            <ArrowLeft className="h-4 w-4" />

            Retour aux résultats
          </Link>
        </div>
      </div>
    );
  }

  /* =======================================================
     VARIABLES
  ======================================================= */

  const isAdmis =
    data.resultat ===
    "REUSSITE";

  const isCondition =
    data.resultat ===
    "REUSSITE_SOUS_CONDITION";

  const evaluationDisponible =
    data.moyenneEvaluations !==
      null &&
    data.moyenneEvaluations !==
      undefined;

  const juryDisponible =
    data.moyenneJury !== null &&
    data.moyenneJury !==
      undefined;

  const resultatDisponible =
    data.moyenneGenerale !==
      null &&
    data.moyenneGenerale !==
      undefined;

  const apprenantInitiales =
    data.apprenant.initiales ||
    `${data.apprenant.prenom?.charAt(0) ?? ""}${data.apprenant.nom?.charAt(0) ?? ""}`.toUpperCase();

  const centreInitiales =
    data.centre?.initiales ||
    data.centre?.code ||
    data.centre?.nom
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map(
        (mot) =>
          mot
            .charAt(0)
            .toUpperCase(),
      )
      .join("") ||
    "C";

  return (
    <div className="min-h-screen bg-base-200">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/resultats"
              className="btn btn-circle btn-ghost cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-primary" />

                <h1 className="text-2xl font-bold">
                  Résultat de formation
                </h1>
              </div>

              <p className="text-sm text-base-content/60 mt-1">
                Consultation du résultat,
                relevé de notes et brevet.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={
                handlePrintReleve
              }
              disabled={
                printingReleve
              }
              className="btn btn-outline cursor-pointer"
            >
              {printingReleve ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}

              Relevé de notes
            </button>

            <button
              type="button"
              onClick={
                handlePrintBrevet
              }
              disabled={
                printingBrevet ||
                !isAdmis
              }
              className="btn btn-primary cursor-pointer"
            >
              {printingBrevet ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Award className="h-4 w-4" />
              )}

              Imprimer le brevet
            </button>
          </div>
        </div>

        {/* ==================================================
            CENTRE
        ================================================== */}

        {data.centre && (
          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                {/* AVATAR CENTRE
                    IMPORTANT :
                    flex + items-center + justify-center
                    centre parfaitement les initiales.
                */}

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content">
                  <span className="text-lg font-black leading-none text-center">
                    {centreInitiales}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-base-content/50">
                    Centre de formation
                  </p>

                  <h2 className="text-lg font-bold truncate">
                    {data.centre.nom}
                  </h2>

                  {data.centre.code && (
                    <p className="text-sm text-base-content/60">
                      Code :{" "}
                      <span className="font-semibold">
                        {data.centre.code}
                      </span>
                    </p>
                  )}
                </div>

                <div className="sm:ml-auto flex flex-wrap gap-3 text-sm text-base-content/60">

                  {data.centre.telephone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4" />

                      <span>
                        {data.centre.telephone}
                      </span>
                    </div>
                  )}

                  {data.centre.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" />

                      <span>
                        {data.centre.email}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            APPRENANT
        ================================================== */}

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">

            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

              <div className="flex items-center gap-4">

                {/* =================================================
                    AVATAR APPRENANT

                    Les initiales sont maintenant parfaitement
                    centrées horizontalement et verticalement.
                ================================================= */}

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content">
                  <span className="text-xl font-black leading-none text-center">
                    {apprenantInitiales}
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    {data.apprenant.prenom}{" "}
                    {data.apprenant.nom}
                  </h2>

                  <p className="text-sm text-base-content/60">
                    Matricule :{" "}
                    <span className="font-semibold">
                      {data.apprenant.numero ||
                        "Non renseigné"}
                    </span>
                  </p>

                  <p className="text-sm text-base-content/60">
                    Inscription :{" "}
                    {data.inscription.numero}
                  </p>
                </div>
              </div>

              <div
                className={`rounded-xl border px-5 py-4 ${getResultBg(
                  data.resultat,
                )}`}
              >
                <div className="flex items-center gap-3">
                  {isAdmis ? (
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  ) : isCondition ? (
                    <Clock3 className="h-8 w-8 text-warning" />
                  ) : (
                    <XCircle className="h-8 w-8 text-error" />
                  )}

                  <div>
                    <p className="text-xs uppercase tracking-wide opacity-60">
                      Résultat
                    </p>

                    <p
                      className={`font-bold text-lg ${getResultColor(
                        data.resultat,
                      )}`}
                    >
                      {data.resultatLabel}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================
                CONTACT APPRENANT
            ================================================= */}

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

              <div className="rounded-xl bg-base-200 p-4">
                <div className="flex items-center gap-2 text-base-content/50">
                  <Phone className="h-4 w-4" />

                  <span className="text-xs font-medium uppercase">
                    Téléphone
                  </span>
                </div>

                <p className="mt-2 font-semibold">
                  {data.apprenant.telephone ||
                    "Non renseigné"}
                </p>
              </div>

              <div className="rounded-xl bg-base-200 p-4">
                <div className="flex items-center gap-2 text-base-content/50">
                  <Mail className="h-4 w-4" />

                  <span className="text-xs font-medium uppercase">
                    Email
                  </span>
                </div>

                <p className="mt-2 font-semibold break-all">
                  {data.apprenant.email ||
                    "Non renseigné"}
                </p>
              </div>

              <div className="rounded-xl bg-base-200 p-4">
                <div className="flex items-center gap-2 text-base-content/50">
                  <MapPin className="h-4 w-4" />

                  <span className="text-xs font-medium uppercase">
                    Ville
                  </span>
                </div>

                <p className="mt-2 font-semibold">
                  {data.apprenant.ville ||
                    "Non renseignée"}
                </p>
              </div>

              <div className="rounded-xl bg-base-200 p-4">
                <div className="flex items-center gap-2 text-base-content/50">
                  <MapPin className="h-4 w-4" />

                  <span className="text-xs font-medium uppercase">
                    Adresse
                  </span>
                </div>

                <p className="mt-2 font-semibold">
                  {data.apprenant.adresse ||
                    "Non renseignée"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================
            STATISTIQUES
        ================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

          {/* MOYENNE */}

          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-base-content/50">
                    Moyenne générale
                  </p>

                  <p className="text-3xl font-black mt-1">
                    {formatPourcentage(
                      data.moyenneGenerale,
                    )}
                  </p>
                </div>

                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>

          {/* MENTION */}

          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-5">
              <p className="text-xs uppercase tracking-wide text-base-content/50">
                Mention
              </p>

              <p className="text-2xl font-black mt-1">
                {data.mention || "—"}
              </p>
            </div>
          </div>

          {/* MODULES */}

          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-5">
              <p className="text-xs uppercase tracking-wide text-base-content/50">
                Modules réussis
              </p>

              <p className="text-3xl font-black text-success mt-1">
                {data.modulesReussis}

                <span className="text-base font-normal text-base-content/50">
                  {" "}/{" "}
                  {data.nombreModules}
                </span>
              </p>
            </div>
          </div>

          {/* PRESENCE */}

          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-5">
              <p className="text-xs uppercase tracking-wide text-base-content/50">
                Présence
              </p>

              <p className="text-3xl font-black mt-1">
                {formatPourcentage(
                  data.tauxPresence,
                )}
              </p>

              {data.nombrePresences !==
                undefined && (
                <p className="text-xs text-base-content/50 mt-1">
                  {data.presencesPresentes ??
                    0} présents •{" "}
                  {data.presencesRetard ??
                    0} retards •{" "}
                  {data.presencesAbsentes ??
                    0} absences
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ==================================================
            CALCUL 70 / 30
        ================================================== */}

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold">
                  Calcul de la moyenne finale
                </h2>

                <p className="text-sm text-base-content/60 mt-1">
                  70 % évaluations + 30 %
                  jury.
                </p>
              </div>

              <div className="badge badge-primary badge-lg">
                70 % + 30 %
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* EVALUATIONS */}

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-base-content/50">
                      Évaluations
                    </p>

                    <p className="text-2xl font-black mt-1">
                      {formatPourcentage(
                        data.moyenneEvaluations,
                      )}
                    </p>
                  </div>

                  <div className="badge badge-primary">
                    70 %
                  </div>
                </div>

                <div className="divider my-3" />

                <p className="text-sm text-base-content/60">
                  Contribution :
                </p>

                <p className="font-bold text-primary mt-1">
                  {formatPourcentage(
                    data.contributionEvaluations,
                  )}
                </p>

                {!evaluationDisponible && (
                  <p className="text-xs text-warning mt-3">
                    Aucune évaluation
                    validée disponible.
                  </p>
                )}
              </div>

              {/* JURY */}

              <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-base-content/50">
                      Jury
                    </p>

                    <p className="text-2xl font-black mt-1">
                      {formatPourcentage(
                        data.moyenneJury,
                      )}
                    </p>
                  </div>

                  <div className="badge badge-secondary">
                    30 %
                  </div>
                </div>

                <div className="divider my-3" />

                <p className="text-sm text-base-content/60">
                  Contribution :
                </p>

                <p className="font-bold text-secondary mt-1">
                  {formatPourcentage(
                    data.contributionJury,
                  )}
                </p>

                {!juryDisponible && (
                  <p className="text-xs text-warning mt-3">
                    Aucune note de jury
                    disponible.
                  </p>
                )}
              </div>

              {/* FINAL */}

              <div className="rounded-xl border border-success/20 bg-success/5 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-base-content/50">
                      Moyenne finale
                    </p>

                    <p className="text-2xl font-black mt-1">
                      {formatPourcentage(
                        data.moyenneGenerale,
                      )}
                    </p>
                  </div>

                  {resultatDisponible ? (
                    <CheckCircle2 className="h-7 w-7 text-success" />
                  ) : (
                    <Clock3 className="h-7 w-7 text-warning" />
                  )}
                </div>

                <div className="divider my-3" />

                <p className="text-sm text-base-content/60">
                  Résultat :
                </p>

                <p
                  className={`font-bold mt-1 ${getResultColor(
                    data.resultat,
                  )}`}
                >
                  {data.resultatLabel ||
                    "Non évalué"}
                </p>
              </div>
            </div>

            {!resultatDisponible && (
              <div className="alert alert-warning mt-5">
                <Clock3 className="h-5 w-5" />

                <div>
                  <p className="font-semibold">
                    Moyenne finale non
                    disponible
                  </p>

                  <p className="text-sm">
                    Les évaluations validées
                    et l'évaluation du jury
                    doivent être disponibles.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==================================================
            FORMATION / SESSION
        ================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-primary" />

                <h2 className="font-bold">
                  Formation
                </h2>
              </div>

              <p className="text-lg font-bold">
                {data.formation.nom}
              </p>

              {data.formation.code && (
                <p className="text-sm text-base-content/60">
                  Code :{" "}
                  {data.formation.code}
                </p>
              )}

              {data.formation.description && (
                <p className="text-sm mt-3 text-base-content/70">
                  {data.formation.description}
                </p>
              )}
            </div>
          </div>

          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="h-5 w-5 text-primary" />

                <h2 className="font-bold">
                  Session
                </h2>
              </div>

              <p className="text-lg font-bold">
                {data.session.nom ||
                  data.session.code}
              </p>

              <p className="text-sm text-base-content/60">
                Code :{" "}
                {data.session.code}
              </p>

              <p className="text-sm mt-3">
                Du{" "}
                <strong>
                  {formatDate(
                    data.session
                      .dateDebut,
                  )}
                </strong>{" "}
                au{" "}
                <strong>
                  {formatDate(
                    data.session
                      .dateFin,
                  )}
                </strong>
              </p>
            </div>
          </div>
        </div>

        {/* ==================================================
            INFORMATIONS PERSONNELLES
        ================================================== */}

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">

            <div className="flex items-center gap-2 mb-5">
              <User className="h-5 w-5 text-primary" />

              <h2 className="text-lg font-bold">
                Informations personnelles
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              <div>
                <p className="text-xs uppercase text-base-content/50">
                  Nom complet
                </p>

                <p className="font-semibold mt-1">
                  {data.apprenant.prenom}{" "}
                  {data.apprenant.nom}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-base-content/50">
                  Téléphone
                </p>

                <p className="font-semibold mt-1">
                  {data.apprenant.telephone ||
                    "Non renseigné"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-base-content/50">
                  Email
                </p>

                <p className="font-semibold mt-1 break-all">
                  {data.apprenant.email ||
                    "Non renseigné"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-base-content/50">
                  Sexe
                </p>

                <p className="font-semibold mt-1">
                  {data.apprenant.sexe ||
                    "Non renseigné"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-base-content/50">
                  Date de naissance
                </p>

                <p className="font-semibold mt-1">
                  {formatDate(
                    data.apprenant
                      .dateNaissance,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-base-content/50">
                  Lieu de naissance
                </p>

                <p className="font-semibold mt-1">
                  {data.apprenant
                    .lieuNaissance ||
                    "Non renseigné"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-base-content/50">
                  Nationalité
                </p>

                <p className="font-semibold mt-1">
                  {data.apprenant
                    .nationalite ||
                    "Non renseignée"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-base-content/50">
                  Profession
                </p>

                <p className="font-semibold mt-1">
                  {data.apprenant
                    .profession ||
                    "Non renseignée"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-base-content/50">
                  Ville
                </p>

                <p className="font-semibold mt-1">
                  {data.apprenant.ville ||
                    "Non renseignée"}
                </p>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-xs uppercase text-base-content/50">
                  Adresse
                </p>

                <p className="font-semibold mt-1">
                  {data.apprenant.adresse ||
                    "Non renseignée"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================
            CONTACT URGENCE
        ================================================== */}

        {(data.apprenant
          .contactUrgenceNom ||
          data.apprenant
            .contactUrgenceTelephone) && (
          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body">
              <h2 className="text-lg font-bold">
                Contact d'urgence
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs uppercase text-base-content/50">
                    Nom
                  </p>

                  <p className="font-semibold mt-1">
                    {data.apprenant
                      .contactUrgenceNom ||
                      "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase text-base-content/50">
                    Téléphone
                  </p>

                  <p className="font-semibold mt-1">
                    {data.apprenant
                      .contactUrgenceTelephone ||
                      "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            TABLE NOTES
        ================================================== */}

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-0">

            <div className="p-5 border-b border-base-300">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">
                    Relevé des notes
                  </h2>

                  <p className="text-sm text-base-content/60 mt-1">
                    Toutes les évaluations
                    normalisées sur 100 %.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    handlePrintReleve
                  }
                  disabled={
                    printingReleve
                  }
                  className="btn btn-sm btn-outline cursor-pointer"
                >
                  {printingReleve ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4" />
                  )}

                  Imprimer
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Module</th>
                    <th>Note</th>
                    <th>Pourcentage</th>
                    <th>Résultat</th>
                  </tr>
                </thead>

                <tbody>
                  {data.modules.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-10 text-base-content/50"
                      >
                        Aucune évaluation
                        disponible.
                      </td>
                    </tr>
                  ) : (
                    data.modules.map(
                      (
                        module,
                        index,
                      ) => {
                        const pourcentage =
                          module.pourcentage;

                        const reussi =
                          pourcentage >=
                          50;

                        return (
                          <tr
                            key={
                              module.id
                            }
                          >
                            <td className="font-medium">
                              {index + 1}
                            </td>

                            <td>
                              <p className="font-semibold">
                                {
                                  module.nom
                                }
                              </p>

                              <p className="text-xs text-base-content/50">
                                {
                                  module.code
                                }
                              </p>
                            </td>

                            <td>
                              <span className="font-bold">
                                {formatNote(
                                  module.note,
                                )}
                              </span>

                              <span className="text-base-content/50">
                                {" "}
                                /{" "}
                                {formatNote(
                                  module.noteMaximale,
                                )}
                              </span>
                            </td>

                            <td>
                              <div className="flex items-center gap-3 min-w-40">
                                <progress
                                  className={`progress w-24 ${
                                    reussi
                                      ? "progress-success"
                                      : "progress-error"
                                  }`}
                                  value={
                                    pourcentage
                                  }
                                  max="100"
                                />

                                <span
                                  className={`font-bold ${getModuleResultColor(
                                    pourcentage,
                                  )}`}
                                >
                                  {formatPourcentage(
                                    pourcentage,
                                  )}
                                </span>
                              </div>
                            </td>

                            <td>
                              <span
                                className={`badge ${
                                  reussi
                                    ? "badge-success"
                                    : "badge-error"
                                }`}
                              >
                                {reussi
                                  ? "Réussi"
                                  : "Échoué"}
                              </span>
                            </td>
                          </tr>
                        );
                      },
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ==================================================
            PRESENCES
        ================================================== */}

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">

            <div className="flex items-center gap-2 mb-5">
              <Clock3 className="h-5 w-5 text-primary" />

              <div>
                <h2 className="text-lg font-bold">
                  Assiduité
                </h2>

                <p className="text-sm text-base-content/60">
                  Présence enregistrée sur
                  l'inscription.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              <div className="rounded-xl bg-success/10 p-4">
                <p className="text-xs uppercase text-success/70">
                  Présents
                </p>

                <p className="text-2xl font-black text-success mt-1">
                  {data.presencesPresentes ??
                    0}
                </p>
              </div>

              <div className="rounded-xl bg-warning/10 p-4">
                <p className="text-xs uppercase text-warning/70">
                  Retards
                </p>

                <p className="text-2xl font-black text-warning mt-1">
                  {data.presencesRetard ??
                    0}
                </p>
              </div>

              <div className="rounded-xl bg-error/10 p-4">
                <p className="text-xs uppercase text-error/70">
                  Absences
                </p>

                <p className="text-2xl font-black text-error mt-1">
                  {data.presencesAbsentes ??
                    0}
                </p>
              </div>

              <div className="rounded-xl bg-info/10 p-4">
                <p className="text-xs uppercase text-info/70">
                  Excusés
                </p>

                <p className="text-2xl font-black text-info mt-1">
                  {data.presencesExcusees ??
                    0}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold">
                  Taux de présence
                </span>

                <span className="font-black">
                  {formatPourcentage(
                    data.tauxPresence,
                  )}
                </span>
              </div>

              <progress
                className="progress progress-success w-full"
                value={
                  data.tauxPresence ??
                  0
                }
                max="100"
              />
            </div>
          </div>
        </div>

        {/* ==================================================
            CERTIFICATION
        ================================================== */}

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <div className="flex items-center gap-2">
                  <FileBadge className="h-5 w-5 text-primary" />

                  <h2 className="text-lg font-bold">
                    Certification / Brevet
                  </h2>
                </div>

                {data.certification ? (
                  <div className="mt-3 space-y-1">

                    <p className="text-sm">
                      Numéro :{" "}
                      <strong>
                        {
                          data.certification
                            .numero
                        }
                      </strong>
                    </p>

                    <p className="text-sm">
                      Intitulé :{" "}
                      <strong>
                        {
                          data.certification
                            .intitule
                        }
                      </strong>
                    </p>

                    <p className="text-sm">
                      Statut :{" "}
                      <span className="badge badge-primary">
                        {
                          data.certification
                            .statut
                        }
                      </span>
                    </p>

                    {data.certification
                      .dateObtention && (
                      <p className="text-sm text-base-content/60">
                        Date d'obtention :{" "}
                        {formatDate(
                          data.certification
                            .dateObtention,
                        )}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-base-content/60 mt-2">
                    Aucune certification
                    n'est encore créée.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">

                {!data.certification &&
                  isAdmis && (
                    <button
                      type="button"
                      onClick={
                        handleCreateCertification
                      }
                      disabled={
                        creatingCertification
                      }
                      className="btn btn-outline cursor-pointer"
                    >
                      {creatingCertification ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}

                      Préparer la certification
                    </button>
                  )}

                {data.certification &&
                  data.certification
                    .statut ===
                    "PRETE" && (
                    <button
                      type="button"
                      onClick={
                        handleDeliverCertification
                      }
                      disabled={
                        deliveringCertification
                      }
                      className="btn btn-success cursor-pointer"
                    >
                      {deliveringCertification ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="h-4 w-4" />
                      )}

                      Délivrer
                    </button>
                  )}

                {isAdmis && (
                  <button
                    type="button"
                    onClick={
                      handlePrintBrevet
                    }
                    disabled={
                      printingBrevet
                    }
                    className="btn btn-primary cursor-pointer"
                  >
                    {printingBrevet ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}

                    Brevet PDF
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================
            INFORMATIONS CENTRE
        ================================================== */}

        {data.centre && (
          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body">

              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content">
                  <span className="text-lg font-black leading-none text-center">
                    {centreInitiales}
                  </span>
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    {data.centre.nom}
                  </h2>

                  <p className="text-sm text-base-content/60">
                    {data.centre.adresse ||
                      "Adresse non renseignée"}
                  </p>

                  <p className="text-sm text-base-content/60">
                    {[
                      data.centre.ville,
                      data.centre.pays,
                    ]
                      .filter(Boolean)
                      .join(", ") ||
                      "Localisation non renseignée"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            FOOTER
        ================================================== */}

        <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pb-6">

          <Link
            href="/resultats"
            className="btn btn-ghost cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />

            Retour aux résultats
          </Link>

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={
                handlePrintReleve
              }
              disabled={
                printingReleve
              }
              className="btn btn-outline cursor-pointer"
            >
              {printingReleve ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}

              Relevé
            </button>

            <button
              type="button"
              onClick={
                handlePrintBrevet
              }
              disabled={
                printingBrevet ||
                !isAdmis
              }
              className="btn btn-primary cursor-pointer"
            >
              {printingBrevet ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Award className="h-4 w-4" />
              )}

              Brevet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}