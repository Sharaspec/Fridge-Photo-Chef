import { AppError } from "./types";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // PRD F1: 10 MB
const MAX_EDGE = 1600; // plenty for Gemini to read labels, small enough to upload fast
const RAW_HEIC_LIMIT = 4 * 1024 * 1024; // what fits in a Netlify Function body once base64-encoded

export interface PreparedImage {
  base64: string;
  mimeType: string;
  /** Object URL the page can show as a preview (null if the browser can't display the format). */
  previewUrl: string | null;
}

function isHeic(file: File): boolean {
  return /image\/hei[cf]/.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

/**
 * Checks the file, then shrinks it to a JPEG so uploads stay fast and under
 * Netlify's 6 MB request limit. HEIC photos that the browser can't decode
 * (most non-Safari browsers) are sent as-is if they are small enough.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const ok = /image\/(jpeg|png|webp)/.test(file.type) || isHeic(file);
  if (!ok) throw new AppError("BAD_FILE", "Please choose a JPG, PNG or HEIC photo.");
  if (file.size > MAX_UPLOAD_BYTES) throw new AppError("BAD_FILE", "That photo is over 10 MB. Please choose a smaller one.");

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) throw new Error("toBlob failed");
    return { base64: await toBase64(blob), mimeType: "image/jpeg", previewUrl: URL.createObjectURL(blob) };
  } catch {
    if (isHeic(file) && file.size <= RAW_HEIC_LIMIT) {
      return { base64: await toBase64(file), mimeType: "image/heic", previewUrl: null };
    }
    throw new AppError(
      "BAD_FILE",
      isHeic(file)
        ? "This browser can't read that HEIC photo. Try a JPG, or take the photo with the camera button."
        : "We couldn't read that image. Please try another photo.",
    );
  }
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
