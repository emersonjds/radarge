import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./src/test/msw/server";

// This jsdom build ships without localStorage (opaque origin) — polyfill an
// in-memory Storage so the store's persistence path is actually exercised.
if (typeof window !== "undefined" && !window.localStorage) {
  const store = new Map<string, string>();
  const localStorageMock: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => void store.delete(key),
    setItem: (key, value) => void store.set(key, String(value)),
  };
  Object.defineProperty(window, "localStorage", { value: localStorageMock, configurable: true });
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    configurable: true,
  });
}

// Most tests never touch HTTP (data lives in localStorage) — "bypass" instead
// of "error" so those stay unaffected by handlers they don't set up.
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

afterEach(() => {
  cleanup();
  if (typeof localStorage !== "undefined") localStorage.clear();
});
