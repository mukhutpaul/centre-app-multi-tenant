"use client"

import {
  useState,
} from "react"

import {
  FileText,
  ExternalLink,
  Trash2,
  Plus,
  X,
} from "lucide-react"

import Swal from "sweetalert2"

import { toast } from "sonner"

import {
  addConventionDocument,
  deleteConventionDocument,
} from "@/actions/convention-document.actions"

type DocumentItem = {
  id: string
  nom: string
  type: string
  url: string
  mimeType: string | null
  taille: number | null
}

type Props = {
  conventionId: string
  documents: DocumentItem[]
}

export default function ConventionDocuments({
  conventionId,
  documents,
}: Props) {
  const [open, setOpen] =
    useState(false)

  const [nom, setNom] =
    useState("")

  const [type, setType] =
    useState("CONVENTION")

  const [url, setUrl] =
    useState("")

  const [loading, setLoading] =
    useState(false)

  async function handleAdd() {
    if (!nom.trim()) {
      toast.error(
        "Le nom du document est obligatoire."
      )
      return
    }

    if (!url.trim()) {
      toast.error(
        "L'URL du document est obligatoire."
      )
      return
    }

    setLoading(true)

    const result =
      await addConventionDocument(
        conventionId,
        {
          nom,
          type,
          url,
        }
      )

    setLoading(false)

    if (!result.success) {
      toast.error(
        result.message
      )

      return
    }

    toast.success(
      result.message
    )

    setNom("")
    setUrl("")
    setType("CONVENTION")
    setOpen(false)
  }

  async function handleDelete(
    document: DocumentItem
  ) {
    const result =
      await Swal.fire({
        title:
          "Supprimer ce document ?",

        text: document.nom,

        icon: "warning",

        showCancelButton: true,

        confirmButtonText:
          "Supprimer",

        cancelButtonText:
          "Annuler",

        confirmButtonColor:
          "#dc2626",

        reverseButtons: true,
      })

    if (!result.isConfirmed) {
      return
    }

    const response =
      await deleteConventionDocument(
        document.id
      )

    if (!response.success) {
      toast.error(
        response.message
      )

      return
    }

    toast.success(
      response.message
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* HEADER */}

      <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Documents
          </h2>

          <p className="text-sm text-slate-500">
            Documents associés à la convention
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setOpen(true)
          }
          className="inline-flex items-center gap-2 rounded-xl bg-[#0f5da8] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0c4d8c]"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {/* LISTE */}

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {documents.map(
          (document) => (
            <div
              key={document.id}
              className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0f5da8] dark:bg-blue-500/10 dark:text-blue-400">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {document.nom}
                  </p>

                  <p className="text-xs text-slate-500">
                    {document.type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={
                    document.url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ouvrir
                </a>

                <button
                  type="button"
                  onClick={() =>
                    handleDelete(
                      document
                    )
                  }
                  className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        )}

        {documents.length ===
          0 && (
          <div className="p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-300" />

            <p className="mt-3 text-sm text-slate-500">
              Aucun document associé.
            </p>
          </div>
        )}
      </div>

      {/* MODAL */}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Ajouter un document
              </h3>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nom
                </label>

                <input
                  value={nom}
                  onChange={(e) =>
                    setNom(
                      e.target.value
                    )
                  }
                  placeholder="Convention signée"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0f5da8] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Type
                </label>

                <select
                  value={type}
                  onChange={(e) =>
                    setType(
                      e.target.value
                    )
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0f5da8] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="CONVENTION">
                    Convention
                  </option>

                  <option value="ANNEXE">
                    Annexe
                  </option>

                  <option value="SIGNATURE">
                    Signature
                  </option>

                  <option value="AUTRE">
                    Autre
                  </option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  URL
                </label>

                <input
                  value={url}
                  onChange={(e) =>
                    setUrl(
                      e.target.value
                    )
                  }
                  placeholder="https://..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0f5da8] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={handleAdd}
                disabled={loading}
                className="w-full rounded-xl bg-[#0f5da8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0c4d8c] disabled:opacity-50"
              >
                {loading
                  ? "Enregistrement..."
                  : "Ajouter le document"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}