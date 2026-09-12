"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { ApprenantForm } from "./apprenant-form";



export interface ApprenantModalData {
  id: string;
  numero: string | null;

  prenom: string;
  nom: string;

  email: string | null;
  telephone: string | null;

  dateNaissance: Date | null;
  lieuNaissance: string | null;

  sexe: string | null;
  nationalite: string | null;

  adresse: string | null;
  ville: string | null;
  pays: string | null;

  profession: string | null;

  contactUrgenceNom: string | null;
  contactUrgenceTelephone: string | null;

  statut: string;
  notes: string | null;
}

interface ApprenantModalProps {
  open: boolean;
  onClose: () => void;
  apprenant?: ApprenantModalData | null;
}

export function ApprenantModal({
  open,
  onClose,
  apprenant = null,
}: ApprenantModalProps) {
  const dialogRef =
    useRef<HTMLDialogElement>(null);

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
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {apprenant
                ? "Modifier l'apprenant"
                : "Nouvel apprenant"}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {apprenant
                ? "Modifiez les informations de l'apprenant."
                : "Renseignez les informations du nouvel apprenant."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-circle btn-ghost"
            aria-label="Fermer"
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[85vh] overflow-y-auto px-6 py-6">
          <ApprenantForm
            apprenant={apprenant}
            onSuccess={onClose}
          />
        </div>
      </div>

      <div
        className="modal-backdrop pointer-events-none"
        aria-hidden="true"
      />
    </dialog>
  );
}