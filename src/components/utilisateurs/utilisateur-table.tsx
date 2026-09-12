"use client";

import { useMemo, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "sonner";

import {
  Pencil,
  Trash2,
  UserPlus,
  Search,
  Users,
  Mail,
  Phone,
  ShieldCheck,
  MoreHorizontal,
  LockKeyhole,
} from "lucide-react";

import { deleteUtilisateur } from "@/actions/utilisateur.actions";

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

type Props = {
  membres: Membre[];

  /**
   * Rôle de l'utilisateur actuellement connecté
   *
   * IMPORTANT :
   * Il doit être fourni par le composant parent.
   */
  currentRole?: Role | null;

  onEdit?: (membre: Membre) => void;
  onAdd?: () => void;
  onRefresh?: () => void;
};

/* ============================================================
   CONFIGURATION DES RÔLES
============================================================ */

const ROLE_CONFIG: Record<
  Role,
  {
    label: string;
    className: string;
  }
> = {
  PROPRIETAIRE: {
    label: "Propriétaire",
    className:
      "badge-primary bg-primary/10 text-primary border-primary/20",
  },

  ADMINISTRATEUR: {
    label: "Administrateur",
    className:
      "badge-secondary bg-secondary/10 text-secondary border-secondary/20",
  },

  RESPONSABLE: {
    label: "Responsable",
    className:
      "badge-accent bg-accent/10 text-accent border-accent/20",
  },

  SECRETAIRE: {
    label: "Secrétaire",
    className:
      "badge-info bg-info/10 text-info border-info/20",
  },

  COMPTABLE: {
    label: "Comptable",
    className:
      "badge-success bg-success/10 text-success border-success/20",
  },

  FORMATEUR: {
    label: "Formateur",
    className:
      "badge-warning bg-warning/10 text-warning border-warning/20",
  },

  JURY: {
    label: "Jury",
    className:
      "badge-neutral bg-base-300 text-base-content border-base-300",
  },

  APPRENANT: {
    label: "Apprenant",
    className:
      "badge-ghost bg-base-200 text-base-content border-base-300",
  },
};

/* ============================================================
   LABEL DU RÔLE
============================================================ */

function getRoleConfig(role: Role) {
  return (
    ROLE_CONFIG[role] ?? {
      label: role,
      className:
        "bg-base-200 text-base-content border-base-300",
    }
  );
}

/* ============================================================
   STATUT
============================================================ */

function getStatutConfig(statut: string) {
  switch (statut) {
    case "ACTIF":
      return {
        label: "Actif",
        className:
          "bg-success/10 text-success border-success/20",
        dot: "bg-success",
      };

    case "SUSPENDU":
      return {
        label: "Suspendu",
        className:
          "bg-warning/10 text-warning border-warning/20",
        dot: "bg-warning",
      };

    case "INVITE":
      return {
        label: "Invité",
        className:
          "bg-info/10 text-info border-info/20",
        dot: "bg-info",
      };

    case "INACTIF":
      return {
        label: "Inactif",
        className:
          "bg-base-200 text-base-content/60 border-base-300",
        dot: "bg-base-content/40",
      };

    case "RETIRE":
      return {
        label: "Retiré",
        className:
          "bg-error/10 text-error border-error/20",
        dot: "bg-error",
      };

    default:
      return {
        label: statut,
        className:
          "bg-base-200 text-base-content/60 border-base-300",
        dot: "bg-base-content/40",
      };
  }
}

/* ============================================================
   NOM COMPLET
============================================================ */

function getNomComplet(
  prenom: string | null,
  nom: string | null,
) {
  return (
    [prenom, nom]
      .filter(Boolean)
      .join(" ")
      .trim() || "Sans nom"
  );
}

/* ============================================================
   INITIALES
============================================================ */

function getInitiales(
  prenom: string | null,
  nom: string | null,
) {
  const p = prenom?.trim()?.charAt(0) ?? "";
  const n = nom?.trim()?.charAt(0) ?? "";

  return (
    `${p}${n}`.toUpperCase() ||
    "U"
  );
}

/* ============================================================
   DROITS DE GESTION
============================================================ */

/**
 * Règle métier actuelle :
 *
 * Le PROPRIETAIRE est responsable de la gestion
 * des utilisateurs de son centre.
 *
 * Le serveur reste l'autorité finale.
 */
function peutGererUtilisateurs(
  currentRole: Role | null | undefined,
): boolean {
  return currentRole === "PROPRIETAIRE";
}

/* ============================================================
   COMPOSANT
============================================================ */

export default function UtilisateurTable({
  membres,
  currentRole = null,
  onEdit,
  onAdd,
  onRefresh,
}: Props) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  /*
   * Le propriétaire peut gérer les utilisateurs.
   */
  const peutGerer = peutGererUtilisateurs(
    currentRole,
  );

  /* ==========================================================
     RECHERCHE
  ========================================================== */

  const filtered = useMemo(() => {
    const value = search
      .trim()
      .toLowerCase();

    if (!value) {
      return membres;
    }

    return membres.filter((membre) => {
      const u = membre.utilisateur;

      const text = [
        u.prenom,
        u.nom,
        u.email,
        u.telephone,
        membre.role,
        membre.statut,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(value);
    });
  }, [membres, search]);

  /* ==========================================================
     SUPPRESSION
  ========================================================== */

  async function handleDelete(
    membre: Membre,
  ) {
    /*
     * Protection interface.
     *
     * La vraie protection reste côté serveur.
     */
    if (!peutGerer) {
      toast.error(
        "Seul le propriétaire du centre peut gérer les utilisateurs.",
      );
      return;
    }

    const u = membre.utilisateur;

    const nomComplet =
      getNomComplet(
        u.prenom,
        u.nom,
      );

    /*
     * Protection supplémentaire :
     * le propriétaire ne doit pas pouvoir
     * retirer le propriétaire lui-même.
     */
    if (membre.role === "PROPRIETAIRE") {
      toast.error(
        "Le propriétaire du centre ne peut pas être retiré.",
      );
      return;
    }

    const result =
      await Swal.fire({
        title:
          "Retirer cet utilisateur ?",

        html: `
          <div class="text-sm">
            <p class="mb-2">
              Vous êtes sur le point de retirer :
            </p>

            <p class="font-semibold">
              ${nomComplet}
            </p>

            <p class="mt-1 opacity-70">
              ${u.email}
            </p>
          </div>
        `,

        icon: "warning",

        showCancelButton: true,

        confirmButtonText:
          "Oui, retirer",

        cancelButtonText:
          "Annuler",

        reverseButtons: true,

        buttonsStyling: true,

        customClass: {
          popup:
            "rounded-2xl !bg-base-100 !text-base-content",

          confirmButton:
            "btn btn-error !px-5 !rounded-xl",

          cancelButton:
            "btn btn-ghost !px-5 !rounded-xl",
        },
      });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setLoading(true);

      Swal.fire({
        title: "Traitement...",

        text:
          "Retrait de l'utilisateur en cours.",

        allowOutsideClick: false,

        allowEscapeKey: false,

        showConfirmButton: false,

        customClass: {
          popup:
            "rounded-2xl !bg-base-100 !text-base-content",
        },

        didOpen: () => {
          Swal.showLoading();
        },
      });

      const response =
        await deleteUtilisateur(
          membre.utilisateur.id,
        );

      Swal.close();

      /*
       * Compatible avec une action qui retourne
       * { success, message }.
       */
      if (
        response &&
        typeof response === "object" &&
        "success" in response &&
        response.success === false
      ) {
        toast.error(
          "message" in response &&
            typeof response.message ===
              "string"
            ? response.message
            : "Impossible de retirer cet utilisateur.",
        );

        return;
      }

      toast.success(
        "Utilisateur retiré avec succès.",
      );

      onRefresh?.();
    } catch (error) {
      Swal.close();

      console.error(
        "Erreur suppression utilisateur :",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors du retrait.",
      );
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================================
     RENDU
  ========================================================== */

  return (
    <div className="space-y-5">

      {/* ======================================================
          EN-TÊTE
      ======================================================= */}

      <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm sm:p-5">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          {/* TITRE */}

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users size={21} />
            </div>

            <div>

              <div className="flex items-center gap-2">

                <h2 className="text-lg font-bold tracking-tight">
                  Utilisateurs
                </h2>

                <span className="badge badge-sm badge-primary badge-outline">
                  {membres.length}
                </span>

              </div>

              <p className="text-sm text-base-content/55">
                Gérez les membres et leurs rôles
              </p>

            </div>
          </div>

          {/* RECHERCHE + AJOUT */}

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">

            <label className="input input-bordered flex w-full items-center gap-2 bg-base-200/40 sm:w-80">

              <Search
                size={18}
                className="shrink-0 text-base-content/45"
              />

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value,
                  )
                }
                placeholder="Rechercher un utilisateur..."
                className="grow bg-transparent"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="text-base-content/40 transition hover:text-base-content"
                  aria-label="Effacer la recherche"
                >
                  ×
                </button>
              )}

            </label>

            <button
              type="button"
              onClick={onAdd}
              disabled={!peutGerer || loading}
              title={
                !peutGerer
                  ? "Seul le propriétaire peut ajouter un utilisateur"
                  : "Ajouter un utilisateur"
              }
              className="btn btn-primary gap-2 rounded-xl px-5 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {!peutGerer ? (
                <LockKeyhole size={17} />
              ) : (
                <UserPlus size={18} />
              )}

              <span>
                Ajouter
              </span>
            </button>

          </div>
        </div>

        {/* ====================================================
            INFORMATION AUTORISATION
        ===================================================== */}

        {!currentRole && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-xs text-warning-content">

            <LockKeyhole
              size={16}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Autorisations non déterminées
              </p>

              <p className="mt-1 opacity-80">
                Le rôle de l'utilisateur connecté
                n'a pas encore été transmis à cette
                interface. Les autorisations seront
                vérifiées par le serveur.
              </p>
            </div>

          </div>
        )}

        {currentRole &&
          currentRole !== "PROPRIETAIRE" && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-base-300 bg-base-200/50 px-4 py-3 text-xs text-base-content/60">

              <LockKeyhole
                size={16}
                className="mt-0.5 shrink-0"
              />

              <div>

                <p className="font-semibold text-base-content/80">
                  Gestion des utilisateurs limitée
                </p>

                <p className="mt-1">
                  Votre rôle actuel est{" "}
                  <strong>
                    {getRoleConfig(
                      currentRole,
                    ).label}
                  </strong>
                  . Seul le propriétaire peut
                  ajouter, modifier ou retirer les
                  utilisateurs du centre.
                </p>

              </div>

            </div>
          )}

        {/* RÉSULTAT RECHERCHE */}

        {search.trim() && (
          <div className="mt-4 border-t border-base-300 pt-3 text-xs text-base-content/55">

            <span className="font-medium text-base-content">
              {filtered.length}
            </span>{" "}

            résultat
            {filtered.length > 1
              ? "s"
              : ""}{" "}

            pour{" "}

            <span className="font-medium text-base-content">
              « {search} »
            </span>

          </div>
        )}

      </div>

      {/* ======================================================
          TABLE
      ======================================================= */}

      <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">

        <div className="overflow-x-auto">

          <table className="table w-full">

            {/* HEAD */}

            <thead>

              <tr className="border-b border-base-300 bg-base-200/50 text-xs uppercase tracking-wider text-base-content/55">

                <th className="px-5 py-4">
                  Utilisateur
                </th>

                <th className="hidden px-5 py-4 md:table-cell">
                  Contact
                </th>

                <th className="px-5 py-4">
                  Rôle
                </th>

                <th className="px-5 py-4">
                  Statut
                </th>

                <th className="w-28 px-5 py-4 text-right">
                  Actions
                </th>

              </tr>

            </thead>

            {/* BODY */}

            <tbody>

              {filtered.length === 0 ? (

                <tr>

                  <td colSpan={5}>

                    <div className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">

                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-base-200 text-base-content/35">

                        {search ? (
                          <Search size={25} />
                        ) : (
                          <Users size={25} />
                        )}

                      </div>

                      <h3 className="font-semibold">
                        {search
                          ? "Aucun résultat"
                          : "Aucun utilisateur"}
                      </h3>

                      <p className="mt-1 max-w-sm text-sm text-base-content/50">

                        {search
                          ? "Aucun utilisateur ne correspond à votre recherche."
                          : "Commencez par ajouter un utilisateur à votre centre."}

                      </p>

                      {!search && (
                        <button
                          type="button"
                          onClick={onAdd}
                          disabled={
                            !peutGerer ||
                            loading
                          }
                          className="btn btn-sm btn-primary mt-4 rounded-lg disabled:opacity-50"
                        >
                          <UserPlus size={16} />

                          Ajouter un utilisateur
                        </button>
                      )}

                    </div>

                  </td>

                </tr>

              ) : (

                filtered.map(
                  (membre) => {
                    const u =
                      membre.utilisateur;

                    const nomComplet =
                      getNomComplet(
                        u.prenom,
                        u.nom,
                      );

                    const initiales =
                      getInitiales(
                        u.prenom,
                        u.nom,
                      );

                    const roleConfig =
                      getRoleConfig(
                        membre.role,
                      );

                    const statutConfig =
                      getStatutConfig(
                        membre.statut,
                      );

                    const estProprietaire =
                      membre.role ===
                      "PROPRIETAIRE";

                    return (
                      <tr
                        key={membre.id}
                        className="group border-b border-base-200 transition-colors last:border-b-0 hover:bg-base-200/35"
                      >

                        {/* UTILISATEUR */}

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div className="avatar placeholder">

                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary ring-1 ring-primary/10">

                                <span>
                                  {initiales}
                                </span>

                              </div>

                            </div>

                            <div className="min-w-0">

                              <div className="truncate font-semibold text-base-content">
                                {nomComplet}
                              </div>

                              <div className="mt-0.5 truncate text-xs text-base-content/50 md:hidden">
                                {u.email}
                              </div>

                            </div>

                          </div>

                        </td>

                        {/* CONTACT */}

                        <td className="hidden px-5 py-4 md:table-cell">

                          <div className="space-y-1">

                            <div className="flex max-w-[240px] items-center gap-2 truncate text-sm">

                              <Mail
                                size={14}
                                className="shrink-0 text-base-content/40"
                              />

                              <span className="truncate">
                                {u.email}
                              </span>

                            </div>

                            <div className="flex items-center gap-2 text-xs text-base-content/50">

                              <Phone
                                size={13}
                                className="shrink-0"
                              />

                              <span>
                                {u.telephone ||
                                  "Aucun téléphone"}
                              </span>

                            </div>

                          </div>

                        </td>

                        {/* ROLE */}

                        <td className="px-5 py-4">

                          <span
                            className={`badge border px-3 py-3 text-xs font-medium ${roleConfig.className}`}
                          >

                            <ShieldCheck
                              size={13}
                              className="mr-1"
                            />

                            {roleConfig.label}

                          </span>

                        </td>

                        {/* STATUT */}

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statutConfig.className}`}
                          >

                            <span
                              className={`h-1.5 w-1.5 rounded-full ${statutConfig.dot}`}
                            />

                            {statutConfig.label}

                          </span>

                        </td>

                        {/* ACTIONS */}

                        <td className="px-5 py-4">

                          <div className="flex justify-end gap-1">

                            {/* MODIFIER */}

                            <button
                              type="button"
                              className="btn btn-sm btn-square btn-ghost rounded-lg text-base-content/60 transition hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() =>
                                onEdit?.(
                                  membre,
                                )
                              }
                              disabled={
                                !peutGerer ||
                                loading ||
                                estProprietaire
                              }
                              title={
                                estProprietaire
                                  ? "Le propriétaire ne peut pas être modifié ici"
                                  : !peutGerer
                                    ? "Accès réservé au propriétaire"
                                    : "Modifier"
                              }
                              aria-label={`Modifier ${nomComplet}`}
                            >

                              {estProprietaire ? (
                                <LockKeyhole
                                  size={16}
                                />
                              ) : (
                                <Pencil
                                  size={16}
                                />
                              )}

                            </button>

                            {/* RETIRER */}

                            <button
                              type="button"
                              className="btn btn-sm btn-square btn-ghost rounded-lg text-base-content/60 transition hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() =>
                                handleDelete(
                                  membre,
                                )
                              }
                              disabled={
                                !peutGerer ||
                                loading ||
                                estProprietaire
                              }
                              title={
                                estProprietaire
                                  ? "Le propriétaire ne peut pas être retiré"
                                  : !peutGerer
                                    ? "Accès réservé au propriétaire"
                                    : "Retirer"
                              }
                              aria-label={`Retirer ${nomComplet}`}
                            >

                              {estProprietaire ? (
                                <LockKeyhole
                                  size={16}
                                />
                              ) : (
                                <Trash2
                                  size={16}
                                />
                              )}

                            </button>

                            {/* MORE */}

                            <button
                              type="button"
                              className="btn btn-sm btn-square btn-ghost hidden rounded-lg text-base-content/40 lg:inline-flex"
                              disabled
                              aria-hidden="true"
                            >
                              <MoreHorizontal
                                size={16}
                              />
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  },
                )

              )}

            </tbody>

          </table>

        </div>

        {/* ====================================================
            FOOTER
        ===================================================== */}

        {filtered.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-base-300 bg-base-200/30 px-5 py-3 text-xs text-base-content/50 sm:flex-row sm:items-center sm:justify-between">

            <span>

              Affichage de{" "}

              <strong className="text-base-content">
                {filtered.length}
              </strong>{" "}

              sur{" "}

              <strong className="text-base-content">
                {membres.length}
              </strong>{" "}

              utilisateur
              {membres.length > 1
                ? "s"
                : ""}

            </span>

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                className="font-medium text-primary hover:underline"
              >
                Réinitialiser la recherche
              </button>
            )}

          </div>
        )}

      </div>

    </div>
  );
}