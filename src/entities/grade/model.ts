import { z } from "zod";

export const gradeSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  subjectId: z.string(),
  // Already aggregated per subject by the API; unique per (studentId, subjectId).
  score: z.number().min(0).max(10),
});

export type Grade = z.infer<typeof gradeSchema>;
