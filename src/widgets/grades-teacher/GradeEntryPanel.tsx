"use client";

import { useStudentsByGroup } from "@/entities/student/queries";
import type { Evaluation } from "@/entities/evaluation/model";
import {
  useEvaluationGradesByEvaluation,
  useSetEvaluationGrade,
} from "@/entities/evaluation-grade/queries";
import { messageForError } from "@/shared/lib/api/error-message";
import { QueryErrorState } from "@/shared/ui/query-error";
import { RowsSkeleton } from "@/shared/ui/skeleton";

const inputClasses =
  "h-10 w-24 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground focus:border-ring focus:outline-hidden";

export function GradeEntryPanel({ evaluation }: { evaluation: Evaluation }) {
  const studentsQuery = useStudentsByGroup(evaluation.groupId);
  const { data: students } = studentsQuery;
  const gradesQuery = useEvaluationGradesByEvaluation(evaluation.id);
  const { data: grades } = gradesQuery;
  const setGrade = useSetEvaluationGrade();

  function scoreOf(studentId: string): string {
    const grade = (grades ?? []).find((g) => g.studentId === studentId);
    return grade && grade.score !== null ? String(grade.score) : "";
  }

  function onBlurScore(studentId: string, raw: string) {
    const trimmed = raw.trim();
    const score = trimmed === "" ? null : Number(trimmed);
    if (score !== null && (Number.isNaN(score) || score < 0 || score > 10)) return;
    setGrade.mutate({ evaluationId: evaluation.id, studentId, score });
  }

  return (
    <div className="mt-3 rounded-xl bg-muted p-4">
      <h5 className="mb-3 text-sm font-semibold text-foreground">Notas — {evaluation.name}</h5>
      {studentsQuery.isLoading || gradesQuery.isLoading ? (
        <RowsSkeleton rows={2} avatar={false} />
      ) : studentsQuery.isError || gradesQuery.isError ? (
        <QueryErrorState
          message={messageForError(
            studentsQuery.error ?? gradesQuery.error,
            "Não foi possível carregar as notas.",
          )}
          onRetry={() => {
            if (studentsQuery.isError) studentsQuery.refetch();
            if (gradesQuery.isError) gradesQuery.refetch();
          }}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {(students ?? []).map((student) => (
            <li key={student.id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-foreground">{student.name}</span>
              <input
                aria-label={`Nota de ${student.name}`}
                type="number"
                min={0}
                max={10}
                step={0.1}
                defaultValue={scoreOf(student.id)}
                key={scoreOf(student.id)}
                placeholder="—"
                onBlur={(e) => onBlurScore(student.id, e.target.value)}
                className={inputClasses}
              />
            </li>
          ))}
          {(students ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">Aula sem alunos.</li>
          )}
        </ul>
      )}
    </div>
  );
}
