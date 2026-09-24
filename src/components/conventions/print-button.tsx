"use client"

import {
  Printer,
} from "lucide-react"

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl bg-[#0f5da8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0c4d8c]"
    >
      <Printer className="h-4 w-4" />

      Imprimer
    </button>
  )
}