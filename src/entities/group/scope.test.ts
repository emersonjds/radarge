import { describe, expect, it } from "vitest";
import type { Group } from "./model";
import { groupsForRegente, visibleGroups } from "./scope";

const groups: Group[] = [
  { id: "g1", name: "A", shift: "morning", teacherId: "t1" },
  { id: "g2", name: "B", shift: "morning", teacherId: "t2" },
  { id: "g3", name: "C", shift: "morning", teacherId: "t1" },
];

const groupIds = (list: Group[]) => list.map((group) => group.id);

describe("groupsForRegente", () => {
  it("returns only the groups where the teacher is regente", () => {
    expect(groupIds(groupsForRegente(groups, "t1"))).toEqual(["g1", "g3"]);
  });

  it("returns an empty list for a null teacher", () => {
    expect(groupsForRegente(groups, null)).toEqual([]);
  });
});

describe("visibleGroups", () => {
  it("limits a teacher to the aulas they run", () => {
    expect(groupIds(visibleGroups(groups, "teacher", "t2"))).toEqual(["g2"]);
  });

  it("gives coordinators and admins every aula", () => {
    expect(groupIds(visibleGroups(groups, "coordinator", "t1"))).toEqual(["g1", "g2", "g3"]);
    expect(groupIds(visibleGroups(groups, "admin", "t1"))).toEqual(["g1", "g2", "g3"]);
  });

  it("hides everything from a logged-out visitor", () => {
    expect(visibleGroups(groups, null, null)).toEqual([]);
  });
});
