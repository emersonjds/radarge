import { z } from "zod";

export const eventSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data deve ser YYYY-MM-DD"),
  location: z.string().min(1),
  cost: z.number().min(0), // reais; 0 = gratuito
});

export type Event = z.infer<typeof eventSchema>;

export function isFree(event: Event): boolean {
  return event.cost === 0;
}

/**
 * What the event form collects. Split from `eventSchema` so the messages can be
 * user-facing Portuguese: the entity schema also parses API responses, where a
 * message would never be read.
 */
export const eventFormSchema = z.object({
  groupId: z.string().min(1, "Selecione a aula."),
  title: z.string().trim().min(1, "Informe o título do evento."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
  location: z.string().trim().min(1, "Informe o local do evento."),
  cost: z.coerce.number().min(0, "O valor não pode ser negativo."),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;
