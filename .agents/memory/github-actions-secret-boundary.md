---
name: GitHub Actions secret boundary
description: Secret propagation and authentication expectations for external CI deployment.
---

Replit Secrets are not automatically available as GitHub Actions repository secrets. A workflow that references `${{ secrets.* }}` must have those values configured in the GitHub repository, while a Replit-side GitHub API dispatch requires a valid token.

**Why:** A token that is present in Replit can still fail GitHub API dispatch with `401`, or authenticate but return `403 Resource not accessible by personal access token` when its repository/workflow permissions are insufficient. A successful dispatch can still fail later when Actions cannot read its Vercel secrets.

**How to apply:** Treat `401` from the GitHub API as invalid or expired dispatch credentials; treat `403 Resource not accessible by personal access token` as a token repository/workflow permission issue; treat missing Vercel values in the workflow as a separate GitHub Actions secret configuration issue.