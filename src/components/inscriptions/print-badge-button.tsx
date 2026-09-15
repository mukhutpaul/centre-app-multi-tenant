"use client";

import { useState } from "react";
import { Printer, Loader2 } from "lucide-react";

type Props = {
  inscriptionId: string;
};

export default function PrintBadgeButton({
  inscriptionId,
}: Props) {
  const [loading, setLoading] =
    useState(false);

  async function handlePrint() {
    try {
      setLoading(true);

      const response =
        await fetch(
          `/api/inscriptions/${inscriptionId}/badge`,
        );

      if (!response.ok) {
        throw new Error(
          "Impossible de générer le badge.",
        );
      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(
          blob,
        );

      const printWindow =
        window.open(
          url,
          "_blank",
        );

      if (!printWindow) {
        throw new Error(
          "La fenêtre d'impression a été bloquée par le navigateur.",
        );
      }

      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };

      /*
       * On libère l'URL après quelques secondes.
       */
      setTimeout(() => {
        window.URL.revokeObjectURL(
          url,
        );
      }, 10000);
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
          "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      disabled={loading}
      className="
        inline-flex
        cursor-pointer
        items-center
        gap-2
        rounded-lg
        bg-blue-600
        px-4
        py-2
        text-sm
        font-medium
        text-white
        shadow-sm
        transition
        hover:bg-blue-700
        disabled:cursor-not-allowed
        disabled:opacity-60
      "
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Génération...
        </>
      ) : (
        <>
          <Printer className="h-4 w-4" />
          Imprimer A8
        </>
      )}
    </button>
  );
}