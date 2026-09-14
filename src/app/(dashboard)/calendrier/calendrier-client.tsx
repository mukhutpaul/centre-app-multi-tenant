"use client";

// ============================================================
// CENTRE DE FORMATION SaaS
// FULLCALENDAR — CALENDRIER
// ============================================================

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import frLocale from "@fullcalendar/core/locales/fr";

import type {
  DateClickArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
  EventResizeDoneArg,
} from "@fullcalendar/core";

import Swal from "sweetalert2";

import {
  createPlanning,
  deletePlanning,
  updatePlanning,
} from "@/actions/planing.actions";

import PlanningForm from "@/components/calendrier/planning-form";

// ============================================================
// TYPES
// ============================================================

interface Centre {
  id: string;
  nom: string;
  slug: string;
  code: string;
  devise: string;
  fuseauHoraire: string;
  logoUrl: string | null;
}

interface Formation {
  id: string;
  code: string;
  nom: string;
}

interface SessionPlanning {
  id: string;
  code: string;
  nom: string | null;
  dateDebut: string;
  dateFin: string;
  statut: string;

  formation: Formation;
}

interface Salle {
  id: string;
  nom: string;
  code: string;
  capacite: number | null;
  localisation: string | null;
}

interface Planning {
  id: string;

  sessionId: string;
  salleId: string | null;

  titre: string | null;

  debut: string;
  fin: string;

  description: string | null;

  session: {
    id: string;
    code: string;
    nom: string | null;
    statut: string;

    formation: Formation;
  };

  salle: Salle | null;
}

interface Props {
  centre: Centre;

  plannings: Planning[];

  sessions: SessionPlanning[];

  salles: Salle[];
}

// ============================================================
// FORM DATA
// ============================================================

interface PlanningFormState {
  id?: string;

  sessionId: string;

  salleId: string;

  titre: string;

  debut: string;

  fin: string;

  description: string;
}

// ============================================================
// DATE -> DATETIME LOCAL
// ============================================================

function toDateTimeLocal(value: Date | string) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  const hours = String(
    date.getHours(),
  ).padStart(2, "0");

  const minutes = String(
    date.getMinutes(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// ============================================================
// FORMAT HEURE
// ============================================================

function formatHour(date: Date | null) {
  if (!date) {
    return "";
  }

  return date.toLocaleTimeString(
    "fr-FR",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

// ============================================================
// COMPOSANT
// ============================================================

export default function CalendrierClient({
  centre,
  plannings,
  sessions,
  salles,
}: Props) {
  const [
    selectedPlanning,
    setSelectedPlanning,
  ] =
    useState<PlanningFormState | null>(
      null,
    );

  const [
    formOpen,
    setFormOpen,
  ] = useState(false);

  const [
    isPending,
    startTransition,
  ] = useTransition();

  // ==========================================================
  // EVENTS FULLCALENDAR
  // ==========================================================

  const events = useMemo<EventInput[]>(
    () => {
      return plannings.map(
        (planning) => {
          const formation =
            planning.session
              .formation;

          const sessionLabel =
            planning.session.nom ||
            `${formation.code} — ${planning.session.code}`;

          const salleLabel =
            planning.salle
              ? ` • ${planning.salle.nom}`
              : "";

          return {
            id: planning.id,

            title:
              planning.titre ||
              `${formation.nom}${salleLabel}`,

            start: planning.debut,

            end: planning.fin,

            extendedProps: {
              sessionId:
                planning.sessionId,

              salleId:
                planning.salleId,

              description:
                planning.description,

              sessionLabel,

              formationCode:
                formation.code,

              formationNom:
                formation.nom,

              salleNom:
                planning.salle
                  ?.nom ?? null,
            },
          };
        },
      );
    },
    [plannings],
  );

  // ==========================================================
  // NOUVEAU PLANNING
  // ==========================================================

  function handleDateClick(
    info: DateClickArg,
  ) {
    const debut =
      new Date(info.date);

    const fin =
      new Date(
        debut.getTime() +
          60 *
            60 *
            1000,
      );

    setSelectedPlanning({
      sessionId: "",

      salleId: "",

      titre: "",

      debut:
        toDateTimeLocal(
          debut,
        ),

      fin:
        toDateTimeLocal(
          fin,
        ),

      description: "",
    });

    setFormOpen(true);
  }

  // ==========================================================
  // CLIQUER SUR UN ÉVÉNEMENT
  // ==========================================================

  function handleEventClick(
    info: EventClickArg,
  ) {
    const planning =
      plannings.find(
        (item) =>
          item.id ===
          info.event.id,
      );

    if (!planning) {
      return;
    }

    setSelectedPlanning({
      id: planning.id,

      sessionId:
        planning.sessionId,

      salleId:
        planning.salleId ?? "",

      titre:
        planning.titre ?? "",

      debut:
        toDateTimeLocal(
          planning.debut,
        ),

      fin:
        toDateTimeLocal(
          planning.fin,
        ),

      description:
        planning.description ??
        "",
    });

    setFormOpen(true);
  }

  // ==========================================================
  // ENREGISTRER
  // ==========================================================

  function handleSubmit(
    data: PlanningFormState,
  ) {
    startTransition(
      async () => {
        const result =
          data.id
            ? await updatePlanning(
                data.id,
                {
                  sessionId:
                    data.sessionId,

                  salleId:
                    data.salleId ||
                    null,

                  titre:
                    data.titre ||
                    null,

                  debut:
                    data.debut,

                  fin:
                    data.fin,

                  description:
                    data.description ||
                    null,
                },
              )
            : await createPlanning(
                {
                  sessionId:
                    data.sessionId,

                  salleId:
                    data.salleId ||
                    null,

                  titre:
                    data.titre ||
                    null,

                  debut:
                    data.debut,

                  fin:
                    data.fin,

                  description:
                    data.description ||
                    null,
                },
              );

        if (!result.success) {
          await Swal.fire({
            icon: "error",

            title:
              "Opération impossible",

            text: result.error,

            confirmButtonText:
              "OK",
          });

          return;
        }

        await Swal.fire({
          icon: "success",

          title:
            "Opération réussie",

          text: result.message,

          timer: 1800,

          showConfirmButton:
            false,
        });

        setFormOpen(false);

        setSelectedPlanning(
          null,
        );

        window.location.reload();
      },
    );
  }

  // ==========================================================
  // SUPPRIMER
  // ==========================================================

  function handleDelete(
    id: string,
  ) {
    startTransition(
      async () => {
        const confirmation =
          await Swal.fire({
            icon: "warning",

            title:
              "Supprimer cet événement ?",

            text:
              "Cette action supprimera définitivement l'événement du calendrier.",

            showCancelButton:
              true,

            confirmButtonText:
              "Oui, supprimer",

            cancelButtonText:
              "Annuler",

            reverseButtons:
              true,
          });

        if (
          !confirmation.isConfirmed
        ) {
          return;
        }

        const result =
          await deletePlanning(
            id,
          );

        if (!result.success) {
          await Swal.fire({
            icon: "error",

            title:
              "Suppression impossible",

            text: result.error,

            confirmButtonText:
              "OK",
          });

          return;
        }

        await Swal.fire({
          icon: "success",

          title: "Supprimé",

          text: result.message,

          timer: 1600,

          showConfirmButton:
            false,
        });

        setFormOpen(false);

        setSelectedPlanning(
          null,
        );

        window.location.reload();
      },
    );
  }

  // ==========================================================
  // DÉPLACER UN ÉVÉNEMENT
  // ==========================================================

  function handleEventDrop(
    info: EventDropArg,
  ) {
    const planning =
      plannings.find(
        (item) =>
          item.id ===
          info.event.id,
      );

    if (
      !planning ||
      !info.event.start ||
      !info.event.end
    ) {
      info.revert();

      return;
    }

    const newStart =
      info.event.start;

    const newEnd =
      info.event.end;

    startTransition(
      async () => {
        const result =
          await updatePlanning(
            planning.id,
            {
              sessionId:
                planning.sessionId,

              salleId:
                planning.salleId,

              titre:
                planning.titre,

              debut:
                newStart.toISOString(),

              fin:
                newEnd.toISOString(),

              description:
                planning.description,
            },
          );

        if (!result.success) {
          info.revert();

          await Swal.fire({
            icon: "error",

            title:
              "Déplacement impossible",

            text: result.error,

            confirmButtonText:
              "OK",
          });

          return;
        }

        await Swal.fire({
          icon: "success",

          title:
            "Planning mis à jour",

          text: result.message,

          timer: 1300,

          showConfirmButton:
            false,
        });

        window.location.reload();
      },
    );
  }

  // ==========================================================
  // REDIMENSIONNER UN ÉVÉNEMENT
  // ==========================================================

  function handleEventResize(
    info: EventResizeDoneArg,
  ) {
    const planning =
      plannings.find(
        (item) =>
          item.id ===
          info.event.id,
      );

    if (
      !planning ||
      !info.event.start ||
      !info.event.end
    ) {
      info.revert();

      return;
    }

    const newStart =
      info.event.start;

    const newEnd =
      info.event.end;

    startTransition(
      async () => {
        const result =
          await updatePlanning(
            planning.id,
            {
              sessionId:
                planning.sessionId,

              salleId:
                planning.salleId,

              titre:
                planning.titre,

              debut:
                newStart.toISOString(),

              fin:
                newEnd.toISOString(),

              description:
                planning.description,
            },
          );

        if (!result.success) {
          info.revert();

          await Swal.fire({
            icon: "error",

            title:
              "Modification impossible",

            text: result.error,

            confirmButtonText:
              "OK",
          });

          return;
        }

        await Swal.fire({
          icon: "success",

          title:
            "Durée mise à jour",

          text: result.message,

          timer: 1300,

          showConfirmButton:
            false,
        });

        window.location.reload();
      },
    );
  }

  // ==========================================================
  // RENDU D'UN ÉVÉNEMENT
  // ==========================================================

  function renderEventContent(
    eventInfo: EventContentArg,
  ) {
    const salle =
      eventInfo.event
        .extendedProps
        .salleNom as
        | string
        | null
        | undefined;

    return (
      <div className="overflow-hidden px-1 py-0.5">
        <div className="truncate font-semibold">
          {eventInfo.event.title}
        </div>

        <div className="text-[11px] opacity-90">
          {formatHour(
            eventInfo.event
              .start,
          )}

          {eventInfo.event.end
            ? ` - ${formatHour(
                eventInfo.event
                  .end,
              )}`
            : ""}
        </div>

        {salle && (
          <div className="truncate text-[10px] opacity-80">
            Salle : {salle}
          </div>
        )}
      </div>
    );
  }

  // ==========================================================
  // RENDU
  // ==========================================================

  return (
    <div className="space-y-6">

      {/* ======================================================
          EN-TÊTE
      ====================================================== */}

      <div className="flex flex-col gap-4 rounded-2xl border bg-base-100 p-5 shadow-sm md:flex-row md:items-center md:justify-between">

        <div>
          <div className="flex items-center gap-3">

            {centre.logoUrl && (
              <img
                src={
                  centre.logoUrl
                }
                alt={centre.nom}
                className="h-10 w-10 rounded-lg object-contain"
              />
            )}

            <div>
              <h1 className="text-2xl font-bold">
                Calendrier
              </h1>

              <p className="text-sm opacity-70">
                {centre.nom}
              </p>
            </div>

          </div>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            const now =
              new Date();

            const fin =
              new Date(
                now.getTime() +
                  60 *
                    60 *
                    1000,
              );

            setSelectedPlanning({
              sessionId: "",

              salleId: "",

              titre: "",

              debut:
                toDateTimeLocal(
                  now,
                ),

              fin:
                toDateTimeLocal(
                  fin,
                ),

              description: "",
            });

            setFormOpen(true);
          }}
          className="btn btn-primary"
        >
          + Nouvel événement
        </button>

      </div>

      {/* ======================================================
          CALENDRIER
      ====================================================== */}

      <div className="rounded-2xl border bg-base-100 p-3 shadow-sm md:p-5">

        <FullCalendar
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
          ]}

          locales={[
            frLocale,
          ]}

          locale="fr"

          timeZone="local"

          initialView="dayGridMonth"

          height="auto"

          editable

          selectable

          eventResizableFromStart

          nowIndicator

          dayMaxEvents

          weekends

          events={events}

          dateClick={
            handleDateClick
          }

          eventClick={
            handleEventClick
          }

          eventDrop={
            handleEventDrop
          }

          eventResize={
            handleEventResize
          }

          eventContent={
            renderEventContent
          }

          slotMinTime="06:00:00"

          slotMaxTime="22:00:00"

          allDaySlot={false}

          headerToolbar={{
            left:
              "prev,next today",

            center:
              "title",

            right:
              "dayGridMonth,timeGridWeek,timeGridDay",
          }}
        />

      </div>

      {/* ======================================================
          FORMULAIRE
      ====================================================== */}

      {formOpen &&
        selectedPlanning && (
          <PlanningForm
            value={
              selectedPlanning
            }

            sessions={sessions}

            salles={salles}

            isPending={
              isPending
            }

            onClose={() => {
              if (
                isPending
              ) {
                return;
              }

              setFormOpen(
                false,
              );

              setSelectedPlanning(
                null,
              );
            }}

            onSubmit={
              handleSubmit
            }

            onDelete={
              selectedPlanning.id
                ? handleDelete
                : undefined
            }
          />
        )}

    </div>
  );
}