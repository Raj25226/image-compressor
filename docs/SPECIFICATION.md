# Image Compressor — Product & Implementation Specification

**Product:** Free Online Image Compressor  
**Release:** v0.1 (MVP)  
**Platform:** Utility website (React / Next.js static export)  
**Hosting target:** Cloudflare Pages free tier  
**Processing:** Client-side by default; no image uploads to a server

## 1. Goal

Build a fast, mobile-friendly image compression utility that helps users reduce image size for forms, applications, websites, and sharing. The tool should support common target sizes (20 KB, 50 KB, 100 KB, 200 KB) and a custom KB target, while making quality trade-offs visible.

**Primary success metric:** Percentage of users who successfully download a compressed image.  
**Secondary metrics:** Organic search clicks, compression completion time, repeat visits, and Core Web Vitals.

## 2. MVP Features

| Priority | Feature | Acceptance criteria |
|---|---|---|
| P0 | Upload image | File picker and drag-and-drop; accepts JPEG, PNG, WebP when browser decoding is supported |
| P0 | Preset targets | 20, 50, 100, and 200 KB presets |
| P0 | Custom target | Positive target in KB, validated against configured limits |
| P0 | Compress | Attempts to reach target through quality adjustment and optional resizing |
| P0 | Before/after preview | Shows original and resulting image, dimensions, and file sizes |
| P0 | Download | Saves compressed image with clear extension and filename |
| P0 | Errors | Clear messages for invalid format, corrupted files, oversized files, or unattainable target |
| P0 | Privacy | Local processing; images are not sent to the backend |
| P0 | Mobile UX | Accessible and usable on common mobile screen sizes |
| P1 | Output format | JPEG/WebP output choice, with transparency warning when JPEG is selected |
| P1 | Batch compression | Compress multiple images and download individually or as ZIP |
| P1 | Adjustable quality | Quality slider and optional max width/height |
| P2 | AVIF | Enable only after cross-browser testing |

**Important:** Exact target sizes are not guaranteed. Some images cannot reach the requested size without unacceptable quality or dimension loss. Show the achieved size and explain the trade-off rather than falsely claiming success.

## 3. User Flow

1. Visitor lands on `/image-compressor` or a target-specific SEO page such as `/image-compressor-50kb`.
2. Visitor selects or drops an image.
3. Visitor chooses a preset or enters a target size.
4. Visitor clicks **Compress Image**.
5. The browser compresses locally, displays progress and a comparison preview.
6. Visitor downloads the result or adjusts the settings and retries.

No login is required.

## 4. Architecture

```text
Google Search / Direct Visit
          |
          v
Cloudflare Pages (HTTPS + CDN)
          |
          v
Next.js static-exported pages
          |
          v
React Image Compressor UI
          |
          v
Web Worker (when feasible)
  - Image decode
  - Canvas / OffscreenCanvas where supported
  - Iterative quality + dimension adjustment
          |
          v
Blob + object URL -> Preview -> Download
```

**MVP backend:** None. Keep a Spring Boot API module in the monorepo only for future capabilities; do not deploy it for this tool.

**Privacy:** Do not send image contents to analytics, logs, error reporting, or third-party APIs. Revoke object URLs and release image buffers after use.

## 5. Recommended Stack

- **Next.js + React + TypeScript:** Static pages and interactive tool UI.
- **Tailwind CSS:** Responsive styles.
- **Canvas API / createImageBitmap:** Image decoding and encoding where supported.
- **browser-image-compression (optional):** Evaluate against custom compression logic; test browser support and bundle size.
- **Web Workers:** Keep the UI responsive for large images when supported.
- **Vitest + React Testing Library:** Unit and component tests.
- **Playwright:** Browser end-to-end tests.
- **GitHub Actions:** Lint, test, build.
- **Cloudflare Pages:** Static hosting.

## 6. Compression Algorithm

1. Validate MIME type, file signature where practical, file size, and decoded dimensions.
2. Decode image and account for EXIF orientation where the browser/library requires it.
3. Choose an output format. Prefer JPEG for photographs without transparency; preserve transparency with PNG/WebP when necessary.
4. Start at the original dimensions, subject to a safe maximum pixel count.
5. Encode at a high quality, then search lower quality settings (e.g., binary search for JPEG/WebP) to approach the requested size.
6. If still above target and resizing is permitted, reduce dimensions in bounded steps and retry.
7. Stop after a configured iteration/time budget; select the best acceptable result.
8. If the output is larger than the original, offer the original rather than presenting it as a successful compression.
9. Show actual output size, percentage reduction, dimensions, and any quality warning.

**PNG caveat:** Canvas PNG encoding generally does not expose a useful lossy quality parameter. Use lossless optimization where feasible or offer conversion to WebP/JPEG with clear transparency and compatibility implications.

**Security limits (initial values, tune after testing):** Max input file 20 MB, max decoded pixels 40 megapixels, one file at a time. Handle out-of-memory and unsupported-format failures gracefully. These are product limits, not promises that every device can process the maximum.

## 7. Suggested Directory Structure

```text
apps/web/
├── app/
│   ├── image-compressor/page.tsx
│   ├── image-compressor-20kb/page.tsx
│   ├── image-compressor-50kb/page.tsx
│   ├── image-compressor-100kb/page.tsx
│   ├── layout.tsx
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── ImageDropzone.tsx
│   ├── CompressionSettings.tsx
│   ├── ImageComparison.tsx
│   └── DownloadButton.tsx
├── features/image-compressor/
│   ├── compress.ts
│   ├── validate.ts
│   ├── formats.ts
│   ├── types.ts
│   └── compression.worker.ts
├── lib/
│   ├── formatBytes.ts
│   └── analytics.ts
├── public/
└── package.json
```

## 8. Component Contracts

```ts
export type CompressionOptions = {
  targetBytes: number;
  outputFormat: 'image/jpeg' | 'image/webp' | 'image/png';
  allowResize: boolean;
  maxWidth?: number;
  maxHeight?: number;
};

export type CompressionResult = {
  blob: Blob;
  originalBytes: number;
  outputBytes: number;
  width: number;
  height: number;
  targetReached: boolean;
  warnings: string[];
};

export async function compressImage(
  file: File,
  options: CompressionOptions,
  signal?: AbortSignal
): Promise<CompressionResult>;
```

The function must never silently discard transparency, misreport file size, or claim an unmet target was reached.

## 9. SEO & Discovery

**Primary landing page:** `/image-compressor`  
**Focused pages:** `/image-compressor-20kb`, `/image-compressor-50kb`, `/image-compressor-100kb`

Each indexed page must provide genuinely distinct, useful information about the specific use case rather than duplicating the same text with a different number. Include:

- Descriptive title and meta description.
- Clear H1, instructions, supported formats, limits, FAQs, and privacy statement.
- Fast, working tool above the fold.
- Canonical URLs, sitemap, and appropriate robots directives.
- Related-tool links to passport photo maker and JPG-to-PDF.
- Accessible controls and descriptive error messages.

**Example title:** `Compress Image to 50KB Online — Free & Private`  
**Example description:** `Reduce JPG, PNG or WebP image size toward 50KB in your browser. Preview the result and download without uploading your photo.`

Do not create thin doorway pages or promise exact output sizes that the tool cannot guarantee.

## 10. Analytics & Monetization

Track privacy-conscious events (without image content or filenames):

- `tool_opened`
- `image_selected` (format category and size bucket only)
- `compression_started`
- `compression_succeeded`
- `compression_target_unmet`
- `download_clicked`
- `compression_failed` (non-sensitive error category)

**AdSense plan:** Apply only when the site has substantive original value and meets AdSense policies. Keep ads clearly separated from tool controls and download buttons; never induce clicks or place deceptive ads. Add a consent management solution where required. Monetization is not guaranteed.

## 11. CI/CD & Free Deployment

1. Push the repository to GitHub.
2. On pull requests, run `npm ci`, lint, typecheck, unit tests, and production build.
3. Configure Next.js static export:

```js
// next.config.mjs
const nextConfig = {
  output: 'export',
  images: { unoptimized: true }
};
export default nextConfig;
```

4. Connect the frontend repository/directory to Cloudflare Pages.
5. Configure build command `npm run build` and output directory `out` (relative to frontend root).
6. Use Cloudflare's free `pages.dev` hostname for the initial release.
7. Test the production URL on mobile and desktop.
8. Add a custom domain later if desired; domain registration is generally paid.

**Cost goal:** ₹0/month hosting within the provider's free-tier terms and limits. No server, database, or file storage is needed for the MVP.

## 12. Release Plan

| Week | Deliverables | Exit criteria |
|---|---|---|
| 1 | Project setup, UI, upload validation, basic compression | JPEG/WebP images compress and download locally |
| 2 | Target presets, custom target, resizing, previews, errors | Actual output sizes and target status displayed accurately |
| 3 | SEO pages, privacy content, analytics, tests, Cloudflare deployment | Public mobile-friendly v0.1 passes release checklist |
| 4+ | Improve quality, batch processing, format options | Prioritized using user feedback and performance data |

## 13. Acceptance Tests

- A JPEG photograph can be compressed and downloaded.
- A PNG with transparency does not silently lose its transparency.
- An unattainable 20KB target is reported as unmet.
- Unsupported and corrupted files show useful errors.
- The output's reported size matches the downloaded Blob size.
- Images never leave the browser during compression.
- The UI remains responsive or provides clear progress for large inputs.
- Compression works on current Chrome, Firefox, Safari, and common mobile browsers (with documented fallbacks).
- The page is keyboard-accessible and supports screen-reader labels.
- Search engine crawlers can access meaningful static page content.
- Production deployment is available over HTTPS.

## 14. Definition of Done

The MVP is ready when visitors can upload a supported image, select a size target, compress locally, see an accurate result, and download it reliably from a mobile-friendly, indexable, HTTPS website—without registration or backend hosting.
