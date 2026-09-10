import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useIsDesktop } from "./use-is-desktop";

function setWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

describe("useIsDesktop", () => {
  afterEach(() => setWidth(1024));

  it("reads the width on mount", () => {
    setWidth(375);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });

  it("flips when the window is resized past the breakpoint", () => {
    setWidth(1280);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);

    act(() => {
      setWidth(375);
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toBe(false);
  });
});
