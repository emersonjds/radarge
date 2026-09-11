"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eventParticipationKeys } from "@/entities/event-participation/queries";
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  updateEvent,
  type EventUpdate,
  type NewEventInput,
} from "./api";

export const eventKeys = {
  all: ["events"],
};

export function useEvents() {
  return useQuery({ queryKey: eventKeys.all, queryFn: fetchEvents });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewEventInput) => createEvent(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.all }),
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EventUpdate }) => updateEvent(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.all }),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
      queryClient.invalidateQueries({ queryKey: eventParticipationKeys.all });
    },
  });
}
