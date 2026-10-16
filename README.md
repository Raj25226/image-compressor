# Image Compressor

A standalone Next.js + React + TypeScript website for private, browser-local image compression. This project is separate from the portfolio.

## Run locally

Use Node.js 24 (or a supported Node.js 22 release).

```sh
npm ci
npm run dev
```

Open the Local URL printed by Next.js, normally `http://127.0.0.1:3000`.

## Included in the MVP

- File picker and drag-and-drop for one JPEG, PNG, or WebP at a time.
- 20, 50, 100, and 200 KB presets; custom targets from 1 to 20,480 KB.
- Local compression that starts at full encoding quality, searches toward the target limit, and refines optional resizing to retain the largest fitting dimensions.
- Keep-original-format default, plus explicit JPEG, WebP, and PNG output choices.
- Transparency-safe PNG/WebP output; JPEG conversion explicitly warns about white-background flattening.
- Before/after previews, actual Blob sizes, dimensions, and a target-reached status.
- Download with the output format’s extension; offer the original if compression produces no smaller result.
- Progress, cancellation, retry, input validation, and useful error messages.
- Web Worker + OffscreenCanvas when supported; browser-main-thread Canvas fallback.
- Responsive controls, keyboard access, screen-reader status updates, and reduced-motion support.
- Distinct static target-size guides, privacy page, sitemap/robots support, and related-tool roadmap.
- Unit/component tests, production-export browser tests, and GitHub Actions.

Images are not uploaded. No backend, database, external image service, ads, authentication, or persistent image storage is used. Cloudflare Web Analytics loads once from the shared app layout to measure page views, visits, and site performance. Images and filenames are not supplied to analytics. The separate local compression event hook excludes filenames and image contents and is not transmitted.

## Structure

```text
apps/
  web/
    app/                    Static routes, metadata, and global styles
    components/             Upload, settings, comparison, and tool UI
    features/image-compressor/
      validate.ts           Signature, size, dimension, and target validation
      engine.ts             On-device decoding and compression
      compress.ts           Worker lifecycle and fallback
      compression.worker.ts Background processing
      types.ts              Options, result contract, and limits
    lib/                    Page content, byte formatting, local event hook
    tests/                  Vitest and Playwright tests
    public/_headers         Cloudflare Pages response headers
  api/README.md             Reserved for a future Spring Boot module
```

## Check and build

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

The static production website is generated in `apps/web/out`. No Node server is needed to serve this directory.

Browser tests run against that actual static export:

```sh
npx playwright install chromium
npm run test:e2e
```

On macOS, an installed Chrome can be used instead:

```sh
CHROME_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:e2e
```

The suite verifies downloads and byte counts, transparent PNGs, honest unmet targets, JPEG/WebP inputs, invalid files, input limits, cancellation/retry, worker-less fallback, accessible controls, and mobile layout. Chromium is configured by default. Firefox, WebKit, and real mobile-device verification remain separate release checks; no universal browser-support claim is made.

## Cloudflare Pages deployment

The app is configured with `output: 'export'` and trailing-slash routes, matching [Cloudflare’s static Next.js guide](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/).

For the monorepo layout, connect this project’s Git repository in Cloudflare Pages and use:

| Setting | Value |
| --- | --- |
| Root directory | Repository root |
| Build command | `npm run build` |
| Output directory | `apps/web/out` |
| Node version | `24` |
| Environment variable | `NEXT_PUBLIC_SITE_URL` = actual HTTPS deployment origin |

Set `NEXT_PUBLIC_SITE_URL` before a production build. Without a known deployment URL, canonical links and sitemap entries are intentionally omitted rather than pointing to an invented hostname. The home route canonical points to `/image-compressor/`; target-specific pages have their own canonical URLs.

A Pages project/account and a connected repository are needed for publishing. No Cloudflare resource has been created by this local project setup. No Spring Boot backend needs to be deployed.

## Processing limits and trade-offs

Input limits are 20 MB and 40 megapixels. Device memory and browser codecs may impose lower limits. The requested size is a goal, not a promise. PNG does not expose useful lossy Canvas quality settings; it may need resizing. JPEG/WebP quality search spans 0.35 to 1.0. Up to nine coarse dimension steps bracket a fitting result, then a bounded binary search refines dimensions at full encoding quality. Encoding is bounded to 100 attempts and a 20-second engine budget. Images that naturally fit well below the target at full quality are not padded with extra bytes. Worker requests have a 30-second hard timeout.

The original file is never modified. Browser encoding may remove EXIF and other metadata. Verify the visible result before uploading it to another website.

Batch compression, ZIP downloads, AVIF, ads, passport-photo preparation, and JPG-to-PDF are future work. Their roadmap links are labeled as planned.

The supplied requirements are preserved in `docs/SPECIFICATION.md`.
