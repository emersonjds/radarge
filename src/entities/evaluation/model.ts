import { z } from "zod";

export const evaluationTypeSchema = z.enum(["exam", "homework"]);
export type EvaluationType = z.infer<typeof evaluationTypeSchema>;

export const EVALUATION_TYPES: EvaluationType[] = ["exam", "homework"];

export const evaluationTypeLabels: Record<EvaluationType, string> = {
  exam: "Prova",
  homework: "Trabalho de casa",
};

export const evaluationSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  subjectId: z.string(),
  name: z.string().min(1),
  type: evaluationTypeSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data deve ser YYYY-MM-DD"),
  weight: z.number().int().min(1).max(3),
});

export type Evaluation = z.infer<typeof evaluationSchema>;

/**
 * What the evaluation form collects. Split from `evaluationSchema` so the messages can be
 * user-facing Portuguese — the entity schema also parses API responses, where a message
 * would never be read.
 */
export const evaluationFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da avaliação."),
  type: evaluationTypeSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
  weight: z.coerce
    .number()
    .int("O peso deve ser um número inteiro.")
    .min(1, "O peso deve ser de 1 a 3.")
    .max(3, "O peso deve ser de 1 a 3."),
});

export type EvaluationFormValues = z.infer<typeof evaluationFormSchema>;
