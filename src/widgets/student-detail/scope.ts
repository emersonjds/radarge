import type { Assignment } from "@/entities/assignment/model";
import type { Enrollment } from "@/entities/enrollment/model";
import type { Grade } from "@/entities/grade/model";
import type { Group } from "@/entities/group/model";
import { visibleGroups } from "@/entities/group/scope";
import type { Role } from "@/entities/profile/model";

/** As aulas em que o aluno está matriculado e que o papel logado pode ler. */
export function studentGroupsInScope(
  enrollments: Enrollment[],
  groups: Group[],
  role: Role | null,
  profileId: string | null,
): Group[] {
  const visiveis = visibleGroups(groups, role, profileId);
  const idsVisiveis = new Set(visiveis.map((group) => group.id));
  const idsMatriculados = new Set(
    enrollments
      .filter((enrollment) => enrollment.active && idsVisiveis.has(enrollment.groupId))
      .map((enrollment) => enrollment.groupId),
  );
  return visiveis.filter((group) => idsMatriculados.has(group.id));
}

/**
 * Notas que o papel pode ler. O professor vê só as matérias que ele leciona
 * *nas aulas deste aluno* — lecionar Matemática noutra turma não dá acesso à
 * nota de Matemática de um aluno que não é dele.
 */
export function studentGradesInScope(
  grades: Grade[],
  assignments: Assignment[],
  studentGroups: Group[],
  role: Role | null,
): Grade[] {
  if (role !== "teacher") return grades;
  const idsDoAluno = new Set(studentGroups.map((group) => group.id));
  const materiasLecionadas = new Set(
    assignments
      .filter((assignment) => idsDoAluno.has(assignment.groupId))
      .map((assignment) => assignment.subjectId),
  );
  return grades.filter((grade) => materiasLecionadas.has(grade.subjectId));
}
