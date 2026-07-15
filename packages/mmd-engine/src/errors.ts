export type MmdErrorCode =
  | "MODEL_NOT_FOUND"
  | "FIELD_NOT_FOUND"
  | "INVALID_FILTER"
  | "INVALID_INPUT"
  | "RECORD_NOT_FOUND"
  | "ACTION_NOT_FOUND";

export class MmdError extends Error {
  readonly code: MmdErrorCode;
  readonly details?: unknown;

  constructor(code: MmdErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "MmdError";
    this.code = code;
    this.details = details;
  }
}
