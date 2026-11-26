import { describe, expect, it } from "vitest";
import { navForRole } from "@/shared/config/navigation";
import type { Role } from "@/entities/profile/model";
import { REPLAY_TOUR_TARGET, stepsForRole, tourTarget } from "./steps";

const roles: Array<[Role, number]> = [
  ["teacher", 6],
  ["coordinator", 6],
  ["admin", 9],
];

describe("tourTarget", () => {
  it("prefixes the href", () => {
    expect(tourTarget("/attendance")).toBe("nav-/attendance");
  });
});

describe.each(roles)("stepsForRole(%s)", (role, count) => {
  const steps = stepsForRole(role);

  it(`has ${count} steps`, () => {
    expect(steps).toHaveLength(count);
  });

  it("opens with a centered welcome", () => {
    expect(steps[0].element).toBeUndefined();
    expect(steps[0].popover?.title).toBe("Bem-vindo ao Radarge");
  });

  it("highlights each nav link in nav order", () => {
    const expected = navForRole(role).map((item) => `[data-tour="nav-${item.href}"]`);
    expect(steps.slice(1, -1).map((step) => step.element)).toEqual(expected);
  });

  it("ends on the replay button", () => {
    expect(steps.at(-1)?.element).toBe(`[data-tour="${REPLAY_TOUR_TARGET}"]`);
  });

  it("gives every step a title and a description", () => {
    for (const step of steps) {
      expect(step.popover?.title).toBeTruthy();
      expect(step.popover?.description).toBeTruthy();
    }
  });
});
