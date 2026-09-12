"use client";

import { FormEvent, useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  User,
  UserPlus,
  X,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";

import {
  createFirstCentreUser,
} from "@/actions/centre-user.actions";

/* ============================================================
   TYPES
============================================================ */

interface Centre {
  id: string;
  nom: string;
  code: string;
}

interface Props {
  open: boolean;
  centre: Centre | null;
  onClose: () => void;
  onSuccess?: () => void;
}

/* ============================================================
   COMPONENT
============================================================ */

export function FirstUserModal({
  open,
  centre,
  onClose,
  onSuccess,
}: Props) {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [loading, setLoading] = useState(false);

  if (!open || !centre) {
    return null;
  }

  /* ==========================================================
     FERMETURE
  ========================================================== */

  const handleClose = () => {
    if (loading) return;

    setPrenom("");
    setNom("");
    setEmail("");
    setMotDePasse("");
    setConfirmationMotDePasse("");
    setShowPassword(false);
    setShowConfirmation(false);

    onClose();
  };

  /* ==========================================================
     SUBMIT
  ========================================================== */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (loading) return;

    if (!prenom.trim()) {
      toast.error("Veuillez saisir le prénom.");
      return;
    }

    if (!nom.trim()) {
      toast.error("Veuillez saisir le nom.");
      return;
    }

    if (!email.trim()) {
      toast.error("Veuillez saisir l'adresse e-mail.");
      return;
    }

    if (motDePasse.length < 8) {
      toast.error(
        "Le mot de passe doit contenir au moins 8 caractères.",
      );
      return;
    }

    if (
      motDePasse !== confirmationMotDePasse
    ) {
      toast.error(
        "Les deux mots de passe ne correspondent pas.",
      );
      return;
    }

    setLoading(true);

    try {
      const response =
        await createFirstCentreUser({
          centreId: centre.id,
          prenom,
          nom,
          email,
          motDePasse,
          confirmationMotDePasse,
        });

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      await Swal.fire({
        icon: "success",
        title: "Utilisateur créé",
        html: `
          <div style="text-align:center">
            <p style="margin-bottom:8px">
              Le premier utilisateur du centre
            </p>

            <strong>
              ${centre.nom}
            </strong>

            <p style="
              margin-top:12px;
              color:#64748b;
              font-size:13px;
            ">
              Le compte possède le rôle
              <strong>Propriétaire</strong>.
            </p>
          </div>
        `,
        confirmButtonText: "Parfait",
        confirmButtonColor: "#0f5da8",
      });

      handleClose();

      onSuccess?.();
    } catch (error) {
      console.error(
        "FIRST USER MODAL:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}

      <button
        type="button"
        aria-label="Fermer"
        disabled={loading}
        onClick={handleClose}
        className="absolute inset-0 cursor-default bg-slate-950/60 backdrop-blur-sm"
      />

      {/* Modal */}

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="relative overflow-hidden bg-gradient-to-br from-[#0f5da8] to-[#0b477f] px-6 py-7 text-white sm:px-8">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />

          <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/5" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <UserPlus size={27} />
              </div>

              <div>
                <p className="text-sm font-medium text-blue-100">
                  Configuration du centre
                </p>

                <h2 className="mt-0.5 text-xl font-bold sm:text-2xl">
                  Premier utilisateur
                </h2>

                <p className="mt-1 text-sm text-blue-100">
                  Créez le compte propriétaire du centre.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn btn-circle btn-sm border-0 bg-white/10 text-white hover:bg-white/20"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ====================================================
            CENTRE
        ==================================================== */}

        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/50 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-[#0f5da8] dark:bg-blue-950/50 dark:text-blue-400">
              <ShieldCheck size={19} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Centre sélectionné
              </p>

              <p className="truncate font-bold text-slate-900 dark:text-white">
                {centre.nom}
              </p>

              <p className="font-mono text-xs text-slate-500">
                {centre.code}
              </p>
            </div>

            <div className="ml-auto">
              <span className="badge badge-info">
                PROPRIÉTAIRE
              </span>
            </div>
          </div>
        </div>

        {/* ====================================================
            FORM
        ==================================================== */}

        <form
          onSubmit={handleSubmit}
          className="px-6 py-6 sm:px-8 sm:py-7"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Prénom */}

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold dark:text-slate-200">
                  Prénom
                </span>

                <span className="label-text-alt text-red-500">
                  *
                </span>
              </label>

              <label className="input input-bordered flex items-center gap-3 bg-white dark:bg-slate-950">
                <User
                  size={18}
                  className="text-slate-400"
                />

                <input
                  type="text"
                  value={prenom}
                  onChange={(event) =>
                    setPrenom(event.target.value)
                  }
                  placeholder="Ex. Jean-Paul"
                  className="grow"
                  disabled={loading}
                  autoComplete="given-name"
                />
              </label>
            </div>

            {/* Nom */}

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold dark:text-slate-200">
                  Nom
                </span>

                <span className="label-text-alt text-red-500">
                  *
                </span>
              </label>

              <label className="input input-bordered flex items-center gap-3 bg-white dark:bg-slate-950">
                <User
                  size={18}
                  className="text-slate-400"
                />

                <input
                  type="text"
                  value={nom}
                  onChange={(event) =>
                    setNom(event.target.value)
                  }
                  placeholder="Ex. Mukhut"
                  className="grow"
                  disabled={loading}
                  autoComplete="family-name"
                />
              </label>
            </div>

            {/* Email */}

            <div className="form-control sm:col-span-2">
              <label className="label">
                <span className="label-text font-semibold dark:text-slate-200">
                  Adresse e-mail
                </span>

                <span className="label-text-alt text-red-500">
                  *
                </span>
              </label>

              <label className="input input-bordered flex items-center gap-3 bg-white dark:bg-slate-950">
                <Mail
                  size={18}
                  className="text-slate-400"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="proprietaire@centre.cd"
                  className="grow"
                  disabled={loading}
                  autoComplete="email"
                />
              </label>

              <label className="label">
                <span className="label-text-alt text-slate-400">
                  Cette adresse servira à la connexion.
                </span>
              </label>
            </div>

            {/* Mot de passe */}

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold dark:text-slate-200">
                  Mot de passe
                </span>

                <span className="label-text-alt text-red-500">
                  *
                </span>
              </label>

              <label className="input input-bordered flex items-center gap-3 bg-white dark:bg-slate-950">
                <LockKeyhole
                  size={18}
                  className="text-slate-400"
                />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={motDePasse}
                  onChange={(event) =>
                    setMotDePasse(
                      event.target.value,
                    )
                  }
                  placeholder="Minimum 8 caractères"
                  className="grow"
                  disabled={loading}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value,
                    )
                  }
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </label>
            </div>

            {/* Confirmation */}

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold dark:text-slate-200">
                  Confirmer le mot de passe
                </span>

                <span className="label-text-alt text-red-500">
                  *
                </span>
              </label>

              <label className="input input-bordered flex items-center gap-3 bg-white dark:bg-slate-950">
                <LockKeyhole
                  size={18}
                  className="text-slate-400"
                />

                <input
                  type={
                    showConfirmation
                      ? "text"
                      : "password"
                  }
                  value={
                    confirmationMotDePasse
                  }
                  onChange={(event) =>
                    setConfirmationMotDePasse(
                      event.target.value,
                    )
                  }
                  placeholder="Retapez le mot de passe"
                  className="grow"
                  disabled={loading}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmation(
                      (value) => !value,
                    )
                  }
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showConfirmation ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </label>
            </div>
          </div>

          {/* ==================================================
              INFORMATION
          ================================================== */}

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
            <div className="flex gap-3">
              <div className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400">
                <ShieldCheck size={18} />
              </div>

              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  Compte propriétaire
                </p>

                <p className="mt-1 text-xs leading-5 text-blue-700 dark:text-blue-300">
                  Ce compte sera automatiquement
                  rattaché au centre avec le rôle
                  <strong> Propriétaire</strong>.
                  Le mot de passe sera enregistré de
                  manière sécurisée.
                </p>
              </div>
            </div>
          </div>

          {/* ==================================================
              ACTIONS
          ================================================== */}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn btn-outline"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn border-0 bg-[#0f5da8] text-white shadow-lg shadow-blue-900/10 hover:bg-[#0c4d8c]"
            >
              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Création...
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Créer le propriétaire
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}