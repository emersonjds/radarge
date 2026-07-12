import { mutateCollection, readCollection } from "@/shared/lib/storage/db";
import { eventSchema, type Event } from "./model";

export async function fetchEvents(): Promise<Event[]> {
  const rows = await readCollection("events");
  return rows.map((row) => eventSchema.parse(row));
}

export async function fetchEventsByGroup(groupId: string): Promise<Event[]> {
  const events = await fetchEvents();
  return events.filter((event) => event.groupId === groupId);
}

export interface NewEventInput {
  groupId: string;
  title: string;
  date: string;
  location: string;
  cost: number;
}

export async function createEvent(input: NewEventInput): Promise<Event> {
  const title = input.title.trim();
  const duplicate = (await fetchEvents()).some(
    (event) =>
      event.groupId === input.groupId && event.title === title && event.date === input.date,
  );
  if (duplicate) {
    throw new Error("Já existe um evento com esse nome e data nesta aula.");
  }
  const event: Event = {
    id: crypto.randomUUID(),
    groupId: input.groupId,
    title,
    date: input.date,
    location: input.location.trim(),
    cost: input.cost,
  };
  eventSchema.parse(event);
  await mutateCollection<Event>("events", (rows) => [...rows, event]);
  return event;
}

export interface EventUpdate {
  title?: string;
  date?: string;
  location?: string;
  cost?: number;
}

export async function updateEvent(id: string, patch: EventUpdate): Promise<Event> {
  const current = (await fetchEvents()).find((event) => event.id === id);
  if (!current) throw new Error("Evento não encontrado.");
  const next: Event = {
    ...current,
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.date !== undefined ? { date: patch.date } : {}),
    ...(patch.location !== undefined ? { location: patch.location.trim() } : {}),
    ...(patch.cost !== undefined ? { cost: patch.cost } : {}),
  };
  eventSchema.parse(next);
  await mutateCollection<Event>("events", (rows) =>
    rows.map((event) => (event.id === id ? next : event)),
  );
  return next;
}

export async function deleteEvent(id: string): Promise<void> {
  // Cascade: an event owns its participations.
  await mutateCollection<{ eventId: string }>("eventParticipations", (rows) =>
    rows.filter((row) => row.eventId !== id),
  );
  await mutateCollection<Event>("events", (rows) => rows.filter((event) => event.id !== id));
}
