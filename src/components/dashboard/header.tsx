"use client";

import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  UserRound,
  Settings,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      await signOut({
        callbackUrl: "/login",
      });
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);

      toast.error(
        "Impossible de se déconnecter. Veuillez réessayer."
      );

      setLoggingOut(false);
    }
  };

  return (
    <header
      className="
        sticky
        top-0
        z-30
        flex
        h-20
        items-center
        justify-between
        border-b
        border-slate-200
        bg-white/95
        px-4
        backdrop-blur
        dark:border-slate-800
        dark:bg-slate-950/95
        md:px-6
      "
    >
      {/* Partie gauche */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="
            btn
            btn-ghost
            btn-square
            lg:hidden
            dark:text-slate-200
          "
          aria-label="Ouvrir le menu"
        >
          <Menu size={22} />
        </button>

        <div className="hidden md:block">
          <div className="text-sm font-semibold text-slate-800 dark:text-white">
            Administration
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Plateforme de formation professionnelle
          </div>
        </div>
      </div>

      {/* Partie droite */}
      <div className="flex items-center gap-2 md:gap-4">

        {/* Recherche */}
        <label
          className="
            input
            input-bordered
            hidden
            h-10
            w-64
            items-center
            gap-2
            bg-white
            dark:border-slate-700
            dark:bg-slate-900
            md:flex
          "
        >
          <Search
            size={17}
            className="text-slate-400"
          />

          <input
            type="search"
            placeholder="Rechercher..."
            className="
              grow
              bg-transparent
              text-sm
              outline-none
              dark:text-white
            "
          />
        </label>

        {/* Notifications */}
        <button
          className="
            btn
            btn-ghost
            btn-circle
            relative
            dark:text-slate-200
          "
          aria-label="Notifications"
        >
          <Bell size={20} />

          <span
            className="
              absolute
              right-2
              top-2
              h-2
              w-2
              rounded-full
              bg-red-500
              ring-2
              ring-white
              dark:ring-slate-950
            "
          />
        </button>

        {/* Profil */}
        <div className="dropdown dropdown-end">
          <button
            tabIndex={0}
            className="
              btn
              btn-ghost
              flex
              gap-2
              px-2
              dark:hover:bg-slate-800
            "
          >
            {/* Avatar */}
            <div className="avatar placeholder">
              <div
                className="
                  flex
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  bg-[#0f2747]
                  text-white
                  ring-2
                  ring-[#0f2747]/10
                  dark:ring-white/10
                "
              >
                <span className="text-xs font-bold">
                  AD
                </span>
              </div>
            </div>

            {/* Informations */}
            <div className="hidden text-left md:block">
              <div className="text-sm font-semibold text-slate-800 dark:text-white">
                Administrateur
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                Ministère
              </div>
            </div>

            <ChevronDown
              size={16}
              className="hidden text-slate-500 md:block dark:text-slate-400"
            />
          </button>

          {/* Dropdown */}
          <ul
            tabIndex={0}
            className="
              menu
              dropdown-content
              z-[50]
              mt-3
              w-60
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-2
              shadow-xl
              dark:border-slate-700
              dark:bg-slate-900
            "
          >
            {/* Profil */}
            <li>
              <a
                href="/profil"
                className="
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  py-2.5
                  text-slate-700
                  dark:text-slate-200
                "
              >
                <UserRound size={17} />

                <div>
                  <div className="text-sm font-medium">
                    Mon profil
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Gérer mon compte
                  </div>
                </div>
              </a>
            </li>

            {/* Paramètres */}
            <li>
              <a
                href="/parametres"
                className="
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  py-2.5
                  text-slate-700
                  dark:text-slate-200
                "
              >
                <Settings size={17} />

                <div>
                  <div className="text-sm font-medium">
                    Paramètres
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Configuration
                  </div>
                </div>
              </a>
            </li>

            {/* Séparateur */}
            <li className="my-1">
              <div className="h-px bg-slate-200 dark:bg-slate-800" />
            </li>

            {/* Déconnexion */}
            <li>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-xl
                  py-2.5
                  text-red-600
                  hover:bg-red-50
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  dark:text-red-400
                  dark:hover:bg-red-950/30
                "
              >
                {loggingOut ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <LogOut size={17} />
                )}

                <div className="text-left">
                  <div className="text-sm font-semibold">
                    {loggingOut
                      ? "Déconnexion..."
                      : "Se déconnecter"}
                  </div>

                  {!loggingOut && (
                    <div className="text-[11px] text-red-400">
                      Fermer la session
                    </div>
                  )}
                </div>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
