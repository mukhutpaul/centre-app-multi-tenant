"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Loader2,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Veuillez saisir une adresse e-mail valide"),

  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    if (loading) return;

    try {
      setLoading(true);

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (!result) {
        toast.error("Une erreur est survenue.");
        return;
      }

      if (result.error) {
        toast.error("Identifiants incorrects", {
          description:
            "Veuillez vérifier votre adresse e-mail et votre mot de passe.",
        });

        return;
      }

      if (result.ok) {
        toast.success("Connexion réussie", {
          description: "Bienvenue sur la plateforme.",
        });

        // Redirection vers le tableau de bord
        router.replace("/dashboard");

        // Force Next.js à actualiser les Server Components
        router.refresh();
      }
    } catch (error) {
      console.error("Erreur de connexion :", error);

      toast.error("Impossible de se connecter", {
        description:
          "Une erreur inattendue est survenue. Veuillez réessayer.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      noValidate
    >
      {/* EMAIL */}
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          Adresse e-mail
        </label>

        <div
          className={[
            "group flex h-12 items-center rounded-xl border bg-white px-3.5 shadow-sm transition-all duration-200",
            "dark:bg-slate-900",
            errors.email
              ? "border-red-400 ring-4 ring-red-500/10"
              : "border-slate-200 hover:border-slate-300 focus-within:border-[#0f5da8] focus-within:ring-4 focus-within:ring-[#0f5da8]/10 dark:border-slate-700 dark:hover:border-slate-600 dark:focus-within:border-blue-500 dark:focus-within:ring-blue-500/10",
          ].join(" ")}
        >
          <Mail
            size={19}
            strokeWidth={1.8}
            className={[
              "shrink-0 transition-colors",
              errors.email
                ? "text-red-500"
                : "text-slate-400 group-focus-within:text-[#0f5da8] dark:group-focus-within:text-blue-400",
            ].join(" ")}
          />

          <input
            id="email"
            {...register("email")}
            type="email"
            placeholder="nom@formation.cd"
            autoComplete="email"
            disabled={loading}
            className="
              ml-3
              w-full
              bg-transparent
              text-sm
              text-slate-900
              outline-none
              placeholder:text-slate-400
              disabled:cursor-not-allowed
              disabled:opacity-60
              dark:text-white
              dark:placeholder:text-slate-500
            "
          />
        </div>

        {errors.email && (
          <div className="flex items-center gap-1.5 px-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />

            <p className="text-xs font-medium text-red-500">
              {errors.email.message}
            </p>
          </div>
        )}
      </div>

      {/* MOT DE PASSE */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Mot de passe
          </label>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              toast.info("Fonctionnalité bientôt disponible", {
                description:
                  "La récupération du mot de passe sera disponible prochainement.",
              });
            }}
            className="
              text-xs
              font-semibold
              text-[#0f5da8]
              transition
              hover:text-[#0c4d8c]
              hover:underline
              disabled:cursor-not-allowed
              disabled:opacity-50
              dark:text-blue-400
              dark:hover:text-blue-300
            "
          >
            Mot de passe oublié ?
          </button>
        </div>

        <div
          className={[
            "group flex h-12 items-center rounded-xl border bg-white px-3.5 shadow-sm transition-all duration-200",
            "dark:bg-slate-900",
            errors.password
              ? "border-red-400 ring-4 ring-red-500/10"
              : "border-slate-200 hover:border-slate-300 focus-within:border-[#0f5da8] focus-within:ring-4 focus-within:ring-[#0f5da8]/10 dark:border-slate-700 dark:hover:border-slate-600 dark:focus-within:border-blue-500 dark:focus-within:ring-blue-500/10",
          ].join(" ")}
        >
          <LockKeyhole
            size={19}
            strokeWidth={1.8}
            className={[
              "shrink-0 transition-colors",
              errors.password
                ? "text-red-500"
                : "text-slate-400 group-focus-within:text-[#0f5da8] dark:group-focus-within:text-blue-400",
            ].join(" ")}
          />

          <input
            id="password"
            {...register("password")}
            type={showPassword ? "text" : "password"}
            placeholder="Votre mot de passe"
            autoComplete="current-password"
            disabled={loading}
            className="
              ml-3
              w-full
              bg-transparent
              text-sm
              text-slate-900
              outline-none
              placeholder:text-slate-400
              disabled:cursor-not-allowed
              disabled:opacity-60
              dark:text-white
              dark:placeholder:text-slate-500
            "
          />

          <button
            type="button"
            disabled={loading}
            onClick={() => setShowPassword((value) => !value)}
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-700
              disabled:cursor-not-allowed
              disabled:opacity-50
              dark:hover:bg-slate-800
              dark:hover:text-slate-200
            "
            aria-label={
              showPassword
                ? "Masquer le mot de passe"
                : "Afficher le mot de passe"
            }
          >
            {showPassword ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        </div>

        {errors.password && (
          <div className="flex items-center gap-1.5 px-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />

            <p className="text-xs font-medium text-red-500">
              {errors.password.message}
            </p>
          </div>
        )}
      </div>

      {/* SE SOUVENIR */}
      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          className="
            checkbox
            checkbox-sm
            rounded-md
            border-slate-300
            [--chk-bg:#0f5da8]
            [--chk-border:#0f5da8]
            dark:border-slate-600
          "
          disabled={loading}
        />

        <span className="text-sm text-slate-600 dark:text-slate-400">
          Se souvenir de moi
        </span>
      </label>

      {/* BOUTON CONNEXION */}
      <button
        type="submit"
        disabled={loading}
        className="
          group
          btn
          h-12
          min-h-12
          w-full
          rounded-xl
          border-0
          bg-[#0f5da8]
          text-sm
          font-semibold
          text-white
          shadow-lg
          shadow-[#0f5da8]/20
          transition-all
          duration-200
          hover:bg-[#0c4d8c]
          hover:shadow-xl
          hover:shadow-[#0f5da8]/25
          active:scale-[0.99]
          disabled:cursor-not-allowed
          disabled:opacity-70
        "
      >
        {loading ? (
          <>
            <Loader2
              size={19}
              className="animate-spin"
            />
            Connexion en cours...
          </>
        ) : (
          <>
            <LogIn
              size={19}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
            Se connecter
          </>
        )}
      </button>

      {/* SÉCURITÉ */}
      <div
        className="
          flex
          items-center
          justify-center
          gap-2
          rounded-xl
          border
          border-slate-200
          bg-slate-50
          px-4
          py-3
          dark:border-slate-800
          dark:bg-slate-900/50
        "
      >
        <ShieldCheck
          size={16}
          className="shrink-0 text-emerald-600 dark:text-emerald-400"
        />

        <p className="text-center text-[11px] leading-4 text-slate-500 dark:text-slate-400">
          Connexion sécurisée à la plateforme
          institutionnelle
        </p>
      </div>
    </form>
  );
}
