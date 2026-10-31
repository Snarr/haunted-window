// Mirrors the Pillow make_banner() and visitor-message frame on the Pi.
export const WIDTH = 128;
export const HEIGHT = 32;
export const SPEED = 36;
export const COLOR = [255, 170, 75];
export const normalize = text => text.trim().replace(/\s+/g, ' ').toUpperCase();
const roundEven = n => n % 1 === 0.5 ? 2 * Math.round(n / 2) : Math.round(n);

export function makeBanner(text, font) {
  const glyphs = [...text].map(c => font.glyphs[c]);
  if (!glyphs.length || glyphs.some(g => !g)) throw Error('Unsupported message');
  const top = Math.min(...glyphs.map(g => g.box[1]));
  const bottom = Math.max(...glyphs.map(g => g.box[3]));
  const width = glyphs.reduce((sum, g) => sum + g.advance, 0);
  const height = bottom - top;
  const mask = new Uint8Array(width * height);
  let pen = 0;
  for (const glyph of glyphs) {
    const pixels = Uint8Array.from(atob(glyph.pixels), c => c.charCodeAt(0));
    const [left, y, right, end] = glyph.box;
    const gw = right - left;
    for (let row = 0; row < end - y; row++) {
      for (let col = 0; col < gw; col++) {
        mask[(row + y - top) * width + pen + col + left] = pixels[row * gw + col];
      }
    }
    pen += glyph.advance;
  }
  const scale = Math.min(3, 28 / Math.max(1, height));
  const w = Math.max(1, roundEven(width * scale));
  const h = Math.max(1, roundEven(height * scale));
  const output = new Uint8ClampedArray(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(width - 1, Math.floor((x + 0.5) * width / w));
      const sy = Math.min(height - 1, Math.floor((y + 0.5) * height / h));
      const alpha = mask[sy * width + sx] || 0;
      for (let c = 0; c < 3; c++) output[(y * w + x) * 3 + c] = Math.round(COLOR[c] * alpha / 255);
    }
  }
  return {width: w, height: h, pixels: output, duration: (WIDTH + w) / SPEED};
}

export function frameAt(banner, seconds) {
  const pixels = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
  const left = Math.trunc(WIDTH - seconds * SPEED);
  const top = Math.floor((HEIGHT - banner.height) / 2);
  for (let y = 0; y < banner.height; y++) {
    for (let x = Math.max(0, -left); x < Math.min(banner.width, WIDTH - left); x++) {
      const src = (y * banner.width + x) * 3;
      const dest = ((top + y) * WIDTH + left + x) * 4;
      pixels.set(banner.pixels.subarray(src, src + 3), dest);
    }
  }
  return pixels;
}
