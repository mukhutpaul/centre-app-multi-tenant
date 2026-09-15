import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  getInscriptionById,
} from "@/actions/inscription.actions";

import InscriptionQRCode from "@/components/inscriptions/inscription-qrcode";
import PrintBadgeButton from "@/components/inscriptions/print-badge-button";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BadgeInscriptionPage({
  params,
}: Props) {
  const { id } = await params;

  const inscription = await getInscriptionById(id);

  if (!inscription) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-red-600">
            Inscription introuvable
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Cette inscription n'existe pas ou a été supprimée.
          </p>

          <Link
            href="/inscriptions"
            className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux inscriptions
          </Link>
        </div>
      </div>
    );
  }

  const apprenant = inscription.apprenant;
  const session = inscription.session;
  const formation = session?.formation;

  const nomComplet = [
    apprenant?.prenom,
    apprenant?.nom,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-h-screen bg-gray-100 p-6">

      {/* =====================================================
          ACTIONS
      ====================================================== */}

      <div className="no-print mx-auto mb-6 flex w-full max-w-[600px] items-center justify-between">

        <Link
          href={`/inscriptions/${id}`}
          className="
            inline-flex
            cursor-pointer
            items-center
            gap-2
            rounded-lg
            border
            bg-white
            px-4
            py-2
            text-sm
            font-medium
            text-gray-700
            shadow-sm
            transition
            hover:bg-gray-50
          "
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <PrintBadgeButton
          inscriptionId={inscription.id}
        />

      </div>

      {/* =====================================================
          APERÇU DU BADGE
      ====================================================== */}

      <div className="flex justify-center">

        <div
          className="
            badge
            flex
            h-[74mm]
            w-[52mm]
            flex-col
            overflow-hidden
            rounded-xl
            border
            border-gray-300
            bg-white
            shadow-xl
          "
        >

          {/* =================================================
              EN-TÊTE
          ================================================== */}

          <div className="shrink-0 bg-gray-900 px-2 py-2 text-center text-white">

            <p className="text-[7px] font-semibold uppercase tracking-[0.15em] text-gray-300">
              CENTRE DE FORMATION
            </p>

            <p className="mt-0.5 text-[11px] font-bold tracking-wide">
              BADGE APPRENANT
            </p>

          </div>

          {/* =================================================
              APPRENANT
          ================================================== */}

          <div className="shrink-0 px-2 pt-2 text-center">

            <p className="truncate text-[11px] font-bold uppercase text-gray-900">
              {nomComplet || "APPRENANT"}
            </p>

            <p className="mt-0.5 text-[7px] font-medium text-gray-500">
              {inscription.numero}
            </p>

          </div>

          {/* =================================================
              TEXTE AU-DESSUS DU QR
          ================================================== */}

          <div className="shrink-0 px-2 pt-2 text-center">

            <p className="text-[7px] font-bold uppercase leading-tight text-gray-800">
              SCANNEZ POUR ENREGISTRER
            </p>

            <p className="mt-0.5 text-[6px] font-medium leading-tight text-gray-500">
              votre présence
            </p>

          </div>

          {/* =================================================
              QR CODE
          ================================================== */}

          <div className="flex shrink-0 items-center justify-center px-1 py-1">

            <InscriptionQRCode
              inscriptionId={inscription.id}
              size={175}
            />

          </div>

          {/* =================================================
              FORMATION
          ================================================== */}

          <div className="shrink-0 border-t border-gray-200 px-2 py-1.5 text-center">

            <p className="text-[6px] font-semibold uppercase tracking-wider text-gray-400">
              Formation
            </p>

            <p className="truncate text-[8px] font-bold text-gray-900">
              {formation?.nom || "—"}
            </p>

            {formation?.code && (
              <p className="truncate text-[6px] text-gray-500">
                {formation.code}
              </p>
            )}

          </div>

          {/* =================================================
              SESSION
          ================================================== */}

          <div className="shrink-0 border-t border-gray-200 px-2 py-1.5 text-center">

            <p className="text-[6px] font-semibold uppercase tracking-wider text-gray-400">
              Session
            </p>

            <p className="truncate text-[8px] font-bold text-gray-900">
              {session?.nom || session?.code || "—"}
            </p>

          </div>

          {/* =================================================
              FOOTER
          ================================================== */}

          <div className="mt-auto shrink-0 border-t bg-gray-50 px-2 py-1 text-center">

            <p className="text-[5.5px] leading-tight text-gray-500">
              Présence automatique par QR Code
            </p>

          </div>

        </div>

      </div>

      {/* =====================================================
          INFORMATION
      ====================================================== */}

      <div className="no-print mx-auto mt-6 max-w-[600px] rounded-xl border bg-white p-4 shadow-sm">

        <p className="text-sm font-medium text-gray-800">
          Badge numérique
        </p>

        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          Le QR Code contient l'identifiant sécurisé de cette
          inscription. Lorsqu'il est scanné par le système de
          présence, l'apprenant peut être identifié et sa présence
          enregistrée automatiquement.
        </p>

      </div>

    </div>
  );
}