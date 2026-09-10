import { describe, expect, it } from "vitest";
import { messageForError } from "./error-message";
import { ApiError, NetworkError, SessionEndedError } from "./errors";

const FALLBACK = "Não foi possível salvar.";

describe("messageForError", () => {
  it("translates a known API code without echoing the server text", () => {
    const message = messageForError(new ApiError("conflict", "username already taken"), FALLBACK);

    expect(message).toBe("Já existe um registro com esses dados.");
    expect(message).not.toContain("username");
  });

  it("falls back on an unknown API code", () => {
    expect(messageForError(new ApiError("teapot", "short and stout"), FALLBACK)).toBe(FALLBACK);
  });

  it("tells a dropped connection apart from an ended session", () => {
    expect(messageForError(new NetworkError(new Error("offline")), FALLBACK)).toMatch(/conexão/);
    expect(messageForError(new SessionEndedError(), FALLBACK)).toMatch(/sessão expirou/);
  });

  it("lets a screen override what a code means to its reader", () => {
    const onSignIn = messageForError(
      new ApiError("unauthorized", "authentication required"),
      FALLBACK,
      { unauthorized: "Usuário ou senha incorretos." },
    );

    expect(onSignIn).toBe("Usuário ou senha incorretos.");
    expect(messageForError(new ApiError("unauthorized", "x"), FALLBACK)).toMatch(/sessão expirou/);
  });

  it("uses the caller's fallback for anything untyped", () => {
    expect(messageForError(new Error("boom"), FALLBACK)).toBe(FALLBACK);
    expect(messageForError("boom", FALLBACK)).toBe(FALLBACK);
  });
});
