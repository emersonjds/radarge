import type { Role } from "@/entities/profile/model";
import type { Group } from "./model";

export function groupsForTeacher(groups: Group[], teacherId: string | null): Group[] {
  if (!teacherId) return [];
  return groups.filter((group) => group.teacherId === teacherId);
}

export function visibleGroups(groups: Group[], role: Role | null, profileId: string | null): Group[] {
  if (role === null) return [];
  if (role === "teacher") return groupsForTeacher(groups, profileId);
  return groups;
}
