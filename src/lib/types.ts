export interface Ingredient {
  name: string;
  confidence: number;
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
