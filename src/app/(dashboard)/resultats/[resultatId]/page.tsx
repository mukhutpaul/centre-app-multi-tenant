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

type ModuleResult = {
  id: string;
  moduleSessionId: string;
  code: string;
  nom: string;
  position: number;
  note: number;
  noteMaximale: number;
  pourcentage: number;
  statut: string;
  resultat: string;
  commentaire?: string | null;
  dateEvaluation?: Date | string | null;
};

type ResultatData = {
  id: string;

  apprenant: {
    id: string;
    numero?: string | null;
    prenom: string;
    nom: string;
    email?: string | null;
    telephone?: string | null;
    dateNaissance?: Date | string | null;
    lieuNaissance?: string | null;
    sexe?: string | null;
    nationalite?: string | null;
  };

  inscription: {
    id: string;
    numero: string;
    statut: string;
  };

  formation: {
    id: string;
    code: string;
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

  moyenneGenerale: number;
  tauxPresence?: number | null;

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

function formatDate(
  value?: Date | string | null,
) {
  if (!value) return "—";

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

function getModuleResultColor(
  pourcentage: number,
) {
  if (pourcentage >= 50) {
    return "text-success";
  }

  return "text-error";
}

function getModuleResultBg(
  pourcentage: number,
) {
  if (pourcentage >= 50) {
    return "bg-success/10";
  }

  return "bg-error/10";
}

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
    link.download =
      filename;

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

  /* ========================================================
     IMPRESSION RELEVE
  ======================================================== */

  const handlePrintReleve =
    async () => {
      if (!data) return;

      try {
        setPrintingReleve(true);

        const response =
          await downloadReleveNotesPdf(
            data.id,
          );

        if (
          !response.success ||
          !response.pdfBase64
        ) {
          throw new Error(
            response.message ||
              "Impossible de générer le relevé.",
          );
        }

        openPdf(
          response.pdfBase64,
          response.filename ||
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
        setPrintingReleve(false);
      }
    };

  /* ========================================================
     IMPRESSION BREVET
  ======================================================== */

  const handlePrintBrevet =
    async () => {
      if (!data) return;

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
          !response.pdfBase64
        ) {
          throw new Error(
            response.message ||
              "Impossible de générer le brevet.",
          );
        }

        openPdf(
          response.pdfBase64,
          response.filename ||
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
        setPrintingBrevet(false);
      }
    };

  /* ========================================================
     CREATION CERTIFICATION
  ======================================================== */

  const handleCreateCertification =
    async () => {
      if (!data) return;

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
            response.message,
          );
        }

        toast.success(
          response.message,
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

  /* ========================================================
     DELIVRER CERTIFICATION
  ======================================================== */

  const handleDeliverCertification =
    async () => {
      if (!data) return;

      const confirmation =
        await Swal.fire({
          title:
            "Délivrer la certification ?",

          text:
            "Le document sera marqué comme délivré.",

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
            data.id,
          );

        if (!response.success) {
          throw new Error(
            response.message,
          );
        }

        toast.success(
          response.message,
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

  /* ========================================================
     LOADING
  ======================================================== */

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

  /* ========================================================
     NOT FOUND
  ======================================================== */

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

  const isAdmis =
    data.resultat ===
    "REUSSITE";

  const isCondition =
    data.resultat ===
    "REUSSITE_SOUS_CONDITION";

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

          {/* ACTIONS */}

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
            APPRENANT
        ================================================== */}

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-16">
                    <span className="text-xl font-bold">
                      {data.apprenant.prenom
                        ?.charAt(0)
                        .toUpperCase()}
                      {data.apprenant.nom
                        ?.charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    {
                      data.apprenant
                        .prenom
                    }{" "}
                    {
                      data.apprenant.nom
                    }
                  </h2>

                  <p className="text-sm text-base-content/60">
                    Matricule :{" "}
                    <span className="font-semibold">
                      {data.apprenant
                        .numero ||
                        "Non renseigné"}
                    </span>
                  </p>

                  <p className="text-sm text-base-content/60">
                    Inscription :{" "}
                    {data.inscription
                      .numero}
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
                      {
                        data.resultatLabel
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================
            STATISTIQUES
        ================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-base-content/50">
                    Moyenne générale
                  </p>

                  <p className="text-3xl font-black mt-1">
                    {data.moyenneGenerale.toFixed(
                      2,
                    )}
                    %
                  </p>
                </div>

                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>

          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-5">
              <p className="text-xs uppercase tracking-wide text-base-content/50">
                Mention
              </p>

              <p className="text-2xl font-black mt-1">
                {data.mention}
              </p>
            </div>
          </div>

          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-5">
              <p className="text-xs uppercase tracking-wide text-base-content/50">
                Modules réussis
              </p>

              <p className="text-3xl font-black text-success mt-1">
                {
                  data.modulesReussis
                }
                <span className="text-base font-normal text-base-content/50">
                  {" "}
                  /{" "}
                  {
                    data.nombreModules
                  }
                </span>
              </p>
            </div>
          </div>

          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-5">
              <p className="text-xs uppercase tracking-wide text-base-content/50">
                Présence
              </p>

              <p className="text-3xl font-black mt-1">
                {data.tauxPresence !==
                null &&
                data.tauxPresence !==
                  undefined
                  ? `${data.tauxPresence.toFixed(
                      2,
                    )}%`
                  : "—"}
              </p>
            </div>
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

              <p className="text-sm text-base-content/60">
                Code :{" "}
                {data.formation.code}
              </p>

              {data.formation
                .description && (
                <p className="text-sm mt-3 text-base-content/70">
                  {
                    data.formation
                      .description
                  }
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
                    <th>
                      #
                    </th>

                    <th>
                      Module
                    </th>

                    <th>
                      Note
                    </th>

                    <th>
                      Pourcentage
                    </th>

                    <th>
                      Résultat
                    </th>
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
                        const reussi =
                          module.pourcentage >=
                          50;

                        return (
                          <tr
                            key={
                              module.id
                            }
                          >
                            <td className="font-medium">
                              {index +
                                1}
                            </td>

                            <td>
                              <div>
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
                              </div>
                            </td>

                            <td>
                              <span className="font-bold">
                                {module.note.toFixed(
                                  2,
                                )}
                              </span>

                              <span className="text-base-content/50">
                                {" "}
                                /{" "}
                                {module.noteMaximale.toFixed(
                                  2,
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
                                    module.pourcentage
                                  }
                                  max="100"
                                />

                                <span
                                  className={`font-bold ${getModuleResultColor(
                                    module.pourcentage,
                                  )}`}
                                >
                                  {module.pourcentage.toFixed(
                                    2,
                                  )}
                                  %
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
                          data
                            .certification
                            .numero
                        }
                      </strong>
                    </p>

                    <p className="text-sm">
                      Intitulé :{" "}
                      <strong>
                        {
                          data
                            .certification
                            .intitule
                        }
                      </strong>
                    </p>

                    <p className="text-sm">
                      Statut :{" "}
                      <span className="badge badge-primary">
                        {
                          data
                            .certification
                            .statut
                        }
                      </span>
                    </p>

                    {data.certification
                      .dateObtention && (
                      <p className="text-sm text-base-content/60">
                        Date d'obtention :{" "}
                        {formatDate(
                          data
                            .certification
                            .dateObtention,
                        )}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-base-content/60 mt-2">
                    Aucune certification
                    n'est encore créée pour
                    ce résultat.
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
            INFORMATIONS COMPLEMENTAIRES
        ================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-primary" />

                <h2 className="font-bold">
                  Informations apprenant
                </h2>
              </div>

              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-base-content/50">
                    Nom complet :
                  </span>{" "}
                  <strong>
                    {
                      data.apprenant
                        .prenom
                    }{" "}
                    {
                      data.apprenant
                        .nom
                    }
                  </strong>
                </p>

                <p>
                  <span className="text-base-content/50">
                    Téléphone :
                  </span>{" "}
                  {
                    data.apprenant
                      .telephone ||
                    "—"
                  }
                </p>

                <p>
                  <span className="text-base-content/50">
                    Email :
                  </span>{" "}
                  {
                    data.apprenant
                      .email ||
                    "—"
                  }
                </p>

                <p>
                  <span className="text-base-content/50">
                    Nationalité :
                  </span>{" "}
                  {
                    data.apprenant
                      .nationalite ||
                    "—"
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />

                <h2 className="font-bold">
                  Informations du résultat
                </h2>
              </div>

              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-base-content/50">
                    Date du calcul :
                  </span>{" "}
                  {formatDate(
                    data.dateCalcul,
                  )}
                </p>

                <p>
                  <span className="text-base-content/50">
                    Modules :
                  </span>{" "}
                  {
                    data.nombreModules
                  }
                </p>

                <p>
                  <span className="text-base-content/50">
                    Réussis :
                  </span>{" "}
                  <strong className="text-success">
                    {
                      data.modulesReussis
                    }
                  </strong>
                </p>

                <p>
                  <span className="text-base-content/50">
                    Échoués :
                  </span>{" "}
                  <strong className="text-error">
                    {
                      data.modulesEchoues
                    }
                  </strong>
                </p>

                {data.commentaire && (
                  <p>
                    <span className="text-base-content/50">
                      Commentaire :
                    </span>{" "}
                    {
                      data.commentaire
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================
            FOOTER
        ================================================== */}

        <div className="flex justify-between items-center pb-6">
          <Link
            href="/resultats"
            className="btn btn-ghost cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />

            Retour aux résultats
          </Link>

          <div className="flex gap-2">
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
              <Printer className="h-4 w-4" />

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
              <Award className="h-4 w-4" />

              Brevet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}