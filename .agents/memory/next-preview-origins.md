---
name: Next.js proxied preview origins
description: Development preview host handling for Next.js dev assets.
---

Next.js development previews served through the local proxy may load the page from `127.0.0.1` while requesting dev assets cross-origin. Next 16 blocks those requests unless `127.0.0.1` is included in `allowedDevOrigins`.

**Why:** Without the explicit origin, the preview can render a stale or partial page while browser logs show 403 responses and failed HMR handshakes.

**How to apply:** When a Next.js preview reports blocked `/_next` assets or HMR errors from `127.0.0.1`, add the origin in `next.config.js` and restart the workflow.