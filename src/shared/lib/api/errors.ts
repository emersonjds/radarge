/** Carries the machine-readable code from the API's `{ code, message }` body. */
export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

/** A dropped connection or a response with no usable body — never a hung promise. */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("network request failed");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

/** The refresh attempt failed: the session is over, distinct from a network hiccup. */
export class SessionEndedError extends Error {
  constructor() {
    super("session ended");
    this.name = "SessionEndedError";
  }
}
