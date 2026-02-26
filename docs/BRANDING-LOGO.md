# GIVRwrld branding and logo

## Logo in use

As of now, the live site **does not display a graphical logo**. Only the **text name “GIVRwrld”** is shown in the header and auth flows while branding is being finalized.

## Using your own logo image

If you have a high‑res version of the logo (e.g. from your designer):

1. **Favicon / OG / social**
   - When a new logo is ready, save a square version (e.g. 512×512) into `public/images/`.
   - In `index.html`, set:
     - `rel="icon"` and `rel="apple-touch-icon"` to that file.
     - `og:image` and `twitter:image` to that file (or to a full logo image if you prefer).

2. **Using a future emblem**
   - To use a PNG/SVG emblem in the `Logo.tsx` component instead of the current inline SVG, add your file to `public/images/` (e.g. `givrwrld-emblem.png` or `.svg`) and in `Logo.tsx` replace the `<svg>...</svg>` block with an `<img src="/images/givrwrld-emblem.png" alt=\"\" />` (with the same size classes). The wordmark and tagline can stay as they are.

## Brand colors (from logo)

- **Flame:** Orange `#f97316` → yellow `#fbbf24` → light yellow `#fde047`.
- **Rings / tagline:** Yellow `#fde047` → lime `#a3e635` → green `#00e676` → teal `#0d9488`.
- **Tagline green** used in the component: `#00e676` (same as Tailwind `emerald-500`).

The site’s existing emerald palette already aligns with the logo green; you can reuse it for CTAs and accents.
