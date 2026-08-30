# GitHub Actions secrets for Vercel

Workflow [`.github/workflows/ci-cd.yaml`](workflows/ci-cd.yaml) reads exactly the
following three Vercel secrets during the production deployment job:

| Secret name | Value to set | Where to find it |
| --- | --- | --- |
| `VERCEL_TOKEN` | A Vercel access token with permission to deploy the project. | Vercel Dashboard → Settings → Tokens |
| `VERCEL_ORG_ID` | The ID of the Vercel team or personal account that owns the project. | Vercel Dashboard → Team Settings → General → Team ID (or Personal Account Settings → General → User ID) |
| `VERCEL_PROJECT_ID` | The ID of the Vercel project to deploy. | Vercel Dashboard → Project → Settings → General → Project ID |

## Setup

1. Open the GitHub repository's **Settings → Secrets and variables → Actions**.
2. Create or update the three secrets above with values from the matching Vercel
   account and project.
3. Do **not** commit any token, organization ID, project ID, or other secret to
   this repository.

The secret names are case-sensitive. In particular, the legacy names
`VERCELTOKEN`, `VERCELORGID`, and `VERCELPROJECTID` are not read by the current
workflow.
