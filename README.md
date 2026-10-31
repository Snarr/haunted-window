# The Haunted Window

A public Halloween message board for a Raspberry Pi LED matrix.

- `docs/`: dependency-free static website, hosted on GitHub Pages.
- `supabase/functions/window-api/`: public HTTP API with authenticated device polling.
- `supabase/migrations/`: private PostgreSQL queue and service-only API function.
- The Pi makes outbound HTTPS requests. No router port forwarding is needed.

## Behavior

Visitors submit up to 60 printable ASCII characters. Messages scroll across the panel in large letters. The existing Halloween scenes play between visitor messages. Submissions are limited to one per IP every 30 seconds and ten queued messages. Queued messages expire after ten minutes; completed records are removed after a day during device polling.

## Deployment

Publish the `docs` directory of `main` with GitHub Pages. Set the public Edge Function base URL in `docs/config.js`. Deploy the SQL migration and `window-api` Edge Function in Supabase. The Edge Function validates the device's bearer token against a SHA-256 hash in the private `halloween.device` table. The database and RPC are inaccessible to anonymous and signed-in browser clients. Only the Edge Function uses the Supabase service role.

Do not commit device credentials, API secrets, Wi-Fi credentials or precise location. `visitor-config.json` stays on the Pi with root-only permissions. Initialize the client before the matrix library drops root privileges.

## Raspberry Pi

The separate project lives in `/root/halloween-2026`. Its boot service is `halloween-display.service`. The original flight service is `panel.service` and remains disabled, with its source unchanged.

To restore the flight program:

```sh
systemctl disable --now halloween-display
systemctl enable --now panel
```

## Pixel-accurate preview

The browser draws a real 128x32 canvas from PixelOperator glyph rasters exported with Pillow at 16px. It mirrors the Pi's nearest-neighbor scaling (3x, capped at 28px high), RGB (255,170,75), vertical centering, integer clipping, and 36px/second visitor scroll. No browser font rendering or decorative LED texture is used. The preview loops and can be paused; reduced-motion preferences start it paused.

`node tests/display.test.mjs` compares 56 complete RGBA frames against Pillow-generated reference hashes, including punctuation, all ASCII glyphs, long messages, and off-screen clipping. Regenerate the atlas and fixtures with the scripts in `tools/`, passing the Pi's `PixelOperator.ttf` as the argument.
