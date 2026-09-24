"use client"

import { useEffect, useRef } from "react"

import {
  X,
  FileSignature,
} from "lucide-react"

import ConventionForm from "./convention-form"

type InscriptionOption = {
  value: string
  label: string
}

type ConventionData = {
  id: string
  numero: string
  organisationNom: string
  organisationAdresse: string | null
  organisationEmail: string | null
  organisationTelephone: string | null
  organisationContact: string | null
  dateDebut: Date | string
  dateFin: Date | string
  montant: unknown
  devise: string
  statut:
    | "BROUILLON"
    | "EN_ATTENTE"
    | "SIGNEE"
    | "ACTIVE"
    | "TERMINEE"
    | "ANNULEE"
    | "EXPIREE"
  dateSignature: Date | string | null
  observations: string | null
  participants: {
    inscriptionId: string
  }[]
}

type Props = {
  open: boolean
  onClose: () => void
  convention?: ConventionData | null
  inscriptions?: InscriptionOption[]
}

export default function ConventionModal({
  open,
  onClose,
  convention,
  inscriptions = [],
}: Props) {
  const dialogRef =
    useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
    }

    if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  function handleClose() {
    dialogRef.current?.close()
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        handleClose()
      }}
      className="fixed inset-0 z-50 m-0 h-screen max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
          {/* HEADER */}

          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#0f5da8] dark:bg-blue-500/10 dark:text-blue-400">
                <FileSignature className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  {convention
                    ? "Modifier la convention"
                    : "Nouvelle convention"}
                </h1>

                <p className="text-sm text-slate-500">
                  {convention
                    ? `Convention ${convention.numero}`
                    : "Créer une nouvelle convention"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* CONTENT */}

          <div className="overflow-y-auto p-4 sm:p-6">
            <ConventionForm
              convention={convention}
              inscriptions={inscriptions}
              onSuccess={handleClose}
              onCancel={handleClose}
            />
          </div>
        </div>
      </div>
    </dialog>
  )
}