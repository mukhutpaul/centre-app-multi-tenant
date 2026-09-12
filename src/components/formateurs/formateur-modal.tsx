
"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Clipboard,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";

import Swal from "sweetalert2";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  StatutFormateur,
} from "@/generated/prisma/enums";

import {
  createFormateur,
  updateFormateur,
  createFormateurUserAccount,
} from "@/actions/formateur.actions";

/* ============================================================
   PROPS
============================================================ */

interface FormateurModalProps {
  open: boolean;

  onOpenChange: (
    open: boolean
  ) => void;

  formateur?: any | null;
}

/* ============================================================
   STATUTS
============================================================ */

const STATUTS = [
  {
    value: StatutFormateur.ACTIF,
    label: "Actif",
    description:
      "Le formateur peut assurer des activités.",
  },

  {
    value: StatutFormateur.INACTIF,
    label: "Inactif",
    description:
      "Le formateur est temporairement inactif.",
  },

  {
    value: StatutFormateur.SUSPENDU,
    label: "Suspendu",
    description:
      "Les activités du formateur sont suspendues.",
  },

  {
    value: StatutFormateur.ARCHIVE,
    label: "Archivé",
    description:
      "Le formateur est archivé.",
  },
];

/* ============================================================
   COMPOSANT
============================================================ */

export default function FormateurModal({
  open,
  onOpenChange,
  formateur,
}: FormateurModalProps) {
  const router = useRouter();

  const isEditing = Boolean(formateur);

  const hasUserAccount =
    Boolean(formateur?.utilisateurId);

  /* ==========================================================
     FORMATEUR
  ========================================================== */

  const [prenom, setPrenom] =
    useState("");

  const [nom, setNom] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [telephone, setTelephone] =
    useState("");

  const [specialite, setSpecialite] =
    useState("");

  const [biographie, setBiographie] =
    useState("");

  const [statut, setStatut] =
    useState<StatutFormateur>(
      StatutFormateur.ACTIF
    );

  /* ==========================================================
     COMPTE UTILISATEUR
  ========================================================== */

  const [creerCompte, setCreerCompte] =
    useState(false);

  const [emailCompte, setEmailCompte] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [motDePasseTemporaire, setMotDePasseTemporaire] =
    useState("");

  /* ==========================================================
     ETATS
  ========================================================== */

  const [loading, setLoading] =
    useState(false);

  /* ==========================================================
     INITIALISATION
  ========================================================== */

  useEffect(() => {
    if (!open) return;

    if (formateur) {
      setPrenom(
        formateur.prenom ?? ""
      );

      setNom(
        formateur.nom ?? ""
      );

      setEmail(
        formateur.email ?? ""
      );

      setTelephone(
        formateur.telephone ?? ""
      );

      setSpecialite(
        formateur.specialite ?? ""
      );

      setBiographie(
        formateur.biographie ?? ""
      );

      setStatut(
        formateur.statut ??
          StatutFormateur.ACTIF
      );

      /**
       * Si un compte existe déjà,
       * on ne demande pas d'en créer un.
       */

      setCreerCompte(false);

      setEmailCompte(
        formateur.utilisateur?.email ??
          formateur.email ??
          ""
      );

      setMotDePasseTemporaire("");
    } else {
      setPrenom("");

      setNom("");

      setEmail("");

      setTelephone("");

      setSpecialite("");

      setBiographie("");

      setStatut(
        StatutFormateur.ACTIF
      );

      setCreerCompte(false);

      setEmailCompte("");

      setMotDePasseTemporaire("");

      setShowPassword(false);
    }
  }, [open, formateur]);

  /* ==========================================================
     FERMETURE
  ========================================================== */

  function handleClose() {
    if (loading) return;

    onOpenChange(false);
  }

  /* ==========================================================
     COPIER LE MOT DE PASSE
  ========================================================== */

  async function handleCopyPassword() {
    if (!motDePasseTemporaire) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        motDePasseTemporaire
      );

      toast.success(
        "Mot de passe copié dans le presse-papiers."
      );
    } catch {
      toast.error(
        "Impossible de copier le mot de passe."
      );
    }
  }

  /* ==========================================================
     CRÉER LE COMPTE APRÈS MODIFICATION
  ========================================================== */

  async function handleCreateAccountForExistingFormateur() {
    if (!formateur?.id) return;

    const emailFinal =
      emailCompte.trim() ||
      email.trim();

    if (!emailFinal) {
      toast.error(
        "Une adresse email est nécessaire pour créer le compte."
      );

      return;
    }

    const confirmation =
      await Swal.fire({
        title:
          "Créer le compte utilisateur ?",

        html: `
          <div style="font-size:14px">
            Le compte sera créé pour
            <strong>${prenom} ${nom}</strong>.
            <br/><br/>
            Le formateur pourra ensuite
            se connecter à la plateforme.
          </div>
        `,

        icon: "question",

        showCancelButton: true,

        confirmButtonText:
          "Oui, créer le compte",

        cancelButtonText:
          "Annuler",

        reverseButtons: true,
      });

    if (!confirmation.isConfirmed) {
      return;
    }

    setLoading(true);

    try {
      const result =
        await createFormateurUserAccount(
          formateur.id,
          emailFinal
        );

      setMotDePasseTemporaire(
        result.motDePasseTemporaire
      );

      toast.success(
        result.message
      );

      router.refresh();

      /**
       * Afficher les identifiants
       * dans une boîte SweetAlert.
       */

      await Swal.fire({
        title:
          "Compte créé avec succès",

        icon: "success",

        html: `
          <div style="text-align:left">

            <div style="
              background:#f8fafc;
              border:1px solid #e2e8f0;
              border-radius:12px;
              padding:16px;
              margin-top:12px;
            ">

              <div style="
                font-size:12px;
                color:#64748b;
                margin-bottom:5px;
              ">
                Adresse email
              </div>

              <div style="
                font-weight:600;
                word-break:break-all;
              ">
                ${result.utilisateur.email}
              </div>

            </div>

            <div style="
              background:#f8fafc;
              border:1px solid #e2e8f0;
              border-radius:12px;
              padding:16px;
              margin-top:10px;
            ">

              <div style="
                font-size:12px;
                color:#64748b;
                margin-bottom:5px;
              ">
                Mot de passe temporaire
              </div>

              <div style="
                font-family:monospace;
                font-size:18px;
                font-weight:700;
                letter-spacing:1px;
              ">
                ${result.motDePasseTemporaire}
              </div>

            </div>

            <div style="
              margin-top:14px;
              font-size:12px;
              color:#64748b;
            ">
              Conservez ces informations et
              transmettez-les au formateur.
            </div>

          </div>
        `,

        confirmButtonText:
          "J'ai compris",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast.error(
        error?.message ??
          "Impossible de créer le compte utilisateur."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================================
     SOUMISSION
  ========================================================== */

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    /* --------------------------------------------------------
       VALIDATION
    -------------------------------------------------------- */

    if (!prenom.trim()) {
      toast.error(
        "Le prénom est obligatoire."
      );

      return;
    }

    if (!nom.trim()) {
      toast.error(
        "Le nom est obligatoire."
      );

      return;
    }

    if (
      creerCompte &&
      !isEditing &&
      !(
        emailCompte.trim() ||
        email.trim()
      )
    ) {
      toast.error(
        "Une adresse email est nécessaire pour créer le compte utilisateur."
      );

      return;
    }

    /* --------------------------------------------------------
       CONFIRMATION
    -------------------------------------------------------- */

    const confirmation =
      await Swal.fire({
        title: isEditing
          ? "Modifier le formateur ?"
          : "Créer le formateur ?",

        text: isEditing
          ? "Les modifications seront enregistrées."
          : creerCompte
            ? "Le formateur et son compte utilisateur seront créés."
            : "Le nouveau formateur sera ajouté au centre.",

        icon: "question",

        showCancelButton: true,

        confirmButtonText: isEditing
          ? "Oui, modifier"
          : "Oui, créer",

        cancelButtonText:
          "Annuler",

        reverseButtons: true,
      });

    if (!confirmation.isConfirmed) {
      return;
    }

    /* --------------------------------------------------------
       LOADING
    -------------------------------------------------------- */

    setLoading(true);

    try {
      const data = {
        prenom: prenom.trim(),

        nom: nom.trim(),

        email: email.trim(),

        telephone:
          telephone.trim(),

        specialite:
          specialite.trim(),

        biographie:
          biographie.trim(),

        statut,
      };

      /* ======================================================
         MODIFICATION
      ====================================================== */

      if (isEditing) {
        const result =
          await updateFormateur(
            formateur.id,
            data
          );

        toast.success(
          result.message
        );

        onOpenChange(false);

        router.refresh();

        return;
      }

      /* ======================================================
         CRÉATION FORMATEUR
      ====================================================== */

      const result =
        await createFormateur(
          data
        );

      let passwordCreated = "";

      /* ======================================================
         CRÉATION COMPTE UTILISATEUR
      ====================================================== */

      if (creerCompte) {
        const emailFinal =
          emailCompte.trim() ||
          email.trim();

        try {
          const account =
            await createFormateurUserAccount(
              result.formateur.id,
              emailFinal
            );

          passwordCreated =
            account.motDePasseTemporaire;

          toast.success(
            "Formateur et compte utilisateur créés avec succès."
          );
        } catch (accountError: any) {
          /**
           * Le formateur existe mais le compte
           * n'a pas pu être créé.
           *
           * On avertit clairement l'utilisateur.
           */

          toast.warning(
            "Le formateur a été créé, mais son compte utilisateur n'a pas pu être créé."
          );

          await Swal.fire({
            title:
              "Formateur créé",

            text:
              accountError?.message ??
              "Le compte utilisateur n'a pas pu être créé. Vous pourrez le créer ultérieurement.",

            icon: "warning",

            confirmButtonText:
              "Compris",
          });
        }
      } else {
        toast.success(
          result.message
        );
      }

      /* ======================================================
         AFFICHER LE MOT DE PASSE
      ====================================================== */

      if (passwordCreated) {
        await Swal.fire({
          title:
            "Compte utilisateur créé",

          icon: "success",

          html: `
            <div style="text-align:left">

              <div style="
                border:1px solid #e2e8f0;
                background:#f8fafc;
                border-radius:12px;
                padding:16px;
                margin-bottom:10px;
              ">

                <div style="
                  font-size:12px;
                  color:#64748b;
                  margin-bottom:5px;
                ">
                  Email de connexion
                </div>

                <div style="
                  font-weight:600;
                  word-break:break-all;
                ">
                  ${(
                    emailCompte.trim() ||
                    email.trim()
                  )}
                </div>

              </div>

              <div style="
                border:1px solid #e2e8f0;
                background:#f8fafc;
                border-radius:12px;
                padding:16px;
              ">

                <div style="
                  font-size:12px;
                  color:#64748b;
                  margin-bottom:5px;
                ">
                  Mot de passe temporaire
                </div>

                <div style="
                  font-family:monospace;
                  font-size:20px;
                  font-weight:700;
                  letter-spacing:1px;
                ">
                  ${passwordCreated}
                </div>

              </div>

              <p style="
                font-size:12px;
                color:#64748b;
                margin-top:14px;
              ">
                Notez ce mot de passe et
                transmettez-le au formateur.
              </p>

            </div>
          `,

          confirmButtonText:
            "J'ai compris",
        });
      }

      onOpenChange(false);

      router.refresh();
    } catch (error: any) {
      toast.error(
        error?.message ??
          "Une erreur est survenue lors de l'enregistrement."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================================
     RENDU
  ========================================================== */

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">

      <div
        className="
          flex
          max-h-[92vh]
          w-full
          max-w-4xl
          flex-col
          overflow-hidden
          rounded-3xl
          border
          border-base-300
          bg-base-100
          shadow-2xl
        "
      >

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="flex shrink-0 items-center justify-between border-b border-base-300 bg-base-100 px-5 py-4 sm:px-7">

          <div className="flex min-w-0 items-center gap-4">

            <div className="
              flex
              h-12
              w-12
              shrink-0
              items-center
              justify-center
              rounded-2xl
              bg-primary/10
              text-primary
              ring-1
              ring-primary/10
            ">
              <UserRound size={23} />
            </div>

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <h2 className="truncate text-lg font-bold sm:text-xl">
                  {isEditing
                    ? "Modifier le formateur"
                    : "Nouveau formateur"}
                </h2>

                {isEditing && (
                  <span className="badge badge-sm badge-primary badge-outline">
                    Modification
                  </span>
                )}

              </div>

              <p className="mt-0.5 text-sm text-base-content/60">
                {isEditing
                  ? "Mettez à jour les informations professionnelles."
                  : "Ajoutez un nouveau formateur à votre centre."}
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="btn btn-sm btn-circle btn-ghost shrink-0"
          >
            <X size={19} />
          </button>

        </div>

        {/* ====================================================
            FORM
        ==================================================== */}

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >

          <div className="min-h-0 flex-1 overflow-y-auto">

            <div className="space-y-7 p-5 sm:p-7">

              {/* ==================================================
                  SECTION : INFORMATIONS PERSONNELLES
              ================================================== */}

              <section>

                <div className="mb-4 flex items-center gap-3">

                  <div className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-primary/10
                    text-primary
                  ">
                    <UserRound size={18} />
                  </div>

                  <div>
                    <h3 className="font-bold">
                      Informations personnelles
                    </h3>

                    <p className="text-xs text-base-content/55">
                      Identité et coordonnées du formateur.
                    </p>
                  </div>

                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  {/* PRENOM */}

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Prénom
                      <span className="ml-1 text-error">
                        *
                      </span>
                    </label>

                    <input
                      value={prenom}
                      onChange={(e) =>
                        setPrenom(
                          e.target.value
                        )
                      }
                      className="input input-bordered w-full"
                      placeholder="Jean"
                      disabled={loading}
                      autoComplete="given-name"
                    />
                  </div>

                  {/* NOM */}

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Nom
                      <span className="ml-1 text-error">
                        *
                      </span>
                    </label>

                    <input
                      value={nom}
                      onChange={(e) =>
                        setNom(
                          e.target.value
                        )
                      }
                      className="input input-bordered w-full"
                      placeholder="Mukhut"
                      disabled={loading}
                      autoComplete="family-name"
                    />
                  </div>

                  {/* EMAIL */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold">
                      E-mail professionnel
                    </label>

                    <div className="relative">

                      <Mail
                        size={17}
                        className="
                          pointer-events-none
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          text-base-content/40
                        "
                      />

                      <input
                        type="email"
                        value={email}
                        onChange={(e) =>
                          setEmail(
                            e.target.value
                          )
                        }
                        className="input input-bordered w-full pl-10"
                        placeholder="formateur@example.com"
                        disabled={loading}
                        autoComplete="email"
                      />

                    </div>

                  </div>

                  {/* TELEPHONE */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold">
                      Téléphone
                    </label>

                    <div className="relative">

                      <Phone
                        size={17}
                        className="
                          pointer-events-none
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          text-base-content/40
                        "
                      />

                      <input
                        value={telephone}
                        onChange={(e) =>
                          setTelephone(
                            e.target.value
                          )
                        }
                        className="input input-bordered w-full pl-10"
                        placeholder="+243 ..."
                        disabled={loading}
                        autoComplete="tel"
                      />

                    </div>

                  </div>

                </div>

              </section>

              <div className="divider my-0" />

              {/* ==================================================
                  SECTION : PROFIL PROFESSIONNEL
              ================================================== */}

              <section>

                <div className="mb-4 flex items-center gap-3">

                  <div className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-secondary/10
                    text-secondary
                  ">
                    <ShieldCheck size={18} />
                  </div>

                  <div>
                    <h3 className="font-bold">
                      Profil professionnel
                    </h3>

                    <p className="text-xs text-base-content/55">
                      Compétences, spécialité et statut.
                    </p>
                  </div>

                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  {/* SPECIALITE */}

                  <div className="md:col-span-2">

                    <label className="mb-2 block text-sm font-semibold">
                      Spécialité
                    </label>

                    <input
                      value={specialite}
                      onChange={(e) =>
                        setSpecialite(
                          e.target.value
                        )
                      }
                      className="input input-bordered w-full"
                      placeholder="Développement web, Comptabilité, Marketing..."
                      disabled={loading}
                    />

                  </div>

                  {/* STATUT */}

                  <div className="md:col-span-2">

                    <label className="mb-2 block text-sm font-semibold">
                      Statut
                    </label>

                    <select
                      value={statut}
                      onChange={(e) =>
                        setStatut(
                          e.target.value as StatutFormateur
                        )
                      }
                      className="select select-bordered w-full"
                      disabled={loading}
                    >
                      {STATUTS.map(
                        (item) => (
                          <option
                            key={item.value}
                            value={item.value}
                          >
                            {item.label}
                          </option>
                        )
                      )}
                    </select>

                    <p className="mt-1.5 text-xs text-base-content/50">
                      {
                        STATUTS.find(
                          (item) =>
                            item.value ===
                            statut
                        )?.description
                      }
                    </p>

                  </div>

                  {/* BIOGRAPHIE */}

                  <div className="md:col-span-2">

                    <label className="mb-2 block text-sm font-semibold">
                      Biographie
                    </label>

                    <textarea
                      value={biographie}
                      onChange={(e) =>
                        setBiographie(
                          e.target.value
                        )
                      }
                      className="
                        textarea
                        textarea-bordered
                        min-h-32
                        w-full
                        resize-y
                      "
                      placeholder="Présentez brièvement l'expérience, le parcours et les compétences du formateur..."
                      disabled={loading}
                    />

                    <p className="mt-1.5 text-xs text-base-content/50">
                      Une courte présentation professionnelle est recommandée.
                    </p>

                  </div>

                </div>

              </section>

              <div className="divider my-0" />

              {/* ==================================================
                  SECTION : COMPTE UTILISATEUR
              ================================================== */}

              <section>

                <div className="mb-4 flex items-center gap-3">

                  <div className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-success/10
                    text-success
                  ">
                    <KeyRound size={18} />
                  </div>

                  <div>
                    <h3 className="font-bold">
                      Compte utilisateur
                    </h3>

                    <p className="text-xs text-base-content/55">
                      Permettre au formateur de se connecter à la plateforme.
                    </p>
                  </div>

                </div>

                {/* COMPTE EXISTANT */}

                {isEditing &&
                  hasUserAccount && (
                    <div className="
                      rounded-2xl
                      border
                      border-success/20
                      bg-success/5
                      p-4
                    ">

                      <div className="flex items-start gap-3">

                        <div className="
                          flex
                          h-10
                          w-10
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-success/10
                          text-success
                        ">
                          <Check size={19} />
                        </div>

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <p className="font-semibold">
                              Compte utilisateur actif
                            </p>

                            <span className="badge badge-success badge-sm">
                              Compte créé
                            </span>

                          </div>

                          <p className="mt-1 break-all text-sm text-base-content/60">
                            {formateur.utilisateur?.email ??
                              "Adresse email non disponible"}
                          </p>

                        </div>

                      </div>

                    </div>
                  )}

                {/* NOUVEAU COMPTE */}

                {!isEditing && (
                  <div className="
                    rounded-2xl
                    border
                    border-base-300
                    bg-base-200/40
                    p-4
                    sm:p-5
                  ">

                    <label className="flex cursor-pointer items-start gap-3">

                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary mt-0.5"
                        checked={creerCompte}
                        onChange={(e) =>
                          setCreerCompte(
                            e.target.checked
                          )
                        }
                        disabled={loading}
                      />

                      <div>

                        <p className="font-semibold">
                          Créer un compte utilisateur
                        </p>

                        <p className="mt-1 text-sm text-base-content/55">
                          Le formateur pourra se connecter à la plateforme avec ce compte.
                        </p>

                      </div>

                    </label>

                    {creerCompte && (
                      <div className="mt-5 border-t border-base-300 pt-5">

                        <label className="mb-2 block text-sm font-semibold">
                          Email de connexion
                        </label>

                        <div className="relative">

                          <Mail
                            size={17}
                            className="
                              pointer-events-none
                              absolute
                              left-3
                              top-1/2
                              -translate-y-1/2
                              text-base-content/40
                            "
                          />

                          <input
                            type="email"
                            value={
                              emailCompte ||
                              email
                            }
                            onChange={(e) =>
                              setEmailCompte(
                                e.target.value
                              )
                            }
                            className="input input-bordered w-full pl-10"
                            placeholder="connexion@example.com"
                            disabled={loading}
                            autoComplete="email"
                          />

                        </div>

                        <div className="
                          mt-3
                          flex
                          items-start
                          gap-2
                          rounded-xl
                          bg-info/10
                          p-3
                          text-xs
                          text-info-content
                        ">

                          <ShieldCheck
                            size={16}
                            className="mt-0.5 shrink-0"
                          />

                          <p>
                            Un mot de passe temporaire sécurisé sera généré automatiquement et affiché après la création.
                          </p>

                        </div>

                      </div>
                    )}

                  </div>
                )}

                {/* CRÉER COMPTE SUR EXISTANT */}

                {isEditing &&
                  !hasUserAccount && (
                    <div className="
                      rounded-2xl
                      border
                      border-warning/30
                      bg-warning/5
                      p-4
                      sm:p-5
                    ">

                      <div className="flex items-start gap-3">

                        <div className="
                          flex
                          h-10
                          w-10
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-warning/10
                          text-warning
                        ">
                          <UserPlus size={19} />
                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="font-semibold">
                            Aucun compte utilisateur
                          </p>

                          <p className="mt-1 text-sm text-base-content/55">
                            Ce formateur n'a pas encore de compte. Vous pouvez lui en créer un.
                          </p>

                          <div className="mt-4">

                            <label className="mb-2 block text-sm font-semibold">
                              Email de connexion
                            </label>

                            <input
                              type="email"
                              value={
                                emailCompte ||
                                email
                              }
                              onChange={(e) =>
                                setEmailCompte(
                                  e.target.value
                                )
                              }
                              className="input input-bordered w-full bg-base-100"
                              placeholder="connexion@example.com"
                              disabled={loading}
                            />

                          </div>

                          <button
                            type="button"
                            onClick={
                              handleCreateAccountForExistingFormateur
                            }
                            disabled={loading}
                            className="btn btn-warning mt-4 w-full sm:w-auto"
                          >

                            {loading ? (
                              <Loader2
                                size={17}
                                className="animate-spin"
                              />
                            ) : (
                              <UserPlus
                                size={17}
                              />
                            )}

                            Créer le compte utilisateur

                          </button>

                        </div>

                      </div>

                    </div>
                  )}

              </section>

            </div>

          </div>

          {/* ==================================================
              FOOTER
          ================================================== */}

          <div className="
            shrink-0
            border-t
            border-base-300
            bg-base-100
            px-5
            py-4
            sm:px-7
          ">

            <div className="
              flex
              flex-col-reverse
              gap-3
              sm:flex-row
              sm:items-center
              sm:justify-between
            ">

              <p className="text-xs text-base-content/50">
                <span className="text-error">
                  *
                </span>{" "}
                Champs obligatoires
              </p>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">

                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={
                    handleClose
                  }
                  disabled={loading}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="btn btn-primary min-w-44"
                  disabled={loading}
                >

                  {loading ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save size={18} />

                      {isEditing
                        ? "Enregistrer"
                        : creerCompte
                          ? "Créer le formateur"
                          : "Créer le formateur"}
                    </>
                  )}

                </button>

              </div>

            </div>

          </div>

        </form>

      </div>

    </div>
  );
}