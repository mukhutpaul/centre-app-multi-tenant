import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import QrScanner from "@/components/presences/qr-scanner";

export default function PresenceScannerPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/presences"
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Retour aux présences"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Scanner QR
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Enregistrement automatique des présences.
              </p>
            </div>
          </div>
        </div>
      </div>

      <QrScanner />
    </div>
  );
}