"use client";

import { useState } from "react";
import { useSubjects } from "@/entities/subject/queries";
import { useProfiles } from "@/entities/profile/queries";
import {
  useAssignmentsByGroup,
  useCreateAssignment,
  useUpdateAssignmentTeacher,
  useDeleteAssignment,
} from "@/entities/assignment/queries";
import { X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { IconButton } from "@/shared/ui/icon-button";

const controlClasses =
  "h-10 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground focus:border-ring focus:outline-hidden";

export function GroupAssignmentsPanel({ groupId }: { groupId: string }) {
  const { data: assignments } = useAssignmentsByGroup(groupId);
  const { data: subjects } = useSubjects();
  const { data: profiles } = useProfiles();
  const createAssignment = useCreateAssignment();
  const updateTeacher = useUpdateAssignmentTeacher();
  const deleteAssignment = useDeleteAssignment();

  const teachers = (profiles ?? []).filter((profile) => profile.role === "teacher");
  const usedSubjectIds = new Set((assignments ?? []).map((assignment) => assignment.subjectId));
  const availableSubjects = (subjects ?? []).filter((subject) => !usedSubjectIds.has(subject.id));

  const [newSubjectId, setNewSubjectId] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function subjectName(id: string) {
    return (subjects ?? []).find((subject) => subject.id === id)?.name ?? id;
  }

  async function addAssignment() {
    setError(null);
    const subjectId = newSubjectId || availableSubjects[0]?.id;
    const teacherId = newTeacherId || teachers[0]?.id;
    if (!subjectId || !teacherId) return;
    try {
      await createAssignment.mutateAsync({ groupId, subjectId, teacherId });
      setNewSubjectId("");
      setNewTeacherId("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível adicionar.");
    }
  }

  return (
    <div className="mt-3 rounded-xl bg-muted p-4">
      <h5 className="mb-3 text-sm font-semibold text-foreground">Matérias desta aula</h5>

      <ul className="mb-4 flex flex-col gap-2">
        {(assignments ?? []).map((assignment) => (
          <li key={assignment.id} className="flex flex-wrap items-center gap-2">
            <span className="min-w-32 text-sm text-foreground">
              {subjectName(assignment.subjectId)}
            </span>
            <select
              aria-label={`Professor de ${subjectName(assignment.subjectId)}`}
              value={assignment.teacherId}
              onChange={(event) =>
                updateTeacher.mutate({ id: assignment.id, teacherId: event.target.value })
              }
              className={controlClasses}
            >
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
            <IconButton
              icon={X}
              label={`Remover ${subjectName(assignment.subjectId)} desta aula`}
              tone="destructive"
              onClick={() => deleteAssignment.mutate(assignment.id)}
            />
          </li>
        ))}
        {(assignments ?? []).length === 0 && (
          <li className="text-sm text-muted-foreground">Nenhuma matéria atribuída ainda.</li>
        )}
      </ul>

      {error && (
        <p role="alert" className="mb-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {availableSubjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Matéria a adicionar"
            value={newSubjectId}
            onChange={(event) => setNewSubjectId(event.target.value)}
            className={controlClasses}
          >
            {availableSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Professor da matéria"
            value={newTeacherId}
            onChange={(event) => setNewTeacherId(event.target.value)}
            className={controlClasses}
          >
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={addAssignment}>
            Adicionar matéria à aula
          </Button>
        </div>
      )}
    </div>
  );
}
