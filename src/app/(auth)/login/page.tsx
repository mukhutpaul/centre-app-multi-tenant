import { GraduationCap, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* Partie institutionnelle */}
        <div className="relative hidden overflow-hidden bg-[#0f2747] lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_40%)]" />

          <div className="relative flex w-full flex-col justify-between p-12 xl:p-20">
            <div>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#0f2747]">
                  <GraduationCap size={30} />
                </div>

                <div>
                  <p className="text-lg font-bold tracking-wide text-white">
                    FORMATION
                  </p>

                  <p className="text-sm text-white/60">
                    PROFESSIONNELLE
                  </p>
                </div>
              </div>

              <div className="mt-24 max-w-xl">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
                  Plateforme institutionnelle
                </p>

                <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
                  Gestion de la formation professionnelle
                </h1>

                <p className="mt-6 max-w-lg text-base leading-7 text-white/65">
                  Une plateforme centralisée pour piloter les
                  centres, les formations, les apprenants,
                  les sessions, les évaluations et les
                  certifications.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-white/50">
              <ShieldCheck size={18} />

              <span>
                Accès sécurisé à la plateforme
              </span>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">

            {/* Logo mobile */}
            <div className="mb-10 flex items-center justify-center lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f2747] text-white">
                  <GraduationCap size={26} />
                </div>

                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    FORMATION
                  </p>

                  <p className="text-xs text-slate-500">
                    PROFESSIONNELLE
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Bienvenue
              </h2>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Connectez-vous à votre espace d'administration.
              </p>
            </div>

            <LoginForm />

            <p className="mt-10 text-center text-xs text-slate-400">
              © {new Date().getFullYear()} — Plateforme de
              Formation Professionnelle
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
