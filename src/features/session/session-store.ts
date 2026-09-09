"use client";

import { useSyncExternalStore } from "react";

/**
 * Mock session: the id of the logged-in profile. Persisted in localStorage
 * (`radarge.session`) and read via useSyncExternalStore so it's hydration-safe
 * (server + first client render see "logged out") and cross-tab aware.
 * Replace with real Supabase auth (session from the JWT) later.
 */
const STORAGE_KEY = "radarge.session";

const listeners = new Set<() => void>();

function readProfileId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function setSession(profileId: string): void {
  window.localStorage.setItem(STORAGE_KEY, profileId);
  emit();
}

export function clearSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  emit();
}

export function useSessionProfileId(): string | null {
  return useSyncExternalStore(subscribe, readProfileId, () => null);
}
