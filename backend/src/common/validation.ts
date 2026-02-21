import { HttpError } from "./http-error";

export const assertValidation = (
  condition: unknown,
  message: string,
  details?: Record<string, unknown>
): void => {
  if (condition) {
    return;
  }

  throw new HttpError(400, "VALIDATION_ERROR", message, details);
};

export const assertBodyIsObject = (body: unknown): void => {
  const isObject = typeof body === "object" && body !== null && !Array.isArray(body);

  assertValidation(isObject, "Request body must be a JSON object");
};
