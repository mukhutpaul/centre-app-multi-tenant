"use client"

import { useState } from "react"

import {
  ExternalLink,
  FileText,
  Plus,
  Trash2,
  X,
  Loader2,
  Link as LinkIcon,
  FileType2,
} from "lucide-react"

import Swal from "sweetalert2"
import { toast } from "sonner"
import { addConventionDocument, deleteConventionDocument } from "@/actions/convention-document.actions"



/* =========================================================
 * TYPES
 * ========================================================= */

type ConventionDocument = {
  id: string
  nom: string
  type: string
  urlFichier: string
  typeMime: string | null
  taille: number | null
}

/* =========================================================
 * PROPS
 * ========================================================= */

type Props = {
  conventionId: string
  documents: ConventionDocument[]
}

/* =========================================================
 * TYPES DOCUMENT
 * ========================================================= */

const documentTypes = [
  {
    value: "CONVENTION",
    label: "Convention",
  },
  {
    value: "CONTRAT",
    label: "Contrat",
  },
  {
    value: "FACTURE",
    label: "Facture",
  },
  {
    value: "ATTESTATION",
    label: "Attestation",
  },
  {
    value: "RAPPORT",
    label: "Rapport",
  },
  {
    value: "AUTRE",
    label: "Autre",
  },
]

/* =========================================================
 * COMPONENT
 * ========================================================= */

export default function ConventionDocumentsPanel({
  conventionId,
  documents: initialDocuments,
}: Props) {
  const [documents, setDocuments] =
    useState<ConventionDocument[]>(
      initialDocuments
    )

  const [modalOpen, setModalOpen] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  const [deletingId, setDeletingId] =
    useState<string | null>(null)

  /* =========================================================
   * FORM
   * ========================================================= */

  const [nom, setNom] =
    useState("")

  const [type, setType] =
    useState("CONVENTION")

  const [url, setUrl] =
    useState("")

  const [mimeType, setMimeType] =
    useState("")

  const [taille, setTaille] =
    useState("")

  /* =========================================================
   * OPEN MODAL
   * ========================================================= */

  function openAddModal() {
    setNom("")
    setType("CONVENTION")
    setUrl("")
    setMimeType("")
    setTaille("")

    setModalOpen(true)
  }

  /* =========================================================
   * CLOSE MODAL
   * ========================================================= */

  function closeModal() {
    if (saving) {
      return
    }

    setModalOpen(false)
  }

  /* =========================================================
   * ADD DOCUMENT
   * ========================================================= */

  async function handleAddDocument(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (saving) {
      return
    }

    const cleanNom = nom.trim()
    const cleanType = type.trim()
    const cleanUrl = url.trim()
    const cleanMimeType =
      mimeType.trim()

    if (!cleanNom) {
      toast.error(
        "Le nom du document est obligatoire."
      )

      return
    }

    if (!cleanType) {
      toast.error(
        "Le type du document est obligatoire."
      )

      return
    }

    if (!cleanUrl) {
      toast.error(
        "L'URL du document est obligatoire."
      )

      return
    }

    /* -----------------------------------------
     * VALIDATION URL
     * ----------------------------------------- */

    try {
      new URL(cleanUrl)
    } catch {
      toast.error(
        "Veuillez saisir une URL de document valide."
      )

      return
    }

    /* -----------------------------------------
     * TAILLE
     * ----------------------------------------- */

    let tailleNumber:
      | number
      | undefined

    if (taille.trim()) {
      const parsed =
        Number(taille)

      if (
        !Number.isInteger(parsed) ||
        parsed < 0
      ) {
        toast.error(
          "La taille du document est invalide."
        )

        return
      }

      tailleNumber = parsed
    }

    try {
      setSaving(true)

      const response =
        await addConventionDocument(
          conventionId,
          {
            nom: cleanNom,
            type: cleanType,
            url: cleanUrl,
            mimeType:
              cleanMimeType ||
              undefined,
            taille:
              tailleNumber,
          }
        )

      if (!response.success) {
        toast.error(
          response.message
        )

        return
      }

      const newDocument =
        response.data as ConventionDocument

      setDocuments((current) => [
        ...current,
        newDocument,
      ])

      setModalOpen(false)

      toast.success(
        response.message
      )
    } catch (error) {
      console.error(
        "Erreur ajout document:",
        error
      )

      toast.error(
        "Impossible d'ajouter le document."
      )
    } finally {
      setSaving(false)
    }
  }

  /* =========================================================
   * DELETE DOCUMENT
   * ========================================================= */

  async function handleDelete(
    document: ConventionDocument
  ) {
    if (deletingId || saving) {
      return
    }

    const result =
      await Swal.fire({
        title:
          "Supprimer ce document ?",

        text: `"${document.nom}" sera définitivement supprimé.`,

        icon: "warning",

        showCancelButton: true,

        confirmButtonText:
          "Oui, supprimer",

        cancelButtonText:
          "Annuler",

        reverseButtons: true,

        confirmButtonColor:
          "#dc2626",

        cancelButtonColor:
          "#64748b",
      })

    if (!result.isConfirmed) {
      return
    }

    try {
      setDeletingId(
        document.id
      )

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

      setDocuments((current) =>
        current.filter(
          (item) =>
            item.id !== document.id
        )
      )

      toast.success(
        response.message
      )
    } catch (error) {
      console.error(
        "Erreur suppression document:",
        error
      )

      toast.error(
        "Impossible de supprimer le document."
      )
    } finally {
      setDeletingId(null)
    }
  }

  /* =========================================================
   * RENDER
   * ========================================================= */

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Documents
              </h2>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                {documents.length} document
                {documents.length > 1
                  ? "s"
                  : ""}{" "}
                associé
                {documents.length > 1
                  ? "s"
                  : ""}
              </p>
            </div>
          </div>

          {/* AJOUT */}

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0f5da8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c4d8c] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />

            Ajouter un document
          </button>
        </div>

        {/* =================================================
            DOCUMENTS
        ================================================= */}

        {documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map(
              (document) => {
                const isDeleting =
                  deletingId ===
                  document.id

                return (
                  <div
                    key={
                      document.id
                    }
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-slate-300 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:hover:border-slate-700"
                  >
                    {/* DOCUMENT INFO */}

                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <FileText className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {
                            document.nom
                          }
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>
                            {formatDocumentType(
                              document.type
                            )}
                          </span>

                          {document.typeMime && (
                            <>
                              <span>
                                •
                              </span>

                              <span>
                                {
                                  document.typeMime
                                }
                              </span>
                            </>
                          )}

                          {document.taille !=
                            null && (
                            <>
                              <span>
                                •
                              </span>

                              <span>
                                {formatFileSize(
                                  document.taille
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ACTIONS */}

                    <div className="flex shrink-0 items-center justify-end gap-2">
                      {/* VOIR */}

                      <a
                        href={
                          document.urlFichier
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Voir le document"
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-[#0f5da8] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />

                        <span>
                          Voir
                        </span>
                      </a>

                      {/* SUPPRIMER */}

                      <button
                        type="button"
                        title="Supprimer le document"
                        disabled={
                          isDeleting
                        }
                        onClick={() =>
                          handleDelete(
                            document
                          )
                        }
                        className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-red-100 p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )
              }
            )}
          </div>
        ) : (
          /* =================================================
             EMPTY
          ================================================= */

          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <FileText className="h-6 w-6" />
            </div>

            <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
              Aucun document
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Aucun document n'est
              associé à cette
              convention.
            </p>

            <button
              type="button"
              onClick={
                openAddModal
              }
              className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0f5da8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0c4d8c]"
            >
              <Plus className="h-4 w-4" />

              Ajouter le premier
              document
            </button>
          </div>
        )}
      </section>

      {/* =====================================================
          MODAL AJOUT DOCUMENT
      ===================================================== */}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !saving
            ) {
              closeModal()
            }
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Ajouter un document
                </h3>

                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Associez un document à
                  cette convention
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={saving}
                className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleAddDocument
              }
              className="space-y-4 p-5"
            >
              {/* NOM */}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nom du document
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  value={nom}
                  onChange={(e) =>
                    setNom(
                      e.target.value
                    )
                  }
                  placeholder="Ex. Convention signée 2026"
                  disabled={saving}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0f5da8] focus:ring-2 focus:ring-[#0f5da8]/10 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-950"
                />
              </div>

              {/* TYPE */}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Type
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <div className="relative">
                  <FileType2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <select
                    value={type}
                    onChange={(e) =>
                      setType(
                        e.target.value
                      )
                    }
                    disabled={
                      saving
                    }
                    className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#0f5da8] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    {documentTypes.map(
                      (item) => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {item.label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* URL */}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  URL du document
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <div className="relative">
                  <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="url"
                    value={url}
                    onChange={(e) =>
                      setUrl(
                        e.target.value
                      )
                    }
                    placeholder="https://..."
                    disabled={saving}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0f5da8] focus:ring-2 focus:ring-[#0f5da8]/10 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-950"
                  />
                </div>

                <p className="mt-1.5 text-xs text-slate-400">
                  Indiquez l'adresse où
                  le document peut être
                  consulté.
                </p>
              </div>

              {/* MIME + TAILLE */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Type MIME
                  </label>

                  <input
                    type="text"
                    value={
                      mimeType
                    }
                    onChange={(e) =>
                      setMimeType(
                        e.target.value
                      )
                    }
                    placeholder="application/pdf"
                    disabled={saving}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0f5da8] focus:ring-2 focus:ring-[#0f5da8]/10 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Taille
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={
                        taille
                      }
                      onChange={(e) =>
                        setTaille(
                          e.target
                            .value
                        )
                      }
                      placeholder="En octets"
                      disabled={
                        saving
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0f5da8] focus:ring-2 focus:ring-[#0f5da8]/10 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-950"
                    />
                  </div>
                </div>
              </div>

              {/* ACTIONS */}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-slate-800">
                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                  className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0f5da8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c4d8c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Ajout...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Ajouter
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

/* =========================================================
 * FORMAT TYPE
 * ========================================================= */

function formatDocumentType(
  type: string
) {
  const labels: Record<
    string,
    string
  > = {
    CONVENTION: "Convention",
    CONTRAT: "Contrat",
    FACTURE: "Facture",
    ATTESTATION: "Attestation",
    RAPPORT: "Rapport",
    AUTRE: "Autre",
  }

  return (
    labels[type] ??
    type
  )
}

/* =========================================================
 * FORMAT TAILLE
 * ========================================================= */

function formatFileSize(
  bytes: number
) {
  if (bytes === 0) {
    return "0 octet"
  }

  if (bytes < 1024) {
    return `${bytes} octets`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} Ko`
  }

  if (
    bytes <
    1024 * 1024 * 1024
  ) {
    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} Mo`
  }

  return `${(
    bytes /
    (1024 * 1024 * 1024)
  ).toFixed(1)} Go`
}