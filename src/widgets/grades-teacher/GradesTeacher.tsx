"use client";

import { useState } from "react";
import { useSession } from "@/features/session/use-session";
import { useAssignmentsByTeacher } from "@/entities/assignment/queries";
import { useGroups } from "@/entities/group/queries";
import { useSubjects } from "@/entities/subject/queries";
import { messageForError } from "@/shared/lib/api/error-message";
import { QueryErrorState } from "@/shared/ui/query-error";
import { RowsSkeleton } from "@/shared/ui/skeleton";
import { EvaluationsPanel } from "./EvaluationsPanel";

export function GradesTeacher() {
  const { profileId } = useSession();
  const {
    data: assignments,
    isLoading,
    isError,
    error,
    refetch,
  } = useAssignmentsByTeacher(profileId ?? "");
  const { data: groups } = useGroups();
  const { data: subjects } = useSubjects();
  const [selected, setSelected] = useState<string | null>(null);

  function groupName(id: string) {
    return (groups ?? []).find((g) => g.id === id)?.name ?? id;
  }
  function subjectName(id: string) {
    return (subjects ?? []).find((s) => s.id === id)?.name ?? id;
  }

  const current = (assignments ?? []).find((a) => a.id === selected);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-foreground">Notas</h1>

      {isLoading ? (
        <RowsSkeleton rows={2} avatar={false} />
      ) : isError ? (
        <QueryErrorState
          message={messageForError(error, "Não foi possível carregar suas aulas.")}
          onRetry={() => refetch()}
        />
      ) : (assignments ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Você não leciona nenhuma matéria ainda.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(assignments ?? []).map((assignment) => (
            <button
              key={assignment.id}
              type="button"
              onClick={() => setSelected(assignment.id)}
              className={`rounded-xl border px-4 py-2 text-sm ${
                selected === assignment.id
                  ? "border-primary bg-accent text-primary"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {subjectName(assignment.subjectId)} — {groupName(assignment.groupId)}
            </button>
          ))}
        </div>
      )}

      {current && <EvaluationsPanel groupId={current.groupId} subjectId={current.subjectId} />}
    </div>
  );
}
