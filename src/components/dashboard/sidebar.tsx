
"use client";

import Link from "next/link";

import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Users,
  UserCog,
  ClipboardCheck,
  UserRoundCheck,
  Building2,
  Scale,
  FileText,
  X,
  Receipt,
  WalletCards,
  CalendarClock,
} from "lucide-react";

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

const menuSections = [
  {
    title: "TABLEAU DE BORD",
    items: [
      {
        label: "Vue générale",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },

  {
    title: "GESTION",
    items: [
      {
        label: "Centres de formation",
        href: "/centres",
        icon: Building2,
      },

      {
        label: "Utilisateurs",
        href: "/utilisateurs",
        icon: UserCog,
      },

      {
        label: "Apprenants",
        href: "/apprenants",
        icon: GraduationCap,
      },

      {
        label: "Formateurs",
        href: "/formateurs",
        icon: Users,
      },

      {
        label: "Formations",
        href: "/formations",
        icon: BookOpen,
      },
    ],
  },

  {
    title: "PLANIFICATION",
    items: [
      {
        label: "Sessions",
        href: "/sessions",
        icon: CalendarDays,
      },

      {
        label: "Calendrier",
        href: "/calendrier",
        icon: CalendarDays,
      },
    ],
  },

  {
    title: "SUIVI",
    items: [
      {
        label: "Inscriptions",
        href: "/inscriptions",
        icon: FileText,
      },

      {
        label: "Présences",
        href: "/presences",
        icon: UserRoundCheck,
      },

      {
        label: "Conventions",
        href: "/conventions",
        icon: FileText,
      },
    ],
  },

  {
    title: "FINANCE",
    items: [
      {
        label: "Factures",
        href: "/factures",
        icon: Receipt,
      },

      {
        label: "Paiements",
        href: "/paiements",
        icon: CreditCard,
      },

      {
        label: "Échéances",
        href: "/echeances",
        icon: CalendarClock,
      },

      {
        label: "Rapports financiers",
        href: "/rapports/finance",
        icon: WalletCards,
      },
    ],
  },

  {
    title: "ÉVALUATION",
    items: [
      {
        label: "Évaluations",
        href: "/evaluations",
        icon: ClipboardCheck,
      },

      {
        label: "Jurys",
        href: "/jury",
        icon: Scale,
      },

      {
        label: "Résultats",
        href: "/resultats",
        icon: BarChart3,
      },
    ],
  },
];

export function Sidebar({
  mobile = false,
  onClose,
}: SidebarProps) {
  return (
    <aside
      className={`
        fixed
        left-0
        top-0
        z-40
        flex
        h-screen
        w-72
        flex-col
        bg-[#0f2747]
        text-white
        ${mobile ? "" : "hidden lg:flex"}
      `}
    >
      {/* =====================================================
          LOGO
      ====================================================== */}

      <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
          onClick={
            mobile
              ? onClose
              : undefined
          }
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0f2747]">
            <GraduationCap size={24} />
          </div>

          <div>
            <div className="text-sm font-bold tracking-wide">
              FORMATION
            </div>

            <div className="text-xs text-white/60">
              PROFESSIONNELLE
            </div>
          </div>
        </Link>

        {mobile && (
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm text-white hover:bg-white/10"
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* =====================================================
          NAVIGATION
      ====================================================== */}

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {menuSections.map(
          (section) => (
            <div
              key={section.title}
              className="mb-6"
            >
              <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.15em] text-white/40">
                {section.title}
              </p>

              <nav className="space-y-1">
                {section.items.map(
                  (item) => {
                    const Icon =
                      item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={
                          mobile
                            ? onClose
                            : undefined
                        }
                        className="
                          flex
                          items-center
                          gap-3
                          rounded-xl
                          px-3
                          py-2.5
                          text-sm
                          text-white/75
                          transition
                          duration-200
                          hover:bg-white/10
                          hover:text-white
                        "
                      >
                        <Icon
                          size={18}
                          strokeWidth={1.8}
                        />

                        <span>
                          {item.label}
                        </span>
                      </Link>
                    );
                  },
                )}
              </nav>
            </div>
          ),
        )}
      </div>

      {/* =====================================================
          PARAMÈTRES
      ====================================================== */}

      <div className="shrink-0 border-t border-white/10 p-4">
        <Link
          href="/parametres"
          onClick={
            mobile
              ? onClose
              : undefined
          }
          className="
            flex
            items-center
            gap-3
            rounded-xl
            px-3
            py-2.5
            text-sm
            text-white/70
            transition
            hover:bg-white/10
            hover:text-white
          "
        >
          <Settings size={18} />

          <span>
            Paramètres
          </span>
        </Link>
      </div>
    </aside>
  );
}
