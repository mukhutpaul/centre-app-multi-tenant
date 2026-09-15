"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Camera,
  CheckCircle2,
  Loader2,
  QrCode,
  ScanLine,
  XCircle,
} from "lucide-react";

import Swal from "sweetalert2";

import {
  enregistrerPresenceParQr,
} from "@/actions/presence.actions";

type Props = {
  onPresenceRecorded?: () => void;
};

export default function QrScanner({
  onPresenceRecorded,
}: Props) {
  const scannerRef =
    useRef<any>(null);

  const processingRef =
    useRef(false);

  const mountedRef =
    useRef(true);

  const [started, setStarted] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [lastMessage, setLastMessage] =
    useState("");

  const [
    lastStatus,
    setLastStatus,
  ] = useState<
    "success" |
    "warning" |
    "error" |
    "duplicate" |
    ""
  >("");

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      stopScanner();
    };
  }, []);

  /* =====================================================
     DEMARRER
  ===================================================== */

  async function startScanner() {
    if (started || loading) {
      return;
    }

    try {
      setLoading(true);

      const {
        Html5Qrcode,
      } = await import(
        "html5-qrcode"
      );

      const scanner =
        new Html5Qrcode(
          "qr-reader",
        );

      scannerRef.current =
        scanner;

      await scanner.start(
        {
          facingMode:
            "environment",
        },
        {
          fps: 10,

          qrbox: {
            width: 260,
            height: 260,
          },

          aspectRatio: 1,
        },
        async (
          decodedText,
        ) => {
          if (
            processingRef.current
          ) {
            return;
          }

          processingRef.current =
            true;

          await processQr(
            decodedText,
          );
        },
        () => {
          // Les erreurs de lecture
          // image par image sont normales.
        },
      );

      if (mountedRef.current) {
        setStarted(true);
      }
    } catch (error) {
      console.error(
        "START QR:",
        error,
      );

      await Swal.fire({
        icon: "error",
        title:
          "Caméra inaccessible",
        text:
          "Impossible d'accéder à la caméra. Vérifiez les permissions du navigateur.",
        confirmButtonText:
          "Compris",
      });
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  /* =====================================================
     TRAITER QR
  ===================================================== */

  async function processQr(
    decodedText: string,
  ) {
    try {
      setLoading(true);

      await stopScanner();

      const response =
        await enregistrerPresenceParQr(
          decodedText,
        );

      if (!mountedRef.current) {
        return;
      }

      setLastMessage(
        response.message,
      );

      if (response.success) {
        setLastStatus(
          response.type ===
            "RETARD"
            ? "warning"
            : "success",
        );

        const nom =
          [
            response.apprenant
              ?.prenom,
            response.apprenant
              ?.nom,
          ]
            .filter(Boolean)
            .join(" ");

        await Swal.fire({
          icon:
            response.type ===
            "RETARD"
              ? "warning"
              : "success",

          title:
            response.type ===
            "RETARD"
              ? "Retard enregistré"
              : "Présence enregistrée",

          html: `
            <div style="font-size:15px">
              <strong>${nom || "Apprenant"}</strong>
              <br />
              ${
                response
                  .formation
                  ?.nom ||
                ""
              }
              <br />
              <span style="color:#64748b">
                ${
                  response.message
                }
              </span>
            </div>
          `,

          timer: 2500,

          showConfirmButton: false,
        });

        onPresenceRecorded?.();
      } else {
        setLastStatus(
          response.type ===
            "DUPLICATE"
            ? "duplicate"
            : response.type ===
                "WARNING"
              ? "warning"
              : "error",
        );

        await Swal.fire({
          icon:
            response.type ===
            "DUPLICATE"
              ? "info"
              : response.type ===
                  "WARNING"
                ? "warning"
                : "error",

          title:
            response.type ===
            "DUPLICATE"
              ? "Déjà enregistré"
              : response.type ===
                  "WARNING"
                ? "Attention"
                : "QR Code invalide",

          text:
            response.message,

          confirmButtonText:
            "OK",
        });
      }
    } catch (error) {
      console.error(
        "PROCESS QR:",
        error,
      );

      if (mountedRef.current) {
        setLastStatus(
          "error",
        );

        setLastMessage(
          "Une erreur est survenue lors du traitement du QR Code.",
        );

        await Swal.fire({
          icon: "error",
          title:
            "Erreur",
          text:
            "Impossible de traiter ce QR Code.",
        });
      }
    } finally {
      processingRef.current =
        false;

      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  /* =====================================================
     ARRETER
  ===================================================== */

  async function stopScanner() {
    const scanner =
      scannerRef.current;

    if (!scanner) {
      if (mountedRef.current) {
        setStarted(false);
      }

      return;
    }

    try {
      const state =
        scanner.getState?.();

      if (
        state !== undefined
      ) {
        await scanner.stop();
      }
    } catch (error) {
      console.warn(
        "STOP QR:",
        error,
      );
    }

    try {
      scanner.clear();
    } catch {
      // Rien à faire
    }

    scannerRef.current =
      null;

    if (mountedRef.current) {
      setStarted(false);
    }
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      {/* =================================================
          SCANNER
      ================================================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <QrCode className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                Scanner le badge
              </h2>

              <p className="text-xs text-slate-500">
                Présentez le QR Code devant la caméra.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl bg-slate-950">
            <div
              id="qr-reader"
              className="min-h-[320px] w-full overflow-hidden"
            />

            {!started &&
              !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                    <ScanLine className="h-8 w-8 text-white" />
                  </div>

                  <p className="font-semibold">
                    Scanner un badge
                  </p>

                  <p className="mt-1 max-w-xs text-sm text-slate-400">
                    Autorisez la caméra puis présentez le badge QR devant l'objectif.
                  </p>
                </div>
              )}

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3 text-white">
                  <Loader2 className="h-8 w-8 animate-spin" />

                  <span className="text-sm font-medium">
                    Traitement...
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {!started ? (
              <button
                type="button"
                onClick={
                  startScanner
                }
                disabled={loading}
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Démarrage...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    Démarrer la caméra
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={
                  stopScanner
                }
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                <XCircle className="h-4 w-4" />
                Arrêter le scanner
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =================================================
          RESULTAT
      ================================================= */}

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                Dernier scan
              </h2>

              <p className="text-xs text-slate-500">
                Résultat du dernier badge traité.
              </p>
            </div>
          </div>

          <div
            className={`mt-5 rounded-xl border p-4 ${
              lastStatus ===
              "success"
                ? "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20"
                : lastStatus ===
                    "warning"
                  ? "border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20"
                  : lastStatus ===
                      "duplicate"
                    ? "border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20"
                    : lastStatus ===
                        "error"
                      ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
                      : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
            }`}
          >
            {lastMessage ? (
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {lastMessage}
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                Aucun scan effectué.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900/30 dark:bg-blue-950/20">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300">
            Fonctionnement
          </h3>

          <ul className="mt-3 space-y-2 text-sm text-blue-800 dark:text-blue-300">
            <li>
              • Le badge identifie l'inscription.
            </li>

            <li>
              • Le serveur vérifie le centre courant.
            </li>

            <li>
              • Le cours actuellement en cours est recherché automatiquement.
            </li>

            <li>
              • L'heure d'arrivée est enregistrée automatiquement.
            </li>

            <li>
              • Le retard est calculé automatiquement.
            </li>

            <li>
              • Un deuxième scan est refusé.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}