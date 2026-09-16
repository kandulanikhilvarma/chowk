// Photos are resized in the browser before upload. ponytail: skips the Vercel Hobby image
// quota and Supabase Pro-only transforms; move to server transforms if either plan changes.
export const FULL_PX = 1600;
export const THUMB_PX = 480;
const QUALITY = 0.8;

/** Scales the long side down to max. Never scales up. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export class PhotoError extends Error {}

async function encode(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/** Returns WebP, or JPEG where the browser cannot encode WebP (older Safari). The bucket accepts only these two. */
export async function resizeImage(file: File, max: number) {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoError(
      /heic|heif/i.test(file.type + file.name)
        ? "This phone photo format (HEIC) does not open here. Set your camera to 'Most compatible' or send a screenshot of the photo."
        : "This file does not open as a photo. Use a JPG, PNG or WebP photo.",
    );
  }

  const size = fitWithin(bitmap.width, bitmap.height, max);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  let blob = await encode(canvas, "image/webp");
  if (blob?.type !== "image/webp") blob = await encode(canvas, "image/jpeg");
  if (!blob) throw new PhotoError("This photo did not open. Try a different photo.");
  return { blob, ...size };
}
