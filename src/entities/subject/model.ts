import { z } from "zod";

export const areaSchema = z.enum([
  "exact_sciences",
  "biological_sciences",
  "languages",
  "humanities",
]);
export type Area = z.infer<typeof areaSchema>;

export const AREAS: Area[] = ["exact_sciences", "biological_sciences", "languages", "humanities"];

export const areaLabels: Record<Area, string> = {
  exact_sciences: "Exatas",
  biological_sciences: "Biológicas",
  languages: "Linguagens",
  humanities: "Humanas",
};

export const subjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  area: areaSchema,
});

export type Subject = z.infer<typeof subjectSchema>;

/**
 * What the subject form collects. Splitting it from `subjectSchema` is what lets the
 * messages be user-facing Portuguese: the entity schema also parses API responses,
 * where a message would never be read.
 */
export const subjectFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da matéria."),
  area: areaSchema,
});

export type SubjectFormValues = z.infer<typeof subjectFormSchema>;
