import type { Config } from "driver.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runProductTour } from "./run-product-tour";

const drive = vi.fn();
const driver = vi.fn((config: Config) => ({ config, drive }));
vi.mock("driver.js", () => ({ driver: (config: Config) => driver(config) }));
vi.mock("@/shared/config/navigation", () => ({
  navForRole: () => [
    { href: "/attendance", label: "Chamada", icon: "session" },
    { href: "/not-in-the-tour", label: "Outro", icon: "admin" },
  ],
}));

beforeEach(() => {
  drive.mockClear();
  driver.mockClear();
});

describe("runProductTour", () => {
  it("drives the role's steps with pt-BR controls and reports the close", () => {
    const onDone = vi.fn();

    runProductTour({ role: "teacher", onDone });

    const config = driver.mock.lastCall?.[0];
    expect(drive).toHaveBeenCalledTimes(1);
    expect(config).toMatchObject({
      showProgress: true,
      progressText: "{{current}} de {{total}}",
      nextBtnText: "Próximo",
      prevBtnText: "Voltar",
      doneBtnText: "Concluir",
      onDestroyed: onDone,
    });
  });

  it("skips nav items that have no tour copy", () => {
    runProductTour({ role: "teacher", onDone: vi.fn() });

    const elements = driver.mock.lastCall?.[0].steps?.map((step) => step.element);
    expect(elements).toEqual([
      undefined,
      '[data-tour="nav-/attendance"]',
      '[data-tour="replay-tour"]',
    ]);
  });
});
