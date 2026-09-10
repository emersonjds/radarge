"use client";

import { useMemo, useState } from "react";
import { isFree, type Event } from "@/entities/event/model";
import { useEvents } from "@/entities/event/queries";
import { useParticipationsByEvent } from "@/entities/event-participation/queries";
import { useGroups } from "@/entities/group/queries";
import { visibleGroups } from "@/entities/group/scope";
import { useStudentsByGroup } from "@/entities/student/queries";
import { summarizeParticipation } from "@/features/events/summary";
import { useSession } from "@/features/session/use-session";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EventDetail } from "./EventDetail";
import { EventFormModal } from "./EventFormModal";

export function Events() {
  const { role, profileId } = useSession();
  const { data: groups } = useGroups();
  const { data: events } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Event | null | undefined>(undefined);

  const canManage = role === "admin" || role === "coordinator";

  const scopedGroups = useMemo(
    () => visibleGroups(groups ?? [], role, profileId),
    [groups, role, profileId],
  );
  const scopedGroupIds = useMemo(
    () => new Set(scopedGroups.map((group) => group.id)),
    [scopedGroups],
  );
  const scopedEvents = useMemo(
    () => (events ?? []).filter((event) => scopedGroupIds.has(event.groupId)),
    [events, scopedGroupIds],
  );

  const groupById = useMemo(
    () => new Map(scopedGroups.map((group) => [group.id, group])),
    [scopedGroups],
  );

  const selectedEvent = scopedEvents.find((event) => event.id === selectedEventId) ?? null;
  const selectedGroup = selectedEvent ? groupById.get(selectedEvent.groupId) : undefined;

  if (selectedEvent && selectedGroup) {
    return (
      <EventDetail
        event={selectedEvent}
        group={selectedGroup}
        canManage={canManage}
        onBack={() => setSelectedEventId(null)}
        onEdit={() => setEditing(selectedEvent)}
        onDeleted={() => setSelectedEventId(null)}
      />
    );
  }

  const groupsWithEvents = scopedGroups.filter((group) =>
    scopedEvents.some((event) => event.groupId === group.id),
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Eventos</h1>
        {canManage && (
          <Button size="sm" onClick={() => setEditing(null)}>
            Novo evento
          </Button>
        )}
      </header>

      {groupsWithEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum evento cadastrado ainda.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {groupsWithEvents.map((group) => (
            <section key={group.id} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-foreground">{group.name}</h2>
              <ul className="flex flex-col gap-2">
                {scopedEvents
                  .filter((event) => event.groupId === group.id)
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onSelect={() => setSelectedEventId(event.id)}
                    />
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {canManage && (
        <EventFormModal
          event={editing}
          groups={scopedGroups}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}

interface EventCardProps {
  event: Event;
  onSelect: () => void;
}

function EventCard({ event, onSelect }: EventCardProps) {
  const { data: students } = useStudentsByGroup(event.groupId);
  const { data: participations } = useParticipationsByEvent(event.id);
  const studentIds = useMemo(() => (students ?? []).map((student) => student.id), [students]);
  const summary = useMemo(
    () => summarizeParticipation(event, participations ?? [], studentIds),
    [event, participations, studentIds],
  );
  const free = isFree(event);

  return (
    <li>
      <Card asChild className="px-4 py-3 text-left transition-colors hover:bg-muted">
        <button type="button" onClick={onSelect} className="flex w-full flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-foreground">{event.title}</p>
            <p className="text-sm font-medium text-foreground">
              {free ? "Gratuito" : formatCurrency(event.cost)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDate(event.date)} · {event.location}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.authorized} autorizados · {summary.pendingAuthorization} aguardando ·{" "}
            {summary.denied} não autorizados
            {!free && (
              <>
                {" "}
                · {formatCurrency(summary.collected)} de {formatCurrency(summary.expected)}{" "}
                arrecadado
              </>
            )}
          </p>
        </button>
      </Card>
    </li>
  );
}
