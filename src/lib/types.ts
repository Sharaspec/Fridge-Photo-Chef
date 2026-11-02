import type { IngredientKind } from "../../shared/filters";

export interface Ingredient {
  name: string;
  confidence: number;
  /** meat / seafood / dairy / egg / plant — from Gemini; missing for typed-in items */
  kind?: IngredientKind;
  /** true when the user typed it in rather than Gemini finding it */
  userAdded?: boolean;
}

export interface Video {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  durationSeconds: number;
  views: number;
}

export interface Dish {
  name: string;
  description: string;
  uses: string[];
}

export type ErrorCode =
  | "BAD_REQUEST"
  | "IMAGE_TOO_LARGE"
  | "NO_FOOD"
  | "BLURRY"
  | "QUOTA"
  | "BUSY"
  | "NO_VIDEOS"
  | "CONFIG"
  | "UPSTREAM"
  | "NETWORK"
  | "BAD_FILE";

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}
