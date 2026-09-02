---
name: Production verification dependencies
description: External runtime dependencies required for MeeChain production checks.
---

Production verification is only meaningful when the MeeChain VM and upstream API/RPC are running; the board can deploy and serve HTML while its health payload reports offline and RPC checks time out.

**Why:** The deployment artifact and the chain infrastructure are separate systems, so a successful Vercel publish does not prove live blockchain connectivity.

**How to apply:** Before declaring production fully verified, check `/api/health` for `healthy` and verify the RPC chain ID matches the configured chain ID.