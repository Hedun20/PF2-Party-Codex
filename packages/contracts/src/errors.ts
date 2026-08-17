export const APPLICATION_ERROR_CODES: readonly [
  "AUTH_REQUIRED",
  "EMAIL_UNVERIFIED",
  "FORBIDDEN",
  "NOT_FOUND",
  "API_ROUTE_NOT_FOUND",
  "CONFLICT",
  "ENTITLEMENT_LIMIT",
  "RATE_LIMITED",
  "VALIDATION_FAILED",
  "CONTRACT_VALIDATION_FAILED",
  "STORAGE_UNAVAILABLE",
  "INTERNAL_ERROR"
] = [
  "AUTH_REQUIRED",
  "EMAIL_UNVERIFIED",
  "FORBIDDEN",
  "NOT_FOUND",
  "API_ROUTE_NOT_FOUND",
  "CONFLICT",
  "ENTITLEMENT_LIMIT",
  "RATE_LIMITED",
  "VALIDATION_FAILED",
  "CONTRACT_VALIDATION_FAILED",
  "STORAGE_UNAVAILABLE",
  "INTERNAL_ERROR"
];

export type ApplicationErrorCode = (typeof APPLICATION_ERROR_CODES)[number];

export interface ApplicationError {
  readonly code: ApplicationErrorCode;
  readonly message: string;
  readonly field?: string;
  readonly requestId?: string;
}

export class ContractValidationError extends Error {
  readonly code: "CONTRACT_VALIDATION_FAILED";
  readonly path: string;

  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "ContractValidationError";
    this.code = "CONTRACT_VALIDATION_FAILED";
    this.path = path;
  }
}
