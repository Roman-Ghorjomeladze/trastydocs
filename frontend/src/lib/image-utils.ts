/**
 * Load a base64-encoded image into an off-screen canvas and return the
 * canvas + context for pixel manipulation.
 */
function loadImageToCanvas(
  base64: string,
): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas 2d context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({ canvas, ctx });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = `data:image/png;base64,${base64}`;
  });
}

/**
 * Export a canvas to a raw base64 PNG string (no data: prefix).
 */
function canvasToBase64(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL('image/png');
  return dataUrl.split(',')[1];
}

/**
 * Remove white/near-white background from an image, making it transparent.
 * Uses Canvas API to iterate pixels and replace white-ish colors with alpha=0.
 *
 * @param base64 - raw base64 string (no data: prefix) of the image
 * @param threshold - how close to white a pixel must be (0-255, default 240)
 * @returns base64 string of PNG with transparent background (no data: prefix)
 */
export async function removeWhiteBackground(
  base64: string,
  threshold = 240,
): Promise<string> {
  const { canvas, ctx } = await loadImageToCanvas(base64);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i + 3] = 0; // fully transparent
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvasToBase64(canvas);
}

// Ordinary blue ballpoint pen color
const PEN_BLUE_R = 25;
const PEN_BLUE_G = 50;
const PEN_BLUE_B = 150;

/**
 * Colorize a signature image to blue ballpoint pen color.
 * Replaces all dark/non-white pixels with blue while preserving alpha
 * and relative brightness. White/near-white pixels become transparent.
 *
 * @param base64 - raw base64 string (no data: prefix) of the image
 * @param whiteThreshold - pixels brighter than this become transparent (default 240)
 * @returns base64 string of PNG with blue ink and transparent background
 */
export async function colorizeSignatureBlue(
  base64: string,
  whiteThreshold = 240,
): Promise<string> {
  const { canvas, ctx } = await loadImageToCanvas(base64);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip fully transparent pixels
    if (a === 0) continue;

    // White / near-white → transparent
    if (r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold) {
      data[i + 3] = 0;
      continue;
    }

    // For non-white pixels: compute darkness (0 = black, 255 = white)
    // and use it to modulate the blue ink intensity
    const brightness = (r + g + b) / 3;
    // Ink darkness: 0 (white) → 1 (black)
    const inkStrength = 1 - brightness / 255;

    // Apply blue pen color, modulated by original darkness
    data[i] = Math.round(PEN_BLUE_R + (255 - PEN_BLUE_R) * (1 - inkStrength));     // R
    data[i + 1] = Math.round(PEN_BLUE_G + (255 - PEN_BLUE_G) * (1 - inkStrength)); // G
    data[i + 2] = Math.round(PEN_BLUE_B + (255 - PEN_BLUE_B) * (1 - inkStrength)); // B
    // Preserve alpha but ensure ink pixels are fully opaque
    data[i + 3] = Math.max(a, Math.round(inkStrength * 255));
  }

  ctx.putImageData(imageData, 0, 0);
  return canvasToBase64(canvas);
}
