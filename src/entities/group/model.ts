import { z } from "zod";

export const shiftSchema = z.enum(["morning", "afternoon", "evening"]);
export type Shift = z.infer<typeof shiftSchema>;

export const SHIFTS: Shift[] = ["morning", "afternoon", "evening"];

export const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  shift: shiftSchema,
  teacherId: z.string(),
});

export type Group = z.infer<typeof groupSchema>;

export const shiftLabels: Record<Shift, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  evening: "Noite",
};

/**
 * What the group form collects. Splitting it from `groupSchema` is what lets the
 * messages be user-facing Portuguese: the entity schema also parses API responses,
 * where a message would never be read.
 */
export const groupFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da aula."),
  shift: shiftSchema,
  teacherId: z.string().min(1, "Selecione o professor regente."),
});

export type GroupFormValues = z.infer<typeof groupFormSchema>;
