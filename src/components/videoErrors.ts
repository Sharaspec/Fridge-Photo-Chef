import { AppError } from "../lib/types";

/** Friendly messages for the video features (recipe card, ask). */
export function videoErrorMessage(err: unknown): { message: string; retryable: boolean } {
  if (!(err instanceof AppError)) return { message: "Something went wrong. Please try again.", retryable: true };
  switch (err.code) {
    case "NOT_RECIPE":
      return { message: "This video doesn't look like a recipe, so there's no card to make.", retryable: false };
    case "VIDEO_UNAVAILABLE":
      return { message: err.message, retryable: false };
    case "QUOTA":
      return {
        message: "The free Gemini limit has been reached for now. Try again in a minute, or tomorrow if it keeps happening.",
        retryable: true,
      };
    case "BUSY":
      return { message: "Gemini is busy right now. Please try again in a minute.", retryable: true };
    default:
      return { message: err.message, retryable: true };
  }
}
