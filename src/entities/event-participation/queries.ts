"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchParticipationsByEvent, setParticipation, type SetParticipationInput } from "./api";

export const eventParticipationKeys = {
  all: ["eventParticipations"],
  byEvent: (eventId: string) => ["eventParticipations", eventId],
};

export function useParticipationsByEvent(eventId: string) {
  return useQuery({
    queryKey: eventParticipationKeys.byEvent(eventId),
    queryFn: () => fetchParticipationsByEvent(eventId),
    enabled: Boolean(eventId),
  });
}

export function useSetParticipation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetParticipationInput) => setParticipation(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventParticipationKeys.all }),
  });
}
