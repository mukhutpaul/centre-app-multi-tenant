
"use client";

import { useState, type FormEvent } from "react";

import {
  Eye,
  EyeOff,
  ShieldCheck,
  UserPlus,
  X,
  Mail,
  Phone,
  User,
  LockKeyhole,
  Building2,
  BriefcaseBusiness,
  Check,
  Ban,
} from "lucide-react";

import Swal from "sweetalert2";
import { toast } from "sonner";

import {
  createUtilisateur,
  createPremierUtilisateur,
  updateUtilisateur,
} from "@/actions/utilisateur.actions";

/* ============================================================
   TYPES
============================================================ */

type Role =
  | "PROPRIETAIRE"
  | "ADMINISTRATEUR"
  | "RESPONSABLE"
  | "SECRETAIRE"
  | "COMPTABLE"
  | "FORMATEUR"
  | "JURY"
  | "APPRENANT";

type Utilisateur = {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  statut: string;
};

type Membre = {
  id: string;
  role: Role;
  statut: string;
  utilisateur: Utilisateur;
};

type Centre = {
  id: string;
  nom: string;
  code?: string;
};

type Props = {
  open: boolean;
  membre: Membre | null;
  centre?: Centre | null;

  /**
   * true = création du premier utilisateur du centre.
   * Le rôle sera obligatoirement PROPRIETAIRE.
   */
  firstUser?: boolean;

  /**
   * Rôle de l'utilisateur actuellement connecté.
   *
   * IMPORTANT :
   * Le serveur reste toujours l'autorité finale.
   */
  currentRole?: Role | null;

  onClose: () => void;
  onSuccess: () => void;
};

/* ============================================================
   RÔLES
============================================================ */

const ROLE_OPTIONS: {
  value: Role;
  label: string;
  description: string;
}[] = [
  {
    value: "PROPRIETAIRE",
    label: "Propriétaire",
    description:
      "Accès complet à la gestion du centre et de ses utilisateurs.",
  },
  {
    value: "ADMINISTRATEUR",
    label: "Administrateur",
    description:
      "Gestion avancée du centre, des utilisateurs et des paramètres.",
  },
  {
    value: "RESPONSABLE",
    label: "Responsable",
    description:
      "Supervision opérationnelle du centre et de ses activités.",
  },
  {
    value: "SECRETAIRE",
    label: "Secrétaire",
    description:
      "Gestion administrative, dossiers et opérations courantes.",
  },
  {
    value: "COMPTABLE",
    label: "Comptable",
    description:
      "Gestion financière, paiements et opérations comptables.",
  },
  {
    value: "FORMATEUR",
    label: "Formateur",
    description:
      "Gestion des formations et activités pédagogiques.",
  },
  {
    value: "JURY",
    label: "Jury",
    description:
      "Participation aux évaluations, examens et jurys.",
  },
  {
    value: "APPRENANT",
    label: "Apprenant",
    description:
      "Accès aux fonctionnalités destinées aux apprenants.",
  },
];

/* ============================================================
   LABEL RÔLE
============================================================ */

function getRoleLabel(value: Role): string {
  return (
    ROLE_OPTIONS.find((item) => item.value === value)?.label ?? value
  );
}

/* ============================================================
   DESCRIPTION RÔLE
============================================================ */

function getRoleDescription(value: Role): string {
  return (
    ROLE_OPTIONS.find((item) => item.value === value)?.description ??
    "Rôle utilisateur."
  );
}

/* ============================================================
   RÔLE AUTORISÉ
============================================================ */

/**
 * Détermine si le rôle peut être sélectionné dans l'interface.
 *
 * Règle actuelle :
 *
 * PROPRIETAIRE :
 *   → peut attribuer tous les rôles.
 *
 * ADMINISTRATEUR :
 *   → peut attribuer tous les rôles sauf PROPRIETAIRE.
 *
 * RESPONSABLE et autres :
 *   → aucun rôle ne peut être attribué.
 *
 * IMPORTANT :
 * Cette fonction est uniquement destinée à l'interface.
 * Le serveur doit appliquer exactement les règles de sécurité.
 */
function peutSelectionnerRole(
  currentRole: Role | null | undefined,
  roleAAttribuer: Role,
): boolean {
  if (currentRole === "PROPRIETAIRE") {
    return true;
  }

  if (currentRole === "ADMINISTRATEUR") {
    return roleAAttribuer !== "PROPRIETAIRE";
  }

  return false;
}

/* ============================================================
   COMPOSANT PRINCIPAL
============================================================ */

export default function UtilisateurModal(props: Props) {
  const {
    open,
    membre,
    centre,
    firstUser = false,
    currentRole = null,
    onClose,
    onSuccess,
  } = props;

  if (!open) {
    return null;
  }

  /**
   * La clé force le formulaire interne à être recréé lorsque
   * l'utilisateur, le centre ou le contexte d'autorisation change.
   *
   * Cela permet de ne pas utiliser useEffect pour réinitialiser
   * les champs du formulaire.
   */
  const formKey = [
    firstUser ? "first" : "normal",
    membre?.id ?? "new",
    centre?.id ?? "no-centre",
    currentRole ?? "no-current-role",
  ].join("-");

  return (
    <UtilisateurModalForm
      key={formKey}
      membre={membre}
      centre={centre}
      firstUser={firstUser}
      currentRole={currentRole}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

/* ============================================================
   FORMULAIRE INTERNE
============================================================ */

function UtilisateurModalForm({
  membre,
  centre,
  firstUser,
  currentRole,
  onClose,
  onSuccess,
}: Omit<Props, "open">) {
  /* ==========================================================
     VALEURS INITIALES
  ========================================================== */

  /**
   * Premier utilisateur :
   * toujours PROPRIETAIRE.
   *
   * Modification :
   * on conserve son rôle actuel.
   *
   * Création normale :
   * si le rôle connecté est propriétaire ou administrateur,
   * on prend le premier rôle autorisé.
   *
   * Si aucune autorisation n'est connue, RESPONSABLE est utilisé
   * uniquement comme valeur technique temporaire.
   * Le serveur décidera toujours.
   */
  const roleInitial: Role = firstUser
    ? "PROPRIETAIRE"
    : membre?.role ??
      (currentRole === "PROPRIETAIRE"
        ? "ADMINISTRATEUR"
        : currentRole === "ADMINISTRATEUR"
          ? "RESPONSABLE"
          : "RESPONSABLE");

  /* ==========================================================
     ÉTATS
  ========================================================== */

  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState(
    membre?.utilisateur.email ?? "",
  );

  const [prenom, setPrenom] = useState(
    membre?.utilisateur.prenom ?? "",
  );

  const [nom, setNom] = useState(
    membre?.utilisateur.nom ?? "",
  );

  const [telephone, setTelephone] = useState(
    membre?.utilisateur.telephone ?? "",
  );

  const [motDePasse, setMotDePasse] = useState("");

  const [
    confirmationMotDePasse,
    setConfirmationMotDePasse,
  ] = useState("");

  const [role, setRole] = useState<Role>(roleInitial);

  const [showPassword, setShowPassword] = useState(false);

  const [
    showConfirmation,
    setShowConfirmation,
  ] = useState(false);

  /* ==========================================================
     CONTEXTE
  ========================================================== */

  const roleActuel = membre?.role ?? null;

  const roleSelectionnable = (
    roleAAttribuer: Role,
  ): boolean => {
    /**
     * Premier utilisateur :
     * le rôle est imposé.
     */
    if (firstUser) {
      return roleAAttribuer === "PROPRIETAIRE";
    }

    return peutSelectionnerRole(
      currentRole,
      roleAAttribuer,
    );
  };

  const canChooseRole =
    !firstUser &&
    (currentRole === "PROPRIETAIRE" ||
      currentRole === "ADMINISTRATEUR");

  /* ==========================================================
     VALIDATION
  ========================================================== */

  const validateForm = (): boolean => {
    const emailValue = email.trim();

    if (!emailValue) {
      toast.error(
        "L'adresse e-mail est obligatoire.",
      );

      return false;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        emailValue,
      )
    ) {
      toast.error(
        "Veuillez saisir une adresse e-mail valide.",
      );

      return false;
    }

    if (
      firstUser &&
      !centre?.id
    ) {
      toast.error(
        "Aucun centre n'est associé à ce formulaire.",
      );

      return false;
    }

    /**
     * Le premier utilisateur doit obligatoirement être
     * propriétaire.
     */
    if (
      firstUser &&
      role !== "PROPRIETAIRE"
    ) {
      toast.error(
        "Le premier utilisateur doit être propriétaire du centre.",
      );

      return false;
    }

    /**
     * Création normale ou modification de rôle.
     *
     * On ne bloque pas l'ouverture du formulaire.
     * On vérifie uniquement au moment de l'enregistrement.
     */
    if (
      !firstUser &&
      !membre &&
      !currentRole
    ) {
      toast.error(
        "Impossible de déterminer vos permissions. Veuillez actualiser la page.",
      );

      return false;
    }

    /**
     * Si l'utilisateur tente de sélectionner un rôle
     * qu'il n'est pas autorisé à attribuer.
     */
    if (
      !firstUser &&
      !membre &&
      !roleSelectionnable(role)
    ) {
      toast.error(
        "Vous n'êtes pas autorisé à attribuer ce rôle.",
      );

      return false;
    }

    /**
     * En modification, vérifier seulement si le rôle
     * a réellement changé.
     */
    if (
      !firstUser &&
      membre &&
      role !== membre.role &&
      !roleSelectionnable(role)
    ) {
      toast.error(
        "Vous n'êtes pas autorisé à modifier le rôle de cet utilisateur.",
      );

      return false;
    }

    /**
     * Mot de passe obligatoire uniquement à la création.
     */
    if (
      !membre &&
      !motDePasse
    ) {
      toast.error(
        "Le mot de passe est obligatoire.",
      );

      return false;
    }

    /**
     * Longueur minimale.
     */
    if (
      motDePasse &&
      motDePasse.length < 8
    ) {
      toast.error(
        "Le mot de passe doit contenir au moins 8 caractères.",
      );

      return false;
    }

    /**
     * Confirmation.
     */
    if (
      motDePasse &&
      motDePasse !== confirmationMotDePasse
    ) {
      toast.error(
        "Les deux mots de passe ne correspondent pas.",
      );

      return false;
    }

    return true;
  };

  /* ==========================================================
     SOUMISSION
  ========================================================== */

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    /**
     * Premier utilisateur :
     * toujours propriétaire.
     *
     * Sinon :
     * rôle sélectionné.
     */
    const roleFinal: Role = firstUser
      ? "PROPRIETAIRE"
      : role;

    /* ========================================================
       CONFIRMATION SWEETALERT
    ======================================================== */

    const confirmation = await Swal.fire({
      title: firstUser
        ? "Créer le propriétaire ?"
        : membre
          ? "Enregistrer les modifications ?"
          : "Créer l'utilisateur ?",

      text: firstUser
        ? `Le compte ${email.trim()} deviendra propriétaire du centre ${centre?.nom ?? ""}.`
        : membre
          ? `Vous êtes sur le point de modifier le compte ${email.trim()}.`
          : `Vous êtes sur le point de créer le compte ${email.trim()} avec le rôle ${getRoleLabel(roleFinal)}.`,

      icon: "question",

      showCancelButton: true,

      confirmButtonText: firstUser
        ? "Oui, créer"
        : membre
          ? "Oui, enregistrer"
          : "Oui, créer",

      cancelButtonText: "Annuler",

      confirmButtonColor: "#0f5da8",

      reverseButtons: true,

      focusCancel: true,
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    /* ========================================================
       ENREGISTREMENT
    ======================================================== */

    try {
      setLoading(true);

      const payload = {
        email: email.trim(),
        prenom: prenom.trim(),
        nom: nom.trim(),
        telephone: telephone.trim(),
        motDePasse,
        role: roleFinal,
      };

      /* ======================================================
         PREMIER UTILISATEUR
      ====================================================== */

      if (
        firstUser &&
        centre?.id
      ) {
        const response =
          await createPremierUtilisateur(
            centre.id,
            payload,
          );

        if (!response.success) {
          toast.error(
            response.message,
          );

          return;
        }

        toast.success(
          response.message,
        );

        onSuccess();
        onClose();

        return;
      }

      /* ======================================================
         MODIFICATION
      ====================================================== */

      if (membre) {
        const response =
          await updateUtilisateur(
            membre.utilisateur.id,
            payload,
          );

        if (!response.success) {
          toast.error(
            response.message,
          );

          return;
        }

        toast.success(
          response.message,
        );

        onSuccess();
        onClose();

        return;
      }

      /* ======================================================
         CRÉATION NORMALE
      ====================================================== */

      const response =
        await createUtilisateur(
          payload,
        );

      if (!response.success) {
        toast.error(
          response.message,
        );

        return;
      }

      toast.success(
        response.message,
      );

      onSuccess();
      onClose();
    } catch (error) {
      console.error(
        "Erreur utilisateur :",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de l'opération.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     FERMETURE
  ========================================================== */

  const handleClose = () => {
    if (loading) {
      return;
    }

    onClose();
  };

  /* ==========================================================
     TITRE
  ========================================================== */

  const title = firstUser
    ? "Créer le premier utilisateur"
    : membre
      ? "Modifier l'utilisateur"
      : "Nouvel utilisateur";

  const description = firstUser
    ? "Le premier utilisateur deviendra automatiquement propriétaire du centre."
    : membre
      ? "Modifiez les informations du compte et, si autorisé, son rôle."
      : "Créez un compte utilisateur pour votre centre.";

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <dialog
      open
      className="modal modal-open"
    >
      <div
        className="
          modal-box
          w-11/12
          max-w-3xl
          max-h-[92vh]
          overflow-hidden
          rounded-3xl
          bg-white
          p-0
          shadow-2xl
          dark:bg-slate-900
        "
      >
        {/* ==================================================
            CONTENU SCROLLABLE
        ================================================== */}

        <div className="max-h-[92vh] overflow-y-auto">
          {/* ================================================
              HEADER
          ================================================= */}

          <div
            className="
              relative
              overflow-hidden
              rounded-t-3xl
              bg-gradient-to-br
              from-[#0f5da8]
              via-[#126bbd]
              to-[#0b477e]
              px-6
              py-7
              text-white
            "
          >
            <div
              className="
                absolute
                -right-12
                -top-12
                h-36
                w-36
                rounded-full
                bg-white/10
              "
            />

            <div
              className="
                absolute
                -bottom-20
                -left-10
                h-44
                w-44
                rounded-full
                bg-white/5
              "
            />

            <div
              className="
                relative
                flex
                items-start
                justify-between
                gap-4
              "
            >
              <div className="flex min-w-0 items-center gap-4">
                <div
                  className="
                    flex
                    h-14
                    w-14
                    shrink-0
                    items-center
                    justify-center
                    rounded-2xl
                    bg-white/15
                    ring-1
                    ring-white/20
                  "
                >
                  {firstUser ? (
                    <ShieldCheck size={28} />
                  ) : (
                    <UserPlus size={28} />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="text-xl font-bold">
                    {title}
                  </h3>

                  <p className="mt-1 text-sm text-blue-100">
                    {description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                aria-label="Fermer"
                className="
                  btn
                  btn-circle
                  btn-sm
                  shrink-0
                  border-0
                  bg-white/10
                  text-white
                  hover:bg-white/20
                "
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ================================================
              CENTRE
          ================================================= */}

          {firstUser && centre && (
            <div className="px-6 pt-5">
              <div
                className="
                  flex
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-blue-100
                  bg-blue-50
                  p-4
                  dark:border-blue-900/40
                  dark:bg-blue-950/30
                "
              >
                <div
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-white
                    text-[#0f5da8]
                    shadow-sm
                    dark:bg-slate-800
                  "
                >
                  <Building2 size={20} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                    Centre sélectionné
                  </p>

                  <p className="truncate font-bold text-slate-900 dark:text-white">
                    {centre.nom}
                  </p>

                  {centre.code && (
                    <p className="font-mono text-xs text-slate-500">
                      {centre.code}
                    </p>
                  )}
                </div>

                <span
                  className="
                    badge
                    badge-info
                    ml-auto
                    shrink-0
                  "
                >
                  PROPRIÉTAIRE
                </span>
              </div>
            </div>
          )}

          {/* ================================================
              FORMULAIRE
          ================================================= */}

          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-6 p-6"
          >
            {/* ==============================================
                IDENTITÉ
            =============================================== */}

            <section>
              <div className="mb-4">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Informations personnelles
                </h4>

                <p className="text-xs text-slate-500">
                  Renseignez l'identité de l'utilisateur.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* PRÉNOM */}

                <label className="form-control">
                  <span
                    className="
                      mb-2
                      flex
                      items-center
                      gap-2
                      text-sm
                      font-medium
                      text-slate-700
                      dark:text-slate-300
                    "
                  >
                    <User size={15} />
                    Prénom
                  </span>

                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) =>
                      setPrenom(e.target.value)
                    }
                    disabled={loading}
                    autoComplete="given-name"
                    className="
                      input
                      input-bordered
                      w-full
                      rounded-xl
                      bg-slate-50
                      focus:border-[#0f5da8]
                      focus:outline-none
                      dark:bg-slate-800
                    "
                    placeholder="Jean"
                  />
                </label>

                {/* NOM */}

                <label className="form-control">
                  <span
                    className="
                      mb-2
                      flex
                      items-center
                      gap-2
                      text-sm
                      font-medium
                      text-slate-700
                      dark:text-slate-300
                    "
                  >
                    <User size={15} />
                    Nom
                  </span>

                  <input
                    type="text"
                    value={nom}
                    onChange={(e) =>
                      setNom(e.target.value)
                    }
                    disabled={loading}
                    autoComplete="family-name"
                    className="
                      input
                      input-bordered
                      w-full
                      rounded-xl
                      bg-slate-50
                      focus:border-[#0f5da8]
                      focus:outline-none
                      dark:bg-slate-800
                    "
                    placeholder="Mukhut"
                  />
                </label>
              </div>
            </section>

            {/* ==============================================
                COORDONNÉES
            =============================================== */}

            <section>
              <div className="mb-4">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Coordonnées
                </h4>

                <p className="text-xs text-slate-500">
                  Ces informations seront associées au compte.
                </p>
              </div>

              <div className="space-y-4">
                {/* EMAIL */}

                <label className="form-control">
                  <span
                    className="
                      mb-2
                      flex
                      items-center
                      gap-2
                      text-sm
                      font-medium
                      text-slate-700
                      dark:text-slate-300
                    "
                  >
                    <Mail size={15} />

                    Adresse e-mail

                    <span className="text-red-500">
                      *
                    </span>
                  </span>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    disabled={loading}
                    autoComplete="email"
                    className="
                      input
                      input-bordered
                      w-full
                      rounded-xl
                      bg-slate-50
                      focus:border-[#0f5da8]
                      focus:outline-none
                      dark:bg-slate-800
                    "
                    placeholder="utilisateur@exemple.com"
                  />
                </label>

                {/* TÉLÉPHONE */}

                <label className="form-control">
                  <span
                    className="
                      mb-2
                      flex
                      items-center
                      gap-2
                      text-sm
                      font-medium
                      text-slate-700
                      dark:text-slate-300
                    "
                  >
                    <Phone size={15} />
                    Téléphone
                  </span>

                  <input
                    type="tel"
                    value={telephone}
                    onChange={(e) =>
                      setTelephone(e.target.value)
                    }
                    disabled={loading}
                    autoComplete="tel"
                    className="
                      input
                      input-bordered
                      w-full
                      rounded-xl
                      bg-slate-50
                      focus:border-[#0f5da8]
                      focus:outline-none
                      dark:bg-slate-800
                    "
                    placeholder="+243 ..."
                  />
                </label>
              </div>
            </section>

            {/* ==============================================
                RÔLE
            =============================================== */}

            <section>
              <div className="mb-4">
                <h4
                  className="
                    flex
                    items-center
                    gap-2
                    font-bold
                    text-slate-900
                    dark:text-white
                  "
                >
                  <BriefcaseBusiness size={17} />

                  Rôle et autorisations
                </h4>

                <p className="mt-1 text-xs text-slate-500">
                  Sélectionnez le rôle de cet utilisateur dans
                  le centre.
                </p>
              </div>

              {/* ============================================
                  PREMIER UTILISATEUR
              ============================================= */}

              {firstUser ? (
                <div
                  className="
                    rounded-2xl
                    border
                    border-emerald-200
                    bg-emerald-50
                    p-4
                    dark:border-emerald-900/40
                    dark:bg-emerald-950/20
                  "
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-emerald-100
                        text-emerald-600
                        dark:bg-emerald-900/40
                      "
                    >
                      <ShieldCheck size={21} />
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold text-emerald-800 dark:text-emerald-300">
                        Propriétaire
                      </p>

                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        Accès complet à la gestion du centre.
                      </p>
                    </div>

                    <span className="badge badge-success ml-auto">
                      Actif
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {/* ========================================
                      LES 8 RÔLES SONT TOUJOURS AFFICHÉS
                  ========================================= */}

                  <div className="grid gap-3 sm:grid-cols-2">
                    {ROLE_OPTIONS.map((option) => {
                      const selected =
                        role === option.value;

                      const selectable =
                        roleSelectionnable(
                          option.value,
                        );

                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={
                            loading ||
                            !selectable
                          }
                          onClick={() => {
                            if (!selectable) {
                              return;
                            }

                            setRole(
                              option.value,
                            );
                          }}
                          className={`
                            group
                            relative
                            rounded-2xl
                            border
                            p-4
                            text-left
                            transition-all
                            duration-200

                            ${
                              selected &&
                              selectable
                                ? `
                                  border-[#0f5da8]
                                  bg-blue-50
                                  shadow-md
                                  ring-2
                                  ring-blue-100
                                  dark:border-blue-500
                                  dark:bg-blue-950/30
                                  dark:ring-blue-900/30
                                `
                                : selectable
                                  ? `
                                    border-slate-200
                                    bg-white
                                    hover:border-blue-300
                                    hover:bg-slate-50
                                    hover:shadow-sm
                                    dark:border-slate-700
                                    dark:bg-slate-800
                                    dark:hover:border-blue-700
                                  `
                                  : `
                                    cursor-not-allowed
                                    border-slate-200
                                    bg-slate-100/80
                                    opacity-60
                                    dark:border-slate-700
                                    dark:bg-slate-800/60
                                  `
                            }
                          `}
                        >
                          {/* ==================================
                              INDICATEUR
                          =================================== */}

                          <div
                            className={`
                              absolute
                              right-3
                              top-3
                              flex
                              h-6
                              w-6
                              items-center
                              justify-center
                              rounded-full

                              ${
                                selected &&
                                selectable
                                  ? `
                                    bg-[#0f5da8]
                                    text-white
                                  `
                                  : !selectable
                                    ? `
                                      bg-slate-200
                                      text-slate-400
                                      dark:bg-slate-700
                                    `
                                    : `
                                      border
                                      border-slate-300
                                      bg-white
                                      dark:border-slate-600
                                      dark:bg-slate-800
                                    `
                              }
                            `}
                          >
                            {selected &&
                            selectable ? (
                              <Check
                                size={14}
                                strokeWidth={3}
                              />
                            ) : !selectable ? (
                              <Ban size={13} />
                            ) : null}
                          </div>

                          {/* ==================================
                              CONTENU
                          =================================== */}

                          <div className="pr-8">
                            <p
                              className={`
                                font-bold

                                ${
                                  selected &&
                                  selectable
                                    ? `
                                      text-[#0f5da8]
                                      dark:text-blue-400
                                    `
                                    : !selectable
                                      ? `
                                        text-slate-500
                                        dark:text-slate-500
                                      `
                                      : `
                                        text-slate-800
                                        dark:text-slate-200
                                      `
                                }
                              `}
                            >
                              {option.label}
                            </p>

                            <p
                              className="
                                mt-1
                                text-xs
                                leading-5
                                text-slate-500
                                dark:text-slate-400
                              "
                            >
                              {option.description}
                            </p>

                            {/* RÔLE ACTUEL */}

                            {roleActuel ===
                              option.value && (
                              <span
                                className="
                                  mt-2
                                  inline-flex
                                  items-center
                                  rounded-full
                                  bg-blue-100
                                  px-2
                                  py-0.5
                                  text-[10px]
                                  font-semibold
                                  text-blue-700
                                  dark:bg-blue-900/40
                                  dark:text-blue-300
                                "
                              >
                                Rôle actuel
                              </span>
                            )}

                            {/* NON AUTORISÉ */}

                            {!selectable &&
                              currentRole && (
                                <p className="mt-2 text-[10px] font-medium text-slate-400">
                                  Non disponible avec votre
                                  niveau d'autorisation.
                                </p>
                              )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* ========================================
                      INFORMATION PERMISSIONS
                  ========================================= */}

                  {!currentRole && (
                    <div
                      className="
                        mt-4
                        rounded-xl
                        border
                        border-amber-200
                        bg-amber-50
                        px-4
                        py-3
                        text-xs
                        text-amber-700
                        dark:border-amber-900/40
                        dark:bg-amber-950/20
                        dark:text-amber-300
                      "
                    >
                      <div className="flex items-start gap-2">
                        <ShieldCheck
                          size={16}
                          className="mt-0.5 shrink-0"
                        />

                        <div>
                          <p className="font-semibold">
                            Autorisations en cours de
                            chargement
                          </p>

                          <p className="mt-1">
                            Les rôles sont affichés, mais leur
                            attribution sera vérifiée par le
                            serveur lors de l'enregistrement.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentRole ===
                    "PROPRIETAIRE" && (
                    <div
                      className="
                        mt-4
                        rounded-xl
                        border
                        border-emerald-200
                        bg-emerald-50
                        px-4
                        py-3
                        text-xs
                        text-emerald-700
                        dark:border-emerald-900/40
                        dark:bg-emerald-950/20
                        dark:text-emerald-300
                      "
                    >
                      <div className="flex items-start gap-2">
                        <ShieldCheck
                          size={16}
                          className="mt-0.5 shrink-0"
                        />

                        <div>
                          <p className="font-semibold">
                            Vous êtes propriétaire
                          </p>

                          <p className="mt-1">
                            Vous pouvez attribuer les différents
                            rôles disponibles dans votre centre.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentRole ===
                    "ADMINISTRATEUR" && (
                    <div
                      className="
                        mt-4
                        rounded-xl
                        border
                        border-blue-200
                        bg-blue-50
                        px-4
                        py-3
                        text-xs
                        text-blue-700
                        dark:border-blue-900/40
                        dark:bg-blue-950/20
                        dark:text-blue-300
                      "
                    >
                      <div className="flex items-start gap-2">
                        <BriefcaseBusiness
                          size={16}
                          className="mt-0.5 shrink-0"
                        />

                        <div>
                          <p className="font-semibold">
                            Droits administrateur
                          </p>

                          <p className="mt-1">
                            Le rôle Propriétaire ne peut pas être
                            attribué depuis ce compte.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!firstUser &&
                    membre &&
                    !canChooseRole && (
                      <div
                        className="
                          mt-4
                          rounded-xl
                          border
                          border-slate-200
                          bg-slate-50
                          px-4
                          py-3
                          text-xs
                          text-slate-600
                          dark:border-slate-700
                          dark:bg-slate-800/60
                          dark:text-slate-400
                        "
                      >
                        <div className="flex items-center gap-2">
                          <Ban size={16} />

                          <span>
                            Vous pouvez consulter le rôle actuel,
                            mais vous ne pouvez pas le modifier.
                          </span>
                        </div>
                      </div>
                    )}
                </>
              )}

              {/* ============================================
                  DESCRIPTION DU RÔLE SÉLECTIONNÉ
              ============================================= */}

              {!firstUser &&
                role && (
                  <div
                    className="
                      mt-3
                      rounded-xl
                      border
                      border-blue-100
                      bg-blue-50
                      px-4
                      py-3
                      text-xs
                      text-blue-700
                      dark:border-blue-900/40
                      dark:bg-blue-950/30
                      dark:text-blue-300
                    "
                  >
                    <strong>
                      {getRoleLabel(role)}
                    </strong>

                    {" — "}

                    {getRoleDescription(role)}
                  </div>
                )}
            </section>

            {/* ==============================================
                MOT DE PASSE
            =============================================== */}

            <section>
              <div className="mb-4">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Sécurité du compte
                </h4>

                <p className="text-xs text-slate-500">
                  {membre
                    ? "Laissez les champs vides si vous ne souhaitez pas modifier le mot de passe."
                    : "Utilisez au minimum 8 caractères."}
                </p>
              </div>

              <div className="space-y-4">
                {/* MOT DE PASSE */}

                <label className="form-control">
                  <span
                    className="
                      mb-2
                      flex
                      items-center
                      gap-2
                      text-sm
                      font-medium
                      text-slate-700
                      dark:text-slate-300
                    "
                  >
                    <LockKeyhole size={15} />

                    Mot de passe

                    {!membre && (
                      <span className="text-red-500">
                        *
                      </span>
                    )}
                  </span>

                  <div className="relative">
                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={motDePasse}
                      onChange={(e) =>
                        setMotDePasse(
                          e.target.value,
                        )
                      }
                      disabled={loading}
                      autoComplete={
                        membre
                          ? "new-password"
                          : "new-password"
                      }
                      className="
                        input
                        input-bordered
                        w-full
                        rounded-xl
                        bg-slate-50
                        pr-12
                        focus:border-[#0f5da8]
                        focus:outline-none
                        dark:bg-slate-800
                      "
                      placeholder={
                        membre
                          ? "Laisser vide pour conserver l'actuel"
                          : "Minimum 8 caractères"
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) =>
                            !value,
                        )
                      }
                      disabled={loading}
                      aria-label={
                        showPassword
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                      className="
                        absolute
                        right-2
                        top-1/2
                        flex
                        h-9
                        w-9
                        -translate-y-1/2
                        items-center
                        justify-center
                        rounded-lg
                        text-slate-400
                        hover:bg-slate-200
                        dark:hover:bg-slate-700
                      "
                    >
                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </label>

                {/* CONFIRMATION */}

                <label className="form-control">
                  <span
                    className="
                      mb-2
                      flex
                      items-center
                      gap-2
                      text-sm
                      font-medium
                      text-slate-700
                      dark:text-slate-300
                    "
                  >
                    <LockKeyhole size={15} />

                    Confirmation du mot de passe

                    {!membre && (
                      <span className="text-red-500">
                        *
                      </span>
                    )}
                  </span>

                  <div className="relative">
                    <input
                      type={
                        showConfirmation
                          ? "text"
                          : "password"
                      }
                      value={
                        confirmationMotDePasse
                      }
                      onChange={(e) =>
                        setConfirmationMotDePasse(
                          e.target.value,
                        )
                      }
                      disabled={loading}
                      autoComplete="new-password"
                      className={`
                        input
                        input-bordered
                        w-full
                        rounded-xl
                        bg-slate-50
                        pr-12
                        focus:outline-none
                        dark:bg-slate-800

                        ${
                          confirmationMotDePasse &&
                          motDePasse !==
                            confirmationMotDePasse
                            ? "border-red-400"
                            : confirmationMotDePasse &&
                                motDePasse ===
                                  confirmationMotDePasse
                              ? "border-green-500"
                              : ""
                        }
                      `}
                      placeholder={
                        membre
                          ? "Laisser vide pour conserver l'actuel"
                          : "Retapez le mot de passe"
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmation(
                          (value) =>
                            !value,
                        )
                      }
                      disabled={loading}
                      aria-label={
                        showConfirmation
                          ? "Masquer la confirmation"
                          : "Afficher la confirmation"
                      }
                      className="
                        absolute
                        right-2
                        top-1/2
                        flex
                        h-9
                        w-9
                        -translate-y-1/2
                        items-center
                        justify-center
                        rounded-lg
                        text-slate-400
                        hover:bg-slate-200
                        dark:hover:bg-slate-700
                      "
                    >
                      {showConfirmation ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>

                  {confirmationMotDePasse &&
                    motDePasse !==
                      confirmationMotDePasse && (
                      <span className="mt-1 text-xs text-red-500">
                        Les mots de passe ne correspondent
                        pas.
                      </span>
                    )}

                  {confirmationMotDePasse &&
                    motDePasse ===
                      confirmationMotDePasse && (
                      <span className="mt-1 text-xs font-medium text-green-600">
                        ✓ Les mots de passe correspondent.
                      </span>
                    )}
                </label>
              </div>
            </section>

            {/* ==============================================
                FOOTER
            =============================================== */}

            <div
              className="
                flex
                flex-col-reverse
                gap-3
                border-t
                border-slate-200
                pt-5
                sm:flex-row
                sm:justify-end
                dark:border-slate-800
              "
            >
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="
                  btn
                  rounded-xl
                  bg-white
                  px-6
                  dark:bg-slate-800
                "
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={loading}
                className="
                  btn
                  rounded-xl
                  border-0
                  bg-[#0f5da8]
                  px-7
                  text-white
                  shadow-lg
                  shadow-blue-900/20
                  hover:bg-[#0c4d8c]
                  disabled:opacity-50
                "
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    {firstUser ? (
                      <ShieldCheck size={17} />
                    ) : (
                      <UserPlus size={17} />
                    )}

                    {firstUser
                      ? "Créer le propriétaire"
                      : membre
                        ? "Enregistrer les modifications"
                        : "Créer l'utilisateur"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ======================================================
          BACKDROP
      ====================================================== */}

      <form
        method="dialog"
        className="modal-backdrop"
      >
        <button
          type="button"
          onClick={handleClose}
        >
          close
        </button>
      </form>
    </dialog>
  );
}