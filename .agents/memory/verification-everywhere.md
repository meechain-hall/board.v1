---
name: Verification Everywhere architecture
description: Product and architecture decision for how MeeChain exposes verification and evidence.
---

Verification must be a shared system capability, not a destination page. Every Hall may invoke the same Verification Layer, and detailed proof opens in an Evidence/Verification Inspector overlay or drawer rather than sending users to a separate Verification Hall.

The canonical flow is Intent → Workflow → Control Plane → external systems → Verification → Evidence → Result. A verification result should use one shared shape with status (`verified`, `degraded`, `failed`, or `unknown`), source, checkedAt, and evidence items.

Production Code Hub is the first reference implementation because it already links source, CI, deployment, SHA matching, and runtime evidence. Existing standalone verification UI should be treated as a migration source, not a new navigation destination.

**Why:** Sending users to a Verification Hall makes them leave the context where a claim was made and repeat the search for truth. Shared evidence keeps trust attached to the result and avoids duplicated verification logic.

**How to apply:** Add new verification adapters to the shared layer, render compact status summaries beside the claim in each Hall, and open detailed evidence contextually. Do not add a new top-level Verification Hall or duplicate per-page verification rules.