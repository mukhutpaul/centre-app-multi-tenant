"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { StatutCentre } from "@/generated/prisma/enums";

import { CentreForm } from "./centre-form";

export interface CentreModalData {
  id: string;
  nom: string;
  slug: string;
  code: string;

  /**
   * Le statut doit utiliser le même enum
   * que Prisma et CentreForm.
   */
  statut: StatutCentre;

  adresse: string | null;
  ville: string | null;
  pays: string | null;
  codePostal: string | null;
  telephone: string | null;
  email: string | null;
  siteWeb: string | null;
  logoUrl: string | null;
  devise: string;
  fuseauHoraire: string;
}

interface CentreModalProps {
  open: boolean;
  onClose: () => void;
  centre?: CentreModalData | null;
}

export function CentreModal({
  open,
  onClose,
  centre = null,
}: CentreModalProps) {
  const dialogRef =
    useRef<HTMLDialogElement>(null);

  /**
   * Synchronise le dialog avec la prop "open".
   */
  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }

      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  /**
   * Fermeture avec la touche Escape.
   *
   * Le clic sur le backdrop ne ferme pas le popup.
   */
  const handleCancel = (
    event: React.SyntheticEvent<HTMLDialogElement>,
  ) => {
    event.preventDefault();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      className="modal modal-bottom sm:modal-middle"
    >
      <div className="modal-box w-[96vw] max-w-5xl overflow-hidden p-0">
        {/* =====================================================
            HEADER
        ====================================================== */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-700">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {centre
                ? "Modifier le centre"
                : "Nouveau centre de formation"}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {centre
                ? "Modifiez les informations du centre."
                : "Renseignez les informations du nouveau centre."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              btn
              btn-circle
              btn-ghost
              ml-4
              shrink-0
            "
            aria-label="Fermer"
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* =====================================================
            CONTENU
        ====================================================== */}
        <div
          className="
            max-h-[85vh]
            overflow-y-auto
            px-6
            py-6
          "
        >
          <CentreForm
            centre={centre}
            onSuccess={onClose}
          />
        </div>
      </div>

      {/*
        Backdrop uniquement visuel.

        Important :
        - aucun bouton ici
        - aucun onClick
        - le clic extérieur ne ferme donc pas le modal
      */}
      <div
        className="modal-backdrop pointer-events-none"
        aria-hidden="true"
      />
    </dialog>
  );
}