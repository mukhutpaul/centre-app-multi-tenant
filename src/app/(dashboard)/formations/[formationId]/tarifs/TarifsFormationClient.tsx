"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import Swal from "sweetalert2";

import {
ArrowLeft,
CheckCircle2,
CircleDollarSign,
Edit,
FileText,
Plus,
Power,
ReceiptText,
Trash2,
X,
} from "lucide-react";

import {
createTarifFormation,
deleteTarifFormation,
toggleTarifFormation,
updateTarifFormation,
} from "@/actions/tarif-formation.actions";

interface Tarif {
id: string;
nom: string;
description: string | null;
montant: number;
devise: string;
actif: boolean;
}

interface TarifsClientProps {
formation: {
id: string;
nom: string;
code: string;
};
tarifs: Tarif[];
canManage: boolean;
}

interface FormState {
id: string | null;
nom: string;
description: string;
montant: string;
devise: string;
}

const initialForm: FormState = {
id: null,
nom: "",
description: "",
montant: "",
devise: "XAF",
};

export default function TarifsClient({
formation,
tarifs,
canManage,
}: TarifsClientProps) {
const router = useRouter();

const [isModalOpen, setIsModalOpen] = useState(false);
const [isProcessing, setIsProcessing] = useState(false);

const [form, setForm] = useState<FormState>(initialForm);

/**

* ==========================================================
* OUVRIR AJOUT
* ==========================================================
  */

function openCreateModal() {
setForm(initialForm);
setIsModalOpen(true);
}

/**

* ==========================================================
* OUVRIR MODIFICATION
* ==========================================================
  */

function openEditModal(tarif: Tarif) {
setForm({
id: tarif.id,
nom: tarif.nom,
description: tarif.description ?? "",
montant: String(tarif.montant),
devise: tarif.devise,
});


setIsModalOpen(true);


}

/**

* ==========================================================
* FERMER MODAL
* ==========================================================
  */

function closeModal() {
if (isProcessing) {
return;
}


setIsModalOpen(false);
setForm(initialForm);


}

/**

* ==========================================================
* MODIFIER FORMULAIRE
* ==========================================================
  */

function updateField(
field: keyof FormState,
value: string,
) {
setForm((current) => ({
...current,
[field]: value,
}));
}

/**

* ==========================================================
* ENREGISTRER
* ==========================================================
  */

async function handleSubmit(
event: React.FormEvent<HTMLFormElement>,
) {
event.preventDefault();


if (!form.nom.trim()) {
  await Swal.fire({
    title: "Nom obligatoire",
    text: "Veuillez renseigner le nom du tarif.",
    icon: "warning",
    confirmButtonText: "OK",
  });

  return;
}

const montant = Number(form.montant);

if (
  form.montant === "" ||
  !Number.isFinite(montant) ||
  montant < 0
) {
  await Swal.fire({
    title: "Montant invalide",
    text: "Veuillez renseigner un montant valide.",
    icon: "warning",
    confirmButtonText: "OK",
  });

  return;
}

if (!form.devise.trim()) {
  await Swal.fire({
    title: "Devise obligatoire",
    text: "Veuillez renseigner la devise.",
    icon: "warning",
    confirmButtonText: "OK",
  });

  return;
}

setIsProcessing(true);

try {
  const result = form.id
    ? await updateTarifFormation({
        id: form.id,
        formationId: formation.id,
        nom: form.nom,
        description: form.description,
        montant: form.montant,
        devise: form.devise,
      })
    : await createTarifFormation({
        formationId: formation.id,
        nom: form.nom,
        description: form.description,
        montant: form.montant,
        devise: form.devise,
      });

  if (!result.success) {
    throw new Error(result.message);
  }

  setIsModalOpen(false);
  setForm(initialForm);

  await Swal.fire({
    title: "Opération réussie",
    text: result.message,
    icon: "success",
    confirmButtonText: "OK",
  });

  router.refresh();
} catch (error) {
  await Swal.fire({
    title: "Opération impossible",
    text:
      error instanceof Error
        ? error.message
        : "Une erreur est survenue.",
    icon: "error",
    confirmButtonText: "Fermer",
  });
} finally {
  setIsProcessing(false);
}


}

/**

* ==========================================================
* ACTIVATION / DÉSACTIVATION
* ==========================================================
  */

async function handleToggle(tarif: Tarif) {
const action = tarif.actif
? "désactiver"
: "activer";


const result = await Swal.fire({
  title: tarif.actif
    ? "Désactiver le tarif ?"
    : "Activer le tarif ?",

  html: `
    <div style="font-size:14px;line-height:1.6">
      Le tarif
      <strong>${escapeHtml(tarif.nom)}</strong>
      sera ${action}.
      <br />
      <br />
      ${
        tarif.actif
          ? "Il ne sera plus proposé comme tarif actif."
          : "Il pourra de nouveau être utilisé."
      }
    </div>
  `,

  icon: "question",

  showCancelButton: true,

  confirmButtonText: tarif.actif
    ? "Oui, désactiver"
    : "Oui, activer",

  cancelButtonText: "Annuler",

  reverseButtons: true,

  confirmButtonColor: tarif.actif
    ? "#f59e0b"
    : "#16a34a",
});

if (!result.isConfirmed) {
  return;
}

setIsProcessing(true);

try {
  const response = await toggleTarifFormation(
    tarif.id,
    formation.id,
  );

  if (!response.success) {
    throw new Error(response.message);
  }

  await Swal.fire({
    title: "Statut mis à jour",
    text: response.message,
    icon: "success",
    confirmButtonText: "OK",
  });

  router.refresh();
} catch (error) {
  await Swal.fire({
    title: "Modification impossible",
    text:
      error instanceof Error
        ? error.message
        : "Une erreur est survenue.",
    icon: "error",
    confirmButtonText: "Fermer",
  });
} finally {
  setIsProcessing(false);
}


}

/**

* ==========================================================
* SUPPRESSION
* ==========================================================
  */

async function handleDelete(tarif: Tarif) {
const result = await Swal.fire({
title: "Supprimer le tarif ?",


  html: `
    <div style="font-size:14px;line-height:1.6">
      Vous êtes sur le point de supprimer
      <strong>${escapeHtml(tarif.nom)}</strong>.
      <br />
      <br />
      <span style="color:#dc2626;font-weight:600">
        Cette opération est définitive.
      </span>
    </div>
  `,

  icon: "warning",

  showCancelButton: true,

  confirmButtonText: "Oui, supprimer",

  cancelButtonText: "Annuler",

  reverseButtons: true,

  confirmButtonColor: "#dc2626",
});

if (!result.isConfirmed) {
  return;
}

setIsProcessing(true);

try {
  const response = await deleteTarifFormation(
    tarif.id,
    formation.id,
  );

  if (!response.success) {
    throw new Error(response.message);
  }

  await Swal.fire({
    title: "Tarif supprimé",
    text: response.message,
    icon: "success",
    confirmButtonText: "OK",
  });

  router.refresh();
} catch (error) {
  await Swal.fire({
    title: "Suppression impossible",
    text:
      error instanceof Error
        ? error.message
        : "Une erreur est survenue.",
    icon: "error",
    confirmButtonText: "Fermer",
  });
} finally {
  setIsProcessing(false);
}


}

/**

* ==========================================================
* FORMAT MONTANT
* ==========================================================
  */

function formatMontant(
montant: number,
devise: string,
) {
return `${new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(montant)} ${devise}`;
}

return (
<> <div className="space-y-5">
{/* ================================================== */}
{/* HEADER */}
{/* ================================================== */}


    <div className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/formations")}
              className="btn btn-ghost btn-sm btn-square"
              title="Retour aux formations"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CircleDollarSign className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-bold">
                Tarifs de la formation
              </h1>

              <p className="truncate text-sm text-base-content/60">
                {formation.nom}
                <span className="mx-2">•</span>
                <span className="font-mono">
                  {formation.code}
                </span>
              </p>
            </div>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreateModal}
              className="btn btn-primary gap-2"
              disabled={isProcessing}
            >
              <Plus className="h-4 w-4" />
              Nouveau tarif
            </button>
          )}
        </div>
      </div>
    </div>

    {/* ================================================== */}
    {/* STATISTIQUES */}
    {/* ================================================== */}

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ReceiptText className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm text-base-content/60">
                Tarifs
              </p>

              <p className="text-2xl font-bold">
                {tarifs.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm text-base-content/60">
                Tarifs actifs
              </p>

              <p className="text-2xl font-bold">
                {tarifs.filter((tarif) => tarif.actif).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Power className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm text-base-content/60">
                Tarifs désactivés
              </p>

              <p className="text-2xl font-bold">
                {tarifs.filter((tarif) => !tarif.actif).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* ================================================== */}
    {/* TABLE */}
    {/* ================================================== */}

    <div className="card overflow-hidden border border-base-300 bg-base-100 shadow-sm">
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Tarif</th>
              <th>Description</th>
              <th>Montant</th>
              <th>Statut</th>

              {canManage && (
                <th className="text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {tarifs.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 5 : 4}>
                  <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-base-200">
                      <CircleDollarSign className="h-6 w-6 text-base-content/40" />
                    </div>

                    <div>
                      <p className="font-semibold">
                        Aucun tarif enregistré
                      </p>

                      <p className="mt-1 text-sm text-base-content/60">
                        Ajoutez le premier tarif de cette
                        formation.
                      </p>
                    </div>

                    {canManage && (
                      <button
                        type="button"
                        onClick={openCreateModal}
                        className="btn btn-primary btn-sm gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter un tarif
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              tarifs.map((tarif) => (
                <tr
                  key={tarif.id}
                  className="hover"
                >
                  <td className="min-w-48">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CircleDollarSign className="h-4 w-4" />
                      </div>

                      <div>
                        <div className="font-semibold">
                          {tarif.nom}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="max-w-sm">
                    <div className="line-clamp-2 text-sm text-base-content/60">
                      {tarif.description || "—"}
                    </div>
                  </td>

                  <td>
                    <span className="whitespace-nowrap text-base font-bold">
                      {formatMontant(
                        tarif.montant,
                        tarif.devise,
                      )}
                    </span>
                  </td>

                  <td>
                    {tarif.actif ? (
                      <span className="badge badge-success badge-sm gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        Actif
                      </span>
                    ) : (
                      <span className="badge badge-neutral badge-sm gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        Inactif
                      </span>
                    )}
                  </td>

                  {canManage && (
                    <td>
                      <div className="flex justify-end gap-1">
                        {/* MODIFIER */}
                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(tarif)
                          }
                          disabled={isProcessing}
                          className="btn btn-sm btn-ghost btn-square tooltip"
                          data-tip="Modifier"
                          aria-label="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        {/* ACTIVER / DESACTIVER */}
                        <button
                          type="button"
                          onClick={() =>
                            handleToggle(tarif)
                          }
                          disabled={isProcessing}
                          className={`btn btn-sm btn-ghost btn-square tooltip ${
                            tarif.actif
                              ? "text-warning"
                              : "text-success"
                          }`}
                          data-tip={
                            tarif.actif
                              ? "Désactiver"
                              : "Activer"
                          }
                          aria-label={
                            tarif.actif
                              ? "Désactiver"
                              : "Activer"
                          }
                        >
                          <Power className="h-4 w-4" />
                        </button>

                        {/* SUPPRIMER */}
                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(tarif)
                          }
                          disabled={isProcessing}
                          className="btn btn-sm btn-ghost btn-square text-error tooltip"
                          data-tip="Supprimer"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  {/* ==================================================== */}
  {/* MODAL TARIF */}
  {/* ==================================================== */}

  {isModalOpen && (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        {/* HEADER MODAL */}

        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">
              {form.id
                ? "Modifier le tarif"
                : "Nouveau tarif"}
            </h3>

            <p className="mt-1 text-sm text-base-content/60">
              {formation.nom}
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
            disabled={isProcessing}
            className="btn btn-sm btn-circle btn-ghost"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* FORMULAIRE */}

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-5"
        >
          {/* NOM */}

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">
                Nom du tarif
                <span className="text-error"> *</span>
              </span>
            </label>

            <input
              type="text"
              value={form.nom}
              onChange={(event) =>
                updateField(
                  "nom",
                  event.target.value,
                )
              }
              placeholder="Ex. Tarif standard"
              className="input input-bordered w-full"
              disabled={isProcessing}
              maxLength={150}
              autoFocus
            />
          </div>

          {/* DESCRIPTION */}

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">
                Description
              </span>
            </label>

            <textarea
              value={form.description}
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value,
                )
              }
              placeholder="Ex. Formation complète avec supports..."
              className="textarea textarea-bordered min-h-24 w-full"
              disabled={isProcessing}
              maxLength={500}
            />
          </div>

          {/* MONTANT + DEVISE */}

          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  Montant
                  <span className="text-error">
                    {" "}
                    *
                  </span>
                </span>
              </label>

              <label className="input input-bordered flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-base-content/40" />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.montant}
                  onChange={(event) =>
                    updateField(
                      "montant",
                      event.target.value,
                    )
                  }
                  placeholder="0"
                  className="grow"
                  disabled={isProcessing}
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  Devise
                  <span className="text-error">
                    {" "}
                    *
                  </span>
                </span>
              </label>

              <select
                value={form.devise}
                onChange={(event) =>
                  updateField(
                    "devise",
                    event.target.value,
                  )
                }
                className="select select-bordered w-full"
                disabled={isProcessing}
              >
                <option value="XAF">
                  XAF
                </option>

                <option value="CDF">
                  CDF
                </option>

                <option value="USD">
                  USD
                </option>

                <option value="EUR">
                  EUR
                </option>

                <option value="GBP">
                  GBP
                </option>
              </select>
            </div>
          </div>

          {/* APERCU */}

          {form.montant !== "" &&
            Number.isFinite(Number(form.montant)) && (
              <div className="rounded-xl border border-base-300 bg-base-200/50 p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />

                  <div>
                    <p className="text-xs text-base-content/60">
                      Aperçu du tarif
                    </p>

                    <p className="text-lg font-bold">
                      {formatMontant(
                        Number(form.montant),
                        form.devise,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* ACTIONS */}

          <div className="modal-action">
            <button
              type="button"
              onClick={closeModal}
              disabled={isProcessing}
              className="btn btn-ghost"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isProcessing}
              className="btn btn-primary"
            >
              {isProcessing ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Enregistrement...
                </>
              ) : (
                <>
                  {form.id
                    ? "Enregistrer les modifications"
                    : "Ajouter le tarif"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* BACKDROP */}

      <div
        className="modal-backdrop"
        onClick={() => {
          if (!isProcessing) {
            closeModal();
          }
        }}
      />
    </div>
  )}
</>


);
}

/**

* ============================================================
* ESCAPE HTML
* ============================================================
  */

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
