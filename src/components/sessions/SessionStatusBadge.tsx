"use client";

import { Badge } from "@/components/ui/badge";
import { StatutSession } from "@/generated/prisma/enums";

interface SessionStatusBadgeProps {
  statut: StatutSession;
}

const statusConfig: Record<
  StatutSession,
  {
    label: string;
    className: string;
  }
> = {
  PLANIFIEE: {
    label: "Planifiée",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },

  INSCRIPTIONS_OUVERTES: {
    label: "Inscriptions ouvertes",
    className: "bg-green-100 text-green-700 border-green-200",
  },

  INSCRIPTIONS_FERMEES: {
    label: "Inscriptions fermées",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },

  EN_COURS: {
    label: "En cours",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },

  TERMINEE: {
    label: "Terminée",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },

  ANNULEE: {
    label: "Annulée",
    className: "bg-red-100 text-red-700 border-red-200",
  },

  SUSPENDUE: {
    label: "Suspendue",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
};

export default function SessionStatusBadge({
  statut,
}: SessionStatusBadgeProps) {
  const config = statusConfig[statut];

  return (
    <Badge
      variant="outline"
      className={`font-medium ${config.className}`}
    >
      {config.label}
    </Badge>
  );
}