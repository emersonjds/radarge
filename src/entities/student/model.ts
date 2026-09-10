import { z } from "zod";

export const studentSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data deve ser YYYY-MM-DD"),
  guardianName: z.string().min(1),
  guardianPhone: z.string().min(8, "telefone inválido"),
  active: z.boolean(),
});

export type Student = z.infer<typeof studentSchema>;

/**
 * What the student form collects. Split from `studentSchema` so the validation
 * messages can be user-facing Portuguese — the entity schema also parses API
 * responses, where a message would never be read.
 */
export const studentFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do aluno."),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data de nascimento válida."),
  guardianName: z.string().trim().min(1, "Informe o nome do responsável."),
  guardianPhone: z.string().trim().min(8, "Informe um telefone válido."),
  active: z.boolean(),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;
