import type { Role } from "@/entities/profile/model";
import type { Group } from "./model";

/** The aulas a teacher runs roll-call for = the ones they are regente of. */
export function groupsForRegente(groups: Group[], teacherId: string | null): Group[] {
  if (!teacherId) return [];
  return groups.filter((group) => group.teacherId === teacherId);
}

/**
 * Aulas whose data a profile may read. A teacher only sees the ones they run —
 * attendance and grades from a colleague's aula are not theirs to act on.
 * Coordinators and admins see every aula.
 */
export function visibleGroups(groups: Group[], role: Role | null, profileId: string | null): Group[] {
  if (role === null) return [];
  if (role === "teacher") return groupsForRegente(groups, profileId);
  return groups;
}
