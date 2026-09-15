"use client";

import {
  Search,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  recherche: string;
};

export default function EcheancesSearch({
  recherche,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [value, setValue] =
    useState(recherche);

  useEffect(() => {
    setValue(recherche);
  }, [recherche]);

  useEffect(() => {
    const valeur = value.trim();

    const timer = setTimeout(() => {
      const params = new URLSearchParams();

      if (valeur) {
        params.set(
          "recherche",
          valeur,
        );
      }

      const nouvelleUrl =
        params.toString()
          ? `${pathname}?${params.toString()}`
          : pathname;

      const urlActuelle =
        window.location.pathname +
        window.location.search;

      if (
        nouvelleUrl !== urlActuelle
      ) {
        router.replace(
          nouvelleUrl,
          {
            scroll: false,
          },
        );
      }
    }, 300);

    return () =>
      clearTimeout(timer);
  }, [
    value,
    pathname,
    router,
  ]);

  function handleClear() {
    setValue("");

    router.replace(
      pathname,
      {
        scroll: false,
      },
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />

        <input
          type="search"
          value={value}
          onChange={(event) =>
            setValue(event.target.value)
          }
          placeholder="Rechercher un apprenant, une inscription, une facture ou une formation..."
          className="h-11 w-full rounded-xl border bg-background pl-10 pr-10 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          autoComplete="off"
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Effacer la recherche"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {recherche && (
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            Résultats pour :
            <span className="ml-1 font-semibold text-foreground">
              « {recherche} »
            </span>
          </p>

          <button
            type="button"
            onClick={handleClear}
            className="text-sm font-medium text-primary hover:underline"
          >
            Réinitialiser
          </button>
        </div>
      )}
    </div>
  );
}