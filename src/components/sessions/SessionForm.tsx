"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

import { StatutSession } from "@/generated/prisma/enums";

import {
  createSession,
  updateSession,
} from "@/actions/session.actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Formation {
  id: string;
  code: string;
  nom: string;
  statut: string;
}

interface SessionFormProps {
  formations: Formation[];
  session?: any;
  onSuccess?: (session: any) => void;
  onCancel?: () => void;
}

function formatDateTimeLocal(value?: string | Date | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(
    date.getTime() - offset * 60 * 1000
  );

  return localDate.toISOString().slice(0, 16);
}

export default function SessionForm({
  formations,
  session,
  onSuccess,
  onCancel,
}: SessionFormProps) {
  const editing = Boolean(session);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    formationId: session?.formationId ?? "",
    code: session?.code ?? "",
    nom: session?.nom ?? "",
    dateDebut: formatDateTimeLocal(session?.dateDebut),
    dateFin: formatDateTimeLocal(session?.dateFin),
    capacite: session?.capacite ?? "",
    statut:
      session?.statut ?? StatutSession.PLANIFIEE,
    ouvertureInscriptions: formatDateTimeLocal(
      session?.ouvertureInscriptions
    ),
    fermetureInscriptions: formatDateTimeLocal(
      session?.fermetureInscriptions
    ),
    notes: session?.notes ?? "",
  });

  function handleChange(
    field: string,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = editing
        ? await updateSession(session.id, form)
        : await createSession(form);

      if (!result.success) {
        setError(
          result.error ||
            "Une erreur est survenue."
        );
        return;
      }

      onSuccess?.(result.session);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* FORMATION */}

      <div className="space-y-2">
        <Label htmlFor="formationId">
          Formation *
        </Label>

        <select
          id="formationId"
          value={form.formationId}
          onChange={(e) =>
            handleChange(
              "formationId",
              e.target.value
            )
          }
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">
            Sélectionner une formation
          </option>

          {formations.map((formation) => (
            <option
              key={formation.id}
              value={formation.id}
            >
              {formation.code} — {formation.nom}
            </option>
          ))}
        </select>
      </div>

      {/* CODE + NOM */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code">
            Code *
          </Label>

          <Input
            id="code"
            value={form.code}
            onChange={(e) =>
              handleChange(
                "code",
                e.target.value.toUpperCase()
              )
            }
            placeholder="SESSION-2026-01"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nom">
            Nom de la session
          </Label>

          <Input
            id="nom"
            value={form.nom}
            onChange={(e) =>
              handleChange(
                "nom",
                e.target.value
              )
            }
            placeholder="Session de septembre 2026"
          />
        </div>
      </div>

      {/* DATES */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dateDebut">
            Date de début *
          </Label>

          <Input
            id="dateDebut"
            type="datetime-local"
            value={form.dateDebut}
            onChange={(e) =>
              handleChange(
                "dateDebut",
                e.target.value
              )
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateFin">
            Date de fin *
          </Label>

          <Input
            id="dateFin"
            type="datetime-local"
            value={form.dateFin}
            onChange={(e) =>
              handleChange(
                "dateFin",
                e.target.value
              )
            }
            required
          />
        </div>
      </div>

      {/* CAPACITE + STATUT */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="capacite">
            Capacité maximale
          </Label>

          <Input
            id="capacite"
            type="number"
            min="1"
            value={form.capacite}
            onChange={(e) =>
              handleChange(
                "capacite",
                e.target.value
              )
            }
            placeholder="Ex. 30"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="statut">
            Statut
          </Label>

          <select
            id="statut"
            value={form.statut}
            onChange={(e) =>
              handleChange(
                "statut",
                e.target.value
              )
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="PLANIFIEE">
              Planifiée
            </option>

            <option value="INSCRIPTIONS_OUVERTES">
              Inscriptions ouvertes
            </option>

            <option value="INSCRIPTIONS_FERMEES">
              Inscriptions fermées
            </option>

            <option value="EN_COURS">
              En cours
            </option>

            <option value="TERMINEE">
              Terminée
            </option>

            <option value="ANNULEE">
              Annulée
            </option>

            <option value="SUSPENDUE">
              Suspendue
            </option>
          </select>
        </div>
      </div>

      {/* INSCRIPTIONS */}

      <div className="rounded-xl border bg-muted/30 p-4">
        <h3 className="mb-4 font-semibold">
          Période des inscriptions
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ouvertureInscriptions">
              Ouverture
            </Label>

            <Input
              id="ouvertureInscriptions"
              type="datetime-local"
              value={
                form.ouvertureInscriptions
              }
              onChange={(e) =>
                handleChange(
                  "ouvertureInscriptions",
                  e.target.value
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fermetureInscriptions">
              Fermeture
            </Label>

            <Input
              id="fermetureInscriptions"
              type="datetime-local"
              value={
                form.fermetureInscriptions
              }
              onChange={(e) =>
                handleChange(
                  "fermetureInscriptions",
                  e.target.value
                )
              }
            />
          </div>
        </div>
      </div>

      {/* NOTES */}

      <div className="space-y-2">
        <Label htmlFor="notes">
          Notes
        </Label>

        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) =>
            handleChange(
              "notes",
              e.target.value
            )
          }
          placeholder="Informations complémentaires..."
          rows={4}
        />
      </div>

      {/* ACTIONS */}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Annuler
          </Button>
        )}

        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {editing
                ? "Modifier la session"
                : "Créer la session"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}