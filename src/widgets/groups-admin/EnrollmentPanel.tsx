"use client";

import { useState } from "react";
import {
  useEnrollmentsByGroup,
  useEnrollStudent,
  useUnenrollStudent,
} from "@/entities/enrollment/queries";
import { useStudents } from "@/entities/student/queries";
import { UserMinus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { IconButton } from "@/shared/ui/icon-button";
import { Label } from "@/shared/ui/label";

interface Props {
  groupId: string;
}

export function EnrollmentPanel({ groupId }: Props) {
  const { data: enrollments, isLoading: isLoadingEnrollments } = useEnrollmentsByGroup(groupId);
  const { data: allStudents, isLoading: isLoadingStudents } = useStudents();
  const enrollStudent = useEnrollStudent();
  const unenrollStudent = useUnenrollStudent();
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeEnrollments = (enrollments ?? []).filter((enrollment) => enrollment.active);
  const enrolledIds = new Set(activeEnrollments.map((enrollment) => enrollment.studentId));
  const availableStudents = (allStudents ?? []).filter(
    (student) => student.active && !enrolledIds.has(student.id),
  );

  const studentMap = new Map((allStudents ?? []).map((student) => [student.id, student]));

  async function enroll() {
    if (!selectedStudentId) return;
    setError(null);
    try {
      await enrollStudent.mutateAsync({ groupId, studentId: selectedStudentId });
      setSelectedStudentId("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível matricular.");
    }
  }

  async function unenroll(studentId: string) {
    setError(null);
    try {
      await unenrollStudent.mutateAsync({ groupId, studentId });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível remover.");
    }
  }

  if (isLoadingEnrollments || isLoadingStudents) {
    return <div className="mt-3 h-16 animate-pulse rounded-lg bg-muted" />;
  }

  return (
    <section className="mt-3 rounded-lg border border-border bg-muted p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Alunos matriculados</h3>

      {error && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {activeEnrollments.length === 0 ? (
        <p className="mb-3 text-sm text-muted-foreground">Nenhum aluno matriculado.</p>
      ) : (
        <ul className="mb-3 flex flex-col gap-1">
          {activeEnrollments.map((enrollment) => {
            const student = studentMap.get(enrollment.studentId);
            return (
              <li
                key={enrollment.id}
                className="flex items-center justify-between rounded-md bg-card px-3 py-2 text-sm"
              >
                <span className="text-foreground">{student?.name ?? "—"}</span>
                <IconButton
                  icon={UserMinus}
                  label={`Remover ${student?.name ?? "aluno"} da aula`}
                  tone="destructive"
                  onClick={() => unenroll(enrollment.studentId)}
                />
              </li>
            );
          })}
        </ul>
      )}

      {availableStudents.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label className="mb-1.5" htmlFor={`select-${groupId}`}>
              Adicionar aluno
            </Label>
            <select
              id={`select-${groupId}`}
              value={selectedStudentId}
              onChange={(event) => setSelectedStudentId(event.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-foreground focus:border-ring focus:ring-3 focus:ring-ring/20 focus:outline-hidden"
            >
              <option value="">Selecione um aluno</option>
              {availableStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            onClick={enroll}
            disabled={!selectedStudentId || enrollStudent.isPending}
          >
            Matricular
          </Button>
        </div>
      )}
    </section>
  );
}
