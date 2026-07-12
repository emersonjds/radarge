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
