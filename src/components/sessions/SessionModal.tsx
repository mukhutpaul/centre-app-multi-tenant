"use client";

import { useState } from "react";
import { X } from "lucide-react";

import SessionForm from "./SessionForm";

interface SessionModalProps {
  open: boolean;
  session?: any;
  formations: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function SessionModal({
  open,
  session,
  formations,
  onClose,
  onSuccess,
}: SessionModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-background shadow-2xl">
        {/* HEADER */}

        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
          <div>
            <h2 className="text-xl font-bold">
              {session
                ? "Modifier la session"
                : "Nouvelle session"}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {session
                ? "Modifiez les informations de cette session."
                : "Créez une nouvelle session de formation."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* FORM */}

        <div className="p-6">
          <SessionForm
            formations={formations}
            session={session}
            onCancel={onClose}
            onSuccess={() => {
              onSuccess();
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}