/**
 * Downscales an image file in the browser so uploads stay small and never hit
 * server size limits. Returns the original file unchanged if it's already small
 * enough or if decoding fails.
 */
export async function downscaleImage(
  file: File,
  maxDimension: number,
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const largestSide = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, maxDimension / largestSide);

  // Already small enough — skip re-encoding to keep PNG transparency etc.
  if (scale === 1 && file.size <= 1_200_000) {
    bitmap.close();
    return file;
  }

  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const keepPng = file.type === 'image/png' || file.type === 'image/webp';
  const outType = keepPng ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outType, keepPng ? undefined : 0.85),
  );
  if (!blob || blob.size >= file.size) {
    return file;
  }

  const ext = keepPng ? 'png' : 'jpg';
  const name = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${name}.${ext}`, { type: outType });
}
