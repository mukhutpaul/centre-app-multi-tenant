
"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Archive,
  ChevronLeft,
  ChevronRight,
  UserRound,
  X,
  Users,
  Filter,
} from "lucide-react";

import Swal from "sweetalert2";
import { toast } from "sonner";

import {
  ApprenantModal,
  type ApprenantModalData,
} from "./apprenant-modal";

import {
  deleteApprenant,
  archiveApprenant,
} from "@/actions/apprenant.actions";

/* ============================================================
   TYPES
============================================================ */

interface ApprenantTableProps {
  apprenants: ApprenantModalData[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  statut?: string;
}

/* ============================================================
   STATUTS
============================================================ */

const STATUT_LABELS: Record<string, string> = {
  ACTIF: "Actif",
  INACTIF: "Inactif",
  DIPLOME: "Diplômé",
  SUSPENDU: "Suspendu",
  ARCHIVE: "Archivé",
};

const STATUT_CLASSES: Record<string, string> = {
  ACTIF:
    "border-success/20 bg-success/10 text-success",

  INACTIF:
    "border-base-300 bg-base-200 text-base-content/60",

  DIPLOME:
    "border-info/20 bg-info/10 text-info",

  SUSPENDU:
    "border-warning/20 bg-warning/10 text-warning",

  ARCHIVE:
    "border-neutral/20 bg-neutral/10 text-neutral-content",
};

/* ============================================================
   COMPOSANT
============================================================ */

export function ApprenantTable({
  apprenants,
  total,
  page,
  totalPages,
  search,
  statut,
}: ApprenantTableProps) {
  const router = useRouter();

  const currentSearchParams =
    useSearchParams();

  /* ==========================================================
     MODAL
  ========================================================== */

  const [modalOpen, setModalOpen] =
    useState(false);

  const [
    selectedApprenant,
    setSelectedApprenant,
  ] =
    useState<ApprenantModalData | null>(
      null,
    );

  /* ==========================================================
     RECHERCHE

     Important :
     - searchValue est initialisé directement avec
       la valeur reçue du serveur.
     - Aucun setState() synchrone dans un effect.
     - La recherche est automatiquement envoyée
       après 350 ms d'inactivité.
  ========================================================== */

  const [searchValue, setSearchValue] =
    useState(search);

  const [isSearching, setIsSearching] =
    useState(false);

  /* ==========================================================
     RECHERCHE AUTOMATIQUE
  ========================================================== */

  useEffect(() => {
    const value =
      searchValue.trim();

    const currentValue =
      search.trim();

    /*
     * La recherche affichée correspond déjà
     * à celle présente dans l'URL.
     */
    if (value === currentValue) {
      if (isSearching) {
        setIsSearching(false);
      }

      return;
    }

    setIsSearching(true);

    const timeoutId =
      window.setTimeout(() => {
        const params =
          new URLSearchParams(
            currentSearchParams.toString(),
          );

        /*
         * Ajouter ou supprimer q
         */
        if (value) {
          params.set("q", value);
        } else {
          params.delete("q");
        }

        /*
         * Toute nouvelle recherche revient
         * à la première page.
         */
        params.set("page", "1");

        router.push(
          `/apprenants?${params.toString()}`,
        );
      }, 350);

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [
    searchValue,
    search,
    currentSearchParams,
    router,
    isSearching,
  ]);

  /* ==========================================================
     MISE À JOUR DES PARAMÈTRES
  ========================================================== */

  const updateParams = (
    values: Record<string, string>,
  ) => {
    const params =
      new URLSearchParams(
        currentSearchParams.toString(),
      );

    Object.entries(values).forEach(
      ([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      },
    );

    router.push(
      `/apprenants?${params.toString()}`,
    );
  };

  /* ==========================================================
     MODIFICATION
  ========================================================== */

  const handleEdit = (
    apprenant: ApprenantModalData,
  ) => {
    setSelectedApprenant(
      apprenant,
    );

    setModalOpen(true);
  };

  /* ==========================================================
     CRÉATION
  ========================================================== */

  const handleCreate = () => {
    setSelectedApprenant(null);
    setModalOpen(true);
  };

  /* ==========================================================
     FERMETURE MODAL
  ========================================================== */

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedApprenant(null);
  };

  /* ==========================================================
     SUPPRESSION
  ========================================================== */

  const handleDelete = async (
    apprenant: ApprenantModalData,
  ) => {
    const nomComplet =
      `${apprenant.prenom} ${apprenant.nom}`.trim();

    const result =
      await Swal.fire({
        title:
          "Supprimer l'apprenant ?",

        html: `
          <div class="text-sm">
            <p class="mb-2">
              Vous êtes sur le point de supprimer :
            </p>

            <p class="font-semibold">
              ${nomComplet}
            </p>

            ${
              apprenant.email
                ? `
                  <p class="mt-1 opacity-60">
                    ${apprenant.email}
                  </p>
                `
                : ""
            }

            <p class="mt-3 font-medium text-error">
              Cette action est irréversible.
            </p>
          </div>
        `,

        icon: "warning",

        showCancelButton: true,

        confirmButtonText:
          "Oui, supprimer",

        cancelButtonText:
          "Annuler",

        reverseButtons: true,

        focusCancel: true,

        customClass: {
          popup:
            "rounded-2xl !bg-base-100 !text-base-content",

          confirmButton:
            "btn btn-error !rounded-xl !px-5",

          cancelButton:
            "btn btn-ghost !rounded-xl !px-5",
        },

        buttonsStyling: false,
      });

    if (!result.isConfirmed) {
      return;
    }

    /* --------------------------------------------------------
       CHARGEMENT
    -------------------------------------------------------- */

    Swal.fire({
      title:
        "Suppression en cours...",

      text:
        "Veuillez patienter.",

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

    try {
      const response =
        await deleteApprenant(
          apprenant.id,
        );

      Swal.close();

      if (!response.success) {
        toast.error(
          response.message,
        );

        return;
      }

      toast.success(
        response.message,
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Erreur suppression apprenant :",
        error,
      );

      Swal.close();

      toast.error(
        "Une erreur inattendue est survenue lors de la suppression.",
      );
    }
  };

  /* ==========================================================
     ARCHIVAGE
  ========================================================== */

  const handleArchive = async (
    apprenant: ApprenantModalData,
  ) => {
    const nomComplet =
      `${apprenant.prenom} ${apprenant.nom}`.trim();

    const result =
      await Swal.fire({
        title:
          "Archiver l'apprenant ?",

        html: `
          <div class="text-sm">
            <p>
              Voulez-vous archiver
              <strong>${nomComplet}</strong> ?
            </p>

            <p class="mt-3 opacity-60">
              L'apprenant ne sera pas supprimé définitivement.
            </p>
          </div>
        `,

        icon: "question",

        showCancelButton: true,

        confirmButtonText:
          "Oui, archiver",

        cancelButtonText:
          "Annuler",

        reverseButtons: true,

        focusCancel: true,

        customClass: {
          popup:
            "rounded-2xl !bg-base-100 !text-base-content",

          confirmButton:
            "btn btn-warning !rounded-xl !px-5",

          cancelButton:
            "btn btn-ghost !rounded-xl !px-5",
        },

        buttonsStyling: false,
      });

    if (!result.isConfirmed) {
      return;
    }

    /* --------------------------------------------------------
       CHARGEMENT
    -------------------------------------------------------- */

    Swal.fire({
      title:
        "Archivage en cours...",

      text:
        "Veuillez patienter.",

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

    try {
      const response =
        await archiveApprenant(
          apprenant.id,
        );

      Swal.close();

      if (!response.success) {
        toast.error(
          response.message,
        );

        return;
      }

      toast.success(
        response.message,
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Erreur archivage apprenant :",
        error,
      );

      Swal.close();

      toast.error(
        "Une erreur inattendue est survenue lors de l'archivage.",
      );
    }
  };

  /* ==========================================================
     RENDU
  ========================================================== */

  return (
    <div className="space-y-5">

      {/* ======================================================
          EN-TÊTE / BARRE D'ACTIONS
      ======================================================= */}

      <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm sm:p-5">

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

          {/* --------------------------------------------------
              TITRE
          --------------------------------------------------- */}

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users size={21} />
            </div>

            <div>
              <div className="flex items-center gap-2">

                <h2 className="text-lg font-bold tracking-tight">
                  Apprenants
                </h2>

                <span className="badge badge-sm badge-primary badge-outline">
                  {total}
                </span>

              </div>

              <p className="text-sm text-base-content/50">
                Gérez les apprenants de votre centre
              </p>
            </div>

          </div>

          {/* --------------------------------------------------
              RECHERCHE + FILTRE + AJOUT
          --------------------------------------------------- */}

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">

            {/* RECHERCHE */}

            <label
              className="
                input
                input-bordered
                flex
                w-full
                items-center
                gap-2
                rounded-xl
                bg-base-200/40
                transition-all
                focus-within:border-primary
                focus-within:bg-base-100
                focus-within:ring-2
                focus-within:ring-primary/10
                sm:w-80
                lg:w-96
              "
            >

              <Search
                size={18}
                className="shrink-0 text-base-content/40"
              />

              <input
                type="text"
                value={searchValue}
                onChange={(event) =>
                  setSearchValue(
                    event.target.value,
                  )
                }
                placeholder="Rechercher un apprenant..."
                className="grow bg-transparent text-sm outline-none"
                aria-label="Rechercher un apprenant"
              />

              {/* INDICATEUR */}

              {isSearching && (
                <span
                  className="
                    loading
                    loading-spinner
                    loading-xs
                    text-primary
                  "
                />
              )}

              {/* EFFACER */}

              {!isSearching &&
                searchValue && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchValue("")
                    }
                    className="
                      rounded-lg
                      p-1
                      text-base-content/40
                      transition
                      hover:bg-base-300
                      hover:text-base-content
                    "
                    aria-label="Effacer la recherche"
                  >
                    <X size={15} />
                  </button>
                )}

            </label>

            {/* FILTRE STATUT */}

            <label
              className="
                select
                select-bordered
                flex
                items-center
                gap-2
                rounded-xl
                bg-base-200/40
              "
            >

              <Filter
                size={16}
                className="text-base-content/40"
              />

              <select
                value={statut ?? ""}
                onChange={(event) =>
                  updateParams({
                    statut:
                      event.target.value,
                    page: "1",
                  })
                }
                className="bg-transparent outline-none"
                aria-label="Filtrer par statut"
              >

                <option value="">
                  Tous les statuts
                </option>

                <option value="ACTIF">
                  Actifs
                </option>

                <option value="INACTIF">
                  Inactifs
                </option>

                <option value="DIPLOME">
                  Diplômés
                </option>

                <option value="SUSPENDU">
                  Suspendus
                </option>

                <option value="ARCHIVE">
                  Archivés
                </option>

              </select>

            </label>

            {/* NOUVEL APPRENANT */}

            <button
              type="button"
              onClick={handleCreate}
              className="
                btn
                btn-primary
                rounded-xl
                px-5
                shadow-sm
              "
            >
              <Plus size={18} />

              <span>
                Nouvel apprenant
              </span>
            </button>

          </div>

        </div>

        {/* ====================================================
            FILTRES ACTIFS
        ===================================================== */}

        {(search || statut) && (
          <div
            className="
              mt-4
              flex
              flex-wrap
              items-center
              gap-2
              border-t
              border-base-300
              pt-3
            "
          >

            <span className="text-xs text-base-content/50">
              Filtres actifs :
            </span>

            {/* RECHERCHE */}

            {search && (
              <span
                className="
                  badge
                  badge-sm
                  border-primary/20
                  bg-primary/10
                  text-primary
                "
              >
                Recherche : « {search} »
              </span>
            )}

            {/* STATUT */}

            {statut && (
              <span
                className="
                  badge
                  badge-sm
                  border-info/20
                  bg-info/10
                  text-info
                "
              >
                {STATUT_LABELS[statut] ??
                  statut}
              </span>
            )}

            {/* RÉINITIALISER */}

            <button
              type="button"
              onClick={() => {
                setSearchValue("");

                updateParams({
                  q: "",
                  statut: "",
                  page: "1",
                });
              }}
              className="
                ml-auto
                text-xs
                font-medium
                text-primary
                hover:underline
              "
            >
              Réinitialiser
            </button>

          </div>
        )}

      </div>

      {/* ======================================================
          TABLEAU
      ======================================================= */}

      <div
        className="
          overflow-hidden
          rounded-2xl
          border
          border-base-300
          bg-base-100
          shadow-sm
        "
      >

        <div className="overflow-x-auto">

          <table className="table w-full">

            {/* ------------------------------------------------
                EN-TÊTE
            ------------------------------------------------- */}

            <thead>

              <tr
                className="
                  border-b
                  border-base-300
                  bg-base-200/50
                  text-xs
                  uppercase
                  tracking-wider
                  text-base-content/50
                "
              >

                <th className="px-5 py-4">
                  Apprenant
                </th>

                <th className="px-5 py-4">
                  Numéro
                </th>

                <th className="px-5 py-4">
                  Contact
                </th>

                <th className="px-5 py-4">
                  Ville
                </th>

                <th className="px-5 py-4">
                  Statut
                </th>

                <th className="w-32 px-5 py-4 text-right">
                  Actions
                </th>

              </tr>

            </thead>

            {/* ------------------------------------------------
                CORPS
            ------------------------------------------------- */}

            <tbody>

              {apprenants.length === 0 ? (

                <tr>

                  <td
                    colSpan={6}
                    className="px-5 py-16"
                  >

                    <div className="flex flex-col items-center justify-center text-center">

                      <div
                        className="
                          mb-4
                          flex
                          h-16
                          w-16
                          items-center
                          justify-center
                          rounded-2xl
                          bg-base-200
                          text-base-content/30
                        "
                      >

                        {search ? (
                          <Search size={28} />
                        ) : (
                          <UserRound size={28} />
                        )}

                      </div>

                      <h3 className="font-semibold text-base-content">

                        {search
                          ? "Aucun résultat"
                          : "Aucun apprenant"}

                      </h3>

                      <p className="mt-1 max-w-md text-sm text-base-content/50">

                        {search
                          ? `Aucun apprenant ne correspond à « ${search} ».`
                          : "Commencez par ajouter votre premier apprenant."}

                      </p>

                      {/* SI RECHERCHE */}

                      {search ? (

                        <button
                          type="button"
                          onClick={() =>
                            setSearchValue("")
                          }
                          className="
                            btn
                            btn-sm
                            btn-ghost
                            mt-4
                            rounded-lg
                          "
                        >
                          Effacer la recherche
                        </button>

                      ) : (

                        <button
                          type="button"
                          onClick={
                            handleCreate
                          }
                          className="
                            btn
                            btn-sm
                            btn-primary
                            mt-4
                            rounded-lg
                          "
                        >

                          <Plus size={16} />

                          Ajouter un apprenant

                        </button>

                      )}

                    </div>

                  </td>

                </tr>

              ) : (

                apprenants.map(
                  (apprenant) => {
                    const nomComplet =
                      `${apprenant.prenom} ${apprenant.nom}`.trim();

                    const initiales =
                      `${apprenant.prenom?.charAt(0) ?? ""}${apprenant.nom?.charAt(0) ?? ""}`
                        .toUpperCase() ||
                      "A";

                    return (
                      <tr
                        key={apprenant.id}
                        className="
                          group
                          border-b
                          border-base-200
                          transition-colors
                          last:border-b-0
                          hover:bg-base-200/35
                        "
                      >

                        {/* ----------------------------------
                            APPRENANT
                        ----------------------------------- */}

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div className="avatar placeholder">

                              <div
                                className="
                                  flex
                                  h-11
                                  w-11
                                  items-center
                                  justify-center
                                  rounded-xl
                                  bg-primary/10
                                  text-sm
                                  font-bold
                                  text-primary
                                  ring-1
                                  ring-primary/10
                                "
                              >
                                {initiales}
                              </div>

                            </div>

                            <div className="min-w-0">

                              <div className="max-w-[220px] truncate font-semibold text-base-content">

                                {nomComplet ||
                                  "Sans nom"}

                              </div>

                              {apprenant.email && (
                                <div className="mt-0.5 max-w-[220px] truncate text-xs text-base-content/50">
                                  {apprenant.email}
                                </div>
                              )}

                            </div>

                          </div>

                        </td>

                        {/* ----------------------------------
                            NUMÉRO
                        ----------------------------------- */}

                        <td className="px-5 py-4">

                          <span
                            className="
                              rounded-lg
                              bg-base-200
                              px-2.5
                              py-1
                              font-mono
                              text-xs
                              font-medium
                              text-base-content/70
                            "
                          >
                            {apprenant.numero ??
                              "—"}
                          </span>

                        </td>

                        {/* ----------------------------------
                            CONTACT
                        ----------------------------------- */}

                        <td className="px-5 py-4 text-sm text-base-content/70">
                          {apprenant.telephone ??
                            "—"}
                        </td>

                        {/* ----------------------------------
                            VILLE
                        ----------------------------------- */}

                        <td className="px-5 py-4 text-sm text-base-content/70">
                          {apprenant.ville ??
                            "—"}
                        </td>

                        {/* ----------------------------------
                            STATUT
                        ----------------------------------- */}

                        <td className="px-5 py-4">

                          <span
                            className={`
                              inline-flex
                              items-center
                              rounded-full
                              border
                              px-3
                              py-1.5
                              text-xs
                              font-semibold
                              ${
                                STATUT_CLASSES[
                                  apprenant.statut
                                ] ??
                                "border-base-300 bg-base-200 text-base-content/60"
                              }
                            `}
                          >

                            <span
                              className={`
                                mr-2
                                h-1.5
                                w-1.5
                                rounded-full
                                ${
                                  apprenant.statut ===
                                  "ACTIF"
                                    ? "bg-success"
                                    : apprenant.statut ===
                                        "SUSPENDU"
                                      ? "bg-warning"
                                      : apprenant.statut ===
                                          "DIPLOME"
                                        ? "bg-info"
                                        : apprenant.statut ===
                                            "ARCHIVE"
                                          ? "bg-neutral"
                                          : "bg-base-content/30"
                                }
                              `}
                            />

                            {STATUT_LABELS[
                              apprenant.statut
                            ] ??
                              apprenant.statut}

                          </span>

                        </td>

                        {/* ----------------------------------
                            ACTIONS
                        ----------------------------------- */}

                        <td className="px-5 py-4">

                          <div className="flex justify-end gap-1">

                            {/* MODIFIER */}

                            <button
                              type="button"
                              onClick={() =>
                                handleEdit(
                                  apprenant,
                                )
                              }
                              className="
                                btn
                                btn-sm
                                btn-square
                                btn-ghost
                                rounded-lg
                                text-base-content/55
                                transition
                                hover:bg-primary/10
                                hover:text-primary
                              "
                              title="Modifier"
                              aria-label={`Modifier ${nomComplet}`}
                            >
                              <Pencil
                                size={16}
                              />
                            </button>

                            {/* ARCHIVER */}

                            {apprenant.statut !==
                              "ARCHIVE" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleArchive(
                                    apprenant,
                                  )
                                }
                                className="
                                  btn
                                  btn-sm
                                  btn-square
                                  btn-ghost
                                  rounded-lg
                                  text-base-content/55
                                  transition
                                  hover:bg-warning/10
                                  hover:text-warning
                                "
                                title="Archiver"
                                aria-label={`Archiver ${nomComplet}`}
                              >
                                <Archive
                                  size={16}
                                />
                              </button>
                            )}

                            {/* SUPPRIMER */}

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  apprenant,
                                )
                              }
                              className="
                                btn
                                btn-sm
                                btn-square
                                btn-ghost
                                rounded-lg
                                text-base-content/55
                                transition
                                hover:bg-error/10
                                hover:text-error
                              "
                              title="Supprimer"
                              aria-label={`Supprimer ${nomComplet}`}
                            >
                              <Trash2
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

        {apprenants.length > 0 && (
          <div
            className="
              flex
              flex-col
              gap-3
              border-t
              border-base-300
              bg-base-200/30
              px-5
              py-3
              text-xs
              text-base-content/50
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >

            <span>
              Affichage de{" "}

              <strong className="text-base-content">
                {apprenants.length}
              </strong>{" "}

              sur{" "}

              <strong className="text-base-content">
                {total}
              </strong>{" "}

              apprenant
              {total > 1
                ? "s"
                : ""}
            </span>

            {/* PAGINATION */}

            {totalPages > 1 && (
              <div className="flex items-center gap-2">

                <span className="mr-2 text-xs text-base-content/50">

                  Page{" "}

                  <strong className="text-base-content">
                    {page}
                  </strong>{" "}

                  / {totalPages}

                </span>

                <div className="join">

                  {/* PAGE PRÉCÉDENTE */}

                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() =>
                      updateParams({
                        page: String(
                          page - 1,
                        ),
                      })
                    }
                    className="btn btn-sm join-item"
                    title="Page précédente"
                    aria-label="Page précédente"
                  >
                    <ChevronLeft
                      size={17}
                    />
                  </button>

                  {/* PAGE SUIVANTE */}

                  <button
                    type="button"
                    disabled={
                      page >=
                      totalPages
                    }
                    onClick={() =>
                      updateParams({
                        page: String(
                          page + 1,
                        ),
                      })
                    }
                    className="btn btn-sm join-item"
                    title="Page suivante"
                    aria-label="Page suivante"
                  >
                    <ChevronRight
                      size={17}
                    />
                  </button>

                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* ======================================================
          MODAL APPRENANT
      ======================================================= */}

      <ApprenantModal
        open={modalOpen}
        onClose={
          handleCloseModal
        }
        apprenant={
          selectedApprenant
        }
      />

    </div>
  );
}
