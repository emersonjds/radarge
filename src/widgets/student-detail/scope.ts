import type { Assignment } from "@/entities/assignment/model";
import type { Enrollment } from "@/entities/enrollment/model";
import type { Grade } from "@/entities/grade/model";
import type { Group } from "@/entities/group/model";
import { visibleGroups } from "@/entities/group/scope";
import type { Role } from "@/entities/profile/model";

export function studentGroupsInScope(
  enrollments: Enrollment[],
  groups: Group[],
  role: Role | null,
  profileId: string | null,
): Group[] {
  const visible = visibleGroups(groups, role, profileId);
  const visibleIds = new Set(visible.map((group) => group.id));
  const enrolledIds = new Set(
    enrollments
      .filter((enrollment) => enrollment.active && visibleIds.has(enrollment.groupId))
      .map((enrollment) => enrollment.groupId),
  );
  return visible.filter((group) => enrolledIds.has(group.id));
}

/**
 * A teacher only reads the subjects they teach *in this student's groups* —
 * teaching Maths in another group grants no access to this student's Maths grade.
 */
export function studentGradesInScope(
  grades: Grade[],
  assignments: Assignment[],
  studentGroups: Group[],
  role: Role | null,
): Grade[] {
  if (role !== "teacher") return grades;
  const studentGroupIds = new Set(studentGroups.map((group) => group.id));
  const taughtSubjectIds = new Set(
    assignments
      .filter((assignment) => studentGroupIds.has(assignment.groupId))
      .map((assignment) => assignment.subjectId),
  );
  return grades.filter((grade) => taughtSubjectIds.has(grade.subjectId));
}
